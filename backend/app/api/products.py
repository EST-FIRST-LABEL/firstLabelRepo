import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.db import (
    Analysis,
    Product,
    ProductIngredientProfile,
    SavedFilter,
    SearchHistory,
    User,
    Wishlist,
    get_db,
)
from app.core.security import current_user, optional_user
from app.services import alan, embedding_search
from app.services.ingredients import analyze
from app.services.product_profiles import profile_tokens

router = APIRouter(prefix="/api/v1/products", tags=["products"])


def _catalog_stmt():
    return select(Product).where(
        Product.report_no.is_not(None),
        Product.image_source == "haccp_csv",
    )


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


@router.get("/autocomplete")
def autocomplete(q: str = "", limit: int = 3, db: Session = Depends(get_db)):
    """검색창 타입어헤드: 이름에 검색어가 포함된 제품 상위 N개.

    매 키 입력마다 호출되므로 임베딩(무거움) 대신 가벼운 부분일치만 쓴다.
    의미 기반 검색은 결과 페이지(/search)에서 담당한다.
    """
    keyword = q.strip()
    if not keyword:
        return {"items": []}
    rows = list(
        db.scalars(
            _catalog_stmt()
            .where(Product.name.ilike(f"%{keyword}%"))
            .order_by(Product.rating.desc())
            .limit(limit)
        )
    )
    return {
        "items": [
            {
                "id": p.id,
                "name": p.name,
                "maker_name": p.maker_name,
                "image_url": p.image_url,
                "is_lactose_free": p.is_lactose_free,
            }
            for p in rows
        ]
    }


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
    stmt = _catalog_stmt()
    if category:
        stmt = stmt.where(Product.category == category)
    if lactose_free:
        stmt = stmt.where(Product.is_lactose_free.is_(True))
    if plant_based:
        stmt = stmt.where(Product.is_plant_based.is_(True))

    if q:
        pool = list(db.scalars(stmt))
        ranked = embedding_search.rank_products(q, pool, limit)
        if ranked is None:
            # 임베딩 모델을 못 쓰는 환경(예: 미설치, 서버리스)이면 기존 ilike 방식으로 대체
            like = q.lower()
            items = [
                p
                for p in pool
                if like in (p.name or "").lower()
                or like in (p.maker_name or "").lower()
                or like in (p.raw_ingredients or "").lower()
            ]
            items.sort(key=lambda p: -p.rating)
            items = items[:limit]
        else:
            items = [r.product for r in ranked]
    else:
        items = list(db.scalars(stmt.order_by(Product.rating.desc()).limit(limit)))

    if q and user:
        db.add(SearchHistory(user_id=user.id, keyword=q))
        db.commit()

    wished = _wished_ids(db, user, [p.id for p in items])
    return {"count": len(items), "items": [card(p, p.id in wished) for p in items]}


@router.get("/home")
def home(db: Session = Depends(get_db), user: User | None = Depends(optional_user)):
    items = list(
        db.scalars(
            _catalog_stmt()
            .where(Product.image_url != "")
            .order_by(Product.wishlist_count.desc(), Product.id.asc())
            .limit(6)
        )
    )
    wished = _wished_ids(db, user, [p.id for p in items])
    category_rows = db.execute(
        select(Product.category, func.count(Product.id).label("product_count"))
        .where(
            Product.report_no.is_not(None),
            Product.image_source == "haccp_csv",
            Product.category != "",
        )
        .group_by(Product.category)
        .order_by(func.count(Product.id).desc(), Product.category)
        .limit(5)
    )
    categories = [
        {"code": category, "label": category, "icon": _category_icon(category)}
        for category, _ in category_rows
    ]
    return {"categories": categories, "recommended": [card(p, p.id in wished) for p in items]}


def _category_icon(category: str) -> str:
    if any(word in category for word in ("우유", "유제품", "발효유", "치즈", "크림", "버터")):
        return "milk"
    if any(word in category for word in ("음료", "두유")):
        return "drink"
    if "빵" in category:
        return "bakery"
    return "snack"


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
    filter_id: int | None = None,
    db: Session = Depends(get_db),
    user: User | None = Depends(optional_user),
):
    """유사 / 락토프리 / 식물성 3분류 추천 (§2, AI 추천 화면 탭 구성)."""
    base = db.get(Product, product_id)
    if not base:
        raise HTTPException(404, "제품을 찾을 수 없습니다.")

    if filter_id is None:
        filter_name = "유당 주의"
        filter_keywords = ["LACTOSE"]
    else:
        if not user:
            raise HTTPException(401, "로그인이 필요합니다.")
        saved_filter = db.get(SavedFilter, filter_id)
        if not saved_filter or saved_filter.user_id != user.id:
            raise HTTPException(404, "필터를 찾을 수 없습니다.")
        filter_name = saved_filter.name
        filter_keywords = json.loads(saved_filter.keywords or "[]")

    base_profile = db.get(ProductIngredientProfile, base.id)
    base_set = profile_tokens(base_profile, base.raw_ingredients)
    stmt = (
        select(Product, ProductIngredientProfile)
        .outerjoin(ProductIngredientProfile, ProductIngredientProfile.product_id == Product.id)
        .where(Product.id != base.id)
    )
    for keyword in filter_keywords:
        if keyword == "LACTOSE":
            stmt = stmt.where(Product.is_lactose_free.is_(True))
        elif keyword == "GENERAL":
            # 프로필이 없는 상품(general_risk가 NULL)은 안전을 확신할 수 없으므로
            # 보수적으로 제외한다. 프로필이 있고 위험이 없는 상품만 통과한다 (Important 2).
            stmt = stmt.where(ProductIngredientProfile.general_risk.is_(False))
        elif keyword.strip():
            combined = func.lower(Product.name + " " + Product.raw_ingredients)
            stmt = stmt.where(~combined.contains(keyword.strip().lower()))

    others = list(db.execute(stmt))
    total_other = db.scalar(select(func.count()).select_from(Product).where(Product.id != base.id)) or 0

    def scored(pool: list[tuple[Product, ProductIngredientProfile | None]]) -> list[dict]:
        out = []
        for p, profile in pool:
            sim = _jaccard(base_set, profile_tokens(profile, p.raw_ingredients))
            out.append((sim, p))
        out.sort(key=lambda x: (-x[0], -x[1].rating))
        return out

    same_cat = [(p, profile) for p, profile in others if p.category == base.category] or others
    similar = scored(same_cat)[:3]
    lactose_free = scored([(p, profile) for p, profile in others if p.is_lactose_free])[:3]
    plant = scored([(p, profile) for p, profile in others if p.is_plant_based])[:3]

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
        "active_filter": {"id": filter_id, "name": filter_name, "keywords": filter_keywords},
        "excluded_count": total_other - len(others),
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
    tags: list[str] = []
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
