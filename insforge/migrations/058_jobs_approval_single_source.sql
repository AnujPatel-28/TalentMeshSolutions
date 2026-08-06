-- 058_jobs_approval_single_source.sql
-- Renumbered from a 055 draft: 055_audit_spine_hardening.sql, 056_guard_last_admin_deactivate_escape.sql
-- and 057_create_subscription_plans.sql already exist and 055 is applied. This file is 058.
--
-- Doc ref: 16_Job_Approval_Single_Source_Of_Truth_Fix.md
--          follows 054_jobs_approval_status.sql, which added approval_status and deferred
--          dropping is_approved until the public-read/RLS guards are migrated.
-- Human applies — never an agent (standing project rule).
--
-- Purpose (two related fixes):
--   A. Make approval_status the SINGLE SOURCE OF TRUTH; reduce is_approved to a derived mirror
--      so the two columns cannot drift.
--   B. Remove UPDATE privilege on the approval columns from client roles, so a recruiter cannot
--      approve their own job.
--
-- Rollback:
--   ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_is_approved_matches_approval_status;
--   ALTER TABLE public.jobs ALTER COLUMN is_approved DROP NOT NULL;
--   DROP TRIGGER IF EXISTS trg_jobs_sync_is_approved ON public.jobs;
--   DROP FUNCTION IF EXISTS public.jobs_sync_is_approved();
--   GRANT UPDATE ON public.jobs TO authenticated;   -- restores table-wide column access
--   GRANT UPDATE ON public.jobs TO anon;            -- only if §D was applied
--
-- ─────────────────────────────────────────────────────────────────────────────────────────
-- PRODUCT DECISION (MVP, recorded 2026-07-25 — do not "fix" this in review):
--   Editing an already-approved job does NOT reset it to 'pending'. There is deliberately
--   NO automatic re-moderation after an edit. A recruiter may edit an approved job's content
--   and it stays approved and publicly visible.
--   Consequences that are intentional, not oversights:
--     * No trigger here resets approval_status on content change.
--     * The RLS policy jobs_update_company is deliberately NOT given a
--       `WITH CHECK (approval_status = 'pending')` clause — that would block edits to approved
--       jobs entirely, which is the opposite of this decision.
--     * The approval columns are protected by COLUMN PRIVILEGES (§C), not by constraining
--       which rows a recruiter may edit. Recruiters keep full edit rights on content columns.
-- ─────────────────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ══ A. Single source of truth ═══════════════════════════════════════════════════════════

-- A1. Repair existing drift, FAIL CLOSED.
--     is_approved is recomputed from approval_status, never the reverse, because approval_status
--     is the moderation record (3 states, written only by the admin approve/reject paths) while
--     is_approved is the legacy 2-state publication guard and cannot represent 'rejected'.
--     Direction rationale (evidence-based):
--       * The drifted rows are `approval_status='pending'`. 'pending' is the column default from
--         054, and no verified writer sets 'pending' to mean "approved". Treating pending as
--         approved would publish rows that the moderation queue still lists as unreviewed.
--       * Fail-closed is the safe direction under uncertainty: it removes public exposure and is
--         trivially reversible by an admin clicking Approve, whereas the opposite direction
--         silently grants approval that cannot be un-granted without noticing it happened.
--     NOTE: we do NOT claim these rows were "never approved". The pre-fix bulk-approve path
--     wrote no audit_log entry, so the absence of a 'job_approved' event is not evidence either
--     way — it is exactly what a bulk approval would also look like. The repair direction rests
--     on the two bullets above, not on audit-log absence.
UPDATE public.jobs
   SET is_approved = (approval_status = 'approved')
 WHERE is_approved IS DISTINCT FROM (approval_status = 'approved');

-- A2. Derive is_approved on every write, from every writer.
--     This is what makes the fix structural rather than per-call-site: edge functions, the
--     create_job RPC, raw SQL and direct client writes all pass through here, so a writer that
--     sets only is_approved can no longer move a job onto the public board.
--     Interaction with §C: a BEFORE trigger assigning to NEW is NOT subject to column
--     privileges, so this keeps working for callers who have no UPDATE right on is_approved.
--     Interaction with the product decision: this reads approval_status and never writes it, so
--     a content edit leaves approval state exactly as it was.
CREATE OR REPLACE FUNCTION public.jobs_sync_is_approved()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  NEW.is_approved := (NEW.approval_status = 'approved');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_jobs_sync_is_approved ON public.jobs;
CREATE TRIGGER trg_jobs_sync_is_approved
  BEFORE INSERT OR UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.jobs_sync_is_approved();

-- ══ B. Tripwire ═════════════════════════════════════════════════════════════════════════

