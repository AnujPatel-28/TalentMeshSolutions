-- Migration 011: Resume Architecture Setup, Validation Triggers, Access Log, Bucket Creation, and Indexes
-- Run this in InsForge SQL Editor

-- 1. Add Resume System Fields to Candidate Profiles
ALTER TABLE public.candidate_profiles ADD COLUMN IF NOT EXISTS primary_resume_id UUID REFERENCES public.candidate_resumes(id) ON DELETE SET NULL;
ALTER TABLE public.candidate_profiles ADD COLUMN IF NOT EXISTS is_discoverable BOOLEAN DEFAULT true;

-- 2. Add Resume System Fields to Applications Table
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS resume_id UUID REFERENCES public.candidate_resumes(id) ON DELETE SET NULL;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS resume_snapshot_key TEXT;

-- 3. Primary Resume Ownership Trigger
CREATE OR REPLACE FUNCTION public.check_primary_resume_ownership()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.primary_resume_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.candidate_resumes
      WHERE id = NEW.primary_resume_id
      AND candidate_id = NEW.id
    ) THEN
      RAISE EXCEPTION 'Primary resume does not belong to the candidate.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_primary_resume_ownership ON public.candidate_profiles;
CREATE TRIGGER trigger_check_primary_resume_ownership
  BEFORE INSERT OR UPDATE OF primary_resume_id ON public.candidate_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_primary_resume_ownership();

-- 4. Maximum Resumes Limit Trigger (max 5)
CREATE OR REPLACE FUNCTION public.check_max_resumes_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.candidate_resumes WHERE candidate_id = NEW.candidate_id;
  IF v_count >= 5 THEN
    RAISE EXCEPTION 'Maximum limit of 5 resumes reached.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_max_resumes_limit ON public.candidate_resumes;
CREATE TRIGGER trigger_check_max_resumes_limit
  BEFORE INSERT ON public.candidate_resumes
  FOR EACH ROW
  EXECUTE FUNCTION public.check_max_resumes_limit();

-- 5. Resume Access Log Table
CREATE TABLE IF NOT EXISTS public.resume_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES public.applications(id) ON DELETE SET NULL,
  candidate_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  recruiter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  access_type TEXT NOT NULL CHECK (access_type IN ('viewed', 'downloaded', 'unlocked')),
  source TEXT DEFAULT 'application' CHECK (source IN ('application', 'talent_pool', 'admin')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for Resume Access Log
ALTER TABLE public.resume_access_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_bypass ON public.resume_access_log;
CREATE POLICY admin_bypass ON public.resume_access_log TO project_admin USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS recruiter_access_log ON public.resume_access_log;
CREATE POLICY recruiter_access_log ON public.resume_access_log FOR SELECT USING (recruiter_id = auth.uid());

-- 6. Storage Bucket for Application Snapshots (private)
INSERT INTO storage.buckets (name, public)
VALUES ('application-snapshots', false)
ON CONFLICT (name) DO NOTHING;

-- RLS policies for application-snapshots bucket (Admin & Service role only)
DROP POLICY IF EXISTS "Admin can manage application-snapshots" ON storage.objects;
CREATE POLICY "Admin can manage application-snapshots"
ON storage.objects FOR ALL TO project_admin
USING ( bucket = 'application-snapshots' );

-- 7. Add Performance & Integrity Indexes
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_discoverable ON public.candidate_profiles(is_discoverable);
CREATE INDEX IF NOT EXISTS idx_applications_candidate_id ON public.applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON public.applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_resume_id ON public.applications(resume_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON public.applications(status);
CREATE INDEX IF NOT EXISTS idx_candidate_resumes_candidate_id ON public.candidate_resumes(candidate_id);
CREATE INDEX IF NOT EXISTS idx_jobs_recruiter_id ON public.jobs(recruiter_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_candidate_job_application 
ON public.applications(candidate_id, job_id) 
WHERE status != 'withdrawn';

CREATE INDEX IF NOT EXISTS idx_resume_access_log_application_id ON public.resume_access_log(application_id);
CREATE INDEX IF NOT EXISTS idx_resume_access_log_recruiter_id ON public.resume_access_log(recruiter_id);
CREATE INDEX IF NOT EXISTS idx_resume_access_log_created_at ON public.resume_access_log(created_at DESC);
