"""제품 시드 데이터 적재.

    python scripts/seed_products.py                # 제품만 적재
    python scripts/seed_products.py --with-images  # Alan AI로 대표 이미지까지 채움(느림)
    python scripts/seed_products.py --demo-user    # 데모 계정/문의/필터까지 생성

backend/ 디렉터리에서 실행할 것.
"""
import asyncio
import json
import sys
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.config import settings  # noqa: E402
from app.core.db import Inquiry, Product, SavedFilter, SessionLocal, User, init_db  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.services import alan  # noqa: E402


async def main() -> None:
    with_images = "--with-images" in sys.argv
    demo_user = "--demo-user" in sys.argv

    init_db()
    db = SessionLocal()

    rows = json.loads((settings.DATA_DIR / "demo_products.json").read_text(encoding="utf-8"))
    added = 0
    for row in rows:
        if db.query(Product).filter(Product.name == row["name"]).first():
            continue
        image_url = ""
        if with_images:
            image_url = await alan.search_product_image(row["name"], row["maker_name"])
            print(f"  {'IMG ' if image_url else 'none'} {row['name']}")
        db.add(Product(**row, image_url=image_url, image_source="ai_search" if image_url else "crawled"))
        added += 1
    db.commit()
    print(f"제품 {added}건 추가 (총 {db.query(Product).count()}건)")

    if demo_user and not db.query(User).filter(User.login_id == "firstlabel2024").first():
        user = User(
            login_id="firstlabel2024",
            nickname="김퍼스트",
            password_hash=hash_password("firstlabel2024!"),
        )
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
        print("데모 계정 생성: firstlabel2024 / firstlabel2024!")

    db.close()


if __name__ == "__main__":
    asyncio.run(main())
