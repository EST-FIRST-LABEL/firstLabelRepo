import sys
from pathlib import Path

from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import Session

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "backend"))

from app.api.products import autocomplete, home, search  # noqa: E402
from app.core.db import Analysis, Base, Product, User  # noqa: E402
from scripts.cleanup_demo_data import cleanup_demo_data  # noqa: E402


def _db() -> Session:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    return Session(engine)


def _haccp(name: str, report_no: str, **values) -> Product:
    return Product(name=name, report_no=report_no, image_source="haccp_csv", **values)


def test_public_catalog_excludes_demo_products():
    db = _db()
    db.add_all(
        [
            _haccp(
                "실제 프레첼",
                "catalog-real",
                category="과자",
                image_url="https://example.test/real.jpg",
            ),
            Product(name="목업 프레첼", category="음료", image_source="crawled", rating=5.0),
        ]
    )
    db.commit()

    assert [item["name"] for item in autocomplete(q="프레첼", db=db)["items"]] == ["실제 프레첼"]
    assert [item["name"] for item in search(q="프레첼", db=db, user=None)["items"]] == ["실제 프레첼"]
    result = home(db=db, user=None)
    assert [item["name"] for item in result["recommended"]] == ["실제 프레첼"]
    assert [item["code"] for item in result["categories"]] == ["과자"]


def test_cleanup_preserves_duplicate_haccp_product_and_real_user_history():
    db = _db()
    demo_user = User(login_id="firstlabel2024", nickname="데모", password_hash="x")
    real_user = User(login_id="real-user", nickname="실사용자", password_hash="x")
    mock = Product(name="목업 우유", image_source="crawled", report_no=None)
    real = _haccp("목업 우유", "cleanup-real")
    db.add_all([demo_user, real_user, mock, real])
    db.flush()
    db.add(Analysis(user_id=real_user.id, product_id=mock.id, product_name=mock.name))
    db.commit()
    mock_id, real_id = mock.id, real.id
    db.execute(text("DROP TABLE product_embeddings"))
    db.execute(text("DROP TABLE product_ingredient_profiles"))
    db.commit()

    cleanup_demo_data(
        db,
        apply=True,
        expected_products=1,
        demo_names={"목업 우유"},
    )

    assert db.get(Product, mock_id) is None
    assert db.get(Product, real_id) is not None
    assert db.scalar(select(User).where(User.login_id == "firstlabel2024")) is None
    assert db.scalar(select(Analysis).where(Analysis.product_name == "목업 우유")).product_id is None


if __name__ == "__main__":
    tests = [value for key, value in sorted(globals().items()) if key.startswith("test_")]
    for test in tests:
        test()
        print(f"  ok  {test.__name__}")
    print(f"\n{len(tests)} passed")
