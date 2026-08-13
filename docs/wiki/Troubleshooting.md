# Troubleshooting

개발 및 외부 서비스 연동 중 자주 확인할 항목을 정리합니다.

## 백엔드가 실행되지 않을 때

### `ModuleNotFoundError`

가상환경이 활성화되어 있는지 확인하고 의존성을 다시 설치합니다.

```bash
cd backend
pip install -r requirements.txt
```

### 환경 변수 누락

`backend/.env`가 존재하는지 확인합니다.

```bash
cp .env.example .env
```

운영 환경에서는 `JWT_SECRET`을 반드시 별도로 설정하는 것을 권장합니다.

## DB 연결 오류

### `password authentication failed`

- DB 비밀번호 오타 확인
- 연결 문자열에 특수문자가 있다면 URL 인코딩 여부 확인

### `Network is unreachable`

Supabase Direct connection 대신 Session pooler 사용을 확인합니다.

### 로컬 DB로 연결됨

`DATABASE_URL`이 없으면 SQLite로 동작합니다.

```text
backend/firstlabel.db
```

Health Check에서 현재 DB 연결 상태를 확인하세요.

```text
GET /api/v1/health
```

## Storage에 이미지가 올라가지 않을 때

다음 값을 확인합니다.

```env
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
SUPABASE_BUCKET=product-images
```

`SUPABASE_SERVICE_KEY`는 일반 anon/publishable 키와 다릅니다.

버킷 이름과 실제 Supabase Storage 버킷 이름도 동일해야 합니다.

## OCR 오류

### OCR 미설치로 503 발생

로컬 PaddleOCR을 사용하는 환경이라면 패키지를 설치합니다.

```bash
pip install paddlepaddle paddleocr
```

OCR을 사용할 수 없는 경우 프론트엔드에서는 직접 입력 경로를 사용할 수 있습니다.

### `numpy.core.multiarray failed to import`

PaddleOCR/PaddlePaddle 버전에 따라 NumPy 2.x와 충돌할 수 있습니다.

```bash
pip install "numpy<2"
```

### OCR 결과가 비어 있음 / 422

- 성분표가 사진에서 충분히 크게 보이는지 확인
- 정면 촬영
- 그림자와 반사 최소화
- 구겨진 포장지는 최대한 펴서 촬영

## Google Vision 오류

`GOOGLE_VISION_API_KEY`가 설정되어 있는지 확인합니다.

Google Cloud Console에서 다음도 확인합니다.

- Cloud Vision API 활성화 여부
- API 키 제한 대상에 Vision API가 포함되어 있는지
- 결제 계정/쿼터 상태

## 원격 OCR 서비스 호출 실패

다음 값을 확인합니다.

```env
OCR_SERVICE_URL=...
OCR_API_KEY=...
```

백엔드와 OCR 서비스 양쪽의 API Key가 동일해야 합니다.

또한 OCR 서비스 자체 `/health` 엔드포인트가 정상인지 먼저 확인합니다.

## CORS 오류

브라우저 콘솔에 CORS 오류가 발생한다면 백엔드의 `CORS_ORIGINS`에 현재 프론트엔드 주소가 포함되어 있는지 확인합니다.

로컬 예:

```env
CORS_ORIGINS=http://localhost:3000
```

운영에서는 실제 Vercel 프론트 도메인을 지정합니다.

## 프론트엔드에서 API 연결 실패

`frontend/.env.local`:

```env
NEXT_PUBLIC_API_BASE=http://localhost:8000
```

운영에서는 배포된 백엔드 URL로 변경합니다.

환경 변수를 수정한 뒤에는 Next.js 개발 서버를 재시작해야 합니다.

## 성분 분석 결과가 예상과 다를 때

다음 순서로 확인합니다.

1. OCR 원문이 정상적으로 읽혔는지
2. 원재료 구간이 올바르게 추출됐는지
3. `lactose_keywords.json`에 키워드/alias가 있는지
4. 분리된 원재료 토큰이 의도대로 나왔는지
5. 관련 회귀 테스트가 있는지

핵심 로직 테스트:

```bash
cd backend
.venv/Scripts/python tests/test_ingredients.py
```

분석 로직 구조는 [Ingredient Analysis](./Ingredient-Analysis.md)를 참고하세요.

## 문서와 코드가 다를 때

구현이 변경된 뒤 문서가 갱신되지 않았을 수 있습니다.

우선순위는 다음과 같이 봅니다.

1. 실제 실행 코드
2. `docs/API.md`, `docs/SCHEMA.md`, `docs/SETUP.md`
3. `docs/wiki/` 문서

차이가 확인되면 코드 수정과 함께 문서도 같은 작업에서 갱신하는 것을 권장합니다.
