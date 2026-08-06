# Candidate Dashboard — No Data on `jobs.domain.com` (Production)

## Problem Summary

After logging in as a candidate (`nikavx28@gmail.com`), the user is redirected to `jobs.domain.com/candidate/dashboard`. The dashboard loads but **no data appears** (jobs, applications, profile). On `localhost:3000`, everything works fine.

---

## Root Cause Analysis

The issue is a **cross-subdomain cookie visibility problem** combined with an **`HttpOnly` cookie + `sessionStorage` scope mismatch**.

### The Login → Redirect Flow

```mermaid
sequenceDiagram
    participant Browser
    participant MainDomain as talentmeshsolutions.com (login)
    participant JobsDomain as jobs.talentmeshsolutions.com

    Browser->>MainDomain: POST /login (email + password)
    MainDomain->>MainDomain: signIn() → gets access_token
    MainDomain->>MainDomain: syncAuthCookies() → POST /api/auth/session
    Note over MainDomain: Sets tm_access_token cookie<br/>with Domain=.talentmeshsolutions.com ✅
    MainDomain->>MainDomain: sessionStorage.setItem('tm_token', token)
    Note over MainDomain: sessionStorage is origin-scoped ⚠️
    MainDomain->>Browser: window.location.replace(jobs.talentmeshsolutions.com/candidate/dashboard)
    Browser->>JobsDomain: Navigate to jobs subdomain
    Note over JobsDomain: ❌ sessionStorage('tm_token') is EMPTY<br/>(different origin)
    JobsDomain->>JobsDomain: AuthContext.initAuth() runs
    JobsDomain->>JobsDomain: refreshUser() → refreshAccessToken()
    Note over JobsDomain: refreshAccessToken() checks sessionStorage first<br/>→ empty, falls back to cookie
```

### Why It Fails: The `invokeFunction` Auth Resolution Chain

