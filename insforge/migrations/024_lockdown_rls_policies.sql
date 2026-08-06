-- Migration 024: Lockdown RLS Policies
-- Removes open public read access on profiles and candidate resumes, and enforces own-only or admin-only access.

-- 1. Drop public read access on profiles
DROP POLICY IF EXISTS profiles_recruiter_read ON public.profiles;

-- 2. Create profile policies
-- Note: 'profiles_self' already exists allowing ALL for owner (id = auth.uid()),
-- but we explicitly define select_self and select_admin for authenticated users.
DROP POLICY IF EXISTS profiles_select_self ON public.profiles;
CREATE POLICY profiles_select_self ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS profiles_select_admin ON public.profiles;
CREATE POLICY profiles_select_admin ON public.profiles
  FOR SELECT TO authenticated
  USING (is_admin());

-- 3. Lock down candidate resumes select policy (previously open to all authenticated users)
DROP POLICY IF EXISTS candidate_resumes_select ON public.candidate_resumes;

DROP POLICY IF EXISTS candidate_resumes_select_self ON public.candidate_resumes;
CREATE POLICY candidate_resumes_select_self ON public.candidate_resumes
  FOR SELECT TO authenticated
  USING (candidate_id = auth.uid());

DROP POLICY IF EXISTS candidate_resumes_select_admin ON public.candidate_resumes;
CREATE POLICY candidate_resumes_select_admin ON public.candidate_resumes
  FOR SELECT TO authenticated
  USING (is_admin());
