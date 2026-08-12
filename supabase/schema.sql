-- FIRST LABEL — Supabase(Postgres) 스키마
-- 자동 생성: python scripts/dump_schema.py  (원본은 backend/app/core/db.py)
-- Supabase 대시보드 → SQL Editor 에 붙여넣어 실행하세요.

create extension if not exists "pgcrypto";  -- gen_random_uuid()
create extension if not exists "vector";    -- 제품 임베딩


CREATE TABLE products (
	product_id BIGSERIAL NOT NULL, 
	name VARCHAR(255) NOT NULL, 
	maker_name VARCHAR(255) NOT NULL, 
	category VARCHAR(100) NOT NULL, 
	volume VARCHAR(50) NOT NULL, 
	calories INTEGER NOT NULL, 
	raw_ingredients TEXT NOT NULL, 
	image_url TEXT NOT NULL, 
	image_source VARCHAR(20) NOT NULL, 
	rating FLOAT NOT NULL, 
	rating_count INTEGER NOT NULL, 
	is_lactose_free BOOLEAN NOT NULL, 
	is_plant_based BOOLEAN NOT NULL, 
	wishlist_count INTEGER NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (product_id)
);

CREATE INDEX ix_products_name ON products (name);


CREATE TABLE users (
	user_id UUID NOT NULL DEFAULT gen_random_uuid(), 
	login_id VARCHAR(20) NOT NULL, 
	nickname VARCHAR(50) NOT NULL, 
	password_hash VARCHAR(255) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	deleted_at TIMESTAMP WITH TIME ZONE, 
	notify_push BOOLEAN NOT NULL, 
	notify_registration BOOLEAN NOT NULL, 
	notify_analysis BOOLEAN NOT NULL, 
	notify_recommend BOOLEAN NOT NULL, 
	notify_event BOOLEAN NOT NULL, 
	PRIMARY KEY (user_id)
);

CREATE UNIQUE INDEX ix_users_login_id ON users (login_id);


CREATE TABLE analyses (
	id BIGSERIAL NOT NULL, 
	user_id UUID, 
	product_id BIGINT, 
	product_name VARCHAR(255) NOT NULL, 
	score INTEGER NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (user_id) ON DELETE SET NULL, 
	FOREIGN KEY(product_id) REFERENCES products (product_id)
);

CREATE INDEX ix_analyses_user_id ON analyses (user_id);


CREATE TABLE inquiries (
	id BIGSERIAL NOT NULL, 
	user_id UUID NOT NULL, 
	category VARCHAR(50) NOT NULL, 
	title VARCHAR(255) NOT NULL, 
	body TEXT NOT NULL, 
	answer TEXT NOT NULL, 
	answered_at TIMESTAMP WITH TIME ZONE, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (user_id) ON DELETE CASCADE
);

CREATE INDEX ix_inquiries_user_id ON inquiries (user_id);


CREATE TABLE product_embeddings (
	embedding_id BIGSERIAL NOT NULL, 
	product_id BIGINT NOT NULL, 
	source VARCHAR(30) NOT NULL, 
	model VARCHAR(60) NOT NULL, 
	dim INTEGER NOT NULL, 
	embedding VECTOR(1536) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (embedding_id), 
	CONSTRAINT uniq_product_embeddings_product_model UNIQUE (product_id, model), 
	FOREIGN KEY(product_id) REFERENCES products (product_id) ON DELETE CASCADE
);

CREATE INDEX ix_product_embeddings_product_id ON product_embeddings (product_id);


CREATE TABLE registrations (
	id BIGSERIAL NOT NULL, 
	user_id UUID, 
	product_name VARCHAR(255) NOT NULL, 
	brand VARCHAR(255) NOT NULL, 
	category VARCHAR(100) NOT NULL, 
	reason TEXT NOT NULL, 
	front_image_url TEXT NOT NULL, 
	back_image_url TEXT NOT NULL, 
	ocr_text TEXT NOT NULL, 
	representative_image_url TEXT NOT NULL, 
	image_source VARCHAR(20) NOT NULL, 
	status VARCHAR(20) NOT NULL, 
	product_id BIGINT, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (user_id) ON DELETE SET NULL, 
	FOREIGN KEY(product_id) REFERENCES products (product_id)
);

CREATE INDEX ix_registrations_status ON registrations (status);

CREATE INDEX ix_registrations_user_id ON registrations (user_id);


CREATE TABLE saved_filters (
	id BIGSERIAL NOT NULL, 
	user_id UUID NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	summary VARCHAR(255) NOT NULL, 
	keywords TEXT NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (user_id) ON DELETE CASCADE
);

CREATE INDEX ix_saved_filters_user_id ON saved_filters (user_id);


CREATE TABLE search_histories (
	search_id BIGSERIAL NOT NULL, 
	user_id UUID, 
	keyword VARCHAR(255) NOT NULL, 
	searched_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (search_id), 
	FOREIGN KEY(user_id) REFERENCES users (user_id) ON DELETE SET NULL
);

CREATE INDEX ix_search_histories_searched_at ON search_histories (searched_at);

CREATE INDEX ix_search_histories_user_id ON search_histories (user_id);


CREATE TABLE wishlists (
	wishlist_id BIGSERIAL NOT NULL, 
	user_id UUID NOT NULL, 
	product_id BIGINT NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (wishlist_id), 
	CONSTRAINT uniq_wishlists_user_id_product_id UNIQUE (user_id, product_id), 
	FOREIGN KEY(user_id) REFERENCES users (user_id) ON DELETE CASCADE, 
	FOREIGN KEY(product_id) REFERENCES products (product_id) ON DELETE CASCADE
);

CREATE INDEX ix_wishlists_product_id ON wishlists (product_id);

CREATE INDEX ix_wishlists_user_id ON wishlists (user_id);



-- 임베딩 근사 최근접 인덱스 (코사인 거리 기준).
-- 데이터를 어느 정도 넣은 뒤에 만들어야 인덱스 품질이 좋습니다.
create index if not exists idx_product_embeddings_hnsw
  on product_embeddings using hnsw (embedding vector_cosine_ops);

-- ---------------------------------------------------------------
-- RLS: 이 서비스는 FastAPI가 커넥션 스트링으로 직접 접근하므로
-- 테이블 단위 RLS를 켜지 않는다. anon 키로 브라우저에서 직접 조회할
-- 계획이 생기면 그때 테이블별 정책을 추가할 것.
-- ---------------------------------------------------------------
