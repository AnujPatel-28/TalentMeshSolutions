-- Migration 031: Enable RLS on ai_suggestion_cache
-- AUDIT FIX: High Risk #4 — anon could INSERT/UPDATE cached AI suggestions (cache poisoning)
-- DEPENDENCY: None. Can be run independently.

-- Step 1: Authenticated users can read any cached suggestion (public-read cache)
DROP POLICY IF EXISTS authenticated_read_cache ON public.ai_suggestion_cache;
CREATE POLICY authenticated_read_cache ON public.ai_suggestion_cache
  FOR SELECT
  TO authenticated
  USING (true);

-- Step 2: Only service-role/project_admin can write to the cache
-- (AI suggestions are generated server-side, not by client users directly)
DROP POLICY IF EXISTS admin_bypass_cache ON public.ai_suggestion_cache;
CREATE POLICY admin_bypass_cache ON public.ai_suggestion_cache
  TO project_admin
  USING (true)
  WITH CHECK (true);

-- Step 3: Enable RLS — no INSERT/UPDATE/DELETE for anon or authenticated
ALTER TABLE public.ai_suggestion_cache ENABLE ROW LEVEL SECURITY;
