# FIRST LABEL API

Base URL: `http://localhost:8000` · 인증: `Authorization: Bearer <token>`
Swagger: `/docs`

기획서 §12(문서1)와 §13-6(문서2)의 버저닝 차이는 **`/api/v1/...` 로 통일**했습니다.

---

## Auth

| Method | Path | 설명 |
|---|---|---|
| GET | `/api/v1/auth/check-id?login_id=` | 아이디 중복/형식 확인 → `{available, message}` |
| GET | `/api/v1/auth/check-nickname?nickname=` | 닉네임 형식 확인 |
| POST | `/api/v1/auth/signup` | `{nickname, login_id, password, password_confirm}` → `{token, user}` |
| POST | `/api/v1/auth/login` | `{login_id, password}` → `{token, user}` |

검증 규칙(서버·클라이언트 동일):
- 아이디: 영문 소문자 시작, 영문+숫자 6~20자
- 비밀번호: 8~20자, 공백 불가, 영문/숫자/특수문자 중 2종 이상, 아이디와 동일 불가, **동일·연속 문자 4자 이상 불가**
  (로그인 화면 시안에는 3자로 적혀 있으나 회원가입 시안 기준인 4자로 통일)

## Products

| Method | Path | 설명 |
|---|---|---|
| GET | `/api/v1/products/home` | 홈 카테고리 + 추천 제품 |
| GET | `/api/v1/products/search?q=&category=&lactose_free=&plant_based=` | 제품명·브랜드·원재료 검색. 로그인 시 검색어 저장 |
| GET | `/api/v1/products/{id}` | 제품 상세 |
| GET | `/api/v1/products/{id}/analysis` | **분석 결과**(재배치·점수·AI 코멘트) |
| GET | `/api/v1/products/{id}/recommendations` | 유사 / 락토프리 / 식물성 추천 |
| POST | `/api/v1/products/{id}/wishlist` | 찜 토글 |

### 분석 응답

```json
{
  "has_warning": true,
  "warning_count": 2,
  "score": 58,
  "score_label": "주의 필요",
  "counts": { "total": 6, "safe": 3, "caution": 1, "warning": 1, "danger": 1 },
  "first_card": [
    { "ingredient_name": "탈지분유", "risk_level": "DANGER",
      "matched_keyword": "탈지분유", "description": "우유에서 지방을 제거하고 건조한 분말…" }
  ],
  "all_ingredients": [
    { "name": "탈지분유", "risk_level": "DANGER", "is_highlight": true,
      "matched_keyword": "탈지분유", "description": "…" }
  ],
  "ai_comment": "…",
  "product": { "id": 7, "name": "초코에몽", "…": "" }
}
```

`all_ingredients` 는 **위험도 순으로 재배치된 순서**입니다. 원문 순서는 `original_order`.

위험도는 4단계 — `DANGER`(빨강) / `WARNING`(주황) / `CAUTION`(노랑) / `SAFE`(초록).
시안의 4색 표기를 그대로 지원하기 위해 문서2의 3단계에서 `CAUTION`을 추가했습니다.

## 성분 분석 (Core)

| Method | Path | 설명 |
|---|---|---|
| POST | `/api/v1/scan` | `multipart/form-data`: `image_file`, `user_filter`(JSON 배열 문자열) → PaddleOCR → 재배치 결과 |
| POST | `/api/v1/scan/text` | `{raw_text, user_filter, product_name}` — OCR 없이 텍스트로 동일 분석 |
| GET | `/api/v1/keywords/lactose` | 유당 주의 성분 사전 (`group_code`, `default_keywords`, `details`) |
| GET | `/api/v1/keywords` | 전체 그룹 목록 (필터 만들기 화면용) |

`POST /api/v1/scan` 은 PaddleOCR 미설치 시 **503**, 글자를 못 읽으면 **422** 를 반환합니다.

## 등록 요청

| Method | Path | 설명 |
|---|---|---|
| POST | `/api/v1/registrations` | multipart: `product_name`,`brand`,`category`,`reason`,`ocr_text`,`front_image`,`back_image` |
| GET | `/api/v1/registrations/me?status=` | 내 요청 (최대 30건) |
| GET | `/api/v1/registrations/{id}` | 상세 |
| POST | `/api/v1/registrations/{id}/cancel` | 요청 취소 |
| POST | `/api/v1/registrations/{id}/approve` | 검토 승인 → `products` 반영 (운영 화면 대체용) |

대표 이미지(§9 B안): 접수 시 Alan AI에 제품명으로 이미지 URL을 물어보고, HEAD 검증에 통과하면 `image_source="ai_search"`, 실패하면 업로드 사진으로 `"user_upload"` fallback.

상태: `PENDING`(등록 대기) → `REVIEWING`(검증 중) → `DONE`(등록 완료) / `CANCELED`.

## 마이페이지

| Method | Path | 설명 |
|---|---|---|
| GET | `/api/v1/users/me` | 프로필 + 활동 요약(등록 대기·분석한 제품·찜한 제품) |
| PATCH | `/api/v1/users/me` | 닉네임 변경 |
| PATCH | `/api/v1/users/me/password` | 비밀번호 변경 |
| DELETE | `/api/v1/users/me` | `{password, reason}` — 소프트 삭제 + 익명화 |
| GET | `/api/v1/users/me/favorites` | 찜한 제품 |
| GET/DELETE | `/api/v1/users/me/search-history[/{id}]` | 최근 검색 |
| GET/POST/PATCH/DELETE | `/api/v1/users/me/filters[/{id}]` | 저장한 필터 |
| GET/POST | `/api/v1/users/me/inquiries` | 문의 목록·등록 |
| GET | `/api/v1/users/me/inquiries/{id}` | 문의 상세 |
| GET/PATCH | `/api/v1/users/me/notifications` | 알림 설정 |

### 회원 탈퇴 처리 (§8)

- `users.deleted_at` 기록(소프트 삭제) + 아이디/닉네임/비밀번호 해시 즉시 익명화
- 찜·검색 이력·저장한 필터·문의 = 삭제
- **등록 요청/분석 이력은 `user_id`만 끊어 익명으로 보존** — 등록한 제품은 다른 사용자가 쓰는 공용 데이터이므로 서비스에 유지
