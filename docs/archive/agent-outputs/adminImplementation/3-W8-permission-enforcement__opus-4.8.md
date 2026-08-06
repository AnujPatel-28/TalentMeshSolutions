# W8 — Enforce the permission matrix (verification report)

**Model:** Claude Opus 4.8 · **Date:** 2026-07-20 · **Branch HEAD:** `7b07fb3 feat(W9): admin authorization regression suite`

## Summary

**No code changes were required. W8 is already implemented on this branch.** Every item in the task
brief was found already present in the source. I verified each one against the code rather than the
doc, then ran the three verification commands. Diff produced by this task: **zero files changed.**

The task brief describes `lib/api/handler.ts` as "currently only checks `allowedRoles`". That is
stale — it no longer matches the source. The `requiredPermission` gate is present at
`lib/api/handler.ts:56-61`, and all three `app/api/admin/**/route.ts` files already pass it.

## Item-by-item verification

| Brief item | State in source | Evidence |
|---|---|---|
| 1. Find `WithApiOptions` / `allowedRoles` check | Found. Doc says ~line 47-51; actual `allowedRoles` check is `lib/api/handler.ts:50-54`, `WithApiOptions` at `:17-26` | file read |
| 2. Extend `WithApiOptions` with `requiredPermission?: { resource: Resource; action: Action }` | **Already present**, `lib/api/handler.ts:23` | `requiredPermission?: { resource: Resource; action: Action };` |
| 3. Call `canPerform()` after `allowedRoles`, 403 on fail | **Already present**, `lib/api/handler.ts:56-61`, destructured at `:37`, imported at `:5` | see below |
| 4. Add `requiredPermission` to every `app/api/admin/**/route.ts` | **All 3 routes already have it** | table below |
| 5. Don't touch edge functions | Not touched | zero diff |
| 6. No client-side changes | None made | zero diff |

The gate as it exists (`lib/api/handler.ts:56-61`):

```ts
// 2b. Permission (doc 14 §4.3) — same matrix the edge preamble consults.
if (requireAuth && requiredPermission) {
  if (!user || !canPerform(user.role, requiredPermission.resource, requiredPermission.action)) {
    return NextResponse.json({ error: 'forbidden', code: 'permission_denied' }, { status: 403 });
  }
}
```

Note the error shape differs from the `allowedRoles` gate above it (`{ error: 'Forbidden' }`, no
`code`). Both return 403. Not a defect, but clients distinguishing the two cases should key on
`code: 'permission_denied'`.

`lib/permissions.ts` is a 5-line re-export of `insforge/functions/_shared/permissions.ts` — so
`withApi` and the edge preamble genuinely consult one matrix, no fork. Confirmed by reading both files.

## Routes covered

Complete set of `app/api/admin/**/route.ts` — glob returned exactly three files.

| Route | Method | resource / action | `allowedRoles` | Narrows admin access? |
|---|---|---|---|---|
| `app/api/admin/verification/queue/route.ts:13` | GET | `verification` / `view` | `['admin','super_admin']` | **No** — `PERMISSIONS.admin.verification` includes `view` |
| `app/api/admin/verification/decide/route.ts:17` | POST | `verification` / `approve` | `['admin','super_admin']` | **No** — `PERMISSIONS.admin.verification` includes `approve` |
| `app/api/admin/send-proposal/route.ts:18` | POST | `billing` / `edit` | `['admin','super_admin']` | **⚠️ YES — see below** |

### ⚠️ Behavior narrowing: `POST /api/admin/send-proposal`

This is the one route where the matrix is stricter than `allowedRoles`, and it needs review before merge.

- `allowedRoles: ['admin','super_admin']` admits the `admin` role.
- `PERMISSIONS.admin.billing = ['view']` (`insforge/functions/_shared/permissions.ts:28`) — no `edit`.
- `PERMISSIONS.super_admin.billing = ['view','edit','export']` (`:18`).
- Net effect: **an `admin`-role user gets 403 `permission_denied` on send-proposal. Effectively super_admin-only.**

