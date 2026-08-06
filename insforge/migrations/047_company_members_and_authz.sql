-- 047_company_members_and_authz.sql
CREATE TABLE IF NOT EXISTS public.company_members (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES public.profiles(id)  ON DELETE CASCADE,
  member_role  TEXT NOT NULL DEFAULT 'recruiter'
               CHECK (member_role IN ('admin','recruiter','coordinator')),
  status       TEXT NOT NULL DEFAULT 'invited'
               CHECK (status IN ('invited','active','suspended','removed')),
  invited_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  joined_at    TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- Phase 1: one ACTIVE company membership per user (a recruiter belongs to exactly one company)
CREATE UNIQUE INDEX IF NOT EXISTS company_members_one_active_per_user
  ON public.company_members (user_id) WHERE status IN ('invited','active','suspended');
CREATE INDEX IF NOT EXISTS company_members_company_idx ON public.company_members (company_id);
CREATE INDEX IF NOT EXISTS company_members_user_idx    ON public.company_members (user_id);
CREATE INDEX IF NOT EXISTS company_members_lookup_idx  ON public.company_members (user_id, company_id, status);

ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

-- authz helpers (private schema; not exposed as PostgREST RPC). Read company_members ONLY (no profiles recursion).
CREATE OR REPLACE FUNCTION authz.company_id_of(uid UUID)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT company_id FROM public.company_members
  WHERE user_id = uid AND status = 'active' LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION authz.company_role(uid UUID, cid UUID)
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT member_role FROM public.company_members
  WHERE user_id = uid AND company_id = cid AND status = 'active' LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION authz.is_company_admin(uid UUID, cid UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members
    WHERE user_id = uid AND company_id = cid AND member_role = 'admin' AND status = 'active'
  );
$$;

REVOKE ALL ON SCHEMA authz FROM PUBLIC;
GRANT USAGE ON SCHEMA authz TO authenticated, project_admin;

-- company_members RLS
DROP POLICY IF EXISTS admin_bypass ON public.company_members;
CREATE POLICY admin_bypass ON public.company_members TO project_admin USING (true) WITH CHECK (true);

-- A member can read the roster of their own active company
DROP POLICY IF EXISTS company_members_read_own_company ON public.company_members;
CREATE POLICY company_members_read_own_company ON public.company_members FOR SELECT
  USING (company_id = authz.company_id_of((SELECT auth.uid())));

-- Only a company admin may write membership rows (invite/role/status); go through RPCs (049) for lifecycle.
DROP POLICY IF EXISTS company_members_admin_write ON public.company_members;
CREATE POLICY company_members_admin_write ON public.company_members FOR ALL
  USING (authz.is_company_admin((SELECT auth.uid()), company_id))
  WITH CHECK (authz.is_company_admin((SELECT auth.uid()), company_id));

-- P0-5 (finding C-1): forbid self-mutation of privileged profile columns
CREATE OR REPLACE FUNCTION public.guard_profile_privileged_cols()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  -- T10 apply delta (2026-07-17): service-key/admin-console paths run as postgres/project_admin
  -- with NO JWT uid — authz.is_admin() alone would block legitimate admin edge functions
  -- (admin-settings role changes, admin-candidates status flips). Privileged DB roles bypass;
  -- user JWTs always run as `authenticated` and stay guarded (C-1).
  IF current_user IN ('postgres', 'project_admin') THEN RETURN NEW; END IF;
  IF authz.is_admin() THEN RETURN NEW; END IF;           -- admins may change roles
  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.is_active IS DISTINCT FROM OLD.is_active
     OR NEW.company_id IS DISTINCT FROM OLD.company_id
     OR NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'privileged profile columns may only be changed by an admin';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_guard_profile_cols ON public.profiles;
CREATE TRIGGER trg_guard_profile_cols BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_privileged_cols();
