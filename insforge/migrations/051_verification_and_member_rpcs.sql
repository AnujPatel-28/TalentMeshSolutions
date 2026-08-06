-- 051_verification_and_member_rpcs.sql

-- ── Verification decisions (mirror approve_company_verification; accept submitted OR under_review) ──
CREATE OR REPLACE FUNCTION public.reject_company_verification(p_request_id UUID, p_notes TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_company UUID;
BEGIN
  IF NOT authz.is_admin() THEN RAISE EXCEPTION 'admin only'; END IF;
  UPDATE public.company_verification_requests
     SET status='rejected', reviewer_id=(SELECT auth.uid()), review_notes=p_notes, decided_at=now()
   WHERE id=p_request_id AND status IN ('submitted','under_review')
   RETURNING company_id INTO v_company;
  IF v_company IS NULL THEN RAISE EXCEPTION 'request not found or not pending'; END IF;
  -- company stays 'pending', member stays 'invited' (04 §3)
  INSERT INTO public.verification_audit_log(company_id, request_id, actor_id, action, from_state, to_state, metadata)
  VALUES (v_company, p_request_id, (SELECT auth.uid()), 'rejected', 'under_review', 'pending', jsonb_build_object('notes', p_notes));
END; $$;

CREATE OR REPLACE FUNCTION public.request_more_info_for_verification(p_request_id UUID, p_notes TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_company UUID;
BEGIN
  IF NOT authz.is_admin() THEN RAISE EXCEPTION 'admin only'; END IF;
  UPDATE public.company_verification_requests
     SET status='needs_more_info', reviewer_id=(SELECT auth.uid()), review_notes=p_notes, decided_at=now()
   WHERE id=p_request_id AND status IN ('submitted','under_review')
   RETURNING company_id INTO v_company;
  IF v_company IS NULL THEN RAISE EXCEPTION 'request not found or not pending'; END IF;
  INSERT INTO public.verification_audit_log(company_id, request_id, actor_id, action, from_state, to_state, metadata)
  VALUES (v_company, p_request_id, (SELECT auth.uid()), 'needs_more_info', 'under_review', 'pending', jsonb_build_object('notes', p_notes));
END; $$;
-- Re-submission after needs_more_info: the recruiter simply POSTs /api/company/verification/submit again,
-- which inserts a NEW request (RLS cvr_insert_own). The admin queue shows the latest request per company.
-- No separate "reopen" RPC needed.

-- ── Last-admin guard: a company must always keep ≥1 active admin (04 §2 business rule) ──
-- Enforced at the DB so NO path (RLS write, admin_bypass, RPC) can orphan a company.
CREATE OR REPLACE FUNCTION public.guard_last_company_admin()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE v_other_admins INT;
BEGIN
  -- Fable review delta (2026-07-17): when the COMPANY itself is being deleted, the FK cascade
  -- deletes member rows after the parent is gone — the last-admin rule is vacuous then, and
  -- without this escape a company with one active admin could never be deleted at all.
  IF TG_OP = 'DELETE'
     AND NOT EXISTS (SELECT 1 FROM public.companies WHERE id = OLD.company_id) THEN
    RETURN OLD;
  END IF;
  IF OLD.member_role = 'admin' AND OLD.status = 'active'
     AND (TG_OP = 'DELETE'
          OR NEW.member_role <> 'admin'
          OR NEW.status <> 'active') THEN
    SELECT count(*) INTO v_other_admins FROM public.company_members
     WHERE company_id = OLD.company_id AND member_role = 'admin' AND status = 'active'
       AND id <> OLD.id;
    IF v_other_admins = 0 THEN
      RAISE EXCEPTION 'last_admin: a company must keep at least one active admin'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END; $$;

DROP TRIGGER IF EXISTS trg_guard_last_company_admin ON public.company_members;
CREATE TRIGGER trg_guard_last_company_admin
  BEFORE UPDATE OR DELETE ON public.company_members
  FOR EACH ROW EXECUTE FUNCTION public.guard_last_company_admin();

-- ── Member accept-invite (invited → active) ──
-- The invitee is NOT a company admin, so the admin-write RLS policy (047) can't let them flip their
-- own row. This SECURITY DEFINER RPC scopes the flip to the caller's own invited row on a verified company.
CREATE OR REPLACE FUNCTION public.accept_company_invite(p_company_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_uid UUID := (SELECT auth.uid()); v_company_status TEXT;
BEGIN
  SELECT status INTO v_company_status FROM public.companies WHERE id = p_company_id;
  IF v_company_status IS DISTINCT FROM 'verified' THEN
    RAISE EXCEPTION 'company not verified'; END IF;
  UPDATE public.company_members
     SET status = 'active', joined_at = COALESCE(joined_at, now())
   WHERE user_id = v_uid AND company_id = p_company_id AND status = 'invited';
  IF NOT FOUND THEN RAISE EXCEPTION 'no pending invite for this company'; END IF;
  INSERT INTO public.verification_audit_log(company_id, actor_id, action, from_state, to_state)
  VALUES (p_company_id, v_uid, 'member_activated', 'invited', 'active');
END; $$;

REVOKE ALL ON FUNCTION public.reject_company_verification(UUID,TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.request_more_info_for_verification(UUID,TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accept_company_invite(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reject_company_verification(UUID,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_more_info_for_verification(UUID,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_company_invite(UUID) TO authenticated;
