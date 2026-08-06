# R-5 — Jobs & Applications: posting-centric lifecycle management   ·   model: Claude Sonnet 5 (Claude Code)   ·   phase: 5   ·   date: 2026-07-20

## Prompt given

Implement doc 14 §R-5 in full: `admin-jobs` `get-detail` action + PATCH allowlist (D-16, P0), `admin-applications` mandatory staff `reason` + company-admin notification, `on_behalf_of` audit on both, job-status transitions reused from the doc-04 §4 table (not forked), new `app/dashboard/admin/jobs/[id]/page.tsx` (Details/Applicants/History tabs), jobs list rows linking to it. Migration 054 (approval_status) and 055 (audit_log.on_behalf_of/reason) were stated as already applied live — verified, not re-applied. W5 (job-approvals page, approval_status filtering) was stated as already done — verified via git log (`d3e492c`, `c75c43e`) and left untouched.

## What changed

**`insforge/functions/_shared/jobStatusTransitions.ts` (new).** The doc-04 §4 job-lifecycle table (`draft→active`, `active↔paused`, `active/paused→closed`) did **not exist anywhere in code** before this change — see "Deviations" below, this is a documentation/implementation mismatch, not something I forked. `isValidJobStatusTransition(from, to)` is the single source now; `admin-jobs` PATCH is its only caller.

**`insforge/functions/admin-jobs/index.ts`:**
- `GET ?action=get-detail&id=` — job row + `companies!jobs_company_id_fkey(id,name,gstin,status)` + `profiles!jobs_recruiter_id_fkey(id,name,email)` + `approval_status` + `applicationsByStage` (counts per `applications.status`, computed in-process from a `select('status')` scan — no new RPC).
- `PATCH` — replaced the unrestricted `db.database.from('jobs').update(body)` with a zod `.strict()` schema (D-16, P0): `.strict()` is the allowlist — any key outside `{title, description, requirements, location, salary_min, salary_max, experience_min, experience_max, department, skills_required, status, reason}` now 400s. `reason` (min 10 chars) is required on every PATCH. A `status` field is validated against `isValidJobStatusTransition` against the job's current DB status before the write (409 `invalid_transition` on violation). Writes `audit_log` with `on_behalf_of: job.company_id` and the caller's `reason`.
- `approve`/`reject`/`bulk-update`/`bulk-delete`/POST-create/DELETE are unchanged — see "Deviations" for why `on_behalf_of` was deliberately **not** added to `approve`/`reject`.

**`insforge/functions/admin-applications/index.ts`:**
- `GET` gains a `job_id` filter (needed by the new Applicants tab) and the `jobs` embed now also selects `id, company_id` (was `title, companies(name)` only).
- `PATCH` now requires `reason` (zod `min(10).max(500)`) on every call — admin-applications is staff-only end-to-end (`requireStaff` gates the whole function), so this is unconditional, not branched on actor type. On a successful stage-change RPC call, it now: (a) inserts `audit_log` with `on_behalf_of: job.company_id`, `action: 'application_stage_changed'`; (b) looks up `company_members` where `member_role='admin' AND status='active'` for that company and inserts one `notification_jobs` row per admin (channel `in_app`, 7-day `expires_at`, no `notification_templates` row was added — title/message are inlined, per the "no migration needed" constraint).
- The generic non-status PATCH branch (rare/legacy — no current UI calls it) is otherwise unchanged.

