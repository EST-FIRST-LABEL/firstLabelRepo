from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.db import Product, Registration, User, get_db
from app.core.security import current_user
from app.services import alan
from app.services.ingredients import analyze
from app.services.storage import save_image

router = APIRouter(prefix="/api/v1/registrations", tags=["registrations"])

STATUS_LABEL = {
    "PENDING": "등록 대기",
    "REVIEWING": "검증 중",
    "DONE": "등록 완료",
    "CANCELED": "요청 취소",
}


def _pack(r: Registration) -> dict:
    return {
        "id": r.id,
        "product_name": r.product_name,
        "brand": r.brand,
        "category": r.category,
        "reason": r.reason,
        "status": r.status,
        "status_label": STATUS_LABEL.get(r.status, r.status),
        "front_image_url": r.front_image_url,
        "back_image_url": r.back_image_url,
        "representative_image_url": r.representative_image_url,
        "image_source": r.image_source,
        "ocr_text": r.ocr_text,
        "product_id": r.product_id,
        "created_at": r.created_at.isoformat(),
    }


@router.post("")
async def create(
    product_name: str = Form(...),
    brand: str = Form(""),
    category: str = Form(""),
    reason: str = Form(""),
    ocr_text: str = Form(""),
    front_image: UploadFile | None = File(None),
    back_image: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    """§3-4 제품 등록 요청.

    접수 시 Alan AI로 제품명 기반 대표 이미지 검색 → 실패하면 업로드 사진으로 fallback (§9 B안).
    """
    if not product_name.strip():
        raise HTTPException(400, "제품명을 입력해주세요.")

    front_url = back_url = ""
    if front_image and front_image.filename:
        front_url = save_image(await front_image.read(), front_image.filename, front_image.content_type or "image/jpeg")
    if back_image and back_image.filename:
        back_url = save_image(await back_image.read(), back_image.filename, back_image.content_type or "image/jpeg")

    ai_url = await alan.search_product_image(product_name, brand)
    if ai_url:
        rep_url, source = ai_url, "ai_search"
    else:
        rep_url, source = front_url, "user_upload"

    reg = Registration(
        user_id=user.id,
        product_name=product_name.strip(),
        brand=brand.strip(),
        category=category.strip(),
        reason=reason.strip(),
        ocr_text=ocr_text,
        front_image_url=front_url,
        back_image_url=back_url,
        representative_image_url=rep_url,
        image_source=source,
        status="PENDING",
    )
    db.add(reg)
    db.commit()
    return _pack(reg)


@router.get("/me")
def my_registrations(
    status: str = "",
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    stmt = select(Registration).where(Registration.user_id == user.id)
    if status:
        stmt = stmt.where(Registration.status == status)
    # 마이페이지 안내: 최대 30개까지 확인 가능
    rows = db.scalars(stmt.order_by(Registration.created_at.desc()).limit(30))
    return {"items": [_pack(r) for r in rows]}


@router.get("/{registration_id}")
def get_one(registration_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    reg = db.get(Registration, registration_id)
    if not reg or reg.user_id != user.id:
        raise HTTPException(404, "등록 요청을 찾을 수 없습니다.")
    return _pack(reg)


@router.post("/{registration_id}/cancel")
def cancel(registration_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    reg = db.get(Registration, registration_id)
    if not reg or reg.user_id != user.id:
        raise HTTPException(404, "등록 요청을 찾을 수 없습니다.")
    if reg.status == "DONE":
        raise HTTPException(400, "이미 등록이 완료되어 취소할 수 없습니다.")
    reg.status = "CANCELED"
    db.commit()
    return _pack(reg)


@router.post("/{registration_id}/approve")
def approve(registration_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    """검토 승인 → products 테이블로 반영 (운영자 화면이 없어 데모용으로 열어둠)."""
    reg = db.get(Registration, registration_id)
    if not reg:
        raise HTTPException(404, "등록 요청을 찾을 수 없습니다.")
    if reg.product_id:
        raise HTTPException(400, "이미 등록된 요청입니다.")

    result = analyze(reg.ocr_text)
    product = Product(
        name=reg.product_name,
        maker_name=reg.brand,
        category=reg.category,
        raw_ingredients=reg.ocr_text,
        image_url=reg.representative_image_url,
        image_source=reg.image_source,
        is_lactose_free=not result["has_warning"],
        is_plant_based=False,
    )
    db.add(product)
    db.flush()
    reg.product_id = product.id
    reg.status = "DONE"
    db.commit()
    return _pack(reg)
