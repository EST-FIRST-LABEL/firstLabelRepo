---
title: FIRST LABEL API
emoji: 🥛
colorFrom: green
colorTo: gray
sdk: docker
app_port: 7860
pinned: false
---

# FIRST LABEL API

유당 관련 성분을 최상단에 재배치하고 하이라이트해 주는 개인 맞춤형 식품 정보 서비스의 백엔드.

- FastAPI + PaddleOCR(한글)
- DB / Storage: Supabase
- AI 코멘트 · 대표 이미지 검색: Alan AI

문서: `/docs` · 상태 확인: `/api/v1/health`

## 필요한 Secrets

Space **Settings → Variables and secrets** 에 등록하세요. 저장소에는 절대 넣지 않습니다.

| 이름 | 설명 |
|---|---|
| `DATABASE_URL` | Supabase Postgres 커넥션 스트링 (Session pooler) |
| `JWT_SECRET` | 로그인 토큰 서명 키 |
| `SUPABASE_URL` | 프로젝트 URL |
| `SUPABASE_SERVICE_KEY` | service_role 키 (Storage 업로드용) |
| `SUPABASE_BUCKET` | `product-images` |
| `ALAN_CLIENT_IDS` | Alan AI client_id 목록(쉼표 구분) |
| `CORS_ORIGINS` | 프론트엔드 주소 (예: `https://first-label.vercel.app`) |
| `PUBLIC_BASE_URL` | 이 Space 주소 |
