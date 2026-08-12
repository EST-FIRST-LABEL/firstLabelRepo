"""성분표 이미지 → 텍스트.

세 가지 경로를 우선순위대로 지원한다.
  1. GOOGLE_VISION_API_KEY  → Google Cloud Vision (배포 환경 기본. 의존성이 없어 서버리스에 올라간다)
  2. OCR_SERVICE_URL        → 별도 PaddleOCR 서비스 호출
  3. 둘 다 없음             → 같은 프로세스에서 PaddleOCR 실행 (로컬 개발)
"""
import base64
from functools import lru_cache

import httpx
from fastapi import HTTPException

from app.core.config import settings

VISION_URL = "https://vision.googleapis.com/v1/images:annotate"


async def extract_text(image_bytes: bytes, filename: str = "scan.jpg", content_type: str = "image/jpeg") -> str:
    if settings.GOOGLE_VISION_API_KEY:
        return await _google_vision(image_bytes)
    if settings.OCR_SERVICE_URL:
        return await _remote(image_bytes, filename, content_type)
    return _local(image_bytes)


async def _google_vision(image_bytes: bytes) -> str:
    """DOCUMENT_TEXT_DETECTION 이 성분표처럼 빽빽한 문단에 더 정확하다."""
    payload = {
        "requests": [
            {
                "image": {"content": base64.b64encode(image_bytes).decode()},
                "features": [{"type": "DOCUMENT_TEXT_DETECTION"}],
                "imageContext": {"languageHints": ["ko"]},
            }
        ]
    }
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            res = await client.post(
                VISION_URL, params={"key": settings.GOOGLE_VISION_API_KEY}, json=payload
            )
    except httpx.HTTPError:
        raise HTTPException(503, "OCR 서버에 연결하지 못했어요. 잠시 후 다시 시도해주세요.")

    if res.status_code != 200:
        detail = (res.json() or {}).get("error", {}).get("message", "")
        raise HTTPException(503, f"OCR 분석에 실패했어요. {detail}"[:200])

    body = (res.json() or {}).get("responses", [{}])[0]
    if "error" in body:
        raise HTTPException(503, f"OCR 분석에 실패했어요. {body['error'].get('message', '')}"[:200])

    # 줄바꿈은 원재료 구분자로 쓰이므로 공백이 아니라 쉼표로 바꿔 넘긴다
    text = body.get("fullTextAnnotation", {}).get("text", "")
    return text.replace("\n", ", ")


async def _remote(image_bytes: bytes, filename: str, content_type: str) -> str:
    """별도 PaddleOCR 서비스 호출. 슬립에서 깨어나는 시간을 감안해 타임아웃을 넉넉히 준다."""
    headers = {"X-API-Key": settings.OCR_API_KEY} if settings.OCR_API_KEY else {}
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            res = await client.post(
                f"{settings.OCR_SERVICE_URL.rstrip('/')}/ocr",
                files={"image_file": (filename, image_bytes, content_type)},
                headers=headers,
            )
    except httpx.HTTPError:
        raise HTTPException(503, "OCR 서버에 연결하지 못했어요. 잠시 후 다시 시도해주세요.")

    if res.status_code != 200:
        raise HTTPException(503, "OCR 분석에 실패했어요. 잠시 후 다시 시도해주세요.")
    return (res.json() or {}).get("text", "")


def _local(image_bytes: bytes) -> str:
    import io

    import numpy as np
    from PIL import Image

    img = np.array(Image.open(io.BytesIO(image_bytes)).convert("RGB"))
    result = _engine().ocr(img, cls=True) or []

    lines = []
    for page in result:
        for box, (text, conf) in page or []:
            if conf < 0.5:
                continue
            lines.append((min(p[1] for p in box), text))
    lines.sort(key=lambda x: x[0])
    return " ".join(t for _, t in lines)


@lru_cache(maxsize=1)
def _engine():
    try:
        from paddleocr import PaddleOCR
    except ImportError:
        raise HTTPException(
            503,
            "OCR 엔진이 없습니다. 로컬은 `pip install paddlepaddle paddleocr`, "
            "배포 환경은 GOOGLE_VISION_API_KEY 를 설정해주세요.",
        )
    return PaddleOCR(use_angle_cls=True, lang="korean", show_log=False)
