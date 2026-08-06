# Auth Audit Response — DeepSeek Verification Results

This document records the findings from an external security audit of TalentMesh's authentication system, cross-referenced against the actual codebase (local source + live InsForge backend) by DeepSeek analysis. Each finding is marked **confirmed**, **adjusted**, or **downgraded** with exact code evidence.

---

## 1. Verification Summary

| # | Finding | Original Severity | Verdict | Key Evidence |
|---|---|---|---|---|
| 1 | OAuth `state` parameter missing | P1 High | ✅ **Confirmed** | SDK generates PKCE but no `state` — Login CSRF possible |
| 2 | MFA cookie bypass (`mfa_verified`) | P1 High | ✅ **Confirmed + Bug** | Cookie **never set to `true`**, only cleared. No signature. Middleware trusts raw cookie |
| 3 | Recruiter onboarding accepts client password | P1 High | ✅ **Confirmed** | `const tempPassword = password || randomPassword()` — client input wins |
| 4 | Rate limiting missing on auth endpoints | P1 High | ✅ **Confirmed** | Zero rate limits on login, signup, OTP, password reset, resume-parse |
| 5 | PAN / Aadhaar stored in plaintext | P2 Medium | ✅ **Confirmed** | `recruiter_profiles.pan_number`, `aadhaar_number` unencrypted |
| 6 | Dual cookie authority (edge function + proxy) | P2 Medium | ✅ **Confirmed** | `auth-session` edge function + `/api/auth/sessions` both set `tm_access_token` |
| 7 | Admin role auto-promotion by email domain | P2 Medium | ✅ **Partially** | `server-auth.ts:49-55` fixed; `admin-auth-login` edge function still has fallback |
| 8 | Candidate visibility flag not enforced | P2 Medium | ✅ **Valid concern** | `is_discoverable` used in admin-candidates but not in recruiter search functions |
| 9 | Email service endpoint abuse | P2 Medium | ❌ **Downgraded to Low** | `x-service-key` validated against `process.env.INSFORGE_SERVICE_KEY`. Server-only. |
| 10 | Session refresh race conditions | P2 Medium | ❌ **Downgraded to Low** | `activeRefreshPromise` dedup lock prevents concurrent refresh storms |
| 11 | Recruiter access after withdrawn/rejected | P2 Medium | ❌ **Not applicable** | RLS uses `jobs.recruiter_id = auth.uid()` — no status filter. Standard ATS behavior. |
| 12 | IP fingerprint churn (mobile/VPN) | P2 Medium | ⚠️ **Noted** | IP hash is a risk signal only, not sole auth factor. Acceptable for MVP. |

---

## 2. Detailed Findings

### Finding 1: OAuth `state` Parameter Missing

**Problem:** The OAuth flow does not generate or validate a `state` parameter, making it susceptible to Login CSRF (OAuth callback injection).

**Code Evidence:**

The SDK's `signInWithOAuth()` (`node_modules/@insforge/sdk/dist/index.js:877-913`) sends only:
```js
const params = { code_challenge: codeChallenge };
if (redirectTo) params.redirect_uri = redirectTo;
```
No `state` parameter is generated or validated server-side.

Application login pages call the SDK without `state`:
```ts
// app/(auth)/login/page.tsx:290-298
const { data, error } = await directInsforge.auth.signInWithOAuth({
  provider,          // 'google' | 'linkedin'
  redirectTo: `${siteUrl}/auth/callback`,
  skipBrowserRedirect: true,
});
```

The exchange endpoint (`app/api/auth/oauth/exchange/route.ts`) simply forwards `{ code }` to InsForge with no CSRF validation, origin check, or state verification.

**Risk:** An attacker can start an OAuth flow, intercept the callback URL, and inject it into the victim's browser, potentially linking the attacker's social account to the victim's account.

**Mitigation already in place:** PKCE (`code_verifier`/`code_challenge`) is implemented by the SDK. The verifier is stored in `sessionStorage` and single-use on exchange. This prevents code interception but **does not replace `state`** — they protect different attack vectors.

**Fix:**
1. Generate a random `state` value before each OAuth initiation, store it in `sessionStorage`
2. Pass it to `signInWithOAuth()` when the SDK supports it, or append as `state` query param to the redirect URL
3. On the callback page, validate the returned `state` against the stored value before exchanging the code
4. Add origin validation to `/api/auth/oauth/exchange` (already present in the general proxy at `app/api/v1/remote/[...path]/route.ts`)

