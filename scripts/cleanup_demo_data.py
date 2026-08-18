"""Remove the bundled demo catalog and demo account without touching HACCP rows."""

import argparse
import json
import sys
from dataclasses import asdict, dataclass
from pathlib import Path

from sqlalchemy import delete, inspect, select, update
from sqlalchemy.orm import Session

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.core.db import (  # noqa: E402
    Analysis,
    Inquiry,
    Product,
    ProductEmbedding,
    ProductIngredientProfile,
    Registration,
    SavedFilter,
    SearchHistory,
    SessionLocal,
    User,
    Wishlist,
)

DEMO_LOGIN_ID = "firstlabel2024"
DEMO_PRODUCT_NAMES = {
    "서울우유 나100% 우유",
    "서울우유 저지방 우유",
    "매일유업 우유 저지방 2%",
    "매일 소화가 잘되는 우유 락토프리",
    "매일유업 아몬드 브리즈 언스위트",
    "아몬드브리즈 초콜릿",
    "초코에몽",
    "제티 초코 드링크",
    "닥터유 단백질 드링크 초코",
    "칼로바이 파워 프로틴바 초코맛",
    "제로 카카오 케이크",
    "요플레 플레인",
    "베지밀 담백한 두유",
    "오트리 오트드링크 바리스타",
    "덴마크 드링킹 요구르트 플레인",
    "빙그레 초코맛우유",
    "서울우유 초코우유",
    "매일 초코우유",
    "오틀리 초콜릿 오트드링크",
    "빙그레 딸기맛우유",
    "서울우유 딸기우유",
    "매일 딸기우유",
    "매일 아몬드브리즈 딸기",
    "빙그레 바나나맛우유",
    "매일 바나나우유",
    "서울우유 커피포리",
    "매일 소화가 잘되는 우유 초코",
}


@dataclass(frozen=True)
class CleanupSummary:
    demo_products: int
    demo_users: int
    preserved_analyses: int
    applied: bool


def cleanup_demo_data(
    db: Session,
    *,
    apply: bool,
    expected_products: int | None = 27,
    demo_names: set[str] | frozenset[str] = DEMO_PRODUCT_NAMES,
) -> CleanupSummary:
    products = list(
        db.scalars(
            select(Product).where(
                Product.name.in_(demo_names),
                Product.image_source == "crawled",
                Product.report_no.is_(None),
            )
        )
    )
    product_ids = [product.id for product in products]
    demo_users = list(db.scalars(select(User).where(User.login_id == DEMO_LOGIN_ID)))
    demo_user_ids = [user.id for user in demo_users]
    preserved_analyses = 0
    if product_ids:
        analysis_stmt = select(Analysis).where(Analysis.product_id.in_(product_ids))
        if demo_user_ids:
            analysis_stmt = analysis_stmt.where(Analysis.user_id.not_in(demo_user_ids))
        preserved_analyses = len(list(db.scalars(analysis_stmt)))

    if expected_products is not None and len(products) not in (0, expected_products):
        raise RuntimeError(
            f"Expected {expected_products} demo products (or 0 after cleanup), found {len(products)}."
        )

    summary = CleanupSummary(
        demo_products=len(products),
        demo_users=len(demo_users),
        preserved_analyses=preserved_analyses,
        applied=apply,
    )
    if not apply:
        return summary

    try:
        existing_tables = set(inspect(db.get_bind()).get_table_names())
        if demo_user_ids:
            for model in (SavedFilter, Inquiry, Wishlist, SearchHistory, Analysis, Registration):
                db.execute(delete(model).where(model.user_id.in_(demo_user_ids)))

        if product_ids:
            db.execute(
                update(Analysis)
                .where(Analysis.product_id.in_(product_ids))
                .values(product_id=None)
            )
            db.execute(
                update(Registration)
                .where(Registration.product_id.in_(product_ids))
                .values(product_id=None)
            )
            for model in (Wishlist, ProductEmbedding, ProductIngredientProfile):
                if model.__tablename__ in existing_tables:
                    db.execute(delete(model).where(model.product_id.in_(product_ids)))
            db.execute(delete(Product).where(Product.id.in_(product_ids)))

        if demo_user_ids:
            db.execute(delete(User).where(User.id.in_(demo_user_ids)))
        db.commit()
    except Exception:
        db.rollback()
        raise
    return summary


def main() -> None:
    parser = argparse.ArgumentParser(description="Remove FIRST LABEL demo data.")
    parser.add_argument("--apply", action="store_true", help="Commit changes; default is dry-run.")
    parser.add_argument("--expected-products", type=int, default=27)
    args = parser.parse_args()
    with SessionLocal() as db:
        summary = cleanup_demo_data(
            db,
            apply=args.apply,
            expected_products=args.expected_products,
        )
    print(json.dumps(asdict(summary), ensure_ascii=False))


if __name__ == "__main__":
    main()
