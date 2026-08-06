-- 063_consent_records.sql
--
-- Doc ref: 26_Legal_DPDP_Compliance_Handoff.md, L-2 (consent capture) + L-11 (18+ age gate).
-- Human applies -- never an agent (standing project rule, doc 25 §5 / doc 26 §7.2).
-- Apply as a SINGLE LINE via `insforge db query` -- the Windows CLI shim truncates multi-line
-- input at the first newline and still prints "Query executed successfully" (doc 26 §6).
--
-- ══ WHY `user_id` IS NULLABLE, NOT NOT NULL (deviation from doc 26 §5's default schema) ═══════
--
-- Doc 26 flagged a real risk: requireEmailVerification is live (confirmed via
-- `npx insforge metadata --json` 2026-07-28: requireEmailVerification=true), and the deployed
-- auth-signup function's own profile-insert branch is skipped whenever `signUp()` returns no
-- `user` object under that setting (see [[talentmesh-signup-role-always-candidate]], live-proven
-- 2026-07-26). Doc 26 assumed this meant no `profiles` row exists yet at signup time and
-- suggested a nullable user_id as the "safe shape unless proven otherwise."
--
-- Investigated live 2026-07-28:
--   SELECT count(*) FROM profiles p JOIN auth.users u ON u.id = p.id
--     WHERE u.email_verified = false;                         -- -> 5 (non-zero)
-- The profiles row DOES exist before verification -- it is created by the AFTER INSERT trigger
-- handle_new_user() (migration 060), which fires on auth.users regardless of verification state
-- and is independent of whatever the auth-signup function's own client code does afterward.
--
-- So the "row doesn't exist yet" premise is false. But a *different* problem makes a synchronous
-- lookup-by-email unsafe instead:
--   SELECT email, count(*) FROM profiles GROUP BY email HAVING count(*) > 1;  -- -> 1 duplicate row
-- profiles.email has no uniqueness constraint and already has a live duplicate. auth.users.email
-- IS unique (`_user_email_key`), but auth.users is not reachable from application code (no direct
-- Postgres connection; everything goes through the InsForge REST API, which does not expose the
-- auth schema to a service-role SDK client the way it exposes public tables). So at signup time,
-- when the HTTP response omits `user` (the verification-required path, which is the live path),
-- there is no way to resolve profiles.id for this row that is guaranteed collision-free.
--
-- Resolution: keep `email` durable and `user_id` nullable, exactly as doc 26 proposed, but for a
-- different reason -- not because the row doesn't exist, but because we cannot *safely identify*
-- which row is ours without an unambiguous handle. `user_id` is backfilled at
-- app/api/auth/verify/route.ts, which DOES reliably return `data.user.id` on successful
-- verification (read directly: verify/page.tsx:84 destructures `data.user.id` unconditionally).
-- That backfill matches on `email = $1 AND user_id IS NULL`, which is safe because auth.users.email
-- is unique, so at most one signup attempt for a given email is ever "pending" at a time.
--
-- If verification is never completed, the consent rows simply stay with user_id = NULL forever,
-- still retrievable by email -- not silently lost, not incorrectly attached to someone else's row.
--
-- ══ Purposes ════════════════════════════════════════════════════════════════════════════════
--   terms_of_service               -- ToS acceptance, deliberately separate from data consent
--   account_processing             -- required to operate the account
--   profile_visible_to_recruiters  -- required for candidates only (product is unusable without it)
--   marketing_email                -- optional for every role
--   age_18_plus                    -- L-11 attestation
--   resume_parsing_ai              -- kept per doc 26 §11: résumé parsing does not run today: do
--                                     not surface in UI; carrying the value now avoids a migration
--                                     the day AI ships
--   analytics_cookies              -- carried from doc 26 §5's draft; not surfaced in UI yet either
--
-- ══ RLS + grants (house rules, doc 26 §5 + pattern from 062) ═══════════════════════════════════
--   * user may SELECT own rows (once user_id is backfilled)
--   * INSERT only via service role (project_admin) -- no INSERT policy for authenticated/anon
--   * append-only: no UPDATE/DELETE policy for anyone but project_admin, AND the underlying table
--     privilege is explicitly REVOKEd from authenticated/anon (062's lesson: RLS alone is a
--     row filter, not a command boundary -- a table created in this schema inherits default
--     INSERT/UPDATE/DELETE grants to authenticated/anon per the default privileges observed on
--     candidate_resumes, so the revoke is required, not redundant, even though "no matching
--     policy" already denies these commands under RLS)
--
-- Post-apply verification to run (read-only):
--   SELECT column_name, is_nullable FROM information_schema.columns
--     WHERE table_name='consent_records' ORDER BY ordinal_position;
--   SELECT polname, polcmd, roles FROM pg_policies WHERE tablename='consent_records';
--   SELECT grantee, privilege_type FROM information_schema.table_privileges
--     WHERE table_name='consent_records' AND grantee IN ('authenticated','anon');
--     -- expect ONLY SELECT for authenticated/anon, no INSERT/UPDATE/DELETE

BEGIN;

CREATE TABLE IF NOT EXISTS public.consent_records (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email          text NOT NULL,
  user_id        uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  purpose        text NOT NULL,
  status         text NOT NULL CHECK (status IN ('granted','withdrawn')),
  notice_version text NOT NULL,
  notice_hash    text,
  source         text NOT NULL CHECK (source IN ('signup','settings','api')),
  ip_address     inet,
  user_agent     text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT consent_purpose_check CHECK (purpose IN (
    'terms_of_service',
    'account_processing',
    'profile_visible_to_recruiters',
    'resume_parsing_ai',
    'marketing_email',
    'analytics_cookies',
    'age_18_plus'
  ))
);

CREATE INDEX IF NOT EXISTS consent_email_idx ON public.consent_records (email);
CREATE INDEX IF NOT EXISTS consent_user_purpose_idx ON public.consent_records (user_id, purpose, created_at DESC);

ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_bypass ON public.consent_records;
CREATE POLICY admin_bypass ON public.consent_records TO project_admin USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS consent_records_select_own ON public.consent_records;
CREATE POLICY consent_records_select_own ON public.consent_records FOR SELECT USING (user_id = auth.uid());

-- Defense in depth per 062's precedent: RLS with no INSERT/UPDATE/DELETE policy already denies
-- those commands for authenticated/anon, but the table-level grant is revoked too so the
-- append-only guarantee does not rest on RLS alone.
REVOKE INSERT, UPDATE, DELETE ON public.consent_records FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.consent_records FROM anon;

COMMIT;

-- ══ ONE-LINE FORM TO APPLY (single line -- do not reformat) ════════════════════════════════════
-- BEGIN; CREATE TABLE IF NOT EXISTS public.consent_records (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text NOT NULL, user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE, purpose text NOT NULL, status text NOT NULL CHECK (status IN ('granted','withdrawn')), notice_version text NOT NULL, notice_hash text, source text NOT NULL CHECK (source IN ('signup','settings','api')), ip_address inet, user_agent text, created_at timestamptz NOT NULL DEFAULT now(), CONSTRAINT consent_purpose_check CHECK (purpose IN ('terms_of_service','account_processing','profile_visible_to_recruiters','resume_parsing_ai','marketing_email','analytics_cookies','age_18_plus'))); CREATE INDEX IF NOT EXISTS consent_email_idx ON public.consent_records (email); CREATE INDEX IF NOT EXISTS consent_user_purpose_idx ON public.consent_records (user_id, purpose, created_at DESC); ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY; DROP POLICY IF EXISTS admin_bypass ON public.consent_records; CREATE POLICY admin_bypass ON public.consent_records TO project_admin USING (true) WITH CHECK (true); DROP POLICY IF EXISTS consent_records_select_own ON public.consent_records; CREATE POLICY consent_records_select_own ON public.consent_records FOR SELECT USING (user_id = auth.uid()); REVOKE INSERT, UPDATE, DELETE ON public.consent_records FROM authenticated; REVOKE INSERT, UPDATE, DELETE ON public.consent_records FROM anon; COMMIT;
