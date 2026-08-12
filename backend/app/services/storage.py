"""사용자 업로드 이미지 저장. Supabase Storage 우선, 미설정이면 로컬 uploads/."""
import uuid
from functools import lru_cache

from app.core.config import settings


@lru_cache(maxsize=1)
def _client():
    if not (settings.SUPABASE_URL and settings.SUPABASE_SERVICE_KEY):
        return None
    try:
        from supabase import create_client
        return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    except Exception:
        return None


def save_image(data: bytes, filename: str, content_type: str = "image/jpeg") -> str:
    """저장 후 public URL을 돌려준다."""
    ext = (filename.rsplit(".", 1)[-1] if "." in filename else "jpg").lower()[:5]
    key = f"{uuid.uuid4().hex}.{ext}"

    client = _client()
    if client:
        client.storage.from_(settings.SUPABASE_BUCKET).upload(
            key, data, {"content-type": content_type, "upsert": "true"}
        )
        return client.storage.from_(settings.SUPABASE_BUCKET).get_public_url(key)

    (settings.UPLOAD_DIR / key).write_bytes(data)
    return f"{settings.PUBLIC_BASE_URL}/uploads/{key}"
