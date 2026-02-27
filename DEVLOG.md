# GimmeDat Campus Marketplace - Development Log

**Version:** 1.0 (Alpha)
**Last Updated:** 2026-02-26
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
├── ai-automation/               # Autonomous dev harness
│   ├── tasks.json               # 8 structured AI tasks (all completed)
│   ├── claude-progress.md       # Session-by-session log (Sessions 0-8)
│   ├── init.sh                  # Environment validation (13 checks)
│   └── run-dev-loop.sh          # Autonomous loop harness
├── docs/                        # Supplemental documentation
├── docker-compose.yml           # Local dev: PostgreSQL, Redis, MinIO, MailHog, API, Frontend
├── render.yaml                  # Render.com deployment config
├── .github/workflows/ci.yml     # GitHub Actions CI pipeline
├── CLAUDE.md                    # Agent development conventions
├── AUDIT_REPORT.md              # Security audit (scores by category)
├── SEO-AUDIT-REPORT.md          # SEO audit (35/100 score)
├── FIXES_REQUIRED.md            # Prioritized issue tracker
├── ENV_TEMPLATE.md              # Environment variable documentation
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

### 2026-02-27 - Fix "Failed to Fetch" on Signup/Login

**Summary:** Added network retry logic, server warm-up, and user-friendly error messages to fix "Failed to fetch" errors during signup/login caused by Render cold starts.

**Files Changed:**
- `bulletin-board-frontend/src/lib/api/client.ts` - Added `fetchWithRetry()` with 3 attempts + exponential backoff (1s, 3s), `warmUpServer()` to pre-ping `/health` on first API call, moved `ApiError` class above retry helpers for dependency ordering
- `bulletin-board-frontend/src/app/(auth)/register/page.tsx` - Added network_error detection in catch block with user-friendly message
- `bulletin-board-frontend/src/app/(auth)/login/page.tsx` - Same network_error handling as register page

**Details:**
Root cause analysis: Users hitting "Failed to fetch" when trying to register because (1) Render backend sleeps after inactivity and cold starts take 30-60s, causing browser fetch() to timeout; (2) client.ts had zero retry logic — one failed fetch = permanent error; (3) raw browser error messages ("Failed to fetch") were shown to users.

Fix: Added `fetchWithRetry()` helper that retries network-level failures up to 2 times with exponential backoff (1s, 3s delays). Added `warmUpServer()` that fires a non-blocking `/health` ping on the very first API call to wake Render. Both login and register pages now detect `network_error` code and show "Unable to reach the server. Please check your internet connection and try again." instead of raw browser errors.

Build: Clean (0 errors, 1 pre-existing ESLint warning). Tests: 7/7 passing.

**Important:** User must verify `FRONTEND_URL` env var on Render dashboard is set to `https://www.gimme-dat.com,https://gimme-dat.com` — if wrong, CORS blocks all requests regardless of retry logic.

**Next Steps:**
- Verify FRONTEND_URL on Render dashboard
- Monitor signup success rate after deployment
- Consider adding a loading spinner/progress indicator during retries

**Status:** COMPLETED

---
