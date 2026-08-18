---
title: FIRST LABEL Embedding
emoji: 🧭
colorFrom: green
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
---

# FIRST LABEL Embedding

검색어·제품 텍스트를 문장 임베딩 벡터로 변환하는 전용 서비스 (fastembed / ONNX).
본 백엔드(Vercel)가 용량·콜드스타트 제약으로 임베딩 모델을 담을 수 없어 분리했다.
OCR 서비스와 동일한 분리 전략.

모델: `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` (다국어, 384차원).

## API

| Method | Path | 설명 |
|---|---|---|
| GET | `/health` | 상태 확인 |
| POST | `/embed` | `{"texts": ["...", "..."]}` → `{"vectors": [[...], ...], "dim": 384}` |

## Secrets / 환경변수

| 이름 | 설명 |
|---|---|
| `EMBEDDING_API_KEY` | **필수.** `X-API-Key` 헤더가 일치해야 호출 가능. 미설정 시 서버가 기동하지 않는다(공개 리소스 남용 방지) |
| `ALLOW_UNAUTHENTICATED_EMBEDDING` | 로컬 개발에서만 `EMBEDDING_API_KEY` 없이 기동하려면 `true` |
| `EMBEDDING_MODEL` | 사용할 fastembed 모델명. 기본값은 위 다국어 MiniLM |
| `CORS_ORIGINS` | 쉼표 구분. 기본값 `https://first-label-app.vercel.app,http://localhost:3000` |
| `EMBEDDING_MAX_TEXTS` | 한 요청당 최대 텍스트 개수. 기본 256 |
| `EMBEDDING_MAX_TEXT_LEN` | 텍스트당 최대 문자 수. 기본 2000 |
| `EMBEDDING_RATE_LIMIT_MAX` / `EMBEDDING_RATE_LIMIT_WINDOW_SEC` | IP당 요청 제한. 기본 60초당 120회 |
