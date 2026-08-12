"""핵심 로직 자체 점검: python -m tests.test_ingredients (backend/ 에서 실행)"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.security import validate_login_id, validate_password  # noqa: E402
from app.services.ingredients import analyze, split_ingredients  # noqa: E402


def test_split_keeps_parenthesised_origin():
    parts = split_ingredients("원유(국산), 정제수, 기타설탕, 탈지분유(국산)")
    assert parts == ["원유(국산)", "정제수", "기타설탕", "탈지분유(국산)"], parts


def test_ocr_text_without_commas():
    """PaddleOCR은 쉼표를 자주 놓치고 단어 중간에 공백을 넣는다. 실제 인식 결과로 회귀 테스트."""
    ocr = "원 재료명 및 함량 원유국산 정제수 기타설탕 탈지분유국산 농축유청단백WPC 카제 인나트륨"
    parts = split_ingredients(ocr)
    assert parts == ["원유국산", "정제수", "기타설탕", "탈지분유국산", "농축유청단백WPC", "카제인나트륨"], parts
    r = analyze(ocr)
    assert r["warning_count"] == 4  # 원유·탈지분유(DANGER) + WPC·카제인나트륨(WARNING)


def test_full_label_extracts_only_ingredient_section():
    """실제 촬영에서는 라벨 전체가 읽힌다. 원재료 구간만 잘라내야 한다."""
    label = """초코에몽
가공유
내용량 300ml
원재료명 및 함량
원유(국산) 85%, 정제수, 기타설탕, 탈지분유(국산),
농축유청단백(WPC), 코코아분말, 카제인나트륨
영양정보
총 내용량 300ml 180kcal
나트륨 150mg 15%
유통기한: 상단 표기일까지
제조원: 남양유업(주)
부정불량식품신고 1399
본 제품은 우유를 사용한 제품과 같은 시설에서 제조하고 있습니다."""
    parts = split_ingredients(label)
    assert len(parts) == 7, parts
    assert parts[0].startswith("원유(국산)"), parts
    assert parts[-1] == "카제인나트륨", parts
    for junk in ("초코에몽", "가공유", "180kcal", "1399", "남양유업"):
        assert not any(junk in p for p in parts), (junk, parts)


def test_danger_moves_to_top():
    r = analyze("정제수, 설탕, 탈지분유, 코코아분말, 농축유청단백(WPC)")
    names = [i["name"] for i in r["all_ingredients"]]
    assert names[0] == "탈지분유", names          # DANGER 최상단
    assert names[1] == "농축유청단백(WPC)", names  # WARNING 그 다음
    assert r["warning_count"] == 2
    assert r["first_card"][0]["matched_keyword"] == "탈지분유"


def test_lactose_free_overrides_milk_keywords():
    r = analyze("원유(국산) 100% (락타아제 효소 처리로 유당 분해)")
    assert r["has_warning"] is False, r["first_card"]
    assert r["score"] > 90


def test_plant_based_is_clean():
    r = analyze("아몬드액(미국산), 정제수, 설탕, 코코아분말, 천연향료")
    assert r["counts"]["danger"] == 0 and r["counts"]["warning"] == 0
    assert r["counts"]["caution"] == 1  # 설탕


def test_score_drops_with_risk():
    high = analyze("아몬드액, 정제수")["score"]
    low = analyze("원유, 탈지분유, 유청분말, 카제인나트륨")["score"]
    assert high > low


def test_password_rules():
    assert validate_password("firstlabel2024!", "firstlabel2024") is None
    assert validate_password("short1!") is not None            # 8자 미만
    assert validate_password("abcdefgh") is not None           # 1종류만
    assert validate_password("aaaa5379!") is not None          # 반복 4자
    assert validate_password("qw12345!x") is not None          # 연속 4자 이상
    assert validate_password("first2024", "first2024") is not None  # 아이디와 동일
    assert validate_login_id("firstlabel2024") is None
    assert validate_login_id("2024first") is not None          # 숫자로 시작
    assert validate_login_id("ab1") is not None                # 6자 미만


if __name__ == "__main__":
    fns = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    for fn in fns:
        fn()
        print(f"  ok  {fn.__name__}")
    print(f"\n{len(fns)} passed")
