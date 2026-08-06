-- Migration 040: Verify RLS auth.uid() wrapper status
-- Advisor fixes: performance/rls-policy-perf
--
-- This migration is intentionally verification-only.
--
-- Context:
-- Earlier migrations 035 and 036 already wrapped and normalized RLS auth.uid()
-- calls into PostgreSQL's formatted shape: ( SELECT auth.uid() AS uid).
-- Re-running a regex rewrite here can double-wrap existing expressions into
-- unsafe/noisy forms such as (SELECT (SELECT auth.uid() AS uid) AS uid).
--
-- Safety rule:
-- Do not mutate policies here. If this query returns rows in a live database,
-- inspect and fix only those exact policies manually.

DO $$
DECLARE
  remaining_count integer;
BEGIN
  SELECT count(*) INTO remaining_count
  FROM pg_policy p
  JOIN pg_class c ON c.oid = p.polrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND (
      coalesce(pg_get_expr(p.polqual, p.polrelid), '') ~* '(^|[^A-Za-z0-9_])auth[.]uid[(][)]'
      OR coalesce(pg_get_expr(p.polwithcheck, p.polrelid), '') ~* '(^|[^A-Za-z0-9_])auth[.]uid[(][)]'
    );

  RAISE NOTICE 'Direct bare auth.uid() policy references found: %', remaining_count;
END $$;
