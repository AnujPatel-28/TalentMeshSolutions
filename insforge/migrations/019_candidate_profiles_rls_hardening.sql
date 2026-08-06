-- Migration 019: candidate_profiles RLS Hardening
-- Drops permissive policies and restricts SELECT to owner or admin/super_admin.

-- 1. Drop existing permissive select policies
DROP POLICY IF EXISTS candidate_profiles_read_all ON public.candidate_profiles;
DROP POLICY IF EXISTS "Recruiters view candidate profiles" ON public.candidate_profiles;
DROP POLICY IF EXISTS candidate_profiles_recruiter_read ON public.candidate_profiles;
DROP POLICY IF EXISTS candidate_profiles_self ON public.candidate_profiles;

-- 2. Create new strict SELECT policy allowing: owner OR admin OR super_admin
DROP POLICY IF EXISTS candidate_profiles_self_and_admin_select ON public.candidate_profiles;
CREATE POLICY candidate_profiles_self_and_admin_select ON public.candidate_profiles
FOR SELECT
USING (
  id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND (p.role = 'admin' OR p.role = 'super_admin')
  )
);
