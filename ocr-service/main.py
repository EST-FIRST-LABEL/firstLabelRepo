"""PaddleOCR 전용 마이크로서비스.

이미지 하나 받아서 텍스트만 돌려준다. 무겁고(약 1GB) 가끔 쓰이는 OCR을
본 백엔드에서 떼어내, 서버리스 용량 제한을 피하려는 목적.

로컬 실행:
    uvicorn main:app --port 7861
"""
import io
import os
import time
from collections import defaultdict, deque
from functools import lru_cache

from fastapi import FastAPI, File, Header, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="FIRST LABEL OCR", version="1.0.0")

_DEFAULT_ORIGINS = "https://first-label-app.vercel.app,http://localhost:3000"
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in os.getenv("CORS_ORIGINS", _DEFAULT_ORIGINS).split(",") if o.strip()],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 본 백엔드만 호출하도록 최소한의 보호. 이 서비스는 퍼블릭 호스팅(Hugging Face Spaces)에
# 항상 떠 있으므로 키가 없으면 기동을 막는다. 로컬 개발에서만 명시적으로 끌 수 있다.
API_KEY = os.getenv("OCR_API_KEY", "")
_ALLOW_UNAUTHENTICATED = os.getenv("ALLOW_UNAUTHENTICATED_OCR", "").strip().lower() in ("1", "true", "yes")
if not API_KEY and not _ALLOW_UNAUTHENTICATED:
    raise RuntimeError(
        "OCR_API_KEY가 설정되지 않았습니다. 인증 없이 PaddleOCR을 공개로 노출하면 "
        "리소스 남용으로 서비스 장애·과금이 발생할 수 있습니다. 로컬 개발에서 임시로 "
        "끄려면 ALLOW_UNAUTHENTICATED_OCR=true 를 설정하세요."
    )

MAX_UPLOAD_BYTES = int(os.getenv("OCR_MAX_UPLOAD_BYTES", str(8 * 1024 * 1024)))  # 8MB
MAX_IMAGE_SIDE = int(os.getenv("OCR_MAX_IMAGE_SIDE", "6000"))  # px

# 클라이언트(IP)당 요청 제한 — 고정 윈도우. 별도 저장소 없이 프로세스 메모리로 충분한 규모.
RATE_LIMIT_MAX = int(os.getenv("OCR_RATE_LIMIT_MAX", "30"))
RATE_LIMIT_WINDOW_SEC = int(os.getenv("OCR_RATE_LIMIT_WINDOW_SEC", "60"))
_request_log: dict[str, deque] = defaultdict(deque)


def _check_rate_limit(client_id: str) -> None:
    now = time.monotonic()
    log = _request_log[client_id]
    while log and now - log[0] > RATE_LIMIT_WINDOW_SEC:
        log.popleft()
    if len(log) >= RATE_LIMIT_MAX:
        raise HTTPException(429, "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.")
    log.append(now)


@lru_cache(maxsize=1)
def _engine():
    from paddleocr import PaddleOCR

    return PaddleOCR(use_angle_cls=True, lang="korean", show_log=False)


@app.get("/health")
def health():
    return {"status": "ok", "engine": "paddleocr-korean"}


@app.post("/ocr")
async def ocr(request: Request, image_file: UploadFile = File(...), x_api_key: str = Header("")):
    if API_KEY and x_api_key != API_KEY:
        raise HTTPException(401, "invalid api key")

    client_id = request.client.host if request.client else "unknown"
    _check_rate_limit(client_id)

    data = await image_file.read()
    if not data:
        raise HTTPException(400, "빈 파일입니다.")
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, f"이미지 용량이 너무 큽니다 ({MAX_UPLOAD_BYTES // (1024 * 1024)}MB 이하만 허용).")

    import numpy as np
    from PIL import Image

    try:
        pil_img = Image.open(io.BytesIO(data))
        pil_img.verify()
        pil_img = Image.open(io.BytesIO(data)).convert("RGB")
    except Exception:
        raise HTTPException(400, "이미지 파일을 읽을 수 없습니다.")

    if max(pil_img.size) > MAX_IMAGE_SIDE:
        raise HTTPException(413, f"이미지 해상도가 너무 큽니다 (한 변 {MAX_IMAGE_SIDE}px 이하만 허용).")

    img = np.array(pil_img)
    result = _engine().ocr(img, cls=True) or []

    lines = []
    for page in result:
        for box, (text, conf) in page or []:
            if conf < 0.5:
                continue
            lines.append((min(p[1] for p in box), text))
    lines.sort(key=lambda x: x[0])

    return {"text": " ".join(t for _, t in lines), "line_count": len(lines)}
