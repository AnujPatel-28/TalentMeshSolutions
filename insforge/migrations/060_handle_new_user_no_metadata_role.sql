-- 060_handle_new_user_no_metadata_role.sql
--
-- Doc ref: 18_Parallel_Fix_Prompts.md, finding A2 ("handle_new_user seeds profiles.role from
-- client-supplied signup metadata").
--
-- Human applies -- never an agent (standing project rule). Apply as a SINGLE LINE via
-- `insforge db query`; the Windows CLI shim truncates multi-line input at the first newline
-- and STILL prints "Query executed successfully". This file is the readable record, not the
-- apply script. The one-line form actually applied is at the bottom of this file.
--
--
-- WHAT A2 CLAIMED
--   handle_new_user() does:
--       v_role := COALESCE((NEW.raw_user_meta_data->>'role'), 'candidate');
--   and inserts v_role into profiles.role. profiles.role is the authorization source of truth
--   (authz.is_admin(), every admin edge function, lib/server-auth.ts). If a client can put a
--   role into signup metadata, it self-provisions super_admin in one request.
--
-- EXPLOITABILITY -- MEASURED LIVE 2026-07-26, NOT INFERRED: NOT EXPLOITABLE.
--   The load-bearing fact is that the column the trigger reads DOES NOT EXIST on this backend.
--
--   (1) auth.users columns (information_schema, live):
--         id, email, password, email_verified, created_at, updated_at,
--         profile, metadata, is_project_admin, is_anonymous
--       There is no raw_user_meta_data. Confirmed by direct probe:
--         SELECT raw_user_meta_data FROM auth.users LIMIT 1;
--         -> ERROR: column "raw_user_meta_data" does not exist
--
--   (2) A PL/pgSQL field reference on the NEW record resolves at EXECUTION time and raises
--       SQLSTATE 42703 (undefined_column), which this function's own
--       `EXCEPTION WHEN undefined_column` handler traps -> v_role := 'candidate'.
--
--   (3) The handler provably fires rather than the trigger aborting: on_auth_user_created is
--       enabled (tgenabled='O') and signups succeed with profiles rows created. An AFTER
--       INSERT trigger that raised would abort the auth.users INSERT and no user would exist.
--       Corroborating (not independent) evidence: profiles.name for onboard_test_cand@example.com
--       is 'onboard_test_cand' = split_part(email,'@',1), the EXCEPTION-branch value, even
--       though auth.users.profile holds {"name": "Onboarding Test Candidate"}.
--
--   Conclusion: the metadata read is DEAD CODE. It can never place a client-chosen value into
--   profiles.role on this backend. A2 is NOT P0, and is not "P1 unverified" either -- the
--   exploit probe was rendered unnecessary by structural evidence, not skipped.
--
--   Also verified: handle_new_user is the ONLY database function that references
--   raw_user_meta_data / user_metadata / NEW.metadata (scan of pg_proc.prosrc).
--
-- WHY 059 DOES NOT COVER THIS PATH (stated explicitly, verified against live bodies)
--   handle_new_user is SECURITY DEFINER owned by `postgres`, so current_user is 'postgres'
--   during its INSERT, and guard_profile_privileged_cols() early-returns on its FIRST line for
--   current_user IN ('postgres','project_admin'). Migration 059's BEFORE INSERT OR UPDATE
--   trigger therefore never inspects the row this function writes. 059 is correct and is NOT
--   redone here -- verified live: trg_guard_profile_cols is BEFORE INSERT OR UPDATE, and
--   profiles_self is split into profiles_self_insert (WITH CHECK id = auth.uid() AND
--   role = 'candidate') / _update / _delete.
--
-- FIX (defence in depth -- applied regardless of exploitability, because the metadata read has
-- no legitimate consumer: the application assigns roles itself through audited paths)
--   Stop reading raw_user_meta_data->>'role'. Hardcode v_role := 'candidate'.
--   Name/email logic and ON CONFLICT (id) DO NOTHING are kept EXACTLY as-is.
--
--   BEHAVIOUR-NEUTRAL BY CONSTRUCTION: because the metadata read always raised and was always
--   trapped, the old body already produced 'candidate' for every row it ever inserted. The new
--   body produces the identical value. This is a stronger regression argument than any single
--   signup test.
--
--   !! DO NOT "CLEAN UP" THE EXCEPTION HANDLER BELOW !!
--   It looks like a try/catch around a read that cannot fail. It is the opposite: the v_name
--   read raises undefined_column on EVERY signup and the handler is what keeps the trigger --
--   and therefore signup for every user -- alive. Removing it aborts the AFTER INSERT trigger
--   and breaks signup platform-wide.
--
-- Rollback:
--   CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$ DECLARE v_role TEXT; v_name TEXT; BEGIN BEGIN v_role := COALESCE((NEW.raw_user_meta_data->>'role'), 'candidate'); v_name := COALESCE((NEW.raw_user_meta_data->>'name'), split_part(NEW.email, '@', 1)); EXCEPTION WHEN undefined_column THEN v_role := 'candidate'; v_name := split_part(NEW.email, '@', 1); END; INSERT INTO public.profiles (id, role, name, email, created_at) VALUES (NEW.id, v_role, v_name, COALESCE(NEW.email, ''), NOW()) ON CONFLICT (id) DO NOTHING; RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role TEXT;
  v_name TEXT;
BEGIN
  /* A2 (mig 060): role is NEVER taken from client-supplied signup metadata.
     Every new user starts as 'candidate'; role changes go through audited admin paths. */
  v_role := 'candidate';

  /* The handler below is load-bearing, not decorative: auth.users on this backend has NO
     raw_user_meta_data column, so this read raises 42703 on EVERY signup and is trapped
     here. Remove it and the AFTER INSERT trigger aborts, breaking signup for everyone. */
  BEGIN
    v_name := COALESCE(
      (NEW.raw_user_meta_data->>'name'),
      split_part(NEW.email, '@', 1)
    );
  EXCEPTION WHEN undefined_column THEN
    v_name := split_part(NEW.email, '@', 1);
  END;

  INSERT INTO public.profiles (id, role, name, email, created_at)
  VALUES (NEW.id, v_role, v_name, COALESCE(NEW.email, ''), NOW())
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ══ ONE-LINE FORM ACTUALLY APPLIED (single line -- do not reformat) ═════════════════════════
-- CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$ DECLARE v_role TEXT; v_name TEXT; BEGIN v_role := 'candidate'; BEGIN v_name := COALESCE((NEW.raw_user_meta_data->>'name'), split_part(NEW.email, '@', 1)); EXCEPTION WHEN undefined_column THEN v_name := split_part(NEW.email, '@', 1); END; INSERT INTO public.profiles (id, role, name, email, created_at) VALUES (NEW.id, v_role, v_name, COALESCE(NEW.email, ''), NOW()) ON CONFLICT (id) DO NOTHING; RETURN NEW; END; $$;

-- ══ Post-apply verification ═════════════════════════════════════════════════════════════════
--   SELECT prosrc FROM pg_proc WHERE proname='handle_new_user';   -- must contain no ->>'role'
--   SELECT pg_get_triggerdef(oid) FROM pg_trigger WHERE tgname='on_auth_user_created';
--   -- 059 must be untouched by this migration:
--   SELECT pg_get_triggerdef(oid) FROM pg_trigger WHERE tgname='trg_guard_profile_cols';
