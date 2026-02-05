# Environment Variables Template

This document provides production-ready environment variable templates for deploying Gimme Dat on various cloud providers.

---

## Frontend (Vercel)

### vercel.env
```bash
# Required
NEXT_PUBLIC_API_URL=https://api.gimme-dat.com
```

Set this in Vercel Dashboard → Project Settings → Environment Variables.

---

## Backend (Render/Generic)

### Production Environment Variables

```bash
# ── Application ────────────────────────────────────────────────
APP_ENV=production
APP_DEBUG=false

# Generate with: openssl rand -base64 48 | tr -d '\n' | cut -c1-64
APP_SECRET_KEY=<generate-64-char-random-string>
APP_URL=https://api.gimme-dat.com
FRONTEND_URL=https://www.gimme-dat.com

# ── Database (Neon PostgreSQL) ─────────────────────────────────
# Format: postgresql+asyncpg://user:password@host/database?sslmode=require
DATABASE_URL=postgresql+asyncpg://<user>:<password>@<host>/<database>?sslmode=require
DATABASE_ECHO=false

# ── Redis (Render Redis / Upstash) ─────────────────────────────
# Render: redis://:password@host:port
# Upstash: rediss://default:password@host:port
REDIS_URL=redis://<user>:<password>@<host>:<port>

# ── JWT Authentication ─────────────────────────────────────────
# Generate with: openssl rand -base64 48 | tr -d '\n' | cut -c1-64
JWT_SECRET_KEY=<generate-64-char-random-string>
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=15
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# ── S3/Cloudflare R2 Storage ───────────────────────────────────
# For Cloudflare R2:
S3_ENDPOINT_URL=https://<account-id>.r2.cloudflarestorage.com
S3_ACCESS_KEY_ID=<r2-access-key-id>
S3_SECRET_ACCESS_KEY=<r2-secret-access-key>
S3_BUCKET_NAME=gimme-dat-uploads
S3_REGION=auto
CDN_URL=https://cdn.gimme-dat.com

# For AWS S3 (leave S3_ENDPOINT_URL empty):
# S3_ENDPOINT_URL=
# S3_ACCESS_KEY_ID=<aws-access-key>
# S3_SECRET_ACCESS_KEY=<aws-secret-key>
# S3_BUCKET_NAME=gimme-dat-uploads
# S3_REGION=us-east-1
# CDN_URL=https://gimme-dat-uploads.s3.amazonaws.com

# ── Email (Resend) ─────────────────────────────────────────────
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM_ADDRESS=noreply@gimme-dat.com
EMAIL_FROM_NAME=Gimme Dat

# ── Monitoring (Optional) ──────────────────────────────────────
SENTRY_DSN=https://xxxx@sentry.io/xxxx

# ── Rate Limiting (Defaults shown, customize if needed) ────────
# RATE_LIMIT_ENABLED=true
# RATE_LIMIT_LOGIN_ATTEMPTS=5
# RATE_LIMIT_LOGIN_WINDOW_SECONDS=900
# RATE_LIMIT_LISTINGS_PER_DAY=5
# RATE_LIMIT_MESSAGES_PER_HOUR=50

# ── New Account Restrictions (Defaults shown) ──────────────────
# NEW_ACCOUNT_RESTRICTION_DAYS=7
# NEW_ACCOUNT_LISTINGS_PER_DAY=2
# NEW_ACCOUNT_MESSAGES_PER_HOUR=10
```

---

## Cloud Provider Specific Configurations

### Vercel (Frontend)

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add:
   - `NEXT_PUBLIC_API_URL` = `https://api.gimme-dat.com`

### Render (Backend)

Create `render.yaml` in project root (see Phase 3 findings for full file).

Environment variables can be:
- Set via `render.yaml`
- Set via Render Dashboard → Service → Environment

### Cloudflare R2

1. Create bucket in Cloudflare Dashboard → R2
2. Create API token with Object Read & Write permissions
3. Set CORS policy:
```json
[
  {
    "AllowedOrigins": ["https://www.gimme-dat.com"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

### Neon PostgreSQL

1. Create project in Neon Console
2. Copy connection string (it includes `?sslmode=require`)
3. Replace driver: `postgres://` → `postgresql+asyncpg://`

### Resend Email

1. Add and verify domain in Resend Dashboard
2. Create API key
3. Configure DNS records:
   - SPF: `v=spf1 include:_spf.resend.com ~all`
   - DKIM: CNAME record provided by Resend
   - DMARC: `v=DMARC1; p=quarantine;`

---

## Secret Generation Commands

### Generate APP_SECRET_KEY
```bash
openssl rand -base64 48 | tr -d '\n' | cut -c1-64
```

### Generate JWT_SECRET_KEY
```bash
openssl rand -base64 48 | tr -d '\n' | cut -c1-64
```

### Generate secure password
```bash
openssl rand -base64 24
```

---

## Validation Checklist

Before deploying, verify:

- [ ] All required variables are set
- [ ] APP_SECRET_KEY is at least 32 characters
- [ ] JWT_SECRET_KEY is at least 32 characters
- [ ] DATABASE_URL includes `?sslmode=require` for Neon
- [ ] FRONTEND_URL matches your Vercel domain
- [ ] CDN_URL is publicly accessible
- [ ] Resend domain is verified
- [ ] CORS is configured in R2 bucket
- [ ] Redis connection is working
