-- 045b_fix_companies_rls_L1.sql
-- SECURITY HOTFIX — audit finding L-1 / P0-6.
--
-- STATUS (2026-07-16): ALREADY SATISFIED ON LIVE — this file is now a verified no-op.
-- Live `pg_policy` on public.companies returns exactly: "Public view active companies" (SELECT),
-- admin_bypass (ALL, project_admin), project_admin_policy (ALL, project_admin). The dangerous
-- policy is ABSENT and RLS is enabled with no non-admin write policy.
-- It was applied OUT-OF-BAND: a session on 2026-07-16 ran this drop directly via run-raw-sql and
-- authored this file, which then sat untracked in git until now; system.custom_migrations is empty,
-- so neither the repo nor the DB records the change. Committed for provenance — the end state is
-- verified live, but the audit trail exists only in that session's notes. Re-running is safe.
--
-- The live `companies` table carries a policy "Recruiters manage company" (FOR ALL TO public)
-- whose USING clause only checks that the caller is *a* recruiter, with no link to the specific
-- company row (WITH CHECK is null). Any authenticated recruiter can therefore UPDATE or DELETE
-- ANY company through the data API — a live cross-tenant write hole.
--
-- Safe to drop: every legitimate WRITE to `companies` goes through service-key edge functions
-- (admin-companies, recruiter-request, company-profile, recruiter-profile, admin-recruiters),
-- which bypass RLS. All client-side `.from('companies')` usage is read-only, covered by the
-- separate "Public view active companies" SELECT policy (left untouched).
--
-- This drop is also folded idempotently into the planned migration 046; shipping it standalone
-- lets the fix go out ahead of the full Company-First migration. Idempotent (safe to re-run).
-- Refs: docs/RecruiterAndCompany_ArchitectureAndImplementation_Doc/01 (L-1), 08 (P0-6).
--
-- Verify after apply:
--   SELECT polname FROM pg_policy WHERE polrelid = 'public.companies'::regclass;
--   -- "Recruiters manage company" must be ABSENT.
--   -- As recruiter A: PATCH .../companies?id=eq.<company-of-B> must return 403/no-op.

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Recruiters manage company" ON public.companies;

-- Belt-and-suspenders: keep project_admin full access explicit (idempotent).
DROP POLICY IF EXISTS admin_bypass ON public.companies;
CREATE POLICY admin_bypass ON public.companies
  TO project_admin USING (true) WITH CHECK (true);
