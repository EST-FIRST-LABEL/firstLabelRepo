"""대량 제품 적재 파이프라인.

CSV 한 개를 읽어 각 제품을 적재한다:
  1. 기본정보(제품명/분류/제조사/원재료/이미지 URL) → products
  2. analyze()로 유당 여부(is_lactose_free) 세팅
  3. gte-small 임베딩 생성 → product_embeddings (pgvector, 384차원)
재실행 안전: 제품은 이름으로, 임베딩은 (product_id, model) 유니크로 upsert.

준비물(실행 전):
  - Supabase에 pgvector 마이그레이션 적용: supabase/migrations/2026-08-18-embeddings-gte-small-384.sql
  - 임베딩용 EMBEDDING_SERVICE_URL / EMBEDDING_API_KEY 설정(gte-small Edge Function).
    미설정 시 로컬 fastembed로 떨어지는데, 그러면 검색어(gte-small)와 벡터 공간이
    달라져 검색 품질이 깨진다 → 반드시 Edge Function을 쓰도록 설정할 것.

실행 (backend/ 상위, 즉 repo 루트에서):
    python scripts/ingest_products.py <파일.csv> [--limit N] [--no-embed] [--dry-run]

컬럼 매핑: 실제 파일을 받으면 아래 COLUMN_MAP만 파일 헤더에 맞춰 바꾸면 된다.
"""
import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.db import EMBEDDING_DIM, Product, ProductEmbedding, SessionLocal, init_db  # noqa: E402
from app.services import embedding_search  # noqa: E402
from app.services.ingredients import analyze  # noqa: E402

# 우리 필드 → CSV 헤더 이름. (기본값은 HACCP 식품 데이터 기준. 실제 파일 받으면 여기만 수정)
COLUMN_MAP = {
    "name": "prdlstNm",
    "category": "prdkind",
    "maker_name": "manufacture",
    "raw_ingredients": "rawmtrl",
    "image_url": "imgurl1",
}

EMBED_MODEL = "gte-small"
EMBED_BATCH = 128  # Edge Function 1회 호출당 텍스트 수


def _get(row: dict, field: str) -> str:
    return (row.get(COLUMN_MAP.get(field, ""), "") or "").strip()


def _embed_text(p: Product) -> str:
    # 검색어 임베딩과 같은 구성(embedding_search._product_text)과 맞춘다.
    return f"{p.name} {p.category} {p.maker_name} {p.raw_ingredients}"


def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args:
        print("사용법: python scripts/ingest_products.py <파일.csv> [--limit N] [--no-embed] [--dry-run]")
        sys.exit(1)
    path = Path(args[0])
    limit = None
    if "--limit" in sys.argv:
        limit = int(sys.argv[sys.argv.index("--limit") + 1])
    no_embed = "--no-embed" in sys.argv
    dry_run = "--dry-run" in sys.argv

    init_db()
    db = SessionLocal()

    with open(path, encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))
    if limit:
        rows = rows[:limit]
    print(f"{len(rows)}행 읽음. (dry_run={dry_run}, embed={not no_embed})")

    # 1~2단계: 제품 upsert + 유당 분석
    products: list[Product] = []
    added = updated = 0
    for row in rows:
        name = _get(row, "name")
        if not name:
            continue
        ingredients = _get(row, "raw_ingredients")
        result = analyze(ingredients)
        fields = dict(
            name=name,
            category=_get(row, "category"),
            maker_name=_get(row, "maker_name"),
            raw_ingredients=ingredients,
            image_url=_get(row, "image_url"),  # URL 그대로 저장
            image_source="crawled",
            is_lactose_free=not result["has_warning"],
        )
        existing = db.query(Product).filter(Product.name == name).first()
        if existing:
            for k, v in fields.items():
                setattr(existing, k, v)
            products.append(existing)
            updated += 1
        else:
            p = Product(**fields)
            db.add(p)
            products.append(p)
            added += 1

    if dry_run:
        db.rollback()
        print(f"[dry-run] 신규 {added} / 수정 {updated} (커밋 안 함)")
        return

    db.flush()  # product.id 확보
    db.commit()
    print(f"제품 upsert: 신규 {added} / 수정 {updated} (총 {db.query(Product).count()}건)")

    if no_embed:
        print("임베딩 생략(--no-embed).")
        return

    # 3단계: 임베딩 생성 → product_embeddings upsert (배치)
    to_embed = [p for p in products]
    done = 0
    for i in range(0, len(to_embed), EMBED_BATCH):
        batch = to_embed[i : i + EMBED_BATCH]
        vectors = embedding_search._embed([_embed_text(p) for p in batch])  # 정규화된 (N,384)
        if vectors is None or len(vectors) != len(batch):
            print(f"  임베딩 실패(배치 {i}): 서비스 확인 필요(EMBEDDING_SERVICE_URL).")
            db.rollback()
            sys.exit(1)
        for p, vec in zip(batch, vectors):
            emb = list(map(float, vec))
            existing = (
                db.query(ProductEmbedding)
                .filter(ProductEmbedding.product_id == p.id, ProductEmbedding.model == EMBED_MODEL)
                .first()
            )
            if existing:
                existing.embedding = emb
                existing.dim = EMBEDDING_DIM
                existing.source = "name_ingredients"
            else:
                db.add(
                    ProductEmbedding(
                        product_id=p.id,
                        source="name_ingredients",
                        model=EMBED_MODEL,
                        dim=EMBEDDING_DIM,
                        embedding=emb,
                    )
                )
        db.commit()
        done += len(batch)
        print(f"  임베딩 {done}/{len(to_embed)}")

    print(f"완료. 임베딩 {done}건 저장 (모델 {EMBED_MODEL}, {EMBEDDING_DIM}차원).")


if __name__ == "__main__":
    main()
