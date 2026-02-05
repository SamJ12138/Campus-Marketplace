# Phase 1: Project Discovery & Architecture Analysis

**Project:** Gimme Dat (Campus Bulletin Board)
**Date:** 2026-02-05
**Status:** COMPLETE

---

## 1. Project Architecture Overview

### Frontend (`bulletin-board-frontend/`)
- **Framework:** Next.js 14.2.21 (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS with CSS variables theming
- **State Management:**
  - Zustand for client state
  - React Query (@tanstack/react-query) for server state
- **Validation:** Zod schemas
- **Authentication:** JWT with refresh tokens (stored in cookies)

### Backend (`bulletin-board-api/`)
- **Framework:** FastAPI 0.115.0
- **Language:** Python 3.11+
- **Database:** PostgreSQL with asyncpg driver
- **ORM:** SQLAlchemy 2.0 (async)
- **Cache/Queue:** Redis + ARQ for background jobs
- **Storage:** S3-compatible (MinIO locally, Cloudflare R2/AWS S3 in prod)
- **Email:** Resend (production), console (development)

### Route Structure
```
Frontend:
├── (main)/           # Main app pages (feed, listings, messages, profile)
├── (auth)/           # Authentication pages (login, register, verify)
├── (admin)/          # Admin dashboard (hidden)
├── (landing)/        # SEO landing pages (services, locations)

Backend API:
└── /api/v1/
    ├── /auth         # Authentication endpoints
    ├── /users        # User management
    ├── /listings     # CRUD for listings
    ├── /messages     # Messaging system
    ├── /photos       # Photo uploads
    └── /admin        # Admin endpoints
```

---

## 2. Security Vulnerabilities

### CRITICAL - Frontend (Next.js 14.2.21)

| Vulnerability | Severity | CVE/Advisory |
|--------------|----------|--------------|
| Information exposure in dev server | HIGH | GHSA-gp8f-8m3g-qvj9 |
| Cache key confusion | HIGH | GHSA-g77x-44xx-532m |
| SSRF via middleware redirect | HIGH | GHSA-7m27-7ghc-44w9 |
| Content injection | HIGH | GHSA-f82v-jwr5-mffw |
| Race condition cache poisoning | HIGH | GHSA-7gfc-8cq8-jh5f |
| Authorization bypass (CVE-2024-34351) | HIGH | CVE-2024-34351 |
| Server actions DoS | MODERATE | Multiple |
| Total vulnerabilities | **10** | 8 high, 2 moderate |

**Recommended Action:** Upgrade Next.js from 14.2.21 to 15.x (latest: 16.1.6)

### MODERATE - Backend (Python Dependencies)

| Package | Current | Issue |
|---------|---------|-------|
| python-jose | 3.3.0 | Unmaintained library; consider migrating to PyJWT |
| passlib | 1.7.4 | No longer actively maintained (last release 2020) |
| boto3 | 1.34.131 | Outdated (current: 1.35+) |

### Positive Security Findings
- Docker containers run as non-root user (`appuser`)
- JWT secrets have minimum length validation (32 chars)
- Rate limiting implemented for login, listings, and messages
- New account restrictions (first 7 days: reduced limits)
- CORS configured for frontend URL only
- Pydantic v2 validation on all inputs

---

## 3. Dependency Audit

### Frontend Outdated Packages (npm outdated)

| Package | Current | Wanted | Latest |
|---------|---------|--------|--------|
| next | 14.2.21 | 14.2.28 | **16.1.6** |
| eslint | 8.57.1 | 8.57.1 | **9.20.0** |
| @types/node | 20.17.17 | 20.17.17 | **22.13.1** |
| @types/react | 18.3.18 | 18.3.18 | **19.0.8** |
| typescript | 5.7.3 | 5.7.3 | **5.8.2** |

**Total outdated:** 21 packages (5 major version updates)

### Backend Packages (requirements.txt)

| Package | Version | Status |
|---------|---------|--------|
| fastapi | 0.115.0 | ✅ Recent |
| uvicorn | 0.30.6 | ✅ Good |
| pydantic | 2.9.2 | ✅ Good |
| sqlalchemy | 2.0.35 | ✅ Good |
| asyncpg | 0.29.0 | ✅ Good |
| pillow | 10.4.0 | ⚠️ Check CVEs |
| python-jose | 3.3.0 | ⚠️ Unmaintained |
| passlib | 1.7.4 | ⚠️ Unmaintained |
| boto3 | 1.34.131 | ⚠️ Outdated |

---

## 4. Environment Configuration Analysis

### Required Environment Variables

**Backend (12 required, 8 optional):**
```
# Required
APP_SECRET_KEY         (min 32 chars)
DATABASE_URL           (PostgreSQL connection string)
JWT_SECRET_KEY         (min 32 chars)
S3_ACCESS_KEY_ID
S3_SECRET_ACCESS_KEY
S3_BUCKET_NAME
CDN_URL

# Optional with defaults
APP_ENV                (default: development)
APP_DEBUG              (default: false)
REDIS_URL              (default: redis://localhost:6379/0)
EMAIL_PROVIDER         (default: console)
RESEND_API_KEY         (required if email_provider=resend)
SENTRY_DSN
```

**Frontend (1 required):**
```
NEXT_PUBLIC_API_URL    (Backend API URL)
```

### Configuration Issues Found

1. **`.env.local` is incomplete** - `NEXT_PUBLIC_API_URL` is empty
2. **No production .env template** - Missing cloud-specific examples
3. **Resend API key** - Listed in config but not in .env.example

---

## 5. Docker Configuration

### Frontend Dockerfile
- Base: `node:18-alpine`
- Build: Multi-stage with `standalone` output
- Security: Non-root user in production stage
- Health: No healthcheck configured

### Backend Dockerfile
- Base: `python:3.11-slim`
- Security: Non-root user (`appuser`)
- System deps: `libmagic1` for file type detection
- Health: No healthcheck configured

### Worker Dockerfile
- Same base and security as API
- Command: `arq app.workers.main.WorkerSettings`

---

## 6. Build & Type Safety

### Frontend Build Status
```
✅ TypeScript compilation: PASS
✅ Next.js build: PASS (standalone mode)
⚠️ ESLint: 15+ warnings (unused variables, any types)
```

### Backend Type Safety
- Pydantic models for request/response validation
- SQLAlchemy models with proper type hints
- mypy in dev dependencies

---

## 7. SEO Implementation Status

| Feature | Status |
|---------|--------|
| Meta tags (title, description) | ✅ Complete |
| Open Graph tags | ✅ Complete |
| Twitter cards | ✅ Complete |
| Canonical URLs | ✅ Complete |
| JSON-LD schemas | ✅ Complete |
| Sitemap (static + dynamic) | ✅ Complete |
| robots.txt | ✅ Complete |
| Landing pages (8 services, 2 locations) | ✅ Complete |
| Image optimization (WebP/AVIF) | ✅ Configured |

---

## 8. Recommendations Summary

### Immediate (P0)
1. **Upgrade Next.js** to v15 or v16 to fix 10 security vulnerabilities
2. **Set `NEXT_PUBLIC_API_URL`** in frontend `.env.local`
3. **Add Docker healthchecks** for all containers

### Short-term (P1)
4. **Replace python-jose** with PyJWT
5. **Update boto3** to latest version
6. **Create production .env templates** for each cloud provider
7. **Fix ESLint warnings** in frontend

### Long-term (P2)
8. **Consider passlib migration** to argon2-cffi
9. **Add monitoring** (Sentry DSN configuration)
10. **Implement CI/CD pipelines** with security scanning

---

## Next Steps

Proceeding to **Phase 2: Functionality Testing** to verify:
- API endpoint functionality
- Authentication flows
- Database migrations
- Redis connectivity
- File upload/download
- Email sending
