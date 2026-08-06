# R-14 — structural hygiene + extended W9 (Claude/Sonnet split)

Scope: doc `14_Admin_Portal_Rebuild_Architecture.md` §R-14. Per the dispatch, this is only the
test-extension half (Gemini owns cleanup separately, not covered here).

## What was already done (verified before touching anything)

- `docs/archive/agent-outputs/adminImplementation/README.md` post-launch punch list confirms W1, W2, R-1,
  R-2, W5, W6, R-3, R-4, R-10 shipped. `git log --oneline -i --grep W9` → `7b07fb3 feat(W9): admin
  authorization regression suite` — W9's base suite (`e2e/admin-authz.spec.ts`, 6 tests) exists and
  matches its own header philosophy (real guard chain, no `page.route` mocking of the guard).
- `git log --oneline -i --grep W8` → **no results**. README also lists W8 ("Enforce the permission
  matrix fully") under "Quality/hardening (doc 12, W8–W10)" as still deferred, not under the done
  launch-blocker list.

## What the dispatch asked for, and what actually turned out to be true

The dispatch's three extension cases, checked against the real code rather than the commit-message
search alone:

**1. `content` role blocked from non-content resources — NOT IMPLEMENTED, genuinely blocked.**
`lib/mock-auth.ts`'s `resolveMockRole()` only mints four identities: `admin`, `candidate`,
`recruiter`, `suspended_admin`. There is no `content` mock role and no `E2E_MOCK_CONTENT_TOKEN` in
`e2e/mock-tokens.ts` / `playwright.config.ts`. Separately, the resource the dispatch named
(`candidates:view`) is enforced only inside the Deno edge function
(`insforge/functions/admin-candidates/index.ts` → `checkPermission` from
`insforge/functions/_shared/permissions.ts`) — the client calls it directly via
`invokeFunction('admin-candidates', …)`, never through a Next.js API route, so there is no
mock-auth path to it at all (same category of gap the file's own header already documents for the
Deno-only checks). Writing this test would require adding `content`-role mock-auth support first —
out of scope for "extend the existing spec," and not attempted. **If this coverage is wanted, the
prerequisite is: add `content` to `resolveMockRole()` + a new mock token, then either add a
Next.js-layer route gated on a non-content resource, or accept this stays a live-backend-only
check.**

**2. `admin` blocked from a genuine super_admin-only action at the SERVER level — IMPLEMENTED, via
a different route than the dispatch's example.** The dispatch's example (`settings` edit /
`team` delete) is also Deno-only: `app/dashboard/admin/team/page.tsx` and
`lib/hooks/useAdminSettings.ts` both call `invokeFunction('admin-settings', …)` directly; there is
no `/api/admin/settings` or `/api/admin/team` Next.js route, so — same as case 1 — no mock-auth
path exists to it. However, `lib/permissions.ts` re-exports the *same* single-source-of-truth
matrix (`insforge/functions/_shared/permissions.ts`) for the Next.js side, and
`lib/api/handler.ts`'s `withApi` genuinely enforces it via `requiredPermission` +`canPerform()`.
Grepping `app/api/admin` for `requiredPermission` found exactly one route where an `admin`-role
mock session hits a permission the matrix denies:
`app/api/admin/send-proposal/route.ts` — `allowedRoles: ['admin','super_admin']`,
`requiredPermission: { resource: 'billing', action: 'edit' }`. `PERMISSIONS.admin.billing` is
`['view']` only (super_admin has `['view','edit','export']`), so a mock `admin` session must pass
the coarse role gate and then get 403'd by the finer-grained matrix check — exactly the R-14/W8
defect class the dispatch describes, just via `billing` instead of `settings`/`team`. Added as a
new test in the existing `describe` block, following the file's real-guard-chain style (real
cookies, real route, no interception of the guard).

  First attempt at this test failed for a reason worth recording: `proxy.ts` has its own coarser
  gate at line 562 (`pathname.startsWith('/api/admin') && !isAdmin && !hasAdminAccessCookie` →
  `403 {error:'Forbidden'}`, no `code` field) that runs *before* the request reaches `withApi`, and
  `isAdmin` there is derived purely from the `tm_role` cookie (not the token). My first version of
  the test only set `tm_access_token`, so it got 403'd by the middleware with the wrong body shape
  instead of by the permission-matrix check it was meant to exercise. Fixed by adding
  `tm_role: 'admin'` alongside `tm_access_token`, matching every other cookie-setting test already
  in this file. This was a test-setup bug, not a product finding.

**3. Forged-cookie denial / suspended-staff-denial-on-every-function — left as-is, not attempted.**
Per the dispatch, these are legitimately Deno-only (`requireStaff` in
`insforge/functions/_shared/adminAuth.ts`) with no mock-auth path, and the existing file already
documents them honestly as `test.describe.skip('Live-backend-only checks …')`. Not asked to close
this for real (would mean a standalone live-backend script per `0-W1__fable5.md`'s curl-matrix
pattern) — left untouched.

## Diff

