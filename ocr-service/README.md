---
title: FIRST LABEL OCR
emoji: 🔎
colorFrom: green
colorTo: gray
sdk: docker
app_port: 7860
pinned: false
---

# FIRST LABEL OCR

식품 성분표 이미지에서 한글 텍스트를 추출하는 전용 서비스 (PaddleOCR).
본 백엔드(Vercel)가 용량 제한으로 PaddleOCR을 담을 수 없어 분리했다.

## API

| Method | Path | 설명 |
|---|---|---|
| GET | `/health` | 상태 확인 |
| POST | `/ocr` | `multipart/form-data` 로 `image_file` 전송 → `{"text": "...", "line_count": n}` |

## Secrets / 환경변수

| 이름 | 설명 |
|---|---|
| `OCR_API_KEY` | **필수.** `X-API-Key` 헤더가 일치해야 호출 가능. 미설정 시 서버가 기동하지 않는다(공개 리소스 남용 방지) |
| `ALLOW_UNAUTHENTICATED_OCR` | 로컬 개발에서만 `OCR_API_KEY` 없이 기동하려면 `true` |
| `CORS_ORIGINS` | 쉼표 구분. 기본값 `https://first-label-app.vercel.app,http://localhost:3000` |
| `OCR_MAX_UPLOAD_BYTES` | 업로드 최대 용량(바이트). 기본 8MB |
| `OCR_MAX_IMAGE_SIDE` | 이미지 최대 한 변(px). 기본 6000 |
| `OCR_RATE_LIMIT_MAX` / `OCR_RATE_LIMIT_WINDOW_SEC` | IP당 요청 제한. 기본 60초당 30회 |
