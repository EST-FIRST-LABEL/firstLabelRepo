# FIRST LABEL

유당 관련 성분을 **최상단에 재배치하고 하이라이트**해 주는 개인 맞춤형 식품 정보 서비스.
제주 해커톤 MVP.

```
first-label/
├─ frontend/          Next.js 16 + TypeScript + Tailwind v4 (모바일 UI)
├─ backend/           FastAPI + SQLAlchemy (Supabase Postgres)
├─ scripts/           시드 / 전처리 스크립트
└─ docs/              API·스키마 문서
```

---

## 실행

### 1) 백엔드

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate          # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # 값 채우기 (아래 참고)
python ../scripts/seed_products.py --demo-user
uvicorn app.main:app --reload --port 8000
```

- Swagger: http://localhost:8000/docs
- 상태 확인: http://localhost:8000/api/v1/health

### 2) 프론트엔드

```bash
cd frontend
npm install
npm run dev                     # http://localhost:3000
```

`frontend/.env.local` 에 `NEXT_PUBLIC_API_BASE=http://localhost:8000`.

### 데모 계정

`firstlabel2024` / `firstlabel2024!`

---

## 환경 변수 (backend/.env)

> 🔐 `.env` 는 절대 GitHub에 올리지 않습니다. 저장소에는 키 이름만 있는 `.env.example` 만 공유합니다.

| 키 | 설명 |
|---|---|
| `DATABASE_URL` | Supabase Postgres 커넥션 스트링. **비우면 로컬 SQLite**(`backend/firstlabel.db`)로 동작 |
| `JWT_SECRET` | 로그인 토큰 서명 키 |
| `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` / `SUPABASE_BUCKET` | 업로드 이미지 저장. service_role 키가 없으면 `backend/uploads/` 로컬 저장 + `/uploads` 로 서빙 |
| `ALAN_CLIENT_IDS` | Alan AI client_id 목록(쉼표 구분). 여러 개면 라운드로빈 |
| `CORS_ORIGINS` | 프론트 주소 |

### Supabase 연결하려면

Supabase 대시보드 → **Settings → Database → Connection string(URI)** 값을 `DATABASE_URL` 에 넣으면 끝입니다(테이블은 서버 기동 시 자동 생성). anon/publishable 키로는 서버가 DB에 쓸 수 없습니다.

스키마를 SQL로 직접 적용하려면 `supabase/schema.sql` 을 SQL Editor에 붙여넣으세요.
이 파일은 모델에서 자동 생성됩니다 — `python scripts/dump_schema.py`. 자세한 내용은 `docs/SCHEMA.md`.

### OCR (PaddleOCR)

용량이 커서 기본 미설치입니다. 설치 전에는 `POST /api/v1/scan` 이 503을 반환하고, 화면은 **원재료 직접 입력** 경로로 자동 전환됩니다.

```bash
pip install paddlepaddle paddleocr
```

---

## 화면

| 경로 | 화면 |
|---|---|
| `/` | 홈 / 검색 (카테고리, 최근 검색, 추천 제품) |
| `/search` | 검색 결과 · 결과 없음 → 미등록 제품 등록 유도 |
| `/products/[id]` | 분석 결과 (종합 점수, 주의 원재료, 성분 상세 시트, AI 코멘트) |
| `/recommend/[id]` | AI 대체 제품 추천 (유사 / 락토프리 / 식물성) |
| `/analysis` | 성분표 스캔 분석 (OCR 또는 텍스트 입력) |
| `/register` | 미등록 제품 등록 3-1 → 3-5 |
| `/login`, `/signup` | 로그인 / 회원가입 3단계 |
| `/mypage/*` | 내 정보·비밀번호·탈퇴·저장한 필터·등록 요청 내역·문의·알림 설정·찜한 제품 |

## API

`docs/API.md` 참고. 버저닝은 `/api/v1/...` 로 통일했습니다(기획서 §17 보류 항목 → v1 채택).

## 커밋 컨벤션

```
Type: 제목

본문 (선택)

꼬리말 (선택)
```

- **제목** — 50자 이내, 첫 글자 대문자, 마침표 없음, 명령문
- **본문** — 72자 이내로 줄바꿈, "무엇"과 "왜"를 적음 (어떻게는 코드가 말함)
- **꼬리말** — 이슈 번호 (`해결: #12`, `관련: #34`, `참고: #56`)

| Type | 용도 |
|---|---|
| `Feat` | 새로운 기능 |
| `Fix` | 버그 수정 |
| `Refactor` | 동작 변화 없는 구조 개선 |
| `Style` | 포맷·세미콜론 등 코드 의미와 무관한 변경 |
| `Docs` | 문서 |
| `Test` | 테스트 추가·수정 |
| `Chore` | 빌드·설정·패키지 등 기타 작업 |

예시

```
Fix: OCR 결과에서 원재료 구간만 추출하도록 수정

라벨 전체가 인식되어 제조업소·주소까지 성분으로 잡히는 문제.
'원재료명' 이후 ~ '영양정보/제조원' 이전만 사용하고,
회사명·행정구역 토큰은 필터링한다.

해결: #12
```

## 브랜치 전략

```
main
├─ feature/frontend-search
├─ feature/frontend-mypage
├─ feature/backend-auth
├─ feature/backend-products
└─ feature/backend-recommend
```

## 검증

```bash
cd backend && .venv/Scripts/python tests/test_ingredients.py   # 성분 분석·재배치·비밀번호 규칙
cd frontend && npm run build                                    # 타입 + 빌드
```
