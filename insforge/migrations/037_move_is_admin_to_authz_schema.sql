-- ============================================================================
-- MIGRATION 037: Move is_admin() to private authz schema
-- PURPOSE: Remove public RPC exposure while preserving SECURITY DEFINER for RLS
-- TRANSACTION 1 of 2 — Run verification gate before applying migration 038
-- ============================================================================

BEGIN;

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 1: Create private authz schema with proper USAGE grants
-- Without GRANT USAGE, authenticated users get "permission denied for schema authz"
-- when RLS policies evaluate authz.is_admin()
-- ════════════════════════════════════════════════════════════════════════════

CREATE SCHEMA IF NOT EXISTS authz;

REVOKE ALL ON SCHEMA authz FROM PUBLIC;
GRANT USAGE ON SCHEMA authz TO authenticated;
GRANT USAGE ON SCHEMA authz TO project_admin;

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 2: Create hardened authz.is_admin() function
-- - LANGUAGE sql (inlineable by planner, simpler than plpgsql)
-- - STABLE (enables query optimizer caching)
-- - (SELECT auth.uid()) subquery wrapper prevents per-row re-evaluation in RLS
-- - COALESCE(..., false) for explicit NULL safety
-- - pg_temp in search_path prevents temp-schema object shadowing
-- - NOT in public schema = NOT exposed as PostgREST RPC endpoint
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION authz.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    EXISTS (
      SELECT 1
      FROM public.admin_users
      WHERE user_id = (SELECT auth.uid())
    ),
    false
  );
$$;

REVOKE ALL ON FUNCTION authz.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION authz.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION authz.is_admin() TO project_admin;

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 3A: Migrate 11 PUBLIC-scoped admin policies → TO authenticated
-- These require DROP + CREATE because ALTER POLICY cannot change the TO role
-- ════════════════════════════════════════════════════════════════════════════

-- 3A-1: announcements (ALL)
DROP POLICY IF EXISTS "Admins can manage announcements" ON public.announcements;
CREATE POLICY "Admins can manage announcements"
  ON public.announcements
  FOR ALL
  TO authenticated
  USING (authz.is_admin());

-- 3A-2: platform_settings (ALL + WITH CHECK)
DROP POLICY IF EXISTS "Admins can manage platform_settings" ON public.platform_settings;
CREATE POLICY "Admins can manage platform_settings"
  ON public.platform_settings
  FOR ALL
  TO authenticated
  USING (authz.is_admin())
  WITH CHECK (authz.is_admin());

-- 3A-3: profiles (ALL)
DROP POLICY IF EXISTS "Admins can manage profiles" ON public.profiles;
CREATE POLICY "Admins can manage profiles"
  ON public.profiles
  FOR ALL
  TO authenticated
  USING (authz.is_admin());

-- 3A-4: recruiter_candidate_notes (ALL)
DROP POLICY IF EXISTS "Admins can manage recruiter candidate notes" ON public.recruiter_candidate_notes;
CREATE POLICY "Admins can manage recruiter candidate notes"
  ON public.recruiter_candidate_notes
  FOR ALL
  TO authenticated
  USING (authz.is_admin());

-- 3A-5: storage_quarantine (ALL + WITH CHECK)
DROP POLICY IF EXISTS "Admins can manage storage_quarantine" ON public.storage_quarantine;
CREATE POLICY "Admins can manage storage_quarantine"
  ON public.storage_quarantine
  FOR ALL
  TO authenticated
  USING (authz.is_admin())
  WITH CHECK (authz.is_admin());

-- 3A-6: subscriptions (ALL)
DROP POLICY IF EXISTS "Admins can manage subscriptions" ON public.subscriptions;
CREATE POLICY "Admins can manage subscriptions"
  ON public.subscriptions
  FOR ALL
  TO authenticated
  USING (authz.is_admin());

-- 3A-7: user_preferences (DELETE)
DROP POLICY IF EXISTS "Admins can delete all preferences" ON public.user_preferences;
CREATE POLICY "Admins can delete all preferences"
  ON public.user_preferences
  FOR DELETE
  TO authenticated
  USING (authz.is_admin());

-- 3A-8: user_preferences (INSERT + WITH CHECK only)
DROP POLICY IF EXISTS "Admins can insert all preferences" ON public.user_preferences;
CREATE POLICY "Admins can insert all preferences"
  ON public.user_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (authz.is_admin());

-- 3A-9: user_preferences (UPDATE)
DROP POLICY IF EXISTS "Admins can update all preferences" ON public.user_preferences;
CREATE POLICY "Admins can update all preferences"
  ON public.user_preferences
  FOR UPDATE
  TO authenticated
  USING (authz.is_admin());

-- 3A-10: user_preferences (SELECT)
DROP POLICY IF EXISTS "Admins can view all preferences" ON public.user_preferences;
CREATE POLICY "Admins can view all preferences"
  ON public.user_preferences
  FOR SELECT
  TO authenticated
  USING (authz.is_admin());

-- 3A-11: user_sessions (ALL + WITH CHECK)
DROP POLICY IF EXISTS "Admins can manage user_sessions" ON public.user_sessions;
CREATE POLICY "Admins can manage user_sessions"
  ON public.user_sessions
  FOR ALL
  TO authenticated
  USING (authz.is_admin())
  WITH CHECK (authz.is_admin());

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 3B: Migrate 5 already authenticated-scoped policies (ALTER POLICY)
-- These are already TO authenticated, so only the expression changes
-- ════════════════════════════════════════════════════════════════════════════

-- 3B-1: applications (SELECT)
ALTER POLICY "Admins can view all applications"
  ON public.applications
  USING (authz.is_admin());

-- 3B-2: candidate_resumes (SELECT)
ALTER POLICY "candidate_resumes_select_admin"
  ON public.candidate_resumes
  USING (authz.is_admin());

-- 3B-3: jobs (SELECT)
ALTER POLICY "Admins can view all jobs"
  ON public.jobs
  USING (authz.is_admin());

-- 3B-4: jobs (ALL + WITH CHECK)
ALTER POLICY "admins_all"
  ON public.jobs
  USING (authz.is_admin())
  WITH CHECK (authz.is_admin());

-- 3B-5: profiles (SELECT)
ALTER POLICY "profiles_select_admin"
  ON public.profiles
  USING (authz.is_admin());

COMMIT;

-- ============================================================================
-- END OF MIGRATION 037
-- DO NOT proceed to migration 038 until the verification gate passes.
-- Run the verification queries from the implementation plan Steps 4 + corrections.
-- ============================================================================
