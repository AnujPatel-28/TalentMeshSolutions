-- 050_company_scoped_rls_and_plans.sql

-- plan_limits: single source of truth for entitlements (rough-idea: free = 1 active job)
CREATE TABLE IF NOT EXISTS public.plan_limits (
  plan            TEXT PRIMARY KEY,   -- free|starter|growth|enterprise
  max_active_jobs INT NOT NULL,
  price_inr       INT NOT NULL DEFAULT 0,
  talent_pool     BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO public.plan_limits(plan, max_active_jobs, price_inr, talent_pool) VALUES
  ('free', 1, 0, false)
ON CONFLICT (plan) DO NOTHING;
ALTER TABLE public.plan_limits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS plan_limits_read ON public.plan_limits;
CREATE POLICY plan_limits_read ON public.plan_limits FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS admin_bypass ON public.plan_limits;
CREATE POLICY admin_bypass ON public.plan_limits TO project_admin USING (true) WITH CHECK (true);

-- jobs: replace recruiter-owned policies with company-scoped ones (uses (SELECT auth.uid()))
-- v1.1: DROP the ACTUAL LIVE policy names, reconciled against _migration_refs.md §2.4.
--       Missing any of the blanket ones leaves the L-2 hole open (policies are OR-ed).
-- Architect decision (2026-07-17): 14 of the 16 live policies are dropped here. `admin_bypass`
--       and `project_admin_policy` are RETAINED — they are TO project_admin only (unreachable
--       from user JWTs, so not part of L-2), and house rule #2 requires admin_bypass on every
--       table. project_admin_policy duplicates admin_bypass; deduping it is post-launch cleanup.
DROP POLICY IF EXISTS jobs_select_own ON public.jobs;
DROP POLICY IF EXISTS jobs_insert_own ON public.jobs;
DROP POLICY IF EXISTS jobs_update_own ON public.jobs;
DROP POLICY IF EXISTS jobs_delete_own ON public.jobs;
DROP POLICY IF EXISTS jobs_update_unapproved ON public.jobs;
DROP POLICY IF EXISTS jobs_update_approved ON public.jobs;
DROP POLICY IF EXISTS "Recruiters can insert jobs" ON public.jobs;
DROP POLICY IF EXISTS "Recruiters can update own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Recruiters can delete own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Recruiters view own jobs" ON public.jobs;
-- Duplicate public-read + admin policies also live; collapse to one of each below.
DROP POLICY IF EXISTS public_select ON public.jobs;
DROP POLICY IF EXISTS jobs_select_approved ON public.jobs;
DROP POLICY IF EXISTS "Admins can view all jobs" ON public.jobs;
DROP POLICY IF EXISTS admins_all ON public.jobs;
-- Also clean the duplicate DDL noise found live (2 of 3 update triggers + duplicate index):
DROP TRIGGER IF EXISTS tr_jobs_update ON public.jobs;
DROP TRIGGER IF EXISTS update_jobs_updated_at ON public.jobs;   -- keep trigger_set_updated_at
DROP INDEX IF EXISTS public.idx_jobs_status;                    -- keep idx_jobs_status_approved (identical)
-- Recreate a single admin-all + single public read:
DROP POLICY IF EXISTS jobs_admin_all ON public.jobs;
CREATE POLICY jobs_admin_all ON public.jobs TO authenticated
  USING (authz.is_admin()) WITH CHECK (authz.is_admin());
-- single public read (approved + active) + verified-company predicate (09-T6 step 3, recorded
-- decision): jobs of suspended/unverified companies drop out of public listings immediately.
-- Subquery cost per public row is covered by the companies(status) index from 046.
DROP POLICY IF EXISTS jobs_select_approved ON public.jobs;
CREATE POLICY jobs_select_approved ON public.jobs FOR SELECT TO public
  USING (status = 'active' AND is_approved = true
         AND EXISTS (SELECT 1 FROM public.companies c
                     WHERE c.id = jobs.company_id AND c.status = 'verified'));
DROP POLICY IF EXISTS jobs_select_company ON public.jobs;
CREATE POLICY jobs_select_company ON public.jobs FOR SELECT
  USING (company_id = authz.company_id_of((SELECT auth.uid())));
-- INSERT only via create_job() RPC → block direct insert for non-admins
DROP POLICY IF EXISTS jobs_no_direct_insert ON public.jobs;
CREATE POLICY jobs_no_direct_insert ON public.jobs FOR INSERT
  WITH CHECK (false);   -- direct inserts denied; RPC runs as definer (bypasses)
-- UPDATE: admins on any company job; recruiters on their own; coordinators none
DROP POLICY IF EXISTS jobs_update_company ON public.jobs;
CREATE POLICY jobs_update_company ON public.jobs FOR UPDATE
  USING (
    company_id = authz.company_id_of((SELECT auth.uid()))
    AND (authz.company_role((SELECT auth.uid()), company_id) = 'admin'
         OR recruiter_id = (SELECT auth.uid()))
  );
DROP POLICY IF EXISTS jobs_delete_company ON public.jobs;
CREATE POLICY jobs_delete_company ON public.jobs FOR DELETE
  USING (authz.is_company_admin((SELECT auth.uid()), company_id));
CREATE INDEX IF NOT EXISTS jobs_company_idx  ON public.jobs (company_id);
CREATE INDEX IF NOT EXISTS jobs_recruiter_idx ON public.jobs (recruiter_id);
CREATE INDEX IF NOT EXISTS jobs_company_status_idx ON public.jobs (company_id, status);

-- applications: recruiters see applications to their COMPANY's jobs (not just own jobs)
DROP POLICY IF EXISTS apps_recruiter_view ON public.applications;
DROP POLICY IF EXISTS apps_recruiter_update ON public.applications;
DROP POLICY IF EXISTS apps_company_view ON public.applications;
CREATE POLICY apps_company_view ON public.applications FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = applications.job_id
      AND j.company_id = authz.company_id_of((SELECT auth.uid()))
  ));
DROP POLICY IF EXISTS apps_company_update ON public.applications;
CREATE POLICY apps_company_update ON public.applications FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = applications.job_id
      AND j.company_id = authz.company_id_of((SELECT auth.uid()))
      AND authz.company_role((SELECT auth.uid()), j.company_id) IN ('admin','recruiter')
  ));
CREATE INDEX IF NOT EXISTS applications_job_idx ON public.applications (job_id);

-- Enforce active-job entitlement on ANY path that flips a job to 'active' (defense in depth vs the RPC)
CREATE OR REPLACE FUNCTION public.enforce_active_job_limit()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE v_limit INT; v_active INT;
BEGIN
  IF NEW.status = 'active' AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM 'active') THEN
    SELECT COALESCE((SELECT pl.max_active_jobs FROM public.plan_limits pl
       JOIN public.subscriptions s ON s.plan=pl.plan AND s.company_id=NEW.company_id
       AND s.status IN ('trialing','active') LIMIT 1), 1) INTO v_limit;
    SELECT count(*) INTO v_active FROM public.jobs
      WHERE company_id=NEW.company_id AND status='active' AND id <> NEW.id;
    IF v_active >= v_limit THEN
      RAISE EXCEPTION 'active job limit reached (%)', v_limit USING ERRCODE='check_violation';
    END IF;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_active_job_limit ON public.jobs;
CREATE TRIGGER trg_active_job_limit BEFORE INSERT OR UPDATE OF status ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.enforce_active_job_limit();
