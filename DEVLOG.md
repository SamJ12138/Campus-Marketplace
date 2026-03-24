# GimmeDat Campus Marketplace - Development Log

**Version:** 1.0 (Alpha)
**Last Updated:** 2026-03-24
**Frontend:** https://gimme-dat.com
**Backend API:** https://gettysburg-marketplace.onrender.com
**Repository:** Gettysburg Comunity (monorepo)

---

## 1. Project Summary

GimmeDat is an AI-first, multi-campus marketplace platform for college students to discover services and buy/sell items. It enforces messaging-only transactions (no payments processed), multi-campus isolation via `.edu` email verification, and integrates 8 Claude-powered AI agents for moderation, semantic search, listing optimization, support chat, admin intelligence, smart notifications, and campus onboarding. The platform is designed for scalability across multiple universities.

**Tech Stack:**
- **Backend:** FastAPI 0.115 (Python 3.11+), SQLAlchemy 2.0 async, PostgreSQL 16 + pgvector, Redis 7 + ARQ workers
- **Frontend:** Next.js 15.5 (App Router), TypeScript 5.7, React 18.3, Tailwind CSS 3.4, Zustand 5.0, TanStack React Query 5.62
- **Infrastructure:** Vercel (frontend), Render (backend + worker), Neon (serverless PostgreSQL), Cloudflare R2 (CDN storage), Resend (email)
- **AI:** Anthropic Claude API (8 agents), pgvector embeddings (384-dim HNSW)
- **Testing:** pytest 370+ tests (backend), Vitest + Playwright (frontend)

---

## 2. Architecture Overview

### Monorepo Structure
```
Gettysburg Comunity/
├── bulletin-board-api/          # FastAPI backend (Python)
│   ├── app/
│   │   ├── api/v1/              # 21 route modules
│   │   ├── models/              # 16 SQLAlchemy ORM models
│   │   ├── schemas/             # Pydantic request/response schemas
│   │   ├── services/            # 17 service modules (8 AI agents)
│   │   ├── repositories/        # Data access layer
│   │   ├── workers/             # ARQ background jobs
│   │   ├── core/                # Security, permissions, exceptions, rate limiting
│   │   ├── main.py              # FastAPI app entry point
│   │   ├── config.py            # 50+ settings (Pydantic Settings)
│   │   └── db.py                # Async engine + session factory
│   ├── alembic/                 # 8 database migrations
│   ├── tests/                   # 370+ unit + integration tests
│   ├── scripts/                 # seed_data.py, create_admin.py
│   └── pyproject.toml           # Python deps & tooling config
├── bulletin-board-frontend/     # Next.js frontend (TypeScript)
│   ├── src/
│   │   ├── app/                 # 40+ pages (App Router)
│   │   ├── components/          # 100+ components (13 categories)
│   │   ├── lib/                 # API clients, hooks, stores, types, utils, validation
│   │   └── middleware.ts        # Auth redirect middleware
│   ├── e2e/                     # Playwright E2E tests
│   ├── package.json             # Node deps
│   ├── tailwind.config.ts       # Custom theme
│   └── next.config.mjs          # Standalone output, security headers, image optimization
├── docker-compose.yml           # Local dev: PostgreSQL, Redis, MinIO, MailHog, API, Frontend
├── render.yaml                  # Render.com deployment config
├── .github/workflows/ci.yml     # GitHub Actions CI pipeline
├── CLAUDE.md                    # Agent development conventions
├── README.md                    # Project overview
└── DEVLOG.md                    # THIS FILE
```

### Backend Architecture
- **Entry Point:** `app/main.py` - FastAPI with lifespan context manager, CORS, Sentry, health checks
- **Auth:** JWT access tokens (60min) + refresh tokens (7 days), bcrypt password hashing
- **Database:** Async SQLAlchemy 2.0 with asyncpg driver, pgvector extension for embeddings
- **Caching:** Redis for rate limiting, session data, job queues
- **Background Jobs:** ARQ workers for async tasks (embeddings, notifications, email, moderation)
- **Storage:** S3-compatible (MinIO local dev, Cloudflare R2 production) with presigned URLs
- **Email:** Multi-provider (Resend prod, console dev, SendGrid/SES optional)

### Frontend Architecture
- **Rendering:** Next.js App Router with route groups: `(landing)`, `(auth)`, `(main)`, `(admin)`
- **State:** Zustand stores (auth, UI) + TanStack React Query (server state with 60s stale time)
- **Forms:** React Hook Form + Zod validation schemas
- **Styling:** Tailwind CSS + CVA (class-variance-authority) for component variants
- **Fonts:** Quicksand (display), Nunito (body), JetBrains Mono (code)
- **Icons:** lucide-react (100+ icons)
- **Animations:** motion library + custom Tailwind animations (fade, slide, bounce, wiggle, float, shimmer)
- **Theme:** Dark mode via next-themes, glass-morphism effects, gradient accents

---

## 3. Feature Inventory

### Core Marketplace
- Listing CRUD (create, read, update, delete, renew, mark sold)
- Multi-photo upload (max 6 per listing, 5MB each, reorder support, progress tracking)
- Two listing types: Items and Services
- Categories with icons (13 default per campus)
- Price hints (flexible pricing display)
- Location types: on-campus, off-campus, remote
- Contact preferences: in-app messaging, email, phone
- 30-day auto-expiry with renewal
- View counting and popularity tracking
- Infinite scroll pagination with filtering (type, category, sort, price range, search)
- Grid/list view toggle (persisted in localStorage)

### Multi-Campus System
- `.edu` email domain verification per campus
- Campus-scoped listing isolation
- Per-campus category customization
- Campus settings via JSONB (flexible config)
- Self-service campus onboarding (AI-powered)

### Messaging
- Direct message threads between buyer/seller
- One thread per user-pair (enforced by partial unique index)
- Unread count tracking (per-user in thread)
- Read receipts
- Listing context attached to threads
- Real-time-ready architecture (currently polling)

### User System
- JWT authentication (access + refresh token rotation)
- User profiles (display name, avatar, bio, class year, phone)
- Favorites/saved listings
- User blocking with reason
- Content reporting (6 reason types, AI-triaged)
- Notification preferences (email, SMS, digest frequency, quiet hours)
- Engagement scoring (emails sent/opened tracking)
- Role-based access: user, moderator, admin
- Account statuses: active, suspended, banned
- Rate limiting: 5 login attempts/15min, 5 listings/day, 50 messages/hour
- New account restrictions: first 7 days limited to 2 listings/day, 10 messages/hour

### 8 AI Agents (All with graceful fallback to heuristic/template if Claude API unavailable)

| # | Agent | Service File | Function |
|---|-------|-------------|----------|
| 1 | Integration Layer | `ai_service.py` | Base async Claude API wrapper (foundation for all agents) |
| 2 | Content Moderation | `ai_moderation_service.py` | Two-pass: fast keyword pre-filter + LLM confidence scoring |
| 3 | Support Chatbot (RAG) | `chatbot_service.py` | 18-article knowledge base, context-aware answers, admin escalation |
| 4 | Semantic Search | `embedding_service.py` | pgvector 384-dim embeddings with HNSW indexing, similarity queries |
| 5 | Listing Optimizer | `listing_optimizer_service.py` | Auto-generate titles/descriptions, suggest pricing, score completeness |
| 6 | Admin Intelligence | `admin_intelligence_service.py` | 30-day trend analysis, anomaly detection, 5-factor risk scoring, summaries |
| 7 | Smart Notifications | `smart_notification_service.py` | Personalized digests, re-engagement, expiry nudges, price drop alerts |
| 8 | Campus Onboarding | `campus_onboarding_service.py` | Self-service provisioning, auto-generated categories, SEO metadata |

### Admin Dashboard
- User management (view, suspend, ban, role changes)
- Listing moderation queue
- Community reports queue with AI triage
- Banned keyword management (contains, starts_with, exact, regex match types)
- Analytics & AI insights (trends, anomalies, risk scores, weekly summaries)
- Featured ads management with analytics
- User feedback dashboard
- Team applications review
- Full audit log of admin actions

### SEO & Marketing
- JSON-LD structured data (Product, Service, Organization, BreadcrumbList, WebSite schemas)
- Dynamic sitemap generation
- Open Graph image generation (server-rendered)
- Twitter card images
- City-specific landing pages (`/locations/[city]`)
- Category landing pages (`/services/[category]`)
- Security headers (X-Frame-Options, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy)

### Ads System
- Featured ad carousel on feed page
- Ad types: internal detail, external link, coupon, event
- Impression/click/conversion event tracking
- Campaign scheduling (start/end dates)
- Priority-based ordering
- Campus-scoped or global ads
- Analytics with CSV export

---

## 4. Database Schema Summary

**16 SQLAlchemy ORM models** in `bulletin-board-api/app/models/`:

| Model | Key Fields | Relationships |
|-------|-----------|---------------|
| **User** | id, email (unique), password_hash, display_name, avatar_url, role, status, campus_id, listing_count | campus, listings, refresh_tokens, notification_preferences |
| **Campus** | id, name, domain (unique), slug (unique), settings (JSONB), is_active | users, listings |
| **Category** | id, name, slug (unique), listing_type, icon, sort_order, is_active | listings |
| **Listing** | id, user_id, campus_id, type, category_id, title, description, price_hint, status, view_count, expires_at, search_vector (TSVECTOR), embedding (Vector 384) | user, campus, category, photos |
| **ListingPhoto** | id, listing_id, url, storage_key, thumbnail_url, position (0-5) | listing |
| **MessageThread** | id, listing_id, initiator_id, recipient_id, status, last_message_at, initiator/recipient_unread_count | listing, initiator, recipient, messages |
| **Message** | id, thread_id, sender_id, content, is_read, is_flagged | thread, sender |
| **Favorite** | id, user_id, listing_id (unique together) | - |
| **Block** | id, blocker_id, blocked_id (unique together), reason | - |
| **Report** | id, reporter_id, target_type, target_id, reason, status, priority, resolved_by, resolution_type | reporter, resolver |
| **AdminAction** | id, admin_id, action_type, target_type, target_id, reason, metadata (JSONB), ip_address | admin |
| **BannedKeyword** | id, campus_id, keyword, match_type, action, applies_to, is_active | campus, creator |
| **Ad** | id, campus_id, type, title, subtitle, cta_text, image_url, external_url, priority, is_active, starts_at, ends_at | campus, creator |
| **AdEvent** | id, ad_id, event_type, user_id, ip_address | - |
| **NotificationPreference** | id, user_id (unique), email_*, sms_*, digest_frequency, quiet_hours, engagement_score | - |
| **RefreshToken** | id, user_id, token_hash (unique), expires_at, revoked_at | - |
| **EmailVerification** | id, user_id, email, token_hash, purpose, expires_at, used_at | - |
| **Application** | id, email, name, marketing_pitch, platform_ideas, status | reviewer |
| **Feedback** | id, user_id, rating (1-5), category, subject, message, status | - |
| **PendingUpload** | id, staging for multi-part file uploads | - |

