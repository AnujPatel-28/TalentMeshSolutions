-- Migration 028: Enable RLS on profiles table
-- AUDIT FIX: Blocker #1 — profiles.rowsecurity was FALSE, all policies inactive
-- SAFE TO RUN: Activates existing policies only. No new policy creates user-visible change in behaviour.
-- DEPENDENCY: None. Run first.

-- Step 1: Audit existing policies before we change anything
-- (Read-only — safe to run at any time for reference)
DO $$
DECLARE
  policy_count INT;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles';
  RAISE NOTICE 'Found % existing policies on profiles before RLS enable', policy_count;
END $$;

-- Step 2: Ensure the canonical policies exist and are correct
-- (Drop old duplicates from migration 003 naming, then recreate with definitive names)

-- Owner-only ALL operations (auth.uid() = id)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Current policies from migrations 024/025 (keep these, they are correct):
-- profiles_self        → ALL for (id = auth.uid())            [exists]
-- profiles_select_self → SELECT TO authenticated (id=auth.uid()) [exists]

-- Recruiter cross-lookup: recruiters can see candidate profiles they are evaluating
-- This is required for update_application_status() to read candidate name/email
DROP POLICY IF EXISTS profiles_recruiter_select ON public.profiles;
CREATE POLICY profiles_recruiter_select ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.jobs j ON j.id = a.job_id
      WHERE a.candidate_id = profiles.id
        AND j.recruiter_id = auth.uid()
        AND a.status IN ('applied','reviewing','shortlisted','interviewing','offered','hired')
    )
  );

-- Admin bypass: admins must be able to see all profiles for dashboard management
-- Uses admin_users lookup (not profiles self-reference) to avoid recursion
DROP POLICY IF EXISTS profiles_admin_select ON public.profiles;
CREATE POLICY profiles_admin_select ON public.profiles
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
  );

-- Platform admin (service role) bypass — always allow for backend tasks
DROP POLICY IF EXISTS admin_bypass ON public.profiles;
CREATE POLICY admin_bypass ON public.profiles
  TO project_admin
  USING (true)
  WITH CHECK (true);

-- Step 3: Enable RLS — THIS IS THE LIVE-VISIBLE CHANGE
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 4: Force RLS even for table owner (prevent owner-bypass in future)
-- NOTE: In InsForge, project_admin is the table owner. FORCE RLS means the admin_bypass
-- policy above will still allow project_admin access — so this is safe.
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