---

### Finding 2: MFA Cookie Bypass

**Problem:** The MFA enforcement in `proxy.ts` trusts a raw `mfa_verified` cookie with no signature, no server-side binding, and — critically — the cookie is **never set to `true`** anywhere in the codebase.

**Code Evidence:**

Middleware check (`proxy.ts:49`):
```ts
const mfaVerified = request.cookies.get('mfa_verified')?.value === 'true';
```

Cookie is only **cleared** (`admin-auth-login/index.ts:97`):
```ts
headers.append('Set-Cookie', `mfa_verified=; ${cookieOptions}; Max-Age=0; ...`);
```

Cookie is only **cleared on logout** (`auth-session/index.ts:248`):
```ts
responseHeaders.append('Set-Cookie', `mfa_verified=; ${clearOptions}`);
```

**Nowhere** in the entire codebase is `mfa_verified=true` set.

The MFA verify page (`app/auth/mfa-verify/page.tsx:51-109`) calls:
```ts
await insforge.auth.mfa.challenge({ factorId });
await insforge.auth.mfa.verify({ factorId, challengeId, code });
// Success → router.push(dest) — NO cookie set
```

**Risk:** Twofold:
1. **Bug:** After successful MFA verification, the middleware will ALWAYS redirect back to `/auth/mfa-verify` because the cookie is never `true` — potential infinite loop
2. **Security:** An attacker who obtains session cookies can manually set `mfa_verified=true` via browser dev tools or a crafted request and bypass MFA entirely

**Fix:**
1. Create `/api/auth/mfa-complete` route that:
   - Validates MFA status server-side via InsForge SDK
   - Records `mfa_verified_at` in `user_sessions` table
   - Sets a signed `mfa_verified` HttpOnly cookie with expiry tied to the session
2. Modify `app/auth/mfa-verify/page.tsx` to POST to `/api/auth/mfa-complete` instead of just `router.push()`
3. Modify `proxy.ts` to:
   - Check the cookie AND validate against `user_sessions.mfa_verified_at` for high-risk actions
   - Or use the signed cookie alone with server-side validation on sensitive operations

---

### Finding 3: Recruiter Onboarding Accepts Client Password

**Problem:** The `recruiter-request` edge function uses the client-provided `password` field directly as the auth password, bypassing the application's password policy.

**Code Evidence:**

```ts
// insforge/functions/recruiter-request/index.ts
const tempPassword = password || (crypto.randomUUID().replace(/-/g, '').slice(0, 16) + 'A1!');
```

The client sends `{ ..., password: "weak" }` and this becomes the auth password verbatim. The app-level validation (min 8 chars, uppercase, number) is only enforced on the signup form — it's bypassed here because this is a server-to-server edge function call.

**Risk:**
- Weak or predictable passwords set by recruiters
- No enforcement of password policy
- If the password field is omitted, the fallback random password is acceptable — but the problem is the client override

**Fix:**
```ts
// Remove the password field from the destructured body entirely
// Always use random password:
const tempPassword = crypto.randomUUID().replace(/-/g, '').slice(0, 16) + 'A1!';
```
Then trigger a password-set email so the recruiter sets their own password on first login.

---

### Finding 4: Missing Rate Limiting

**Problem:** No endpoint-level rate limiting on authentication flows.

**Code Evidence:** The general proxy (`app/api/v1/remote/[...path]/route.ts`) has CSRF + payload size checks but no rate limiting. None of the following enforce limits:
- `admin-auth-login` edge function
- `auth-signup` edge function
- `auth-verify` edge function
- `/api/auth/oauth/exchange`
- `resume-parse` edge function

**Risk:** Credential stuffing, brute force, OTP guessing, verification spam.

**Fix (In-Memory Map at Proxy Layer):**

```ts
// app/api/v1/remote/[...path]/route.ts — add before forwarding
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, maxAttempts: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxAttempts) return false;
  entry.count++;
  return true;
}

// Usage:
const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
const path = url.pathname;

if (path.includes('auth/login') && !checkRateLimit(`login:${ip}`, 5, 15 * 60 * 1000)) {
  return NextResponse.json({ error: 'Too many login attempts' }, { status: 429 });
}
if (path.includes('auth/verify') && !checkRateLimit(`otp:${ip}`, 5, 10 * 60 * 1000)) {
  return NextResponse.json({ error: 'Too many verification attempts' }, { status: 429 });
}
```

