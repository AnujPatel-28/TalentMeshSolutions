# Login Flow & Session Governance Audit
**Date**: 2026-07-07

## Root cause (CONFIRMED)
The hypothesis is **CONFIRMED**. There is a severe race condition and attribute conflict stemming from three separate authorities attempting to manage the `tm_access_token` cookie. 

When a user logs in, `AuthContext.tsx` writes the cookie client-side with `domain=.talentmeshsolutions.com`. The browser then follows a cross-subdomain redirect to `jobs.talentmeshsolutions.com` with `?token=...`. `proxy.ts` intercepts this and attaches a `Set-Cookie` header to the response. However, if the destination page includes client-side data fetching that fires immediately upon React mounting, it races against the browser's internal cookie-jar persistence of the proxy's `Set-Cookie` header. Because the redirect response and the subsequent data fetches happen concurrently in the browser's event loop, the fetch often goes out without the cookie on the first attempt, resulting in a 401. A manual reload (the second attempt) works because the cookie has settled.

Compounding this, the three write sites violently disagree on cookie attributes (specifically `HttpOnly` and `Domain`), causing the browser to sometimes store duplicate, conflicting cookies that confuse the Next.js server on subsequent requests.

## All `tm_access_token` write sites

| File | Context | Trigger | Attributes |
|---|---|---|---|
| `proxy.ts` (Middleware) | Server-side | Intercepts `?token=` on redirects | `domain=.domain.com`, `SameSite=None/Lax`, **NOT** `HttpOnly` |
| `lib/auth/AuthContext.tsx` | Client-side | `signIn`, `signUp`, `impersonateUser` | `domain=.domain.com`, `SameSite=None/Lax`, **NOT** `HttpOnly` |
| `insforge/functions/auth-session/index.ts` | Server-side (Edge) | Explicit API call to create session | **NO** `Domain` (strict host), `SameSite=None; Secure`, `HttpOnly` |

**Attribute Conflicts:**
- `auth-session` forces `HttpOnly` and omits the `Domain` (locking the cookie to the specific subdomain it was called from).
- `proxy.ts` and `AuthContext.tsx` write it with a wildcard `Domain` and NO `HttpOnly`. 
- This disagreement guarantees that cross-subdomain auth will behave unpredictably depending on which component wrote the cookie last.

## MFA cookie validation status
The `validateMfaCookie` function in `proxy.ts` **still** contains a fallback to a pure regex shape-check (`/^[a-f0-9]{64}$/.test(signature)`) if `factorId` is omitted from the cookie payload. Furthermore, the cryptographic signature check still silently falls back to a hardcoded string if the environment variable is missing: `process.env.MFA_SIGNING_SECRET || 'default-mfa-secret-change-in-prod'`. This means the MFA verification is fundamentally bypassable.

## `mock-admin-token` backdoor status
**STILL PRESENT (Critical).** In `proxy.ts` (lines 149-167), passing `?token=mock-admin-token` or `?token=fake-token` grants instantaneous, DB-bypassed `super_admin` or `candidate` access. While this is gated by `process.env.NODE_ENV !== 'production'` and `process.env.ENABLE_MOCK_AUTH === 'true'`, retaining hardcoded backdoor tokens in the proxy layer of a monolithic application is a massive supply-chain and deployment risk if environment variables are ever misconfigured.

## Recommended fix
Consolidate to a single write site by moving all session cookie management exclusively to a dedicated Next.js API route (`/api/auth/session`). Remove the client-side `document.cookie` writes in `AuthContext.tsx` entirely, and remove the `Set-Cookie` injection from `proxy.ts`. The login flow should call `/api/auth/session` via `POST` (which will set a single, authoritative, `HttpOnly`, `Domain=.talentmeshsolutions.com` cookie), and only *after* that API call succeeds should the client invoke `window.location.replace()` to the destination subdomain. This strictly serializes the cookie persistence before navigation, eliminating the race condition entirely and solving the attribute conflict.
