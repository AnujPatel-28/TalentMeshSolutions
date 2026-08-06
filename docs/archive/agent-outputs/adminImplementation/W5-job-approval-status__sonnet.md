# W5 — Job Approval State Model

**Workstream:** W5 (doc 12 §W5, doc 02 §Migration 054, doc 14 §6.3)
**Date:** 2026-07-19
**Scope:** Migration SQL (file only), edge-function filter + write changes, UI page rewrite of tab IDs / counts / modal footer
**Human gate:** Migration 054 is written to file only — **a human applies it**. No DDL was run.

---

## Finding being fixed (A-11 / F-6)

pp/dashboard/admin/job-approvals/page.tsx:64-68 inferred rejection from
is_approved=false AND status='closed'. Any job a recruiter merely closed and never
approved appeared in the admin **Rejected** tab. Two independent lifecycles
(moderation vs. publication) were encoded in one column pair.

---

## Files changed

| File | Change |
|---|---|
| `insforge/migrations/054_jobs_approval_status.sql` | **NEW** — SQL file only, not applied |
| `insforge/functions/admin-jobs/index.ts` | GET filter, approve write, reject write |
| `app/dashboard/admin/job-approvals/page.tsx` | Type, counts fetch, tab IDs, stat-card onClick, empty-state text, optimistic arithmetic, modal footer |

---

## 1. Migration 054 — file only (human applies)

**Path:** `insforge/migrations/054_jobs_approval_status.sql`

`sql
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending'
  CHECK (approval_status IN ('pending', 'approved', 'rejected'));

UPDATE public.jobs
  SET approval_status = 'approved'
  WHERE is_approved = true;
-- Everything else already defaults to 'pending' via the column default.

CREATE INDEX IF NOT EXISTS jobs_approval_status_idx
  ON public.jobs (approval_status);
`

Backfill decision (recorded): is_approved=false AND status='closed' rows default to
'pending', not 'rejected'. Platform is pre-launch; historical distinction is moot
(doc 02 §8: "data loss in these backfills is accepted"). Matches doc 02 §054 spec.

is_approved is retained (not dropped). Still co-written by approve/reject and still
referenced by live RLS policies (public_select, jobs_select_approved). Drop deferred
to later cleanup migration per doc 02 §054 comment.

---

## 2. Edge function — insforge/functions/admin-jobs/index.ts

### 2a. GET filter (lines 41-50)

Before:
`	s
if (status === 'pending') {
  query = query.eq('is_approved', false).eq('status', 'active');
} else if (status === 'active') {
  query = query.eq('is_approved', true).eq('status', 'active');
} else if (status === 'rejected') {
  query = query.eq('is_approved', false).eq('status', 'closed');
} else {
  query = query.eq('status', status);
}
`

After:
`	s
if (status === 'pending' || status === 'approved' || status === 'rejected') {
  // W5: filter on approval_status (054 column), not the is_approved+status dual-column inference
  query = query.eq('approval_status', status);
} else {
  // pass-through for publication status (draft/active/paused/closed)
  query = query.eq('status', status);
}
`

### 2b. approve action write

Before: .update({ is_approved: true, status: 'active' }) + audit action: 'approve'

After: .update({ approval_status: 'approved', is_approved: true }) + audit
action: 'job_approved', target_type: 'job', target_id: id, metadata: {...}
(is_approved: true co-written for backward compat; status not touched —
publication lifecycle is recruiter-owned per doc 14 §6.3 MVP decision 4)

### 2c. reject action write

Before: .update({ is_approved: false, status: 'closed' }) + audit action: 'reject'

After: .update({ approval_status: 'rejected', is_approved: false }) + audit
action: 'job_rejected', target_type: 'job', target_id: id, metadata: {...}
(status: 'closed' removed — rejecting a job no longer forces it closed)

Audit log shape updated to the doc-02 audit_log schema:
actor_id / action / target_type / target_id / metadata
replacing the old table_name / record_id / new_data shape.

---

## 3. UI page — app/dashboard/admin/job-approvals/page.tsx

### Type
Added pproval_status: 'pending' | 'approved' | 'rejected' to AdminJob.
is_approved: boolean retained (column persists in DB).

### fetchCounts — removed direct DB queries
Before: three insforge.database.from('jobs').select(*,{count:'exact',head:true})
calls with eq('is_approved',…).eq('status',…).

After: three invokeFunction('admin-jobs', {method:'GET', queries:{status:'…',limit:'1'}})
calls — reads total from edge function response.
insforge named import removed (unused).

### Tab IDs

| Old     | New        | Why |
|---------|------------|-----|
| pending | pending    | unchanged |
| active  | approved   | matches approval_status value |
| rejected | rejected  | unchanged |

All setActiveTab('active') / isActive={activeTab==='active'} updated to 'approved'.