Rates:
| Endpoint | Limit | Window |
|---|---|---|
| Login | 5/IP | 15 min |
| OTP verify | 5/IP | 10 min |
| Signup | 10/IP | 15 min |
| Password reset | 3/IP | 1 hour |
| Resume parse | 20/IP | 1 hour |

---

### Finding 5: PAN / Aadhaar Plaintext

**Problem:** Sensitive Indian KYC documents stored unencrypted.

**Code Evidence:** `recruiter_profiles` table has columns `pan_number`, `aadhaar_number` as plain `text`.

**Risk:** Indian DPDP Act non-compliance. Data breach exposes full PAN and Aadhaar numbers.

**Fix:**
```sql
-- Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encrypt existing data
UPDATE recruiter_profiles SET
  pan_number = pgp_sym_encrypt(pan_number, '${ENCRYPTION_KEY}'),
  aadhaar_number = pgp_sym_encrypt(aadhaar_number, '${ENCRYPTION_KEY}');
```

Then update edge functions:
- **Write:** `recruiter-request` — encrypt before insert
- **Read:** Admin functions — decrypt with `pgp_sym_decrypt()` or return only last 4 chars:
  ```sql
  SELECT
    id,
    substring(pgp_sym_decrypt(pan_number, '${KEY}') from '.{4}$') as pan_last4,
    ...
  ```

---

### Finding 6: Dual Cookie Authority

**Problem:** Both the `auth-session` edge function and the Next.js API proxy set auth cookies, creating potential for expiry/SameSite/Secure flag mismatches.

**Code Evidence:**

Edge function (`insforge/functions/auth-session/index.ts`, POST handler):
```ts
const cookieOptions = `Path=/; HttpOnly; SameSite=None; Secure`;
responseHeaders.append('Set-Cookie', `tm_access_token=${token}; ${cookieOptions}`);
responseHeaders.append('Set-Cookie', `tm_role=${role}; ${cookieOptions}`);
```

API proxy (`app/api/auth/sessions/route.ts`):
```ts
// Also sets tm_access_token and tm_role
```

**Risk:** If the two paths disagree on cookie attributes, sessions can become inconsistent or stale.

**Fix:** Remove cookie-setting from the `auth-session` edge function. The edge function should return the token and role in JSON response body only. Let the Next.js API proxy be the sole cookie authority.

---

### Finding 7: Admin Email Domain Fallback

**Problem:** The deployed `admin-auth-login` edge function promotes users to `super_admin` if their email ends with `@talentmesh.com`, without requiring `email_verified` or checking `profiles.role`.

**Code Evidence:**

```ts
// insforge/functions/admin-auth-login/index.ts:9-15
function normalizeRole(role: string | undefined | null, email: string): string {
  if (role) return role;
  if (email.endsWith('@talentmesh.com') || email === 'admin@talentmesh.com') {
    return 'super_admin';  // DANGEROUS
  }
  return 'candidate';
}
```

The server-side version (`lib/auth/server-auth.ts:49-55`) was already fixed:
```ts
function normalizeRole(role: string | null | undefined): UserRole {
  if (role === 'admin' || role === 'super_admin' || role === 'recruiter') return role;
  return 'candidate';
}
```

**Risk:** If an attacker gains access to a `@talentmesh.com` mailbox, or if the domain is misconfigured in OAuth, they instantly become `super_admin` with no additional verification.

**Fix:**
```ts
function normalizeRole(role: string | undefined | null): string {
  if (role) return role;
  return 'candidate';
}
```
Remove the `email` parameter entirely. Privilege must come from the `profiles.role` column only.

---

### Finding 8: Candidate Visibility Flag Not Fully Enforced

**Problem:** `candidate_profiles.is_discoverable` is used in the admin candidates function but not consistently in recruiter-facing search and recommendation queries.

**Code Evidence:**

Enforced in `admin-candidates`:
```ts
// insforge/functions/admin-candidates/index.ts:154
query = query.eq('candidate_profiles.is_discoverable', true);
```

Not enforced in recruiter-facing functions like `candidates` or recruiter search.

**Risk:** A candidate who sets themselves as non-discoverable may still appear in recruiter search results.

**Fix:** Add `.eq('is_discoverable', true)` filter to all recruiter-facing queries that list or search candidates.

