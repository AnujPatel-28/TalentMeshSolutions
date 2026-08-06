-- Migration 032: Restrict announcement counter functions to authenticated users only
-- AUDIT FIX: Medium Risk #5 — anon could inflate view/dismiss counters
-- NOTE: These are SECURITY DEFINER functions. The actual table write goes through project_admin.
-- We only restrict WHO can call the function via PostgREST RPC.
-- DEPENDENCY: None. Lowest priority — run last.

REVOKE EXECUTE ON FUNCTION public.increment_announcement_view(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_announcement_dismiss(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.increment_announcement_view(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_announcement_dismiss(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_announcement_view(uuid) TO project_admin;
GRANT EXECUTE ON FUNCTION public.increment_announcement_dismiss(uuid) TO project_admin;
