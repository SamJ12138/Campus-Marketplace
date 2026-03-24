FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libmagic1 \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Create non-root user
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

CMD ["sh", "-c", "python scripts/pre_migrate_check.py && alembic upgrade head || echo 'WARN: pre-migration check failed or migrations failed, starting app anyway'; exec uvicorn app.main:app --host 0.0.0.0 --port 8000"]
