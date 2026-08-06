Prompt 2 — Opus (or Gemini Pro 3.1): Doc 10 auth-token fix ("logged in but no data")

You are executing docs/specs/10_Auth_Token_Propagation_And_Subdomain_Fix.md in the Talentmesh-demo project. It is a complete implementation spec — follow it exactly, sections 4.1 (S1–S4) and 4.2 (C1–C4). Do not redesign; the architecture decision (single HttpOnly parent-domain tm_access_token cookie as the ONLY token source) is locked.

Read first: doc 10 in full, then the files it names: app/api/auth/session/route.ts, app/api/auth/refresh/route.ts, app/api/auth/oauth/exchange/route.ts, lib/cookies.ts (getRawCookieDomain), app/api/v1/remote/[...path]/route.ts:98-111, lib/insforge.ts (:78-90, :149-174, :446), lib/auth/AuthContext.tsx (:511, :570), lib/auth/candidate-access.ts, useSessionRefresh.

Implement all of S1–S4 and C1–C4 as one changeset. Critical coupling from §6: S1 (parent-domain HttpOnly cookie writes) and C2 (deleting the JS-readable document.cookie/sessionStorage token copies) MUST land together — C2 alone logs everyone out. S3 converts the proxy's silent anon fallback into a 401 on authenticated reads so C4's refresh can recover.

Constraints:
- Working-tree changes only. No live deploys, no edge-function redeploys, no DB changes.
- Use the existing getRawCookieDomain helper for the Domain attribute — never hard-code the domain.
- Keep the tm_session=1 JS-readable signal cookie (no JWT in it).
- Do not add postMessage token sharing or ?token= URL hops (explicitly rejected in §4.3).
- Add the S2 unit assertion for getRawCookieDomain covering jobs./app./admin. subdomains.

Verify before reporting: npx tsc --noEmit clean vs baseline; then walk through doc 10 §5 checks 1–6 and state for each whether it is verifiable locally or needs the deployed environment.

Output: the full diff summary (files + what changed per S/C item), the §5 verification results, and anything where the source deviated from what doc 10 claims (line numbers moved, helper missing, etc.). This goes to a deep Fable review before merge.

---

The command classifier has been unavailable for an extended stretch, so I can't run tsc or vitest right now. The code is complete; here's the report with that gap stated plainly.

Diff summary

Server (S1–S4)

┌──────┬────────────────────────────────────────┬──────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Item │                  File                  │                                                Change                                                │
├──────┼────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ S1   │ app/api/auth/session/route.ts          │ SameSite=None→Lax on the token/routing cookies (POST + DELETE). HttpOnly and Domain via              │
│      │                                        │ getCookieDomain were already correct.                                                                │
├──────┼────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────┤
│      │                                        │ Write site doc 10 missed. Wrote tm_access_token with no HttpOnly and no Domain — a JS-readable,      │
│ S1   │ app/api/storage/[...path]/route.ts:166 │ host-only coke sibling subdomains. Now HttpOnly + Secure + Lax +        │
│      │                                        │ getCookieDomain. Also fixed resolveToken to accept only JWT-shaped bearers.                          │
├──────┼────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────┤
│ S2   │ __tests__/lib/cookies.test.ts (new)    │ Asserts .talentmeshsolutions.com for jobs./app./admin. + apex, port handling, localhost undefined,   │
│      │                                        │ and no publi                                                            │
├──────┼────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────┤
│      │                                        │ 401 AUTH_TOKlaims a session (tm_session or a token cookie) but the      │
│ S3   │ app/api/v1/remote/[...path]/route.ts   │ token is unusable. Exempts public GETs, auth endpoints, storage asset GETs, and genuinely anonymous  │
│      │                                        │ callers. Plu                                                            │
├──────┼────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ S4   │ lib/server-auth.ts                     │ Unchanged, a                                                            │
└──────┴────────────────────────────────────────┴──────────────────────────────────────────────────────────────────────────────────────────────────────┘

Client (C1–C4)

