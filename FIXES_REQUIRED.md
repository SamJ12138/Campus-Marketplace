# Gimme Dat - Required Fixes

**Project:** Gimme Dat (Campus Bulletin Board)
**Generated:** 2026-02-05
**Priority Levels:** P0 (Critical), P1 (High), P2 (Medium), P3 (Low)

---

## P0 - Critical (Must Fix Before Production)

### 1. Upgrade Next.js to Fix Security Vulnerabilities

**Issue:** Next.js 14.2.21 has 10 known security vulnerabilities (8 HIGH, 2 MODERATE)

**CVEs Affected:**
- Authorization bypass (CVE-2024-34351)
- SSRF via middleware redirect
- Cache key confusion
- Content injection
- Race condition cache poisoning
- Multiple DoS vulnerabilities

**Fix:**
```bash
cd bulletin-board-frontend
npm install next@latest
```

**Note:** Test thoroughly after upgrade as Next.js 15/16 may have breaking changes.

**Estimated Impact:** Security vulnerability exposure in production

---

### 2. Set Frontend Environment Variable

**Issue:** `NEXT_PUBLIC_API_URL` is empty in `.env.local`

**Fix:**
```bash
# bulletin-board-frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000  # For development
```

For production (Vercel), set via dashboard:
```
NEXT_PUBLIC_API_URL=https://api.gimme-dat.com
```

**Estimated Impact:** Application cannot connect to backend

---

### 3. Fix Frontend Test Mock

**Issue:** 7 tests failing due to missing `next/link` mock

**File:** `bulletin-board-frontend/src/__tests__/setup.tsx`

**Fix:** Add this mock:
```typescript
// After the next/navigation mock
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));
```

**Estimated Impact:** CI/CD pipeline blocked

---

## P1 - High Priority (Fix Within First Week)

### 4. Add Standalone Output for Next.js

**Issue:** Missing `output: "standalone"` for Docker/serverless deployment

**File:** `bulletin-board-frontend/next.config.mjs`

**Fix:**
```javascript
const nextConfig = {
  output: "standalone",  // ADD THIS LINE
  reactStrictMode: true,
  // ... rest of config
};
```

---

### 5. Create Render Deployment Configuration

**Issue:** No `render.yaml` for Render deployment

**File:** Create `render.yaml` in project root

**Fix:** See PHASE3_FINDINGS.md for complete render.yaml template

---

### 6. Convert Raw `<img>` Tags to Next.js `<Image>`

**Issue:** 11 files using raw `<img>` tags affecting Core Web Vitals

**Files to Fix:**
1. `src/app/(main)/ads/[id]/page.tsx`
2. `src/app/(main)/listings/new/page.tsx`
3. `src/app/(main)/messages/page.tsx`
4. `src/app/(main)/messages/[threadId]/page.tsx`
5. `src/app/(main)/profile/listings/page.tsx`
6. `src/app/(main)/profile/page.tsx`
7. `src/app/(main)/profile/saved/page.tsx`
8. `src/app/(main)/profile/settings/page.tsx`
9. `src/app/(main)/u/[userId]/page.tsx`
10. `src/components/listings/PhotoUploader.tsx`

**Fix Pattern:**
```typescript
// Before
<img src={url} alt={alt} className="..." />

// After
import Image from "next/image";
<Image src={url} alt={alt} width={...} height={...} className="..." />
```

---

### 7. Update .env.example with RESEND_API_KEY

**Status:** ✅ FIXED during audit

**File:** `bulletin-board-api/.env.example`

---

## P2 - Medium Priority (Fix Within First Sprint)

### 8. Fix ESLint Warnings

**Issue:** 30+ ESLint warnings

**Fix:**
```bash
cd bulletin-board-frontend
npm run lint -- --fix
```

Then manually fix remaining issues:
- Remove unused imports
- Add missing React Hook dependencies
- Remove unused variables

---

### 9. Add HSTS Header

**Issue:** Missing Strict-Transport-Security header

**File:** `bulletin-board-frontend/next.config.mjs`

**Fix:** Add to headers array:
```javascript
{
  source: "/(.*)",
  headers: [
    // ... existing headers
    {
      key: "Strict-Transport-Security",
      value: "max-age=31536000; includeSubDomains"
    },
  ],
},
```

---

### 10. Consider Replacing python-jose

**Issue:** python-jose is unmaintained

**Current:**
```
python-jose[cryptography]==3.3.0
```

**Recommended Replacement:**
```
PyJWT>=2.0.0
```

**Impact:** Requires refactoring JWT code in `app/core/security.py`

---

### 11. Add Docker Healthchecks

**Issue:** No healthchecks in Dockerfiles

**File:** `bulletin-board-api/docker/Dockerfile`

**Fix:** Add after CMD:
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1
```

**File:** `bulletin-board-frontend/Dockerfile`

**Fix:** Add healthcheck for Next.js

---

## P3 - Low Priority (Backlog)

### 12. Rotate Credentials

**Issue:** Credentials in local .env were viewed during audit

**Action:** Regenerate these in production:
- APP_SECRET_KEY
- JWT_SECRET_KEY
- DATABASE_URL password
- RESEND_API_KEY

---

### 13. Add E2E Test Coverage

**Issue:** Missing tests for key flows

**Tests to Add:**
- Email verification flow
- Password reset flow
- Profile editing
- Photo upload
- Message blocking
- Admin moderation

---

### 14. Update Outdated Dependencies

**Issue:** 21 npm packages outdated

**Fix:**
```bash
cd bulletin-board-frontend
npm update
npm audit fix
```

**Major Updates (require testing):**
- @types/node: 20 → 22
- @types/react: 18 → 19
- eslint: 8 → 9
- typescript: 5.7 → 5.8

---

### 15. Replace passlib with argon2-cffi

**Issue:** passlib is no longer actively maintained

**Current:**
```
passlib[bcrypt]==1.7.4
```

**Recommended:**
```
argon2-cffi>=21.0.0
```

**Impact:** Requires migration path for existing password hashes

---

### 16. Add Content Security Policy

**Issue:** No CSP header configured

**Action:** Plan and implement CSP after understanding all script sources

---

### 17. Implement "Logout All Devices"

**Issue:** No bulk token revocation feature

**Action:** Add endpoint to revoke all refresh tokens for a user

---

## Quick Reference Checklist

### Before Production Deployment

- [ ] P0-1: Upgrade Next.js
- [ ] P0-2: Set NEXT_PUBLIC_API_URL
- [ ] P0-3: Fix test mocks
- [ ] P1-4: Add standalone output
- [ ] P1-5: Create render.yaml

### First Week Post-Deploy

- [ ] P1-6: Convert img to Image
- [ ] P2-8: Fix ESLint warnings
- [ ] P2-9: Add HSTS header
- [ ] P2-11: Add healthchecks
- [ ] P3-12: Rotate credentials

### Ongoing

- [ ] P2-10: Evaluate python-jose replacement
- [ ] P3-13: Expand E2E tests
- [ ] P3-14: Update dependencies
- [ ] P3-16: Plan CSP implementation

---

*Generated by Claude AI Assistant on 2026-02-05*
