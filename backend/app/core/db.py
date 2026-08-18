import uuid
from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    create_engine,
    func,
    inspect,
    text,
)
from pgvector.sqlalchemy import Vector
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

from app.core.config import settings

connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(settings.DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def now() -> datetime:
    return datetime.utcnow()


# ERD 표기대로 bigint. SQLite는 INTEGER PRIMARY KEY 만 자동 증가하므로 변형을 둔다.
BigId = BigInteger().with_variant(Integer, "sqlite")
# ERD 표기대로 timestamptz + DEFAULT CURRENT_TIMESTAMP
TS = DateTime(timezone=True)

# 임베딩 차원. Supabase Edge Function의 gte-small 기준(384). 모델을 바꾸면 이 값도 바꿀 것.
EMBEDDING_DIM = 384


class User(Base):
    __tablename__ = "users"
    # 파이썬에서는 user.id, DB 컬럼명은 ERD 표기인 user_id
    id: Mapped[uuid.UUID] = mapped_column("user_id", Uuid, primary_key=True, default=uuid.uuid4)
    login_id: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    nickname: Mapped[str] = mapped_column(String(50))
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(TS, default=now, server_default=func.now())
    deleted_at: Mapped[datetime | None] = mapped_column(TS, nullable=True)
    # 알림 설정. 프로덕션 users 테이블에 NOT NULL 컬럼으로 존재하므로 INSERT 시 값을
    # 반드시 제공해야 한다(미제공 시 NotNullViolation). 기본값을 클라이언트 측에서 채운다.
    notify_push: Mapped[bool] = mapped_column(Boolean, default=True)
    notify_registration: Mapped[bool] = mapped_column(Boolean, default=True)
    notify_analysis: Mapped[bool] = mapped_column(Boolean, default=True)
    notify_recommend: Mapped[bool] = mapped_column(Boolean, default=False)
    notify_event: Mapped[bool] = mapped_column(Boolean, default=True)


class Product(Base):
    __tablename__ = "products"
    id: Mapped[int] = mapped_column("product_id", BigId, primary_key=True)
    report_no: Mapped[str | None] = mapped_column(String(30), unique=True, index=True, nullable=True)
    name: Mapped[str] = mapped_column(String(255), index=True)
    maker_name: Mapped[str] = mapped_column(String(255), default="")
    category: Mapped[str] = mapped_column(String(100), default="")
    volume: Mapped[str] = mapped_column(String(50), default="")
    calories: Mapped[int] = mapped_column(Integer, default=0)
    raw_ingredients: Mapped[str] = mapped_column(Text, default="")
    allergy_info: Mapped[str] = mapped_column(Text, default="")
    nutrition_info: Mapped[str] = mapped_column(Text, default="")
    image_url: Mapped[str] = mapped_column(Text, default="")
    # "crawled" | "ai_search" | "user_upload"  (§9 B안)
    image_source: Mapped[str] = mapped_column(String(20), default="crawled")
    rating: Mapped[float] = mapped_column(default=0.0)
    rating_count: Mapped[int] = mapped_column(Integer, default=0)
    is_lactose_free: Mapped[bool] = mapped_column(Boolean, default=False)
    is_plant_based: Mapped[bool] = mapped_column(Boolean, default=False)
    wishlist_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(TS, default=now, server_default=func.now())


class ProductEmbedding(Base):
    """제품 임베딩. 원재료 구성 기반 유사 제품 검색(§2 AI 대체 제품 추천)용.

    Postgres에서는 pgvector, SQLite에서는 JSON 문자열로 떨어진다.
    차원은 사용하는 임베딩 모델에 맞춰 EMBEDDING_DIM 을 바꾸면 된다.
    """

    __tablename__ = "product_embeddings"
    __table_args__ = (UniqueConstraint("product_id", "model", name="uniq_product_embeddings_product_model"),)

    id: Mapped[int] = mapped_column("embedding_id", BigId, primary_key=True)
    product_id: Mapped[int] = mapped_column(
        BigId, ForeignKey("products.product_id", ondelete="CASCADE"), index=True
    )
    # 어떤 텍스트를 임베딩했는지: "raw_ingredients" | "name" | "name_ingredients"
    source: Mapped[str] = mapped_column(String(30), default="name_ingredients")
    model: Mapped[str] = mapped_column(String(60), default="gte-small")
    dim: Mapped[int] = mapped_column(Integer, default=EMBEDDING_DIM)
    embedding: Mapped[list[float]] = mapped_column(Vector(EMBEDDING_DIM).with_variant(Text, "sqlite"))
    created_at: Mapped[datetime] = mapped_column(TS, default=now, server_default=func.now())


class ProductIngredientProfile(Base):
    __tablename__ = "product_ingredient_profiles"

    product_id: Mapped[int] = mapped_column(
        BigId, ForeignKey("products.product_id", ondelete="CASCADE"), primary_key=True
    )
    source_hash: Mapped[str] = mapped_column(String(64), index=True)
    analysis_json: Mapped[str] = mapped_column(Text, default="{}")
    tokens_json: Mapped[str] = mapped_column(Text, default="[]")
    lactose_risk: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    general_risk: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    updated_at: Mapped[datetime] = mapped_column(
        TS, default=now, onupdate=now, server_default=func.now()
    )


class Wishlist(Base):
    __tablename__ = "wishlists"
    __table_args__ = (UniqueConstraint("user_id", "product_id", name="uniq_wishlists_user_id_product_id"),)
    id: Mapped[int] = mapped_column("wishlist_id", BigId, primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.user_id", ondelete="CASCADE"), index=True)
    product_id: Mapped[int] = mapped_column(BigId, ForeignKey("products.product_id", ondelete="CASCADE"), index=True)
    created_at: Mapped[datetime] = mapped_column(TS, default=now, server_default=func.now())


class SearchHistory(Base):
    __tablename__ = "search_histories"
    id: Mapped[int] = mapped_column("search_id", BigId, primary_key=True)
    user_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("users.user_id", ondelete="SET NULL"), index=True)
    keyword: Mapped[str] = mapped_column(String(255))
    searched_at: Mapped[datetime] = mapped_column(TS, default=now, index=True, server_default=func.now())


class SavedFilter(Base):
    __tablename__ = "saved_filters"
    id: Mapped[int] = mapped_column(BigId, primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.user_id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(100))
    summary: Mapped[str] = mapped_column(String(255), default="")
    keywords: Mapped[str] = mapped_column(Text, default="[]")  # JSON 배열 문자열
    updated_at: Mapped[datetime] = mapped_column(TS, default=now, onupdate=now, server_default=func.now())


class Registration(Base):
    __tablename__ = "registrations"
    id: Mapped[int] = mapped_column(BigId, primary_key=True)
    user_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("users.user_id", ondelete="SET NULL"), index=True)
    product_name: Mapped[str] = mapped_column(String(255))
    brand: Mapped[str] = mapped_column(String(255), default="")
    category: Mapped[str] = mapped_column(String(100), default="")
    reason: Mapped[str] = mapped_column(Text, default="")
    front_image_url: Mapped[str] = mapped_column(Text, default="")
    back_image_url: Mapped[str] = mapped_column(Text, default="")
    ocr_text: Mapped[str] = mapped_column(Text, default="")
    representative_image_url: Mapped[str] = mapped_column(Text, default="")
    image_source: Mapped[str] = mapped_column(String(20), default="user_upload")
    # PENDING(등록 대기) | REVIEWING(검증 중) | DONE(등록 완료) | CANCELED(요청 취소)
    status: Mapped[str] = mapped_column(String(20), default="PENDING", index=True)
    product_id: Mapped[int | None] = mapped_column(BigId, ForeignKey("products.product_id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(TS, default=now, server_default=func.now())


class Inquiry(Base):
    __tablename__ = "inquiries"
    id: Mapped[int] = mapped_column(BigId, primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.user_id", ondelete="CASCADE"), index=True)
    category: Mapped[str] = mapped_column(String(50), default="기타 문의")
    title: Mapped[str] = mapped_column(String(255))
    body: Mapped[str] = mapped_column(Text, default="")
    answer: Mapped[str] = mapped_column(Text, default="")
    answered_at: Mapped[datetime | None] = mapped_column(TS, nullable=True)
    created_at: Mapped[datetime] = mapped_column(TS, default=now, server_default=func.now())


class Analysis(Base):
    __tablename__ = "analyses"
    id: Mapped[int] = mapped_column(BigId, primary_key=True)
    user_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("users.user_id", ondelete="SET NULL"), index=True)
    product_id: Mapped[int | None] = mapped_column(BigId, ForeignKey("products.product_id"), nullable=True)
    product_name: Mapped[str] = mapped_column(String(255), default="")
    score: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(TS, default=now, server_default=func.now())


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    Base.metadata.create_all(engine)
    ensure_catalog_schema(engine)


def ensure_catalog_schema(bind) -> None:
    inspector = inspect(bind)
    if not inspector.has_table("products"):
        return
    existing = {column["name"] for column in inspector.get_columns("products")}
    definitions = {
        "report_no": "VARCHAR(30)",
        "allergy_info": "TEXT NOT NULL DEFAULT ''",
        "nutrition_info": "TEXT NOT NULL DEFAULT ''",
    }
    with bind.begin() as connection:
        for name, ddl in definitions.items():
            if name not in existing:
                connection.execute(text(f"ALTER TABLE products ADD COLUMN {name} {ddl}"))
        connection.execute(
            text("CREATE UNIQUE INDEX IF NOT EXISTS ix_products_report_no ON products (report_no)")
        )


__all__ = [
    "Base", "engine", "SessionLocal", "get_db", "init_db", "ensure_catalog_schema", "func",
    "User", "Product", "Wishlist", "SearchHistory", "SavedFilter",
    "Registration", "Inquiry", "Analysis", "ProductEmbedding", "ProductIngredientProfile", "EMBEDDING_DIM",
]
