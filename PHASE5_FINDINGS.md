# Phase 5: Critical Path Testing (Static Analysis)

**Project:** Gimme Dat (Campus Bulletin Board)
**Date:** 2026-02-05
**Status:** COMPLETE (Static Analysis Only)

**Note:** Backend is not running locally. This phase performs static code analysis of critical paths rather than runtime testing.

---

## 1. Authentication Flow Analysis

### Registration Flow (`POST /api/v1/auth/register`)

```
User Input → Validate Campus → Check Email Domain → Check Uniqueness →
Create User → Create Notification Prefs → Generate Verification Token →
Send Email → Return Success
```

| Step | Implementation | Status |
|------|----------------|--------|
| Campus validation | Database lookup by slug | ✅ |
| Email domain check | Optional, based on campus.allow_non_edu | ✅ |
| Email uniqueness | Case-insensitive check | ✅ |
| Password hashing | bcrypt via passlib | ✅ |
| Token generation | secrets.token_urlsafe(32) | ✅ |
| Token hashing | SHA-256 hash stored | ✅ |
| Auto-verify in dev | When email_provider=console | ✅ |
| 24h token expiration | datetime + timedelta(hours=24) | ✅ |

### Login Flow (`POST /api/v1/auth/login`)

```
User Input → Rate Limit Check → Find User → Verify Password →
Check Email Verified → Check Account Status → Create Tokens →
Store Refresh Token → Return Tokens
```

| Step | Implementation | Status |
|------|----------------|--------|
| Rate limiting | Redis-based, 5 attempts per 15 min | ✅ |
| Email lookup | Case-insensitive | ✅ |
| Password verification | bcrypt verify | ✅ |
| Email verification check | 403 if not verified | ✅ |
| Banned user check | 403 for banned accounts | ✅ |
| Suspension check | Auto-reactivate if expired | ✅ |
| Access token | JWT with user ID and role | ✅ |
| Refresh token | Random token, stored hashed | ✅ |
| Device tracking | User-Agent and IP stored | ✅ |

### Token Refresh Flow (`POST /api/v1/auth/refresh`)

```
Refresh Token → Validate → Check Not Revoked → Check Not Expired →
Verify User Active → Rotate Token → Return New Tokens
```

| Step | Implementation | Status |
|------|----------------|--------|
| Token lookup | Hash comparison | ✅ |
| Revocation check | revoked_at timestamp | ✅ |
| Expiration check | expires_at comparison | ✅ |
| Token rotation | Old revoked, new created | ✅ Security best practice |

### Password Reset Flow

```
Forgot Password → Rate Limit → Find User → Generate Token →
Send Email → User Clicks Link → Verify Token → Update Password
```

| Step | Implementation | Status |
|------|----------------|--------|
| Rate limiting | Per-email rate limit | ✅ |
| Token generation | secrets.token_urlsafe(32) | ✅ |
| Email sending | Via configured provider | ✅ |
| Token expiration | 1 hour | ✅ |
| Password update | Hash new password | ✅ |

---

## 2. Listing Flow Analysis

### Create Listing (`POST /api/v1/listings`)

**Expected Flow:**
```
Auth Check → Rate Limit (new accounts) → Validate Input →
Create Listing → Associate Photos → Return Listing
```

| Step | Implementation | Status |
|------|----------------|--------|
| Authentication | JWT required | ✅ |
| New account limits | 2 listings/day first 7 days | ✅ |
| Normal limits | 5 listings/day | ✅ |
| Category validation | Must match listing type | Expected |
| Photo association | Via photo upload flow | ✅ |
| 30-day expiration | Auto-expire listings | ✅ |

### Photo Upload Flow

**Expected Flow:**
```
Request Presigned URL → Upload to S3 → Confirm Upload →
Validate Image → Move to Permanent Location
```

| Step | Implementation | Status |
|------|----------------|--------|
| Content-type validation | JPEG, PNG, WebP only | ✅ |
| Size validation | 5MB for listings, 2MB for avatar | ✅ |
| Presigned URL | 5 minute expiration | ✅ |
| Image validation | Pillow verify + format check | ✅ |
| Max dimensions | 8192x8192 | ✅ |
| Temp → permanent move | S3 copy + delete | ✅ |

---

## 3. Messaging Flow Analysis

### Send Message (`POST /api/v1/messages`)

**Expected Flow:**
```
Auth Check → Rate Limit → Check Not Blocked → Find/Create Thread →
Create Message → Trigger Notification
```

| Step | Implementation | Status |
|------|----------------|--------|
| Authentication | JWT required | ✅ |
| Rate limiting | 50/hour normal, 10/hour new | ✅ |
| Block check | Bidirectional block check | Expected |
| Thread management | Create or find existing | Expected |
| Notification | Background job trigger | Expected |

---

## 4. E2E Test Coverage

### Existing Tests (Playwright)

| Test | Path | Coverage |
|------|------|----------|
| Register with .edu email | `/register` | ✅ |
| Login | `/login` | ✅ |
| Weak password validation | `/register` | ✅ |
| Create service listing | `/listings/new` | ✅ |
| Browse and filter listings | `/feed` | ✅ |
| View listing detail | `/listings/[id]` | Expected |
| Favorite a listing | `/feed` | Expected |
| Send message | `/messages` | Expected |

### Missing E2E Tests

1. Email verification flow
2. Password reset flow
3. Profile editing
4. Photo upload
5. Admin moderation
6. Message blocking

---

## 5. Security Controls Summary

### Rate Limiting
| Action | Limit | Window |
|--------|-------|--------|
| Login attempts | 5 | 15 min |
| Listings (normal) | 5 | 24 hours |
| Listings (new account) | 2 | 24 hours |
| Messages (normal) | 50 | 1 hour |
| Messages (new account) | 10 | 1 hour |
| Verification resend | Rate limited | Per email |

### Input Validation
- Pydantic v2 schemas for all requests
- Email format validation
- Password strength requirements
- File type validation via magic bytes
- Max upload sizes enforced

### Authorization
- JWT-based authentication
- Role-based access (user, moderator, admin)
- Resource ownership checks
- Account status verification

---

## 6. Potential Issues Identified

### Medium Priority

1. **Redis dependency for rate limiting**
   - Login flow requires Redis for rate limiting
   - If Redis is unavailable, rate limiting is bypassed
   - Recommendation: Add fallback or warning logging

2. **Email domain validation**
   - Only checked if campus.allow_non_edu is false
   - Some campuses may have multiple domains
   - Recommendation: Support multiple domains per campus

### Low Priority

3. **Session management**
   - No "log out all devices" feature visible
   - Consider adding bulk token revocation

4. **Password complexity**
   - Backend may need explicit password complexity rules
   - Frontend validates, but backend should too

---

## 7. Performance Considerations

### Database Queries
- User lookup by email: Indexed (email column)
- Token lookup by hash: Indexed (unique constraint)
- Listing queries: Check for proper indexes

### Caching
- No explicit caching layer visible for listings
- Consider Redis caching for hot data (popular listings)

---

## 8. Recommendations

### Testing
1. Add backend integration tests runnable without infrastructure
2. Expand E2E coverage for edge cases
3. Add load testing for rate limits

### Security
4. Implement "logout all devices" feature
5. Add explicit password complexity validation in backend
6. Consider multi-domain support per campus

### Monitoring
7. Add structured logging for auth events
8. Track rate limit triggers
9. Monitor failed login attempts

---

## Next Steps

Proceeding to **Phase 6: Generate Audit Reports** to consolidate all findings into:
- AUDIT_REPORT.md - Executive summary
- FIXES_REQUIRED.md - Prioritized fix list