### Optimistic count arithmetic
Before: activeTab === 'active' ? -1 : ... — 'active' never matched 'approved', counts drifted.
After: activeTab === 'approved' ? -1 : ... — correct key.

### Modal footer
Before: branched on (activeTab==='pending'||!selectedJob.is_approved)&&selectedJob.status!=='closed'
After: branches solely on selectedJob.approval_status:
  - 'pending'  => Reject + Approve buttons
  - 'approved' => Reject only
  - 'rejected' => Approve only (re-approval path)

---

## 4. What was NOT touched

- R-3/R-4/RBAC enforcement (withApi requiredPermission, lib/permissions.ts)
- All other admin pages (jobs/, applications/, companies/, recruiters/, etc.)
- is_approved column — not dropped; co-written for RLS compat
- jobs.status — not written by approve/reject (MVP decision 4)
- Public RLS policies (public_select, jobs_select_approved)

---

## 5. Verification commands — verbatim output

### 5a. Migration file exists
Command run:
  Get-Content "insforge\migrations\054_jobs_approval_status.sql" | Select-Object -First 3

Output:
  -- 054_jobs_approval_status.sql
  -- Doc ref: 12_Admin_Production_Readiness_Execution_Plan.md §W5 / 02_Admin_Portal_Schema_And_Database_Design.md §Migration 054
  -- Human applies — never an agent (standing project rule).

### 5b. Old dual-column inference gone from admin UI pages
Command run:
  Get-ChildItem -Recurse -Path "app\dashboard\admin" -Include "*.tsx","*.ts" | Select-String -Pattern "eq\('is_approved'" | Format-Table LineNumber, Filename, Line -AutoSize

Output:
  (no output — zero matches)
  Exit code: 0

### 5c. Old dual-column rejection inference gone from edge functions
Command run:
  Get-ChildItem -Recurse -Path "insforge\functions" -Include "*.ts" | Select-String -Pattern "is_approved.*false.*status.*closed|status.*closed.*is_approved" | Format-Table LineNumber, Filename, Line -AutoSize

Output:
  (no output — zero matches)
  Exit code: 0

### 5d. approval_status present in edge function
Command run:
  Select-String -Path "insforge\functions\admin-jobs\index.ts" -Pattern "is_approved|approval_status" | Format-Table LineNumber, Line -AutoSize

Output:
  LineNumber  Line
  ----------  ----
          43  // W5: filter on approval_status (054 column), not the is_approved+status dual-column inference
          44  query = query.eq('approval_status', status);
         136  // W5: write approval_status; is_approved kept for backward compat until cleanup migration
         138    .update({ approval_status: 'approved', is_approved: true })
         165  // W5: write approval_status only; do NOT force status='closed' (publication is recruiter-owned)
         167    .update({ approval_status: 'rejected', is_approved: false })

### 5e. TypeScript check — no errors in W5 files
Command run:
  npx tsc --noEmit 2>&1 | Out-String

Output (exit code 1 — pre-existing errors only, none in W5 files):
  .next/types/validator.ts(467,39): error TS2307: Cannot find module
    '../../app/dashboard/admin/impersonate/page.js'   <-- stale .next cache from R-10 deletion
  .next/types/validator.ts(1565,39): error TS2307: Cannot find module
    '../../app/api/impersonate/route.js'               <-- same
  app/dashboard/candidate/[role_id]/applications/page.tsx(686,37): error TS2322:
    framer-motion Variants type mismatch               <-- pre-existing, unrelated

Zero errors in app/dashboard/admin/job-approvals/page.tsx or
insforge/functions/admin-jobs/index.ts.

---

## 6. Post-migration checklist (human actions required)

- [ ] Apply migration 054 via InsForge dashboard or run-raw-sql MCP tool
- [ ] Verify index created: SELECT indexname FROM pg_indexes WHERE tablename='jobs' AND indexname='jobs_approval_status_idx';
- [ ] Spot-check: SELECT id, is_approved, approval_status FROM jobs LIMIT 10;
      Rows with is_approved=true => approval_status='approved'; others => 'pending'
- [ ] Open /dashboard/admin/job-approvals:
      Approved tab shows previously-approved jobs; Rejected tab empty (no false positives from status='closed')
- [ ] Approve and reject a test job:
      approval_status updates correctly; optimistic counts correct; status column NOT changed

---

## 7. Doc 02 §254 checklist item status

> 054 applied; job-approvals tabs filter on approval_status

- Migration SQL:        WRITTEN (awaiting human apply)
- Edge function filter: DONE  — admin-jobs GET uses approval_status
- Edge function writes: DONE  — approve/reject write approval_status; do not touch status
- UI tab IDs:           DONE  — match approval_status values (pending/approved/rejected)
- UI counts:            DONE  — fetched via edge function using approval_status filter
- Optimistic math:      DONE  — fixed ('active' key corrected to 'approved')
- Modal footer:         DONE  — branches on approval_status, not is_approved+status
