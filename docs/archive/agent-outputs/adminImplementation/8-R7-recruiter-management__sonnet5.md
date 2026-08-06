# R-7 — Recruiter management: replace the legacy pipeline

Executor: Sonnet 5. Source: `docs/specs/14_Admin_Portal_Rebuild_Architecture.md`, section "R-7 — Recruiter management: replace the legacy pipeline" (lines 333–344), cross-referenced against doc 04 §2 (member lifecycle), doc 06 (request-access flow), the landed R-6 company page/member-intervention routes, and the live schema (`mcp__insforge__get-table-schema` against the live backend, not the doc's prose).

Filename note: the dispatch asked for `docs/archive/agent-outputs/adminImplementation/8urmodel>.md`. `>` is not a legal character in a Windows path (win32 environment), so this follows the folder's `<phase>-<taskid>__<model>.md` convention (see R-6's report and `README.md`).

Read before writing anything: doc 14 R-7 prose + §7 API contract + §6.1/§4.3 (RBAC kit) + doc 04 §2 (member state machine) + doc 06 (request-access self-serve flow) + live `_shared/` kit (`adminAuth.ts`, `permissions.ts`, `query.ts`, `errors.ts`, `idempotency.ts`) + the landed R-6 `admin-companies/index.ts` and member-intervention routes (`app/api/company/[companyId]/members/{[userId],invite,accept}/route.ts`) as precedent + live table schemas for `profiles`, `company_members`, `companies`, `recruiter_profiles`, `company_verification_requests`, `access_requests` (via `mcp__insforge__get-table-schema`).

## What shipped

| Field | Detail |
|---|---|
| **Server-side changes** | Rewrote `insforge/functions/admin-recruiters/index.ts` onto the R-2 kit (`requireStaff`/`checkPermission`/`errors.ts`/`idempotency.ts`/`escapeOrFilter`/`capLimit` — the old file had never been migrated and still built raw `.or()` filter strings, a live D-13 injection instance). (a) **Deleted** `approve-setup`, `update-password`, `send-credentials`, `verify-otp` — no trace remains. (b) `GET` directory rebuilt on `profiles(role='recruiter')` with an embedded `company_members(id,status,member_role,company_id,joined_at,companies(id,name,gstin,status))` and `recruiter_profiles(job_title,about,is_approved,document_url,kyc_document_url,pan_number,aadhaar_number)`; filters `search` (via `escapeOrFilter`), `membership_status`, `company_id` — the latter two switch the embed to PostgREST's `!inner` join syntax (`company_members!inner(...)` + `.eq('company_members.status', …)`) so they filter *outer* profile rows, not just the nested array; with neither filter set the embed stays a left join so recruiters with no membership row yet (self-serve signups mid-flow) still appear. (c) `PATCH` allowlist strictly `['job_title','about','phone']` (zod `.strict()`, 400 on any other key) — `job_title`/`about` write `recruiter_profiles`, `phone` writes `profiles`; the old unrestricted `.update(body)` passthrough is gone. Membership fields are not reachable here at all. (d) **New `send-reset-link`** action: looks up the recruiter's email, calls InsForge auth's built-in `db.auth.sendResetPasswordEmail({email})` (same primitive `lib/admin/invite.ts` already uses for staff invites), writes an audit row, returns `{success:true}` only — never a link, OTP, or password. No new table; the auth user id never changes. (e) **New `create-on-behalf`** action: resolves or creates the company by GSTIN (same regex/409-on-conflict shape as `admin-companies` POST), resolves or creates the invitee's profile (existing user → invited as a member directly; new user → `signUp` with a discarded random password immediately followed by `sendResetPasswordEmail`, never surfaced), inserts `company_members` `invited` (`admin` role for a brand-new company, `recruiter` for an existing one), and — only for a brand-new company — inserts a `company_verification_requests` row + matching `verification_audit_log` rows so it actually surfaces in the normal Verification queue (see Deviation 2). Writes `audit_log` with `on_behalf_of`/`reason` per the doc §7 intervention envelope. (f) Remaining membership actions (suspend/reinstate/remove) are **not** admin-recruiters actions at all — the client calls the exact R-6 staff branch on `/api/company/[companyId]/members/[userId]` (PATCH), reused verbatim, not duplicated. (g) `bulk-active`/`bulk-delete`/single `DELETE` kept (account-level `is_active`/deletion is orthogonal to company membership — same F-7 kill-switch semantics as every other admin fn) but migrated to the kit, and `deleteRecruiters()` now catches `trg_guard_last_company_admin`'s `last_admin` trigger error and returns 422 instead of a raw 500 (deleting a recruiter cascades their `company_members` row via `ON DELETE CASCADE`, which is exactly where that trigger fires if they're a company's sole active admin). (h) **Deleted** `insforge/functions/admin-recruiter/` (singular) and its `access_requests` `list`/`approve` actions entirely — see the traffic-verification note below. (i) Fixed D-23/D-24 in `app/api/admin/send-proposal/route.ts`: `price` is now `z.number().nonnegative()` (was `z.union([z.number(), z.string()])`), and a `custom_proposals` insert failure now returns a real `500` instead of being swallowed. |
| **Client-side changes** | `recruiters/page.tsx` (was 2,874 LOC) rebuilt as a thin list page + `_components/` (`RecruiterDetailDrawer`, `MembershipActions`, `ResetLinkButton`, `DocViewerModal`) + `lib/hooks/useAdminRecruiters.ts` (fetch/URL-sync/selection/bulk/undo/export — same proven patterns as before, re-targeted at the new API). Columns: name/email, company (from the joined membership), member role, membership status, joined date, account status — company name links to the R-6 company detail page. `RecruiterRegisterForm.tsx` (shared, `app/dashboard/admin/_components/`) rewritten from a 3-step OTP/password wizard into a single GSTIN-first form that calls `create-on-behalf` — no password is ever generated, shown, or copied in the admin UI anymore. Dropped the dead `/admin/recruiter-requests` nav entry from `CommandPalette.tsx`, re-pointed it at `/dashboard/admin/verification`. |
| **Impact if changed** | Password changes stop destroying identities (D-5) — no delete-and-recreate anywhere in the recruiter path anymore. No plaintext credentials ever travel through the admin UI (D-7). No lying "success" responses (D-6 — `update-password` used to return `{success:true}` and do nothing). One intake shape for self-serve and admin-created recruiters. Recruiter admin actions are now company-membership actions, consistent with what company admins do themselves. The 2,874-line page stops hiding direct-DB writes behind an unreviewable wall of JSX. |
| **Impact if not changed** | Every password "change" continues to orphan FKs across applications/jobs/messages/audit by deleting and recreating the auth user. Credentials keep traveling in plaintext (`send-credentials` emailed the password in cleartext HTML). `verify-otp`/`update-password` keep returning fabricated success. Two divergent intake paths (`access_requests` vs `company_members`) keep drifting. |
| **Reason for change** | FR-3 (P0 ×4); doc 06's recruiter-side redesign lands on this module; W10 page-decomposition debt for this page is explicitly absorbed here per the doc. |
| **Deploy priority** | **P0** — done. |

