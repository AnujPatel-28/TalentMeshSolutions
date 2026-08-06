# Fix: "Finish Setup" doesn't reach candidate dashboard

**Status:** Fixed 2026-07-30
**Reported by:** Live testing on `jobs.anujpotfolio.qzz.io`

## Symptom

On candidate onboarding, step 4 (Documents & Links), clicking **Finish Setup** did nothing
visible. The browser stayed on `/onboarding/candidate` — no error, no navigation. Network trace
showed the profile save succeeding, then `POST /api/auth/refresh` returning **401**, followed by
several `dashboard`/`candidate` requests that never actually changed the URL.

Same underlying pattern also existed in the recruiter onboarding "Finish Setup" and "Skip for
now" flows (not yet reported, found while tracing this bug).

## Root cause

`proxy.ts` gates `/dashboard/*` and `/onboarding/*` on the **`tm_onboarding` cookie**
(`proxy.ts:113`), not on the `profiles.completed_onboarding` DB column. So finishing onboarding
requires two separate things to both succeed:

1. Persist `completed_onboarding = true` in the DB (via the `candidate-profile` PUT — this part
   worked).
2. Sync the `tm_onboarding` cookie to match, by calling `refreshAccessToken()` to get a bearer
   token and `POST /api/auth/session` with `onboardingComplete: true`.

The onboarding-finish handlers did step 2 **conditionally** (`if (token) { ...sync... }`) but then
navigated to the dashboard **unconditionally**, regardless of whether the sync actually happened:

```ts
// app/onboarding/candidate/page.tsx (before fix)
try {
    const token = await refreshAccessToken();
    if (token) {
        await fetch('/api/auth/session', { ... onboardingComplete: true ... });
    }
    // no else — a failed refresh was silently ignored
} catch (err) {
    console.warn('Failed to sync auth cookies after onboarding', err);
}

router.replace(`/dashboard/candidate/${user.id}?onboarding_success=true`); // ran either way
```

When `refreshAccessToken()` failed (its underlying `POST /api/auth/refresh` returned 401 in the
observed trace — see "Open question" below), `token` was falsy, the `if` block never ran, and
`/api/auth/session` was never called (confirmed: no such request appears anywhere in the captured
Network list). The code did **not** throw, so the `catch` never fired either — nothing warned the
user, and nothing stopped the redirect.

The redirect then hit `proxy.ts`'s onboarding gate, which read the **stale** `tm_onboarding`
cookie (still `false`), and bounced the request straight back to `/onboarding/candidate`
(`proxy.ts:433-435`). Net effect: click Finish Setup → app tries to navigate to the dashboard →
proxy immediately redirects it back to onboarding → user sees nothing happen.

### Duplicated in three places

The identical "sync cookie conditionally, navigate unconditionally" pattern existed in:

- `app/onboarding/candidate/page.tsx` — `handleContinue`, "Finish Setup ✓" (the one actually hit)
- `app/onboarding/recruiter/documents/page.tsx` — `handleFinish`, "Finish Setup"
- `app/onboarding/recruiter/documents/page.tsx` — inline `onClick`, "Skip for now"

## Fix

Added a shared helper, `syncOnboardingRoutingCookie(role)`, in `lib/insforge.ts` (next to
`refreshAccessToken`). It retries the refresh once (absorbs a transient failure) and returns
whether the cookie sync actually succeeded:

```ts
export async function syncOnboardingRoutingCookie(role: string): Promise<boolean> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const token = await refreshAccessToken();
      if (token) {
        await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, role, onboardingComplete: true }),
        });
        return true;
      }
    } catch (err) {
      console.warn('Failed to sync auth cookies after onboarding', err);
    }
    if (attempt === 0) await new Promise(r => setTimeout(r, 500));
  }
  return false;
}
```

All three call sites now use this helper and **stop navigating on failure**:

- `app/onboarding/candidate/page.tsx` — on `!synced`, shows `'Could not finish setup — please try
  again.'` via the existing `error` state/banner and re-enables the button (`setIsSaving(false)`),
  instead of redirecting into a route the proxy will bounce back from.
- `app/onboarding/recruiter/documents/page.tsx` — same behavior added to both "Finish Setup" and
  "Skip for now" (this page had no error UI before; added an `error` state and the same error
  banner style used on the candidate page, reusing the existing `styles.errorBanner` class from
  `onboarding.module.css`). Also tightened the outer catch on "Finish Setup", which previously
  navigated to the dashboard on *any* thrown error ("fallback for safety") — that's the same
  defect class (redirect into a gated route without confirming onboarding actually completed), so
  it now shows the error instead.

Because `completed_onboarding` is already persisted server-side by the time the cookie sync is
attempted, a user who sees the error can just click the button again — no re-upload, no lost work.

## Server-side changes

None. `proxy.ts`'s gating logic was not touched — it is correct (it's supposed to require the
cookie). `/api/auth/refresh` internals were not touched.

## Client-side changes

- `lib/insforge.ts` — added `syncOnboardingRoutingCookie(role)`.
- `app/onboarding/candidate/page.tsx` — `handleContinue` now aborts + shows an error on sync
  failure instead of always navigating.
- `app/onboarding/recruiter/documents/page.tsx` — added `error` state/banner; both `handleFinish`
  and the "Skip for now" handler now abort + show an error on sync failure.

## Impact if not fixed

Any candidate or recruiter whose token refresh transiently fails at the exact moment they finish
onboarding gets silently stuck in an onboarding loop with zero feedback — looks like the app is
broken, no way to self-recover except reloading and hoping the next attempt doesn't hit the same
race.

## Impact if fixed

Same transient failure now shows a clear, actionable error and lets the user retry immediately;
normal case (no refresh failure) is unchanged.

## Deploy priority

**P1** — blocks account activation for affected users on the exact step where drop-off is most
costly (end of onboarding), with no error message to explain why.

## Open question (not resolved by this fix, noted for awareness)

*Why* `/api/auth/refresh` returned 401 in the observed trace is not fully confirmed from static
code alone — it's either the proxy's own early guard in `app/api/auth/refresh/route.ts:66-71`
("no refresh token cookie present") or InsForge's backend rejecting the token
(`route.ts:86-94`, status passed through verbatim). This fix makes the caller resilient to either
case (one retry, then a clear error) rather than assuming refresh always succeeds, but if 401s
here turn out to be frequent rather than rare/transient, the cookie/token lifecycle itself
(`insforge_refresh_token` Path scoping, rotation timing vs. the background proactive-refresh timer
in `hooks/useSessionRefresh.ts`) would be worth a live investigation — check the response body and
Application → Cookies for `insforge_refresh_token` at the moment of a repro.

## Secondary, unrelated finding (not fixed, noted for awareness)

`proxy.ts:377-388` (legacy `/dashboard/candidate/*` → `/candidate/dashboard` redirect) rebuilds the
URL via `new URL(path, request.url)` without re-appending the original query string, so
`?onboarding_success=true` is silently dropped. Currently harmless — nothing in the app reads that
param (confirmed via repo-wide search) — but worth knowing if it's ever wired up for a "welcome"
toast later.