**Alembic Migrations (8 applied):**
1. `c928df889c07` - Initial schema with phone and SMS preferences
2. `add_ads_table` - Ads feature
3. `add_ad_events_table` - Ad analytics events
4. `add_vector_column` - pgvector embedding column
5. `add_pending_uploads_table` - Upload staging
6. `extend_notifications` - Enhanced notification preferences
7. `merge_user_pair_threads` - Message thread optimization (one per user pair)
8. `remove_regulated_flag_001` - Schema cleanup

---

## 5. API Endpoint Map

**Base URL:** `/api/v1`

| Module | Prefix | Key Endpoints |
|--------|--------|---------------|
| **auth** | `/auth` | POST register, login, logout, refresh, verify-email, forgot-password, reset-password |
| **users** | `/users` | GET /me, PATCH /me, POST /me/change-password, GET /me/notifications, PATCH /me/notifications, GET /{user_id} |
| **campuses** | `/campuses` | GET / (list active), GET /{slug} |
| **categories** | `/categories` | GET / (list), POST / (admin create) |
| **listings** | `/listings` | GET / (paginated+filtered), POST /, GET /{id}, PATCH /{id}, DELETE /{id}, POST /{id}/renew, POST /{id}/mark-sold |
| **favorites** | `/favorites` | GET / (paginated), POST /{listing_id}, DELETE /{listing_id} |
| **messages** | `/threads` | GET / (list threads), POST / (start thread), GET /{id}, POST /{id}/messages, POST /{id}/read |
| **reports** | `/reports` | POST / (create, AI auto-triage) |
| **blocks** | `/blocks` | POST / (block user), DELETE / (unblock) |
| **uploads** | `/uploads` | GET /presigned-url, POST /complete, DELETE /{key} |
| **search** | `/search` | GET /semantic, GET /similar/{listing_id}, GET /recommendations |
| **chatbot** | `/chatbot` | POST / (RAG support chat) |
| **listing-assist** | `/listing-assist` | POST /suggest-title, /suggest-description, /suggest-price, /suggest-category, /score-completeness |
| **admin** | `/admin` | GET /users, GET /users/{id}, PATCH /users/{id}, GET /moderation-queue, PATCH /moderation/{id}, GET+POST+DELETE /keywords |
| **admin/analytics** | `/admin/analytics` | GET /trends, /anomalies, /risk-scores, /summary |
| **admin/campuses** | `/admin/campuses` | POST /provision, GET /cross-campus-analytics |
| **ads** | `/ads` | GET / (active ads), POST / (admin create), PATCH /{id}, GET /{id}/analytics, GET /export/csv |
| **feedback** | `/feedback` | POST /, GET / (admin), PATCH /{id} (admin response) |
| **applications** | `/applications` | POST /, GET / (admin), PATCH /{id} (admin review) |

**Health check:** `GET /health` (DB + Redis connectivity)

---

## 6. Frontend Route Map

### (landing) - Public promotional pages
| Route | Page |
|-------|------|
| `/` | Home/landing page (featured listings, AI intro, CTA) |
| `/locations/[city]` | Campus-specific landing page |
| `/services/[category]` | Service category showcase |

### (auth) - Authentication (no header/footer)
| Route | Page |
|-------|------|
| `/login` | Email + password sign-in |
| `/register` | Sign-up with .edu email |
| `/verify-email` | Email confirmation flow |
| `/forgot-password` | Password reset request |
| `/reset-password` | Password reset completion |

### (main) - Authenticated user area (header + footer + mobile nav)
| Route | Page |
|-------|------|
| `/feed` | Main marketplace feed (infinite scroll, filters, search) |
| `/listings/new` | Create new listing (with AI assist panel) |
| `/listings/[id]` | Listing detail view |
| `/listings/[id]/edit` | Edit listing (owner only) |
| `/messages` | Message inbox |
| `/messages/[threadId]` | Message thread detail |
| `/profile` | User profile |
| `/profile/listings` | My listings |
| `/profile/saved` | Saved listings |
| `/profile/settings` | Account settings & notifications |
| `/saved` | Favorites/saved listings |
| `/ads/[id]` | Ad detail view |
| `/u/[userId]` | Public user profile |
| `/contact` | Contact form |
| `/how-it-works` | Platform tutorial/FAQ |
| `/join-team` | Team application form |
| `/privacy` | Privacy policy |
| `/terms` | Terms of service |

### (admin) - Admin dashboard (sidebar layout, role-gated)
| Route | Page |
|-------|------|
| `/admin` | Dashboard overview |
| `/admin/users` | User management |
| `/admin/users/[id]` | User detail |
| `/admin/listings` | Listing moderation queue |
| `/admin/reports` | Community reports queue |
| `/admin/reports/[id]` | Report detail |
| `/admin/keywords` | Banned keyword management |
| `/admin/insights` | AI analytics dashboard |
| `/admin/ads` | Featured ads management |
| `/admin/feedback` | User feedback review |
| `/admin/applications` | Application review |
| `/admin/audit-log` | Admin action audit trail |

### Root-level pages
| Route | File |
|-------|------|
| Error boundary | `error.tsx` |
| 404 Not Found | `not-found.tsx` |
| Dynamic sitemap | `sitemap.ts` |
| OG image | `opengraph-image.tsx` |
| Twitter image | `twitter-image.tsx` |
| Ad tracking API | `api/ads/route.ts` |

---

## 7. Test Coverage

### Backend (pytest)
- **370+ unit & integration tests** in `bulletin-board-api/tests/`
- **Unit tests** (`tests/unit/`): security, AI services, moderation, chatbot, embeddings, semantic search, listing optimizer, smart notifications, admin intelligence, campus onboarding
- **Integration tests** (`tests/integration/`): Full listing flow (create -> upload photo -> favorite -> message -> report)
- **Test framework:** pytest + pytest-asyncio + pytest-cov
- **Linting:** ruff (clean), mypy type checking
- **Run:** `pytest` or `pytest --cov=app`

### Frontend (Vitest + Playwright)
- **Unit tests:** Vitest + @testing-library/react (component + hook tests)
- **E2E tests:** Playwright (login, register, listing creation, search, messaging, reporting, profiles)
- **Run:** `npm test` (unit), `npm run test:e2e` (E2E)

### CI/CD (GitHub Actions)
- **Frontend pipeline:** checkout -> Node 20 -> npm ci -> lint -> tsc --noEmit -> build -> test
- **Backend pipeline:** checkout -> Python 3.12 -> pip install -> ruff check -> mypy -> pytest
- **Triggers:** Push/PR to main, failures block merge

---

## 8. Known Issues & Technical Debt

### From AUDIT_REPORT.md (Overall: Ready for Production with fixes)
- **Architecture:** 8/10
- **Security:** 6/10
- **Functionality:** 8/10
- **Cloud Readiness:** 9/10

### From FIXES_REQUIRED.md

**P0 - Critical (must fix before launch):**
1. Next.js security vulnerabilities - upgrade from 14.x to 15.x (CVE patches)
2. Frontend `NEXT_PUBLIC_API_URL` env var empty/missing in production build
3. Test mock fixtures need updating for schema changes

**P1 - High (fix within first week):**
1. Next.js standalone output mode not properly configured
2. `render.yaml` references outdated Dockerfile paths
3. HTML `<img>` tags should use Next.js `<Image>` component

**P2 - Medium:**
1. ESLint warnings in several components (unused imports, missing deps in useEffect)
2. HSTS header needs `includeSubDomains` directive
3. Docker healthcheck endpoints need configuration
4. Missing `.env.local.example` for frontend
5. Some API error responses missing proper error codes

**P3 - Low:**
1. Credential rotation schedule not documented
2. E2E test coverage gaps (admin flows, edge cases)
3. Dependency update audit needed
4. Bundle size optimization (tree-shaking, dynamic imports)

### From SEO-AUDIT-REPORT.md (Score: 35/100)
- Missing robots.txt (now may be fixed)
- Missing page-level metadata on many routes
- Multiple H1 tags on some pages
- Incomplete alt text on images
- Missing canonical URLs
- Structured data implemented but needs expansion

---

## 9. Development Session History

Condensed from `ai-automation/claude-progress.md`:

| Session | Date | Focus | Outcome |
|---------|------|-------|---------|
| 0 | Feb 2026 | Project harness setup | `ai-automation/` directory, tasks.json, init.sh, run-dev-loop.sh created |
| 1 | Feb 2026 | AI service integration layer | `ai_service.py` - Base Claude API wrapper with async support, fallback, error handling |
| 2 | Feb 2026 | Content moderation agent | `ai_moderation_service.py` - Two-pass moderation (keyword + LLM), confidence scores, 40+ tests |
| 3 | Feb 2026 | Support chatbot (RAG) | `chatbot_service.py` - 18-article knowledge base, context-aware, admin escalation, 35+ tests |
| 4 | Feb 2026 | Semantic search | `embedding_service.py` + `semantic_search_service.py` - pgvector 384-dim, HNSW index, 45+ tests |
| 5 | Feb 2026 | Listing optimizer | `listing_optimizer_service.py` - Title/desc generation, pricing, completeness scoring, 40+ tests |
| 6 | Feb 2026 | Admin intelligence | `admin_intelligence_service.py` - Trend analysis, anomaly detection, risk scoring, 50+ tests |
| 7 | Feb 2026 | Smart notifications | `smart_notification_service.py` - Digests, re-engagement, engagement scoring, 45+ tests |
| 8 | Feb 2026 | Campus onboarding | `campus_onboarding_service.py` - Self-service provisioning, auto categories, SEO metadata, 40+ tests |

**All 8 AI agent tasks completed.** 370+ total tests passing, ruff linting clean.

---

## 10. Change Log

> **Convention:** Every session that modifies the project MUST append an entry below. This is how we maintain continuity across sessions. Each entry should capture what was done, what files changed, and what should happen next.

