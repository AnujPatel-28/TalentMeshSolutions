-- ============================================================================
-- MIGRATION 052b: authz.is_admin() follows profiles.role too
-- Authored AND applied live 2026-07-19 (Fable 5, human-delegated apply of 052).
--
-- WHY THIS EXISTS: 052's premise ("the only live function is public.is_admin();
-- 037/038 were never applied") was verified 2026-07-19 but had drifted by apply
-- time — authz.is_admin() EXISTS live and 15 of 16 admin policies call it
-- (profiles, jobs, applications, subscriptions, user_sessions, platform_settings,
-- announcements, candidate_resumes, recruiter_candidate_notes, storage_quarantine,
-- user_preferences). The live authz body still resolved from admin_users, so the
-- 052 flip alone changed a function almost nothing calls. This gives
-- authz.is_admin() the identical profiles-role body.
--
-- SECURITY DEFINER is mandatory (the live authz body was INVOKER): two calling
-- policies sit ON public.profiles, and the new body reads profiles — the DEFINER
-- owner-bypass is what prevents RLS recursion (same argument as 052 §1;
-- profiles has relforcerowsecurity = false, verified at apply time).
--
-- Idempotent; CREATE OR REPLACE preserves owner and existing grants.
-- Verified post-apply via impersonation (plan-time-safe, dynamic SQL):
--   orphaned staff (susp_admin, authenticated): is_admin=true,  sees 152 profiles / 38 applications / 5 templates
--   candidate (authenticated):                  is_admin=false, sees own profile / own application / 0 templates
--   anon:                                       cannot execute is_admin (revoked), sees 0 / 0 / 0
-- ============================================================================

CREATE OR REPLACE FUNCTION authz.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    (SELECT auth.uid()) IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = (SELECT auth.uid())
        AND role IN ('admin', 'super_admin')
    ),
    false
  );
$$;

COMMENT ON FUNCTION authz.is_admin() IS
  'Same truth as public.is_admin() since migration 052 follow-up: caller''s public.profiles.role is admin or super_admin. admin_users is no longer consulted. SECURITY DEFINER required — policies on profiles call this function, and the profiles read must bypass profiles RLS to avoid recursion.';

-- ROLLBACK (restore the live pre-052b body — admin_users truth, INVOKER):
--   CREATE OR REPLACE FUNCTION authz.is_admin()
--   RETURNS boolean LANGUAGE sql STABLE
--   SET search_path = public, pg_temp
--   AS $$ SELECT COALESCE( EXISTS ( SELECT 1 FROM public.admin_users
--          WHERE user_id = (SELECT auth.uid()) ), false ); $$;
-- Note: pre-052b, orphaned staff (in profiles.role but not admin_users) only
-- worked at all via the admin_users_self_select policy for members — the
-- rollback restores the "7 orphaned staff see no data" defect.
