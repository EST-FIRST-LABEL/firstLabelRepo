"""원재료 텍스트 → 정제 → 유당 성분 매칭 → 위험도 계산 → 우선순위 재배치.

FIRST LABEL의 핵심 로직. §13-4 데이터 처리 흐름 2~4단계에 해당한다.
"""
import json
import re
from functools import lru_cache

from app.core.config import settings

RISK_ORDER = {"DANGER": 0, "WARNING": 1, "CAUTION": 2, "SAFE": 3}
RISK_PENALTY = {"DANGER": 18, "WARNING": 10, "CAUTION": 4, "SAFE": 0}


@lru_cache(maxsize=1)
def _dictionary() -> dict:
    with open(settings.DATA_DIR / "lactose_keywords.json", encoding="utf-8") as f:
        return json.load(f)


def get_group(group_code: str) -> dict | None:
    return next((g for g in _dictionary()["groups"] if g["group_code"] == group_code), None)


@lru_cache(maxsize=1)
def _known_tokens() -> set[str]:
    """사전에 등록된 원재료명(2자 이하 포함) 정규화 집합. 짧은 토큰 병합 방지용."""
    tokens = set()
    for group in _dictionary()["groups"]:
        for kw in group["keywords"]:
            for token in [kw["keyword"], *kw["aliases"]]:
                tokens.add(_norm(token))
    return tokens


def _norm(text: str) -> str:
    """비교용 정규화: 공백/특수문자 제거 + 소문자."""
    return re.sub(r"[^0-9a-z가-힣]", "", (text or "").lower())


HEADER_WORDS = ("원재료명", "원재료", "재료명", "및함량", "함량", "성분명")

# 원재료 구간의 시작 (OCR이 띄어쓰기를 흘려도 잡히도록 공백 허용)
SECTION_START = re.compile(r"원\s*재\s*료\s*명?|성\s*분\s*명")

# 원재료 구간의 끝 — 라벨에서 원재료 뒤에 붙는 항목들
SECTION_END_WORDS = (
    "영양정보", "영양성분", "총내용량", "내용량", "유통기한", "소비기한", "품질유지기한",
    "제조일자", "제조원", "제조사", "제조업소", "위탁제조", "주문자", "판매원", "판매업소",
    "유통전문판매업소", "유통전문", "수입원", "수입판매원", "총판", "영업소", "업소명",
    "소재지", "원산지", "포장재질", "식품유형", "품목보고번호", "보관방법", "반품", "교환",
    "고객상담", "소비자상담", "부정불량식품", "알레르기", "주의사항", "분리배출", "재활용",
    "본 제품은", "이 제품은",
)
SECTION_END = re.compile("|".join(r"\s*".join(map(re.escape, w)) for w in SECTION_END_WORDS))

# 원재료가 아닌 토큰 (라벨의 다른 문구가 섞여 들어온 경우)
NOISE_WORDS = (
    "kcal", "킬로칼로리", "열량", "나트륨mg", "1일영양성분", "기준치",
    "표기일", "상단", "하단", "전면", "후면", "참조", "까지", "포장",
    # 회사·업소 표기
    "업소", "판매원", "제조원", "제조사", "주식회사", "유한회사",
    # 식품유형 값 (원재료가 아니라 분류명)
    "캔디류", "과자류", "빵류", "음료류", "가공유", "발효유류", "유가공품", "아이스크림류",
    "초콜릿가공품", "즉석섭취식품", "기타가공품", "면류", "장류",
)
# 회사명 표기 (원재료에는 절대 안 나온다)
_COMPANY = re.compile(r"\(\s*주|㈜|주식회사|\(\s*유")
_DATE = re.compile(r"^\d{2,4}[.\-/년]\s?\d{1,2}[.\-/월]?\s?\d{0,2}일?$")
_PHONE = re.compile(r"^\d{2,4}[-\s]?\d{3,4}[-\s]?\d{4}$")
_SENTENCE = re.compile(r"(습니다|하세요|바랍니다|드립니다|주십시오|신고|문의)")


