# Phase 3: Cloud Service Provider Compatibility

**Project:** Gimme Dat (Campus Bulletin Board)
**Date:** 2026-02-05
**Status:** COMPLETE

---

## 1. Vercel (Frontend)

### Compatibility: ✅ COMPATIBLE

**Next.js Version:** 14.2.21 (Vercel native support)

**Configuration Checklist:**
| Feature | Status | Notes |
|---------|--------|-------|
| Standalone output | ⚠️ NOT SET | Add `output: "standalone"` to next.config.mjs |
| Environment variables | ✅ | `NEXT_PUBLIC_API_URL` |
| Image optimization | ✅ | Remote patterns configured |
| Static generation | ✅ | Landing pages pre-rendered |
| Edge functions | ✅ | Middleware compatible |
| Build command | ✅ | `npm run build` |
| Output directory | ✅ | `.next` (auto-detected) |

**Required Changes for Vercel:**

1. **next.config.mjs** - Add standalone output for Docker/serverless:
```javascript
const nextConfig = {
  output: "standalone",  // ADD THIS LINE
  reactStrictMode: true,
  // ... rest of config
};
```

2. **Environment Variables to Set in Vercel Dashboard:**
```
NEXT_PUBLIC_API_URL=https://api.gimme-dat.com  # Your Render API URL
```

3. **vercel.json** (Optional - create if needed):
```json
{
  "buildCommand": "npm run build",
  "framework": "nextjs",
  "regions": ["iad1"],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "no-store" }
      ]
    }
  ]
}
```

### Vercel-Specific Considerations
- **Functions timeout:** 10s on Hobby, 60s on Pro (sufficient for SSR)
- **Edge middleware:** Works with current setup
- **Image optimization:** Native support, may incur costs on Pro plan
- **Analytics:** Optional Vercel Analytics can be added

---

## 2. Render (Backend API)

### Compatibility: ✅ COMPATIBLE

**Framework:** FastAPI with Uvicorn
**Docker:** Configured and production-ready

**Configuration Checklist:**
| Feature | Status | Notes |
|---------|--------|-------|
| Dockerfile | ✅ | `docker/Dockerfile` present |
| Health check | ✅ | `/health` endpoint exists |
| Non-root user | ✅ | `appuser` configured |
| Port binding | ✅ | Port 8000 exposed |
| Env vars | ✅ | All via Settings class |

**render.yaml** (Create this file in project root):
```yaml
services:
  # ── Backend API ──────────────────────────────────────────
  - type: web
    name: gimme-dat-api
    runtime: docker
    dockerfilePath: ./bulletin-board-api/docker/Dockerfile
    dockerContext: ./bulletin-board-api
    region: ohio  # Closest to PA
    plan: starter
    healthCheckPath: /health
    envVars:
      - key: APP_ENV
        value: production
      - key: APP_DEBUG
        value: false
      - key: APP_SECRET_KEY
        generateValue: true
      - key: JWT_SECRET_KEY
        generateValue: true
      - key: DATABASE_URL
        fromDatabase:
          name: gimme-dat-db
          property: connectionString
      - key: REDIS_URL
        fromService:
          type: redis
          name: gimme-dat-redis
          property: connectionString
      - key: FRONTEND_URL
        value: https://www.gimme-dat.com
      - key: S3_ENDPOINT_URL
        sync: false  # Set manually for R2
      - key: S3_ACCESS_KEY_ID
        sync: false
      - key: S3_SECRET_ACCESS_KEY
        sync: false
      - key: S3_BUCKET_NAME
        value: gimme-dat-uploads
      - key: CDN_URL
        sync: false  # Your R2 public URL
      - key: EMAIL_PROVIDER
        value: resend
      - key: RESEND_API_KEY
        sync: false
      - key: EMAIL_FROM_ADDRESS
        value: noreply@gimme-dat.com

  # ── Background Worker ────────────────────────────────────
  - type: worker
    name: gimme-dat-worker
    runtime: docker
    dockerfilePath: ./bulletin-board-api/docker/Dockerfile.worker
    dockerContext: ./bulletin-board-api
    region: ohio
    plan: starter
    envVars:
      # Same env vars as API (reference or copy)

databases:
  - name: gimme-dat-db
    plan: starter
    region: ohio
    postgresMajorVersion: 16

# Note: Render Redis requires separate setup via dashboard
```

### Render-Specific Considerations
- **Cold starts:** Starter plan has cold starts, consider upgrading for production
- **Redis:** Render Redis is a separate paid service
- **Database migrations:** Run via `render.yaml` preDeployCommand or manually
- **Logs:** Available via dashboard and CLI

### Database Migration Setup
Add to render.yaml service:
```yaml
    preDeployCommand: "cd /app && alembic upgrade head"
```

---

## 3. Cloudflare R2 (Object Storage)

### Compatibility: ✅ COMPATIBLE

**Current Implementation:** S3-compatible via aioboto3
**S3v4 Signature:** ✅ Configured in storage_service.py

**Configuration for R2:**

1. **Create R2 Bucket:**
   - Bucket name: `gimme-dat-uploads`
   - Region: Auto (Cloudflare global)

2. **Create API Token:**
   - Go to R2 → Manage R2 API Tokens
   - Create token with Object Read & Write permissions

3. **Environment Variables:**
```
S3_ENDPOINT_URL=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
S3_ACCESS_KEY_ID=<R2_ACCESS_KEY_ID>
S3_SECRET_ACCESS_KEY=<R2_SECRET_ACCESS_KEY>
S3_BUCKET_NAME=gimme-dat-uploads
S3_REGION=auto
CDN_URL=https://cdn.gimme-dat.com  # Custom domain or R2 public URL
```

