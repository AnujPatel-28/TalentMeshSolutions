-- ============================================================================
-- MIGRATION 052: profiles.role becomes the single source of admin truth
--                + PUBLIC-policy hardening + R-2 idempotency replay column
-- Authored 2026-07-19 (Fable 5), v2 · HUMAN-APPLIED ONLY — never agent-applied.
-- Evidence: docs/adminImplementation_outputToReview/0-W2__opus-v2.md (live-verified
-- 2026-07-19; trusted over doc 02 where they conflict).
--
-- v2 corrections (advisor live re-verification + pg_proc check):
--   · public.is_admin() throughout — migrations 037/038 (authz-schema move)
--     were AUTHORED but NEVER APPLIED live; the only live function is
--     public.is_admin() and every policy references it unqualified. v1's
--     authz.is_admin() would have replaced a function nothing calls.
--   · role CHECK carries the six live-permitted values + 'content' (the live
--     constraint already permits company_admin and hr with zero rows using them).
--
-- Idempotent: safe to re-run in full.
-- PRE-FLIGHT REQUIRED: run the PRE-APPLY queries in
-- docs/adminImplementation_outputToReview/1-052-sql__fable5.md before applying.
--
-- SEQUENCING (product-owner decision, locked): admin_users is being retired but
-- is NOT dropped here. 052 flips is_admin() to profiles.role; the drop ships in a
-- separate later migration only after this flip is verified live. Until then
-- admin_users (and its sync trigger) remain untouched as the rollback path.
-- ============================================================================

BEGIN;

-- ────────────────────────────────────────────────────────────────────────────
-- 0. profiles.role value set gains 'content' (doc 14 §4.1)
-- The new CHECK = the SEVEN values below: the six the live constraint already
-- permits (advisor re-verified pg_constraint 2026-07-19 — company_admin and hr
-- are permitted live even though zero rows use them) plus 'content'.
-- company_admin/hr are carried forward deliberately: 052's job is the
-- is_admin() flip; silently revoking two permitted role values would be an
-- unrelated change riding along, failing at some future insert with no obvious
-- link back to this migration. NOT 'finance' — doc 14 defers it until billing
-- write APIs exist. NULL role still passes a CHECK (SQL semantics) — matches
-- current behavior.
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('candidate', 'recruiter', 'admin', 'super_admin',
                  'company_admin', 'hr', 'content'));

-- ────────────────────────────────────────────────────────────────────────────
-- 1. public.is_admin() resolves from profiles.role, not admin_users membership
--
-- Role set decision: TRUE for 'admin' and 'super_admin' ONLY. 'content' is
-- deliberately excluded — is_admin() gates ~30 RLS policies including ALL on
-- profiles, subscriptions, user_sessions and platform_settings; granting those
-- to content-only staff would contradict the doc 14 §4.2 matrix (content: view
-- dashboard, edit content, view reports). content staff operate exclusively
-- through edge functions (requireStaff + permission matrix, service key).
--
-- Recursion safety (this is why 025 moved is_admin OFF profiles): the function
-- is SECURITY DEFINER, so its read of public.profiles runs as the function
-- owner. The owner either owns profiles (RLS bypassed entirely — profiles has
-- no FORCE ROW LEVEL SECURITY; verified in the post-apply set) or is
-- project_admin, whose only profiles policy is the plain-true admin_bypass.
-- Either way policy evaluation terminates; no recursion.
--
-- Shape follows the hardened 037 pattern (authored in-repo but never applied
-- live — the live body is the 025-era plpgsql): LANGUAGE sql, STABLE, explicit
-- search_path, (SELECT auth.uid()) wrapper, COALESCE(..., false), explicit
-- NULL-uid guard. The stale "RLS is disabled on admin_users" comment is NOT
-- carried forward (RLS is enabled on admin_users; the old function survived
-- only via DEFINER). Grants below also end anon PostgREST RPC access to it.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
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