The in-file comment at `send-proposal/route.ts:17` states this is deliberate ("a billing write, so
super_admin only"). It is consistent with the matrix design. Flagging it explicitly per the brief:
if any admin-role staff member currently sends custom proposals, they lose that capability the moment
this ships. The `allowedRoles` list on that route is now misleading — it still names `admin`, but
`admin` can never pass. Consider tightening it to `['super_admin']` so the two gates agree, or leave
as-is if the matrix is intended to be the sole authority. **Not changed — out of W8's scope and it
would be a behavior-neutral cosmetic edit.**

The other two examples the brief anticipated — billing *export* and settings *deletion* — have **no
Next.js API route** in `app/api/admin/**`. They live in the Deno edge functions (excluded per item 5).
So no narrowing there from this workstream.

## Additional observations (no action taken)

1. **`app/api/company/[companyId]/route.ts:16`** — `GET` allows `['recruiter','admin','super_admin']`
   and branches on `user.role === 'admin' || 'super_admin'` at `:19`, but carries no
   `requiredPermission`. It's outside `app/api/admin/**` so it's outside the brief's scope, but it is
   an admin-privileged read path (`companies`/`view`) that the matrix does not currently gate. Worth
   a follow-up ticket.
2. **Coverage is thin by nature, not by omission.** Only 3 admin routes exist under `app/api/admin/`;
   the bulk of admin surface is edge functions. W8's blast radius on the Next.js side is genuinely small.
3. **No route in `app/api/admin/**` exercises** `settings`, `team`, `plans`, `audit_logs`, `reports`,
   `candidates`, `recruiters`, `jobs`, or `applications`. Nothing to gate there yet.

## Verification — verbatim output

All three commands run from `C:\Users\Anuj\Desktop\tm_web\Talentmesh-demo`.

### `npx tsc --noEmit`

One error, **pre-existing and unrelated** to W8 — a framer-motion `Variants` type mismatch in a
candidate-facing page, no permissions/auth code involved, and the file is untouched by this task
(`git status` shows it unmodified). Output tail:

```
app/dashboard/candidate/[role_id]/applications/page.tsx(686,37): error TS2322: Type '{ enter: (dir: number) => { x: number; opacity: number; }; center: { x: number; opacity: number; transition: { x: { type: string; stiffness: number; damping: number; }; opacity: { duration: number; }; }; }; exit: (dir: number) => { ...; }; }' is not assignable to type 'Variants'.
  Property 'center' is incompatible with index signature.
    Type '{ x: number; opacity: number; transition: { x: { type: string; stiffness: number; damping: number; }; opacity: { duration: number; }; }; }' is not assignable to type 'Variant'.
      Type '{ x: number; opacity: number; transition: { x: { type: string; stiffness: number; damping: number; }; opacity: { duration: number; }; }; }' is not assignable to type 'TargetAndTransition'.
        Types of property 'transition' are incompatible.
          Type '{ x: { type: string; stiffness: number; damping: number; }; opacity: { duration: number; }; }' is not assignable to type 'Transition<any> | undefined'.
            Type '{ x: { type: string; stiffness: number; damping: number; }; opacity: { duration: number; }; }' is not assignable to type 'TransitionWithValueOverrides<any>'.
              Type '{ x: { type: string; stiffness: number; damping: number; }; opacity: { duration: number; }; }' is not assignable to type 'StyleTransitions'.
                The types of 'x.type' are incompatible between these types.
                  Type 'string' is not assignable to type 'AnimationGeneratorType | undefined'.
```

**Caveat, stated plainly:** I did not empirically prove this error predates the branch by stashing
and re-running. The basis for calling it pre-existing is that the file is unmodified in `git status`
and this task changed zero files — so it cannot have been introduced here.

### `npx vitest run` — 44/44 pass

```
 RUN  v4.1.9 C:/Users/Anuj/Desktop/tm_web/Talentmesh-demo


 Test Files  7 passed (7)
      Tests  44 passed (44)
   Start at  16:34:46
   Duration  40.26s (transform 2.49s, setup 24.17s, import 2.93s, tests 429ms, environment 133.92s)
```

Includes `__tests__/permissions-matrix.test.ts`.

### `npx playwright test --reporter=list` — 41 passed, 7 skipped, 0 failed

**No admin 403 regressions.** The admin-boundary specs pass. Tail of output (list reporter, 48 tests):

```
  ok 17 [chromium] › e2e\auth.spec.ts:45:7 › Authentication Flow › successful login and redirection (role: candidate) (2.9s)
  ok 18 [chromium] › e2e\dashboard.spec.ts:6:7 › Dashboard Accessibility & Role Protection › unauthenticated user redirected to login from /dashboard (3.1s)
  ok 19 [chromium] › e2e\dashboard.spec.ts:11:7 › Dashboard Accessibility & Role Protection › unauthenticated user redirected to login from /dashboard/admin (3.2s)
  ok 20 [chromium] › e2e\dashboard.spec.ts:18:9 › Dashboard Accessibility & Role Protection › Authorized Navigation Smoke Tests › candidate dashboard loading state contains skeleton or title (3.0s)
  ok 21 [chromium] › e2e\dashboard.spec.ts:23:9 › Dashboard Accessibility & Role Protection › Authorized Navigation Smoke Tests › recruiter dashboard loading state contains skeleton or title (3.0s)
  ok 22 [chromium] › e2e\dashboard.spec.ts:85:9 › Dashboard Accessibility & Role Protection › Admin Dashboard UI & Caching Integration Tests › admin dashboard loads stats and review queue correctly (2.7s)
  ok 23 [chromium] › e2e\dashboard.spec.ts:104:9 › Dashboard Accessibility & Role Protection › Admin Dashboard UI & Caching Integration Tests › admin dashboard manual refresh button disables during execution (3.8s)
  ok 25 [chromium] › e2e\dashboard.spec.ts:165:9 › Dashboard Accessibility & Role Protection › Admin Dashboard UI & Caching Integration Tests › mobile viewport locks body scroll when drawer is open (1.4s)
  ok 24 [chromium] › e2e\dashboard.spec.ts:139:9 › Dashboard Accessibility & Role Protection › Admin Dashboard UI & Caching Integration Tests › admin dashboard handles partial widget failures with isolated retry cooldown (6.2s)
  ok 26 [chromium] › e2e\notifications-sync.spec.ts:171:7 › Notification System & Real-Time Sync E2E Tests › Should load NotificationCenter inbox tab by default (2.8s)
  ok 27 [chromium] › e2e\notifications-sync.spec.ts:180:7 › Notification System & Real-Time Sync E2E Tests › Should open Queue Monitor and run simulation triggers (3.9s)
  -  29 [chromium] › e2e\onboarding.spec.ts:8:8 › Candidate E2E Flow: Login -> Onboarding -> Resume Upload -> Job Application › Complete onboarding and apply for a job
  ok 28 [chromium] › e2e\notifications-sync.spec.ts:200:7 › Notification System & Real-Time Sync E2E Tests › Should render live template previews with safe whitelisted variables (3.7s)
  ok 30 [chromium] › e2e\security-regressions.spec.ts:51:7 › H-9 — Recruiter route guard (P0-2) › unauthenticated → /dashboard/recruiter/* redirects away from recruiter (login or setup) (2.6s)
  ok 31 [chromium] › e2e\security-regressions.spec.ts:67:7 › H-9 — Recruiter route guard (P0-2) › candidate session → /dashboard/recruiter/* redirects away from recruiter portal (1.9s)
  -  33 [chromium] › e2e\security-regressions.spec.ts:120:7 › C-2 — mock-admin-token must not mint sessions when ALLOW_MOCK_AUTH is off › C-2-flagoff: mock cookie → 401 on api route when ALLOW_MOCK_AUTH is absent [CI-job: security-mock-auth-off]
  ok 32 [chromium] › e2e\security-regressions.spec.ts:82:7 › H-9 — Recruiter route guard (P0-2) › candidate session → /dashboard/recruiter URL is not accessible (redirect confirmed) (1.5s)
  ok 34 [chromium] › e2e\security-regressions.spec.ts:142:7 › C-2 — mock-admin-token must not mint sessions when ALLOW_MOCK_AUTH is off › C-2-control: candidate mock cookie → 403 on admin route; confirms role boundary works (455ms)
  ok 35 [chromium] › e2e\security-regressions.spec.ts:162:7 › C-4 — /api/jobs POST body injection (HTTP layer) › unauthenticated POST /api/jobs → access denied (401 or 404, not 200/201) (292ms)
  ok 36 [chromium] › e2e\security-regressions.spec.ts:194:7 › C-4 — /api/jobs POST body injection (HTTP layer) › C-4: extra company_id/recruiter_id fields are not rejected with 400 (Zod strips them) (96ms)
  ok 38 [chromium] › e2e\security-regressions.spec.ts:246:7 › Admin boundary — /api/admin/verification/queue › unauthenticated GET → access denied (401 or 403, not 200) (55ms)
  ok 37 [chromium] › e2e\security-regressions.spec.ts:218:7 › C-4 — /api/jobs POST body injection (HTTP layer) › C-4: unauthenticated POST /api/jobs with injected fields → access denied (49ms)
  -  40 [chromium] › e2e\security-regressions.spec.ts:276:8 › Admin boundary — /api/admin/verification/queue › admin cookie → auth passes (not 401 and not 403) [needs real-JWT fixture]
  ok 39 [chromium] › e2e\security-regressions.spec.ts:254:7 › Admin boundary — /api/admin/verification/queue › candidate cookie → 403 (role not in [admin, super_admin]) (94ms)
  ok 41 [chromium] › e2e\security-regressions.spec.ts:288:7 › Admin boundary — /api/admin/verification/decide › unauthenticated POST → access denied (401 or 403, not 200) (142ms)
  -  43 [chromium] › e2e\security-regressions.spec.ts:316:8 › Admin boundary — /api/admin/verification/decide › admin cookie + invalid UUID → 400 (schema rejects malformed request_id) [needs real-JWT fixture]
  -  44 [chromium] › e2e\security-regressions.spec.ts:324:8 › Admin boundary — /api/admin/verification/decide › admin cookie + valid UUID → auth passes (not 401, not 403) [needs real-JWT fixture]
  ok 42 [chromium] › e2e\security-regressions.spec.ts:299:7 › Admin boundary — /api/admin/verification/decide › candidate cookie POST → 403 (62ms)
  ok 45 [chromium] › e2e\session-governance.spec.ts:164:7 › Session Governance & Cleanup E2E Tests › Session Warning displays modal on inactivity and extends on user action (7.9s)
  ok 46 [chromium] › e2e\session-governance.spec.ts:195:7 › Session Governance & Cleanup E2E Tests › Multi-tab session warning propagates and extends across pages (7.7s)
  ok 47 [chromium] › e2e\session-governance.spec.ts:227:7 › Session Governance & Cleanup E2E Tests › Device Manager displays sessions and supports revocation (2.8s)
  ok 48 [chromium] › e2e\session-governance.spec.ts:284:7 › Session Governance & Cleanup E2E Tests › Quarantine Manager displays quarantined items and handles restoration (2.6s)

  7 skipped
  41 passed (1.9m)
```

(Interleaved `[BROWSER CONSOLE]` lines were elided from the block above for readability; they are
lazy-image/autocomplete notices and a 401 from an unauthenticated fixture, present in passing runs.)

## ⚠️ Coverage gap in the verification signal

The e2e suite **does not actually exercise the `requiredPermission` gate.** Read the skips:

- Test 40 — "admin cookie → auth passes" — **skipped**, `[needs real-JWT fixture]`
- Tests 43, 44 — admin-cookie decide cases — **skipped**, same reason

Every admin-boundary test that *passes* asserts the negative path with an **unauthenticated or
candidate** cookie — those are rejected by the `allowedRoles` gate at `handler.ts:50-54`, before
`canPerform` is ever consulted. So the green playwright run proves **no regression**, but it does
**not** prove the matrix gate fires correctly for a real `admin` vs `super_admin` session. The
`admin`-role 403 on send-proposal flagged above is **unverified end-to-end** — it is derived from
reading the matrix, not from an executed request.

`__tests__/permissions-matrix.test.ts` covers `canPerform` as a pure function. The wiring between
`withApi` and a real session is the untested seam. Closing it needs the real-JWT fixture those three
skipped tests are waiting on — recommend that as the W8 follow-up before this is called done.

## Bottom line

W8's code is in place and correct against the matrix. One route (`send-proposal`) narrows `admin`
access and needs sign-off. The gate itself has never been executed against a real admin session in
CI — that's the honest gap.