4. **CORS Configuration for R2:**
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

5. **Public Access (Optional):**
   - Enable custom domain for public read access
   - Or use Cloudflare Workers for signed URLs

### R2-Specific Considerations
- **No egress fees:** Unlike AWS S3
- **Global distribution:** Automatic via Cloudflare network
- **Presigned URLs:** Work with S3v4 signature (already configured)

---

## 4. Neon (PostgreSQL)

### Compatibility: ✅ COMPATIBLE

**Current Driver:** asyncpg (native PostgreSQL)
**Connection:** Standard PostgreSQL connection string

**Configuration for Neon:**

1. **Create Neon Project:**
   - Region: US East (closest to PA)
   - PostgreSQL version: 16

2. **Connection String Format:**
```
postgresql+asyncpg://username:password@ep-xxx.us-east-2.aws.neon.tech/bulletin_board?sslmode=require
```

3. **Environment Variable:**
```
DATABASE_URL=postgresql+asyncpg://<user>:<pass>@<host>/<db>?sslmode=require
```

### Neon-Specific Considerations
- **Serverless:** Auto-scales, may have cold starts on free tier
- **Connection pooling:** Neon provides built-in pooling
- **SSL required:** Add `?sslmode=require` to connection string
- **Branching:** Great for dev/staging environments

### Code Compatibility Check
Current database setup in `app/db.py` should work with Neon. No changes needed.

### Migration Note
If switching from Render PostgreSQL to Neon:
1. Export data from Render: `pg_dump`
2. Import to Neon: `psql`
3. Update DATABASE_URL
4. Run `alembic upgrade head` to verify

---

## 5. Resend (Email Service)

### Compatibility: ✅ FULLY INTEGRATED

**Current Implementation:** `app/services/email_service.py`
**SDK Version:** resend==2.21.0

**Configuration:**

1. **Resend Dashboard Setup:**
   - Add domain: `gimme-dat.com`
   - Verify DNS records (DKIM, SPF, DMARC)
   - Create API key

2. **Environment Variables:**
```
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM_ADDRESS=noreply@gimme-dat.com
EMAIL_FROM_NAME=Gimme Dat
```

3. **DNS Records Required:**
```
Type    Name                    Value
TXT     @                       v=spf1 include:_spf.resend.com ~all
CNAME   resend._domainkey      <provided by Resend>
TXT     _dmarc                  v=DMARC1; p=quarantine; rua=mailto:...
```

### Email Templates Sent
| Email Type | Trigger | Status |
|------------|---------|--------|
| Verification | Registration | ✅ |
| Password Reset | Forgot password | ✅ |
| Resend Verification | User request | ✅ |

### Resend-Specific Considerations
- **Rate limits:** 100 emails/day on free tier
- **Sending domain:** Must be verified
- **API reliability:** 99.9% uptime SLA

---

## 6. Summary Matrix

| Provider | Service | Compatible | Changes Needed |
|----------|---------|------------|----------------|
| Vercel | Frontend | ✅ | Add `output: "standalone"`, set env vars |
| Render | Backend API | ✅ | Create render.yaml |
| Render | Worker | ✅ | Create render.yaml |
| Cloudflare R2 | Storage | ✅ | Configure bucket, CORS, env vars |
| Neon | Database | ✅ | Add `?sslmode=require` to conn string |
| Resend | Email | ✅ | Already integrated, verify domain |

---

## 7. Production Environment Variables

### Frontend (Vercel)
```
NEXT_PUBLIC_API_URL=https://api.gimme-dat.com
```

### Backend (Render)
```
# Application
APP_ENV=production
APP_DEBUG=false
APP_SECRET_KEY=<generate-secure-random-32-chars>
APP_URL=https://api.gimme-dat.com
FRONTEND_URL=https://www.gimme-dat.com

# Database (Neon or Render)
DATABASE_URL=postgresql+asyncpg://user:pass@host/db?sslmode=require

# Redis (Render or Upstash)
REDIS_URL=redis://user:pass@host:port

# JWT
JWT_SECRET_KEY=<generate-secure-random-32-chars>

# S3/R2 Storage
S3_ENDPOINT_URL=https://<account>.r2.cloudflarestorage.com
S3_ACCESS_KEY_ID=<r2-access-key>
S3_SECRET_ACCESS_KEY=<r2-secret-key>
S3_BUCKET_NAME=gimme-dat-uploads
S3_REGION=auto
CDN_URL=https://cdn.gimme-dat.com

# Email
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM_ADDRESS=noreply@gimme-dat.com
EMAIL_FROM_NAME=Gimme Dat

# Monitoring (optional)
SENTRY_DSN=https://xxx@sentry.io/xxx
```

---

## 8. Deployment Checklist

### Pre-deployment
- [ ] Domain configured (gimme-dat.com)
- [ ] DNS records set (Vercel, Resend, Cloudflare)
- [ ] SSL certificates active
- [ ] All env vars set in each platform
- [ ] R2 bucket created with CORS
- [ ] Resend domain verified

### Backend (Render)
- [ ] Create Render services via render.yaml
- [ ] Set environment variables
- [ ] Run database migrations
- [ ] Verify /health endpoint

### Frontend (Vercel)
- [ ] Import project from GitHub
- [ ] Set environment variables
- [ ] Deploy and verify

### Post-deployment
- [ ] Test registration flow
- [ ] Test email delivery
- [ ] Test image upload
- [ ] Verify SSL on all endpoints
- [ ] Monitor error rates

---

## Next Steps

Proceeding to **Phase 4: Environment & Configuration Audit** to:
- Verify all required env vars are documented
- Check for hardcoded secrets
- Validate configuration defaults
- Create production-ready .env templates
