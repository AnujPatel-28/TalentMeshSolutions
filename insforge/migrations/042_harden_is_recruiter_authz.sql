-- Migration 042: Move recruiter authorization helper out of public SECURITY DEFINER RPC surface
-- Advisor fix: security/dangerous-function for public.is_recruiter()
--
-- Mirrors the completed is_admin() hardening:
-- - authz.is_recruiter() is SECURITY INVOKER, not SECURITY DEFINER.
-- - authenticated users can read only their own recruiter marker row.
-- - RLS policies are updated from public.is_recruiter() to authz.is_recruiter().
-- - public.is_recruiter() is revoked and dropped after dependencies are migrated.

CREATE SCHEMA IF NOT EXISTS authz;

REVOKE ALL ON SCHEMA authz FROM PUBLIC;
GRANT USAGE ON SCHEMA authz TO authenticated;
GRANT USAGE ON SCHEMA authz TO project_admin;

CREATE TABLE IF NOT EXISTS public.recruiter_users (
  user_id uuid PRIMARY KEY
);

INSERT INTO public.recruiter_users (user_id)
SELECT id
FROM public.profiles
WHERE role = 'recruiter'
  AND is_active = true
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.sync_recruiter_users()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    DELETE FROM public.recruiter_users WHERE user_id = OLD.id;
    RETURN OLD;
  ELSIF (NEW.role = 'recruiter' AND NEW.is_active = true) THEN
    INSERT INTO public.recruiter_users (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  ELSE
    DELETE FROM public.recruiter_users WHERE user_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_recruiter_users ON public.profiles;
CREATE TRIGGER trg_sync_recruiter_users
AFTER INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_recruiter_users();

ALTER TABLE public.recruiter_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruiter_users FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS recruiter_users_self_select ON public.recruiter_users;
CREATE POLICY recruiter_users_self_select
  ON public.recruiter_users
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS admin_bypass_recruiter_users ON public.recruiter_users;
CREATE POLICY admin_bypass_recruiter_users
  ON public.recruiter_users
  TO project_admin
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON public.recruiter_users TO authenticated;
REVOKE ALL ON public.recruiter_users FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.recruiter_users FROM authenticated;

CREATE OR REPLACE FUNCTION authz.is_recruiter()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    EXISTS (
      SELECT 1
      FROM public.recruiter_users
      WHERE user_id = (SELECT auth.uid())
    ),
    false
  );
$$;

REVOKE ALL ON FUNCTION authz.is_recruiter() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION authz.is_recruiter() TO authenticated;
GRANT EXECUTE ON FUNCTION authz.is_recruiter() TO project_admin;

DO $$
DECLARE
  policy_row record;
  new_using_expr text;
  new_check_expr text;
  alter_sql text;
BEGIN
  FOR policy_row IN
    SELECT
      p.polname,
      n.nspname,
      c.relname,
      pg_get_expr(p.polqual, p.polrelid) AS using_expr,
      pg_get_expr(p.polwithcheck, p.polrelid) AS check_expr
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND (
        coalesce(pg_get_expr(p.polqual, p.polrelid), '') ~ '(^|[^A-Za-z0-9_.])(public[.])?is_recruiter[(][)]'
        OR coalesce(pg_get_expr(p.polwithcheck, p.polrelid), '') ~ '(^|[^A-Za-z0-9_.])(public[.])?is_recruiter[(][)]'
      )
  LOOP
    new_using_expr := CASE
      WHEN policy_row.using_expr IS NULL THEN NULL
      ELSE regexp_replace(policy_row.using_expr, '(^|[^A-Za-z0-9_.])(public[.])?is_recruiter[(][)]', '\1authz.is_recruiter()', 'g')
    END;

    new_check_expr := CASE
      WHEN policy_row.check_expr IS NULL THEN NULL
      ELSE regexp_replace(policy_row.check_expr, '(^|[^A-Za-z0-9_.])(public[.])?is_recruiter[(][)]', '\1authz.is_recruiter()', 'g')
    END;

    alter_sql := format(
      'ALTER POLICY %I ON %I.%I',
      policy_row.polname,
      policy_row.nspname,
      policy_row.relname
    );

    IF new_using_expr IS NOT NULL THEN
      alter_sql := alter_sql || format(' USING (%s)', new_using_expr);
    END IF;

    IF new_check_expr IS NOT NULL THEN
      alter_sql := alter_sql || format(' WITH CHECK (%s)', new_check_expr);
    END IF;

    EXECUTE alter_sql;
  END LOOP;
END $$;

DROP POLICY IF EXISTS "Recruiters can insert jobs" ON public.jobs;
CREATE POLICY "Recruiters can insert jobs"
  ON public.jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (((SELECT auth.uid()) = recruiter_id) AND authz.is_recruiter());

DO $$
BEGIN
  IF to_regprocedure('public.is_recruiter()') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.is_recruiter() FROM PUBLIC;
    REVOKE ALL ON FUNCTION public.is_recruiter() FROM anon;
    REVOKE ALL ON FUNCTION public.is_recruiter() FROM authenticated;
    DROP FUNCTION public.is_recruiter();
  END IF;
END $$;

DO $$
BEGIN
  IF to_regprocedure('public.sync_recruiter_users()') IS NOT NULL THEN
    ALTER FUNCTION public.sync_recruiter_users() SET search_path = public, pg_temp;
    REVOKE ALL ON FUNCTION public.sync_recruiter_users() FROM PUBLIC;
    REVOKE ALL ON FUNCTION public.sync_recruiter_users() FROM anon;
    REVOKE ALL ON FUNCTION public.sync_recruiter_users() FROM authenticated;
  END IF;
END $$;
