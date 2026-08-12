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

COPY --chown=user:user requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir "numpy<2" paddlepaddle==2.6.2 paddleocr==2.9.1

# 한글 OCR 모델을 이미지에 미리 구워둔다.
# 이 단계가 없으면 컨테이너가 재시작될 때마다 첫 요청이 30~60초 걸린다.
RUN python -c "from paddleocr import PaddleOCR; PaddleOCR(use_angle_cls=True, lang='korean', show_log=False)"

COPY --chown=user:user . .

# HF Spaces 기본 포트
EXPOSE 7860

# 컨테이너는 한 프로세스만 — NGINX 없이 uvicorn 단독으로 충분하다.
# (HF/Railway 등이 HTTPS 종료와 라우팅을 대신 처리한다)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
