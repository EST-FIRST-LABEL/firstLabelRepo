import json

from sqlalchemy import create_engine
from sqlalchemy.orm import Session


def test_general_filter_excludes_products_without_a_profile():
    """프로필이 없는 상품은 GENERAL 필터에서 안전으로 취급하지 않고 제외한다 (Important 2)."""
    from app.api.products import recommendations
    from app.core.db import Base, Product, ProductIngredientProfile, SavedFilter, User
    from app.core.security import hash_password

    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)

    with Session(engine) as db:
        user = User(login_id="general01", nickname="tester", password_hash=hash_password("Passw0rd!"))
        db.add(user)
        db.flush()
        saved_filter = SavedFilter(user_id=user.id, name="general filter", keywords='["GENERAL"]')
        db.add(saved_filter)

        base = Product(name="base", category="drink", raw_ingredients="raw-base", rating=3)
        safe_with_profile = Product(name="safe-with-profile", category="drink", raw_ingredients="raw-base", rating=5)
        without_profile = Product(name="no-profile", category="drink", raw_ingredients="raw-base", rating=9)
        db.add_all([base, safe_with_profile, without_profile])
        db.flush()

        db.add_all(
            [
                ProductIngredientProfile(
                    product_id=base.id, source_hash="base",
                    tokens_json=json.dumps(["milk"]), general_risk=False,
                ),
                ProductIngredientProfile(
                    product_id=safe_with_profile.id, source_hash="safe",
                    tokens_json=json.dumps(["milk"]), general_risk=False,
                ),
            ]
        )
        db.commit()
        without_id = without_profile.id
        safe_id = safe_with_profile.id

        result = recommendations(base.id, filter_id=saved_filter.id, db=db, user=user)

    returned_ids = {
        item["id"]
        for section in ("similar", "lactose_free", "plant_based")
        for item in result[section]
    }
    assert without_id not in returned_ids  # 프로필 없는 상품은 우회하지 못한다
    assert safe_id in returned_ids  # 프로필이 있고 안전한 상품은 통과한다
    assert result["excluded_count"] == 1


def test_saved_filter_uses_persisted_profiles_before_ranking():
    from app.api.products import recommendations
    from app.core.db import Base, Product, SavedFilter, User
    from app.core.security import hash_password

    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)

    with Session(engine) as db:
        user = User(login_id="recommend01", nickname="tester", password_hash=hash_password("Passw0rd!"))
        db.add(user)
        db.flush()
        saved_filter = SavedFilter(
            user_id=user.id,
            name="lactose filter",
            keywords='["LACTOSE"]',
        )
        db.add(saved_filter)

        base = Product(name="base", category="drink", raw_ingredients="raw-base", rating=3)
        stored_match = Product(
            name="stored-match",
            category="drink",
            raw_ingredients="raw-does-not-match",
            rating=1,
            is_lactose_free=True,
        )
        raw_match_only = Product(
            name="raw-match-only",
            category="drink",
            raw_ingredients="raw-base",
            rating=5,
            is_lactose_free=True,
        )
        unsafe = Product(
            name="unsafe",
            category="drink",
            raw_ingredients="raw-base",
            rating=5,
            is_lactose_free=False,
        )
        db.add_all([base, stored_match, raw_match_only, unsafe])
        db.flush()

        from app.core.db import ProductIngredientProfile

        db.add_all(
            [
                ProductIngredientProfile(
                    product_id=base.id,
                    source_hash="base",
                    analysis_json="{}",
                    tokens_json=json.dumps(["milk", "sugar"]),
                    lactose_risk=False,
                    general_risk=False,
                ),
                ProductIngredientProfile(
                    product_id=stored_match.id,
                    source_hash="stored-match",
                    analysis_json="{}",
                    tokens_json=json.dumps(["milk", "sugar"]),
                    lactose_risk=False,
                    general_risk=False,
                ),
                ProductIngredientProfile(
                    product_id=raw_match_only.id,
                    source_hash="raw-match-only",
                    analysis_json="{}",
                    tokens_json=json.dumps(["cocoa"]),
                    lactose_risk=False,
                    general_risk=False,
                ),
                ProductIngredientProfile(
                    product_id=unsafe.id,
                    source_hash="unsafe",
                    analysis_json="{}",
                    tokens_json=json.dumps(["milk", "sugar"]),
                    lactose_risk=True,
                    general_risk=False,
                ),
            ]
        )
        db.commit()
        unsafe_id = unsafe.id

        result = recommendations(base.id, filter_id=saved_filter.id, db=db, user=user)

    assert result["active_filter"] == {
        "id": saved_filter.id,
        "name": "lactose filter",
        "keywords": ["LACTOSE"],
    }
    assert result["excluded_count"] == 1
    assert result["similar"][0]["name"] == "stored-match"
    returned_ids = {
        item["id"]
        for section in ("similar", "lactose_free", "plant_based")
        for item in result[section]
    }
    assert unsafe_id not in returned_ids