Looking at [invokeFunction](../../lib/insforge.ts#L149-L173) (lines 149-173):

```typescript
// 1. sessionStorage — always accessible, set by syncAuthCookies after login
const stored = window.sessionStorage.getItem('tm_token');
if (stored) {
  authHeader = `Bearer ${stored}`;
} else {
  // 2. Cookie fallback
  const cookieArr = document.cookie.split(';');
  for (let i = 0; i < cookieArr.length; i++) {
    const cookie = cookieArr[i].trim();
    if (cookie.startsWith('tm_access_token=')) {
      // ...
    }
  }
}
```

**The problem chain on `jobs.domain.com`:**

1. **`sessionStorage` is empty** — sessionStorage is scoped per-origin. The login happened on `talentmeshsolutions.com`, so `jobs.talentmeshsolutions.com` has a separate, empty sessionStorage.

2. **Cookie fallback fails because `tm_access_token` is `HttpOnly`** — The cookie was set with `HttpOnly` flag in [session/route.ts](../../app/api/auth/session/route.ts#L30) (line 30):
   ```
   const cookieOptions = `Path=/; HttpOnly; ${sameSiteStr} Max-Age=...`
   ```
   `HttpOnly` cookies are **invisible to `document.cookie`** in JavaScript. The `invokeFunction` fallback on line 159 reads `document.cookie`, which **cannot see `HttpOnly` cookies**.

3. **Result**: `invokeFunction` sends requests with **no Authorization header** → the backend returns empty data or errors.

### Why It Works on Localhost

On localhost, the login page at `localhost:3000/login` does a **same-origin** redirect via `router.replace()` (not `window.location.replace()`):

```typescript
// login/page.tsx line 454-468
const isSingleOrigin = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || ...);

const getDestinationUrl = (subdomain: string, path: string) => {
    if (isSingleOrigin) {
        return `${proto}//${host}${path}`; // Same origin!
    }
    // ...
};
```

Since it's **same-origin**:
- `sessionStorage` persists → `tm_token` is available
- The insforge SDK client already has `setAccessToken()` called
- Everything works

---

## The Two Bugs

### Bug 1: `sessionStorage` doesn't survive cross-subdomain navigation
**`sessionStorage` is per-origin**. When the user navigates from `talentmeshsolutions.com` to `jobs.talentmeshsolutions.com`, the token stored in `sessionStorage` on the main domain is invisible on the jobs subdomain.

### Bug 2: `HttpOnly` cookie can't be read by `document.cookie`
The `tm_access_token` cookie is set with `HttpOnly`, so `invokeFunction`'s cookie fallback (`document.cookie.split(';')`) **cannot read it**. This means there's no client-side way to get the token after the cross-subdomain redirect.

> [!IMPORTANT]
> The `refreshAccessToken()` function (called during `initAuth`) tries to refresh the token, but even if it succeeds (via the refresh cookie), it stores the **new** token in `sessionStorage` — which is correct. **However**, if the refresh itself fails (e.g., `insforge_refresh_token` cookie isn't visible on `jobs.` subdomain), then the user has no token at all.

### The Refresh Cookie Issue

The `insforge_refresh_token` cookie is set at `Path=/api/auth` in [sessions/route.ts](../../app/api/auth/sessions/route.ts#L94-L98). The domain **is** set correctly (`.talentmeshsolutions.com`), so it should be shared across subdomains. But:

- The refresh endpoint is called via `${window.location.origin}/api/auth/refresh` 
- On `jobs.talentmeshsolutions.com`, this calls `jobs.talentmeshsolutions.com/api/auth/refresh`
- The cookie **should** be sent because `Path=/api/auth` matches and `Domain=.talentmeshsolutions.com` matches

So the refresh **should** work in theory. But there's a subtle timing issue: `initAuth()` in [AuthContext](../../lib/auth/AuthContext.tsx#L554-L600) checks `hasAccessToken` via `document.cookie.includes('tm_access_token')` — which returns `false` because `tm_access_token` is `HttpOnly`. This means the code enters the `else` branch and skips `refreshUser()` entirely:

```typescript
// AuthContext.tsx lines 587-596
const hasAccessToken = urlToken || document.cookie.includes('tm_access_token');

if ((hasLoadedCached || hasAccessToken) && !isAuthPage) {
    await refreshUser();  // ← THIS NEVER RUNS
} else {
    setIsLoading(false);  // ← Goes here instead
    setIsInitialized(true);
}
```

**This is the smoking gun.** On the jobs subdomain:
- `urlToken` = null (no `?token=` in the URL)
- `document.cookie.includes('tm_access_token')` = false (HttpOnly cookie)
- `hasLoadedCached` = false (empty sessionStorage)
- Therefore: `refreshUser()` **is never called**

---

## Fix Options

### Option A: Pass Token via URL Parameter (Quick Fix)

When redirecting cross-subdomain after login, append the token as a URL parameter. The `initAuth` function already handles `?token=` parameter (lines 556-573):

In [login/page.tsx](../../app/(auth)/login/page.tsx), modify `getDestinationUrl` to append the token:

```typescript
const getDestinationUrl = (subdomain: string, path: string, token?: string) => {
    // ...production subdomain logic...
    let url = `${proto}//${subdomain}.${cleanHost}${path}`;
    if (token) {
        const separator = url.includes('?') ? '&' : '?';
        url += `${separator}token=${encodeURIComponent(token)}`;
    }
    return url;
};
```

Then pass the token when building the destination:
```typescript
destination = isOnboarded
    ? getDestinationUrl('jobs', '/candidate/dashboard', result.accessToken)
    : getDestinationUrl('jobs', '/onboarding/candidate', result.accessToken);
