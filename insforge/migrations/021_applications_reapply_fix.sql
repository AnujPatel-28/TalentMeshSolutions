-- Migration 021: applications reapply fix
-- Drops the constraint applications_job_id_candidate_id_key if it exists,
-- allowing candidates to re-apply to the same job after withdrawing.
-- Ensures the conditional unique index idx_unique_candidate_job_application remains.

DO $$
DECLARE
  v_dup_count INTEGER;
BEGIN
  -- 1. Check for active duplicate applications
  SELECT COUNT(*) INTO v_dup_count
  FROM (
    SELECT candidate_id, job_id
    FROM public.applications
    WHERE status <> 'withdrawn'
    GROUP BY candidate_id, job_id
    HAVING COUNT(*) > 1
  ) t;

  IF v_dup_count > 0 THEN
    RAISE EXCEPTION 'Migration failed: Found % active duplicate applications. Cannot drop constraint without violating active unique index assumptions.', v_dup_count;
  END IF;
  
  -- 2. Check and drop constraint if it exists.
  -- PostgreSQL automatically drops the backing index when the constraint is dropped.
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'applications_job_id_candidate_id_key'
  ) THEN
    ALTER TABLE public.applications DROP CONSTRAINT applications_job_id_candidate_id_key;
  END IF;
END $$;