## Files touched

- `insforge/functions/admin-recruiters/index.ts` — rewritten
- `insforge/functions/admin-recruiter/` — **deleted** (singular fn, `list`/`approve` on `access_requests`)
- `app/admin/recruiter-requests/page.tsx` — **deleted**
- `components/search/CommandPalette.tsx` — dead nav entry removed, re-pointed at the Verification queue
- `app/api/admin/send-proposal/route.ts` — D-23 (`price` schema) + D-24 (silent insert failure) fixed
- `app/dashboard/admin/recruiters/page.tsx` — rewritten (thin list page)
- `app/dashboard/admin/recruiters/lib/hooks/useAdminRecruiters.ts` — new
- `app/dashboard/admin/recruiters/_components/RecruiterDetailDrawer.tsx` — new
- `app/dashboard/admin/recruiters/_components/MembershipActions.tsx` — new
- `app/dashboard/admin/recruiters/_components/ResetLinkButton.tsx` — new
- `app/dashboard/admin/recruiters/_components/DocViewerModal.tsx` — new (extracted, unchanged behavior)
- `app/dashboard/admin/_components/RecruiterRegisterForm.tsx` — rewritten (create-on-behalf, no password step)

No migrations. `send-reset-link` and the new-user branch of `create-on-behalf` both use InsForge auth's built-in `sendResetPasswordEmail` (already proven in `lib/admin/invite.ts` for staff invites) instead of a bespoke `password_reset_tokens` table — the doc explicitly allows either, and this is strictly less code with an already-live, already-tested primitive.

## `/admin/recruiter-requests` traffic verification (dispatch requirement)

No access-log or analytics tool is available in this environment, so live traffic could not be checked directly — stated explicitly per the "if something cannot be verified, state that clearly" rule. What **was** verified via static analysis and a live schema check:

