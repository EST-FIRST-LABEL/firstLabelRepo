from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api import analysis, auth, products, registrations, users
from app.core.config import IS_SERVERLESS, settings
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
    # 서버리스는 콜드스타트마다 실행되므로 스키마 생성은 건너뛴다.
    # (배포 전 로컬/스크립트에서 한 번만 만들면 된다)
    if not IS_SERVERLESS:
        init_db()


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