**`insforge/functions/admin-audit-logs/index.ts`:** added a `record_id` query filter (didn't exist — `search` only ilike-matched `action`/`table_name`, never `record_id`) and added `on_behalf_of`/`reason` to the response shape. Needed for the new History tab.

**`app/dashboard/admin/applications/_components/ApplicationDetailModal.tsx` (new)** — the existing 400-line inline detail modal was extracted out of `applications/page.tsx` verbatim (JSX/styling untouched) so the new job-detail Applicants tab can reuse it instead of duplicating it (explicit doc-14 instruction). Internally uses the new `useAdminApplicationStage` hook for stage changes.

**`lib/hooks/useAdminApplicationStage.ts` (new)** — shared stage-change hook (`window.prompt` for the now-mandatory reason → PATCH `admin-applications` → typed ok/error result). Used by `ApplicationDetailModal`, by `applications/page.tsx`'s quick-action row buttons, and by the new job-detail Applicants tab.

**`app/dashboard/admin/applications/page.tsx`** — swapped the inline modal JSX for `<ApplicationDetailModal>`; quick-action Shortlist/Reject buttons now go through `useAdminApplicationStage` (previously called `admin-applications` PATCH with no `reason`, which the server now rejects — this would have been a P0 regression if left as-is).

**`app/dashboard/admin/jobs/[id]/page.tsx` (new)** — header (title, company name → `/dashboard/admin/companies/[id]` link, recruiter, job-status + approval-status badges via the existing `StatusPill`), per-stage applicant-count chips, three tabs:
- **Details** — full allowlisted field form + required reason field, PATCHes `admin-jobs`.
- **Applicants** — `DataTable` over `admin-applications?job_id=`, row click opens the reused `ApplicationDetailModal`.
- **History** — `admin-audit-logs?record_id=<jobId>` + `application_status_history` (direct client `insforge.database` read, same RLS-allowed pattern the old inline modal already used) filtered to this job's application ids.

**`app/dashboard/admin/jobs/page.tsx`** — two changes only: (1) the "Edit Job" PATCH now builds a payload restricted to the allowlisted fields + a new required "Reason" textarea in the edit form (the old payload spread the *entire* form — `company_id`, `type`, `currency`, etc. — which the new server-side `.strict()` schema would have 400'd on every edit; this is a fix for a regression my own PATCH change would otherwise have caused, not a new feature). (2) job-title table cell is now a `<Link>` to `/dashboard/admin/jobs/[id]`.

**`__tests__/jobStatusTransitions.test.ts` (new)** — the only new business-logic branch (the transition table) gets a direct unit test; everything else is exercised by the existing e2e/vitest suites (see Verification).

## SQL authored (if any)

None. Migrations 054/055 were verified already live via `mcp__insforge__run-raw-sql` (`jobs.approval_status`, `audit_log.on_behalf_of`, `audit_log.reason` all present), per the task's instruction that no migration work was needed.

## Verification run

```
$ npx tsc --noEmit
```
Clean except one pre-existing, unrelated error (`app/dashboard/candidate/[role_id]/applications/page.tsx:686` — framer-motion `Variants` typing; file untouched by this change, confirmed via `git status --short` on that path returning nothing).

```
$ npx tsc -p insforge/tsconfig.json
```
Exit 0, no output.

```
$ npx vitest run
```
```
 Test Files  8 passed (8)
      Tests  46 passed (46)
```
(44 pre-existing + 2 new in `jobStatusTransitions.test.ts`.)

```
$ npx playwright test --reporter=list
```
```
  41 passed
  7 skipped
```
0 failed. The 7 skips are pre-existing (`test.skip()` for missing real-JWT fixtures / live-backend integration — unrelated to this change, unmodified by it).

**Not verified:** no edge function was deployed (InsForge deploys per-file; source changes here are not live until `admin-jobs`/`admin-applications`/`admin-audit-logs` are redeployed). No manual browser click-through of the new `/dashboard/admin/jobs/[id]` page was performed — the dev server was not started for this task, only the automated suites above were run.

## Deviations / assumptions

1. **Doc 14's PATCH allowlist prose (`experience`, `skills`) doesn't match the live `jobs` schema** (verified via `information_schema.columns`): the real columns are `experience_min`, `experience_max`, `skills_required`. Implemented against the real columns and noted here rather than silently allowing nothing through a non-existent `experience`/`skills` key.
2. **"Reuse the doc-04 §4 transition table, do not fork it" — no such table existed in code.** `app/api/jobs/[jobId]/route.ts` (generic PATCH) and `.../publish|close/route.ts` (recruiter-side) write `status` directly with no from/to validation at all, relying solely on the `enforce_active_job_limit` entitlement trigger. I created the one canonical table (`_shared/jobStatusTransitions.ts`) and used it only in `admin-jobs`, since that's what R-5 scopes. **The recruiter-side routes remain unguarded** — a recruiter can still PATCH `active→active` or skip straight to `closed` from `draft` with no server-side rejection. This is a pre-existing gap, not introduced by this change, but worth a follow-up ticket since the state machine now has exactly one enforcement point and it isn't on the path most jobs actually take.
3. **`approve`/`reject` job actions do not get `on_behalf_of`.** Doc 14 (d) says "both [functions] write audit_log with on_behalf_of: company_id" in the context of the PATCH/stage-change paths specifically; I read `approve`/`reject` as platform moderation decisions (admin acting *on* the company, not *for* it) and left them as plain `audit_log` writes with no `on_behalf_of`. Flagging this interpretation explicitly in case the advisor disagrees — it's a one-line addition if so.
4. **`notification_jobs` requires one row per recipient** (`user_id` is singular, not an audience descriptor — that shape is R-11's future work, not built yet). Sending to N company admins means N inserts; implemented that way, no new `notification_templates` row added (title/message inlined to avoid a migration).
5. **Migration 055's file header still says "⚠ FILE ONLY — do NOT apply live without human review"** despite `on_behalf_of`/`reason` being confirmed live on `audit_log`. This is the same live-DB-drift pattern flagged in prior sessions (undocumented out-of-band apply) — the file comment should be updated or the ledger reconciled, but that's a docs-hygiene fix outside R-5's scope.
6. **`admin-jobs` `bulk-update` (POST action) still writes an unrestricted `updates` object with no allowlist.** D-16 names "PATCH" specifically; `bulk-update` is a separate, pre-existing code path with the same shape of hole. Not touched — flagging as a related finding for a future pass.
7. Reason capture in the UI uses `window.prompt()` for the two stage-change quick-actions (list row buttons, and the modal's Shortlist/Reject/dropdown) rather than a dedicated `InterventionModal` component (doc 14 §5.4 mentions a shared `InterventionModal` for R-5/R-6/R-7, not yet built anywhere in the codebase). Chose the smaller diff since R-5 alone doesn't justify authoring that shared component; R-6/R-7 will need it too and should build it once, at which point `useAdminApplicationStage` and the jobs-detail "Reason" textarea are the two call sites to migrate onto it.

## Open questions for the advisor

1. Should `approve`/`reject` on `admin-jobs` also carry `on_behalf_of` (see deviation 3)? One-line fix if yes.
2. Should the recruiter-side job routes (`app/api/jobs/[jobId]/{route,publish,close}.ts`) be wired onto `isValidJobStatusTransition` now that it exists, or deferred to a dedicated ticket (deviation 2)?
3. `admin-jobs` `bulk-update` has no field allowlist (deviation 6) — same class of bug as D-16 but not named in R-5. Worth its own P1/P0 ticket?
4. Confirm whether the `InterventionModal` (doc 14 §5.4) should be built now (before R-6/R-7 land) so R-5's `window.prompt()` reason-capture isn't shipped as the pattern other workstreams copy.