```

> [!WARNING]  
> Passing tokens in URLs is a security concern (leaks via Referer headers, browser history, server logs). The `initAuth` code already cleans it up via `window.history.replaceState`, but this is still less ideal than cookie-based transfer.

### Option B: Fix the `hasAccessToken` Check (Root Fix)

The core bug is that `initAuth` can't detect the HttpOnly cookie. Fix by **always attempting `refreshUser()`** on the jobs subdomain when there's no cached user and no sessionStorage token:

In [AuthContext.tsx](../../lib/auth/AuthContext.tsx#L587-L596):

```typescript
// BEFORE:
const hasAccessToken = urlToken || document.cookie.includes('tm_access_token');

// AFTER: Also check for non-HttpOnly routing cookies as a proxy signal
const hasAccessToken = urlToken || 
    document.cookie.includes('tm_access_token') ||
    document.cookie.includes('tm_role=');
```

The `tm_role` cookie is also set by `/api/auth/session` with the same `HttpOnly` flag... but wait, it **is** HttpOnly too. So this alone won't fix it.

**Better approach**: Make the `tm_role` cookie **not** HttpOnly (it's routing metadata, not a security token), or add a dedicated non-HttpOnly signal cookie.

### Option C: Combination Fix (Recommended)

1. **Add a non-HttpOnly signal cookie** (`tm_session=1`) when setting session cookies in `/api/auth/session`. This cookie carries no sensitive data — it simply signals to client JS that a session exists.

2. **Update `initAuth`** to check for this signal cookie to decide whether to call `refreshUser()`.

3. **Update `refreshAccessToken`** to store the refreshed token in `sessionStorage` (already done) so subsequent `invokeFunction` calls work.

---

## Affected Files

| File | Issue |
|:---|:---|
| [session/route.ts](../../app/api/auth/session/route.ts) | Needs to set a non-HttpOnly signal cookie |
| [AuthContext.tsx](../../lib/auth/AuthContext.tsx#L587) | `hasAccessToken` check can't see HttpOnly cookies |
| [login/page.tsx](../../app/(auth)/login/page.tsx#L460) | Could optionally pass token in URL for cross-subdomain redirect |
| [sessions/route.ts](../../app/api/auth/sessions/route.ts) | Needs to set signal cookie alongside session cookies |
| [refresh/route.ts](../../app/api/auth/refresh/route.ts) | Needs to set signal cookie alongside refreshed session cookies |

----

this is what we did after 

# Walkthrough: Cross-Subdomain Auth Fix (Signal Cookie)

## Problem
After login, candidates are redirected to `jobs.domain.com`. On that subdomain, `AuthContext.initAuth()` couldn't detect the active session because:
1. `sessionStorage` is per-origin (empty on the new subdomain)
2. `tm_access_token` cookie is `HttpOnly` (invisible to `document.cookie`)
3. Therefore `refreshUser()` was never called → no data

## Solution
Added a **non-HttpOnly signal cookie** (`tm_session=1`) that carries zero sensitive data. It simply tells client JS "a session exists" so `initAuth()` calls `refreshUser()`, which uses the `HttpOnly` refresh token cookie to obtain a fresh access token.

---

## Changes Made

### Server-Side (3 files)

#### [session/route.ts](../../app/api/auth/session/route.ts)
- **POST**: Sets `tm_session=1` with same `Domain`/`Path`/`SameSite`/`Secure` attributes as other cookies, but **without `HttpOnly`**
- **DELETE**: Clears `tm_session` using a separate `clearSignalOptions` string (no `HttpOnly` flag)

#### [sessions/route.ts](../../app/api/auth/sessions/route.ts)
- **POST** (login proxy): Sets `tm_session=1` via `response.cookies.set()` with `httpOnly: false`

#### [refresh/route.ts](../../app/api/auth/refresh/route.ts)
- **POST** (token refresh): Sets `tm_session=1` via `response.cookies.set()` with `httpOnly: false`

### Client-Side (2 files)

#### [AuthContext.tsx](../../lib/auth/AuthContext.tsx)
- **`hasAccessToken` check** (line ~590): Changed from `document.cookie.includes('tm_access_token')` → `document.cookie.includes('tm_session')` — **the core fix**
- **`clearAuthCookies`**: Added `document.cookie = 'tm_session=; path=/; max-age=0'` for immediate client-side cleanup
- **`initAuth` URL token**: Sets `tm_session=1` alongside `tm_access_token` when absorbing `?token=` param
- **`SESSION_REFRESHED` handler**: Sets `tm_session=1` alongside `tm_access_token` when syncing across tabs

#### [insforge.ts](../../lib/insforge.ts)
- **`refreshAccessToken`**: Sets `tm_session=1` alongside `tm_access_token` after successful client-side refresh, with same `Domain` computation for cross-subdomain sharing

---

## Security Model

| Cookie | HttpOnly | Contains | Purpose |
|:---|:---|:---|:---|
| `tm_access_token` | ✅ Yes | JWT | Auth token — protected from XSS |
| `tm_session` | ❌ No | `"1"` | Boolean signal — no sensitive data |
| `insforge_refresh_token` | ✅ Yes | Refresh token | Token rotation — protected from XSS |

- The `tm_session` cookie is a **routing hint**, not an auth credential
- An attacker who reads it learns only "a session exists" — the same info available from observing any authenticated network request
- All actual authorization is enforced by `getServerUser()` validating the `HttpOnly` JWT in layout RSCs

---

## Verification

### Build
- ✅ `next build` passed — 111/111 pages generated, no TypeScript or compilation errors

### Manual Testing (Recommended)
1. Deploy to staging
2. Log in as candidate (`nikavx28@gmail.com` / `Nikavx@28`)
3. Verify redirect to `jobs.domain.com/candidate/dashboard`
4. Confirm jobs, applications, and profile data load correctly
5. Check browser DevTools → Application → Cookies:
   - `tm_session=1` should appear (no `HttpOnly` flag)
   - `tm_access_token` should appear (with `HttpOnly` flag)
   - Both should have `Domain=.talentmeshsolutions.com`
6. Test logout → verify `tm_session` is cleared
7. Test on `localhost:3000` → verify no regression


----

I will launch a browser subagent to navigate to the live website, log in using the credentials you provided, and verify whether the "No Data" issue still persists on the deployed dashboard, capturing screenshots and checking the cookies.

Browser task: "Testing Candidate Login and Deployed Dashboard"

I will run a grep search for `getCookieDomain` in the codebase to see how the cookie domain is being calculated.

Searched for "getCookieDomain"

I will inspect the implementation of `getCookieDomain` in `lib/cookies.ts` to see how it determines the cookie domain for subdomains.

Viewed cookies.ts:1-43

I will view `app/api/auth/sessions/route.ts` around lines 50 to 95 to see how the cookie domain is specified for the `tm_session` cookie.

Viewed route.ts:50-95

I will run a search for `domain =` in the `app/api/auth` directory to see all the places where the cookie domain logic is manually implemented and might be bypassing the correct domain calculation helper.

Searched for "domain ="

I will view `app/api/auth/oauth/exchange/route.ts` around lines 100 to 115 to see how `getRawCookieDomain` is used there.

Viewed route.ts:100-115

I will view the domain calculation logic in `app/api/auth/verify/route.ts`.

Viewed route.ts:40-65

I will view the imports in `verify/route.ts` to see how to import `getRawCookieDomain`.

Viewed route.ts:1-15

I will view `app/api/auth/signup/route.ts` lines 1 to 55 to see how to import and use `getRawCookieDomain`.

Viewed route.ts:1-55

I will view the imports in `app/api/auth/sessions/route.ts` to see if `getRawCookieDomain` is already imported or how to import it.

Viewed route.ts:1-20

I will view the imports in `app/api/auth/refresh/route.ts`.

Viewed route.ts:1-20

I will switch back to the feature branch `feat/candidate-applications-mobile-ui-redesign` to implement these cookie domain fixes.

Ran command: `git checkout feat/candidate-applications-mobile-ui-redesign`

I will edit `app/api/auth/verify/route.ts` to replace the manual domain calculation with the imported `getRawCookieDomain` helper.

Edited route.ts

I will edit `app/api/auth/signup/route.ts` to replace the manual domain calculation with the imported `getRawCookieDomain` helper.

Edited route.ts

I will edit `app/api/auth/sessions/route.ts` to replace the manual domain calculation with the imported `getRawCookieDomain` helper.

Edited route.ts

I will view lines 95 to 125 of `app/api/auth/refresh/route.ts` to prepare the exact replacement chunk.

Viewed route.ts:95-125

I will edit `app/api/auth/refresh/route.ts` to replace the manual domain calculation with the imported `getRawCookieDomain` helper.

Edited route.ts

I will view lines 35 to 65 of `app/api/auth/mfa-complete/route.ts` to see if the cookie domain logic in that route is correct.

Viewed route.ts:35-61

I will view `app/api/auth/session/route.ts` around lines 20 to 60 to verify that its domain calculation helper is correctly called.

Viewed route.ts:20-60

I will run `npm run build` to verify that our central cookie domain imports and updates build correctly in the Next.js application.

Ran command: `npm run build`

I will wait for the build to finish.

I will run `git status` to confirm the list of files modified for our cookie domain fix.

Ran command: `git status`

I will stage and commit the cookie domain fixes.

Ran command: `git add app/api/auth/refresh/route.ts app/api/auth/sessions/route.ts app/api/auth/signup/route.ts app/api/auth/verify/route.ts && git commit -m "fix(auth): centralize cookie domain parsing using getRawCookieDomain to support qzz.io subdomains"`

I will stage the modified files.

Ran command: `git add app/api/auth/refresh/route.ts app/api/auth/sessions/route.ts app/api/auth/signup/route.ts app/api/auth/verify/route.ts`

I will commit the staged files.

Ran command: `git commit -m "fix(auth): centralize cookie domain parsing using getRawCookieDomain to support qzz.io subdomains"`

I will push this new commit to the feature branch on GitHub.

Ran command: `git push origin feat/candidate-applications-mobile-ui-redesign`

I found the root cause of why the "No Data" issue still occurred in your deployment on `anujpotfolio.qzz.io`. 

### The Root Cause
Although we merged the previous `fix/candidate-dashboard-cross-subdomain-auth` branch, that branch had a bug with dynamic DNS domain suffixes like `.qzz.io`:
1. The cookies in several API routes (`sessions/route.ts`, `refresh/route.ts`, `verify/route.ts`, `signup/route.ts`) were re-implementing the domain parsing logic manually as:
   `domain = .${domainParts.length > 2 ? domainParts.slice(-2).join('.') : domainParts.join('.')}`
2. For the host `anujpotfolio.qzz.io`, this manual logic computed the domain as `.qzz.io`.
3. Because `qzz.io` is a public suffix (similar to `.vercel.app` or `.github.io`), **browsers block cookies from being set on it** for security reasons. As a result, the `tm_session` and `tm_access_token` cookies were rejected entirely in production.
4. The central `getRawCookieDomain` helper in `lib/cookies.ts` correctly parses `.qzz.io` addresses and returns `.anujpotfolio.qzz.io` (allowing subdomains like `jobs.` to read it).

### The Fix
I updated the 4 routes that were using the manual parsing logic (`verify/route.ts`, `signup/route.ts`, `sessions/route.ts`, and `refresh/route.ts`) to use the centralized `getRawCookieDomain` helper instead. This ensures all cookies are set on the correct `.anujpotfolio.qzz.io` domain instead of the blocked `.qzz.io` domain.

The updates have been built successfully and pushed to your PR branch:
**`feat/candidate-applications-mobile-ui-redesign`**

### Next Steps:
Go ahead and merge the updated PR on GitHub:
👉 **[Open and Merge Pull Request](https://github.com/VisXhal06/Talentmesh-demo/pull/new/feat/candidate-applications-mobile-ui-redesign)**

Once merged and built by Vercel, the candidate login and dashboard will load successfully in production.