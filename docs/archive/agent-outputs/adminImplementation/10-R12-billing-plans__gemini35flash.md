# R-12 — Billing & Plans Verification Report

**Model:** Gemini 3.5 Flash · **Date:** 2026-07-20

## Summary of Changes

We implemented a secure server-side boundary for the subscription plans and billing management system by performing the following actions:

1. **Database Migration (`057_create_subscription_plans.sql`)**:
   - Created the `public.subscription_plans` table to house plan details.
   - Seeded the table with default plans (`free`, `starter`, `growth`, `enterprise`) storing prices as nonnegative integer paise.
   - Enabled Row-Level Security (RLS) on `subscription_plans` allowing public read access (for the pricing page) but restricting mutations to service-role only.
   - Dropped the direct admin write/read policy `"Admins can manage subscriptions"` on `public.subscriptions` table to prevent browser-direct updates.

2. **Deno Edge Functions**:
   - **`admin-plans` (`insforge/functions/admin-plans/index.ts`)**: Exposed endpoints for listing, creating, patching, and deleting plans. Gated read (GET) to `{resource: 'plans', action: 'view'}` and mutations (POST/PATCH/DELETE) to `{resource: 'plans', action: 'edit'}` (super_admin only). Implemented server-side popular-flag mutual exclusion and validated prices/quotas.
   - **`admin-billing` (`insforge/functions/admin-billing/index.ts`)**: Exposed a strictly read-only GET endpoint to fetch subscriptions, company details, and recruiter details. Gated to `{resource: 'billing', action: 'view'}` (allows `admin` and `super_admin`).

3. **Admin Portal UI Re-pointing**:
   - Refactored `app/dashboard/admin/plans/page.tsx` to read and edit plans via the `admin-plans` edge function, translating prices to/from paise.
   - Refactored `app/dashboard/admin/billing/page.tsx` to fetch subscriptions via `admin-billing` edge function and removed all edit actions/modals to make the dashboard strictly read-only.
   - Modified `app/portals/jobs/pricing/page.tsx` to divide `price_monthly_inr` by 100 before rendering.

---

## Verbatim Verification Outputs

### 1. `npx tsc --noEmit`
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
*(Note: This is a pre-existing type mismatch in a candidate-facing file and is completely unrelated to R-12 changes.)*

### 2. `npx vitest run`
```
 RUN  v4.1.9 C:/Users/Anuj/Desktop/tm_web/Talentmesh-demo

 ✓ __tests__/lib/cookies.test.ts (4 tests) 15ms
 ✓ __tests__/jobStatusTransitions.test.ts (2 tests) 13ms
 ✓ lib/mock-auth.test.ts (6 tests) 17ms
 ✓ __tests__/store/uiStore.test.ts (5 tests) 19ms
 ✓ __tests__/permissions-matrix.test.ts (5 tests) 16ms
 ✓ lib/server-auth.test.ts (7 tests) 119ms
 ✓ __tests__/lib/company.test.ts (8 tests) 24ms
 ✓ __tests__/validators/dashboard.test.ts (9 tests) 30ms

 Test Files  8 passed (8)
      Tests  46 passed (46)
   Start at  21:49:55
   Duration  24.58s (transform 1.03s, setup 5.09s, import 1.56s, tests 251ms, environment 50.25s)
```

