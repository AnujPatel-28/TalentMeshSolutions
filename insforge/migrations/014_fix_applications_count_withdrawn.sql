-- Migration 014: Fix Job Applications Count for Withdrawn Applications
-- Run this in InsForge SQL Editor

CREATE OR REPLACE FUNCTION public.update_job_applications_count()
RETURNS TRIGGER AS $$
DECLARE
  v_old_is_active BOOLEAN;
  v_new_is_active BOOLEAN;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status IS DISTINCT FROM 'withdrawn' THEN
      UPDATE public.jobs
      SET applications_count = COALESCE(applications_count, 0) + 1
      WHERE id = NEW.job_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.status IS DISTINCT FROM 'withdrawn' THEN
      UPDATE public.jobs
      SET applications_count = GREATEST(0, COALESCE(applications_count, 0) - 1)
      WHERE id = OLD.job_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    v_old_is_active := (OLD.status IS DISTINCT FROM 'withdrawn');
    v_new_is_active := (NEW.status IS DISTINCT FROM 'withdrawn');

    IF OLD.job_id = NEW.job_id THEN
      -- Job is the same, check if active status changed
      IF v_old_is_active AND NOT v_new_is_active THEN
        -- Was active, now withdrawn
        UPDATE public.jobs
        SET applications_count = GREATEST(0, COALESCE(applications_count, 0) - 1)
        WHERE id = NEW.job_id;
      ELSIF NOT v_old_is_active AND v_new_is_active THEN
        -- Was withdrawn, now active
        UPDATE public.jobs
        SET applications_count = COALESCE(applications_count, 0) + 1
        WHERE id = NEW.job_id;
      END IF;
    ELSE
      -- Job changed (rare case)
      IF v_old_is_active THEN
        UPDATE public.jobs
        SET applications_count = GREATEST(0, COALESCE(applications_count, 0) - 1)
        WHERE id = OLD.job_id;
      END IF;
      IF v_new_is_active THEN
        UPDATE public.jobs
        SET applications_count = COALESCE(applications_count, 0) + 1
        WHERE id = NEW.job_id;
      END IF;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger (to ensure it operates on TG_OP UPDATE)
DROP TRIGGER IF EXISTS trigger_update_job_applications_count ON public.applications;
CREATE TRIGGER trigger_update_job_applications_count
  AFTER INSERT OR DELETE OR UPDATE OF job_id, status ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_job_applications_count();
