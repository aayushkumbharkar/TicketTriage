# syntax=docker/dockerfile:1
FROM python:3.11-slim

# Prevents Python from writing .pyc files and enables unbuffered stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

WORKDIR /app

# Copy source files to temporary build location
COPY . /tmp/src

# Robustly handle both repository root context and backend/ subfolder context
RUN if [ -f /tmp/src/requirements.txt ]; then \
        cp /tmp/src/requirements.txt /app/requirements.txt && \
        mkdir -p /app/backend && cp -r /tmp/src/* /app/backend/; \
    elif [ -f /tmp/src/backend/requirements.txt ]; then \
        cp /tmp/src/backend/requirements.txt /app/requirements.txt && \
        mkdir -p /app/backend && cp -r /tmp/src/backend/* /app/backend/; \
    fi && \
    pip install --no-cache-dir -r /app/requirements.txt && \
    rm -rf /tmp/src

# SQLite database lives in /data so it can be mounted as a volume
RUN mkdir -p /data
ENV DB_PATH=/data/tickettriage.db

EXPOSE 8000

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
