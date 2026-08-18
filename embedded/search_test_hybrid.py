import re
import unicodedata
import numpy as np
import pandas as pd
from sentence_transformers import SentenceTransformer

CSV_PATH = "products_with_embedding_text.csv"
EMBEDDING_PATH = "product_embeddings.npy"
MODEL_NAME = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"

SEMANTIC_WEIGHT = 0.65
KEYWORD_WEIGHT = 0.35
TOP_K = 10

NAME_COL = "prdlstNm"
CATEGORY_COL = "prdkind"


def normalize_text(text):
    text = "" if pd.isna(text) else str(text)
    text = unicodedata.normalize("NFKC", text).lower()
    text = re.sub(r"[\s\-_·ㆍ/\\()\[\]{}.,:;!?\"'`~]+", "", text)
    return text


def char_bigrams(text):
    text = normalize_text(text)
    if len(text) < 2:
        return {text} if text else set()
    return {text[i:i+2] for i in range(len(text) - 1)}


def bigram_overlap(query, target):
    q = char_bigrams(query)
    t = char_bigrams(target)
    if not q or not t:
        return 0.0
    return len(q & t) / len(q)


def field_match_score(query, target):
    q = normalize_text(query)
    t = normalize_text(target)

    if not q or not t:
        return 0.0
    if q == t:
        return 1.0
    if q in t:
        return 1.0
    if t in q:
        return 0.85

    return min(0.7, bigram_overlap(q, t) * 0.7)


def keyword_score(query, product_name, category):
    name_score = field_match_score(query, product_name)
    category_score = field_match_score(query, category)

    weighted = (1.0 * name_score) + (0.9 * category_score)
    normalized = weighted / 1.9

    return normalized, name_score, category_score


print("데이터와 임베딩 불러오는 중...")

df = pd.read_csv(CSV_PATH)
embeddings = np.load(EMBEDDING_PATH)

if len(df) != len(embeddings):
    raise ValueError(f"행 개수 불일치: CSV={len(df)}, embeddings={len(embeddings)}")

print("제품 수:", len(df))
print("Embedding shape:", embeddings.shape)

print("모델 로드 중...")
model = SentenceTransformer(MODEL_NAME)


def search(query, top_k=TOP_K):
    query_embedding = model.encode(
        query,
        normalize_embeddings=True
    )

    semantic_raw = embeddings @ query_embedding

    semantic_scaled = (semantic_raw + 1.0) / 2.0
    semantic_scaled = np.clip(semantic_scaled, 0.0, 1.0)

    keyword_scores = np.zeros(len(df), dtype=np.float32)
    name_scores = np.zeros(len(df), dtype=np.float32)
    category_scores = np.zeros(len(df), dtype=np.float32)
    exact_matches = np.zeros(len(df), dtype=np.int8)

    q_norm = normalize_text(query)

    for i, row in df.iterrows():
        product_name = row.get(NAME_COL, "")
        category = row.get(CATEGORY_COL, "")

        kw, name_s, cat_s = keyword_score(query, product_name, category)

        keyword_scores[i] = kw
        name_scores[i] = name_s
        category_scores[i] = cat_s

        exact_matches[i] = int(
            q_norm != "" and q_norm == normalize_text(product_name)
        )

    hybrid_scores = (
        SEMANTIC_WEIGHT * semantic_scaled
        + KEYWORD_WEIGHT * keyword_scores
    )

    semantic_order = np.argsort(semantic_raw)[::-1][:top_k]
    hybrid_order = sorted(
        range(len(df)),
        key=lambda i: (exact_matches[i], hybrid_scores[i]),
        reverse=True
    )[:top_k]

    print("\n" + "=" * 90)
    print(f"검색어: {query}")
    print(f"Hybrid = {SEMANTIC_WEIGHT:.2f} x Semantic + {KEYWORD_WEIGHT:.2f} x Keyword")
    print("=" * 90)

    print("\n[1] Semantic only TOP", top_k)
    print("-" * 90)

    for rank, idx in enumerate(semantic_order, start=1):
        row = df.iloc[idx]
        print(
            f"{rank:2d}. {row[NAME_COL]} | {row[CATEGORY_COL]} "
            f"| semantic={semantic_raw[idx]:.4f}"
        )

    print("\n[2] Hybrid TOP", top_k)
    print("-" * 90)

    for rank, idx in enumerate(hybrid_order, start=1):
        row = df.iloc[idx]
        exact_mark = " [EXACT]" if exact_matches[idx] else ""

        print(
            f"{rank:2d}. {row[NAME_COL]} | {row[CATEGORY_COL]}{exact_mark}\n"
            f"    semantic(raw)={semantic_raw[idx]:.4f} "
            f"| semantic(0~1)={semantic_scaled[idx]:.4f} "
            f"| keyword={keyword_scores[idx]:.4f} "
            f"(name={name_scores[idx]:.2f}, category={category_scores[idx]:.2f}) "
            f"| final={hybrid_scores[idx]:.4f}"
        )


if __name__ == "__main__":
    search("초코우유", top_k=10)

    # 여러 검색어를 한 번에 보고 싶으면 아래 주석을 해제하세요.
    """
    test_queries = [
        "초코우유",
        "딸기우유",
        "바나나우유",
        "두유",
        "라떼",
        "커피",
        "감자칩",
        "쿠키",
        "식빵",
        "탄산음료",
    ]

    for q in test_queries:
        search(q, top_k=5)
    """