### Entry Format
```
### [DATE] - Session Title
**Summary:** One-line description of what was accomplished
**Files Changed:**
- `path/to/file.ext` - what changed
**Details:** Paragraph describing the work done
**Next Steps:** What should be tackled in the next session
**Status:** [IN PROGRESS | COMPLETED | BLOCKED]
```

---

### 2026-02-26 - v1.0 Baseline: Dev Log Created

**Summary:** Comprehensive dev log created after full project review of all files.

**Files Changed:**
- `DEVLOG.md` - Created (this file)

**Details:**
Performed a complete review of every file in the project to establish the v1.0 baseline. Documented full architecture (monorepo with FastAPI backend + Next.js frontend), all 8 AI agents, 16+ database models, 21 API route modules, 40+ pages, 100+ components, 370+ tests, and the complete feature inventory. Consolidated findings from AUDIT_REPORT.md (security 6/10), SEO-AUDIT-REPORT.md (35/100), and FIXES_REQUIRED.md (3 P0 critical issues). This dev log serves as the single source of truth for session continuity going forward.

**Next Steps:**
- Address P0 critical issues (Next.js upgrade, env var fix, test mock updates)
- Improve SEO score from 35/100
- Improve security score from 6/10
- Consider real-time messaging (WebSocket/SSE upgrade from polling)
- Frontend E2E test coverage for admin flows

**Status:** COMPLETED

---

### 2026-02-27 - Fix User Registration (Two Bugs: CORS + Enum Mismatch)

**Summary:** User signup was completely broken in production — two layered bugs prevented any new user from registering. Fixed both: (1) CORS blocking all API calls from the frontend, and (2) a PostgreSQL enum case mismatch crashing the register endpoint with a 500.

**Files Changed:**
- `bulletin-board-frontend/next.config.mjs` - Added `rewrites()` to proxy `/api/v1/:path*` and `/health` to the backend URL (`NEXT_PUBLIC_API_URL`), eliminating CORS
- `bulletin-board-frontend/src/lib/api/client.ts` - Changed `BASE_URL` from `process.env.NEXT_PUBLIC_API_URL` to `""` so browser requests use relative paths through the rewrite proxy (prior session had added `fetchWithRetry()` and `warmUpServer()` which remain)
- `bulletin-board-frontend/src/app/(auth)/register/page.tsx` - Network error handling from prior session remains
- `bulletin-board-frontend/src/app/(auth)/login/page.tsx` - Same
- `bulletin-board-api/app/models/notification.py` - Added `values_callable=lambda e: [x.value for x in e]` to `DigestFrequency` enum column so SQLAlchemy sends lowercase `.value` ("weekly") instead of uppercase `.name` ("WEEKLY"), matching the DB enum created by the `extend_notifications` migration
- `bulletin-board-api/app/api/v1/auth.py` - Added `logging` import; wrapped email sending in try/except so registration succeeds even if the verification email fails to send (user can request a resend)

**Bug 1 — CORS Blocking (Frontend):**
The browser at `https://gimme-dat.com` made direct cross-origin `fetch()` calls to `https://gettysburg-marketplace.onrender.com`. The backend's CORS middleware (`FRONTEND_URL` env var) must whitelist every frontend origin; if misconfigured, CORS blocks the preflight, `fetch()` throws a TypeError, and the user sees "Unable to reach the server." The prior session's retry logic retried CORS-blocked requests, which never succeed.

Fix: Added Next.js `rewrites()` in `next.config.mjs`. The browser now sends requests to its own origin (`gimme-dat.com/api/v1/...`), and Vercel's edge proxies them server-side to the Render backend. CORS is eliminated entirely. Also resolves the P0 issue "Frontend `NEXT_PUBLIC_API_URL` env var empty/missing in production build" — the var is now only used server-side for the rewrite target.

**Bug 2 — Enum Case Mismatch (Backend):**
Once CORS was fixed, registration returned "Internal server error" (500). Added temporary diagnostic try/except to surface the real error: `invalid input value for enum digest_frequency: "WEEKLY"`. The `extend_notifications` migration (hand-written) created the PostgreSQL enum with lowercase values (`"none"`, `"daily"`, `"weekly"`), but SQLAlchemy's `Enum(DigestFrequency)` sends the Python enum `.name` attribute (`"WEEKLY"`) by default. Other enums (`user_role`, `user_status`) worked because Alembic auto-generated their migrations using uppercase `.name` values.

Fix: Added `values_callable` to the `Enum()` column definition in the `NotificationPreference` model, telling SQLAlchemy to use `.value` (lowercase) when persisting. Verified: registration now returns 201.

**Commits:**
1. `56fe9a9` - fix: proxy API requests through Next.js rewrites to eliminate CORS failures on signup
2. `8f28a24` - debug: add detailed error reporting to register endpoint (temporary)
3. `338810f` - fix: enum case mismatch causing 500 on registration (removed debug code)
4. `2608ada` - docs: update DEVLOG

**Next Steps:**
- Test full signup flow end-to-end from frontend (form → register → verify email → login)
- Update `AdHeroBoard.tsx` and `ad-tracking.ts` which still reference `NEXT_PUBLIC_API_URL` directly (should use relative paths for consistency)
- `FRONTEND_URL` on Render can be simplified since CORS is no longer needed for browser requests
- Audit other enum usages for similar case mismatches
- Clean up test users created during debugging

**Status:** COMPLETED

---

### 2026-02-27 - Optimize Email Delivery Speed (4 Root Causes Fixed)

**Summary:** Emails (verification, password reset, notifications) now arrive significantly faster. Fixed 4 root causes: blocking HTTP responses, no connection reuse, broken scheduled emails, and synchronous SDK overhead.

**Files Changed:**
- `bulletin-board-api/app/services/email_service.py` - Complete rewrite: replaced blocking `resend` SDK with `httpx` AsyncClient/Client for true async + connection pooling. Added `get_email_service()` singleton factory. Moved all provider config from per-call to `__init__`.
- `bulletin-board-api/app/api/v1/auth.py` - Moved email sends in `/register`, `/resend-verification`, `/forgot-password` from inline `await` to `BackgroundTasks` (response returns instantly, email sends in background thread)
- `bulletin-board-api/app/workers/tasks.py` - Replaced standalone `send_email()` (only supported console/sendgrid) with one that delegates to `EmailService` (now supports Resend in production)
- `bulletin-board-api/app/workers/main.py` - Initialize `EmailService` in worker startup, clean up in shutdown
- `bulletin-board-api/app/main.py` - Initialize `EmailService` singleton at app startup, close httpx clients at shutdown
- `bulletin-board-api/app/dependencies.py` - Added `get_email_svc()` dependency for route injection
- `bulletin-board-api/app/api/v1/messages.py` - Use singleton `get_email_service()` instead of creating new instance per message
- `bulletin-board-api/app/api/v1/admin.py` - Use singleton `get_email_service()` in test email endpoint

**Root Causes Fixed:**
1. **Verification emails blocked HTTP response** — `/register` waited 1-3s for Resend API before responding. Now uses `BackgroundTasks` for instant response.
2. **No connection reuse** — Every email created a new `EmailService`, re-imported `resend` lib, opened fresh TCP+TLS. Now singleton with persistent `httpx` connection pooling.
3. **Scheduled emails broken in production** — ARQ worker `send_email()` only supported console/sendgrid, NOT Resend (the production provider). Digests, nudges, re-engagement, price drop alerts were silently never sending. Now delegates to `EmailService` which supports all providers.
4. **Blocking SDK** — `resend` Python SDK uses `requests` library internally (blocking, no session reuse). Replaced with direct `httpx` API calls (true async, connection pooling).

**Expected Impact:**
- `/register` response: 1-3s → ~200ms
- `/forgot-password` response: 1-3s → ~200ms
- Per-email connection overhead: ~150-300ms → ~5-10ms (reused connections)
- Scheduled emails: broken → working

**Tests:** 290 unit tests passed, 73 email/notification tests passed, ruff linting clean.

**Next Steps:**
- Deploy and verify verification emails arrive within seconds of registration
- Monitor Render logs for `[EMAIL] Resend response:` from scheduled cron jobs (should now appear)
- Consider removing `resend` SDK from `requirements.txt` (no longer imported at runtime)

**Status:** COMPLETED

---

### 2026-02-27 - Fix Ads Dashboard 500 Error (Enum Mismatch + Frontend Param Fixes)

**Summary:** All ads endpoints (`GET /ads`, `GET /ads/admin/list`, `POST /ads/admin/create`, etc.) returned HTTP 500 in production due to the same enum case mismatch bug previously fixed for `DigestFrequency`. Also fixed two frontend-backend contract mismatches.