1. `mcp__insforge__get-table-schema('access_requests')` — the table exists live but returned **zero sample rows**, and its RLS shows a public `INSERT` policy (`Anyone can submit access request`) that nothing in the deployed app actually calls.
2. Grepping the whole repo for `access_requests`, the only writers are `supabase/functions/process-access-request/index.ts` and `supabase/functions/approve-recruiter/index.ts` — these live under `supabase/functions/`, a pre-InsForge-migration legacy tree that is not part of the InsForge deploy path (`scripts/deploy-all-functions.js` only reads `insforge/functions/`). They are already dead, independent of this change.
3. `app/admin/recruiter-requests/page.tsx` (now deleted) lived in `app/admin/` — a separate, unguarded route tree with **no `layout.tsx`**, entirely outside `app/dashboard/admin/layout.tsx`'s auth guard. It was reachable only via one hardcoded `CommandPalette.tsx` entry (`route: '/admin/recruiter-requests'`), itself not gated behind any usage signal.
4. `insforge/functions/admin-recruiter/index.ts` (singular, now deleted) was the only consumer of `access_requests`, and nothing else in the codebase called it.

This is strong static + live-schema evidence of dead code (empty table, orphaned unguarded route, single dead-code caller), but it is **not** proof of zero historical traffic — flagged rather than asserted.

## Deviations from the doc — flagged explicitly, not silently resolved

