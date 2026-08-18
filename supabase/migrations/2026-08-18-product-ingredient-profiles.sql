-- 배포 순서(Important 2): 이 마이그레이션은 빈 product_ingredient_profiles 테이블만 만든다.
-- 추천 GENERAL 필터는 프로필이 없는 상품을 안전으로 취급하지 않고 제외하므로,
-- 마이그레이션 직후 반드시 scripts/ingest_products.py 로 전체 재적재(backfill)를 실행해
-- 모든 상품에 프로필을 채워야 한다. 배포 gate: select count(*) products == count(*) profiles.
alter table products add column if not exists report_no varchar(30);
alter table products add column if not exists allergy_info text not null default '';
alter table products add column if not exists nutrition_info text not null default '';
create unique index if not exists ix_products_report_no on products (report_no);

create table if not exists product_ingredient_profiles (
    product_id bigint primary key references products (product_id) on delete cascade,
    source_hash varchar(64) not null,
    analysis_json text not null default '{}',
    tokens_json text not null default '[]',
    lactose_risk boolean not null default false,
    general_risk boolean not null default false,
    updated_at timestamptz not null default now()
);

create index if not exists ix_product_ingredient_profiles_source_hash
    on product_ingredient_profiles (source_hash);
create index if not exists ix_product_ingredient_profiles_lactose_risk
    on product_ingredient_profiles (lactose_risk);
create index if not exists ix_product_ingredient_profiles_general_risk
    on product_ingredient_profiles (general_risk);
