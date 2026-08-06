-- 059_guard_profile_self_escalation.sql
--
-- Doc ref: 15_Admin_Rebuild_Verification_Phase2_Authz_And_Audit.md, finding AE-1 (+ AE-1b).
-- Human applies — never an agent (standing project rule). Apply each statement as a single
-- line via `insforge db query`; the Windows CLI shim truncates multi-line input at the first
-- newline and still reports success, so this file is the readable record, not the apply script.
--
-- THE BUG (confirmed live 2026-07-25):
--   `profiles_self` is `FOR ALL TO public USING (id = auth.uid()) WITH CHECK (id = auth.uid())`.
--   The WITH CHECK constrains only `id`, never `role`. `trg_guard_profile_cols` is BEFORE UPDATE
--   ONLY, so there is no INSERT guard. `profiles.id` has no FK to auth.users and
--   `profiles_role_check` permits 'super_admin'. Proven live as a real candidate JWT:
--   POST /profiles {id:self, role:'super_admin'} -> 23505 (PK dup) = RLS PASSED the role;
--   DELETE /profiles?id=self -> 204. Chain = delete-own-row then insert-with-super_admin =
--   self-escalation to super_admin for any of the 153 existing users.
--
-- WHY THE FIX IS SAFE (verified live before writing this migration, not assumed):
--   * `handle_new_user()` (the trigger that creates a profile on every normal signup) is
--     SECURITY DEFINER owned by `postgres` -> current_user is 'postgres' during its INSERT,
--     which the guard function already bypasses on its first line. Unaffected by this change.
--   * `insforge/functions/auth-signup/index.ts` inserts into `profiles` directly using the
--     service-key client (`insforgeAdmin`), whose DB role is `project_admin` -> also bypassed
--     on the first line. Unaffected by this change. (App layer also already clamps
--     role to 'candidate' for public signup and blocks recruiter self-signup entirely --
--     independent, pre-existing defence, not touched here.)
--   * `admin_bypass_profiles` (role `project_admin`, USING/WITH CHECK true) and
--     "Admins can manage profiles" (role `authenticated`, qual `authz.is_admin()`) are separate
--     policies, untouched by this migration -- admin create/role-change on behalf of a user
--     keeps working.
--   * `profiles.status` default is `'pending'`; `profiles.is_active` default is `true`. Used
--     below as the forced/safe values for a non-privileged INSERT.
--
-- FIX -- two defences:
--   1. Guard function/trigger: handle INSERT as well as UPDATE. A non-privileged INSERT no
--      longer raises (that would break any legitimate direct-insert path) -- it force-writes
--      the privileged columns to safe defaults instead, so the row can never carry an
--      attacker-chosen role/company/status. The existing UPDATE branch is untouched.
--   2. Defence in depth on RLS: split `profiles_self` (FOR ALL, role unconstrained on INSERT)
--      into per-command policies so the INSERT policy itself rejects a non-candidate role, even
--      if the trigger were ever dropped.
--   3. AE-1b (P2, same class): `candidate_profiles` and `recruiter_profiles` each have a FOR ALL
--      policy with a NULL with_check. Add WITH CHECK (id = auth.uid()) to each via ALTER POLICY,
--      leaving their USING clauses untouched. These tables hold no role column, so the blast
--      radius is row-shape integrity, not privilege escalation.
--
-- Rollback:
--   CREATE OR REPLACE FUNCTION guard_profile_privileged_cols() RETURNS trigger LANGUAGE plpgsql
--   AS $$ BEGIN
--     IF current_user IN ('postgres', 'project_admin') THEN RETURN NEW; END IF;
--     IF authz.is_admin() THEN RETURN NEW; END IF;
--     IF NEW.role IS DISTINCT FROM OLD.role OR NEW.is_active IS DISTINCT FROM OLD.is_active
--        OR NEW.company_id IS DISTINCT FROM OLD.company_id
--        OR NEW.status IS DISTINCT FROM OLD.status THEN
--       RAISE EXCEPTION 'privileged profile columns may only be changed by an admin';
--     END IF;
--     RETURN NEW;
--   END; $$;
--   DROP TRIGGER IF EXISTS trg_guard_profile_cols ON public.profiles;
--   CREATE TRIGGER trg_guard_profile_cols BEFORE UPDATE ON public.profiles
--     FOR EACH ROW EXECUTE FUNCTION guard_profile_privileged_cols();
--   DROP POLICY IF EXISTS "profiles_self_insert" ON public.profiles;
--   DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles;
--   DROP POLICY IF EXISTS "profiles_self_delete" ON public.profiles;
--   CREATE POLICY "profiles_self" ON public.profiles FOR ALL TO public
--     USING (id = auth.uid()) WITH CHECK (id = auth.uid());
--   ALTER POLICY "Candidate own profile" ON public.candidate_profiles WITH CHECK (NULL);  -- n/a, WITH CHECK cannot be unset; drop+recreate without WITH CHECK if reverting
--   ALTER POLICY "Recruiter own management" ON public.recruiter_profiles WITH CHECK (NULL);

BEGIN;

-- ══ 1. Guard function + trigger: BEFORE INSERT OR UPDATE ═══════════════════════════════════

CREATE OR REPLACE FUNCTION guard_profile_privileged_cols()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_user IN ('postgres', 'project_admin') THEN RETURN NEW; END IF;
  IF authz.is_admin() THEN RETURN NEW; END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.role := 'candidate';
    NEW.is_active := COALESCE(NEW.is_active, true);
    NEW.company_id := NULL;
    NEW.status := 'pending';
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.is_active IS DISTINCT FROM OLD.is_active
     OR NEW.company_id IS DISTINCT FROM OLD.company_id
     OR NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'privileged profile columns may only be changed by an admin';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_profile_cols ON public.profiles;

CREATE TRIGGER trg_guard_profile_cols
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION guard_profile_privileged_cols();

-- ══ 2. RLS defence in depth: split profiles_self by command ════════════════════════════════

DROP POLICY IF EXISTS "profiles_self" ON public.profiles;

CREATE POLICY "profiles_self_insert" ON public.profiles
  FOR INSERT TO public
  WITH CHECK (id = auth.uid() AND role = 'candidate');

CREATE POLICY "profiles_self_update" ON public.profiles
  FOR UPDATE TO public
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_self_delete" ON public.profiles
  FOR DELETE TO public
  USING (id = auth.uid());

-- ══ 3. AE-1b: WITH CHECK on the sibling own-profile tables ══════════════════════════════════

ALTER POLICY "Candidate own profile" ON public.candidate_profiles
  WITH CHECK (id = auth.uid());

ALTER POLICY "Recruiter own management" ON public.recruiter_profiles
  WITH CHECK (id = auth.uid());

COMMIT;

-- ══ Post-apply verification ═════════════════════════════════════════════════════════════
--   -- trigger now covers INSERT
--   SELECT pg_get_triggerdef(oid) FROM pg_trigger WHERE tgname='trg_guard_profile_cols';
--   -- profiles policies
--   SELECT policyname, cmd, roles::text, qual, with_check FROM pg_policies
--    WHERE tablename='profiles' ORDER BY policyname;
--   -- AE-1b policies
--   SELECT tablename, policyname, with_check FROM pg_policies
--    WHERE tablename IN ('candidate_profiles','recruiter_profiles')
--      AND policyname IN ('Candidate own profile','Recruiter own management');
--   -- regression (as the candidate JWT, not service key):
--   --   POST /profiles {id:self, role:'super_admin'} must now fail (RLS/permission error, not 23505)
--   --   a normal app signup must still create a role='candidate' row
--   --   an admin role-change on another user must still succeed
