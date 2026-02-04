# Gettysburg Community - Campus Bulletin Board

A full-stack campus bulletin board application for college students to discover services (tutoring, photography, etc.) and buy/sell items. No payment processing — discovery and messaging only.

## Project Structure

```
Gettysburg Comunity/
├── bulletin-board-api/      # FastAPI backend (Python 3.11+)
├── bulletin-board-frontend/  # Next.js 14 frontend (TypeScript)
├── docker-compose.yml        # Unified orchestration
├── .env.example              # Environment variable reference
├── index.html                # Standalone demo (open in browser)
└── README.md
```

## Tech Stack

| Layer      | Technology                                      |
| ---------- | ----------------------------------------------- |
| Backend    | FastAPI, SQLAlchemy 2.0, PostgreSQL, Redis, ARQ |
| Frontend   | Next.js 14, TanStack Query, Zustand, Tailwind   |
| Storage    | S3-compatible (MinIO for local dev)              |
| Email      | Console logger (dev) / SendGrid (prod)           |
| Auth       | JWT access + refresh token rotation              |

## Quick Start

### Option 1: Docker (full stack)

```bash
# 1. Copy env file
cp .env.example bulletin-board-api/.env

# 2. Start everything
docker compose up -d

# 3. Run migrations
docker compose exec api alembic upgrade head

# 4. Seed categories
docker compose exec api python -m scripts.seed_data

# Visit http://localhost:3000
```

### Option 2: Local development

**Prerequisites:** Python 3.11+, Node.js 18+, PostgreSQL 16, Redis 7

```bash
# Start infrastructure only
docker compose up -d db redis minio mailhog

# ── Backend ──
cd bulletin-board-api
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
cp ../.env.example .env
alembic upgrade head
python -m scripts.seed_data
uvicorn app.main:app --reload --port 8000

# ── Frontend (new terminal) ──
cd bulletin-board-frontend
npm install
npm run dev
```

### Option 3: Static demo

Open `index.html` in any browser for a standalone preview with mock data. No server or build step required.

## Useful URLs (local dev)

| Service         | URL                      |
| --------------- | ------------------------ |
| Frontend        | http://localhost:3000     |
| API docs        | http://localhost:8000/docs|
| MailHog inbox   | http://localhost:8025     |
| MinIO console   | http://localhost:9001     |

## Running Tests

```bash
# Backend unit + integration tests
cd bulletin-board-api
pytest

# Frontend unit tests
cd bulletin-board-frontend
npm test

# Frontend E2E tests (requires running dev server)
npm run test:e2e
```
