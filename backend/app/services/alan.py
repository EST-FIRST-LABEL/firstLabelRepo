"""Alan AI 연동.

Alan은 질의응답 API이므로 '이미지 검색'은 답변 텍스트에서 이미지 URL을 뽑아 쓴다(§9 B안).
client_id 여러 개를 라운드로빈해 호출 한도를 분산한다.
"""
import itertools
import re

import httpx

from app.core.config import settings

_IMG_URL = re.compile(r"https?://[^\s\)\"'<>]+?\.(?:jpg|jpeg|png|webp)(?:\?[^\s\)\"'<>]*)?", re.I)
_ANY_URL = re.compile(r"https?://[^\s\)\"'<>]+")

_ids = itertools.cycle(settings.ALAN_CLIENT_IDS) if settings.ALAN_CLIENT_IDS else None


async def ask(question: str, timeout: float = 20.0) -> str:
    """Alan에게 질문하고 답변 텍스트를 돌려준다. 실패하면 빈 문자열."""
    if _ids is None:
        return ""
    for _ in range(min(3, len(settings.ALAN_CLIENT_IDS))):
        client_id = next(_ids)
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                res = await client.get(
                    f"{settings.ALAN_API_URL}/question",
                    params={"content": question, "client_id": client_id},
                )
            if res.status_code == 200:
                body = res.json() or {}
                # Alan은 answer 키로 답을 준다 (구 문서에는 content로 표기됨)
                return body.get("answer") or body.get("content") or ""
        except (httpx.HTTPError, ValueError):
            continue  # 다음 client_id로 재시도
    return ""


async def search_product_image(product_name: str, brand: str = "") -> str:
    """제품명 기반 대표 이미지 URL 검색. 못 찾으면 빈 문자열 → 호출부에서 user_upload로 fallback."""
    query = (
        f"'{brand} {product_name}'.strip() 이라는 대한민국 식품 제품의 공식 제품 이미지 URL을 "
        "딱 하나만 알려줘. 설명 없이 이미지 파일 URL(.jpg/.png/.webp)만 출력해."
    )
    answer = await ask(query)
    if not answer:
        return ""
    # Alan은 웹 검색 기반이라 엉뚱한 스톡 이미지를 주는 경우가 많다.
    # 후보 URL을 순서대로 HEAD로 찔러 실제 이미지인 것만 채택하고, 없으면 빈 값(→ user_upload fallback).
    for m in _IMG_URL.finditer(answer):
        url = m.group(0).rstrip(".,)")
        if await _is_image(url):
            return url
    return ""


async def _is_image(url: str) -> bool:
    try:
        async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as client:
            res = await client.head(url)
        return res.status_code == 200 and res.headers.get("content-type", "").startswith("image/")
    except httpx.HTTPError:
        return False


async def comment_on_analysis(product_name: str, risky: list[str]) -> str:
    """분석 결과 화면의 'AI 코멘트'. 실패 시 규칙 기반 문구로 대체."""
    if risky:
        fallback = (
            f"{', '.join(risky[:2])} 등 유당 관련 원료가 포함되어 있어 "
            "유당불내증이 있는 분들은 불편함을 느낄 수 있어요. 식물성 대체음료를 추천드려요."
        )
    else:
        fallback = "유당 관련 주의 원료가 발견되지 않았어요. 유당불내증이 있어도 비교적 편하게 드실 수 있어요."

    answer = await ask(
        f"'{product_name}' 제품의 원재료 중 {', '.join(risky) or '주의 성분 없음'}에 대해, "
        "유당불내증이 있는 사람에게 두 문장 이내의 한국어 존댓말로 조언해줘. 사족 없이 조언만."
    )
    answer = answer.strip()
    return answer if 10 < len(answer) < 300 else fallback
