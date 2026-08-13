# Development Guide

FIRST LABEL 저장소에서 협업할 때 사용하는 기본 개발 규칙입니다.

## 브랜치 전략

기본 브랜치는 `main`입니다.

기능 단위로 별도 브랜치를 만들어 작업하는 방식을 권장합니다.

예:

```text
main
├─ feature/frontend-search
├─ feature/frontend-mypage
├─ feature/backend-auth
├─ feature/backend-products
└─ feature/backend-recommend
```

## 커밋 메시지

기본 형식:

```text
Type: 제목

본문 (선택)

꼬리말 (선택)
```

주요 Type:

| Type | 용도 |
|---|---|
| `Feat` | 기능 추가 |
| `Fix` | 버그 수정 |
| `Refactor` | 동작 변화 없는 구조 개선 |
| `Style` | 포맷 등 코드 의미와 무관한 변경 |
| `Docs` | 문서 수정 |
| `Test` | 테스트 추가/수정 |
| `Chore` | 설정, 빌드, 패키지 등 기타 작업 |

예:

```text
Fix: OCR 결과에서 원재료 구간만 추출하도록 수정

라벨 전체가 인식되어 제조업소·주소까지 성분으로 잡히는 문제를 수정한다.
원재료명 이후부터 영양정보/제조원 이전 구간만 분석 대상으로 사용한다.
```

## 커밋 단위

한 커밋에는 가능하면 하나의 목적만 담습니다.

좋은 예:

- 성분 분석 엔진 추가
- 인증 API 추가
- 프론트 검색 화면 구현
- 배포 설정 추가

피하는 편이 좋은 예:

- 기능 구현 + 대규모 문서 수정 + 배포 설정을 한 커밋에 함께 포함

커밋 단위가 명확하면 코드 리뷰, 회귀 추적, revert가 쉬워집니다.

## 검증

백엔드 핵심 로직:

```bash
cd backend
.venv/Scripts/python tests/test_ingredients.py
```

프론트엔드:

```bash
cd frontend
npm run build
```

기능을 수정했다면 관련 테스트를 함께 추가하는 것을 권장합니다.

## 환경 변수

비밀값은 저장소에 커밋하지 않습니다.

특히 다음 값은 외부 노출에 주의합니다.

- `JWT_SECRET`
- `SUPABASE_SERVICE_KEY`
- `GOOGLE_VISION_API_KEY`
- `OCR_API_KEY`
- 외부 AI 서비스 key/client id

공유가 필요한 경우 `.env.example`에는 변수명과 예시 구조만 남깁니다.

## API 변경

API 경로는 `/api/v1/...` 규칙을 따릅니다.

API를 변경한 경우 아래도 함께 확인합니다.

1. 백엔드 라우터
2. 프론트엔드 API 호출부
3. `docs/API.md`
4. 필요 시 Wiki `API.md`

## DB 변경

DB 구조는 `backend/app/core/db.py`를 기준으로 관리합니다.

모델 변경 후:

```bash
python scripts/dump_schema.py
```

으로 `supabase/schema.sql`을 갱신합니다.

DB 구조가 바뀌면 `docs/SCHEMA.md`와 Wiki `Database.md`도 함께 확인합니다.

## 리뷰 시 확인할 항목

- 인증/권한 누락 여부
- 환경 변수 기본값이 운영에 안전한지
- 외부 API 실패 시 예외 처리
- 입력값 경계 조건
- OCR/파싱 휴리스틱의 오탐 가능성
- 프론트와 백엔드 검증 규칙 일치 여부
- 테스트 누락 여부
- 문서와 실제 구현 일치 여부
