-- 052_fix_invited_admin_resubmit_and_invite_hardening.sql
-- Two defects surfaced by the Phase 2 route build (P2-B report, 2026-07-17):
--
-- (1) RESUBMIT DEADLOCK: cvr_insert_own (048) requires authz.company_id_of(uid), which only
--     matches ACTIVE memberships — but a founder stays 'invited' until approve_company_verification
--     flips them. After a needs_more_info/rejected decision the invited admin cannot resubmit
--     (doc 04 §3 flow). Fix: a helper that resolves the caller's ADMIN membership whether
--     invited or active, used only by the verification-submit policy.
--
-- (2) TENANT-JOIN HOLE: the request-access "attach" path self-creates an 'invited' member row
--     (invited_by NULL), and accept_company_invite (051) required only an invited row on a
--     verified company — so anyone knowing a GSTIN could attach then self-accept into that
--     tenant with no admin approval. Fix: accept requires a genuine invite (invited_by set by a
--     company admin, and not self-issued). Founder rows are unaffected (they are activated by
--     approve_company_verification, not accept).

CREATE OR REPLACE FUNCTION authz.admin_company_id_of(p_user UUID)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT company_id FROM public.company_members
   WHERE user_id = p_user AND member_role = 'admin'
     AND status IN ('invited','active') LIMIT 1
$$;

DROP POLICY IF EXISTS cvr_insert_own ON public.company_verification_requests;
CREATE POLICY cvr_insert_own ON public.company_verification_requests FOR INSERT
  WITH CHECK (company_id = authz.admin_company_id_of((SELECT auth.uid()))
              AND submitted_by = (SELECT auth.uid()));

-- Let the invited admin also READ their own company's requests (status page / resubmit UI can
-- then run on the caller's token instead of the service key).
DROP POLICY IF EXISTS cvr_read_own ON public.company_verification_requests;
CREATE POLICY cvr_read_own ON public.company_verification_requests FOR SELECT
  USING (company_id = authz.company_id_of((SELECT auth.uid()))
         OR company_id = authz.admin_company_id_of((SELECT auth.uid())));

-- A member can always read their OWN row (any status): the invited admin's resubmit path and the
-- pending-status page read the caller's membership with the caller's token; the existing
-- company_members_read_own_company policy is active-only and hides it.
DROP POLICY IF EXISTS company_members_read_self ON public.company_members;
CREATE POLICY company_members_read_self ON public.company_members FOR SELECT
  USING (user_id = (SELECT auth.uid()));

CREATE OR REPLACE FUNCTION public.accept_company_invite(p_company_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_uid UUID := (SELECT auth.uid()); v_company_status TEXT;
BEGIN
  SELECT status INTO v_company_status FROM public.companies WHERE id = p_company_id;
  IF v_company_status IS DISTINCT FROM 'verified' THEN
    RAISE EXCEPTION 'company not verified'; END IF;
  -- 052 hardening: only a row a company admin actually invited can be self-accepted.
  UPDATE public.company_members
     SET status = 'active', joined_at = COALESCE(joined_at, now())
   WHERE user_id = v_uid AND company_id = p_company_id AND status = 'invited'
     AND invited_by IS NOT NULL AND invited_by <> v_uid;
  IF NOT FOUND THEN RAISE EXCEPTION 'no pending invite for this company'; END IF;
  INSERT INTO public.verification_audit_log(company_id, actor_id, action, from_state, to_state)
  VALUES (p_company_id, v_uid, 'member_activated', 'invited', 'active');
END; $$;
-- (REVOKE/GRANT from 051 persist across CREATE OR REPLACE; re-assert for safety.)
REVOKE ALL ON FUNCTION public.accept_company_invite(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_company_invite(UUID) TO authenticated;
