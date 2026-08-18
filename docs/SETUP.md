# 실물 연동 가이드

지금 상태(`http://localhost:8000/api/v1/health` 로 확인 가능):

```json
{ "status": "ok", "db": "sqlite(local)", "storage": "local", "alan_keys": 5 }
```

세 가지를 각각 켜면 아래처럼 바뀝니다. **셋은 서로 독립이라 아무 순서로나, 하나만 해도 됩니다.**

| 항목 | 바뀌는 값 | 소요 |
|---|---|---|
| 1. Supabase DB | `"db": "postgres(supabase)"` | 5분 |
| 2. Supabase Storage | `"storage": "supabase"` | 3분 |
| 3. PaddleOCR | 사진 스캔이 실제로 동작 | 10~20분 (설치 용량 큼) |

---

## 1. Supabase DB 연결

### 1-1. 커넥션 스트링 복사

1. https://supabase.com/dashboard 접속 → 프로젝트 선택
2. 화면 상단 **Connect** 버튼 (조직 설정 화면이 아니라 **프로젝트** 안에서 눌러야 보입니다)
3. 상단 탭 5개 중 **Direct — Connection string** 선택
4. 연결 방식이 3개 보입니다. **Session pooler** 를 고르세요.
   - `Direct connection` — IPv6 전용이라 일반 가정/카페 회선에서 안 되는 경우가 많음
   - **`Session pooler` (포트 5432) ← 이걸 사용**
   - `Transaction pooler` (포트 6543) — SQLAlchemy 커넥션 풀과 궁합이 나쁨
5. 복사하면 이런 모양입니다:

```
postgresql://postgres.<PROJECT-REF>:[YOUR-PASSWORD]@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres
```

### 1-2. 비밀번호 채우기

`[YOUR-PASSWORD]` 자리에 **DB 비밀번호**를 넣습니다.
프로젝트 만들 때 정한 값이고, 기억나지 않으면 같은 화면의 **Reset database password** 로 새로 만들면 됩니다.

> ⚠️ 비밀번호에 `@ : / ? # & %` 가 있으면 URL 인코딩해야 합니다.
> 예: `p@ss` → `p%40ss`. 헷갈리면 비밀번호를 영문+숫자로 재설정하는 게 빠릅니다.

### 1-3. `.env` 에 넣기

`backend/.env` 를 열고 주석 처리된 줄을 살려서 붙여넣으세요.

```bash
DATABASE_URL=postgresql://postgres.xxxxx:실제비밀번호@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres
```

### 1-4. 테이블 만들기

둘 중 아무거나:

- **A안 (자동)** — 서버를 재시작하면 없는 테이블을 알아서 만듭니다.
- **B안 (SQL)** — Supabase 대시보드 → **SQL Editor** → `supabase/schema.sql` 내용 붙여넣고 **Run**.
  임베딩 테이블을 쓰려면 이 파일 맨 위의 `create extension vector` 가 필요하므로 B안을 권합니다.

### 1-5. HACCP 카탈로그 적재 + 확인

```bash
cd backend
.venv/Scripts/python ../scripts/import_haccp_products.py <HACCP_CSV_PATH>
.venv/Scripts/python -m uvicorn app.main:app --reload --port 8000
```

```bash
curl http://localhost:8000/api/v1/health
# "db": "postgres(supabase)"  ← 이렇게 나오면 성공
```

Supabase 대시보드 → **Table Editor** 에 테이블과 HACCP 상품이 보입니다.

### 자주 나는 오류

| 메시지 | 원인 / 해결 |
|---|---|
| `password authentication failed` | 비밀번호 오타 또는 URL 인코딩 누락 |
| `could not translate host name` | 커넥션 스트링을 잘못 복사. 대시보드에서 다시 복사 |
| `Network is unreachable` | Direct connection(IPv6)을 골랐음 → **Session pooler** 로 변경 |
| `SSL connection has been closed` | 끝에 `?sslmode=require` 추가 |

---

## 2. Supabase Storage (업로드 이미지)

지금은 업로드 사진이 `backend/uploads/` 에 저장됩니다. 로컬에서는 문제없지만 배포하면 사라집니다.

### 2-1. 버킷 만들기

1. 대시보드 좌측 **Storage** → **New bucket**
2. Name: `product-images`
3. **Public bucket** 을 **켭니다** (제품 사진은 앱에서 그냥 보여야 하므로)
4. **Save**

### 2-2. service_role 키 복사

1. **Settings** → **API**
2. **Project API keys** 에서 `service_role` 의 **Reveal** 클릭 → 복사

> 🔐 `service_role` 은 RLS를 전부 무시하는 **마스터 키**입니다.
> 서버(`backend/.env`)에만 두고, 프론트엔드나 GitHub에는 절대 넣지 마세요.
> 이미 주신 `anon` / `publishable` 키는 업로드 권한이 없어서 이 용도로는 못 씁니다.

### 2-3. `.env` 에 넣고 재시작

```bash
SUPABASE_URL=https://<PROJECT-REF>.supabase.co
SUPABASE_SERVICE_KEY=여기에_service_role_키
SUPABASE_BUCKET=product-images
```

```bash
curl http://localhost:8000/api/v1/health
# "storage": "supabase"  ← 성공
```

