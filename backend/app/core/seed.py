"""시드 데이터 적재. 로컬 스크립트와 서버 기동 시 자동 시드가 같은 함수를 쓴다."""
import json
from datetime import datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.db import Inquiry, Product, SavedFilter, User
from app.core.security import hash_password

DEMO_ID = "firstlabel2024"
DEMO_PW = "firstlabel2024!"


def seed_products(db: Session, images: dict[str, str] | None = None) -> int:
    rows = json.loads((settings.DATA_DIR / "demo_products.json").read_text(encoding="utf-8"))
    added = 0
    for row in rows:
        if db.scalar(select(Product).where(Product.name == row["name"])):
            continue
        url = (images or {}).get(row["name"], "")
        db.add(Product(**row, image_url=url, image_source="ai_search" if url else "crawled"))
        added += 1
    db.commit()
    return added


def seed_demo_user(db: Session) -> bool:
    if db.scalar(select(User).where(User.login_id == DEMO_ID)):
        return False
    user = User(login_id=DEMO_ID, nickname="김퍼스트", password_hash=hash_password(DEMO_PW))
    db.add(user)
    db.flush()
    db.add_all(
        [
            SavedFilter(user_id=user.id, name="유당불내증 필터",
                        summary="WPC 제외, 락토오스 주의, 글루텐 제외", keywords='["LACTOSE"]'),
            SavedFilter(user_id=user.id, name="알레르기 주의 필터",
                        summary="견과류 제외, 대두 제외, 달걀 제외", keywords='["LACTOSE","GENERAL"]'),
            SavedFilter(user_id=user.id, name="비건 필터",
                        summary="동물성 원료 제외, 비건 인증", keywords='["LACTOSE"]'),
            Inquiry(user_id=user.id, category="제품 등록 문의", title="새로운 제품 등록은 어떻게 하나요?",
                    body="새로운 제품 등록 절차가 궁금합니다.",
                    answer="안녕하세요, First Label입니다.\n홈 화면의 '등록되지 않은 상품이에요' 카드에서 등록 "
                           "요청을 하실 수 있어요. 자세한 등록 가이드는 도움말을 참고해주세요. 감사합니다.",
                    answered_at=datetime.utcnow() - timedelta(days=1)),
            Inquiry(user_id=user.id, category="분석 결과 문의", title="분석 결과가 실제와 다른 것 같아요",
                    body="성분표와 분석 결과가 조금 다릅니다.",
                    answer="확인 결과 원재료 표기가 변경된 제품이었습니다. DB를 갱신했습니다. 감사합니다.",
                    answered_at=datetime.utcnow() - timedelta(days=3)),
            Inquiry(user_id=user.id, category="기타 문의", title="알림이 오지 않아요", body="푸시 알림이 안 옵니다."),
        ]
    )
    db.commit()
    return True


def seed_if_empty(db: Session) -> None:
    """제품이 하나도 없을 때만 시드한다. 서버리스(임시 DB) 배포에서도 데모가 되도록."""
    if db.scalar(select(func.count()).select_from(Product)):
        return
    seed_products(db)
    seed_demo_user(db)
