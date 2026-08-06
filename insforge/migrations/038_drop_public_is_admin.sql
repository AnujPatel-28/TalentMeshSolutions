-- ============================================================================
-- MIGRATION 038: Drop public.is_admin() and harden sync_admin_users trigger
-- PREREQUISITE: Migration 037 must be applied AND verification gate must pass
-- TRANSACTION 2 of 2
-- ============================================================================

BEGIN;

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 5: Remove old public.is_admin() — eliminates PostgREST RPC exposure
-- Only run after confirming zero unqualified is_admin() references remain
-- ════════════════════════════════════════════════════════════════════════════

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin() FROM anon;
REVOKE ALL ON FUNCTION public.is_admin() FROM authenticated;

DROP FUNCTION IF EXISTS public.is_admin();

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 6: Harden sync_admin_users trigger function
-- Pin search_path and revoke all user-facing execution.
-- Safe because the trigger fires as project_admin (table owner).
-- ════════════════════════════════════════════════════════════════════════════

ALTER FUNCTION public.sync_admin_users()
  SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.sync_admin_users() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_admin_users() FROM anon;
REVOKE ALL ON FUNCTION public.sync_admin_users() FROM authenticated;

COMMIT;

-- ============================================================================
-- END OF MIGRATION 038
-- Run final verification queries (Steps 7a-7e) after this migration.
-- ============================================================================