-- The trigger already guarantees the invariant, so this constraint should never fire. It exists
-- so that if the trigger is dropped or bypassed, the database refuses to STORE a drifted row
-- instead of silently publishing an unmoderated job.
-- NOT NULL first: `NULL = (approval_status='approved')` evaluates to NULL, which a CHECK treats
-- as a pass, so a nullable column would leave a hole in the tripwire.
-- Verified before writing this migration: 0 rows have is_approved IS NULL.
ALTER TABLE public.jobs ALTER COLUMN is_approved SET NOT NULL;

ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_is_approved_matches_approval_status
  CHECK (is_approved = (approval_status = 'approved'));

-- ══ C. Authorization fix: recruiters cannot write approval state ════════════════════════
--
-- The problem is NOT that RLS misbehaves — RLS behaves exactly as PostgreSQL documents. For
-- UPDATE, a policy with no WITH CHECK reuses its USING expression for the new row, and
-- jobs_update_company's USING constrains only tenancy (company_id / company-admin-or-owner).
-- It says nothing about which COLUMNS may be written, because that is not RLS's job — column
-- access is a privilege concern. `authenticated` held table-level UPDATE, which covers every
-- column, so a recruiter could set approval_status themselves.
--
-- Verified on the live database (in a rolled-back transaction, as role `authenticated` with the
-- recruiter's own JWT sub): `UPDATE jobs SET approval_status='approved', is_approved=true`
-- succeeded, rows_updated=1. After the grants below, the same statement fails with
-- insufficient_privilege while a title edit and a status change still succeed.
--
-- The fix is column-level UPDATE privileges: replace the table-wide grant with an explicit
-- allowlist of the columns a recruiter may edit. This is enforced by the privilege system before
-- any policy or trigger runs, so it holds for every route — PostgREST/data API, RPC, or raw SQL.
--
-- The allowlist is exactly the fields in `jobUpdateSchema` (lib/validation/jobs.ts) plus
-- `status`, which /api/jobs/[jobId]/publish and /close write using the caller's own token.
-- `status` is deliberately INCLUDED: publication is recruiter-owned, and status alone cannot
-- expose an unapproved job because jobs_select_approved requires status='active' AND
-- is_approved=true. Excluding it would break legitimate publish/close.
--
-- Deliberately NOT granted: id, company_id, recruiter_id (tenancy — reassigning these would move
-- a job between tenants), is_approved, approval_status (the approval boundary), views_count,
-- applications_count (server-owned counters; applications_count is maintained by the SECURITY
-- DEFINER trigger update_job_applications_count, which is unaffected by this revoke), fts,
-- expires_at, created_at, updated_at (updated_at is set by the BEFORE trigger
-- set_current_timestamp_updated_at, which needs no privilege).
--
-- Roles NOT touched: postgres and project_admin keep full UPDATE, so the admin approve/reject
-- paths in the admin-jobs edge function (service key) continue to work unchanged.

REVOKE UPDATE ON public.jobs FROM authenticated;

GRANT UPDATE (
  title,
  description,
  requirements,
  skills_required,
  type,
  location,
  salary_min,
  salary_max,
  currency,
  experience_min,
  experience_max,
  department,
  status
) ON public.jobs TO authenticated;

-- ══ D. Defence in depth: anon has no legitimate UPDATE on jobs ══════════════════════════
-- `anon` also held table-level UPDATE, including on the approval columns. No RLS policy grants
-- anon an UPDATE path (jobs_update_company's USING requires authz.company_id_of(auth.uid()),
-- which is NULL for anon), so this revoke should be a behavioural no-op and removes a privilege
-- that was only ever blocked by a policy.
-- This statement is independent of §C — drop just this line if the team prefers to keep the
-- anon change out of this migration.
REVOKE UPDATE ON public.jobs FROM anon;

COMMIT;

-- ══ Post-apply verification ═════════════════════════════════════════════════════════════
--   node scripts/verify_job_approval_invariant.mjs
--
-- Or by hand — all three expect 0 rows / the stated result:
--   -- 1. no drift
--   SELECT id, is_approved, approval_status FROM public.jobs
--    WHERE is_approved IS DISTINCT FROM (approval_status = 'approved');
--   -- 2. authenticated has no table-wide UPDATE
--   SELECT 1 FROM information_schema.table_privileges
--    WHERE table_name='jobs' AND grantee='authenticated' AND privilege_type='UPDATE';
--   -- 3. authenticated cannot update the approval columns
--   SELECT column_name FROM information_schema.column_privileges
--    WHERE table_name='jobs' AND grantee='authenticated' AND privilege_type='UPDATE'
--      AND column_name IN ('is_approved','approval_status');
--
-- NOTE: is_approved is still NOT dropped. RLS jobs_select_approved (050) and the public
-- job-board reads still guard on is_approved = true; they keep working unchanged because the
-- column is now always derived. Dropping it remains deferred, as 054 stated.
