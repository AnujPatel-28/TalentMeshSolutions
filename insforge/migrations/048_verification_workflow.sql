-- 048_verification_workflow.sql
CREATE TABLE IF NOT EXISTS public.company_verification_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  -- Fable review delta (2026-07-17): was NOT NULL + ON DELETE SET NULL — contradictory;
  -- deleting a submitter's profile would violate NOT NULL and block the deletion. Nullable like actor_id.
  submitted_by  UUID REFERENCES public.profiles(id)  ON DELETE SET NULL,
  channel       TEXT NOT NULL DEFAULT 'gmail_kyc' CHECK (channel IN ('gmail_kyc','upload_portal')),
  status        TEXT NOT NULL DEFAULT 'submitted'
                CHECK (status IN ('submitted','under_review','approved','rejected','needs_more_info')),
  kyc_documents JSONB,                     -- refs to emailed/uploaded docs (no raw PII in Phase 1)
  reviewer_id   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  review_notes  TEXT,
  decided_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cvr_company_idx ON public.company_verification_requests (company_id);
CREATE INDEX IF NOT EXISTS cvr_status_idx  ON public.company_verification_requests (status);

-- Append-only audit of every important admin action (rough-idea §8 "Audit Everything")
CREATE TABLE IF NOT EXISTS public.verification_audit_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  request_id   UUID REFERENCES public.company_verification_requests(id) ON DELETE SET NULL,
  actor_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action       TEXT NOT NULL,             -- company_created|verification_submitted|approved|rejected|
                                          -- member_invited|member_removed|role_changed|company_suspended
  from_state   TEXT,
  to_state     TEXT,
  metadata     JSONB,
  created_at   TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS val_company_idx ON public.verification_audit_log (company_id);
CREATE INDEX IF NOT EXISTS val_actor_idx   ON public.verification_audit_log (actor_id);

ALTER TABLE public.company_verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_audit_log        ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_bypass ON public.company_verification_requests;
CREATE POLICY admin_bypass ON public.company_verification_requests TO project_admin USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS admin_bypass ON public.verification_audit_log;
CREATE POLICY admin_bypass ON public.verification_audit_log TO project_admin USING (true) WITH CHECK (true);

-- Company admins may read their own company's verification requests + submit
DROP POLICY IF EXISTS cvr_read_own ON public.company_verification_requests;
CREATE POLICY cvr_read_own ON public.company_verification_requests FOR SELECT
  USING (company_id = authz.company_id_of((SELECT auth.uid())));
DROP POLICY IF EXISTS cvr_insert_own ON public.company_verification_requests;
CREATE POLICY cvr_insert_own ON public.company_verification_requests FOR INSERT
  WITH CHECK (company_id = authz.company_id_of((SELECT auth.uid()))
              AND submitted_by = (SELECT auth.uid()));
-- Decisions (approve/reject) are admin-only → handled by admin_bypass + RPC (049); no recruiter UPDATE policy.

-- Audit log is append-only for members (read own company), write via RPC/trigger only.
DROP POLICY IF EXISTS val_read_own ON public.verification_audit_log;
CREATE POLICY val_read_own ON public.verification_audit_log FOR SELECT
  USING (company_id = authz.company_id_of((SELECT auth.uid())));
-- No member INSERT/UPDATE/DELETE policy → only project_admin (bypass) / SECURITY DEFINER RPCs write.
