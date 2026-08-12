import json

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.db import Analysis, User, get_db
from app.core.security import optional_user
from app.services import alan
from app.services.ingredients import _dictionary, analyze, get_group
from app.services.ocr import extract_text
from app.services.storage import save_image

router = APIRouter(prefix="/api/v1", tags=["analysis"])


@router.post("/scan")
async def scan(
    image_file: UploadFile = File(...),
    user_filter: str = Form('["LACTOSE"]'),
    db: Session = Depends(get_db),
    user: User | None = Depends(optional_user),
):
    """§13-6 ① 성분표 사진 분석 & 재배치 (Core API).

    이미지 → PaddleOCR → 텍스트 정제 → 키워드 매칭 → 위험도 계산 → 최상단 재배치.
    """
    data = await image_file.read()
    if not data:
        raise HTTPException(400, "이미지 파일이 비어 있습니다.")

    try:
        codes = json.loads(user_filter)
        if not isinstance(codes, list):
            raise ValueError
    except (json.JSONDecodeError, ValueError):
        codes = [c.strip() for c in user_filter.split(",") if c.strip()]

    raw_text = await extract_text(data, image_file.filename or "scan.jpg", image_file.content_type or "image/jpeg")
    if not raw_text.strip():
        raise HTTPException(
            422, "사진에서 글자를 읽지 못했어요. 성분표가 잘 보이도록 다시 촬영해주세요."
        )

    result = analyze(raw_text, codes)
    result["raw_text"] = raw_text
    result["image_url"] = save_image(data, image_file.filename or "scan.jpg", image_file.content_type or "image/jpeg")

    db.add(Analysis(user_id=user.id if user else None, product_name="스캔 분석", score=result["score"]))
    db.commit()
    return {"status": "SUCCESS", "data": result}


@router.post("/scan/text")
async def scan_text(
    payload: dict,
    db: Session = Depends(get_db),
    user: User | None = Depends(optional_user),
):
    """OCR 없이 원재료 텍스트만으로 동일 분석 (직접 입력 / 데모용)."""
    raw_text = (payload or {}).get("raw_text", "")
    if not raw_text.strip():
        raise HTTPException(400, "원재료 텍스트를 입력해주세요.")
    codes = (payload or {}).get("user_filter") or ["LACTOSE", "GENERAL"]
    result = analyze(raw_text, codes)
    result["raw_text"] = raw_text
    name = (payload or {}).get("product_name") or "직접 입력 분석"
    result["ai_comment"] = await alan.comment_on_analysis(
        name, [i["ingredient_name"] for i in result["first_card"]]
    )
    db.add(Analysis(user_id=user.id if user else None, product_name=name, score=result["score"]))
    db.commit()
    return {"status": "SUCCESS", "data": result}


@router.get("/keywords/lactose")
def lactose_keywords():
    """§13-6 ② 유당 주의 성분 사전 조회."""
    group = get_group("LACTOSE")
    if not group:
        raise HTTPException(404, "사전을 찾을 수 없습니다.")
    return {
        "group_code": group["group_code"],
        "group_name": group["group_name"],
        "default_keywords": [k["keyword"] for k in group["keywords"] if k["risk_level"] != "SAFE"],
        "details": group["keywords"],
    }


@router.get("/keywords")
def all_groups():
    """저장한 필터 만들기 화면에서 쓰는 전체 그룹 목록."""
    return {
        "groups": [
            {
                "group_code": g["group_code"],
                "group_name": g["group_name"],
                "keywords": [k["keyword"] for k in g["keywords"]],
            }
            for g in _dictionary()["groups"]
        ]
    }
