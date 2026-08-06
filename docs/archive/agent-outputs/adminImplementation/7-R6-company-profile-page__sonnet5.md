# R-6 — Company-First admin: the company profile page

Executor: Sonnet 5. Source: `docs/specs/14_Admin_Portal_Rebuild_Architecture.md`, section "R-6 — Company-First admin: the company profile page" (lines 320–331), cross-referenced against doc 04 §1 (company lifecycle) and the live schema.

Filename note: the dispatch asked for `docs/archive/agent-outputs/adminImplementation/7el>.md`. `>` is not a legal character in a Windows path (this environment is win32) and the write would fail, so this file uses `7-R6-company-profile-page__sonnet5.md`, matching this folder's existing `<phase>-<taskid>__<model>.md` convention (see `README.md`).

Read before writing anything: doc 14 R-6 prose + §7 API contract + §6.1/§4.3 (RBAC kit) + doc 04 §1 (company state machine) + doc 04 §2 (member state machine, `guard_last_company_admin`) + the live `_shared/` kit (`adminAuth.ts`, `permissions.ts`, `query.ts`, `errors.ts`, `idempotency.ts`) + the landed R-5 job-detail page (`app/dashboard/admin/jobs/[id]/page.tsx`) as the UI precedent + live table schemas for `companies`, `company_members`, `audit_log`, `verification_audit_log`, `company_verification_requests`, `subscriptions`, `plan_limits` (via `mcp__insforge__get-table-schema` against the live backend, not the doc's prose).

## What shipped

| Field | Detail |
|---|---|
| **Server-side changes** | Rewrote `insforge/functions/admin-companies/index.ts`: (a) `GET ?action=get-detail&id=` — company row + members (joined `profiles`) + jobs summary (`byStatus`/`byApproval`/`activeJobsUsed`) + last 10 `company_verification_requests` + subscription+`plan_limits` (`max_active_jobs`) + last 30 `verification_audit_log` rows + last 30 `audit_log` rows where `on_behalf_of = id` (this last field is additive to doc §7's typed contract, which omits an audit field entirely even though the R-6 prose requires an Audit tab — see Deviations). (b) `GET` list now searches `name` OR `gstin`. (c) `POST` create: zod schema, `gstin` required (regex `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$`), `cin` optional (regex `^[ULF][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$`, exact doc match), `website` optional URL, `country_code` default `'IN'`; on `companies_gstin_key` unique-violation returns `409 {error, code:'company_exists', existing_company_id}`. (d) `PATCH` allowlist via `.strict()` zod schema — `['name','website','industry','size','location','description','logo_url','country_code']` only; `gstin`/`cin`/`status` are not even schema keys, so any attempt 400s. `reason` (min 10) required, written to `audit_log` with `on_behalf_of = company.id`. (e) New `POST {action:'suspend'\|'reinstate'\|'deactivate', id, reason}` lifecycle actions, transition-table-guarded per doc 04 §1 (`verified↔suspended`, `verified/suspended→deactivated`), writing `verification_audit_log` (not `audit_log`) to match how `approve_company_verification`/`reject_company_verification` already record company-lifecycle events. `deactivate` also closes open jobs (`draft/active/paused→closed`) — it does **not** remove members; see Deviations. Also added a `company_id` filter to `admin-jobs` GET and `admin-applications` GET (small, additive) so the new page's Jobs/Applications tabs can list this company's rows without duplicating query logic. |
| **Client-side changes** | New `app/dashboard/admin/companies/[id]/page.tsx` — six tabs (Overview, Members, Jobs, Applications, Verification, Audit), following the R-5 job-detail page's established pattern exactly: `invokeFunction`, `jobsStyles` (CSS module reused, no new stylesheet), `DataTable`/`StatusPill` for tabular data, inline-style tab bar, a single required-reason textarea feeding whatever action is taken (mirrors R-5's Details-tab reason field — no new `InterventionModal`/`StatusBadge` shared components were introduced; R-5 itself didn't build those either, so this follows the actual landed precedent over the aspirational §8 UX note). Verification tab reuses `VerificationDecisionModal` unmodified. Applications tab reuses `ApplicationDetailModal` unmodified. `app/dashboard/admin/companies/page.tsx` rewritten: rows are `Link`s to the new detail page (the old `DetailDrawer` preview + inline `is_verified`/`is_active` PATCH toggles are gone — those fields are no longer valid PATCH targets under the new allowlist, so the toggles would have started 400ing the moment the allowlist landed); search box now hits the extended name-or-GSTIN search; the page's own duplicate inline create form was replaced with the shared `CompanyRegisterForm` (see below) instead of maintaining two drifting create forms. `CompanyRegisterForm.tsx` gained GSTIN (required) and CIN (optional) fields with client-side regex pre-validation, dropped the old `is_verified: true` body field, fixed its `size` `<select>` options to match the schema enum (`501-1000`/`1000+`, previously `500+` which the new zod enum rejects). |
| **Impact if changed** | Company is finally addressable as one page — status, tax IDs, plan usage, membership, postings, funnel, verification history, and staff-intervention trail all in one place, matching docs 02/04/07's Company-First model. GSTIN becomes the dedup key for company creation (name-typo duplicate tenants stop accruing). Every staff action on a company or its members is `reason`-required and lands in an append-only audit trail with `on_behalf_of` set, closing the "raw DB edit with no trail" gap doc 13 flagged. |
| **Impact if not changed** | Companies stay a flat name-keyed list; member management stays invisible to platform staff; `gstin`/`cin`/`status` stay editable through the old unrestricted PATCH (`{...body}` straight to `.update()`, no allowlist at all previously — this was a real hole, not just a doc-compliance gap); R-7 (recruiter management) has no company page to link recruiters to. |
| **Reason for change** | Core product ask; P0 for GSTIN-keyed create + status-edit lockout per the dispatch; R-7 depends on this page existing. |
| **Deploy priority** | P0 parts (GSTIN-keyed create, PATCH allowlist / status-edit lockout) — **done**. P1 (the page itself, member interventions, lifecycle actions) — **done**. |

## Files touched

- `insforge/functions/admin-companies/index.ts` — rewritten
- `insforge/functions/admin-applications/index.ts` — added `company_id` filter (additive)
- `insforge/functions/admin-jobs/index.ts` — added `company_id` filter (additive)
- `app/api/company/[companyId]/members/[userId]/route.ts` — added staff on-behalf branch
- `app/api/company/[companyId]/members/invite/route.ts` — added staff on-behalf branch
- `app/api/company/[companyId]/members/accept/route.ts` — added staff accept-on-behalf branch
- `lib/validation/company.ts` — added optional `reason` to `inviteMemberSchema`/`updateMemberSchema`
- `app/dashboard/admin/companies/[id]/page.tsx` — new
- `app/dashboard/admin/companies/page.tsx` — rewritten
- `app/dashboard/admin/_components/CompanyRegisterForm.tsx` — GSTIN/CIN fields + validation
- `insforge/migrations/056_guard_last_admin_deactivate_escape.sql` — **draft only, not applied** (see Deviations)

## Deviations from the doc — flagged explicitly, not silently resolved

1. **Member interventions cannot literally reuse the existing endpoints as pure pass-through — they had to be extended.** The doc says "REUSE the recruiter-portal endpoints/RPCs — do not write new member-management logic." As found, `app/api/company/[companyId]/members/[userId]/route.ts` (PATCH) and `.../invite/route.ts` (POST) are hard-locked to `allowedRoles: ['recruiter']` plus a check that the caller is *already an active admin member of that exact company* — a platform staff user (`role: 'admin'/'super_admin'`) has no `company_members` row at all and would 403 unconditionally. There was no way to satisfy "reuse this endpoint" without touching it. What I did: extended each route in place with a staff branch (same file, same URL, same update/insert call shape, same `guard_last_company_admin` trigger enforcement) that skips the own-company-admin check, requires `reason` (≥10 chars), uses the service-role client (`insforgeAdmin`) instead of the caller's own token (staff have no RLS path into another tenant's `company_members`), and writes an explicit `audit_log` row with `on_behalf_of = companyId`. This is genuine reuse of the same code path, not a duplicate implementation — but it is not the *unmodified* endpoint the doc's wording implies.

2. **"Accept on behalf" cannot call `accept_company_invite` at all — the RPC is architecturally incapable of it.** `accept_company_invite(p_company_id)` (migration 051) is `SECURITY DEFINER` but resolves `v_uid := auth.uid()` internally and updates `WHERE user_id = v_uid`. A service-role call has no JWT, so `auth.uid()` is `NULL` inside the function — it can never identify which invitee to activate on someone else's behalf. This is not a bug to route around; it's how the RPC has to work for the *self*-accept path (the existing, correct use case) to be safe. I added a `userId`+`reason` branch to `.../members/accept/route.ts` that reproduces the RPC's exact effect directly with the service client (verify `companies.status = 'verified'`, `UPDATE company_members SET status='active', joined_at=coalesce(...)` scoped to the target `user_id`+`company_id`+`status='invited'`, then insert the same `verification_audit_log` row shape the RPC inserts) plus the staff intervention envelope. Functionally equivalent, not literally "the RPC."

3. **`deactivate` does not remove members**, even though doc 04 §1 says "verified/suspended → deactivated: ... members `removed`." `guard_last_company_admin` (051) has an escape hatch for when the *company row itself* is being `DELETE`d (member rows die via FK cascade after the parent is gone, so the invariant is vacuous), but deactivation is a soft status change — the company row survives — so removing the last active admin's membership mid-cascade always raises `last_admin`, by design, with no exception. There is currently no way to fully deactivate a company (in the "members removed" sense) against the live trigger. I implemented `deactivate` to do what's safe today — flip `companies.status`, close open jobs — and left members untouched, rather than silently working around a DB-level safety invariant. Drafted `insforge/migrations/056_guard_last_admin_deactivate_escape.sql` (adds a `companies.status = 'deactivated'` escape mirroring the existing DELETE-cascade one) as a **human-apply-only** deliverable per the standing rule that migrations are never agent-applied. Once applied, the `deactivate` branch in `admin-companies/index.ts` should be extended to also set `company_members.status = 'removed'` for the company — flagged, not done, since the migration isn't live.

4. **CIN regex in `lib/validation/company.ts` is pre-existing drift, not touched.** That file's `CIN` constant (`^[LUu][0-9]{5}[A-Za-z]{2}[0-9]{4}[A-Za-z]{3}[0-9]{6}$`) is missing the `F` (foreign company) prefix the MCA21 format allows and inconsistently permits a stray lowercase `u`. Doc 14 R-6 specifies the correct pattern and says to reproduce it exactly, which I did — but only in the two places this task owns (`admin-companies/index.ts`, `CompanyRegisterForm.tsx`). The recruiter self-serve path (`lib/validation/company.ts`, used by `app/api/company/[companyId]/route.ts` and the request-access flow) still has the old, slightly-wrong regex. Out of scope for R-6; flagged as a small follow-up.

5. **`invokeFunction`'s error normalization drops the edge fn's `code` and any extra fields.** `lib/insforge.ts`'s `invokeFunction` only forwards `{message, status, details}` from a failed response — the `409 {error, code:'company_exists', existing_company_id}` body from `admin-companies` create arrives client-side as `{message, status: 409}` only. `existing_company_id` never reaches the browser, so the doc's "attach flow" (letting the admin jump straight to the conflicting company) isn't reachable from `CompanyRegisterForm` — it can only show a generic "already exists" message on `status === 409`. Fixing this generically would touch a shared helper used by every admin page; out of scope here, flagged.

6. **`admin-companies/index.ts`'s CompanyDetail response has an `auditLog` field the doc's §7 type contract doesn't list.** The typed contract in §7 (`CompanyDetail`) has no audit field at all, but the R-6 prose explicitly specifies an Audit tab sourcing both `verification_audit_log` and `on_behalf_of`-filtered `audit_log`. Treated the prose as authoritative over the (evidently incomplete) typed contract and added `auditLog: {verification, platform}` to the response.

7. **`insforge/functions/admin-companies/index.js` is a stale, out-of-sync build artifact** — it still has the pre-R-2 inline CORS/error-handling shape and was not regenerated. Confirmed via `scripts/deploy-all-functions.js` that deploys always read `index.ts` (esbuild-bundled at deploy time when `_shared/` is imported) — `index.js` is not part of the deploy path and was already stale before this change. Not touched, per "don't clean up pre-existing dead code unless asked" — flagged instead.

## Verification

Ran from `Talentmesh-demo/`. Commands and full output below, verbatim (trimmed only where noted).

### `npx tsc --noEmit`

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

**1 error, pre-existing** — `app/dashboard/candidate/[role_id]/applications/page.tsx` is a framer-motion `Variants` typing issue, not touched by this task. Zero errors in any file this task modified.

### `npx tsc -p insforge/tsconfig.json`

```
(no output, exit code 0)
```

### `npx vitest run`

```
 RUN  v4.1.9 C:/Users/Anuj/Desktop/tm_web/Talentmesh-demo


 Test Files  8 passed (8)
      Tests  46 passed (46)
   Start at  19:26:37
   Duration  34.46s (transform 2.33s, setup 24.28s, import 3.52s, tests 571ms, environment 110.21s)
```

### `npx playwright test --reporter=list`

Full run log (48 tests, 2 workers). Browser console/request-trace noise (`REQ:`/`RES:`/`[BROWSER CONSOLE]` lines the app itself logs to stdout during tests) trimmed for length; every test result line and the final summary are verbatim:

```
Running 48 tests using 2 workers
  ok  1 [chromium] › e2e\admin-authz.spec.ts:20:7 › Admin authorization guard (W9) › unauthenticated → redirected to /login (4.2s)
  ok  2 [chromium] › e2e\admin-authz.spec.ts:36:7 › Admin authorization guard (W9) › candidate role → denied at the proxy layer (generic /unauthorized, not the RSC redirect) (3.8s)
  ok  3 [chromium] › e2e\admin-authz.spec.ts:46:7 › Admin authorization guard (W9) › recruiter role → denied at the proxy layer (generic /unauthorized, not the RSC redirect) (5.2s)
  ok  4 [chromium] › e2e\admin-authz.spec.ts:56:7 › Admin authorization guard (W9) › suspended admin with a stale admin tm_role cookie still reaches the RSC and is bounced (A-2 backstop) (6.1s)
  ok  5 [chromium] › e2e\admin-authz.spec.ts:70:7 › Admin authorization guard (W9) › active admin → passes both the proxy gate and the RSC guard, reaches the dashboard (3.2s)
  -   7 [chromium] › e2e\admin-authz.spec.ts:99:7 › Live-backend-only checks (not run in CI — see file header) › suspended admin gets 403 from every admin-* edge function
  -   8 [chromium] › e2e\admin-authz.spec.ts:105:7 › Live-backend-only checks (not run in CI — see file header) › admin (not super_admin) gets 403 from admin-settings team/settings actions
  ok  6 [chromium] › e2e\admin-authz.spec.ts:80:7 › Admin authorization guard (W9) › a stale/forged admin role cookie with a garbage access token is still denied — RSC backstop (5.6s)
  ok  9 [chromium] › e2e\admin-stabilization.spec.ts:277:7 › Admin Stabilization E2E Tests › Candidate View: search state updates URL and persists across refresh and back navigation (8.5s)
  ok 10 [chromium] › e2e\admin-stabilization.spec.ts:310:7 › Admin Stabilization E2E Tests › Candidate View: bulk selection display confirms through BulkConfirmModal (4.4s)
  ok 12 [chromium] › e2e\admin-stabilization.spec.ts:371:7 › Admin Stabilization E2E Tests › Mobile: viewport changes responsive grid display and shows selection layout (2.7s)
  ok 11 [chromium] › e2e\admin-stabilization.spec.ts:340:7 › Admin Stabilization E2E Tests › Recruiter View: search, invite, and bulk confirmation drawer triggers (4.0s)
  ok 13 [chromium] › e2e\admin-stabilization.spec.ts:390:7 › Admin Stabilization E2E Tests › Candidate View: queue export lifecycle & progress model updates (Correction 4) (4.7s)
  ok 14 [chromium] › e2e\admin-stabilization.spec.ts:411:7 › Admin Stabilization E2E Tests › Admin Pages: Undo survives page navigation (Correction 3) (8.0s)
  ok 15 [chromium] › e2e\auth.spec.ts:5:7 › Authentication Flow › should show error for invalid credentials (4.3s)
  ok 16 [chromium] › e2e\auth.spec.ts:34:7 › Authentication Flow › should redirect unauthenticated users from protected routes (2.3s)
  ok 17 [chromium] › e2e\auth.spec.ts:45:7 › Authentication Flow › successful login and redirection (role: candidate) (2.5s)
  ok 18 [chromium] › e2e\dashboard.spec.ts:6:7 › Dashboard Accessibility & Role Protection › unauthenticated user redirected to login from /dashboard (2.2s)
  ok 19 [chromium] › e2e\dashboard.spec.ts:11:7 › Dashboard Accessibility & Role Protection › unauthenticated user redirected to login from /dashboard/admin (2.4s)
  ok 20 [chromium] › e2e\dashboard.spec.ts:18:9 › Dashboard Accessibility & Role Protection › Authorized Navigation Smoke Tests › candidate dashboard loading state contains skeleton or title (2.4s)
  ok 21 [chromium] › e2e\dashboard.spec.ts:23:9 › Dashboard Accessibility & Role Protection › Authorized Navigation Smoke Tests › recruiter dashboard loading state contains skeleton or title (2.8s)
  ok 22 [chromium] › e2e\dashboard.spec.ts:93:9 › Dashboard Accessibility & Role Protection › Admin Dashboard UI & Caching Integration Tests › admin dashboard loads stats and review queue correctly (2.8s)
  ok 23 [chromium] › e2e\dashboard.spec.ts:112:9 › Dashboard Accessibility & Role Protection › Admin Dashboard UI & Caching Integration Tests › admin dashboard manual refresh button disables during execution (3.1s)
  ok 25 [chromium] › e2e\dashboard.spec.ts:180:9 › Dashboard Accessibility & Role Protection › Admin Dashboard UI & Caching Integration Tests › mobile viewport locks body scroll when drawer is open (1.4s)
  ok 26 [chromium] › e2e\notifications-sync.spec.ts:171:7 › Notification System & Real-Time Sync E2E Tests › Should load NotificationCenter inbox tab by default (2.1s)
  ok 24 [chromium] › e2e\dashboard.spec.ts:154:9 › Dashboard Accessibility & Role Protection › Admin Dashboard UI & Caching Integration Tests › admin dashboard handles partial widget failures with isolated retry cooldown (5.3s)
  ok 27 [chromium] › e2e\notifications-sync.spec.ts:180:7 › Notification System & Real-Time Sync E2E Tests › Should open Queue Monitor and run simulation triggers (3.0s)
  -  29 [chromium] › e2e\onboarding.spec.ts:8:8 › Candidate E2E Flow: Login -> Onboarding -> Resume Upload -> Job Application › Complete onboarding and apply for a job
  ok 28 [chromium] › e2e\notifications-sync.spec.ts:200:7 › Notification System & Real-Time Sync E2E Tests › Should render live template previews with safe whitelisted variables (2.7s)
  ok 31 [chromium] › e2e\security-regressions.spec.ts:67:7 › H-9 — Recruiter route guard (P0-2) › candidate session → /dashboard/recruiter/* redirects away from recruiter portal (1.4s)
  ok 30 [chromium] › e2e\security-regressions.spec.ts:51:7 › H-9 — Recruiter route guard (P0-2) › unauthenticated → /dashboard/recruiter/* redirects away from recruiter (login or setup) (2.3s)
  -  33 [chromium] › e2e\security-regressions.spec.ts:120:7 › C-2 — mock-admin-token must not mint sessions when ALLOW_MOCK_AUTH is off › C-2-flagoff: mock cookie → 401 on api route when ALLOW_MOCK_AUTH is absent [CI-job: security-mock-auth-off]
  ok 34 [chromium] › e2e\security-regressions.spec.ts:142:7 › C-2 — mock-admin-token must not mint sessions when ALLOW_MOCK_AUTH is off › C-2-control: candidate mock cookie → 403 on admin route; confirms role boundary works (232ms)
  ok 35 [chromium] › e2e\security-regressions.spec.ts:162:7 › C-4 — /api/jobs POST body injection (HTTP layer) › unauthenticated POST /api/jobs → access denied (401 or 404, not 200/201) (42ms)
  ok 36 [chromium] › e2e\security-regressions.spec.ts:194:7 › C-4 — /api/jobs POST body injection (HTTP layer) › C-4: extra company_id/recruiter_id fields are not rejected with 400 (Zod strips them) (32ms)
  ok 37 [chromium] › e2e\security-regressions.spec.ts:218:7 › C-4 — /api/jobs POST body injection (HTTP layer) › C-4: unauthenticated POST /api/jobs with injected fields → access denied (26ms)
  ok 38 [chromium] › e2e\security-regressions.spec.ts:246:7 › Admin boundary — /api/admin/verification/queue › unauthenticated GET → access denied (401 or 403, not 200) (29ms)
  ok 39 [chromium] › e2e\security-regressions.spec.ts:254:7 › Admin boundary — /api/admin/verification/queue › candidate cookie → 403 (role not in [admin, super_admin]) (25ms)
  -  40 [chromium] › e2e\security-regressions.spec.ts:276:8 › Admin boundary — /api/admin/verification/queue › admin cookie → auth passes (not 401 and not 403) [needs real-JWT fixture]
  ok 41 [chromium] › e2e\security-regressions.spec.ts:288:7 › Admin boundary — /api/admin/verification/decide › unauthenticated POST → access denied (401 or 403, not 200) (22ms)
  ok 42 [chromium] › e2e\security-regressions.spec.ts:299:7 › Admin boundary — /api/admin/verification/decide › candidate cookie POST → 403 (37ms)
  -  43 [chromium] › e2e\security-regressions.spec.ts:316:8 › Admin boundary — /api/admin/verification/decide › admin cookie + invalid UUID → 400 (schema rejects malformed request_id) [needs real-JWT fixture]
  -  44 [chromium] › e2e\security-regressions.spec.ts:324:8 › Admin boundary — /api/admin/verification/decide › admin cookie + valid UUID → auth passes (not 401, not 403) [needs real-JWT fixture]
  ok 32 [chromium] › e2e\security-regressions.spec.ts:82:7 › H-9 — Recruiter route guard (P0-2) › candidate session → /dashboard/recruiter URL is not accessible (redirect confirmed) (1.5s)
  ok 45 [chromium] › e2e\session-governance.spec.ts:164:7 › Session Governance & Cleanup E2E Tests › Session Warning displays modal on inactivity and extends on user action (6.8s)
  ok 46 [chromium] › e2e\session-governance.spec.ts:195:7 › Session Governance & Cleanup E2E Tests › Multi-tab session warning propagates and extends across pages (6.9s)
  ok 47 [chromium] › e2e\session-governance.spec.ts:227:7 › Session Governance & Cleanup E2E Tests › Device Manager displays sessions and supports revocation (2.5s)
  ok 48 [chromium] › e2e\session-governance.spec.ts:284:7 › Session Governance & Cleanup E2E Tests › Quarantine Manager displays quarantined items and handles restoration (2.5s)

  7 skipped
  41 passed (1.7m)
```

No test in the existing e2e suite exercises `admin-companies`, the company detail page, or the member-intervention routes — the 7 skipped tests above are all pre-existing `test.skip()`/live-backend-only cases unrelated to this change (visible in their titles). **This run proves the rest of the app didn't regress; it does not exercise the new R-6 surface at all** — no e2e coverage was added for the new page or the staff on-behalf branches, and that gap should not be read as "R-6 is e2e-tested."

## Explicitly not done (out of scope / needs a decision)

- No e2e test added for the new company detail page or the three extended member routes (see note above).
- Migration 056 (guard-trigger deactivate escape) is drafted, not applied — human must run it, then the `deactivate` action's member-removal step can be added.
- `existing_company_id` on a GSTIN conflict doesn't reach the client (`invokeFunction` strips it) — the "attach to existing company" flow doc 14 R-6 implies isn't reachable from the UI yet.
- The pre-existing CIN regex bug in `lib/validation/company.ts` (recruiter self-serve path) is untouched.
- W10 decomposition (page split into `_components/` + hooks) was not applied to the new company detail page — it follows R-5's single-file precedent, which itself is explicitly listed as still-owing W10 in doc 14 R-14 (P3, post-launch).
