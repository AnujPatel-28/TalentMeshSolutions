-- Migration 028: Recruiter Team RBAC, Company-level Candidate RLS & Authorization Auditing
-- Run this in InsForge SQL Editor or via apply-migrations-safely.mjs

-- 1. Create authorization_events table
CREATE TABLE IF NOT EXISTS public.authorization_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.company_profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('resume_view', 'resume_download', 'candidate_profile_access', 'rbac_denied', 'unauthorized_resume_attempt', 'resume_enumeration_attempt', 'profile_access_denied', 'role_change')),
  resource TEXT NOT NULL,
  reason TEXT,
  request_id TEXT,
  route TEXT,
  timestamp TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for authorization_events
ALTER TABLE public.authorization_events ENABLE ROW LEVEL SECURITY;

-- Allow project admin/service role to bypass RLS
DROP POLICY IF EXISTS admin_bypass ON public.authorization_events;
CREATE POLICY admin_bypass ON public.authorization_events TO project_admin USING (true) WITH CHECK (true);

-- Allow recruiters to read audit logs where they were the user
DROP POLICY IF EXISTS recruiter_read_audit ON public.authorization_events;
CREATE POLICY recruiter_read_audit ON public.authorization_events FOR SELECT USING (user_id = auth.uid());

-- 2. Alter recruiter_profiles to add recruiter_role column
ALTER TABLE public.recruiter_profiles ADD COLUMN IF NOT EXISTS recruiter_role TEXT CHECK (recruiter_role IN ('admin', 'recruiter', 'coordinator')) DEFAULT 'recruiter';

-- 3. Safely backfill existing recruiter_profiles
-- Elevated company creators in company_profiles become admin, others default to recruiter
UPDATE public.recruiter_profiles rp
SET recruiter_role = CASE
  WHEN EXISTS (
    SELECT 1 FROM public.company_profiles cp
    WHERE cp.recruiter_id = rp.id
  ) THEN 'admin'
  ELSE 'recruiter'
END
WHERE recruiter_role IS NULL;

-- 4. Drop old recruiter policies checking recruiter_id = auth.uid() directly
DROP POLICY IF EXISTS candidate_profiles_recruiter_select ON public.candidate_profiles;
DROP POLICY IF EXISTS candidate_resumes_recruiter_select ON public.candidate_resumes;
DROP POLICY IF EXISTS profiles_recruiter_select ON public.profiles;

-- 5. Create company-level recruiter RLS policies (applied candidates only)
CREATE POLICY candidate_profiles_recruiter_select ON public.candidate_profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.applications a
    JOIN public.jobs j ON j.id = a.job_id
    JOIN public.profiles recruiter ON recruiter.id = auth.uid()
    WHERE a.candidate_id = candidate_profiles.id 
      AND j.company_id = recruiter.company_id
      AND a.status IN ('applied', 'reviewing', 'shortlisted', 'interviewing', 'offered', 'hired')
  )
);

CREATE POLICY candidate_resumes_recruiter_select ON public.candidate_resumes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.applications a
    JOIN public.jobs j ON j.id = a.job_id
    JOIN public.profiles recruiter ON recruiter.id = auth.uid()
    WHERE a.candidate_id = candidate_resumes.candidate_id 
      AND j.company_id = recruiter.company_id
      AND a.status IN ('applied', 'reviewing', 'shortlisted', 'interviewing', 'offered', 'hired')
  )
);

CREATE POLICY profiles_recruiter_select ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.applications a
    JOIN public.jobs j ON j.id = a.job_id
    JOIN public.profiles recruiter ON recruiter.id = auth.uid()
    WHERE a.candidate_id = profiles.id 
      AND j.company_id = recruiter.company_id
      AND a.status IN ('applied', 'reviewing', 'shortlisted', 'interviewing', 'offered', 'hired')
  )
);
