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

## Secrets (선택)

| 이름 | 설명 |
|---|---|
| `OCR_API_KEY` | 설정하면 `X-API-Key` 헤더가 일치해야 호출 가능 |
| `CORS_ORIGINS` | 기본값 `*` |
