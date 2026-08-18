import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.core.db import (
    Analysis,
    Inquiry,
    Product,
    Registration,
    SavedFilter,
    SearchHistory,
    User,
    Wishlist,
    get_db,
)
from app.core.security import current_user, hash_password, validate_nickname, validate_password, verify_password
from app.api.products import card

router = APIRouter(prefix="/api/v1/users/me", tags=["users"])


@router.get("")
def me(db: Session = Depends(get_db), user: User = Depends(current_user)):
    counts = {
        "pending_registrations": db.scalar(
            select(func.count()).select_from(Registration).where(
                Registration.user_id == user.id, Registration.status.in_(["PENDING", "REVIEWING"])
            )
        ),
        "analyzed_products": db.scalar(
            select(func.count()).select_from(Analysis).where(Analysis.user_id == user.id)
        ),
        "wishlists": db.scalar(
            select(func.count()).select_from(Wishlist).where(Wishlist.user_id == user.id)
        ),
    }
    return {
        "id": str(user.id),
        "login_id": user.login_id,
        "nickname": user.nickname,
        "grade": "일반 회원",
        "created_at": user.created_at.isoformat(),
        "counts": counts,
    }


class NicknameIn(BaseModel):
    nickname: str


@router.patch("")
def update_me(body: NicknameIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    if err := validate_nickname(body.nickname):
        raise HTTPException(400, err)
    user.nickname = body.nickname
    db.commit()
    return {"nickname": user.nickname, "message": "닉네임이 변경되었습니다."}


class PasswordIn(BaseModel):
    current_password: str
    new_password: str
    new_password_confirm: str


@router.patch("/password")
def change_password(body: PasswordIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    if not verify_password(body.current_password, user.password_hash):
        raise HTTPException(400, "현재 비밀번호가 올바르지 않습니다.")
    if err := validate_password(body.new_password, user.login_id):
        raise HTTPException(400, err)
    if body.new_password != body.new_password_confirm:
        raise HTTPException(400, "비밀번호가 일치하지 않습니다.")
    if verify_password(body.new_password, user.password_hash):
        raise HTTPException(400, "현재 비밀번호와 다른 비밀번호를 사용해주세요.")
    user.password_hash = hash_password(body.new_password)
    db.commit()
    return {"message": "비밀번호가 변경되었습니다."}


class WithdrawIn(BaseModel):
    password: str
    reason: str = ""


@router.delete("")
def withdraw(body: WithdrawIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    """§8 회원 탈퇴: 소프트 삭제 + 개인 식별정보 즉시 익명화.

    등록한 제품 데이터(공용 데이터)는 개인정보와 분리해 서비스에 유지한다.
    """
    if not verify_password(body.password, user.password_hash):
        raise HTTPException(400, "비밀번호가 올바르지 않습니다.")

    # 개인 데이터 삭제
    for model in (Wishlist, SearchHistory, SavedFilter):
        db.execute(delete(model).where(model.user_id == user.id))
    db.execute(delete(Inquiry).where(Inquiry.user_id == user.id))
    # 등록 요청은 개인 식별과 분리해 익명으로 남긴다
    db.execute(
        Registration.__table__.update().where(Registration.user_id == user.id).values(user_id=None)
    )
    db.execute(Analysis.__table__.update().where(Analysis.user_id == user.id).values(user_id=None))

    # 계정 익명화 + 소프트 삭제
    user.deleted_at = datetime.utcnow()
    user.login_id = f"deleted{user.id.hex[:12]}"
    user.nickname = "탈퇴한 회원"
    user.password_hash = ""
    db.commit()
    return {"message": "탈퇴가 완료되었습니다."}


# --- 찜한 제품 ---

@router.get("/favorites")
def favorites(db: Session = Depends(get_db), user: User = Depends(current_user)):
    rows = db.execute(
        select(Product)
        .join(Wishlist, Wishlist.product_id == Product.id)
        .where(Wishlist.user_id == user.id)
        .order_by(Wishlist.created_at.desc())
    ).scalars()
    return {"items": [card(p, True) for p in rows]}


# --- 최근 검색 ---

@router.get("/search-history")
def search_history(db: Session = Depends(get_db), user: User = Depends(current_user)):
    rows = db.scalars(
        select(SearchHistory)
        .where(SearchHistory.user_id == user.id)
        .order_by(SearchHistory.searched_at.desc())
        .limit(10)
    )
    seen, items = set(), []
    for r in rows:
        if r.keyword in seen:
            continue
        seen.add(r.keyword)
        items.append({"id": r.id, "keyword": r.keyword, "searched_at": r.searched_at.isoformat()})
    return {"items": items}


@router.delete("/search-history")
def clear_history(db: Session = Depends(get_db), user: User = Depends(current_user)):
    db.execute(delete(SearchHistory).where(SearchHistory.user_id == user.id))
    db.commit()
    return {"message": "최근 검색어를 모두 삭제했습니다."}


@router.delete("/search-history/{history_id}")
def delete_history(history_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    row = db.get(SearchHistory, history_id)
    if row and row.user_id == user.id:
        # 같은 키워드가 여러 번 쌓였을 수 있으므로 동일 키워드 전체 삭제
        db.execute(
            delete(SearchHistory).where(
                SearchHistory.user_id == user.id, SearchHistory.keyword == row.keyword
            )
        )
        db.commit()
    return {"message": "삭제했습니다."}


# --- 저장한 필터 ---

class FilterIn(BaseModel):
    name: str
    summary: str = ""
    keywords: list[str] = []


def _pack_filter(f: SavedFilter) -> dict:
    return {
        "id": f.id,
        "name": f.name,
        "summary": f.summary,
        "keywords": json.loads(f.keywords or "[]"),
        "updated_at": f.updated_at.isoformat(),
    }


@router.get("/filters")
def list_filters(db: Session = Depends(get_db), user: User = Depends(current_user)):
    rows = db.scalars(
        select(SavedFilter).where(SavedFilter.user_id == user.id).order_by(SavedFilter.updated_at.desc())
    )
    return {"items": [_pack_filter(f) for f in rows]}


@router.post("/filters")
def create_filter(body: FilterIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    if not body.name.strip():
        raise HTTPException(400, "필터 이름을 입력해주세요.")
    f = SavedFilter(
        user_id=user.id,
        name=body.name.strip(),
        summary=body.summary.strip(),
        keywords=json.dumps(body.keywords, ensure_ascii=False),
    )
    db.add(f)
    db.commit()
    return _pack_filter(f)


@router.patch("/filters/{filter_id}")
def update_filter(filter_id: int, body: FilterIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    f = db.get(SavedFilter, filter_id)
    if not f or f.user_id != user.id:
        raise HTTPException(404, "필터를 찾을 수 없습니다.")
    f.name, f.summary = body.name.strip(), body.summary.strip()
    f.keywords = json.dumps(body.keywords, ensure_ascii=False)
    db.commit()
    return _pack_filter(f)


@router.delete("/filters/{filter_id}")
def delete_filter(filter_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    f = db.get(SavedFilter, filter_id)
    if not f or f.user_id != user.id:
        raise HTTPException(404, "필터를 찾을 수 없습니다.")
    db.delete(f)
    db.commit()
    return {"message": "삭제했습니다."}


# --- 문의 ---

class InquiryIn(BaseModel):
    category: str = "기타 문의"
    title: str
    body: str = ""


def _pack_inquiry(i: Inquiry) -> dict:
    return {
        "id": i.id,
        "category": i.category,
        "title": i.title,
        "body": i.body,
        "answer": i.answer,
        "answered": bool(i.answer),
        "status_label": "답변 완료" if i.answer else "답변 대기",
        "answered_at": i.answered_at.isoformat() if i.answered_at else None,
        "created_at": i.created_at.isoformat(),
    }


@router.get("/inquiries")
def list_inquiries(answered: str = "", db: Session = Depends(get_db), user: User = Depends(current_user)):
    stmt = select(Inquiry).where(Inquiry.user_id == user.id)
    if answered == "true":
        stmt = stmt.where(Inquiry.answer != "")
    elif answered == "false":
        stmt = stmt.where(Inquiry.answer == "")
    rows = db.scalars(stmt.order_by(Inquiry.created_at.desc()))
    return {"items": [_pack_inquiry(i) for i in rows]}


@router.post("/inquiries")
def create_inquiry(body: InquiryIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    if not body.title.strip():
        raise HTTPException(400, "문의 제목을 입력해주세요.")
    i = Inquiry(user_id=user.id, category=body.category, title=body.title.strip(), body=body.body.strip())
    db.add(i)
    db.commit()
    return _pack_inquiry(i)


@router.get("/inquiries/{inquiry_id}")
def get_inquiry(inquiry_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    i = db.get(Inquiry, inquiry_id)
    if not i or i.user_id != user.id:
        raise HTTPException(404, "문의를 찾을 수 없습니다.")
    return _pack_inquiry(i)
