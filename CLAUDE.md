# CLAUDE.md — Autonomous Agent Instructions for Gettysburg Community (GimmeDat)

## Project Overview
Campus marketplace platform (FastAPI + Next.js 14) for college students to discover services and buy/sell items. Multi-campus, messaging-only (no payments).

## Tech Stack
- **Backend:** FastAPI 0.115 (Python 3.11+), SQLAlchemy 2.0 async, PostgreSQL, Redis, ARQ workers
- **Frontend:** Next.js 14 (App Router), TypeScript 5.7, Tailwind CSS, Zustand, TanStack Query
- **Infra:** Docker Compose (dev), Vercel + Render + Neon + Cloudflare R2 (prod)

## Project Structure
```
bulletin-board-api/       # FastAPI backend
  app/api/v1/             # Route handlers
  app/models/             # SQLAlchemy ORM models
  app/services/           # Business logic
  app/repositories/       # Data access layer
  app/workers/            # Background jobs (ARQ)
  app/core/               # Security, permissions, rate limiting
  schemas/                # Pydantic request/response schemas
  alembic/                # Database migrations
  scripts/                # Seed data, create admin
  tests/                  # Unit + integration tests

bulletin-board-frontend/  # Next.js frontend
  src/app/                # App Router pages
  src/components/         # Reusable React components
  src/lib/                # Hooks, stores, API clients, types, utils
  e2e/                    # Playwright E2E tests

ai-automation/            # AI agent harness files
  tasks.json              # Structured task list (source of truth)
  claude-progress.md      # Session-by-session progress log
  init.sh                 # Environment verification script
  run-dev-loop.sh         # Main loop script for autonomous runs
```

## Session Startup Protocol (MANDATORY)
Every session MUST begin with these steps in order:
1. Run `pwd` to verify working directory
2. Read `ai-automation/claude-progress.md` for prior work history
3. Read `ai-automation/tasks.json` to find the next incomplete task
4. Run `ai-automation/init.sh` to verify environment health
5. Read relevant source files for the chosen task before making changes
6. Only then begin implementation

## Task Selection Rules
- Pick the first task in `tasks.json` where `"status": "pending"` and all `"blockedBy"` tasks have `"status": "completed"`
- Work on exactly ONE task per session
- Never skip tasks unless they are explicitly blocked
- Update the task status to `"in_progress"` when you start, `"completed"` when done

## Development Rules
- Always read a file before editing it
- Run tests after changes: `cd bulletin-board-api && python -m pytest tests/` or `cd bulletin-board-frontend && npm test`
- Run linting: `cd bulletin-board-api && ruff check .` or `cd bulletin-board-frontend && npx eslint .`
- Create a git commit after completing each task with a descriptive message
- Never force-push, never amend existing commits
- Keep changes focused on the current task — no drive-by refactors
- Do not remove or weaken existing tests

## Session End Protocol (MANDATORY)
Before ending every session:
1. Ensure all changes are committed to git
2. Run tests to verify nothing is broken
3. Update the task's `"status"` to `"completed"` in `ai-automation/tasks.json`
4. Append a session summary to `ai-automation/claude-progress.md` with:
   - Date/time
   - Task ID and description
   - What was done
   - Files changed
   - Test results
   - Any issues or blockers for next session
5. Leave the codebase in a clean, main-branch-ready state

## Code Conventions
- Backend: Python type hints, async/await, Pydantic validation, repository pattern
- Frontend: TypeScript strict mode, functional components, Zod validation, React Hook Form
- Naming: snake_case (Python), camelCase (TypeScript), PascalCase (React components)
- Imports: absolute imports preferred

## Key File Locations
- Backend entry: `bulletin-board-api/app/main.py`
- Frontend entry: `bulletin-board-frontend/src/app/layout.tsx`
- Backend config: `bulletin-board-api/app/config.py`
- DB models: `bulletin-board-api/app/models/`
- API routes: `bulletin-board-api/app/api/v1/`
- Frontend API clients: `bulletin-board-frontend/src/lib/api/`
- Frontend components: `bulletin-board-frontend/src/components/`

## Environment
- Backend: `pip install -r requirements.txt` from `bulletin-board-api/`
- Frontend: `npm install` from `bulletin-board-frontend/`
- Database: PostgreSQL via Docker (`docker-compose up db redis`)
- Use `.env.example` as template for `.env` files

## It is UNACCEPTABLE to:
- Remove or weaken existing tests
- Leave half-finished features uncommitted
- Skip reading progress files at session start
- Work on more than one task per session
- Push to remote without explicit user instruction
- Modify this CLAUDE.md file without user approval
