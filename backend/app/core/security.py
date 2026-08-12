import re
import uuid
from datetime import datetime, timedelta

import bcrypt
import jwt
from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.db import User, get_db


def hash_password(raw: str) -> str:
    return bcrypt.hashpw(raw.encode(), bcrypt.gensalt()).decode()


def verify_password(raw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(raw.encode(), hashed.encode())
    except ValueError:
        return False


def create_token(user_id: uuid.UUID) -> str:
    payload = {"sub": str(user_id), "exp": datetime.utcnow() + timedelta(days=settings.JWT_EXPIRE_DAYS)}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")


def _user_from_request(request: Request, db: Session) -> User | None:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    try:
        payload = jwt.decode(auth[7:], settings.JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        return None
    try:
        user = db.get(User, uuid.UUID(payload["sub"]))
    except (ValueError, KeyError):
        return None
    return user if user and user.deleted_at is None else None


def current_user(request: Request, db: Session = Depends(get_db)) -> User:
    user = _user_from_request(request, db)
    if not user:
        raise HTTPException(401, "로그인이 필요합니다.")
    return user


def optional_user(request: Request, db: Session = Depends(get_db)) -> User | None:
    """비로그인도 허용하는 엔드포인트용 (검색/분석 등)."""
    return _user_from_request(request, db)


# --- §6 회원가입 유효성 (서버에서도 반드시 재검증) ---

def validate_login_id(login_id: str) -> str | None:
    if not re.fullmatch(r"[a-z][a-z0-9]{5,15}", login_id or ""):
        return "아이디는 영문 소문자로 시작하는 영문/숫자 조합 6~16자여야 합니다."
    return None


def validate_password(pw: str, login_id: str = "") -> str | None:
    pw = pw or ""
    if not 8 <= len(pw) <= 20:
        return "비밀번호는 8~20자여야 합니다."
    if " " in pw:
        return "비밀번호에 공백은 사용할 수 없습니다."
    kinds = sum(
        bool(re.search(p, pw))
        for p in (r"[A-Za-z]", r"[0-9]", r"[!@#$%^&*()\-_=+\[\]{};:'\",.<>/?\\|`~]")
    )
    if kinds < 2:
        return "영문/숫자/특수문자 중 2종류 이상을 조합해주세요."
    if login_id and pw == login_id:
        return "아이디와 동일한 비밀번호는 사용할 수 없습니다."
    # 회원가입 화면 기준(예: 1111, abcd, aaaa) = 4자. 로그인 화면에는 3자로 적혀 있어 4자로 통일함.
    if _has_run(pw, 4):
        return "동일하거나 연속된 문자를 4자 이상 사용할 수 없습니다. (예: 1111, abcd, aaaa)"
    return None


def _has_run(pw: str, n: int) -> bool:
    """같은 문자 n연속 또는 코드포인트 연속 증가/감소 n연속 검사."""
    same = seq_up = seq_down = 1
    for prev, cur in zip(pw, pw[1:]):
        same = same + 1 if cur == prev else 1
        seq_up = seq_up + 1 if ord(cur) - ord(prev) == 1 else 1
        seq_down = seq_down + 1 if ord(cur) - ord(prev) == -1 else 1
        if max(same, seq_up, seq_down) >= n:
            return True
    return False


def validate_nickname(nickname: str) -> str | None:
    if not re.fullmatch(r"[가-힣a-zA-Z0-9]{2,10}", nickname or ""):
        return "닉네임은 한글/영문/숫자 2~10자여야 합니다."
    return None
