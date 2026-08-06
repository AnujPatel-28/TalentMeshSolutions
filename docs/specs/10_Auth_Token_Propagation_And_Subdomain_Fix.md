# 10 — Auth Token Propagation & Subdomain Fix ("logged in but no data")

**Status:** Implementation spec — ready for execution
**Owner:** Platform / Security
**Version:** 1.0
**Last Updated:** 2026-07-16
**Deploy priority:** **P0** (data-invisible bug in production; also a hard blocker for the subdomain split)

Cross-refs: `01_Auth_Security_Audit_Report.md` (finding **H-8** — token exposed to JS; this is the functional face of the same root cause), `03` (the `/api/v1/remote` proxy).

---

# 1. Problem statement (reproduced + verified)

**Symptom:** a candidate logs in successfully, the dashboard renders, but **no data shows** (empty applications, saved jobs, profile, resumes).

**Reproduced with account** `nikavx28@gmail.com` (candidate). Verified against the **live database** (MCP `run-raw-sql`, 2026-07-16) — the data is NOT missing, it is *invisible*:

| Table | Rows for this user |
|---|---|
| `applications` | 2 |
| `saved_jobs` | 2 |
| `candidate_profiles` | 1 |
| `candidate_resumes` | 1 |
| `notifications` | 1 |
| `profiles` | `role=candidate, is_active=true, completed_onboarding=true, status=pending` |

The rows exist. Every one of those tables is RLS-scoped to `auth.uid()`, so they are returned **only when the request carries the user's JWT**. The data being empty means the read reached Postgres **as the anon role**.

This is NOT `status='pending'` gating: the candidate access gate (`lib/auth/candidate-access.ts`) only reads `completed_onboarding` (which is `true`), not `status`. So the account is fully onboarded — the bug is purely token propagation.

---

# 2. Root cause (confirmed against source)

The page renders "logged in" but the data is empty because **two different code paths resolve the session differently**:

1. **Server RSC layout** (`app/dashboard/candidate/layout.tsx:49`) calls `getServerUser()`, which reads the `tm_access_token` cookie **server-side** (available to the server even when HttpOnly). → the layout sees a valid user → the page renders. ✅
2. **Client data reads** (dashboard function via `invokeFunction`, direct `insforge.database.from(...)`, and the onboarding gate `getCandidateAccessState`) go through the browser and depend on the token reaching `/api/v1/remote`, where the proxy upgrades the anon key to the user JWT **only if it finds a valid token** (`app/api/v1/remote/[...path]/route.ts:98-111`). ❌ when it doesn't.

**How the browser supplies that token is fragile** (`lib/insforge.ts:78-82` and `invokeFunction` `lib/insforge.ts:149-174`):

- Primary source is **`sessionStorage['tm_token']`**. `sessionStorage` is **per-tab AND per-origin** — it is not shared across browser tabs, and **not shared across subdomains** (`jobs.` / `app.` / `admin.`). A fresh tab or a different subdomain starts with it empty → the SDK sends only the anon key.
- Fallback is the **`tm_access_token` cookie**. This only rescues the read if the cookie is (a) present on the current origin, (b) non-expired, and (c) `Domain`-scoped to cover the current host. Today the token is written in **three inconsistent places** (H-8): an HttpOnly server cookie, a **non-HttpOnly `document.cookie` copy** (`lib/insforge.ts:446`, `lib/auth/AuthContext.tsx:511/570`), and `sessionStorage`. The client copies are often **host-only** (no `Domain`), so they are not sent to a sibling subdomain.

**Net effect:** whenever `sessionStorage` is empty (new tab, or any subdomain other than the one login happened on) **and** the cookie fallback is missing/expired/wrong-Domain, every client read silently degrades to anon → RLS returns nothing → "logged in but no data." The onboarding gate (`getCandidateAccessState`) degrades the same way and reports "not onboarded", compounding the empty UI.

**Is it the subdomain thing?** — Yes, that is the dominant trigger, and it will get *worse* the moment you split the portals across `jobs.` / `app.` / `admin.`, because `sessionStorage` is **never** shared across those origins, so every candidate session will fall entirely onto the cookie path. If the cookie is not correctly parent-domain-scoped, **every** candidate will see this bug, not just some.

---

# 3. Target subdomain architecture (your spec)

| Portal | Subdomain | Physical routes (proxy rewrite target) |
|---|---|---|
| Candidate | `jobs.<domain>` | `app/dashboard/candidate/**` |
| Recruiter | `app.<domain>` | `app/dashboard/recruiter/**` |
| Admin | `admin.<domain>` | `app/dashboard/admin/**` |

`proxy.ts` already keys routing off the host subdomain; the auth cookie must be shared across all three. That requires **one** cookie scoped to the registrable parent domain (`Domain=.<domain>`), sent automatically to every subdomain **and** to each subdomain's same-origin `/api/v1/remote`.

---

# 4. The fix (industry best practice: one HttpOnly, parent-domain cookie as the single token source)

The correct model (OWASP session-management guidance): the access token lives in **exactly one** cookie —

```
Set-Cookie: tm_access_token=<jwt>;
            Domain=.<domain>;        # shared across jobs./app./admin. and their /api/v1/remote
            Path=/;
            HttpOnly;                # not readable by JS → XSS can't steal it (fixes H-8)
            Secure;                  # HTTPS only
            SameSite=Lax;            # sent on top-level navigations between subdomains; blocks CSRF
            Max-Age=<access token ttl>
```

— and **the client never reads or writes it.** Client fetches to same-origin `/api/v1/remote` carry it automatically; the proxy already upgrades anon→user from this cookie. Nothing depends on `sessionStorage` or a JS-readable copy.

