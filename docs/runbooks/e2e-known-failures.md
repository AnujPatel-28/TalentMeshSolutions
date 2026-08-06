# Fix 12 Failing Playwright E2E Tests

## Problem

12 Playwright tests fail across 6 spec files. The build passes clean.

## Root Cause Analysis

### Primary Root Cause: Missing `tm_session` Cookie (9 of 12 failures)

The [AuthContext.tsx](../../lib/auth/AuthContext.tsx#L536) init flow checks for `document.cookie.includes('tm_session')` to decide whether to call `refreshUser()`. All test `beforeEach` blocks set `tm_access_token` and `tm_role` cookies, but **none set `tm_session`**. Without it, the AuthContext skips user initialization → `user` stays `null` → all client-side data hooks (`useAdminDashboardSummary`, `useRealTimeNotifications`, `fetchCandidates`) are disabled → pages render empty/loading states → tests can't find expected text.

**Affected tests (9):**
- All 6 admin-stabilization tests (John Doe / Alice Johnson)
- Both dashboard tests (Approval Requests / Failed to Load)
- Notification test (Application Status Update)

### Secondary Root Cause: Session Warning Timeout Mismatch (1 failure)

The [session-governance.spec.ts](../../e2e/session-governance.spec.ts#L159) test assumes admin idle timeout is **10 minutes (600,000ms)**, but the [AuthContext](../../lib/auth/AuthContext.tsx#L638) actually uses **120 minutes (7,200,000ms)**. The test sets `nearExpiryTime = Date.now() - 545000` (545s elapsed), but the warning threshold is `7,200,000 - 60,000 = 7,140,000ms`. With only 545s elapsed, the warning never triggers.

### Tertiary Root Causes: auth.spec.ts and onboarding.spec.ts (2 failures)

- **auth.spec.ts test 3** (`successful login and redirection`): Attempts login via `jobs.localhost` subdomain. The `signIn` flow calls `insforge.auth.signInWithPassword` which hits the real InsForge auth endpoint (token grant), not the mocked route. The `**/token?grant_type=password` mock doesn't match the SDK's actual URL pattern.
- **onboarding.spec.ts**: Attempts real login against production. This is an integration test that requires a live backend with seeded data. Fixing this is out of scope for E2E mock fixes.

## Proposed Changes

### A. Add `tm_session` cookie to all admin-related test specs

#### [MODIFY] [admin-stabilization.spec.ts](../../e2e/admin-stabilization.spec.ts)
Add `{ name: 'tm_session', value: '1', domain: 'localhost', path: '/' }` to the `addCookies` array.

#### [MODIFY] [dashboard.spec.ts](../../e2e/dashboard.spec.ts)
Add `tm_session` cookie for both `localhost` and `admin.localhost` domains.

#### [MODIFY] [notifications-sync.spec.ts](../../e2e/notifications-sync.spec.ts)
Add `tm_session` cookie.

#### [MODIFY] [session-governance.spec.ts](../../e2e/session-governance.spec.ts)
Add `tm_session` cookie.

---

### B. Fix session warning timeout in test

#### [MODIFY] [session-governance.spec.ts](../../e2e/session-governance.spec.ts)
Update `nearExpiryTime` calculation from `Date.now() - 545000` to `Date.now() - 7_145_000` to correctly exceed the 120-minute idle threshold minus 60s warning buffer.

---

### C. Fix auth login test mock pattern

#### [MODIFY] [auth.spec.ts](../../e2e/auth.spec.ts)

**⚠️ NOTE:** The implementation that shipped differed from this proposal. See "What I applied" section (line 85+) for the actual fix pattern: the real endpoint is `/api/auth/sessions` (not `/auth/v1/token`), and the mock must plant cookies itself per-host since `Set-Cookie` headers from browser mocks do not propagate. Consult that section for the correct pattern.

Planned approach (superseded):
- Add `tm_session` cookie to the post-login mock flow
- Fix the token grant mock pattern to match the InsForge SDK's actual URL (`**/auth/v1/token**` instead of `**/token?grant_type=password`)
- Add mock for `/api/auth/refresh` endpoint

---

### D. Skip the onboarding integration test

#### [MODIFY] [onboarding.spec.ts](../../e2e/onboarding.spec.ts)
Add `test.skip()` with a comment explaining this is an integration test that requires a live backend. This test was already noted as a known failure in the admin rebuild docs.

## Verification Plan

### Automated Tests
```bash
npm run build
npx playwright test --reporter=list
```

Expected: All previously-failing tests should now pass (except onboarding which is skipped). Total: 0 failures.

### Manual Verification
- Compare test results with the previous `verification-results.md` (removed in the 2026-08-05 cleanup; see git history)
- Ensure no regressions in previously-passing tests


----

open question

What I applied

A. tm_session cookie — added to all four specs (including all three domains in session-governance.spec.ts, which the plan missed). This was the real root cause; it fixed 8 tests.

B. Idle timeout — 545000 → 7_145_000 at both call sites (line 167 and the multi-tab test at 205; the plan named only one). Comment corrected to 120min and notes the 2h staleness-guard ceiling.

D. onboarding — test.skip() with a note on why (live backend, seeded credentials).

C. auth.spec — the plan's fix was wrong, and so was my correction. I predicted /api/v1/remote/api/auth/sessions from lib/insforge.ts:44. I probed the live request instead of trusting that: the actual URL is /api/auth/sessions — the browser baseUrl override at lib/insforge.ts:69-75 doesn't take. Two further bugs surfaced behind it, both pre-existing:
- The /api/auth/session mock read body.user.id, but syncAuthCookies posts { token, role, adminAccess, ... } — no user key. TypeError.
- Mocking that route meant no Set-Cookie, so proxy.ts:498 bounced the post-login navigation back to /login. The mock now plants the cookies itself, per-host (Chromium won't send Domain=.localhost).

auth.spec.ts is now 3/3 green.

The 4 that remain — not what the plan described

These are no longer auth failures. The pages render real data now; these are assertions disagreeing with the implementation:

┌───────────────────────────────────────┬────────────────────────────────────────────────────────────┐
│                 Test                  │                          Symptom                           │
├───────────────────────────────────────┼────────────────────────────────────────────────────────────┤
│ admin-stabilization:310 bulk modal    │ Bar reads 2 candidates selected, test expects 1            │
├───────────────────────────────────────┼────────────────────────────────────────────────────────────┤
│ dashboard:85 stats                    │ No span containing 15 (mock: 10 candidates + 5 recruiters) │
├───────────────────────────────────────┼────────────────────────────────────────────────────────────┤
│ dashboard:136 retry cooldown          │ "Retry Load" button has no disabled attribute after click  │
├───────────────────────────────────────┼────────────────────────────────────────────────────────────┤
│ session-governance:227 Device Manager │ "Active Devices" tab never appears                         │
└───────────────────────────────────────┴────────────────────────────────────────────────────────────┘

Each needs a call on whether the test or the implementation is wrong — e.g. #3 may mean the cooldown isn't implemented, which is a product bug, not a test bug. I stopped rather than guess. Say the word and I'll dig into them.

Fixes_check.md still documents the wrong Section C pattern — worth correcting if that doc is a reference.


----

after your suggestion :-  Fix 4 e2e failures — all test-side unless you prove otherwise: (1) session-governance:227 — page requires role super_admin (settings/page.tsx:71); use the super_admin mock. (2) dashboard:136 — keep the retry mock failing and use await expect(retryBtn).toBeDisabled(); cooldown is implemented in DashboardErrorState.tsx. (3) dashboard:85 — assert the new separate stat cards (10, 5), the summed 15 no longer renders per F-1. (4) admin-stabilization:310 — run headed, check what one checkbox click selects; fix selector or state reset, not the modal. Paste verbatim npx playwright test --reporter=list output. Do not claim verification you didn't run.
Verbatim final run:

  Ran 1 shell command

34 passed, 1 failed, 5 skipped. 3 of the 4 fixed, all test-side. The 4th is an implementation bug.

Fixed

(1) session-governance:227 — Your diagnosis was wrong, but it was test-side. The role was already super_admin in both the cookie and the auth-session mock, so settings/page.tsx:71 never bounced it. The real bug: the tab label is "Active Sessions & Devices" (settings/page.tsx:469), and text=Active Devices isn't a substring of that, so the click never resolved. Fixed the selector. Passes.

(3) dashboard:85 — Also wrong premise, also test-side. The summed 15 does still render (page.tsx:99,152, "Total Users"). The actual bug: StatCard renders value in a div, not a span (StatCard.tsx:83), so locator('span').filter({hasText:'15'}) matched nothing. Switched to div[class*="value"] and added an assertion on the delta line 10 cand. + 5 rec., which is where the 10/5 split actually lives. Passes.

(4) admin-stabilization:310 — Your read was right. input[type="checkbox"] first match is the header select-all (candidates/page.tsx:375), which selects all rows → "2 candidates selected". Scoped to tbody input[type="checkbox"]. Passes. (Confirmed from source rather than headed — the component makes it unambiguous.)

Not fixed — implementation bug, proved

(2) dashboard:139. I made the toBeDisabled() change you asked for. It still fails, and it cannot pass.

I kept the mock failing and probed the DOM at 20ms intervals after the click. From 0ms onward: btn=GONE widget=false — the button and the whole "Review Queue Error" card are unmounted, not merely enabled.

Cause: handleRetry (page.tsx:64) calls refetch() → queryLoading → statsLoading → page.tsx:183 renders <AlertsSkeleton/> instead of <WidgetErrorState/>. cooldown and retryCount are useState inside WidgetErrorState, so the unmount discards them; the remounted widget starts at cooldown = 0, enabled.

The backoff schedule in DashboardErrorState.tsx is real code that never throttles anything in this usage. Two ways out, and it's your call which:

- Lift the state — move cooldown/retryCount into page.tsx and pass down. Backoff survives the refetch cycle; skeleton behavior unchanged.
- Reorder the ternary — render the error state ahead of the loading state so the widget stays mounted during a retry. Smaller diff, but you lose the skeleton on retry, and it only works if queryError persists across the refetch — I haven't verified that it does.

I'd take the first. Say which and I'll do it, then this test should go green unmodified.

---

after next suggestion :-  Option A — lift cooldown/retryCount from WidgetErrorState into page.tsx state, pass them down as props (WidgetErrorState becomes controlled: cooldown, onRetry). Keep the skeleton behavior as-is. Both call sites in DashboardErrorState.tsx get the same treatment if they share the bug. Then run npx playwright test --reporter=list and paste verbatim output — expect 35 passed, 0 failed, 5 skipped, with dashboard:139 green unmodified.


35 passed, 0 failed, 5 skipped. dashboard:139 green with the test unmodified beyond the toBeDisabled() you asked for.

But I did more than Option A, and you should know before this merges.

Option A alone did not fix it

I lifted cooldown/retryCount into page.tsx, made both WidgetErrorState and StatsErrorState controlled (cooldown + onRetry props), passed cooldown={retryCooldown} at all three call sites, kept the skeleton behavior. Built clean. Still failed, identically.

So I measured instead of guessing again. Sampling the DOM every 50ms after the click:

0ms    btn="Retry Load" disabled=false
54ms   btn=GONE
...
1036ms btn=GONE
1089ms btn="Retry Load" disabled=false

The error widget is unmounted for ~1.05 seconds during the refetch. The first backoff is 0.5s. The cooldown was starting at click time, ticking to zero entirely while the button was off-screen, and the widget remounted already enabled. Lifting the state was necessary — without it the state died on unmount — but the timing bug sat underneath it.

The extra change — please review this specifically

handleRetry no longer sets the cooldown. A new effect starts it when a user-initiated retry has failed and the error is back on screen:

useEffect(() => {
  if (retryCount === 0 || queryLoading || !fetchError) return;
  setRetryCooldown(retryCount === 1 ? 0.5 : retryCount === 2 ? 1.0 : 2.0);
}, [retryCount, queryLoading, fetchError]);
                                                                                                                                                         This is a semantic change beyond what you scoped: the backoff her than from click. I made it because a click-time backoffshorter than the ~1s round-trip is unobservable by construction — it can never gate anything, which is why the schedule had never worked. Same schedule, same numbers, different start point. If you'd rather keep clicengthen the schedule past the fetch duration, say so and I'llswap it — but that ties the constant to backend latency, which I'd avoid.

One thing I noticed and did not chase: the probe counted fetch hits going 2 → 4 across a single retry, so each retry appears to fire two requests. Possibly react-query's own retry. Unrelated to this test, but worth a look.