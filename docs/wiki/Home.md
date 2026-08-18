# FIRST LABEL Wiki

FIRST LABEL은 식품 원재료 정보를 분석해 사용자가 주의해야 할 성분을 먼저 보여주고, 더 나은 대체 제품을 찾을 수 있도록 돕는 개인 맞춤형 식품 정보 서비스입니다.

현재 MVP의 핵심은 **유당 관련 성분 분석과 우선순위 재배치**입니다. OCR 또는 직접 입력으로 원재료 정보를 받아 위험도를 계산하고, 주의가 필요한 성분을 결과 화면 상단에 노출합니다.

- 서비스: https://first-label.vercel.app
- API 문서: https://first-label-api.vercel.app/docs

## 문서 바로가기

- [Getting Started](./Getting-Started.md) — 로컬 개발 환경 실행
- [Architecture](./Architecture.md) — 프론트엔드, 백엔드, OCR, 외부 서비스 구조
- [Database](./Database.md) — 데이터베이스 구조와 ERD
- [API](./API.md) — API 영역별 역할과 인증 방식
- [Ingredient Analysis](./Ingredient-Analysis.md) — 유당 성분 분석 로직
- [Deployment](./Deployment.md) — Vercel, Supabase, OCR 배포 구성
- [Development Guide](./Development-Guide.md) — 브랜치, 커밋, 검증 규칙
- [Troubleshooting](./Troubleshooting.md) — 개발 및 연동 중 자주 발생하는 문제

## 저장소 구조

```text
first-label/
├─ frontend/          Next.js + TypeScript + Tailwind CSS
├─ backend/           FastAPI + SQLAlchemy
├─ ocr-service/       PaddleOCR 전용 서비스
├─ scripts/           시드 및 스키마 생성 스크립트
├─ supabase/          Supabase 적용용 SQL
└─ docs/              API, 스키마, 연동 문서
```

## 원본 문서

이 Wiki는 저장소의 실제 코드와 아래 문서를 기준으로 정리한 안내 문서입니다.

- [`README.md`](../../README.md)
- [`docs/API.md`](../API.md)
- [`docs/SCHEMA.md`](../SCHEMA.md)
- [`docs/SETUP.md`](../SETUP.md)

구현 세부사항이 Wiki와 다를 경우 **코드와 위 원본 문서를 우선**합니다.
