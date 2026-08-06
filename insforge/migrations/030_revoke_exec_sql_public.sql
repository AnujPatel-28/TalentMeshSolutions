-- Migration 030: Revoke PUBLIC execute on exec_sql and query_json
-- AUDIT FIX: Blocker #3 — any anon user could call POST /rest/v1/rpc/exec_sql with arbitrary SQL
-- SAFE TO RUN: Migration scripts run via service_role which bypasses function grants entirely.
-- InsForge edge functions use service_role JWT — they also bypass these grants.
-- The project_admin grant is explicitly retained for safety.
-- DEPENDENCY: None. Can be run independently.

-- Revoke PUBLIC (= anon + authenticated combined) execute
REVOKE EXECUTE ON FUNCTION public.exec_sql(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.query_json(text) FROM PUBLIC;

-- Double-revoke from specific roles to be explicit
REVOKE EXECUTE ON FUNCTION public.exec_sql(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.exec_sql(text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.query_json(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.query_json(text) FROM authenticated;

-- Explicitly keep project_admin access (belt-and-suspenders)
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO project_admin;
GRANT EXECUTE ON FUNCTION public.query_json(text) TO project_admin;
