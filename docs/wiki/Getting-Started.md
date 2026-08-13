# Getting Started

FIRST LABEL을 로컬에서 실행하는 기본 절차입니다.

## 1. 백엔드 실행

```bash
cd backend
python -m venv .venv
```

가상환경 활성화:

```bash
# Windows
.venv/Scripts/activate

# macOS / Linux
source .venv/bin/activate
```

의존성 설치:

```bash
pip install -r requirements.txt
```

환경 변수 파일 준비:

```bash
cp .env.example .env
```

데모 데이터 시드:

```bash
python ../scripts/seed_products.py --demo-user
```

서버 실행:

```bash
uvicorn app.main:app --reload --port 8000
```

확인 주소:

- Swagger: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/api/v1/health`

## 2. 프론트엔드 실행

```bash
cd frontend
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`으로 접속합니다.

`frontend/.env.local`에는 다음 값을 지정합니다.

```env
NEXT_PUBLIC_API_BASE=http://localhost:8000
```

## 3. 데모 계정

현재 데모 시드 기준 계정:

```text
ID: firstlabel2024
PW: firstlabel2024!
```

## 4. 기본 환경 변수

백엔드의 주요 환경 변수는 다음과 같습니다.

| 변수 | 용도 |
|---|---|
| `DATABASE_URL` | Supabase Postgres 연결. 비어 있으면 로컬 SQLite 사용 |
| `JWT_SECRET` | 로그인 토큰 서명 키 |
| `SUPABASE_URL` | Supabase 프로젝트 URL |
| `SUPABASE_SERVICE_KEY` | Supabase Storage 서버 권한 키 |
| `SUPABASE_BUCKET` | 제품 이미지 버킷 이름 |
| `GOOGLE_VISION_API_KEY` | Google Vision OCR 사용 시 필요 |
| `OCR_SERVICE_URL` | 별도 OCR 서비스 주소 |
| `OCR_API_KEY` | 별도 OCR 서비스 인증 키 |
| `ALAN_CLIENT_IDS` | Alan AI client_id 목록 |
| `CORS_ORIGINS` | 허용할 프론트엔드 origin 목록 |

> `.env`, API Key, service_role 키와 같은 비밀값은 GitHub에 커밋하지 않습니다.

## 5. 빠른 검증

백엔드 핵심 로직:

```bash
cd backend
.venv/Scripts/python tests/test_ingredients.py
```

프론트엔드 타입 및 빌드:

```bash
cd frontend
npm run build
```

실물 연동이 필요한 경우 [Deployment](./Deployment.md) 문서를 확인하세요.
