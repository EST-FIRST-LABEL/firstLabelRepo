from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.db import Analysis, Product, SearchHistory, User, Wishlist, get_db
from app.core.security import current_user, optional_user
from app.services import alan
from app.services.ingredients import analyze

router = APIRouter(prefix="/api/v1/products", tags=["products"])


def card(p: Product, is_wished: bool = False) -> dict:
    return {
        "id": p.id,
        "name": p.name,
        "maker_name": p.maker_name,
        "category": p.category,
        "volume": p.volume,
        "calories": p.calories,
        "image_url": p.image_url,
        "image_source": p.image_source,
        "rating": p.rating,
        "rating_count": p.rating_count,
        "is_lactose_free": p.is_lactose_free,
        "is_plant_based": p.is_plant_based,
        "is_wished": is_wished,
    }


def _wished_ids(db: Session, user: User | None, product_ids: list[int]) -> set[int]:
    """N+1 방지: 목록의 찜 여부를 한 번의 쿼리로 가져온다 (§13-10)."""
    if not user or not product_ids:
        return set()
    rows = db.scalars(
        select(Wishlist.product_id).where(
            Wishlist.user_id == user.id, Wishlist.product_id.in_(product_ids)
        )
    )
    return set(rows)


@router.get("/search")
def search(
    q: str = "",
    category: str = "",
    lactose_free: bool = False,
    plant_based: bool = False,
    limit: int = 30,
    db: Session = Depends(get_db),
    user: User | None = Depends(optional_user),
):
    stmt = select(Product)
    if q:
        like = f"%{q}%"
        # 제품명 / 브랜드 / 원재료 어느 쪽이든 검색 (§홈 화면 placeholder)
        stmt = stmt.where(
            or_(Product.name.ilike(like), Product.maker_name.ilike(like), Product.raw_ingredients.ilike(like))
        )
    if category:
        stmt = stmt.where(Product.category == category)
    if lactose_free:
        stmt = stmt.where(Product.is_lactose_free.is_(True))
    if plant_based:
        stmt = stmt.where(Product.is_plant_based.is_(True))

    items = list(db.scalars(stmt.order_by(Product.rating.desc()).limit(limit)))
    if q and user:
        db.add(SearchHistory(user_id=user.id, keyword=q))
        db.commit()

    wished = _wished_ids(db, user, [p.id for p in items])
    return {"count": len(items), "items": [card(p, p.id in wished) for p in items]}


@router.get("/home")
def home(db: Session = Depends(get_db), user: User | None = Depends(optional_user)):
    items = list(db.scalars(select(Product).order_by(Product.rating.desc()).limit(6)))
    wished = _wished_ids(db, user, [p.id for p in items])
    categories = [
        {"code": c, "label": l, "icon": i}
        for c, l, i in [
            ("유제품", "유제품", "milk"),
            ("음료", "음료", "drink"),
            ("스낵", "스낵", "snack"),
            ("베이커리", "베이커리", "bakery"),
        ]
    ]
    return {"categories": categories, "recommended": [card(p, p.id in wished) for p in items]}


@router.get("/{product_id}")
def detail(
    product_id: int,
    db: Session = Depends(get_db),
    user: User | None = Depends(optional_user),
):
    p = db.get(Product, product_id)
    if not p:
        raise HTTPException(404, "제품을 찾을 수 없습니다.")
    wished = _wished_ids(db, user, [p.id])
    return {**card(p, p.id in wished), "raw_ingredients": p.raw_ingredients}


@router.get("/{product_id}/analysis")
async def product_analysis(
    product_id: int,
    db: Session = Depends(get_db),
    user: User | None = Depends(optional_user),
):
    p = db.get(Product, product_id)
    if not p:
        raise HTTPException(404, "제품을 찾을 수 없습니다.")

    result = analyze(p.raw_ingredients)
    risky = [i["ingredient_name"] for i in result["first_card"]]
    result["ai_comment"] = await alan.comment_on_analysis(p.name, risky)
    result["product"] = card(p, bool(_wished_ids(db, user, [p.id])))

    db.add(Analysis(user_id=user.id if user else None, product_id=p.id, product_name=p.name, score=result["score"]))
    db.commit()
    return result