`e2e/admin-authz.spec.ts`: one test added to the `Admin authorization guard (W9)` describe block
(between the "suspended admin" and "forged cookie" tests), no other lines changed.

```ts
// R-14/W9 extension: 'admin' blocked from a super_admin-only permission-matrix action.
// The spec's example (settings/team) is enforced only in the Deno edge function
// (admin-settings, insforge/functions/_shared/permissions.ts) which has no mock-auth path —
// same documented gap as the Live-backend-only block below. /api/admin/send-proposal is the
// one route where the SAME matrix (lib/permissions.ts -> canPerform) is enforced by
// lib/api/handler.ts's withApi at the Next.js layer, reachable with the existing mock admin
// token: 'admin' passes allowedRoles but PERMISSIONS.admin.billing is ['view'] only, so
// requiredPermission: {resource:'billing', action:'edit'} must 403 it.
test("admin (not super_admin) blocked from a billing write by the permission matrix — real withApi enforcement", async ({ context }) => {
  await context.addCookies([
    { name: 'tm_access_token', value: MOCK_ADMIN_TOKEN, domain: 'localhost', path: '/' },
    { name: 'tm_role', value: 'admin', domain: 'localhost', path: '/' },
  ]);
  const res = await context.request.post('/api/admin/send-proposal', { data: {} });
  expect(res.status()).toBe(403);
  expect((await res.json()).code).toBe('permission_denied');
});
```

## Verification (verbatim)

`npx vitest run`:

```
 RUN  v4.1.9 C:/Users/Anuj/Desktop/tm_web/Talentmesh-demo


 Test Files  8 passed (8)
      Tests  46 passed (46)
   Start at  23:36:35
   Duration  38.58s (transform 2.19s, setup 31.71s, import 2.36s, tests 467ms, environment 137.61s)
```

`npx playwright test e2e/admin-authz.spec.ts --reporter=list --workers=1` (final, post-fix run —
see note below on why `--workers=1` and a clean server were needed):

```
Running 9 tests using 1 worker

  ok 1 [chromium] › e2e\admin-authz.spec.ts:20:7 › Admin authorization guard (W9) › unauthenticated → redirected to /login (3.2s)
  ok 2 [chromium] › e2e\admin-authz.spec.ts:36:7 › Admin authorization guard (W9) › candidate role → denied at the proxy layer (generic /unauthorized, not the RSC redirect) (2.3s)
  ok 3 [chromium] › e2e\admin-authz.spec.ts:46:7 › Admin authorization guard (W9) › recruiter role → denied at the proxy layer (generic /unauthorized, not the RSC redirect) (1.7s)
  ok 4 [chromium] › e2e\admin-authz.spec.ts:56:7 › Admin authorization guard (W9) › suspended admin with a stale admin tm_role cookie still reaches the RSC and is bounced (A-2 backstop) (2.6s)
  ok 5 [chromium] › e2e\admin-authz.spec.ts:70:7 › Admin authorization guard (W9) › active admin → passes both the proxy gate and the RSC guard, reaches the dashboard (1.4s)
  ok 6 [chromium] › e2e\admin-authz.spec.ts:88:7 › Admin authorization guard (W9) › admin (not super_admin) blocked from a billing write by the permission matrix — real withApi enforcement (160ms)
  ok 7 [chromium] › e2e\admin-authz.spec.ts:98:7 › Admin authorization guard (W9) › a stale/forged admin role cookie with a garbage access token is still denied — RSC backstop (3.1s)
  -  8 [chromium] › e2e\admin-authz.spec.ts:117:7 › Live-backend-only checks (not run in CI — see file header) › suspended admin gets 403 from every admin-* edge function
  -  9 [chromium] › e2e\admin-authz.spec.ts:123:7 › Live-backend-only checks (not run in CI — see file header) › admin (not super_admin) gets 403 from admin-settings team/settings actions

  2 skipped
  7 passed (35.2s)
```

Note on process: the first full `npx playwright test --reporter=list` run (whole suite, 2 workers)
showed 3 admin-authz failures including 2 pre-existing tests this change never touched
(`suspended admin…`, `active admin…`), both failing with an unexpected `/login?rd=1` redirect. A
clean rerun of just this file with `--workers=1` (nothing listening on :3000 beforehand, confirmed
via `netstat`) passed those two cleanly — consistent with a `reuseExistingServer` race against the
previous run's server teardown, not a regression. Only the newly-added test's failure was real
(the `tm_role` cookie bug above), and is fixed in the diff shown.

## Recommendation for full R-14 W9 closure

Case 1 (`content` role) needs, as a prerequisite, `content`-role mock-auth support
(`lib/mock-auth.ts` + `e2e/mock-tokens.ts` + `playwright.config.ts` env) before it can be written
honestly. Once that exists, the actual enforcement to test is still Deno-only for every resource
checked so far (`candidates`, `content`, `settings`, `team` all route through `invokeFunction`
directly) — so even with a mock `content` token, there is currently no Next.js-layer route to hit
for a "content blocked from non-content resource" case without either adding one or accepting it as
a fourth live-backend-only check alongside the two already documented.