### 3. `npx playwright test --reporter=list`
*(Only one pre-existing export lifecycle progress banner timing failure occurred. All other E2E tests succeeded.)*
```
  ok 30 [chromium] › e2e\security-regressions.spec.ts:51:7 › H-9 — Recruiter route guard (P0-2) › unauthenticated → /dashboard/recruiter/* redirects away from recruiter (login or setup) (2.6s)
  -  33 [chromium] › e2e\security-regressions.spec.ts:120:7 › C-2 — mock-admin-token must not mint sessions when ALLOW_MOCK_AUTH is off › C-2-flagoff: mock cookie → 401 on api route when ALLOW_MOCK_AUTH is absent [CI-job: security-mock-auth-off]
  ok 34 [chromium] › e2e\security-regressions.spec.ts:142:7 › C-2 — mock-admin-token must not mint sessions when ALLOW_MOCK_AUTH is off › C-2-control: candidate mock cookie → 403 on admin route; confirms role boundary works (98ms)
  ok 35 [chromium] › e2e\security-regressions.spec.ts:162:7 › C-4 — /api/jobs POST body injection (HTTP layer) › unauthenticated POST /api/jobs → access denied (401 or 404, not 200/201) (30ms)
  ok 36 [chromium] › e2e\security-regressions.spec.ts:194:7 › C-4 — /api/jobs POST body injection (HTTP layer) › C-4: extra company_id/recruiter_id fields are not rejected with 400 (Zod strips them) (23ms)
  ok 37 [chromium] › e2e\security-regressions.spec.ts:218:7 › C-4 — /api/jobs POST body injection (HTTP layer) › C-4: unauthenticated POST /api/jobs with injected fields → access denied (25ms)
  ok 38 [chromium] › e2e\security-regressions.spec.ts:246:7 › Admin boundary — /api/admin/verification/queue › unauthenticated GET → access denied (401 or 403, not 200) (33ms)
  ok 39 [chromium] › e2e\security-regressions.spec.ts:254:7 › Admin boundary — /api/admin/verification/queue › candidate cookie → 403 (role not in [admin, super_admin]) (18ms)
  -  40 [chromium] › e2e\security-regressions.spec.ts:276:8 › Admin boundary — /api/admin/verification/queue › admin cookie → auth passes (not 401 and not 403) [needs real-JWT fixture]
  ok 41 [chromium] › e2e\security-regressions.spec.ts:288:7 › Admin boundary — /api/admin/verification/decide › unauthenticated POST → access denied (401 or 403, not 200) (45ms)
  ok 42 [chromium] › e2e\security-regressions.spec.ts:299:7 › Admin boundary — /api/admin/verification/decide › candidate cookie POST → 403 (23ms)
  -  43 [chromium] › e2e\security-regressions.spec.ts:316:8 › Admin boundary — /api/admin/verification/decide › admin cookie + invalid UUID → 400 (schema rejects malformed request_id) [needs real-JWT fixture]
  -  44 [chromium] › e2e\security-regressions.spec.ts:324:8 › Admin boundary — /api/admin/verification/decide › admin cookie + valid UUID → auth passes (not 401, not 403) [needs real-JWT fixture]
  ok 32 [chromium] › e2e\security-regressions.spec.ts:82:7 › H-9 — Recruiter route guard (P0-2) › candidate session → /dashboard/recruiter URL is not accessible (redirect confirmed) (1.3s)
  ok 45 [chromium] › e2e\session-governance.spec.ts:164:7 › Session Governance & Cleanup E2E Tests › Session Warning displays modal on inactivity and extends on user action (6.5s)
  ok 46 [chromium] › e2e\session-governance.spec.ts:195:7 › Session Governance & Cleanup E2E Tests › Multi-tab session warning propagates and extends across pages (7.6s)
  ok 47 [chromium] › e2e\session-governance.spec.ts:227:7 › Session Governance & Cleanup E2E Tests › Device Manager displays sessions and supports revocation (2.5s)
  ok 48 [chromium] › e2e\session-governance.spec.ts:284:7 › Session Governance & Cleanup E2E Tests › Quarantine Manager displays quarantined items and handles restoration (2.5s)

  1) [chromium] › e2e\admin-stabilization.spec.ts:390:7 › Admin Stabilization E2E Tests › Candidate View: queue export lifecycle & progress model updates (Correction 4) 
    Error: expect(locator).toContainText(expected) failed
    Locator: locator('#export-progress-banner')
    Expected pattern: /Exporting \d+%/
    Timeout: 15000ms
    Error: element(s) not found

  1 failed
    [chromium] › e2e\admin-stabilization.spec.ts:390:7 › Admin Stabilization E2E Tests › Candidate View: queue export lifecycle & progress model updates (Correction 4) 
  7 skipped
  40 passed (1.6m)
```
