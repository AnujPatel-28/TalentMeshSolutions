-- Migration 013: Security & Architectural Fixes
-- Run this in InsForge SQL Editor

-- 1. Convert resumes storage bucket from public to private
UPDATE storage.buckets
SET public = false
WHERE name = 'resumes';

-- 2. Fix candidate_resumes SELECT RLS policy so only the owner candidate can read their resumes
DROP POLICY IF EXISTS candidate_resumes_select ON public.candidate_resumes;
CREATE POLICY candidate_resumes_select ON public.candidate_resumes 
FOR SELECT USING (candidate_id = auth.uid());

-- 3. Add BEFORE DELETE trigger for resume reassignment on candidate_resumes
CREATE OR REPLACE FUNCTION public.reassign_resume_references()
RETURNS TRIGGER AS $$
DECLARE
  v_new_resume RECORD;
  v_primary_id UUID;
  v_resume_url TEXT;
BEGIN
  -- Get the current primary_resume_id and resume_url from candidate_profiles
  SELECT primary_resume_id, resume_url INTO v_primary_id, v_resume_url
  FROM public.candidate_profiles
  WHERE id = OLD.candidate_id;

  -- Check if we need to reassign references
  IF OLD.is_default OR v_primary_id = OLD.id OR v_resume_url = OLD.file_url THEN
    -- Find the newest remaining resume for this candidate (excluding the one being deleted)
    SELECT * INTO v_new_resume
    FROM public.candidate_resumes
    WHERE candidate_id = OLD.candidate_id AND id != OLD.id
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_new_resume.id IS NOT NULL THEN
      -- If the deleted one was default, make the new one default
      IF OLD.is_default THEN
        UPDATE public.candidate_resumes
        SET is_default = true
        WHERE id = v_new_resume.id;
      END IF;

      -- Update candidate profiles
      UPDATE public.candidate_profiles
      SET 
        primary_resume_id = CASE 
          WHEN primary_resume_id = OLD.id THEN v_new_resume.id 
          ELSE primary_resume_id 
        END,
        resume_url = CASE 
          WHEN OLD.is_default OR resume_url = OLD.file_url THEN v_new_resume.file_url 
          ELSE resume_url 
        END
      WHERE id = OLD.candidate_id;

    ELSE
      -- No remaining resumes, clear references
      UPDATE public.candidate_profiles
      SET primary_resume_id = NULL,
          resume_url = NULL
      WHERE id = OLD.candidate_id;
    END IF;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_reassign_resume_references ON public.candidate_resumes;
CREATE TRIGGER trigger_reassign_resume_references
  BEFORE DELETE ON public.candidate_resumes
  FOR EACH ROW
  EXECUTE FUNCTION public.reassign_resume_references();

-- 4. Add AFTER INSERT/DELETE/UPDATE trigger for job applications count
CREATE OR REPLACE FUNCTION public.update_job_applications_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.jobs
    SET applications_count = COALESCE(applications_count, 0) + 1
    WHERE id = NEW.job_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.jobs
    SET applications_count = GREATEST(0, COALESCE(applications_count, 0) - 1)
    WHERE id = OLD.job_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.job_id IS DISTINCT FROM NEW.job_id THEN
      UPDATE public.jobs
      SET applications_count = GREATEST(0, COALESCE(applications_count, 0) - 1)
      WHERE id = OLD.job_id;
      
      UPDATE public.jobs
      SET applications_count = COALESCE(applications_count, 0) + 1
      WHERE id = NEW.job_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_job_applications_count ON public.applications;
CREATE TRIGGER trigger_update_job_applications_count
  AFTER INSERT OR DELETE OR UPDATE OF job_id ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_job_applications_count();

-- 5. Add AFTER INSERT/DELETE/UPDATE trigger for resume upload count maintenance
CREATE OR REPLACE FUNCTION public.maintain_resume_upload_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.resume_id IS NOT NULL AND NEW.status != 'withdrawn' THEN
      UPDATE public.candidate_resumes
      SET upload_count = COALESCE(upload_count, 0) + 1
      WHERE id = NEW.resume_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.resume_id IS NOT NULL AND OLD.status != 'withdrawn' THEN
      UPDATE public.candidate_resumes
      SET upload_count = GREATEST(0, COALESCE(upload_count, 0) - 1)
      WHERE id = OLD.resume_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.resume_id IS DISTINCT FROM NEW.resume_id OR OLD.status IS DISTINCT FROM NEW.status THEN
      -- Decrement upload count for old state if applicable
      IF OLD.resume_id IS NOT NULL AND OLD.status != 'withdrawn' THEN
        UPDATE public.candidate_resumes
        SET upload_count = GREATEST(0, COALESCE(upload_count, 0) - 1)
        WHERE id = OLD.resume_id;
      END IF;
      -- Increment upload count for new state if applicable
      IF NEW.resume_id IS NOT NULL AND NEW.status != 'withdrawn' THEN
        UPDATE public.candidate_resumes
        SET upload_count = COALESCE(upload_count, 0) + 1
        WHERE id = NEW.resume_id;
      END IF;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_maintain_resume_upload_count ON public.applications;
CREATE TRIGGER trigger_maintain_resume_upload_count
  AFTER INSERT OR DELETE OR UPDATE OF resume_id, status ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.maintain_resume_upload_count();

-- 6. Add index on resume_access_log(candidate_id)
CREATE INDEX IF NOT EXISTS idx_resume_access_log_candidate_id ON public.resume_access_log(candidate_id);
