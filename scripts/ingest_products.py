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
from dataclasses import dataclass
from pathlib import Path

from sqlalchemy.orm import Session

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.db import (  # noqa: E402
    EMBEDDING_DIM,
    Product,
    ProductEmbedding,
    ProductIngredientProfile,
    SessionLocal,
    init_db,
)
from app.services import embedding_search  # noqa: E402
from app.services.product_profiles import build_ingredient_profile, save_ingredient_profile  # noqa: E402

# 우리 필드 → CSV 헤더 이름. (기본값은 HACCP 식품 데이터 기준. 실제 파일 받으면 여기만 수정)
COLUMN_MAP = {
    "report_no": "prdlstReportNo",
    "name": "prdlstNm",
    "category": "prdkind",
    "maker_name": "seller",
    "raw_ingredients": "rawmtrl",
    "allergy_info": "allergy",
    "nutrition_info": "nutrient",
    "volume": "capacity",
    "image_url": "imgurl1",
}

EMBED_MODEL = "gte-small"
EMBED_BATCH = 128  # Edge Function 1회 호출당 텍스트 수


def _get(row: dict, field: str) -> str:
    return (row.get(COLUMN_MAP.get(field, ""), "") or "").strip()


def catalog_fields(row: dict) -> dict[str, str]:
    image_url = _get(row, "image_url")
    if image_url.startswith("http://"):
        image_url = "https://" + image_url.removeprefix("http://")
    return {
        "report_no": _get(row, "report_no"),
        "name": _get(row, "name"),
        "category": _get(row, "category"),
        "maker_name": _get(row, "maker_name"),
        "raw_ingredients": _get(row, "raw_ingredients"),
        "allergy_info": _get(row, "allergy_info"),
        "nutrition_info": _get(row, "nutrition_info"),
        "volume": _get(row, "volume"),
        "image_url": image_url,
        "image_source": "crawled",
    }


def _embed_text(p: Product) -> str:
    # 검색어 임베딩과 같은 구성(embedding_search._product_text)과 맞춘다.
    return f"{p.name} {p.category} {p.maker_name} {p.raw_ingredients}"


@dataclass
class IngestStats:
    added: int = 0
    updated: int = 0
    duplicates: int = 0  # 같은 CSV 안에서 신고번호가 중복된 행 수
    skipped: int = 0  # 이름이 비어 건너뛴 행 수


def resolve_product(db: Session, report_no: str | None, name: str) -> Product | None:
    """이 행이 갱신할 기존 제품을 찾는다. 없으면 None(신규 insert 대상).

    신고번호가 있으면 신고번호로만 매칭한다. 신고번호로 못 찾았거나 신고번호가 없을 때는
    이름으로 fallback하되, **신고번호가 없는 레거시 행만** 매칭한다. 이렇게 하면 서로 다른
    신고번호를 가진 동명 제품을 실수로 덮어쓰지 않는다 (Important 1).
    """
    if report_no:
        found = db.query(Product).filter(Product.report_no == report_no).first()
        if found is not None:
            return found
    return (
        db.query(Product)
        .filter(Product.name == name, Product.report_no.is_(None))
        .first()
    )


def upsert_products(db: Session, rows: list[dict]) -> tuple[dict[Product, dict], IngestStats]:
    """CSV 행들을 제품으로 upsert한다. (제품→프로필값 매핑, 통계)를 돌려준다.

    - 신고번호를 우선 식별자로 사용한다.
    - 한 CSV 안의 중복 신고번호는 하나의 제품으로 병합하고 마지막 행이 이긴다.
    - 이름 fallback은 신고번호가 없는 레거시 행에만 적용한다.
    아직 flush/commit하지 않는다. 호출부에서 flush 후 프로필을 저장한다.
    """
    profile_map: dict[Product, dict] = {}
    stats = IngestStats()
    seen: dict[str, Product] = {}  # 이번 실행에서 이미 처리한 신고번호 → 제품

    for row in rows:
        catalog = catalog_fields(row)
        name = catalog["name"]
        if not name:
            stats.skipped += 1
            continue

        profile_values = build_ingredient_profile(catalog["raw_ingredients"])
        fields = dict(catalog)
        # 빈 신고번호는 '' 대신 NULL로 저장(unique index 충돌/오매칭 방지).
        fields["report_no"] = fields["report_no"] or None
        fields["is_lactose_free"] = not profile_values["lactose_risk"]
        report_no = fields["report_no"]

        if report_no and report_no in seen:
            target = seen[report_no]
            for key, value in fields.items():
                setattr(target, key, value)
            profile_map[target] = profile_values
            stats.duplicates += 1
            continue

        existing = resolve_product(db, report_no, name)
        if existing is not None:
            for key, value in fields.items():
                setattr(existing, key, value)
            target = existing
            stats.updated += 1
        else:
            target = Product(**fields)
            db.add(target)
            stats.added += 1

        profile_map[target] = profile_values
        if report_no:
            seen[report_no] = target

    return profile_map, stats


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
    profile_map, stats = upsert_products(db, rows)
    if stats.duplicates:
        print(f"경고: 같은 CSV 안에서 중복 신고번호 {stats.duplicates}건을 병합했습니다(마지막 행 우선).")
    if stats.skipped:
        print(f"이름이 비어 건너뛴 행 {stats.skipped}건.")

    if dry_run:
        db.rollback()
        print(f"[dry-run] 신규 {stats.added} / 수정 {stats.updated} (커밋 안 함)")
        return

    db.flush()  # product.id 확보
    for product, profile_values in profile_map.items():
        save_ingredient_profile(db, product, profile_values)
    db.commit()
    product_count = db.query(Product).count()
    print(f"제품 upsert: 신규 {stats.added} / 수정 {stats.updated} (총 {product_count}건)")

    # 배포 gate: 모든 상품에 프로필이 있어야 GENERAL 필터가 프로필 없는 상품을
    # 통과시키지 않는다 (Important 2). 불일치 시 backfill이 필요하다.
    profile_count = db.query(ProductIngredientProfile).count()
    if profile_count != product_count:
        print(
            f"경고: 프로필 커버리지 불일치 products={product_count} profiles={profile_count}. "
            "GENERAL 필터가 프로필 없는 상품을 제외하므로, 배포 전 전체 재적재/backfill로 "
            "profiles == products 를 맞추세요."
        )
    else:
        print(f"프로필 커버리지 OK: products=profiles={product_count}")

    if no_embed:
        print("임베딩 생략(--no-embed).")
        return

    # 3단계: 임베딩 생성 → product_embeddings upsert (배치)
    to_embed = list(profile_map.keys())
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