1. **`create-on-behalf` cannot literally call `/api/recruiter/request-access`** (the doc's "thin wrapper over the existing recruiter request-access flow"). That route resolves `company_id`/`user_id` from the caller's own session (`auth.uid()`-shaped, self-service only) — an admin acting on behalf of a different person has no way to drive it. Same tension R-6 already documented for its member-intervention routes (RPCs scoped to `auth.uid()` can't be reused literally for an on-behalf actor). What shipped reproduces the *exact same DB-effect shape* as that route (company resolve-by-GSTIN-or-create, `company_members` `invited`, `company_verification_requests` `submitted`, matching `verification_audit_log` rows) directly in `admin-recruiters`, not a parallel/divergent implementation of the business rule — but it is not the literal same code path.
2. **Discovered gap, not fixed here (out of scope):** staff-created companies via `admin-companies` POST (R-6) never get a `company_verification_requests` row, so they can never surface in the Verification queue and can never move `pending → verified`. `create-on-behalf`'s own new-company branch works around this by inserting that row itself (mirroring the self-serve flow), but the underlying `admin-companies` POST gap is untouched — flagged for R-6 owners, not fixed here to stay in scope.
3. **Dropped `bulk-status`/`approve` bulk action** (old semantics: flip `profiles.status` to `'active'` for recruiters stuck in `pending_verification` from the deleted `approve-setup` pipeline). Nothing in the new model reads `profiles.status` for recruiters anymore — keeping a button that flips a column nothing consumes would be worse than removing it. `bulk-active` (the account-level `is_active` kill switch) and `bulk-delete` are kept; they're orthogonal to the dead pipeline.
4. **`components/auth/RecruiterRegisterForm.tsx` (the *public* self-serve signup form, distinct from the admin one rewritten here) still calls the legacy `recruiter-request` edge function**, which still collects PAN/Aadhaar/KYC uploads and sets `profiles.status='pending_verification'` — a status value nothing in the rewritten admin side can act on anymore, since `verify-otp`/`approve-setup` are deleted. This reinforces the already-tracked (not yet executed) doc-06 "signup form alignment" follow-up: repoint that public form at `/api/recruiter/request-access` and drop PAN/Aadhaar collection. Not touched here — explicitly out of R-7's file list (`admin-recruiters`, `admin-recruiter`, `access_requests`, `recruiters/page.tsx`).
5. **Two nearly-identical global "commit pending bulk action while navigated away" handlers** (`app/dashboard/DashboardLayoutClient.tsx:672-709` and `lib/auth/AuthContext.tsx:585-630`) still contain an `action === 'approve' || action === 'reject'` branch that calls `admin-recruiters` `bulk-status` for recruiters. Since nothing writes that `action` shape into `tm_pending_action_recruiters` anymore (deviation 3), this branch is now dead/unreachable for recruiters specifically — harmless (never fires), but not cleaned up here since it's shared verbatim with the *candidates* pending-action handling in the same conditional blocks, in two files outside R-7's scope. Flagged, not touched.
6. **`GET` filter behavior on `membership_status`/`company_id` relies on PostgREST's `!inner` embedded-join filter syntax** (`select('...,company_members!inner(...)')` + `.eq('company_members.status', x)`). The InsForge SDK's own docs describe the database client as "FULL PostgREST capabilities," and this is standard PostgREST syntax, but it was not directly exercisable in this offline dev environment (no valid staff JWT to hit the live edge function). `tsc -p insforge/tsconfig.json` passes clean (types are correct), but the live query behavior for these two filters specifically is **unverified against the running backend** — flagged, not claimed as tested.
7. **`recruiter_profiles.is_approved`** (and the PAN/Aadhaar/KYC-document fields still shown read-only in the new drawer) has no code path left that ever sets it to `true` for recruiters going through the new `create-on-behalf`/`request-access` pipeline — only the still-live legacy `recruiter-request` fn (deviation 4) writes it. It's displayed as historical/informational data in the drawer, not as an active workflow state. Not a regression introduced here (the field was already headed toward this state the moment `approve-setup` was marked for deletion) — flagged as an observed drift, not fixed.

## Verification

Ran from `Talentmesh-demo/`. Commands and output below, verbatim (framer-motion baseline error and the two unrelated pre-existing e2e failures explained after the Playwright block, not hidden).

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

**1 error, pre-existing** — same `app/dashboard/candidate/[role_id]/applications/page.tsx` framer-motion `Variants` typing issue R-6's report documented as its baseline, untouched by this task. `.next/` was deleted and the app rebuilt to rule out stale-cache noise (an initial run also flagged `.next/types/validator.ts` referencing the just-deleted `app/admin/recruiter-requests/page.js` — a stale generated-types artifact, not a source error; it disappeared after clearing `.next/`). Zero errors in any file this task touched.

### `npx tsc -p insforge/tsconfig.json`

```
(no output, exit code 0)
```

### `npx vitest run`

```
 RUN  v4.1.9 C:/Users/Anuj/Desktop/tm_web/Talentmesh-demo


 Test Files  8 passed (8)
      Tests  46 passed (46)
   Start at  20:09:26
   Duration  24.21s (transform 1.65s, setup 11.88s, import 3.52s, tests 275ms, environment 61.29s)
```

Same 8/46 as R-6's baseline.

### `npx playwright test --reporter=list`

First full run caught a real regression from this task: the recruiters bulk-action bar had an unrequested extra "Cancel" button, which collided with `BulkConfirmModal`'s own "Cancel" button and made `page.click('button:has-text("Cancel")')` in `e2e/admin-stabilization.spec.ts` resolve to two elements and time out. Removed the button (it was speculative, not in the original page, not asked for), rebuilt (`next build`), and re-ran — the recruiters test now passes in isolation:

```
ok 1 [chromium] › e2e\admin-stabilization.spec.ts:340:7 › Admin Stabilization E2E Tests › Recruiter View: search, invite, and bulk confirmation drawer triggers (5.7s)
1 passed (29.7s)
```

Final full-suite run after the fix (48 tests, 2 workers):

```
2 failed
    [chromium] › e2e\admin-stabilization.spec.ts:390:7 › Admin Stabilization E2E Tests › Candidate View: queue export lifecycle & progress model updates (Correction 4)
    [chromium] › e2e\dashboard.spec.ts:112:9 › Dashboard Accessibility & Role Protection › Admin Dashboard UI & Caching Integration Tests › admin dashboard manual refresh button disables during execution
7 skipped
39 passed (2.3m)
```

Both failures were investigated and are **not caused by this task**:

- **Candidate export test** — deterministic (reproduced identically 2/2 times in isolation, not a flake): `git status` shows `app/dashboard/admin/candidates/page.tsx` modified and `insforge/functions/admin-export/` entirely untracked *before this session started* — pre-existing, uncommitted R-8 (candidate-export) work already sitting in this working tree (`docs/archive/agent-outputs/adminImplementation/6-R8-candidate-export__sonnet5.md` already exists from that prior session). This task never touched `candidates/page.tsx` or `admin-export`.
- **Admin dashboard refresh-button test** — asserts the refresh button's text passes through a `/Refreshing/i` state within a 15s window; it passed in the very first full run of this session (`ok 23`) and only failed on this later full-suite run under load, consistent with a timing-window flake on an unrelated page (`app/dashboard/admin/page.tsx`'s own refresh handler) that this task never opened.

Both are called out here rather than silently excluded, per "do not claim verification you didn't run" — but neither traces to a file this task modified.

## Explicitly not done (out of scope / needs a decision)

- Doc-06 "signup form alignment" (repoint `components/auth/RecruiterRegisterForm.tsx` off the legacy `recruiter-request` fn, drop PAN/Aadhaar collection) — already tracked separately, reinforced by deviation 4 above.
- The `admin-companies` POST missing-verification-request gap (deviation 2) — flagged for R-6, not fixed here.
- No new e2e coverage added for `send-reset-link` or `create-on-behalf` — the existing `admin-stabilization.spec.ts` recruiter test was kept green (see Verification) but doesn't exercise either new action against a live backend.
- Cleanup of the now-dead `approve`/`reject` branch in the two shared global pending-action handlers (deviation 5) — flagged, not touched (shared with candidates logic, out of this file list).
