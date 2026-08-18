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


def _jwt_secret() -> str:
    """미설정 시 로컬 개발은 기본값 허용, 배포(Vercel/Lambda) 환경은 기동을 막는다.

    이슈 #11: JWT_SECRET 기본값("dev-only-change-me")이 배포 환경에도 조용히
    쓰일 수 있어 토큰 위조가 가능했던 문제.
    """
    v = os.getenv("JWT_SECRET", "")
    if v:
        return v
    if IS_SERVERLESS:
        raise RuntimeError(
            "JWT_SECRET 환경변수가 설정되지 않았습니다. 배포 환경에서는 "
            "기본값(dev-only-change-me)을 사용할 수 없습니다."
        )
    return "dev-only-change-me"


class Settings:
    # DB: Supabase Postgres 커넥션 스트링을 넣으면 그대로 사용, 비어 있으면 로컬 SQLite
    DATABASE_URL: str = os.getenv("DATABASE_URL") or f"sqlite:///{WRITABLE_DIR / 'firstlabel.db'}"

    JWT_SECRET: str = _jwt_secret()
    JWT_EXPIRE_DAYS: int = int(os.getenv("JWT_EXPIRE_DAYS", "14"))

    # 운영자 계정 login_id 목록(쉼표 구분). 비우면 승인(approve) 엔드포인트를 아무도 못 쓴다.
    ADMIN_LOGIN_IDS: list[str] = _csv("ADMIN_LOGIN_IDS")

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

    # 검색 임베딩 우선순위: 원격 임베딩 서비스 > 로컬 fastembed > (없으면 ilike 폴백)
    # 서버리스(Vercel)는 모델 용량·콜드스타트 제약이 있어 원격 서비스로 분리한다.
    EMBEDDING_SERVICE_URL: str = os.getenv("EMBEDDING_SERVICE_URL", "")
    EMBEDDING_API_KEY: str = os.getenv("EMBEDDING_API_KEY", "")

    # CORS_ORIGINS 미설정 시 기본 허용 목록 (프로덕션 프론트 + 로컬 개발).
    CORS_ORIGINS: list[str] = _csv("CORS_ORIGINS") or [
        "https://first-label.vercel.app",
        "https://first-label-app.vercel.app",
        "http://localhost:3000",
        "http://localhost:3002",
    ]
    PUBLIC_BASE_URL: str = os.getenv("PUBLIC_BASE_URL", "http://localhost:8000")

    UPLOAD_DIR: Path = WRITABLE_DIR / "uploads"
    DATA_DIR: Path = Path(__file__).resolve().parents[1] / "data"


settings = Settings()
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