def extract_section(raw_text: str) -> str:
    """라벨 전체 텍스트에서 원재료 구간만 잘라낸다.

    '원재료명' 이후 ~ '영양정보/유통기한/제조원' 등이 나오기 전까지.
    시작 표시를 못 찾으면 전체를 쓴다(원재료명만 따로 넘어온 경우).
    """
    text = raw_text or ""
    start = SECTION_START.search(text)
    if start:
        text = text[start.end():]
        text = re.sub(r"^\s*(및\s*함\s*량)?\s*[:：]?\s*", "", text)
    end = SECTION_END.search(text)
    if end and end.start() > 0:
        text = text[: end.start()]
    return text


def _is_noise(name: str) -> bool:
    """원재료로 보기 어려운 토큰인지."""
    n = _norm(name)
    if not n or len(n) < 2:
        return True
    if _DATE.match(name.strip()) or _PHONE.match(name.strip()):
        return True
    if _SENTENCE.search(name) or _COMPANY.search(name):
        return True
    if any(w in n for w in NOISE_WORDS):
        return True
    # 한글이 없고 영문도 2자 이하면 숫자·단위 조각 (WPC 같은 약어는 살린다)
    if not re.search(r"[가-힣]", name) and len(re.sub(r"[^A-Za-z]", "", name)) < 3:
        return True
    return False


def _strip_header(text: str) -> str:
    """'원재료명 및 함량' 같은 머리말 잔여물 제거."""
    for word in HEADER_WORDS:
        pattern = r"\s*".join(map(re.escape, word))
        text = re.sub(pattern, " ", text)
    return text


def _split_by_space(chunk: str) -> list[str]:
    """쉼표가 없는 덩어리를 공백으로 나눈다.

    OCR은 단어 중간에도 공백을 넣는다("카제 인나트륨"). 2글자 이하 조각은
    다음 조각에 붙여서 되살린다. 단, 그 조각이 이미 사전에 등록된 원재료명이면
    ("원유", "유청" 등) 병합하지 않는다 — 그렇지 않으면 "원유 정제수"가
    "원유정제수"로 뭉개져 위험 성분이 통째로 사라진다.
    """
    tokens = [t for t in re.split(r"\s+", chunk) if t]
    known = _known_tokens()
    out: list[str] = []
    for token in tokens:
        prev = out[-1] if out else ""
        if out and len(re.sub(r"[^0-9a-zA-Z가-힣]", "", prev)) <= 2 and _norm(prev) not in known:
            out[-1] = prev + token
        else:
            out.append(token)
    return out


def split_ingredients(raw_text: str) -> list[str]:
    """OCR 원문 또는 원재료명 문자열을 개별 원재료 배열로 분할한다.

    괄호 안의 쉼표는 원산지·부원료 표기라 분할 기준에서 제외한다.
    (예: "원유(국산), 정제수" → ["원유(국산)", "정제수"])
    OCR이 쉼표를 놓친 경우에는 공백으로도 나눈다.
    """
    return [name for name, _ in split_ingredients_with_context(raw_text)]


def split_ingredients_with_context(raw_text: str) -> list[tuple[str, str]]:
    """(정제된 원재료명, 그 원재료가 속했던 원본 콤마 구간) 목록.

    "락타아제 처리로 유당 분해" 같은 안전 표기는 콤마 구간(원문 단위)으로
    붙어 있어야 의미가 있다. 공백 분할(_split_by_space)로 쪼갠 개별 토큰만
    보면 원재료명과 그 설명이 서로 다른 토큰으로 갈라져 문맥을 놓친다.
    """
    text = _strip_header(extract_section(raw_text))
    text = text.replace("\n", ",").replace("·", ",").replace("/", ",")

    parts, buf, depth = [], "", 0
    for ch in text:
        if ch in "([{（[":
            depth += 1
        elif ch in ")]}）]":
            depth = max(0, depth - 1)
        if ch in ",，、;" and depth == 0:
            parts.append(buf)
            buf = ""
        else:
            buf += ch
    parts.append(buf)

    # 쉼표가 거의 없으면 OCR이 놓친 것으로 보고 공백으로도 나눈다
    expanded: list[tuple[str, str]] = []
    for p in parts:
        chunk = p.strip()
        if len(_norm(chunk)) > 10 and " " in chunk.strip():
            expanded.extend((piece, chunk) for piece in _split_by_space(chunk))
        else:
            expanded.append((chunk, chunk))

    out: list[tuple[str, str]] = []
    seen = set()
    for p, context in expanded:
        name = re.sub(r"\s+", " ", p).strip(" .,·-—")
        # 제조업소/유통전문판매업소 등이 나오면 그 뒤는 원재료가 아니다
        if SECTION_END.search(name):
            break
        if _is_noise(name):
            continue
        if _norm(name) in seen:
            continue
        seen.add(_norm(name))
        out.append((name, context))
    return out


