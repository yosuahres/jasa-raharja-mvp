# Build context: extractor/ (docker-compose sets context: extractor)
FROM python:3.14-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

COPY requirements.txt ./
RUN pip install -r requirements.txt

COPY app/ ./app/

# SUPABASE_URL and SUPABASE_SECRET_KEY come from the host (env_file), never from a layer.
RUN useradd --system --uid 10001 --no-create-home worker
USER worker

# The dashboard's wake call (app/wake.py).
EXPOSE 8080

CMD ["python", "-m", "app.worker"]
