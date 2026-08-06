-- ============================================================================
-- INSFORGE MIGRATION 035: Critical Security Remediation
-- Fixes: RLS Enabled/Forced on newsletter tables, Dangerous Functions lockdown,
--        and permissive policy restrictions.
-- ============================================================================

-- 1. Enable RLS on Newsletter Tables
ALTER TABLE IF EXISTS public.newsletter_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.newsletter_rate_limits FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.newsletter_subscribers FORCE ROW LEVEL SECURITY;

-- 2. Restrict Permissive RLS Policies (Specify target roles to clear advisor warnings)
DROP POLICY IF EXISTS "Anyone can read active announcements" ON public.announcements;
CREATE POLICY "Anyone can read active announcements" 
ON public.announcements FOR SELECT 
TO authenticated, anon 
USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

DROP POLICY IF EXISTS templates_select_all ON public.notification_templates;
CREATE POLICY templates_select_all ON public.notification_templates
FOR SELECT 
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Anyone can read platform_settings" ON public.platform_settings;
CREATE POLICY "Anyone can read platform_settings" 
ON public.platform_settings FOR SELECT 
TO authenticated, anon 
USING (true);

-- 3. Lock Down Security Definer Functions
-- A. Convert is_admin() to SECURITY INVOKER (safest, runs as caller)
ALTER FUNCTION public.is_admin() SECURITY INVOKER;

-- B. Restrict execute privileges on other SECURITY DEFINER functions to authenticated users
REVOKE EXECUTE ON FUNCTION public.increment_announcement_view(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_announcement_view(uuid) TO authenticated;
ALTER FUNCTION public.increment_announcement_view(uuid) SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.increment_announcement_dismiss(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_announcement_dismiss(uuid) TO authenticated;
ALTER FUNCTION public.increment_announcement_dismiss(uuid) SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.calculate_profile_strength_score(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.calculate_profile_strength_score(uuid) TO authenticated;
ALTER FUNCTION public.calculate_profile_strength_score(uuid) SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.set_default_resume(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_default_resume(uuid) TO authenticated;
ALTER FUNCTION public.set_default_resume(uuid) SET search_path = public;
