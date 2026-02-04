# Campus Bulletin Board API

Backend API for a campus bulletin board application that helps college students discover services (tutoring, hair braiding, photography, etc.) and resale items. The platform facilitates discovery and messaging only -- transactions happen offline.

## Tech Stack

- **FastAPI** (Python 3.11+) - Web framework
- **PostgreSQL** with asyncpg - Database
- **Redis** - Caching, rate limiting, job queue
- **SQLAlchemy 2.0** (async) - ORM
- **Alembic** - Database migrations
- **ARQ** - Background job processing
- **MinIO** (S3-compatible) - File storage (local dev)

## Quick Start

### 1. Start infrastructure services

```bash
docker-compose -f docker/docker-compose.yml up -d
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your settings
```

### 3. Install dependencies

```bash
pip install -e ".[dev]"
```

### 4. Run database migrations

```bash
alembic upgrade head
```

### 5. Seed initial data

```bash
python scripts/seed_data.py
```

### 6. Create an admin user

```bash
python scripts/create_admin.py admin@demo.edu AdminPass123 demo
```

### 7. Start the API server

```bash
uvicorn app.main:app --reload
```

### 8. Start the background worker

```bash
arq app.workers.main.WorkerSettings
```

## API Documentation

When running in development mode (`APP_DEBUG=true`), interactive docs are available at:

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Running Tests

```bash
pytest tests/ -v
```

## Project Structure

```
app/
  api/v1/       # Route handlers (auth, users, listings, messages, etc.)
  core/         # Security, permissions, exceptions, rate limiting
  models/       # SQLAlchemy ORM models
  schemas/      # Pydantic request/response schemas
  services/     # Business logic layer
  repositories/ # Data access layer
  workers/      # Background job definitions (ARQ)
tests/
  unit/         # Unit tests
  integration/  # Integration tests
scripts/        # Admin and seed scripts
docker/         # Docker and docker-compose files
alembic/        # Database migration files
```
