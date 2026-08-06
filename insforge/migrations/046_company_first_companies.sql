-- 046_company_first_companies.sql
-- NOTE: `companies` already exists live (6 rows). NO RENAME. Alter in place.
--
-- Source: docs/RecruiterAndCompany_ArchitectureAndImplementation_Doc/02_Schema_And_Database_Design.md
--         → "Migration 046" (v1.1). Written per 09_Migration_Execution_Runbook.md → T2.
-- Policy names reconciled against the T1 live baseline (_migration_refs.md §2.2, captured 2026-07-17):
--   live public.companies policies = "Public view active companies" (SELECT, public),
--   admin_bypass (ALL, project_admin), project_admin_policy (ALL, project_admin).
--   "Recruiters manage company" is ALREADY ABSENT live (L-1 closed out-of-band 2026-07-16,
--   see 045b_fix_companies_rls_L1.sql) — its DROP below is a verified no-op, kept idempotent
--   per architect decision #5 rather than removed.
--   project_admin_policy is live but is NOT touched by this migration (doc 02 does not drop it).
-- NOT APPLIED to any database by this task (T2 is file-only; live apply is the T10 gate).

-- 0. Safety: the vestigial company_profiles must be empty before we touch anything.
DO $$
BEGIN
  IF to_regclass('public.company_profiles') IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.company_profiles LIMIT 1) THEN
    RAISE EXCEPTION 'company_profiles is NOT empty — reconcile its rows into companies before migrating';
  END IF;
END $$;

-- 1. Lifecycle + verification metadata on the LIVE companies table
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','verified','suspended','deactivated')),
  ADD COLUMN IF NOT EXISTS verified_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(), -- live companies lacks this
  -- India KYC (see also GSTIN/CIN validation in 03 API layer)
  ADD COLUMN IF NOT EXISTS cin           TEXT,   -- Corporate Identification Number (21 char)
  ADD COLUMN IF NOT EXISTS pan           TEXT,   -- company PAN (10 char) — store, never expose to recruiters
  ADD COLUMN IF NOT EXISTS registered_email_domain TEXT,
  ADD COLUMN IF NOT EXISTS country_code  TEXT NOT NULL DEFAULT 'IN', -- international-ready
  ADD COLUMN IF NOT EXISTS slug          TEXT;   -- public profile URL segment
-- gstin, tan, logo_url, website, industry, size, description, location, is_verified, is_active already exist live.
-- (Live has `description`, NOT `about` — 05/07 UI must bind `description`.)

-- 2. Map the existing verification signal onto the new lifecycle.
--    Live has 6 companies with is_verified true/false; DEFAULT 'pending' above would wrongly reset verified ones.
--    T1 baseline preview (_migration_refs.md §2.6): 3 rows → 'verified', 3 rows → 'pending',
--    0 rows → 'deactivated' (all 6 live rows are is_active = true).
UPDATE public.companies
   SET status = CASE
                  WHEN is_active = false THEN 'deactivated'
                  WHEN is_verified = true THEN 'verified'
                  ELSE 'pending'
                END,
       verified_at = CASE WHEN is_verified = true THEN COALESCE(verified_at, created_at, now()) END;
-- Keep is_verified/is_active as legacy read columns for now; a later migration can drop them once
-- all readers use `status`. Do NOT drop them here (public read policy still references is_active).

-- 3. Uniqueness: one company record per organization (soft — GSTIN is the strong key in IN)
-- Fable review delta (2026-07-17): 3 live rows have gstin = '' (empty string), which the
-- IS NOT NULL predicate does not exempt — the unique index would fail on them. Normalize first.
UPDATE public.companies SET gstin = NULL WHERE gstin = '';
CREATE UNIQUE INDEX IF NOT EXISTS companies_gstin_key ON public.companies (gstin) WHERE gstin IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS companies_slug_key  ON public.companies (slug)  WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS companies_status_idx ON public.companies (status);
CREATE INDEX IF NOT EXISTS companies_created_by_idx ON public.companies (created_by);

-- 4. updated_at trigger (reuse the existing house function used elsewhere)
DROP TRIGGER IF EXISTS trigger_set_updated_at ON public.companies;
CREATE TRIGGER trigger_set_updated_at BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION set_current_timestamp_updated_at();

-- 5. FIX finding L-1: drop the "any recruiter edits any company" policy.
--    Interim ownership uses created_by until 047's company_members lands; 050 replaces this with membership scope.
DROP POLICY IF EXISTS "Recruiters manage company" ON public.companies;
DROP POLICY IF EXISTS admin_bypass ON public.companies;
CREATE POLICY admin_bypass ON public.companies TO project_admin USING (true) WITH CHECK (true);
-- public read stays (adjust to status once readers migrate off is_active)
DROP POLICY IF EXISTS "Public view active companies" ON public.companies;
DROP POLICY IF EXISTS companies_public_read ON public.companies;
CREATE POLICY companies_public_read ON public.companies FOR SELECT TO public
  USING (is_active = true AND status <> 'deactivated');
-- interim owner write (superseded by 050 jobs/members scoping)
DROP POLICY IF EXISTS companies_owner_write ON public.companies;
CREATE POLICY companies_owner_write ON public.companies FOR UPDATE
  USING (created_by = (SELECT auth.uid())) WITH CHECK (created_by = (SELECT auth.uid()));

-- 6. Retire the empty vestige (guarded above).
-- T10 apply delta (2026-07-17): authorization_events.company_id (mig 028) FK'd the vestige —
-- missed by the T1 baseline (which only captured companies/company_profiles/jobs). Table is
-- empty and the column nullable; repoint to the live companies table before the drop.
ALTER TABLE public.authorization_events
  DROP CONSTRAINT IF EXISTS authorization_events_company_id_fkey;
ALTER TABLE public.authorization_events
  ADD CONSTRAINT authorization_events_company_id_fkey FOREIGN KEY (company_id)
      REFERENCES public.companies(id) ON DELETE SET NULL;
DROP TABLE IF EXISTS public.company_profiles;
