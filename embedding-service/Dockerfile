# FIRST LABEL — 문장 임베딩 전용 서비스 (Hugging Face Spaces / Docker)
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    HOME=/home/user

RUN apt-get update && apt-get install -y --no-install-recommends \
        libgomp1 \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -m -u 1000 user
USER user
WORKDIR /home/user/app

COPY --chown=user:user requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 임베딩 모델을 이미지에 미리 굽는다. 없으면 재시작마다 첫 요청이 수 분 걸린다.
RUN python -c "from fastembed import TextEmbedding; TextEmbedding(model_name='sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2')"

COPY --chown=user:user . .

# Cloud Run 등은 컨테이너가 $PORT(기본 8080)로 리슨하길 요구한다. 미설정(로컬/HF)이면 7860.
EXPOSE 7860
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-7860}"]