---

### Finding 9: Email Service Endpoint (Downgraded)

**Original concern:** The `/api/email/send` endpoint uses `x-service-key` header which could be leaked.

**Verdict: Downgraded to Low.** The endpoint validates the service key against `process.env.INSFORGE_SERVICE_KEY`:

```ts
// app/api/email/send/route.ts:39-43
const serviceKey = req.headers.get('x-service-key');
const expectedKey = process.env.INSFORGE_SERVICE_KEY;
if (!serviceKey || serviceKey !== expectedKey) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

The key is never exposed client-side. Calls come from edge functions only (server-to-server). Acceptable security posture.

---

### Finding 10: Session Refresh Race Conditions (Downgraded)

**Original concern:** Concurrent refresh calls could overwrite each other.

**Verdict: Downgraded to Low.** The code has a dedup lock:

```ts
// lib/insforge.ts:327-401
if (activeRefreshPromise) return activeRefreshPromise;

activeRefreshPromise = (async () => {
  // ... refresh logic ...
  return newToken;
})();
```

Combined with `BroadcastChannel` cross-tab sync for token distribution. Standard pattern, no significant risk.

---

### Finding 11: Recruiter Access After Withdrawn/Rejected (Not Applicable)

**Original concern:** Recruiters might lose access to withdrawn/rejected candidate data.

**Verdict: Not Applicable.** The `applications` table RLS policies use `jobs.recruiter_id = auth.uid()` with **no status filter**:

```sql
-- applications RLS: Recruiters can view job applications
qual: (EXISTS (SELECT 1 FROM jobs
  WHERE jobs.id = applications.job_id
  AND jobs.recruiter_id = auth.uid()))
```

Recruiters retain visibility regardless of application status. This is standard ATS behavior — historical data should remain accessible.

---

### Finding 12: IP Fingerprint Churn (Noted)

**Original concern:** Mobile users, VPNs, and carrier NAT cause frequent IP changes, potentially triggering false positives.

**Verdict: Noted.** The IP hash (`SHA-256`) is used as a risk signal only, stored in `user_sessions.ip_hash`. The primary session identifier is `token_fingerprint` (HMAC-SHA256 of the refresh token). IP is not used as an authentication factor. Acceptable for MVP.

---

## 3. Final Priority List

| Prio | Fix | Where | Effort |
|---|---|---|---|
| P1 | Add OAuth `state` parameter | Login pages + callback + exchange endpoint | 1 day |
| P1 | Harden MFA: server-side validation + signed cookie | `mfa-verify/page.tsx` + new route + DB migration + `proxy.ts` | 1 day |
| P1 | Remove client password from recruiter onboarding | `recruiter-request` edge function | 15 min |
| P1 | Add rate limiting on auth endpoints | API proxy routes | 2 hours |
| P2 | Encrypt PAN/Aadhaar with `pgcrypto` | SQL migration + edge functions | 3 hours |
| P2 | Consolidate cookie setting to proxy only | Remove Set-Cookie from `auth-session` edge function | 30 min |
| P2 | Remove email domain fallback from edge function | `admin-auth-login` edge function | 5 min |
| P2 | Enforce `is_discoverable` in all recruiter queries | Recruiter search/recommendation functions | 1 hour |
| P3 | Add `Cross-Origin-Opener-Policy` + `Cross-Origin-Embedder-Policy` + `Cross-Origin-Resource-Policy` headers | `next.config.ts` | 15 min |
| P3 | Document sessionStorage tradeoff in architecture docs | `docs/auth.md` | 15 min |

---

## 4. Items Intentionally Deferred

| Item | Reason | Future Trigger |
|---|---|---|
| Remove access token from `sessionStorage` entirely | InsForge SDK requires JS-accessible token. Refresh token is HttpOnly. Only fixable by moving all calls through proxy (major rewrite). | When migrating off InsForge or if XSS surface increases |
| ClamAV / malware scanning for uploads | MIME + magic bytes + size limit sufficient for MVP. Malware scanning adds significant complexity/cost. | When handling >1000 documents/month |
| Impossible travel detection | Data collected but no logic yet. Low probability of abuse at current scale. | When user base crosses 10,000 |
| Token family / refresh token reuse detection | InsForge handles server-side rotation. Custom detection is defense-in-depth only. | After P1/P2 items completed |
