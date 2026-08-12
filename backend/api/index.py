"""Vercel 서버리스 진입점. FastAPI 앱을 그대로 노출한다."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import app  # noqa: E402,F401
