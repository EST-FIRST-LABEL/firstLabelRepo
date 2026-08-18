from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api import analysis, auth, products, registrations, users
from app.core.config import IS_CLOUD_RUN, IS_SERVERLESS, settings
from app.core.db import init_db

app = FastAPI(
    title="FIRST LABEL API",
    description="유당 관련 성분을 재배치·하이라이트해 주는 개인화 식품 정보 서비스",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(products.router)
app.include_router(analysis.router)
app.include_router(registrations.router)
app.include_router(users.router)

# Supabase Storage 미설정 시 업로드 이미지 로컬 서빙
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")


@app.on_event("startup")
def on_startup() -> None:
    # Vercel/Lambda(서버리스)는 요청마다 콜드스타트라 스키마 생성을 건너뛴다.
    # (원격 Postgres 를 배포 전 스크립트로 한 번만 만들어 두는 것을 전제로 한다)
    if IS_SERVERLESS:
        return
    # 로컬/Cloud Run: 스키마 생성 후 카탈로그가 비어 있으면 데모(목업) 데이터를 시드한다.
    # Cloud Run 은 /tmp 의 임시 SQLite 라 콜드스타트마다 재생성되지만 seed_if_empty 가 idempotent 하다.
    init_db()
    from app.core.db import SessionLocal
    from app.core.seed import seed_if_empty

    db = SessionLocal()
    try:
        seed_if_empty(db)
    finally:
        db.close()


@app.get("/api/v1/health")
def health():
    return {
        "status": "ok",
        "db": "postgres(supabase)" if not settings.DATABASE_URL.startswith("sqlite") else "sqlite(local)",
        "storage": "supabase" if settings.SUPABASE_SERVICE_KEY else "local",
        "alan_keys": len(settings.ALAN_CLIENT_IDS),
        "ocr": (
            "google-vision" if settings.GOOGLE_VISION_API_KEY
            else settings.OCR_SERVICE_URL or "local(paddleocr)"
        ),
    }
