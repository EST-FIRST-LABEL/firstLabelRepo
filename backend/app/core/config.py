import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parents[2]  # backend/
load_dotenv(BASE_DIR / ".env")

# 서버리스(Vercel)는 파일시스템이 읽기 전용이고 /tmp 만 쓸 수 있다.
IS_SERVERLESS = bool(os.getenv("VERCEL") or os.getenv("AWS_LAMBDA_FUNCTION_NAME"))
WRITABLE_DIR = Path("/tmp") if IS_SERVERLESS else BASE_DIR


def _csv(name: str) -> list[str]:
    return [v.strip() for v in os.getenv(name, "").split(",") if v.strip()]


class Settings:
    # DB: Supabase Postgres 커넥션 스트링을 넣으면 그대로 사용, 비어 있으면 로컬 SQLite
    DATABASE_URL: str = os.getenv("DATABASE_URL") or f"sqlite:///{WRITABLE_DIR / 'firstlabel.db'}"

    JWT_SECRET: str = os.getenv("JWT_SECRET", "dev-only-change-me")
    JWT_EXPIRE_DAYS: int = int(os.getenv("JWT_EXPIRE_DAYS", "14"))

    # Supabase Storage (미설정 시 backend/uploads 로컬 저장 + /uploads 정적 서빙)
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_KEY", "")
    SUPABASE_BUCKET: str = os.getenv("SUPABASE_BUCKET", "product-images")

    # Alan AI (client_id 여러 개 → 라운드로빈)
    ALAN_API_URL: str = os.getenv("ALAN_API_URL", "https://kdt-api-function.azurewebsites.net/api/v1")
    ALAN_CLIENT_IDS: list[str] = _csv("ALAN_CLIENT_IDS")

    # OCR 우선순위: Google Vision > 원격 OCR 서비스 > 로컬 PaddleOCR
    GOOGLE_VISION_API_KEY: str = os.getenv("GOOGLE_VISION_API_KEY", "")
    OCR_SERVICE_URL: str = os.getenv("OCR_SERVICE_URL", "")
    OCR_API_KEY: str = os.getenv("OCR_API_KEY", "")

    CORS_ORIGINS: list[str] = _csv("CORS_ORIGINS") or ["http://localhost:3000"]
    PUBLIC_BASE_URL: str = os.getenv("PUBLIC_BASE_URL", "http://localhost:8000")

    UPLOAD_DIR: Path = WRITABLE_DIR / "uploads"
    DATA_DIR: Path = Path(__file__).resolve().parents[1] / "data"


settings = Settings()
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
