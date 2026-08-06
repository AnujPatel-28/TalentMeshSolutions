-- Migration 029: Block anon/authenticated writes to admin_users via RLS
-- AUDIT FIX: Blocker #2 — admin_users.rowsecurity was FALSE, anon could INSERT to escalate privileges
-- CRITICAL DESIGN NOTE: admin_users.RLS was intentionally disabled in migration 025 to prevent
-- infinite recursion inside is_admin(). The is_admin() function is SECURITY DEFINER, so it runs
-- as project_admin (table owner) and BYPASSES RLS even after we enable it here.
-- Therefore enabling RLS with only a SELECT policy is safe: is_admin() still works, writes are blocked.
-- DEPENDENCY: Fix 1 (028) should be applied first, but not strictly required.

-- Step 1: Remove any previously created write policies (clean slate for writes)
DROP POLICY IF EXISTS public_can_read_admin_users ON public.admin_users;
DROP POLICY IF EXISTS admin_users_select ON public.admin_users;

-- Step 2: Create a SELECT-only policy (allows is_admin() reads via authenticated/anon role)
-- NOTE: is_admin() is SECURITY DEFINER — it bypasses RLS automatically.
-- This policy is for PostgREST direct reads (for admin dashboards that may list admin_users).
CREATE POLICY admin_users_authenticated_select ON public.admin_users
  FOR SELECT
  TO authenticated
  USING (true);

-- Project admin bypass (service role — allows sync_admin_users trigger to run correctly)
DROP POLICY IF EXISTS admin_bypass_admin_users ON public.admin_users;
CREATE POLICY admin_bypass_admin_users ON public.admin_users
  TO project_admin
  USING (true)
  WITH CHECK (true);

-- Step 3: Enable RLS — no INSERT/UPDATE/DELETE policies exist → those operations are implicitly DENIED
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
