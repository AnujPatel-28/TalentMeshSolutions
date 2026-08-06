-- ============================================================================
-- MIGRATION 039: Convert authz.is_admin() from SECURITY DEFINER to INVOKER
-- PURPOSE: Eliminate privileged execution while preserving RLS functionality
-- PREREQUISITE: Migrations 037 + 038 applied
-- ============================================================================

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 1: Create self-select RLS policy on admin_users
-- This policy does NOT call is_admin() → no recursion risk.
-- Allows each authenticated user to see only their own row.
-- ════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS admin_users_self_select ON public.admin_users;
CREATE POLICY admin_users_self_select
  ON public.admin_users
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 2: Lock down table grants
-- authenticated already has SELECT (Supabase default) — keep it for INVOKER.
-- Revoke anon SELECT — anon users should never query admin_users.
-- Explicitly revoke INSERT/UPDATE/DELETE from authenticated (defense in depth).
-- ════════════════════════════════════════════════════════════════════════════

REVOKE ALL ON public.admin_users FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.admin_users FROM authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 3: Convert authz.is_admin() to SECURITY INVOKER
-- Now safe because:
--   - authenticated users can SELECT their own row via self-select policy
--   - Function no longer runs with postgres (owner) privileges
--   - Advisor warning is resolved legitimately
-- ════════════════════════════════════════════════════════════════════════════

ALTER FUNCTION authz.is_admin() SECURITY INVOKER;

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 4: Verification queries (run after migration)
-- ════════════════════════════════════════════════════════════════════════════

-- 4a: Confirm SECURITY INVOKER (prosecdef should be false)
-- SELECT prosecdef FROM pg_proc p
--   JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE n.nspname = 'authz' AND p.proname = 'is_admin';
-- Expected: false

-- 4b: Confirm authenticated can still execute
-- SELECT has_function_privilege('authenticated', 'authz.is_admin()', 'EXECUTE');
-- Expected: true

-- 4c: Confirm anon cannot read admin_users
-- SELECT has_table_privilege('anon', 'public.admin_users', 'SELECT');
-- Expected: false

-- 4d: Confirm self-select policy exists
-- SELECT polname, pg_get_expr(polqual, polrelid) AS using_expr
--   FROM pg_policy
--   WHERE polrelid = 'public.admin_users'::regclass
--   AND polname = 'admin_users_self_select';
-- Expected: user_id = (SELECT auth.uid())
