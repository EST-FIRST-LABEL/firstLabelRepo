# FIRST LABEL 백엔드 — FastAPI + PaddleOCR
# Hugging Face Spaces(Docker SDK) 기준. 다른 호스트에 올릴 때도 그대로 쓸 수 있다.

FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    HOME=/home/user

# opencv / paddle 이 필요로 하는 시스템 라이브러리
RUN apt-get update && apt-get install -y --no-install-recommends \
        libgl1 \
        libglib2.0-0 \
        libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# HF Spaces 는 UID 1000 사용자로 실행된다
RUN useradd -m -u 1000 user
USER user
WORKDIR /home/user/app

# pip이 비루트(user) 설치 시 콘솔 스크립트를 ~/.local/bin 에 넣는데 기본 PATH에 없다.
ENV PATH=/home/user/.local/bin:$PATH

COPY --chown=user:user requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# NOTE: PaddleOCR(paddlepaddle/paddleocr)는 이미지에 넣지 않는다.
# Cloud Run 빌드에서 모델 초기화가 네이티브 크래시(free(): invalid pointer, exit 134)로 실패했고,
# 앱은 OCR 없이도 동작한다(app/services/ocr.py: lazy import → 미설치 시 /api/v1/scan 만 503).
# 이미지 OCR이 필요하면 GOOGLE_VISION_API_KEY 를 설정하면 무거운 의존성 없이 활성화된다.

COPY --chown=user:user . .

# HF Spaces 기본 포트
EXPOSE 8080


# 컨테이너는 한 프로세스만 — NGINX 없이 uvicorn 단독으로 충분하다.
# (HF/Railway 등이 HTTPS 종료와 라우팅을 대신 처리한다)
CMD ["sh", "-c", "python -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}"]