┌──────┬───────────────────────────────────────────┬──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Item │                   File                    │                 Change                                              │
├──────┼───────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ C1   │ lib/insforge.ts                           │ Removed tre and the sessionStorage/cookie sourcing in               │
│      │                                           │ invokeFunction; credentials: 'include' now unconditional.                                        │
├──────┼───────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────┤
│ C2   │ lib/insforge.ts, lib/auth/AuthContext.tsx │ Deleted every document.cookie/sessionStorage['tm_token'] token write, the cross-tab token        │
│      │                                           │ broadcastest (§4.3). tm_session=1 kept.                             │
├──────┼───────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ C3   │ lib/auth/candidate-access.ts              │ Corrected stale session tokens" comment; added unauthenticated so a │
│      │                                           │  401 is no longer read as "not onboarded". Wired into the dashboard gate.                        │
├──────┼───────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────┤
│ C4   │ candidate-access.ts,                      │ 401 → /api/auth/refresh → retry once. invokeFunction already did this.                           │
│      │ DashboardLayoutClient, onboarding pages   │                                                                     │
└──────┴───────────────────────────────────────────┴──────────────────────────────────────────────────────────────────────────────────────────────────┘

The one design call I made

Doc 10 lists only insforge.ts and AuthContext as token sources, but ~25 pages/components read sessionStorage['tm_token'] directly and send a literal
Authorization: Bearer null when it's empty — and the proxy onl was absent or the anon key, so Bearer null was forwardedupstream and 401'd. Rather than edit 25 files, I fixed it once in the proxy: a caller header is honoured only if it's a real JWT; anything else means "no
token" and is upgraded from the cookie. Those 25 readers now wen variables are follow-up cleanup, not touched here.

§5 verification status

┌──────┬─────────────────────────────────────┬──────────────────────────────────────────────────────────────────────────┐
│  #   │                Check                │                                                Status                                                 │
├──────┼─────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────┤
│ 1–2, │ Regression, cross-subdomain, DB     │ Deployed env only — needs real subdomains + nikavx28@gmail.com.                                       │
│  5   │ cross-check                         │                                                                          │
├──────┼─────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 3    │ Cookie deleted → 401                │ Locally testablleting both cookies is by definition anonymous and        │
│      │                                     │ correctly stays anon; deleting only tm_access_token gives the 401.                                    │
├──────┼─────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────┤
│ 4    │ No JWT in                           │ Statically verified: all writes deleted; the SDK persists only a PKCE verifier, no JWT. Confirm in a  │
│      │ document.cookie/sessionStorage      │ browser.                                                                 │
├──────┼─────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 6    │ No single-domain regression         │ Needs the e2e s                                                          │
├──────┼─────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ —    │ tsc --noEmit vs baseline            │ Not run. Baselire-existing framer-motion error in                        │
│      │                                     │ candidate/[role_id]/applications/page.tsx:686, unrelated. My changes are unverified by the compiler.  │
├──────┼─────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────┤
│ —    │ vitest (S2 test)                    │ Not run.                                                                                              │
└──────┴─────────────────────────────────────┴──────────────────────────────────────────────────────────────────────────┘

Please run npx tsc --noEmit and npx vitest run __tests__/lib/cle review — I'd rather flag this than imply a clean run Ididn't get.

Deviations from doc 10

- S1 was largely already done. session, refresh, and oauth/exchange already wrote HttpOnly + parent-domain cookies. The real leaks were the storage route
and the client copies.
- getServerUser is in lib/server-auth.ts, not the only one — a second, unused copy lives in lib/insforge.ts:524. Doc S4 calls it "the single server
boundary"; it isn't. Flagged, not deleted.
- Doc missed three C2 casualties I had to fix: DashboardLayoutClient:569 gated redirects on the now-invisible tm_access_token (would bounce users to
/login), :436 fed realtime auth from it, and three onboarding ookie sync when the token was null (proxy redirect loop).
- session/route.ts never sets tm_refresh_token despite S1 naming it; only refresh/oauth do.
- getTokenRemainingSeconds (lib/insforge.ts) is now callerless it's an exported symbol so I left it.
- Doc line numbers were accurate throughout.

Risk to check before merge

E2E specs inject a non-JWT tm_access_token=mock-admin-token. Under S3 that reads as "claims a session, token unusable" → 401 on any unmocked authenticacall, where it previously degraded to an empty 200. The specs ashboard at the browser, so they may pass — but I couldn't run them. I deliberately didn't add an ALLOW_MOCK_AUTH bypass to the 401: loosening a prod auth boundary to suit test fixtures is the wrong trade. If they fail, make the mock token JWT-shaped.


----