COMMENT ON FUNCTION public.is_admin() IS
  'True iff the caller''s public.profiles.role is admin or super_admin (single source of admin truth since migration 052; admin_users membership is no longer consulted). content staff are deliberately excluded — they act only via edge functions. SECURITY DEFINER: the profiles read runs as the function owner and bypasses profiles RLS, so policies referencing this function cannot recurse.';

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO project_admin;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. auth_attempts — P0: policy named for the service role was granted to
-- PUBLIC with USING true / WITH CHECK true FOR ALL (any anon-key holder could
-- read every login attempt and DELETE their failed ones to defeat lockout).
-- No app-layer reader/writer of auth_attempts exists in this repo (grepped),
-- so removing PUBLIC access breaks nothing app-side; the service role keeps
-- full access (ensured below if the standard project_admin pair is missing).
-- ────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Service role can manage auth attempts" ON public.auth_attempts;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'auth_attempts'
      AND 'project_admin' = ANY (roles) AND cmd = 'ALL'
  ) THEN
    CREATE POLICY auth_attempts_service_role
      ON public.auth_attempts
      FOR ALL
      TO project_admin
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Three lower-severity PUBLIC policies — assessed individually (see the
-- 1-052 output doc for the consumer evidence behind each verdict).
-- ────────────────────────────────────────────────────────────────────────────

-- 3a. platform_settings "Anyone can read platform_settings" → RESTRICT (drop).
-- Every reader in the codebase uses the service key (lib/server/admin.ts,
-- admin-settings edge fn); no anon or browser consumer exists. Staff retain
-- read via the existing "Admins can manage platform_settings" (FOR ALL,
-- public.is_admin()) policy; the service role via its bypass pair.
DROP POLICY IF EXISTS "Anyone can read platform_settings" ON public.platform_settings;

-- 3b. announcements "Anyone can read active announcements" → KEEP PUBLIC,
-- fix the expression. components/shared/AnnouncementBanner.tsx reads this
-- table with the browser client (a real anon/user-facing surface), so PUBLIC
-- stays — but the expression becomes is_active = true so the policy does what
-- its name claims and unpublished/draft announcements (content-role drafts,
-- doc 14) stop being world-readable. Known residual (accepted, P3):
-- target_roles filtering remains client-side; any active announcement is
-- readable by any role.
DROP POLICY IF EXISTS "Anyone can read active announcements" ON public.announcements;
CREATE POLICY "Anyone can read active announcements"
  ON public.announcements
  FOR SELECT
  USING (is_active = true);

-- 3c. notification_templates templates_select_all → RESTRICT to staff.
-- Consumers: notification-worker (service key — unaffected) and the admin ops
-- page app/dashboard/admin/notifications/page.tsx, which reads it browser-side
-- with a staff JWT — so the replacement policy must admit staff, not vanish.
-- Template bodies are exactly what a phisher wants pixel-perfect copies of;
-- anon/candidate/recruiter have no business reading them.
DROP POLICY IF EXISTS templates_select_all ON public.notification_templates;
DROP POLICY IF EXISTS templates_select_admin ON public.notification_templates;
CREATE POLICY templates_select_admin
  ON public.notification_templates
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- ────────────────────────────────────────────────────────────────────────────
-- 4. R-2 kit: full idempotency replay (0-R2__fable5.md; advisor: rides in 052)
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.idempotency_keys ADD COLUMN IF NOT EXISTS response_body JSONB;

-- ────────────────────────────────────────────────────────────────────────────
-- 5. Audit-table naming: NO DDL HERE, deliberately.
-- Live truth (W2): public.audit_log (singular) exists; public.audit_logs
-- (plural) does not — so there is nothing to merge or rename in SQL. The
-- defect is three edge functions (admin-settings, admin-jobs, admin-audit)
-- writing to the nonexistent plural name (admin-settings swallowing the
-- failure). That is a CODE fix owned by the R-2 migrated-set review, and 053
-- reduces to audit hardening + writer coverage (R-3) with no merge step.
-- ────────────────────────────────────────────────────────────────────────────

COMMIT;

-- ============================================================================
-- ROLLBACK (is_admin only — run if the flip must be reverted): restore the 037
-- body, resolving from admin_users membership (kept alive for exactly this):
--
--   CREATE OR REPLACE FUNCTION public.is_admin()
--   RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
--   SET search_path = public, pg_temp
--   AS $$ SELECT COALESCE(EXISTS (SELECT 1 FROM public.admin_users
--          WHERE user_id = (SELECT auth.uid())), false); $$;
--
-- The policy changes (sections 2–3) are security fixes and should not be
-- rolled back with it.
-- ============================================================================