## 4.1 Server-side changes

| # | File / function | Change |
|---|---|---|
| S1 | Login/session write path: `app/api/auth/session/route.ts`, `app/api/auth/refresh/route.ts`, OAuth exchange `app/api/auth/oauth/exchange/route.ts` | Set `tm_access_token` (and `tm_refresh_token`) as **HttpOnly + Secure + SameSite=Lax + `Domain=.<domain>`** using the existing `getRawCookieDomain(host)` helper (`lib/cookies.ts`) so the Domain is derived, not hard-coded. This is the ONLY place the token cookie is written. |
| S2 | `lib/cookies.ts` `getRawCookieDomain` | Verify it returns `.<domain>` for the production host (for `talentmeshsolutions.com` it already returns `.talentmeshsolutions.com`, which covers `jobs.`/`app.`/`admin.`). Add a unit assertion for the 3 subdomains. |
| S3 | Proxy `app/api/v1/remote/[...path]/route.ts:98-111` | No logic change needed (it already reads `tm_access_token` and upgrades). Add: if the cookie token is **expired**, return `401` on authenticated (non-public) reads instead of silently falling back to anon — so the client can trigger refresh instead of rendering empty. This converts the silent-empty failure into a recoverable 401. |
| S4 | `lib/server-auth.ts` `getServerUser` | Unchanged (already reads the cookie). Keep it as the single server boundary. |

## 4.2 Client-side changes

| # | File / function | Change |
|---|---|---|
| C1 | `lib/insforge.ts:78-90` and `invokeFunction` `:149-174` | **Stop sourcing the token from `sessionStorage`/`document.cookie`.** The browser SDK and `invokeFunction` should rely on the browser automatically sending the HttpOnly cookie to same-origin `/api/v1/remote`. Ensure every such fetch uses `credentials: 'include'` (invokeFunction already does for authed calls — make it unconditional for same-origin). Remove `insforge.setAccessToken(sessionStorage...)`. |
| C2 | `lib/auth/AuthContext.tsx:511, 570` and `lib/insforge.ts:446` | **Delete the non-HttpOnly `document.cookie` token writes and the `sessionStorage['tm_token']` write** (H-8). Keep only the non-sensitive `tm_session=1` signal cookie (JS-readable, no token) for "am I logged in" UI checks. |
| C3 | `getCandidateAccessState` (`lib/auth/candidate-access.ts`) | No change to logic, but it now works because the cookie reaches the proxy. **Fix the misleading comment** claiming it is "never affected by stale session tokens" — it is entirely dependent on the token reaching the proxy. Optionally, distinguish "row not found because unauthenticated" (proxy returned 401 (S3)) from "row genuinely absent" so a token failure surfaces as an auth error, not a false "not onboarded". |
| C4 | Token refresh (`useSessionRefresh`, `AuthContext.refreshUser`) | Refresh must run per-origin: on each subdomain, a 401 from the proxy (S3) triggers `POST /api/auth/refresh`, which re-sets the parent-domain HttpOnly cookie. No cross-tab/`sessionStorage` coordination needed. |

## 4.3 Why not just "copy the token to sessionStorage on every subdomain"
That keeps a JS-readable token (XSS-exfiltratable — H-8) and still breaks in a fresh tab (sessionStorage is per-tab). The HttpOnly parent-domain cookie is the standard, is strictly more secure, and is simpler. Do not add cross-subdomain `postMessage` token-sharing or a `?token=` URL hop (the URL hop leaks tokens to history/logs — also H-8).

---

# 5. Verification (must pass before closing)

1. **Regression (the reported bug):** log in as a candidate on `jobs.<domain>`, hard-reload, open a **new tab** on `jobs.<domain>` → applications/saved-jobs/profile all render. Repeat in the new tab **without** re-login (proves no `sessionStorage` dependence).
2. **Cross-subdomain:** log in on `jobs.<domain>`, navigate to `app.<domain>` (recruiter, if the account had that role) → session recognized without re-login (cookie shared).
3. **Proxy token check:** with the cookie deleted in devtools, a candidate data read returns **401** (S3), not an empty 200; the client then refreshes and recovers.
4. **Security:** `document.cookie` in the browser console shows **no** `tm_access_token` (only `tm_session=1`); `sessionStorage` holds no JWT. (Closes H-8.)
5. **DB cross-check:** the counts in §1 now render in the UI for `nikavx28@gmail.com`.
6. **No regression** for existing single-domain deploy: same tests on the current host still pass (the `Domain=.<domain>` cookie is sent same-origin too).

---

# 6. Model assignment (per `08` → Model assignment)

This is **T-High** — it rewrites the session/token lifecycle in a deployed, security-critical path (touches auth boundary, XSS surface, CSRF posture). Assign **Opus / Gemini Pro 3.1** to execute, with a **deep Fable 5 review** of the diff against §4 and §5 and against `01` H-8. Do **not** ship without the §5 verification passing in a production-like build. The proxy 401 change (S3) and the cookie-write consolidation (S1/C2) should land together — shipping C2 (removing the JS token) without S1 (parent-domain HttpOnly cookie) would log users out.

---

# 7. Summary

The candidate's data was never missing — it was fetched as the anonymous role because the browser's token propagation (sessionStorage + JS cookie copies) did not deliver the JWT to `/api/v1/remote`. `sessionStorage` is per-tab/per-origin and will fail **by design** once the portals are split across `jobs.`/`app.`/`admin.`. The fix is the industry-standard one: a single **HttpOnly, Secure, SameSite=Lax, `Domain=.<domain>`** access-token cookie as the only token source, with the client relying on automatic cookie transmission — which simultaneously resolves this bug, the subdomain requirement, and audit finding **H-8**.
