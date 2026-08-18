# 대량 제품 데이터 적재 (~2000개)

검색(pgvector 사전계산 임베딩) + 유당 분석 + 이미지 URL을 한 번에 준비하는 절차.

## 준비물

1. **pgvector 마이그레이션** — Supabase SQL 에디터에서 한 번 실행:
   `supabase/migrations/2026-08-18-embeddings-gte-small-384.sql`
   → `product_embeddings` 테이블을 gte-small 384차원 + HNSW 인덱스로 정렬.

2. **임베딩 Edge Function 배포 + 연결** — 검색어와 제품 임베딩은 **같은 모델(gte-small)**을
   써야 하므로, 적재도 이 Edge Function으로 임베딩한다.
   - `supabase/functions/embed` 를 Supabase에 배포 (대시보드 또는 `supabase functions deploy embed`)
   - 적재 실행 환경에 설정:
     - `EMBEDDING_SERVICE_URL` = `https://<project-ref>.supabase.co/functions/v1/embed`
     - `EMBEDDING_API_KEY` = Supabase anon 키
   - (미설정 시 로컬 fastembed(MiniLM)로 떨어져 검색어와 벡터 공간이 어긋난다 → 반드시 설정)

## 적재 실행 (repo 루트에서)

```bash
# .env 또는 환경변수에 DATABASE_URL(Supabase), EMBEDDING_SERVICE_URL, EMBEDDING_API_KEY 설정
python scripts/ingest_products.py <파일.csv>            # 전체 적재
python scripts/ingest_products.py <파일.csv> --limit 50 # 앞 50개만 (테스트)
python scripts/ingest_products.py <파일.csv> --dry-run  # 커밋 없이 파싱만 점검
python scripts/ingest_products.py <파일.csv> --no-embed # 제품만, 임베딩 생략
```

스크립트가 하는 일:
- 제품 upsert(이름 기준) — 이름/분류/제조사/원재료/`image_url`(URL 직접 저장)
- `analyze()`로 `is_lactose_free` 세팅 (유당 분석 엔진)
- gte-small 임베딩 생성 → `product_embeddings`(384차원) upsert (배치 128)

## 컬럼 매핑

`scripts/ingest_products.py` 상단 `COLUMN_MAP`이 우리 필드 → CSV 헤더 이름을 정의한다.
기본값은 HACCP 식품 데이터 기준(`prdlstNm`, `prdkind`, `manufacture`, `rawmtrl`, `imgurl1`).
**실제 파일을 받으면 이 매핑만 파일 헤더에 맞게 수정**하면 된다.

## 남은 작업 (적재 후)

- 검색 로직을 pgvector 유사도(`product_embeddings.embedding <=> 검색어벡터`) + 키워드
  하이브리드로 전환. 현재는 요청마다 전 제품 임베딩(소량용) → 2000개엔 pgvector 필요.
  이 전환은 데이터·Edge Function이 실제로 뜬 뒤 폴백(ilike) 유지하며 적용 예정.
