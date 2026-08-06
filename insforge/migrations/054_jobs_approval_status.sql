-- 054_jobs_approval_status.sql
-- Doc ref: 12_Admin_Production_Readiness_Execution_Plan.md §W5 / 02_Admin_Portal_Schema_And_Database_Design.md §Migration 054
-- Human applies — never an agent (standing project rule).
-- Purpose: add jobs.approval_status to separate the moderation lifecycle from the
--          publication lifecycle (status). Fixes A-11: "rejected == closed".
-- Rollback: DROP INDEX IF EXISTS jobs_approval_status_idx; ALTER TABLE public.jobs DROP COLUMN IF EXISTS approval_status;

-- 1. Add the column.
--    DEFAULT 'pending' is intentional: every row (including pre-existing rows not yet
--    explicitly approved by the old is_approved=true path) enters the new column as
--    pending, so nothing is silently labelled 'rejected'.
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending'
  CHECK (approval_status IN ('pending', 'approved', 'rejected'));

-- 2. Backfill: rows where is_approved=true → 'approved'.
--    Rows where is_approved=false (including those with status='closed') stay 'pending'.
--    The historical rejected-vs-closed ambiguity is moot: the platform is pre-launch and
--    all jobs are test data. This is a recorded product decision (02_Admin_Portal_Schema…
--    §8 standing rule: "Because the platform is not live … data loss in these backfills
--    is accepted.").
UPDATE public.jobs
  SET approval_status = 'approved'
  WHERE is_approved = true;
-- Everything else already defaults to 'pending' via the column default.

-- 3. Index for the approval-queue filters used by admin-jobs GET.
CREATE INDEX IF NOT EXISTS jobs_approval_status_idx
  ON public.jobs (approval_status);

-- NOTE: is_approved is retained here.
-- The old column is kept until admin-jobs + every public-read RLS policy
-- (public_select / jobs_select_approved) that still guards on is_approved=true
-- have been migrated. Dropping is_approved is deferred to a later cleanup
-- migration (per doc 02 §054 comment). Do not drop it in this file.
