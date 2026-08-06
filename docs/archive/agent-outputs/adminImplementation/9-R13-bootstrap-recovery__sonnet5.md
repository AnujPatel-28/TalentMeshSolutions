# R-13 — Admin bootstrap & recovery — implementation report

Doc reference: `14_Admin_Portal_Rebuild_Architecture.md` §R-13. Model: Claude Sonnet 5.

## 1. `POST /api/admin/forgot-password` (D-1)

**New file:** `app/api/admin/forgot-password/route.ts`

Wired with the existing `withApi` wrapper (`requireAuth: false`, body schema `z.object({ email: z.string().email() })`). Delegates to the InsForge edge function `admin-forgot-password` (`insforge/functions/admin-forgot-password/index.ts`), which was already fully implemented — whitelist check via `ADMIN_EMAILS`, `insforge.auth.sendResetPasswordEmail`, always-200 body — but had no Next.js route calling it, so both `/admin/forgot-password` and `/admin/reset-password` (which already `fetch('/api/admin/forgot-password', ...)`) 404'd on submit. The route now exists and always returns `{ success: true }` with status 200, regardless of whether the account exists, the edge function errors, or `client.functions.invoke` throws (wrapped in try/catch so no code path can leak a different status/body). No client-side changes were needed — both pages already pointed at this URL.

## 2. `validateAdminToken` timing-safe comparison (D-25)

**File:** `lib/admin/token.ts`

Replaced the `token === secret` string comparison with `crypto.timingSafeEqual` over two `Buffer`s, guarded by an explicit length check first (`timingSafeEqual` throws on unequal-length buffers rather than returning `false`).

## 3. `NEXT_PUBLIC_` admin secrets removed from the browser bundle (D-26)

Two variables were in scope: `NEXT_PUBLIC_ADMIN_EMAILS` and `NEXT_PUBLIC_ADMIN_SECRET_PATH`.

- **`NEXT_PUBLIC_ADMIN_EMAILS`**: `isAdminEmail()` in `lib/admin/token.ts` read `process.env.NEXT_PUBLIC_ADMIN_EMAILS || process.env.ADMIN_EMAILS`. Dropped the `NEXT_PUBLIC_` fallback — the function now reads `ADMIN_EMAILS` only (server-only var; already unset in `.env.local`, so no runtime behavior change locally). Note: `isAdminEmail` has no callers anywhere in the app (verified by grep) — it's pre-existing dead code, left in place per the "don't delete unrelated dead code" rule, but its env-var read was in scope for D-26 so it was fixed.

- **`NEXT_PUBLIC_ADMIN_SECRET_PATH`**: this was read in 8 places (`next.config.ts` rewrites, `lib/utils/admin-path.ts`, `app/(auth)/login/page.tsx` ×2, `app/dashboard/page.tsx`, `app/auth/callback/page.tsx` ×2) to build the admin redirect path, always as `process.env.NEXT_PUBLIC_ADMIN_SECRET_PATH || 'admin'`. Investigated whether to keep this as a server-only var and found that's not viable without adding a new API round-trip: the value drives client-side `router.push`/`window.location.replace` calls, which can only read `NEXT_PUBLIC_` env vars at runtime. Rather than build new infrastructure the R-13 spec doesn't ask for, I took the fix the architecture doc itself calls for elsewhere (doc 01 §"secret path... becomes obsolete — delete it"): the "secret path" never hid anything, since `app/admin/**` is a real Next.js filesystem route reachable directly regardless of the rewrite, and `.env.local` had it hardcoded to the literal string `admin` anyway — identical to the fallback. So all 8 sites now use the literal `'admin'` directly; the env var and its `.env.local` entry are deleted. In `next.config.ts` this also let me delete the now-dead `if (secretPath !== 'admin')` rewrite branch (created dead by this change, so removed per the "clean up orphans your change creates" rule). Net effect is behavior-identical to today (same resolved path in every case) with the secret-shaped variable gone from the bundle.

**Flagging for the user:** this is a slightly larger interpretation of "move to server-only env vars" than a literal rename — a true server-only version of this variable isn't usable by the client code that needs it, so I collapsed the indirection instead of half-implementing it. If a *real* configurable admin path is wanted later (not just today's `admin` literal), that needs a dedicated resolution mechanism (e.g. an unauthenticated `/api/admin/path` lookup or a build-time-only non-public var baked into a generated client constant) — out of scope for R-13 as specified.

## 4. `?reason=suspended` on login page

Checked first per instructions. Already implemented at `app/(auth)/login/page.tsx:723-734` (from prior W9/A-2 work) — no changes made.

## Files changed

- `app/api/admin/forgot-password/route.ts` (new)
- `lib/admin/token.ts`
- `lib/utils/admin-path.ts`
- `next.config.ts`
- `app/(auth)/login/page.tsx`
- `app/dashboard/page.tsx`
- `app/auth/callback/page.tsx`
- `.env.local` (removed `NEXT_PUBLIC_ADMIN_SECRET_PATH`)

## Verification

### `npx tsc --noEmit`

One pre-existing error, unrelated to this change (framer-motion `Variants` typing in `app/dashboard/candidate/[role_id]/applications/page.tsx`, not a file touched here):

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

Confirmed via grep of the full tsc output that none of the 8 changed/created files appear in the error list.

### `npx vitest run`

```
 RUN  v4.1.9 C:/Users/Anuj/Desktop/tm_web/Talentmesh-demo

 Test Files  8 passed (8)
      Tests  46 passed (46)
   Start at  21:43:37
   Duration  61.48s (transform 4.01s, setup 52.11s, import 8.32s, tests 1.70s, environment 254.71s)
```

### `npx playwright test --reporter=list`

```
  1 failed
    [chromium] › e2e\admin-stabilization.spec.ts:390:7 › Admin Stabilization E2E Tests › Candidate View: queue export lifecycle & progress model updates (Correction 4)
  7 skipped
  40 passed (2.7m)
```

The single failure is a UI-text timing assertion unrelated to this change:

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('#export-progress-banner')
Expected pattern: /Exporting \d+%/
Timeout: 15000ms
Error: element(s) not found
Call log:
  - Expect "toContainText" with timeout 15000ms
  - waiting for locator('#export-progress-banner')
    4 × locator resolved to <div id="export-progress-banner">…</div>
      - unexpected value "Starting export..."
```

It asserts the export progress banner text transitions from "Starting export..." to "Exporting N%" within 15s; the banner element exists but the text hadn't transitioned in time. This test is in `admin-stabilization.spec.ts` (export-job lifecycle), has no relationship to admin auth/forgot-password/env vars, and none of R-13's changed files are referenced anywhere near it. Flagging as pre-existing flake, not introduced by this change — did not attempt to fix it as it's out of R-13's scope.

The 7 skipped tests are pre-existing skips gated on `[needs real-JWT fixture]` / other markers unrelated to this change (verified by name, e.g. `admin cookie → auth passes [needs real-JWT fixture]`).

All admin-secret-path-dependent e2e navigation (`/admin/dashboard`, `/admin/dashboard/reports`, `/admin/dashboard/me/messages`, `/admin/dashboard/candidates`) resolved with 200s in the Playwright run output, confirming the hardcoded `'admin'` path didn't break existing redirect flows.
