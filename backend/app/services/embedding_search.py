"""embedded/search_test_hybrid.py 방식의 실시간 하이브리드(임베딩+키워드) 검색.

임베딩 벡터를 얻는 경로가 두 가지다 (OCR과 동일한 분리 전략).
  1. EMBEDDING_SERVICE_URL  → 원격 임베딩 서비스 호출 (배포 환경 기본. 서버리스 용량 제한 회피)
  2. 미설정                 → 같은 프로세스에서 fastembed 실행 (로컬 개발)
둘 다 실패하면 rank_products()가 None을 돌려주고, 호출부는 이를 기존
ilike 검색으로 자동 대체하는 신호로 쓴다.
"""
from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass
from functools import lru_cache

import httpx

from app.core.config import settings
from app.core.db import Product

MODEL_NAME = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
SEMANTIC_WEIGHT = 0.65
KEYWORD_WEIGHT = 0.35
MIN_SCORE = 0.4  # 이 밑이면 "무관한 결과"로 보고 제외 (예: "서울" 검색에 무관 제품이 섞이는 문제 방지)

_STRIP_RE = re.compile(r"[\s\-_·ㆍ/\\()\[\]{}.,:;!?\"'`~]+")


def _normalize(text: str) -> str:
    text = unicodedata.normalize("NFKC", text or "").lower()
    return _STRIP_RE.sub("", text)


def _char_bigrams(text: str) -> set[str]:
    norm = _normalize(text)
    if len(norm) < 2:
        return {norm} if norm else set()
    return {norm[i : i + 2] for i in range(len(norm) - 1)}


def _bigram_overlap(query: str, target: str) -> float:
    q, t = _char_bigrams(query), _char_bigrams(target)
    if not q or not t:
        return 0.0
    return len(q & t) / len(q)


def _field_match_score(query: str, target: str) -> float:
    q, t = _normalize(query), _normalize(target)
    if not q or not t:
        return 0.0
    if q == t:
        return 1.0
    if q in t:
        return 1.0
    if t in q:
        return 0.85
    return min(0.7, _bigram_overlap(q, t) * 0.7)


def _keyword_score(query: str, product: Product) -> float:
    name_score = _field_match_score(query, product.name)
    category_score = _field_match_score(query, product.category)
    return ((1.0 * name_score) + (0.9 * category_score)) / 1.9


@lru_cache(maxsize=1)
def _model():
    from fastembed import TextEmbedding  # noqa: PLC0415 (무거운 의존성)

    return TextEmbedding(model_name=MODEL_NAME)


def _normalize_rows(vectors):
    import numpy as np

    arr = np.asarray(vectors, dtype=np.float32)
    norms = np.linalg.norm(arr, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    return arr / norms


def _embed(texts: list[str]):
    """텍스트 → 정규화된 임베딩 행렬. 원격 서비스 우선, 없으면 로컬 fastembed."""
    if settings.EMBEDDING_SERVICE_URL:
        return _embed_remote(texts)
    return _normalize_rows(list(_model().embed(texts)))


def _embed_remote(texts: list[str]):
    headers = {"X-API-Key": settings.EMBEDDING_API_KEY} if settings.EMBEDDING_API_KEY else {}
    res = httpx.post(
        f"{settings.EMBEDDING_SERVICE_URL.rstrip('/')}/embed",
        json={"texts": texts},
        headers=headers,
        timeout=60.0,
    )
    res.raise_for_status()
    return _normalize_rows((res.json() or {}).get("vectors", []))


def _product_text(product: Product) -> str:
    return f"{product.name} {product.category} {product.maker_name} {product.raw_ingredients}"


@dataclass(frozen=True)
class RankedProduct:
    product: Product
    score: float


def rank_products(query: str, products: list[Product], top_k: int) -> list[RankedProduct] | None:
    """하이브리드 스코어 상위 top_k. 임베딩을 못 얻으면 None(= 폴백 필요 신호)을 돌려준다."""
    if not query or not products:
        return []
    try:
        import numpy as np

        # 검색어와 제품 텍스트를 한 번에 임베딩 (원격이면 네트워크 왕복 1회)
        matrix = _embed([query, *[_product_text(p) for p in products]])
        query_vec, product_vecs = matrix[0], matrix[1:]
    except Exception:
        return None

    semantic = (product_vecs @ query_vec + 1.0) / 2.0
    keyword = np.array([_keyword_score(query, p) for p in products])
    hybrid = SEMANTIC_WEIGHT * semantic + KEYWORD_WEIGHT * keyword

    ranked = sorted(
        (RankedProduct(p, float(s)) for p, s in zip(products, hybrid) if s >= MIN_SCORE),
        key=lambda r: -r.score,
    )
    return ranked[:top_k]
