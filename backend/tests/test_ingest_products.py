import sys
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))


def _row(report_no="", name="", rawmtrl="", seller="maker", prdkind="drink"):
    return {
        "prdlstReportNo": report_no,
        "prdlstNm": name,
        "prdkind": prdkind,
        "seller": seller,
        "rawmtrl": rawmtrl,
        "allergy": "",
        "nutrient": "",
        "capacity": "",
        "imgurl1": "",
    }


def _fresh_db():
    from app.core.db import Base

    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    return Session(engine)


def test_catalog_fields_match_the_haccp_csv_headers():
    from scripts.ingest_products import catalog_fields

    fields = catalog_fields(
        {
            "prdlstReportNo": "20260001",
            "prdlstNm": "sample",
            "prdkind": "drink",
            "seller": "maker",
            "rawmtrl": "water, sugar",
            "allergy": "milk",
            "nutrient": "100 kcal",
            "capacity": "100 ml",
            "imgurl1": "http://example.com/product.jpg",
        }
    )

    assert fields == {
        "report_no": "20260001",
        "name": "sample",
        "category": "drink",
        "maker_name": "maker",
        "raw_ingredients": "water, sugar",
        "allergy_info": "milk",
        "nutrition_info": "100 kcal",
        "volume": "100 ml",
        "image_url": "https://example.com/product.jpg",
        "image_source": "crawled",
    }


def test_report_no_upsert_does_not_overwrite_a_different_product():
    """다른 신고번호를 가진 동명 제품을 이름 fallback으로 덮어쓰지 않는다 (Important 1)."""
    from app.core.db import Product
    from scripts.ingest_products import upsert_products

    with _fresh_db() as db:
        db.add(Product(report_no="111", name="우유", raw_ingredients="원유"))
        db.commit()

        _, stats = upsert_products(db, [_row(report_no="222", name="우유", rawmtrl="원유,정제수")])
        db.flush()
        db.commit()

        products = db.query(Product).all()

    assert stats.added == 1
    assert stats.updated == 0
    assert {p.report_no for p in products} == {"111", "222"}
    original = next(p for p in products if p.report_no == "111")
    assert original.raw_ingredients == "원유"  # 원본 제품은 손대지 않는다


def test_duplicate_report_no_within_one_csv_is_deduped():
    """한 CSV 안의 중복 신고번호는 하나의 제품으로 병합되고 마지막 행이 이긴다 (Important 1)."""
    from app.core.db import Product
    from scripts.ingest_products import upsert_products

    with _fresh_db() as db:
        rows = [
            _row(report_no="111", name="우유A", rawmtrl="원유"),
            _row(report_no="111", name="우유B", rawmtrl="원유,정제수"),
        ]
        _, stats = upsert_products(db, rows)
        db.flush()
        db.commit()

        products = db.query(Product).all()

    assert len(products) == 1
    assert stats.added == 1
    assert stats.updated == 0
    assert stats.duplicates == 1
    assert products[0].name == "우유B"


def test_name_fallback_updates_only_legacy_rows_without_report_no():
    """신고번호 없는 레거시 행만 이름으로 갱신된다 (Important 1)."""
    from app.core.db import Product
    from scripts.ingest_products import upsert_products

    with _fresh_db() as db:
        db.add(Product(report_no=None, name="빵", raw_ingredients="밀"))
        db.commit()

        _, stats = upsert_products(db, [_row(report_no="", name="빵", rawmtrl="밀,버터")])
        db.flush()
        db.commit()

        products = db.query(Product).all()

    assert len(products) == 1
    assert stats.updated == 1
    assert stats.added == 0
    assert products[0].raw_ingredients == "밀,버터"


def test_empty_report_no_is_stored_as_null():
    """빈 신고번호는 '' 대신 NULL로 저장되어 unique index 충돌을 피한다 (Important 1)."""
    from app.core.db import Product
    from scripts.ingest_products import upsert_products

    with _fresh_db() as db:
        rows = [
            _row(report_no="", name="제품1", rawmtrl="물"),
            _row(report_no="", name="제품2", rawmtrl="물"),
        ]
        upsert_products(db, rows)
        db.flush()
        db.commit()

        products = db.query(Product).all()

    assert len(products) == 2
    assert all(p.report_no is None for p in products)
