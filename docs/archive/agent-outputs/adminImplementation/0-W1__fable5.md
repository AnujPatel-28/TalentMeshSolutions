# W1 — Close the mock-auth bypass   ·   model: Fable 5   ·   phase: 0   ·   date: 2026-07-19

## Prompt given

Execute W1 per `12_Admin_Production_Readiness_Execution_Plan.md` §W1: replace the single-condition mock-auth gate in `getServerUser()` with three independent conditions — (1) `ALLOW_MOCK_AUTH === 'true'`, (2) `VERCEL_ENV !== 'production'`, (3) token equals harness-injected `E2E_MOCK_ADMIN_TOKEN` / `E2E_MOCK_CANDIDATE_TOKEN` (unset ⇒ deny) — apply the same to the candidate branch, and plumb the tokens through `playwright.config.ts`.

## What changed

The mock-identity surface turned out to be **four files, not one**, inconsistently gated. All four now route through a single shared gate.

**New: `lib/mock-auth.ts`** — `resolveMockRole(token)` returns `'admin' | 'candidate' | null` only when all three conditions hold. No hardcoded token literals anywhere in the gate; unset env ⇒ always `null`. Safe to import from shared client/server code (env vars are undefined in the client bundle, so the gate is closed there).

**Modified:**

| File | Before | After |
|---|---|---|
| `lib/server-auth.ts` (`getServerUser`) | `ALLOW_MOCK_AUTH` alone + literal `'mock-admin-token'`/`'fake-token'` | `resolveMockRole(token)` |
| `lib/auth/server-auth.ts` (`resolveSessionFromToken`) | divergent gate: `NODE_ENV !== 'production' && ENABLE_MOCK_AUTH === 'true'` (flag set nowhere) + literals | `resolveMockRole(accessToken)` — divergent flag removed |
| `lib/api/profile.ts` (`getMyProfile`) | **completely ungated** literal token checks | `resolveMockRole(token)` |
| `app/api/auth/refresh/route.ts` (`POST`) | `ALLOW_MOCK_AUTH` alone + substring scan `cookieHeader.includes('mock-admin-token')` | exact match on `request.cookies.get('tm_access_token')` via `resolveMockRole`; minted values come from the env tokens |
| `playwright.config.ts` | webServer env: `ALLOW_MOCK_AUTH` only | + `E2E_MOCK_ADMIN_TOKEN` / `E2E_MOCK_CANDIDATE_TOKEN` from harness env (defaults preserve current literals locally) |
| `e2e/mock-tokens.ts` (new) + 6 spec files | ~30 hardcoded `'mock-admin-token'`/`'fake-token'` literals | all replaced with `MOCK_ADMIN_TOKEN` / `MOCK_CANDIDATE_TOKEN` consts reading the same env |

Spec files touched: `admin-stabilization`, `auth`, `dashboard`, `notifications-sync`, `security-regressions`, `session-governance` (`.spec.ts`). No CI workflow change needed: the `security-mock-auth-off` job starts the server with no flag and no token envs, so the C-2-flagoff 401 assertion still holds.

## SQL authored (if any)

None.

## Verification run

`npm run build` clean. Then curl matrix against production builds (`npm run start`):

| Server env | Request | Result |
|---|---|---|
| flag on + `VERCEL_ENV=production` + tokens set | forged admin cookie → `/api/recruiter/status` | **401** ✅ |
| same | forged candidate cookie → same API | **401** ✅ |
| same | forged admin cookie → `/dashboard/admin` | redirect chain ends at `/unauthorized`, no admin session ✅ |
| same | forged cookie → `POST /api/auth/refresh` | **401**, no mock session minted ✅ |
| flag on, non-prod, tokens set (e2e config) | candidate mock → API | **200** ✅ (mock auth still works for e2e) |
| same | admin mock → recruiter-only API | **403** ✅ (role boundary intact) |
| same | admin mock → refresh | **200**, session minted ✅ |
| same | guessed token `some-guessed-token` | **401** ✅ |
| flag on, token envs **unset** | literal `mock-admin-token` cookie | **401** ✅ (condition 3 holds) |

Even with `ALLOW_MOCK_AUTH=true` leaked to production AND the token value known, `VERCEL_ENV=production` alone now blocks the bypass — three independent failures required, as specified.

## Deviations / assumptions

- **Scope grew from 1 file to 4** — the spec named only `lib/server-auth.ts`; the other three mock sites (`lib/auth/server-auth.ts`, `lib/api/profile.ts` ungated, refresh route) would have left the bypass open, so all were unified onto the shared gate. Every changed line still traces to "close the mock-auth bypass".
- `lib/auth/server-auth.ts`'s `ENABLE_MOCK_AUTH` flag (set nowhere — the branches were dead) was removed in favor of the shared gate rather than kept as a second flag.
- Local defaults in `playwright.config.ts` / `e2e/mock-tokens.ts` remain `mock-admin-token`/`fake-token` so local `npm run e2e` needs no setup; CI can export high-entropy values and everything follows. The security property does not depend on token secrecy (conditions 1–2 already block production).
- The refresh route's mock admin still reports `role: 'super_admin'` vs `'admin'` in `getServerUser` — pre-existing inconsistency, preserved (surgical-change rule).
- **Full Playwright suite not run** (only curl-level verification + build). The shared-webServer env is identical to the verified e2e-sim config, and spec literals were replaced 1:1, so specs should be unaffected — but a suite run before merge is recommended.
- `/unauthorized` returns 500 (also with no cookie — pre-existing, W6 territory, plus a `/_not-found` client-manifest invariant in the local build). Not caused by W1; noting for W6.

## Open questions for the advisor

1. Is `VERCEL_ENV` the correct production signal for this deployment target? If the app ever moves off Vercel, condition 2 silently evaluates true (unset ≠ 'production') and the gate weakens to two conditions. If a non-Vercel deploy is planned, gate on an explicit `DEPLOY_ENV=production` instead.
2. Doc-12's [SUGGESTION] end-state (delete mock auth entirely, seed a real e2e admin) remains open — recommend scheduling it once the R-2 kit lands.