@router.get("/{product_id}/recommendations")
def recommendations(
    product_id: int,
    db: Session = Depends(get_db),
    user: User | None = Depends(optional_user),
):
    """유사 / 락토프리 / 식물성 3분류 추천 (§2, AI 추천 화면 탭 구성)."""
    base = db.get(Product, product_id)
    if not base:
        raise HTTPException(404, "제품을 찾을 수 없습니다.")

    base_set = _ingredient_set(base.raw_ingredients)
    others = [p for p in db.scalars(select(Product)) if p.id != base.id]

    def scored(pool: list[Product]) -> list[dict]:
        out = []
        for p in pool:
            sim = _jaccard(base_set, _ingredient_set(p.raw_ingredients))
            out.append((sim, p))
        out.sort(key=lambda x: (-x[0], -x[1].rating))
        return out

    same_cat = [p for p in others if p.category == base.category] or others
    similar = scored(same_cat)[:3]
    lactose_free = scored([p for p in others if p.is_lactose_free])[:3]
    plant = scored([p for p in others if p.is_plant_based])[:3]

    ids = [p.id for _, p in similar + lactose_free + plant]
    wished = _wished_ids(db, user, ids)

    def pack(rows, reason_tag):
        return [
            {
                **card(p, p.id in wished),
                "similarity": round(sim * 100),
                "tags": _tags(base, p, sim, reason_tag),
                "reason": _reason(base, p, reason_tag),
            }
            for sim, p in rows
        ]

    return {
        "base_product": card(base, base.id in wished),
        "similar": pack(similar, "similar"),
        "lactose_free": pack(lactose_free, "lactose_free"),
        "plant_based": pack(plant, "plant_based"),
    }


def _ingredient_set(raw: str) -> set[str]:
    from app.services.ingredients import _norm, split_ingredients

    return {_norm(i) for i in split_ingredients(raw)}


def _jaccard(a: set[str], b: set[str]) -> float:
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def _tags(base: Product, p: Product, sim: float, kind: str) -> list[str]:
    tags = [f"유사도 {round(sim * 100)}%"]
    if kind == "lactose_free":
        tags = ["락토프리", "유당 0%"]
    elif kind == "plant_based":
        tags = ["식물성"]
    if base.calories and p.calories and p.calories < base.calories:
        drop = round((base.calories - p.calories) / base.calories * 100)
        if drop >= 5:
            tags.append(f"칼로리 {drop}% ↓")
    return tags[:2]


def _reason(base: Product, p: Product, kind: str) -> str:
    if kind == "lactose_free":
        return f"유당을 분해한 제품이라 {base.name} 대신 부담 없이 드실 수 있어요."
    if kind == "plant_based":
        return f"우유 대신 식물성 원료를 사용해 유당이 들어 있지 않아요."
    return f"{base.name}와(과) 원재료 구성이 비슷하면서 주의 성분이 더 적어요."


@router.post("/{product_id}/wishlist")
def toggle_wishlist(
    product_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    p = db.get(Product, product_id)
    if not p:
        raise HTTPException(404, "제품을 찾을 수 없습니다.")
    row = db.scalar(
        select(Wishlist).where(Wishlist.user_id == user.id, Wishlist.product_id == product_id)
    )
    if row:
        db.delete(row)
        p.wishlist_count = max(0, p.wishlist_count - 1)
        wished = False
    else:
        db.add(Wishlist(user_id=user.id, product_id=product_id))
        p.wishlist_count += 1
        wished = True
    db.commit()
    return {"is_wished": wished, "wishlist_count": p.wishlist_count}