def _match(name: str, groups: list[dict]) -> tuple[str, str | None, str]:
    """(risk_level, matched_keyword, description) — 가장 위험한 매칭을 채택."""
    n = _norm(name)
    best = ("SAFE", None, "")
    for group in groups:
        if any(_norm(s) in n for s in group["safe_signals"]):
            return "SAFE", None, "유당을 분해했거나 유당이 없는 원료로 표기돼 있어요."
        for kw in group["keywords"]:
            for token in [kw["keyword"], *kw["aliases"]]:
                if _norm(token) and _norm(token) in n:
                    if RISK_ORDER[kw["risk_level"]] < RISK_ORDER[best[0]]:
                        best = (kw["risk_level"], kw["keyword"], kw["description"])
    return best


def analyze(raw_text: str, user_filter: list[str] | None = None) -> dict:
    """원재료 원문을 분석해 재배치된 결과를 돌려준다.

    user_filter: 적용할 그룹 코드 목록. 비우면 LACTOSE + GENERAL 전체.
    """
    codes = user_filter or ["LACTOSE", "GENERAL"]
    groups = [g for g in _dictionary()["groups"] if g["group_code"] in codes]

    # 문서 전체에 "락토프리/무유당" 같은 명시적 라벨 표기가 있으면 우선 적용한다.
    # ("락타아제", "유당분해" 같은 공정 설명 단어는 여기 포함하지 않는다 — 아래 참고)
    lactose_free = any(
        _norm(s) in _norm(raw_text)
        for g in groups
        for s in g["safe_signals"]
    )

    all_ingredients = []
    for name, context in split_ingredients_with_context(raw_text):
        risk, matched, desc = _match(name, groups)
        # "락타아제로 유당 분해" 같은 공정 설명은 그 원료가 속한 원문 콤마 구간에
        # 함께 적혀 있을 때만 안전 처리한다. 문서 전체로 적용하면 "우유, 유청, 락타아제"처럼
        # 별개 원료로 나열된 경우까지 우유·유청의 위험이 가려진다 (이슈 #10).
        context_safe = any(
            _norm(s) in _norm(context)
            for g in groups
            for s in g.get("context_safe_signals", [])
        )
        if (lactose_free or context_safe) and risk in ("DANGER", "WARNING"):
            risk, desc = "SAFE", "유당 분해(락토프리) 제품으로 표기돼 있어요."
            matched = None
        all_ingredients.append(
            {
                "name": name,
                "risk_level": risk,
                "is_highlight": risk in ("DANGER", "WARNING"),
                "matched_keyword": matched,
                "description": desc,
            }
        )

    # [우선순위 재배치] 위험도 높은 성분을 최상단으로. 같은 등급은 원문 순서 유지(stable sort).
    reordered = sorted(all_ingredients, key=lambda i: RISK_ORDER[i["risk_level"]])
    first_card = [
        {
            "ingredient_name": i["name"],
            "risk_level": i["risk_level"],
            "matched_keyword": i["matched_keyword"],
            "description": i["description"],
        }
        for i in reordered
        if i["is_highlight"]
    ]

    counts = {level: sum(1 for i in all_ingredients if i["risk_level"] == level) for level in RISK_ORDER}
    score = max(0, 100 - sum(RISK_PENALTY[i["risk_level"]] for i in all_ingredients))

    return {
        "has_warning": bool(first_card),
        "warning_count": len(first_card),
        "score": score,
        "score_label": "안심" if score >= 85 else "양호" if score >= 60 else "주의 필요",
        "counts": {
            "total": len(all_ingredients),
            "safe": counts["SAFE"],
            "caution": counts["CAUTION"],
            "warning": counts["WARNING"],
            "danger": counts["DANGER"],
        },
        "first_card": first_card,
        "all_ingredients": reordered,
        "original_order": all_ingredients,
    }
