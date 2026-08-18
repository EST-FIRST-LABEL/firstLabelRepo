import hashlib
import json

from sqlalchemy.orm import Session

from app.core.db import Product, ProductIngredientProfile
from app.services.ingredients import _norm, analyze, split_ingredients


def build_ingredient_profile(raw_ingredients: str) -> dict:
    raw = raw_ingredients or ""
    tokens = sorted({_norm(item) for item in split_ingredients(raw) if _norm(item)})
    return {
        "source_hash": hashlib.sha256(raw.encode("utf-8")).hexdigest(),
        "analysis_json": json.dumps(analyze(raw), ensure_ascii=False),
        "tokens_json": json.dumps(tokens, ensure_ascii=False),
        "lactose_risk": analyze(raw, ["LACTOSE"])["has_warning"],
        "general_risk": analyze(raw, ["GENERAL"])["has_warning"],
    }


def save_ingredient_profile(
    db: Session,
    product: Product,
    values: dict | None = None,
) -> ProductIngredientProfile:
    profile = db.get(ProductIngredientProfile, product.id)
    if profile is None:
        profile = ProductIngredientProfile(product_id=product.id)
        db.add(profile)
    for key, value in (values or build_ingredient_profile(product.raw_ingredients)).items():
        setattr(profile, key, value)
    product.is_lactose_free = not profile.lactose_risk
    return profile


def profile_tokens(profile: ProductIngredientProfile | None, raw_ingredients: str) -> set[str]:
    if profile:
        try:
            return set(json.loads(profile.tokens_json or "[]"))
        except (TypeError, ValueError):
            pass
    return {_norm(item) for item in split_ingredients(raw_ingredients or "") if _norm(item)}
