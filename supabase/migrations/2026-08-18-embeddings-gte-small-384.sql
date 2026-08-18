-- FIRST LABEL: 제품 임베딩을 gte-small(384차원)에 맞춰 정렬.
-- Supabase SQL 에디터에서 한 번 실행하세요.
--
-- 전제: product_embeddings 테이블에 임베딩 데이터가 아직 없음
--       (지금까지 검색은 요청마다 임베딩하는 방식이라 이 테이블을 채운 적 없음).
--       기존 데이터가 있다면 이 스크립트는 임베딩을 지웁니다 — 실행 전 확인하세요.

create extension if not exists vector;

-- 테이블이 없으면 384차원으로 생성
create table if not exists product_embeddings (
    embedding_id bigserial primary key,
    product_id   bigint not null references products (product_id) on delete cascade,
    source       varchar(30)  not null default 'name_ingredients',
    model        varchar(60)  not null default 'gte-small',
    dim          integer      not null default 384,
    embedding    vector(384)  not null,
    created_at   timestamptz  not null default now(),
    constraint uniq_product_embeddings_product_model unique (product_id, model)
);

create index if not exists ix_product_embeddings_product_id
    on product_embeddings (product_id);

-- 이미 존재하던 테이블이 1536차원 등 다른 차원이면 384로 교체(비어 있다는 전제).
drop index if exists idx_product_embeddings_hnsw;
alter table product_embeddings drop column if exists embedding;
alter table product_embeddings add column embedding vector(384) not null;
alter table product_embeddings alter column dim set default 384;

-- 코사인 유사도 검색용 HNSW 인덱스
create index if not exists idx_product_embeddings_hnsw
    on product_embeddings using hnsw (embedding vector_cosine_ops);
