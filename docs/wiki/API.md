# API

FIRST LABEL 백엔드는 FastAPI 기반이며, 모든 주요 API는 `/api/v1/...` 경로를 사용합니다.

- 로컬 Base URL: `http://localhost:8000`
- Swagger: `/docs`
- 인증 방식: `Authorization: Bearer <token>`

## 인증

주요 기능:

- 아이디 중복 및 형식 확인
- 닉네임 형식 확인
- 회원가입
- 로그인

대표 경로:

```text
GET  /api/v1/auth/check-id
GET  /api/v1/auth/check-nickname
POST /api/v1/auth/signup
POST /api/v1/auth/login
```

## 제품

주요 기능:

- 홈 데이터
- 제품 검색
- 제품 상세
- 분석 결과
- 대체 제품 추천
- 찜 토글

대표 경로:

```text
GET  /api/v1/products/home
GET  /api/v1/products/search
GET  /api/v1/products/{id}
GET  /api/v1/products/{id}/analysis
GET  /api/v1/products/{id}/recommendations
POST /api/v1/products/{id}/wishlist
```

## 성분 분석

이미지 또는 텍스트를 기준으로 동일한 분석 엔진을 사용합니다.

```text
POST /api/v1/scan
POST /api/v1/scan/text
GET  /api/v1/keywords/lactose
GET  /api/v1/keywords
```

분석 응답에는 다음 정보가 포함됩니다.

- 위험 성분 존재 여부
- 위험 성분 수
- 종합 점수
- 위험도별 성분 개수
- 우선 노출할 주의 성분
- 위험도 순으로 재배치된 전체 성분

위험도는 다음 4단계입니다.

```text
DANGER  → 가장 높은 위험
WARNING → 주의 필요
CAUTION → 경미한 주의
SAFE    → 안전
```

## 미등록 제품 요청

```text
POST /api/v1/registrations
GET  /api/v1/registrations/me
GET  /api/v1/registrations/{id}
POST /api/v1/registrations/{id}/cancel
POST /api/v1/registrations/{id}/approve
```

등록 상태:

```text
PENDING → REVIEWING → DONE
                    ↘ CANCELED
```

## 마이페이지

```text
GET    /api/v1/users/me
PATCH  /api/v1/users/me
PATCH  /api/v1/users/me/password
DELETE /api/v1/users/me
```

그 외 찜, 최근 검색, 저장 필터, 문의, 알림 설정 기능도 `/api/v1/users/me/...` 하위에서 제공합니다.

## 오류 처리

대표적인 상태 코드:

| 상태 | 의미 |
|---|---|
| `400` | 잘못된 입력 또는 비즈니스 규칙 위반 |
| `401` | 인증 필요 또는 토큰 오류 |
| `404` | 대상 리소스 없음 |
| `422` | OCR 결과를 유효한 입력으로 처리하지 못함 |
| `503` | OCR 엔진 또는 외부 서비스 사용 불가 |

## 상세 명세

요청/응답 필드와 각 API의 상세 설명은 [`docs/API.md`](../API.md)를 기준으로 확인하세요.
