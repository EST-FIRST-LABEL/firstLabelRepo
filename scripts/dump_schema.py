"""SQLAlchemy 모델 → Supabase(Postgres) DDL 생성.

    python scripts/dump_schema.py          # supabase/schema.sql 갱신

모델이 곧 스키마 원본이므로 코드와 DDL이 어긋날 수 없다.
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from sqlalchemy.dialects import postgresql  # noqa: E402
from sqlalchemy.schema import CreateIndex, CreateTable  # noqa: E402

from app.core.db import Base  # noqa: E402

HEADER = """-- FIRST LABEL — Supabase(Postgres) 스키마
-- 자동 생성: python scripts/dump_schema.py  (원본은 backend/app/core/db.py)
-- Supabase 대시보드 → SQL Editor 에 붙여넣어 실행하세요.

create extension if not exists "pgcrypto";  -- gen_random_uuid()
create extension if not exists "vector";    -- 제품 임베딩

"""

FOOTER = """
-- 임베딩 근사 최근접 인덱스 (코사인 거리 기준).
-- 데이터를 어느 정도 넣은 뒤에 만들어야 인덱스 품질이 좋습니다.
create index if not exists idx_product_embeddings_hnsw
  on product_embeddings using hnsw (embedding vector_cosine_ops);

-- ---------------------------------------------------------------
-- RLS: 이 서비스는 FastAPI가 커넥션 스트링으로 직접 접근하므로
-- 테이블 단위 RLS를 켜지 않는다. anon 키로 브라우저에서 직접 조회할
-- 계획이 생기면 그때 테이블별 정책을 추가할 것.
-- ---------------------------------------------------------------
"""


def main() -> None:
    out = [HEADER]
    for table in Base.metadata.sorted_tables:
        ddl = str(CreateTable(table).compile(dialect=postgresql.dialect())).strip()
        # uuid PK 기본값은 애플리케이션이 채우지만, SQL로 직접 INSERT 할 때도 되도록 붙여준다.
        # (자식 테이블의 user_id FK 에는 붙으면 안 되므로 users 테이블에서만)
        if table.name == "users":
            ddl = ddl.replace("user_id UUID NOT NULL", "user_id UUID NOT NULL DEFAULT gen_random_uuid()", 1)
        out.append(f"{ddl};\n")
        for index in sorted(table.indexes, key=lambda i: i.name or ""):
            out.append(str(CreateIndex(index).compile(dialect=postgresql.dialect())).strip() + ";\n")
        out.append("")
    out.append(FOOTER)

    target = ROOT / "supabase" / "schema.sql"
    target.parent.mkdir(exist_ok=True)
    target.write_text("\n".join(out), encoding="utf-8")
    print(f"{target} 생성 완료 ({len(Base.metadata.sorted_tables)}개 테이블)")


if __name__ == "__main__":
    main()