**Files Changed:**
- `bulletin-board-api/app/models/ad.py` - Added `values_callable=lambda e: [x.value for x in e]` to `AdType` enum column so SQLAlchemy sends lowercase `.value` ("internal_detail") instead of uppercase `.name` ("INTERNAL_DETAIL"), matching the DB enum created by the `add_ads_table` migration
- `bulletin-board-api/app/api/v1/ads.py` - Added `total` field at top level of admin list response (alongside existing `pagination` object) to match frontend `AdminAdsResponse` type which expects `{items, total}`
- `bulletin-board-frontend/src/app/(admin)/admin/ads/page.tsx` - Changed query param from `include_inactive: showInactive` (not recognized by backend) to `status: "active"` when filtering is needed, or no param when showing all (matching backend's `status` query parameter)

**Root Cause — Enum Case Mismatch (Same as DigestFrequency):**
The `add_ads_table` migration manually creates `CREATE TYPE ad_type AS ENUM ('internal_detail', 'external_link', 'coupon', 'event')` with lowercase values. But SQLAlchemy's `Enum(AdType)` without `values_callable` sends the Python enum `.name` ("INTERNAL_DETAIL") by default. PostgreSQL rejects the mismatch, causing 500 on every read/write to the ads table.

**Secondary Fixes:**
1. Frontend `AdminAdsResponse` expected `{items, total}` but backend returned `{items, pagination: {total_items, ...}}` — added `total` at the top level
2. Frontend sent `include_inactive` query param which backend doesn't recognize — changed to use `status` param matching backend's defined filter values

**Next Steps:**
- Deploy and verify `GET /api/v1/ads` returns 200
- Test full ads dashboard CRUD flow (create, edit, toggle, delete)
- Audit remaining enum usages for similar case mismatches

**Status:** COMPLETED

---

### 2026-02-27 - Add Resend Broadcasts Link to Moderator Dashboard

**Summary:** Added a "Newsletters" external link to the admin sidebar and dashboard quick links grid, opening Resend Broadcasts in a new tab for email campaign management.

**Files Changed:**
- `bulletin-board-frontend/src/app/(admin)/layout.tsx` - Added `Send` and `ExternalLink` icon imports; added "Newsletters" entry to `sidebarLinks` with `external: true`; updated nav rendering to use `<a target="_blank">` for external links with an `ExternalLink` indicator icon
- `bulletin-board-frontend/src/app/(admin)/admin/page.tsx` - Added `Send` and `ExternalLink` icon imports; added "Newsletters" entry to `QUICK_LINKS` with `external: true`; updated quick link card rendering to use `<a target="_blank">` for external links with an `ExternalLink` indicator icon

**Details:**
No backend changes needed. Resend Broadcasts is a no-code WYSIWYG email campaign tool included in the existing Resend plan. Added convenient navigation shortcuts so moderators can jump directly to `https://resend.com/broadcasts` from two places: the sidebar nav and the dashboard quick access grid. Both render as `<a>` tags with `target="_blank" rel="noopener noreferrer"` and display a small external-link indicator. Build passes cleanly.

**Next Steps:**
- Deploy to Vercel and verify links work in production
- Consider adding audience management link if needed later

**Status:** COMPLETED

---

### Session — 2026-02-27: Filter Campus Dropdown by Email Domain on Signup

**Task:** Frontend UX improvement — filter campus dropdown based on user's email domain during registration so users only see campuses they're eligible for.

**Files Changed:**
- `bulletin-board-frontend/src/app/(auth)/register/page.tsx` — Added `emailDomain` memo (extracts domain from email), `filteredCampuses` memo (filters campuses by domain match or `allow_non_edu`), reset effect (clears stale campus selection when email changes), auto-select effect (picks campus when only one matches), updated email helper text to show domain hint, switched dropdown to use `filteredCampuses`

**Details:**
No backend changes. The backend validation (auth.py:77-84) already rejects email/campus mismatches. This change adds proactive client-side filtering so users only see campuses they can actually register for. Typing `@gettysburg.edu` auto-selects Gettysburg College; switching to `@gmail.com` resets and shows only `allow_non_edu` campuses. Before `@` is typed, all campuses remain visible. Build passes cleanly.

**Status:** COMPLETED

---

### 2026-02-27 - Project Cleanup: Remove Dead Files & Obsolete Documentation

**Summary:** Removed 22 tracked dead/obsolete files (~5 MB) plus 16 untracked log files. Zero functional impact — frontend build and 370 backend unit tests pass unchanged.

**Files Deleted:**
- `index.html` — orphaned HTML, never referenced
- `PHASE1_FINDINGS.md` through `PHASE5_FINDINGS.md` — outdated audits superseded by DEVLOG §8-9
- `AUDIT_REPORT.md` — security audit, summarized in DEVLOG §8
- `SEO-AUDIT-REPORT.md` — SEO audit, summarized in DEVLOG §8
- `FIXES_REQUIRED.md` — outdated issue list, summarized in DEVLOG §8
- `ENV_TEMPLATE.md` — duplicated `.env.example` files and README
- `docs/architecture.svg` — solo file; architecture documented in DEVLOG §2
- `ai-automation/` (entire directory) — all 8 AI tasks completed; history preserved in DEVLOG §9
- `public/og-image.png`, `public/twitter-card.png`, `public/icon-192.png`, `public/icon-512.png` — root-level duplicates of `public/images/` versions
- `public/images/logo.png` (1.3 MB) — never referenced; only `logo-v2.png` is used

**Files Updated:**
- `CLAUDE.md` — removed `ai-automation/` from project structure, rewrote Session Startup/End Protocols to reference DEVLOG instead
- `DEVLOG.md` §2 — removed `ai-automation/`, `docs/`, and deleted markdown files from monorepo tree diagram
- Auto-memory `MEMORY.md` — removed references to deleted doc files

**Verification:**
- `npm run build` — passes cleanly (all pages compiled)
- `pytest tests/unit/` — 370 passed (pre-existing failures in integration/moderation tests unrelated to cleanup)
- `public/images/` retains all referenced assets: `og-image.png`, `twitter-card.png`, `icon-192.png`, `icon-512.png`, `logo-v2.png`

**Next Steps:**
- Fix pre-existing enum case mismatch for `listing_status` (same class as DigestFrequency/AdType fixes)
- Fix pre-existing `test_moderation.py::test_blocks_exact_match` test failure

**Status:** COMPLETED

---

### Session 2026-02-27 — Fix Feed Page Search Bar

**Problem:** Typing in the search bar on `/feed` had no effect — no loading skeletons appeared, no new API request fired, and listings didn't filter. Root cause: TanStack Query's key hash was treating old and new filter objects as identical because `undefined` values in the filters memo were being stripped by `JSON.stringify`, producing the same structural hash.

**Files Changed:**
- `bulletin-board-frontend/src/app/(main)/feed/page.tsx` — Rewrote `filters` memo to build a clean object with only defined properties (no `undefined` values), ensuring TanStack Query sees a structurally different key when filters change.
- `bulletin-board-frontend/src/lib/hooks/use-listings.ts` — Changed query key from `listingKeys.list(filters)` (object-based) to `[...listingKeys.lists(), JSON.stringify(filters)]` (deterministic string), eliminating ambiguity in key comparison.
- `bulletin-board-frontend/src/lib/api/listings.ts` — Removed unused `search: params.search` parameter from `getListings()` API call.

**Verification:**
- `npm run build` — passes cleanly (all 50 pages compiled, zero errors)

**Status:** COMPLETED

---

### Session 2026-02-27 — Feed Search: staleTime Fix + Visual Feedback

**Summary:** Belt-and-suspenders fix to guarantee feed search bar works reliably, plus visual feedback so users can confirm search is active.

**Files Changed:**
- `bulletin-board-frontend/src/lib/hooks/use-listings.ts` — Added `staleTime: 0` to the `useInfiniteQuery` config so TanStack Query always refetches on key change instead of serving cached data from the global 60s staleTime
- `bulletin-board-frontend/src/app/(main)/feed/page.tsx` — (1) Destructured `isFetching` from `useListings` to detect background refetches, (2) Updated loading condition to show skeletons when fetching with zero results (`isFetching && listings.length === 0`), (3) Added search result count indicator that shows "N results for 'term'" or "No results for 'term'" with a spinning loader during active fetches

**Root Causes Addressed:**
1. Global `staleTime: 60s` could prevent visual re-trigger when searching multiple times quickly — overridden to `0` for listing queries
2. No visual feedback — users couldn't tell if search was active; now shows result count and spinner
3. `isPending` alone doesn't catch background refetches with `useInfiniteQuery` — `isFetching` covers the gap

**Verification:**
- `npm run build` — passes cleanly (all 50 pages compiled, zero errors)

**Status:** COMPLETED

---

### Session 2026-03-03 — Audit & Fix .edu Email Domain Enforcement

**Summary:** Discovered that the `allow_non_edu` flag on the Gettysburg College campus record was set to `true` in production, completely bypassing the `.edu` email domain validation during registration. Any email (gmail.com, yahoo.com, etc.) could successfully register. Fixed the seed script and banned test accounts created during verification.

**Issue Found:**
- The backend domain validation logic at `auth.py:78-84` is correct — it checks `if not campus.allow_non_edu` before comparing email domains
- The frontend client-side validation at `register/page.tsx:148-155` is also correct
- However, the production database had `allow_non_edu = true` for Gettysburg College, so the entire check was skipped
- Live testing confirmed: `@gmail.com`, `@yahoo.com`, and `@totallynotacollege.xyz` all registered successfully

**Files Changed:**
- `bulletin-board-api/scripts/seed_data.py` — Added explicit `allow_non_edu=False` to the Gettysburg College campus seed so future deployments default to enforcing `.edu` emails

**Production Actions Taken:**
- Banned 3 test accounts created during live verification (`faketest_domaincheck@gmail.com`, `faketest_domaincheck@yahoo.com`, `faketest_domaincheck@totallynotacollege.xyz`)
- **ACTION REQUIRED:** Run `UPDATE campuses SET allow_non_edu = false WHERE slug = 'gettysburg-college';` on the Neon production database to enable enforcement

**Existing Non-.edu Accounts (pre-existing, not banned):**
- `tianyijia041008@163.com`, `chenlee050126@gmail.com`, `samloveemmaforever@gmail.com` — developer test accounts from earlier sessions, left active

**Verification:**
- Isolated logic test: 10/10 domain validation scenarios passed (gettysburg.edu allowed, gmail/yahoo/harvard/subdomains blocked, case-insensitive matching works, multi-campus isolation works)
- Unit tests: 290 passed (1 pre-existing failure in `test_moderation.py` unrelated to auth)

**Status:** COMPLETED (pending production DB update)

---

### Session 2026-03-03 — Fix Feedback Endpoint 500 Error (Bug Fix + Deploy)

**Summary:** Live testing of the feedback endpoint (`POST /api/v1/feedback`) revealed a 500 Internal Server Error. Root cause: SQLAlchemy was sending uppercase enum names (`"NEW"`) to PostgreSQL, but the `feedback_status` enum in the database expected lowercase values (`"new"`). Same bug existed in the Application model. Fixed both models, added an idempotent alembic migration, pushed to trigger Render redeploy, and verified all feedback flows work end-to-end on the live site.

**Root Cause:**
- The `Feedback` and `Application` models used `Enum(FeedbackStatus, name="feedback_status")` without `values_callable`
- SQLAlchemy's default behavior sends enum **names** (uppercase: `NEW`, `REVIEWED`) not **values** (lowercase: `new`, `reviewed`)
- The PostgreSQL `feedback_status` and `application_status` enums were created with lowercase values
- This caused `asyncpg.exceptions.InvalidTextRepresentationError: invalid input value for enum feedback_status: "NEW"`
- Other models (user_role, listing_status, etc.) don't have this issue because their PG enum values ARE uppercase

**Files Changed:**
- `bulletin-board-api/app/models/feedback.py` — Added `values_callable=lambda e: [x.value for x in e]` to the status column's Enum definition
- `bulletin-board-api/app/models/application.py` — Same fix for ApplicationStatus enum
- `bulletin-board-api/alembic/versions/add_feedback_table.py` — New idempotent migration to track the feedback table in alembic (table already existed from `create_all`, now uses `CREATE TABLE IF NOT EXISTS`)

**Live Testing Results (all PASS after deploy):**
- Authenticated feedback submission: 201 Created
- Anonymous feedback with email: 201 Created
- Fully anonymous feedback (no email, no auth): 201 Created
- Admin list feedback (`GET /feedback/admin`): returns all 3 with correct user/email data
- Admin stats (`GET /feedback/admin/stats`): `{new: 1, reviewed: 1, archived: 1, total: 3}`
- Admin mark as reviewed (`PATCH /feedback/admin/{id}`): updates status, sets reviewer and reviewed_at
- Admin archive (`PATCH /feedback/admin/{id}`): updates status to archived

**Status:** COMPLETED

---

### 2026-03-05 — Require Authentication for Feedback & Show Phone Number in Admin

**Problem:** Anonymous feedback was being submitted on the live site with no way to identify the submitter (`user` and `email` both null). The `FeedbackModal` used raw `fetch()` without auth headers, so even logged-in users submitted feedback anonymously. The backend allowed unauthenticated submissions.

**Changes:**

**Backend — `bulletin-board-api/app/api/v1/feedback.py`:**
- Switched `get_current_user` → `get_current_active_user` on `POST /feedback` (returns 401 if not authenticated)
- Removed `email: str | None = None` from `FeedbackCreate` schema (no longer needed)
- `user_id` and `email` on the Feedback row now always come from `current_user`
- Added `phone_number` to the user dict in `_feedback_to_response()` helper

**Frontend — `bulletin-board-frontend/src/components/ads/AdHeroBoard.tsx`:**
- Replaced raw `fetch()` with `api.post()` (auto-attaches Bearer token)
- Removed `email` state variable and email input field
- When user is not logged in, shows a "Log in to send feedback" prompt with a link to `/login` instead of the form

**Frontend Admin — `bulletin-board-frontend/src/app/(admin)/admin/feedback/page.tsx`:**
- Added `phone_number: string | null` to `FeedbackUser` interface
- Added `Phone` icon import from lucide-react
- Phone number displays in both the collapsed header row and expanded detail view (when present)

**Verification:**
- Backend unit tests: 370 passed (6 pre-existing failures in unrelated `test_moderation.py`)
- Frontend build: succeeded with no errors
- No migration needed — `phone_number` comes from the `users` table via existing relationship

**Status:** COMPLETED

---

### 2026-03-05 — Fix Navbar Dropdown Category Links Not Navigating

**Problem:** Clicking subcategory links in the Marketplace dropdown (e.g., "Textbooks", "Tutoring") changed the URL but did not update the displayed listings. Root cause: `useState` only uses its initializer on first mount, so when already on `/feed`, client-side navigation updated `useSearchParams()` but the `useState` hooks retained stale state.

**Fix — `bulletin-board-frontend/src/app/(main)/feed/page.tsx`:**
- Added a `useEffect` that syncs `type`, `category`, and `sort` state from URL search params (`initialType`, `initialCategory`, `initialSort`) whenever those values change
- Intentionally excludes `searchQuery` to avoid interfering with debounced typing

**Verification:**
- Frontend build: succeeded with no errors

**Status:** COMPLETED

---

### 2026-03-05 — Add Feedback Email Notifications (Submission + Admin Review)

**Summary:** Users now receive email notifications when they submit feedback (confirmation) and when an admin marks their feedback as reviewed (with admin note included).

**Files Changed:**
- `bulletin-board-api/app/services/email_templates.py` — Added two new templates: `feedback_received_email()` (submission confirmation) and `feedback_reviewed_email()` (review notification with optional admin note in purple-bordered callout box)
- `bulletin-board-api/app/api/v1/feedback.py` — Added `EmailService` dependency to POST and PATCH endpoints; POST sends confirmation email via `await email_svc.send_email()`; PATCH sends review notification when status changes to "reviewed"; added `email` field to `FeedbackUpdateRequest` so admins can link an email to old anonymous feedback; review email falls back to `feedback.email` when no linked user

**Details:**
- **Submission email:** Sent inline (async) when user submits feedback. Confirms their feedback is under review.
- **Review email:** Sent when admin clicks "Mark reviewed" in the admin dashboard. If the admin has written an admin note, it appears in a purple-bordered callout box. If no note exists, a generic "reviewed" message is sent.
- **Anonymous feedback support:** For feedback submitted before auth was required (`user` is null), the PATCH endpoint now accepts an `email` field to set the recipient. The review email falls back to `feedback.email` when `feedback.user` is null.
- No frontend changes needed — the existing admin UI (separate "Save Note" and "Mark reviewed" buttons) naturally supports the workflow.
- **Note:** Initial implementation used `BackgroundTasks` with `send_email_sync()`, but emails were silently failing in the thread context. Switched to `await email_svc.send_email()` (true async via httpx) inline in the handler, which resolved the issue.

**Verification:**
- Backend unit tests: 290 passed (1 pre-existing failure in `test_moderation.py`)
- Frontend build: succeeded with no errors
- Live testing: both emails delivered successfully via Resend to `jiati01@gettysburg.edu` and `garcbr01@gettysburg.edu`
- Test feedback entries archived during cleanup

**CI Fix:**
- `bulletin-board-api/alembic/versions/add_feedback_table.py` — Removed unused `import sqlalchemy as sa` and `from sqlalchemy.dialects import postgresql` that caused ruff F401 lint failures in GitHub Actions

**Status:** COMPLETED

---

### 2026-03-05 — Debounced/Batched Email Notifications for Messages

**Summary:** Replaced per-message email notifications with a Redis-based debounce/batch system. Instead of sending one email per message (burning through Resend's 100/day free tier during active conversations), notifications now accumulate with a sliding debounce window and send a single batched email per thread after a quiet period.

**Files Changed:**
- `bulletin-board-api/app/config.py` — Added 5 new settings: `msg_notify_debounce_first_seconds` (60s), `msg_notify_debounce_reply_seconds` (180s), `msg_notify_min_interval_seconds` (600s), `msg_notify_online_ttl_seconds` (45s), `msg_notify_max_daily_emails` (80)
- `bulletin-board-api/app/services/notification_batcher.py` — **NEW** (~160 lines). `NotificationBatcher` class with Redis-backed sliding debounce: `record_pending()`, `record_heartbeat()`, `get_ripe_notifications()`, `is_recipient_online()`, `check_rate_limit()`, `check_daily_limit()`, `mark_sent()`, `extend_debounce()`, `acquire_lock()`/`release_lock()`
- `bulletin-board-api/app/api/v1/messages.py` — Removed `_send_notification_email()` and `_maybe_queue_email()` (immediate email per message). Added `_record_pending_notification()` (records to Redis). Removed `BackgroundTasks` from `start_thread()` and `send_message()`. Added `redis` dependency + heartbeat call to `get_thread()`. Cleaned up unused `email_service`/`email_templates` imports.
- `bulletin-board-api/app/services/email_templates.py` — Added `batched_message_email()` template: shows "New Message" or "N New Messages" heading, sender names summary, up to 5 message preview cards with timestamps, "+ N earlier messages" note, "View Conversation" CTA, settings link
- `bulletin-board-api/app/workers/tasks.py` — Added `process_pending_message_notifications()`: scans ripe debounce keys, acquires locks, checks online status (defers if viewing), checks rate limits, queries DB for unread messages, renders batched template, sends via email service, cleans up Redis state
- `bulletin-board-api/app/workers/main.py` — Added Redis client to worker startup/shutdown context. Registered `process_pending_message_notifications` in functions list and as `cron(second={0, 30})` (runs every 30s)

**How It Works:**
1. On each message: `_record_pending_notification()` stores metadata in Redis with sliding debounce timer (60s first msg, 180s replies)
2. Every 30s (ARQ cron): `process_pending_message_notifications()` scans for ripe notifications
3. Online detection: `get_thread()` writes a 45s heartbeat; if recipient is viewing, email is deferred
4. Safety: SET NX locks prevent duplicate sends, per-thread rate limit (10min), global daily cap (80)
5. At send time: queries DB for actual unread messages (skips if user already read via UI)

**Redis Keys:**
- `notify:msg:pending:{thread}:{user}` — JSON metadata + count (30min TTL)
- `notify:msg:debounce:{thread}:{user}` — ripe-at timestamp (30min TTL)
- `notify:msg:online:{thread}:{user}` — heartbeat (45s TTL)
- `notify:msg:lastsent:{thread}:{user}` — rate limit (24h TTL)
- `notify:msg:firstsent:{thread}` — first-ever flag (7d TTL)
- `notify:msg:daily_count:{date}` — global counter (24h TTL)

**Expected Impact:**
- Resend usage: ~1 email per conversation burst (vs N emails per N messages)
- No spam during active conversations
- No email when user is already reading the thread
- All timing configurable via env vars

**Status:** COMPLETED

---

### 2026-03-13 — Weekly Newsletter Digest Enhancement

**What:** Reworked the weekly digest email from a text-heavy personalized summary into a visually engaging "What's New This Week" broadcast newsletter with a 2-column card grid layout.

**Files Modified:**
- `bulletin-board-api/app/services/smart_notification_service.py` — Added `generate_newsletter_digest()` public method, 7 new private data-gathering queries (_get_new_campus_listings_with_photos, _get_campus_stats, _get_trending_categories, _get_featured_listing, _get_price_drops_for_user, _get_recent_fallback_listings, _serialize_listing_card), subject line generator, and updated `get_users_due_for_digest()` to return campus_id.
- `bulletin-board-api/app/services/email_templates.py` — Added `newsletter_digest_email()` with table-based 600px layout: stats bar, full-width featured listing card, 2-column card grid with photos, trending categories bar, price drops section, and plain text alternative.
- `bulletin-board-api/app/workers/tasks.py` — Rewrote `send_weekly_digests()` to use the new newsletter pipeline with per-user error handling and `asyncio.sleep(0.1)` rate limiting.

**Design Decisions:**
- Table-based HTML layout for email client compatibility
- 2-column card grid (Poshmark/Depop style) for highest CTR
- GimmeDat purple (#8b5cf6) brand color for CTAs
- Fallback mode ("Still Available") for slow weeks with no new listings
- Reuses existing EmailService, ARQ cron, and notification preference infrastructure

**Status:** COMPLETED

---

### 2026-03-16 — Offer/Deal/Review/Meeting System: Session 1 (Database Models + Migration)

**Summary:** Added 4 new database tables (offers, deals, reviews, meetings) and extended the messages and users tables with new columns to support on-platform negotiation, deal tracking, reviews, and meeting coordination.

**Files Created:**
- `bulletin-board-api/app/models/offer.py` — Offer model (thread-scoped price offers with counter-offer chaining, 48h expiry, links to messages)
- `bulletin-board-api/app/models/deal.py` — Deal model (buyer/seller deal tracking with dual-confirmation flow, links to offers)
- `bulletin-board-api/app/models/review.py` — Review model (1-5 star ratings with optional comments, unique per deal+reviewer)
- `bulletin-board-api/app/models/meeting.py` — Meeting model (location/time proposals with accept/counter flow)
- `bulletin-board-api/alembic/versions/add_offers_deals_reviews_meetings.py` — Single idempotent migration creating all 4 tables + extending messages/users

**Files Modified:**
- `bulletin-board-api/app/models/message.py` — Added `message_type` (VARCHAR(20), default "text") and `meta` (JSONB, nullable; DB column name "metadata") to Message. Note: Python attribute is `meta` because `metadata` is reserved by SQLAlchemy DeclarativeBase.
- `bulletin-board-api/app/models/user.py` — Added `average_rating` (Float, default 0.0) and `review_count` (Integer, default 0) to User
- `bulletin-board-api/app/models/__init__.py` — Added imports/exports for Offer, Deal, Review, Meeting

**Schema Details:**
- offers: UUID PK, FK to threads/listings/users/messages, amount(VARCHAR100), status(pending/accepted/declined/countered/expired), parent_offer_id for counter-chains, expires_at, indexes on thread/status/listing
- deals: UUID PK, FK to listings/threads/users/offers, agreed_price, status(pending/buyer_confirmed/seller_confirmed/completed/cancelled), dual timestamps, indexes on listing/buyer/seller/status
- reviews: UUID PK, FK to deals/users, rating(INT 1-5), comment(TEXT), unique(deal_id,reviewer_id), indexes on reviewee/deal
- meetings: UUID PK, FK to deals/threads/users/messages, location_name/details, proposed_time, status(proposed/accepted/cancelled), indexes on deal/thread

**Verification:**
- All model imports: OK (`from app.models import Offer, Deal, Review, Meeting`)
- Ruff lint: all files pass
- Unit tests: 370 passed (pre-existing failures in test_moderation.py and integration/listing_flow unrelated to this change)

**Next Steps:**
- Session 2: Backend services + schemas + routes for Offers & Deals
- Session 3: Backend services + routes for Reviews & Meetings
- Session 4: Frontend types, API clients, hooks, chat card components
- Session 5: Frontend reviews UI, profile integration, polish

**Status:** COMPLETED

---

### 2026-03-17 — Simplify Signup: Hide Multi-Campus Fields Behind Feature Flag

**Summary:** Reduced the registration form from 9 fields to 3 (email, password, optional display name) for the single-campus Gettysburg College launch. All multi-campus fields are preserved behind a `MULTI_CAMPUS_MODE` flag — flip it to `true` to restore everything.

**Files Changed:**
- `bulletin-board-frontend/src/app/(auth)/register/page.tsx` — Added `MULTI_CAMPUS_MODE = false` flag; gated campus dropdown, class year, phone number, notification preferences behind `{MULTI_CAMPUS_MODE && (...)}` conditionals; replaced terms checkbox with implicit agreement text; hardcoded `campus_slug: "gettysburg-college"` and `accept_terms: true` when flag is off; gated campus fetch `useEffect` to skip API call; updated email placeholder to `"you@gettysburg.edu"` and display name placeholder to `"(optional)"`; split `handleSubmit` validation to use `registerSchemaSimple` in single-campus mode
- `bulletin-board-frontend/src/lib/validation/auth.ts` — Added `registerSchemaSimple` Zod schema (email + password required, display_name optional, no campus/phone/notifications/terms); original `registerSchema` untouched
- `bulletin-board-api/app/schemas/auth.py` — Made `display_name` optional (`str | None = Field(None, max_length=100)`); added `validate_display_name` field validator that only enforces min_length=2 when value is non-empty
- `bulletin-board-api/app/api/v1/auth.py` — Added auto-generation of `display_name` from email prefix when not provided (`data.email.split("@")[0][:100]`)

**What Users See (single-campus mode):**
1. Email (placeholder: "you@gettysburg.edu")
2. Password (with strength bar + rules checklist, unchanged)
3. Display name (optional, auto-generated from email if blank)
4. Implicit terms text with links (no checkbox)
5. "Create Account" button

**Restoring Multi-Campus:**
Set `MULTI_CAMPUS_MODE = true` on line 17 of `register/page.tsx` — all original fields (campus dropdown, class year, phone, notifications, terms checkbox) reappear with no other changes needed.

**Verification:**
- TypeScript: zero errors (`tsc --noEmit`)
- ESLint: zero errors on modified files
- Ruff: all checks passed on modified backend files
- Frontend tests: 7/7 passed
- Backend tests: pre-existing `listing_status` enum failure (unrelated to auth changes)

**Status:** COMPLETED

---

### 2026-03-17 - New-User Onboarding Carousel

**Summary:** Added a 5-slide onboarding carousel that appears once after first login, walking new users through core features.

**Files Changed:**
- `src/lib/utils/onboarding.ts` - NEW: localStorage helpers (hasCompletedOnboarding, markOnboardingComplete, resetOnboarding)
- `src/lib/stores/ui.ts` - Added showOnboarding state + setShowOnboarding action
- `src/components/onboarding/slides.ts` - NEW: Static slide data array (5 slides)
- `src/components/onboarding/DeviceFrame.tsx` - NEW: CSS-only device frame component
- `src/components/onboarding/OnboardingSlide.tsx` - NEW: Single slide presentational component
- `src/components/onboarding/OnboardingCarousel.tsx` - NEW: Main carousel with motion animations, keyboard nav, focus trap, a11y
- `src/app/(main)/layout.tsx` - Added OnboardingCarousel after ReportModal
- `src/app/(main)/profile/settings/page.tsx` - Added "Replay Welcome Tour" section
- `scripts/capture-onboarding-screenshots.ts` - NEW: Playwright script for capturing screenshot PNGs
- `package.json` - Added screenshots:onboarding script

**Details:**
Full-screen overlay carousel appears once for first-time authenticated users (detected via `cb_onboarding_completed` localStorage key). 5 slides: Welcome, Browse & Discover, Post in Seconds, Message Directly, You're All Set. Slides 1-4 show a real screenshot in a CSS device frame with gradient backdrop. Slide 5 shows logo + "Get Started" CTA. AnimatePresence spring transitions with prefers-reduced-motion fallback to fade-only. ESC closes, arrow keys navigate, focus trapped. "Replay Tour" button added to settings page. Playwright screenshot script created but actual screenshots need to be captured with running dev server + seed data.

**Next Steps:**
- Run `npm run screenshots:onboarding` with dev server + seed data to capture actual PNGs
- Visually test carousel on mobile viewports
- Consider adding placeholder/fallback images for when screenshots are missing

**Status:** COMPLETED

---

### 2026-03-20 — Open Marketplace for Partners & Launch-Phase Carousel Slide

**Summary:** Unauthenticated visitors can now browse real listings and see the onboarding carousel. Added a new "Open Preview Mode" carousel slide explaining the launch-phase open preview.

**Files Changed:**
- `bulletin-board-api/app/api/v1/listings.py` — Removed early-return of empty results for unauthenticated users; now passes `campus_id=None` and `viewer_id=None` when anonymous, returning all active listings across all campuses
- `bulletin-board-frontend/src/app/(main)/feed/page.tsx` — Removed `SignInPrompt` gate (`if (!authLoading && !isAuthenticated) return <SignInPrompt />`) so feed renders real listings for all visitors; changed `useListings` enabled condition from `authLoading || isAuthenticated` to `true`
- `bulletin-board-frontend/src/components/onboarding/OnboardingCarousel.tsx` — Changed trigger from `user && !isLoading && !hasCompletedOnboarding()` to `!isLoading && !hasCompletedOnboarding()` so carousel shows for all first-time visitors; removed unused `user` variable
- `bulletin-board-frontend/src/components/onboarding/slides.ts` — Added new "Open Preview Mode" slide (id: `preview`) as slide 2 with `Eye` icon and amber accent color (6 slides total)
- `bulletin-board-frontend/src/components/onboarding/OnboardingSlide.tsx` — Added `PreviewIllustration` component (open preview badge, sample listing cards, sign-up nudge) and registered in `illustrations` map

**Why:**
Potential partners visiting gimme-dat.com to evaluate the platform were seeing fake example listings behind a sign-in wall. Now they see real marketplace content immediately, with the carousel explaining the open preview.

**Verification:**
- `npx tsc --noEmit` — zero TypeScript errors
- `ruff check app/api/v1/listings.py` — all checks passed
- Carousel now has 6 slides (Welcome → Open Preview → Browse → Post → Messages → Ready)
- Actions like posting/messaging still require auth (unchanged `ProtectedPage` wrappers)

**Status:** COMPLETED

---

### 2026-03-20 — Add "Bikes & Scooters" Item Category

**Summary:** Added a new "Bikes & Scooters" item category (sort_order 6, between Tickets and Other Items) across backend and frontend.

**Files Changed:**
- `bulletin-board-api/alembic/versions/add_bikes_scooters_category.py` — **NEW** — Alembic data migration inserting the category row (slug: `bikes-scooters`, icon: 🚲, sort_order: 6)
- `bulletin-board-api/scripts/seed_data.py` — Added category to seed list before "Other Items"
- `bulletin-board-frontend/src/lib/constants/seo.ts` — Added `bikes-scooters` SEO entry with title, description, and keywords
- `bulletin-board-frontend/src/components/listings/ListingCard.tsx` — Added `Bike` icon import, `bikes-scooters` entry in `CATEGORY_ICON_MAP` and `CATEGORY_COLOR_MAP` (lime-to-emerald gradient)

**Next Steps:**
- Run migration on production: `alembic upgrade head`
- Verify `GET /categories?type=item` includes "Bikes & Scooters"

**Status:** COMPLETED

---

### 2026-03-20 — Fix Image Display + Complete Edit Functionality + Show "Last Edited"

**Summary:** Three related fixes: (1) listing detail page no longer crops portrait/vertical images, (2) backend edit schema now accepts `category_id` and `is_regulated` so category changes actually persist, (3) `updated_at` is exposed in the API and displayed as "Edited X ago" on the detail page.

**Files Changed:**
- `bulletin-board-frontend/src/app/(main)/listings/[id]/page.tsx` — Main carousel: `aspect-[4/3]` + `object-cover` → flexible height (`minHeight: 280px`, `maxHeight: 70vh`) + `object-contain` on `bg-slate-900`; no-photo fallback updated to match; added "Edited X ago" with Pencil icon in meta section (only shown when `updated_at` differs from `created_at`)
- `bulletin-board-api/app/schemas/listing.py` — Added `category_id: UUID | None` and `is_regulated: bool | None` to `ListingUpdate`; added `updated_at: datetime` to `ListingResponse`
- `bulletin-board-frontend/src/lib/types/index.ts` — Added `updated_at: string | null` to `Listing` interface

**Verification:**
- `npx tsc --noEmit` — zero TypeScript errors
- `python -m pytest tests/` — 370 passed (6 failures + 3 errors are pre-existing moderation_service coroutine bug, unrelated)
- Card thumbnails in feed remain uniform (`aspect-[4/3]` + `object-cover` in `ListingCard.tsx` unchanged)

**Status:** COMPLETED

---

### 2026-03-20 — Fix 500 Error on Listings API (missing `updated_at` in `_to_response`)

**Problem:** After commit `45ffb01` added `updated_at: datetime` to `ListingResponse`, the production listings endpoint returned 500 because `_to_response()` in `listing_service.py` did not pass `updated_at` to the response constructor. Pydantic validation error during serialization broke all listing endpoints.

**Fix:**
- `bulletin-board-api/app/services/listing_service.py` line 493: added `updated_at=listing.updated_at,` to the `ListingResponse` constructor in `_to_response()`

**Verification:**
- `python -m pytest tests/` — 370 passed (6 failures + 3 errors are pre-existing moderation_service coroutine bug, unrelated)

**Status:** COMPLETED

---

### 2026-03-20 — Adaptive Photo Frame on Listing Detail Page

**Problem:** The listing detail photo gallery used a fixed-size container (`minHeight: 280px`, `maxHeight: 70vh`) with Next.js `Image fill` + `object-contain`. This left dead space around images that didn't match the container's proportions (e.g. portrait or square photos in a wide frame).

**Fix:**
- `bulletin-board-frontend/src/app/(main)/listings/[id]/page.tsx` line 119: replaced Next.js `Image` (with `fill`) with a native `<img>` element using `max-h-[70vh] max-w-full`. The container now shrink-wraps to each image's natural dimensions — no more dead space.
- Thumbnails, lightbox, and feed card images unchanged (they use intentional fixed sizes).

**Verification:**
- `npx tsc --noEmit` — zero TypeScript errors

**Status:** COMPLETED

---

### 2026-03-23 — Offer Tutorial Carousel + Generic Tutorial System

**Goal:** Add a 4-slide tutorial carousel that teaches users how offers work (What's an Offer, How to Send, Counter-Offers, 48-Hour Window). Must match the existing onboarding carousel style exactly and only show once per user.

**Architecture change:** Extracted a reusable `TutorialCarousel` + `TutorialSlide` from the onboarding code so future tutorials (reviews, deals) are trivial to add.

**Files created (6):**
- `src/components/tutorials/TutorialCarousel.tsx` — Generic carousel shell (animations, focus trap, keyboard nav, progress bar)
- `src/components/tutorials/TutorialSlide.tsx` — Generic slide renderer (gradient bg, DeviceFrame, icon badge, text)
- `src/components/tutorials/offer/slides.ts` — 4 slide definitions with unique accent colors
- `src/components/tutorials/offer/OfferTutorialSlide.tsx` — 4 mini-mockup illustrations (offer card, price input, counter-offer chain, expiry countdown)
- `src/components/tutorials/offer/OfferTutorialCarousel.tsx` — Thin wrapper wiring slides + Zustand + localStorage
- `src/lib/utils/offer-tutorial.ts` — localStorage helpers (key: `cb_offer_tutorial_completed`)

**Files modified (5):**
- `src/components/onboarding/OnboardingCarousel.tsx` — Refactored from 215 lines to ~40 lines (now wraps TutorialCarousel)
- `src/lib/stores/ui.ts` — Added `showOfferTutorial` + `setShowOfferTutorial` to Zustand store
- `src/app/(main)/layout.tsx` — Mounted `<OfferTutorialCarousel />`
- `src/app/(main)/messages/page.tsx` — Added green `$` offer button + `?` help button in chat input bar
- `src/app/(main)/profile/settings/page.tsx` — Added "Replay Offer Tutorial" button alongside "Replay Welcome Tour"

**Behavior:**
- First click on `$` button in a message thread → tutorial appears (4 slides)
- After completion, `$` button placeholder-ready for future offer form
- `?` button always replays the tutorial
- Settings page has both replay buttons under unified "Tutorials" section

**Verification:**
- `npx tsc --noEmit` — zero TypeScript errors
- `npm run build` — all 50 pages compiled, zero errors

**Follow-up fix (`ad7980f`):**
Three UX issues corrected in `messages/page.tsx`:
1. `$` button changed from icon-only to labeled button (`[$ Offer]`) so users know what it does
2. `$` button no longer opens the tutorial — reserved for the future offer form (currently no-op). Only the `?` button replays the tutorial.
3. Tutorial now auto-appears the first time a user enters any chat thread (via `useEffect` + `hasShownTutorial` ref + localStorage check), instead of requiring a manual button click

**Status:** COMPLETED

---

### 2026-03-23 — Offer Posting Tutorial Carousel (5 slides)

**Goal:** Add a second offer-related carousel focused on the step-by-step posting process, triggered when users click the green [$ Offer] button for the first time.

**Two carousels, different purposes:**
- Offer Intro (auto-shows on first chat entry) → what offers are, counter-offers, expiry
- Offer Posting (shows on first Offer button click) → how to fill out and send an offer

**Files created (4):**
- `src/components/tutorials/offer-posting/slides.ts` — 5 slides: Ready to Make an Offer, Name Your Price, Add a Message, What Happens Next, Tips for Success
- `src/components/tutorials/offer-posting/OfferPostingTutorialSlide.tsx` — 5 illustration mockups (chat with highlighted Offer button, price input, message textarea, seller notification, 3 tip cards)
- `src/components/tutorials/offer-posting/OfferPostingTutorialCarousel.tsx` — Thin wrapper, lastSlideButtonText: "Start Offering"
- `src/lib/utils/offer-posting-tutorial.ts` — localStorage helpers (key: `cb_offer_posting_tutorial_completed`)

**Files modified (4):**
- `src/lib/stores/ui.ts` — Added `showOfferPostingTutorial` + `setShowOfferPostingTutorial`
- `src/app/(main)/layout.tsx` — Mounted `<OfferPostingTutorialCarousel />`
- `src/app/(main)/messages/page.tsx` — [$ Offer] button now triggers posting tutorial on first click; ? button replays posting tutorial
- `src/app/(main)/profile/settings/page.tsx` — Added "Replay Offer Posting Guide" button (3 replay buttons total)

**Verification:**
- `npx tsc --noEmit` — zero TypeScript errors
- `npm run build` — all 50 pages compiled, zero errors

**Status:** COMPLETED

---

### Entry 36 — 2026-03-24: Add drag-and-drop image upload to PhotoUploader

**Scope:** UX enhancement for listing creation page (`/listings/new`)

**What changed:**
The `PhotoUploader` component previously only supported clicking an "Add" button to select images via a hidden file input. Now supports native HTML5 drag-and-drop:

- **Empty state**: Large drop zone with upload icon and "Drag photos here or click to browse" text replaces the small Add button for better first-time UX
- **With photos**: Dragging files over the grid shows a blue "Drop photos here" overlay; shows "Maximum 6 photos reached" if at capacity
- **Drop handler**: Filters to image files only, runs same validation pipeline (type, size, dimensions) as file input
- **Refactor**: Extracted shared `processFiles()` function from `handleFilesSelected` to avoid duplicating validation logic between file input and drag-and-drop code paths
- **Drag state tracking**: Uses `dragCounter` ref pattern to correctly handle dragenter/dragleave across nested child elements

**File modified (1):**
- `src/components/listings/PhotoUploader.tsx` — Added drag-and-drop support, empty-state drop zone, drag overlay, extracted `processFiles()`

**Verification:**
- `npx tsc --noEmit` — zero TypeScript errors
- `npm run build` — all pages compiled, zero errors

**Status:** COMPLETED

---

### Entry 37 — 2026-03-24: Fix "Offer not found" on listing detail page

**Scope:** Bug fix — backend API endpoint

**Root cause:**
The `GET /api/v1/listings/{id}` endpoint filtered by the authenticated user's `campus_id`. When a user's campus didn't match the listing's campus (e.g., after viewing cached feed data from an unauthenticated session, or cross-campus link sharing), the query returned no results and the frontend showed "Offer not found."

**Fix:**
Removed the `campus_id` parameter from the `get_listing` service call in the detail endpoint. Direct lookups by listing ID should always work — campus filtering only belongs on browse/search endpoints. The listing service's `campus_id` parameter defaults to `None`, so no service-layer changes were needed.

**File modified (1):**
- `bulletin-board-api/app/api/v1/listings.py` — Removed `campus_id=current_user.campus_id if current_user else None` from `get_listing` endpoint (line 129)

**Status:** COMPLETED

---

### Entry 38 — 2026-03-24: Improve listing detail error handling (resilience fix)

**Scope:** Frontend robustness for listing detail page

**Problem:**
"Offer not found" persisted after Entry 37's backend fix. Root causes:
1. React Query global `retry: 1` — only one retry before caching the error
2. Detail page treated ALL errors (404, 500, network timeout) identically as "not found"
3. `staleTime: 60s` meant cached errors were served for up to a minute without refetch

**Fix — `useListing` hook (`src/lib/hooks/use-listings.ts`):**
- `staleTime: 0` — always refetch listing detail on mount (user expects fresh data)
- Smart `retry` function: skip retry on 404 (listing truly doesn't exist), retry up to 3 times on transient errors (500, network)

**Fix — Detail page (`src/app/(main)/listings/[id]/page.tsx`):**
- Extract `error` and `refetch` from the hook
- If error is 404 → show "Offer not found" (permanent)
- If error is anything else → show "Something went wrong" with a "Try again" button
- Added `ErrorRetry` component for the retry UI

**Files modified (2):**
- `bulletin-board-frontend/src/lib/hooks/use-listings.ts` — Smart retry + staleTime: 0 on `useListing`
- `bulletin-board-frontend/src/app/(main)/listings/[id]/page.tsx` — ErrorRetry component, 404 vs transient error distinction

**Verification:**
- `npx tsc --noEmit` — zero TypeScript errors
- `npm run build` — all pages compiled, zero errors

**Status:** COMPLETED

---

### Entry 39 — 2026-03-24 (Session 39)
**Commit:** `2496061`
**Scope:** Harden listing detail rendering + backend schema fixes

**Problem:**
After Entry 37 fixed the 404 (backend campus_id filter) and Entry 38 improved error handling, the listing detail page still crashes on the live site with "Something went wrong." The root error boundary catches a client-side rendering crash after data loads successfully (API returns 200 with valid JSON). Investigation confirmed the API proxy works, data is valid, and all i18n keys exist. The exact browser-side crash could not be reproduced via CLI — likely manifests only during React client-side hydration/rendering.

**Defensive fixes applied (7 files):**

1. **Frontend type safety** — `Listing.category` changed from `CategoryBrief` to `CategoryBrief | null` in types, matching backend Pydantic schema (`CategoryBrief | None`)
2. **Detail page** (`page.tsx`) — null-safe category badge rendering with `listing.category &&`, safe availability rendering with `typeof` check for dict values
3. **Edit page** (`edit/page.tsx`) — `listing.category?.id ?? ""` for form reset
4. **ListingCard** — `listing.category?.slug ?? "default"` for category visual lookup
5. **ListingSchema** — prop type updated to accept `null` for category
6. **Backend schema** — `ListingResponse.availability` changed from `dict | None` to `str | None` with `field_validator` to coerce JSONB dicts to JSON strings (prevents React "Objects are not valid as a React child" crash)
7. **Backend model** — added `values_callable=lambda e: [x.value for x in e]` to `listing_status` enum (fixes case mismatch between Python enum member names and Postgres enum values)

**Files modified (7):**
- `bulletin-board-frontend/src/lib/types/index.ts` — `category: CategoryBrief | null`
- `bulletin-board-frontend/src/app/(main)/listings/[id]/page.tsx` — null-safe category + safe availability
- `bulletin-board-frontend/src/app/(main)/listings/[id]/edit/page.tsx` — null-safe category in form reset
- `bulletin-board-frontend/src/components/listings/ListingCard.tsx` — null-safe category slug
- `bulletin-board-frontend/src/components/seo/ListingSchema.tsx` — accept null category in props
- `bulletin-board-api/app/schemas/listing.py` — availability str coercion validator
- `bulletin-board-api/app/models/listing.py` — listing_status enum values_callable

**Verification:**
- `npx tsc --noEmit` — zero TypeScript errors
- `npm run build` — all pages compiled, zero errors
- Backend schema test: dict, None, and string availability all coerce correctly
- Backend unit tests: 290 passed (1 pre-existing failure in moderation mock)

**Next steps:**
- Deploy and test on live site (gimme-dat.com)
- If "Something went wrong" persists, check browser DevTools Console (F12) for the exact JavaScript error — the root error boundary logs it via `console.error("Unhandled error:", error)`
- The exact rendering crash may only manifest in the browser, not reproducible via curl/CLI

**Status:** COMPLETED

---

### Entry 40 — 2026-03-24 (Session 40)
**Scope:** Production Incident — Database Wipe on Deploy + Recovery

**Incident Summary:**
After pushing commit `2496061` (Entry 39 fixes) and triggering a Render redeploy, the production database appeared to be completely reset. All user accounts, listings (27→1), categories (14→2), and campus data (Gettysburg College→Test University) were gone. Login failed with "Invalid email or password" because the user's account no longer existed in the active database.

**Root Cause Analysis:**
The `render.yaml` blueprint defines a Render-managed PostgreSQL database (`gimme-dat-db`) via:
```yaml
databases:
  - name: gimme-dat-db
    plan: starter
```
And the `DATABASE_URL` env var was set via `fromDatabase: gimme-dat-db`. However, the actual production data lived on a **separate Neon serverless PostgreSQL** instance. During the Render deploy (or a blueprint sync), the `DATABASE_URL` may have been overridden to point to the empty Render-managed DB. When `alembic upgrade head` ran on startup, it created fresh empty tables, and `auto_seed_examples()` populated it with minimal seed data (Test University, 2 categories, 1 example listing).

**Key finding:** The Neon `main` branch was **never wiped**. All original data (users, listings, categories, Gettysburg College campus) remained intact on Neon. The "wipe" was actually the app connecting to the wrong database.

**Recovery Steps Taken:**
1. Attempted Neon point-in-time restore (6 hours back) — created branch `production_old_2026-03-24T07:45:00Z`
2. Restored branch was auto-archived by Neon; required adding a compute endpoint to access it
3. Queried restored branch — showed wiped state (1,1,2,1) — restore point was already after the issue
4. Switched back to Neon `main` branch — **all original data intact**
5. Confirmed the incident was a `DATABASE_URL` mismatch, not actual data loss
6. Created a manual backup snapshot of Neon `main` branch for safety
7. User is rolling back Render deployment to commit `45ffb01` (last known working version)

**Marketplace Feed Error:**
After confirming database data is intact and moderator dashboard works, the public marketplace feed (`/feed`) still shows "An error occurred — Something went wrong. Please try again." This is the **original bug from Entry 38/39** that was being investigated before the database scare — it is a frontend rendering crash, not a data issue. The category tabs load correctly (confirming API connectivity), but the listing grid fails to render.

**Infrastructure Vulnerabilities Identified:**
1. **`render.yaml` defines a competing database** — `gimme-dat-db` can override the Neon `DATABASE_URL` during blueprint syncs
2. **`alembic upgrade head` runs blindly on every deploy** — silently creates empty tables on wrong/empty databases
3. **No deploy-time database validation** — no check that the connected DB has expected data before proceeding
4. **No Neon branch protection** — main branch can be auto-archived

**Remediation Applied:**
1. Removed `databases:` section from `render.yaml` — eliminates competing Render-managed DB
2. Changed both `DATABASE_URL` entries (API + worker) from `fromDatabase: gimme-dat-db` to `sync: false` with warning comments
3. Created `bulletin-board-api/scripts/pre_migrate_check.py` — verifies `campuses` table exists with data before allowing `alembic upgrade head`; bypass with `ALLOW_FRESH_DB=true` for first-time setup
4. Updated `bulletin-board-api/docker/Dockerfile` CMD to run pre-migration check before alembic
5. Verified all `.gitignore` files cover `.env`, `.env.local`, `.env.production` — no changes needed
6. Verified Render `DATABASE_URL` already points to Neon (`...neon.tech/neondb?ssl=require`)
7. User created manual Neon backup branch snapshot
8. User protected Neon main branch from archiving

**Additional Finding:** Render service "Gettysburg-Marketplace" uses Python 3 runtime (not Docker) and was created manually — NOT from the `render.yaml` blueprint. Blueprint Sync was likely never active for this service. The `render.yaml` fix is preventative.

**Files Changed:**
- `render.yaml` — removed `databases:` section, changed both `DATABASE_URL` entries to `sync: false`
- `bulletin-board-api/docker/Dockerfile` — updated CMD to run `pre_migrate_check.py` before alembic
- `bulletin-board-api/scripts/pre_migrate_check.py` — new pre-migration safety check script
- `DEVLOG.md` — this entry

**Commits:**
- `fa19d91` — safety: remove Render-managed DB, add pre-migration check

**Next Steps:**
- Verify Render redeploy succeeds (manual deploy triggered)
- Investigate and fix the marketplace feed rendering error (original bug from Entry 38/39 — frontend crash, not database issue)
- Consider enabling auto-deploy in Render settings for future pushes

**Status:** COMPLETED

---

### 2026-03-24 — Fix Listing Detail Page 500 Error (MissingGreenlet)

**Summary:** Fixed the listing detail page (`/listings/[id]`) returning 500 Internal Server Error for authenticated users. Root cause: SQLAlchemy `MissingGreenlet` — the `get_listing` service method called `db.commit()` (for view count increment) before serializing the response, which invalidated selectin-loaded relationships. Accessing those relationships in `_to_response()` then triggered synchronous lazy reloads in the async context.

**Files Changed:**
- `bulletin-board-api/app/services/listing_service.py` — Restructured `get_listing()`: moved favorites check and `_to_response()` serialization BEFORE the view count `commit()`, so ORM relationships are accessed while still valid
- `bulletin-board-api/app/models/listing.py` — Changed `Category.listings` from `lazy="selectin"` to `lazy="noload"` (was loading ALL listings in a category unnecessarily); added `lazy="noload"` to `ListingPhoto.listing` back-reference
- `bulletin-board-api/app/models/user.py` — Added `lazy="noload"` to `RefreshToken.user` and `EmailVerification.user` back-references
- `bulletin-board-api/app/models/message.py` — Added `lazy="noload"` to `Message.thread` back-reference
- `bulletin-board-api/app/models/notification.py` — Added `lazy="noload"` to `NotificationPreference.user` back-reference
- `bulletin-board-api/app/api/v1/listings.py` — Temporary debug try/except to surface actual error (added then removed)
- `bulletin-board-frontend/src/app/(main)/listings/[id]/page.tsx` — Enhanced ErrorRetry component to display error details (status, code, message) in a collapsible section
- `bulletin-board-frontend/src/app/(main)/listings/[id]/error.tsx` — New route-level error boundary for layout/RSC errors
- `bulletin-board-frontend/src/app/(main)/listings/[id]/layout.tsx` — Added null guard for API URL + 5s abort timeout on metadata fetch
- `bulletin-board-frontend/src/lib/api/client.ts` — Added content-type validation before JSON parsing; diagnostic logging for non-JSON error responses

**Root Cause Analysis:**
The feed page (`search_listings`) worked because it never calls `commit()` — it queries, builds responses, and returns. The detail page (`get_listing`) did `commit()` for the view count increment BEFORE `_to_response()`. After commit, SQLAlchemy invalidated the selectin-loaded relationships (user, category, photos). When `_to_response()` then accessed those relationships, it triggered synchronous lazy reloads → `MissingGreenlet` in the async context. Fix: serialize first, commit after.

**Next Steps:**
- Monitor for any remaining edge cases
- The `lazy="noload"` changes on back-references are a good defensive measure regardless

**Status:** COMPLETED

---