앱에서 3-2 화면으로 사진을 올리면 대시보드 Storage에 파일이 쌓입니다.

---

## 3. PaddleOCR 설치

미설치 상태에서는 `POST /api/v1/scan` 이 503을 주고, 앱은 **"직접 입력"** 경로로 자동 전환됩니다. 즉 데모는 지금도 됩니다.

### 3-1. 설치

```bash
cd backend
.venv/Scripts/python -m pip install "numpy<2" paddlepaddle==2.6.2 paddleocr==2.9.1
```

> `numpy<2` 를 먼저 지정하는 이유: paddlepaddle 2.6 은 numpy 2.x 와 호환되지 않습니다.
> 이걸 빠뜨리면 `numpy.core.multiarray failed to import` 오류가 납니다.

용량이 큽니다(약 700MB~1GB). 회선에 따라 5~15분 걸립니다.

### 3-2. requirements.txt 주석 풀기

`backend/requirements.txt` 아래 두 줄의 `#` 을 지우세요.

```
paddlepaddle==2.6.2
paddleocr==2.9.1
```

### 3-3. 첫 실행

서버 재시작 후 앱에서 **분석 탭 → 성분표 사진 선택 → OCR 분석 시작**.

**첫 요청은 20~60초 걸립니다** — 한글 인식 모델을 그때 내려받기 때문입니다.
두 번째부터는 1~3초입니다. 모델은 `C:\Users\<사용자>\.paddleocr\` 에 캐시됩니다.

### 3-4. 잘 찍는 법

- 성분표가 **화면의 절반 이상**을 채우게
- 정면에서, 그림자 없이
- 봉지는 최대한 펴서 (구겨진 글자는 인식률이 크게 떨어집니다)

### 자주 나는 오류

| 메시지 | 해결 |
|---|---|
| `numpy.core.multiarray failed to import` | `pip install "numpy<2"` 후 재시작 |
| `Could not find module 'libpaddle.dll'` | Microsoft Visual C++ 재배포 패키지 설치 |
| `사진에서 글자를 읽지 못했어요` (422) | OCR은 돌았지만 인식 실패 → 3-4 참고해서 재촬영 |
| 설치가 너무 오래 걸림 | 건너뛰어도 됩니다. 직접 입력 경로로 데모 가능 |

---

## 4. Google Vision API (OCR 주 엔진)

PaddleOCR은 1GB라 서버리스에 못 올라갑니다. 배포 환경에서는 Vision을 씁니다.
키를 넣으면 Vision, 빼면 다시 PaddleOCR로 돌아가므로 오프라인 시연도 가능합니다.

### 4-1. 프로젝트 + 결제 계정

1. https://console.cloud.google.com 접속 (구글 계정으로 로그인)
2. 상단 프로젝트 선택 → **새 프로젝트** → 이름 `first-label` → 만들기
3. 좌측 메뉴 **결제** → 결제 계정 연결
   - 카드 등록이 필요하지만 **$300 / 90일 무료 크레딧**이 먼저 차감되고,
     크레딧이 끝나도 본인이 직접 업그레이드하기 전에는 자동 청구되지 않습니다.

### 4-2. Vision API 사용 설정

1. 상단 검색창에 **Cloud Vision API** 입력 → 선택
2. **사용** 버튼 클릭

### 4-3. API 키 발급

1. 좌측 메뉴 **API 및 서비스 → 사용자 인증 정보**
2. 상단 **+ 사용자 인증 정보 만들기 → API 키**
3. 생성된 키 복사

### 4-4. 키 제한 (반드시)

방금 만든 키의 **연필 아이콘** 클릭 →

- **API 제한사항** → `키 제한` 선택 → 목록에서 **Cloud Vision API** 만 체크 → 저장

제한을 안 걸면 키가 유출됐을 때 다른 유료 API까지 호출당할 수 있습니다.

### 4-5. `.env` 에 넣고 재시작

```bash
GOOGLE_VISION_API_KEY=AIza...
```

```bash
curl http://localhost:8000/api/v1/health
# "ocr": "google-vision"  ← 성공
```

### 비용

| 항목 | 한도 |
|---|---|
| 무료 | 월 **1,000건** |
| 초과 시 | 1,000건당 **$1.50** |

해커톤 시연 규모(수십~수백 건)에서는 요금이 발생하지 않습니다.
걱정되면 **결제 → 예산 및 알림**에서 $1 예산 알림을 걸어두세요.

> ⚠️ 이 키는 **서버(`backend/.env`)에서만** 씁니다.
> 프론트엔드에 넣으면 브라우저에서 그대로 노출됩니다.

---

## 전부 켠 뒤 최종 확인

```bash
curl http://localhost:8000/api/v1/health
```

```json
{ "status": "ok", "db": "postgres(supabase)", "storage": "supabase",
  "alan_keys": 5, "ocr": "google-vision" }
```

세 값이 모두 이렇게 나오면 실물 연동 완료입니다.

> **이 프로젝트는 셋 다 연결 완료 상태입니다.**
> 리전 `ap-southeast-2`(시드니), 버킷 `product-images`, PaddleOCR 모델은 사용자 홈의 `.paddleocr` 폴더에 캐시되어 있습니다.
