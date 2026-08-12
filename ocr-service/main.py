"""PaddleOCR 전용 마이크로서비스.

이미지 하나 받아서 텍스트만 돌려준다. 무겁고(약 1GB) 가끔 쓰이는 OCR을
본 백엔드에서 떼어내, 서버리스 용량 제한을 피하려는 목적.

로컬 실행:
    uvicorn main:app --port 7861
"""
import io
import os
from functools import lru_cache

from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="FIRST LABEL OCR", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",")],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 본 백엔드만 호출하도록 최소한의 보호. 비워두면 누구나 호출 가능.
API_KEY = os.getenv("OCR_API_KEY", "")


@lru_cache(maxsize=1)
def _engine():
    from paddleocr import PaddleOCR

    return PaddleOCR(use_angle_cls=True, lang="korean", show_log=False)


@app.get("/health")
def health():
    return {"status": "ok", "engine": "paddleocr-korean"}


@app.post("/ocr")
async def ocr(image_file: UploadFile = File(...), x_api_key: str = Header("")):
    if API_KEY and x_api_key != API_KEY:
        raise HTTPException(401, "invalid api key")

    data = await image_file.read()
    if not data:
        raise HTTPException(400, "빈 파일입니다.")

    import numpy as np
    from PIL import Image

    img = np.array(Image.open(io.BytesIO(data)).convert("RGB"))
    result = _engine().ocr(img, cls=True) or []

    lines = []
    for page in result:
        for box, (text, conf) in page or []:
            if conf < 0.5:
                continue
            lines.append((min(p[1] for p in box), text))
    lines.sort(key=lambda x: x[0])

    return {"text": " ".join(t for _, t in lines), "line_count": len(lines)}
