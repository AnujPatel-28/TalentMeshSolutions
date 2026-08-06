-- 049_repoint_ownership_and_rpcs.sql
-- NOTE (v1.1): live `companies` has NO recruiter_id. Ownership is derived from jobs.recruiter_id
-- (the recruiter who posted the company's earliest job) and from profiles.company_id.

-- 0. Backfill companies.created_by from the earliest job's recruiter per company.
--    Companies with zero jobs get created_by = NULL and surface as an admin-console task (see 07).
UPDATE public.companies c
   SET created_by = j.recruiter_id
  FROM (
    SELECT DISTINCT ON (company_id) company_id, recruiter_id
    FROM public.jobs
    WHERE recruiter_id IS NOT NULL
    ORDER BY company_id, created_at ASC
  ) j
 WHERE j.company_id = c.id AND c.created_by IS NULL;

-- 1. The company creator (if resolved) becomes the admin member.
INSERT INTO public.company_members (company_id, user_id, member_role, status, joined_at)
SELECT c.id, c.created_by, 'admin', 'active', now()
FROM public.companies c
WHERE c.created_by IS NOT NULL
ON CONFLICT DO NOTHING;

-- Other recruiters linked only via profiles.company_id → active recruiter members
INSERT INTO public.company_members (company_id, user_id, member_role, status, joined_at)
SELECT p.company_id, p.id, 'recruiter', 'active', now()
FROM public.profiles p
WHERE p.role = 'recruiter' AND p.company_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.companies c WHERE c.id = p.company_id)  -- FK-safe: skip dangling company_id
  AND NOT EXISTS (SELECT 1 FROM public.company_members m WHERE m.user_id = p.id)
ON CONFLICT DO NOTHING;

-- Any recruiter who posted a job but isn't linked via profiles.company_id → recruiter member of that company
INSERT INTO public.company_members (company_id, user_id, member_role, status, joined_at)
SELECT DISTINCT j.company_id, j.recruiter_id, 'recruiter', 'active', now()
FROM public.jobs j
WHERE j.recruiter_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.company_members m WHERE m.user_id = j.recruiter_id)
ON CONFLICT DO NOTHING;

-- Verification status is already mapped in 046 (from is_verified). Do NOT blanket-verify here.

-- 2. (No recruiter_id column to drop on companies — it never existed live.)

-- 3. jobs.company_id already → companies (live FK); ensure FK + creator semantics
ALTER TABLE public.jobs
  DROP CONSTRAINT IF EXISTS jobs_company_id_fkey,
  ADD  CONSTRAINT jobs_company_id_fkey FOREIGN KEY (company_id)
       REFERENCES public.companies(id) ON DELETE CASCADE;
-- jobs.recruiter_id stays as creator/owner-within-company (nullable-safe on member removal)
ALTER TABLE public.jobs
  DROP CONSTRAINT IF EXISTS jobs_recruiter_id_fkey,
  ADD  CONSTRAINT jobs_recruiter_id_fkey FOREIGN KEY (recruiter_id)
       REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 4. subscriptions.company_id → companies (already logically, enforce FK)
ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_company_id_fkey,
  ADD  CONSTRAINT subscriptions_company_id_fkey FOREIGN KEY (company_id)
       REFERENCES public.companies(id) ON DELETE CASCADE;

-- 5. Lifecycle RPCs (SECURITY DEFINER; admin/company-admin gated inside). See 03 for API surface.
CREATE OR REPLACE FUNCTION public.approve_company_verification(p_request_id UUID, p_notes TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_company UUID;
BEGIN
  IF NOT authz.is_admin() THEN RAISE EXCEPTION 'admin only'; END IF;
  -- Fable review delta (2026-07-17): guard the state machine — only pending states are approvable,
  -- and a nonexistent/decided request must error, not silently no-op with a junk audit row.
  UPDATE public.company_verification_requests
     SET status='approved', reviewer_id=(SELECT auth.uid()), review_notes=p_notes, decided_at=now()
   WHERE id=p_request_id AND status IN ('submitted','under_review')
   RETURNING company_id INTO v_company;
  IF v_company IS NULL THEN
    RAISE EXCEPTION 'verification request not found or already decided';
  END IF;
  UPDATE public.companies SET status='verified', verified_at=now(), verified_by=(SELECT auth.uid())
   WHERE id=v_company;
  UPDATE public.company_members SET status='active', joined_at=COALESCE(joined_at, now())
   WHERE company_id=v_company AND status='invited';
  INSERT INTO public.verification_audit_log(company_id, request_id, actor_id, action, to_state, metadata)
  VALUES (v_company, p_request_id, (SELECT auth.uid()), 'approved', 'verified', jsonb_build_object('notes', p_notes));
END; $$;

CREATE OR REPLACE FUNCTION public.create_job(p_payload JSONB)
RETURNS public.jobs LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_company UUID; v_uid UUID := (SELECT auth.uid()); v_active INT; v_limit INT; v_row public.jobs;
BEGIN
  v_company := authz.company_id_of(v_uid);
  IF v_company IS NULL THEN RAISE EXCEPTION 'no active company membership'; END IF;
  IF authz.company_role(v_uid, v_company) NOT IN ('admin','recruiter')
     THEN RAISE EXCEPTION 'coordinators cannot post jobs'; END IF;

  -- Free-plan entitlement (finding: enforce in DB, not frontend). See plan_limits (050).
  SELECT COALESCE((SELECT max_active_jobs FROM public.plan_limits pl
                   JOIN public.subscriptions s ON s.plan = pl.plan AND s.company_id = v_company
                   AND s.status IN ('trialing','active') LIMIT 1), 1) INTO v_limit;
  SELECT count(*) INTO v_active FROM public.jobs
   WHERE company_id = v_company AND status = 'active';
  IF (p_payload->>'status') = 'active' AND v_active >= v_limit THEN
    RAISE EXCEPTION 'active job limit reached (%). Close an active job to post another.', v_limit
      USING ERRCODE = 'check_violation';
  END IF;

  INSERT INTO public.jobs (company_id, recruiter_id, title, description, requirements, skills_required,
                           location, type, department, salary_min, salary_max, currency,
                           experience_min, experience_max, status, is_approved)
  SELECT v_company, v_uid,
         p_payload->>'title', p_payload->>'description',
         ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_payload->'requirements','[]'::jsonb))),
         ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_payload->'skills_required','[]'::jsonb))),
         p_payload->>'location', p_payload->>'type', p_payload->>'department',
         (p_payload->>'salary_min')::int, (p_payload->>'salary_max')::int, COALESCE(p_payload->>'currency','INR'),
         (p_payload->>'experience_min')::int, (p_payload->>'experience_max')::int,
         COALESCE(p_payload->>'status','draft'), false
  RETURNING * INTO v_row;
  RETURN v_row;
END; $$;

REVOKE ALL ON FUNCTION public.approve_company_verification(UUID,TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_job(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_company_verification(UUID,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_job(JSONB) TO authenticated;
