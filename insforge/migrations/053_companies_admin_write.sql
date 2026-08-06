-- 053_companies_admin_write.sql
-- P2-C STOP #1 (2026-07-17): companies_owner_write (046) was explicitly interim — it scopes
-- UPDATE to created_by only, so a company admin added later (or the invited founder pre-
-- verification) cannot edit the company profile, contradicting doc 03's is_company_admin
-- contract. Replace with an admin-membership scope via authz.admin_company_id_of (052 —
-- admin role, invited OR active). The creator is always the admin member (049 backfill /
-- request-access), so no write path is lost.
DROP POLICY IF EXISTS companies_owner_write ON public.companies;
DROP POLICY IF EXISTS companies_admin_write ON public.companies;
CREATE POLICY companies_admin_write ON public.companies FOR UPDATE
  USING (id = authz.admin_company_id_of((SELECT auth.uid())))
  WITH CHECK (id = authz.admin_company_id_of((SELECT auth.uid())));
