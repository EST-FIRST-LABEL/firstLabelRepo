from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.db import SavedFilter, User, get_db
from app.core.security import (
    create_token,
    hash_password,
    validate_login_id,
    validate_nickname,
    validate_password,
    verify_password,
)

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

DEFAULT_FILTER = {
    "name": "유당불내증 필터",
    "summary": "WPC 제외, 락토오스 주의, 글루텐 제외",
    "keywords": '["LACTOSE"]',
}


class SignupIn(BaseModel):
    nickname: str
    login_id: str
    password: str
    password_confirm: str


class LoginIn(BaseModel):
    login_id: str
    password: str


def _public(user: User) -> dict:
    return {"id": str(user.id), "login_id": user.login_id, "nickname": user.nickname}


def _find(db: Session, login_id: str) -> User | None:
    return db.scalar(select(User).where(User.login_id == login_id, User.deleted_at.is_(None)))


@router.get("/check-id")
def check_id(login_id: str, db: Session = Depends(get_db)):
    if err := validate_login_id(login_id):
        return {"available": False, "message": err}
    if _find(db, login_id):
        return {"available": False, "message": "이미 사용 중인 아이디입니다."}
    return {"available": True, "message": "사용 가능한 아이디입니다."}


@router.get("/check-nickname")
def check_nickname(nickname: str):
    if err := validate_nickname(nickname):
        return {"available": False, "message": err}
    return {"available": True, "message": "사용 가능한 닉네임입니다."}


@router.post("/signup")
def signup(body: SignupIn, db: Session = Depends(get_db)):
    for err in (
        validate_nickname(body.nickname),
        validate_login_id(body.login_id),
        validate_password(body.password, body.login_id),
    ):
        if err:
            raise HTTPException(400, err)
    if body.password != body.password_confirm:
        raise HTTPException(400, "비밀번호가 일치하지 않습니다.")
    if _find(db, body.login_id):
        raise HTTPException(400, "이미 사용 중인 아이디입니다.")

    user = User(
        login_id=body.login_id,
        nickname=body.nickname,
        password_hash=hash_password(body.password),
    )
    db.add(user)
    db.flush()
    db.add(SavedFilter(user_id=user.id, **DEFAULT_FILTER))
    db.commit()
    return {"token": create_token(user.id), "user": _public(user)}


@router.post("/login")
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = _find(db, body.login_id)
    if not user or not verify_password(body.password, user.password_hash):
        # 아이디 존재 여부를 흘리지 않도록 동일 문구 사용
        raise HTTPException(401, "아이디 또는 비밀번호가 올바르지 않습니다. 다시 확인해주세요.")
    return {"token": create_token(user.id), "user": _public(user)}
