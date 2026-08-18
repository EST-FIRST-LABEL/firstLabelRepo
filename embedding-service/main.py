"""문장 임베딩 전용 마이크로서비스.

텍스트 목록을 받아 벡터만 돌려준다. onnxruntime + 임베딩 모델(약 250MB)이
서버리스(Vercel) 용량·콜드스타트 제약에 걸려, 본 백엔드에서 떼어냈다.
OCR 서비스와 동일한 분리 전략.

로컬 실행:
    uvicorn main:app --port 7862
"""
import os
import time
from collections import defaultdict, deque
from functools import lru_cache

from fastapi import Body, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="FIRST LABEL Embedding", version="1.0.0")

MODEL_NAME = os.getenv("EMBEDDING_MODEL", "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")

_DEFAULT_ORIGINS = "https://first-label-app.vercel.app,http://localhost:3000"
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in os.getenv("CORS_ORIGINS", _DEFAULT_ORIGINS).split(",") if o.strip()],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 본 백엔드만 호출하도록 최소한의 보호. 이 서비스는 퍼블릭 호스팅(Hugging Face Spaces)에
# 항상 떠 있으므로 키가 없으면 기동을 막는다. 로컬 개발에서만 명시적으로 끌 수 있다.
API_KEY = os.getenv("EMBEDDING_API_KEY", "")
_ALLOW_UNAUTHENTICATED = os.getenv("ALLOW_UNAUTHENTICATED_EMBEDDING", "").strip().lower() in ("1", "true", "yes")
if not API_KEY and not _ALLOW_UNAUTHENTICATED:
    raise RuntimeError(
        "EMBEDDING_API_KEY가 설정되지 않았습니다. 인증 없이 임베딩을 공개로 노출하면 "
        "리소스 남용으로 서비스 장애·과금이 발생할 수 있습니다. 로컬 개발에서 임시로 "
        "끄려면 ALLOW_UNAUTHENTICATED_EMBEDDING=true 를 설정하세요."
    )

MAX_TEXTS = int(os.getenv("EMBEDDING_MAX_TEXTS", "256"))
MAX_TEXT_LEN = int(os.getenv("EMBEDDING_MAX_TEXT_LEN", "2000"))  # 문자 수

# 클라이언트(IP)당 요청 제한 — 고정 윈도우. 별도 저장소 없이 프로세스 메모리로 충분한 규모.
RATE_LIMIT_MAX = int(os.getenv("EMBEDDING_RATE_LIMIT_MAX", "120"))
RATE_LIMIT_WINDOW_SEC = int(os.getenv("EMBEDDING_RATE_LIMIT_WINDOW_SEC", "60"))
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
    from fastembed import TextEmbedding

    return TextEmbedding(model_name=MODEL_NAME)


@app.get("/health")
def health():
    return {"status": "ok", "engine": f"fastembed:{MODEL_NAME}"}


@app.post("/embed")
def embed(
    request: Request,
    payload: dict = Body(...),
    x_api_key: str = Header(""),
):
    if API_KEY and x_api_key != API_KEY:
        raise HTTPException(401, "invalid api key")

    client_id = request.client.host if request.client else "unknown"
    _check_rate_limit(client_id)

    texts = (payload or {}).get("texts")
    if not isinstance(texts, list) or not texts:
        raise HTTPException(400, "texts 배열이 필요합니다.")
    if len(texts) > MAX_TEXTS:
        raise HTTPException(413, f"한 번에 {MAX_TEXTS}개까지만 처리할 수 있습니다.")
    if any(not isinstance(t, str) for t in texts):
        raise HTTPException(400, "texts 는 문자열 배열이어야 합니다.")
    texts = [t[:MAX_TEXT_LEN] for t in texts]

    vectors = [vec.tolist() for vec in _engine().embed(texts)]
    return {"vectors": vectors, "dim": len(vectors[0]) if vectors else 0}
