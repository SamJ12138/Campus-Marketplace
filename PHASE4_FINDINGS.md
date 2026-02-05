# Phase 4: Environment & Configuration Audit

**Project:** Gimme Dat (Campus Bulletin Board)
**Date:** 2026-02-05
**Status:** COMPLETE

---

## 1. Security Audit

### Secrets Management

| Check | Status | Notes |
|-------|--------|-------|
| .env files gitignored | ✅ | `.env`, `.env.local`, `.env.production` in .gitignore |
| No hardcoded secrets in code | ✅ | All secrets via environment variables |
| Test passwords only in test files | ✅ | "SecurePass123" only in test fixtures |
| Secret key minimum length | ✅ | 32 char minimum enforced via Pydantic |

### Credential Rotation Recommended

**IMPORTANT:** Your local `.env` file contains real credentials. While not committed to git, consider rotating:
- DATABASE_URL (Neon credentials visible)
- RESEND_API_KEY
- APP_SECRET_KEY
- JWT_SECRET_KEY

This is a best practice after any potential exposure.

---

## 2. Environment Variables Inventory

### Backend Required Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| APP_ENV | No | development | Environment (development/staging/production) |
| APP_DEBUG | No | false | Enable debug mode |
| APP_SECRET_KEY | **Yes** | - | Application secret (min 32 chars) |
| APP_URL | No | http://localhost:8000 | Backend URL |
| FRONTEND_URL | No | http://localhost:3000 | Frontend URL for CORS |
| DATABASE_URL | **Yes** | - | PostgreSQL connection string |
| DATABASE_ECHO | No | false | Log SQL queries |
| REDIS_URL | No | redis://localhost:6379/0 | Redis connection |
| JWT_SECRET_KEY | **Yes** | - | JWT signing secret (min 32 chars) |
| JWT_ALGORITHM | No | HS256 | JWT algorithm |
| JWT_ACCESS_TOKEN_EXPIRE_MINUTES | No | 15 | Access token TTL |
| JWT_REFRESH_TOKEN_EXPIRE_DAYS | No | 7 | Refresh token TTL |
| S3_ENDPOINT_URL | No | None | S3/R2 endpoint (None for AWS) |
| S3_ACCESS_KEY_ID | **Yes** | - | S3/R2 access key |
| S3_SECRET_ACCESS_KEY | **Yes** | - | S3/R2 secret key |
| S3_BUCKET_NAME | No | bulletin-board | Storage bucket name |
| S3_REGION | No | us-east-1 | AWS region |
| CDN_URL | **Yes** | - | Public URL for files |
| EMAIL_PROVIDER | No | console | Email service (console/sendgrid/ses/resend) |
| SENDGRID_API_KEY | Conditional | - | Required if email_provider=sendgrid |
| RESEND_API_KEY | Conditional | - | Required if email_provider=resend |
| EMAIL_FROM_ADDRESS | No | noreply@campusboard.local | From address |
| EMAIL_FROM_NAME | No | Campus Board | From name |
| SENTRY_DSN | No | None | Sentry error tracking |

### Frontend Required Variables

| Variable | Required | Description |
|----------|----------|-------------|
| NEXT_PUBLIC_API_URL | **Yes** | Backend API URL |

---

## 3. Configuration Defaults Analysis

### Rate Limiting Defaults
```python
rate_limit_enabled: bool = True
rate_limit_login_attempts: int = 5
rate_limit_login_window_seconds: int = 900  # 15 min
rate_limit_listings_per_day: int = 5
rate_limit_messages_per_hour: int = 50
```

**Assessment:** ✅ Reasonable defaults for production

### New Account Restrictions
```python
new_account_restriction_days: int = 7
new_account_listings_per_day: int = 2
new_account_messages_per_hour: int = 10
```

**Assessment:** ✅ Good spam prevention for new accounts

### File Upload Limits
```python
max_photos_per_listing: int = 6
max_photo_size_bytes: int = 5 * 1024 * 1024  # 5MB
max_avatar_size_bytes: int = 2 * 1024 * 1024  # 2MB
```

**Assessment:** ✅ Appropriate for college marketplace

### Listing Expiration
```python
listing_expiry_days: int = 30
```

**Assessment:** ✅ Sensible default for campus marketplace

---

## 4. Missing Documentation

### Issues Found
1. **RESEND_API_KEY** not in `bulletin-board-api/.env.example`
2. **SSL requirement** not documented for Neon DATABASE_URL
3. **S3_REGION=auto** requirement for Cloudflare R2 not documented
4. **Worker configuration** not documented

---

## 5. Security Headers

### Current next.config.mjs Headers
```javascript
{
  "X-Frame-Options": "DENY",              // ✅ Clickjacking protection
  "X-Content-Type-Options": "nosniff",    // ✅ MIME sniffing protection
  "Referrer-Policy": "strict-origin-when-cross-origin",  // ✅ Privacy
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()"  // ✅ Feature policy
}
```

### Missing Headers
```javascript
// Consider adding:
{
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",  // HSTS
  "Content-Security-Policy": "...",  // CSP (complex, requires testing)
}
```

---

## 6. CORS Configuration

### Current Setup (backend)
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],  # ✅ Only frontend allowed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Assessment:** ✅ Properly restricted to frontend URL only

---

## 7. Production vs Development Differences

| Feature | Development | Production |
|---------|-------------|------------|
| APP_DEBUG | true | false |
| docs_url | /docs | None (disabled) |
| redoc_url | /redoc | None (disabled) |
| EMAIL_PROVIDER | console | resend |
| Redis | Optional | Required |
| SSL | Not required | Required (Neon) |

---

## 8. Issues & Recommendations

### Critical
1. **Rotate credentials** - Local .env has been viewed during audit

### High Priority
2. **Update .env.example** - Add missing RESEND_API_KEY variable
3. **Document SSL requirement** - DATABASE_URL needs `?sslmode=require` for Neon

### Medium Priority
4. **Add HSTS header** - For production deployment
5. **Consider CSP** - Content Security Policy for additional protection

### Low Priority
6. **Add worker .env.example** - Document worker configuration
7. **Environment validation script** - Script to verify all required vars are set

---

## Next Steps

Proceeding to **Phase 5: Critical Path Testing** to verify:
- User registration flow
- Email verification
- Login/logout
- Listing creation
- File upload
- Messaging
