-- 056_guard_last_admin_deactivate_escape.sql
-- DRAFT — NOT applied by this workstream (doc 14 §9: migrations are human-applied only).
--
-- Gap found while implementing R-6's "deactivate" company lifecycle action (doc 14 R-6,
-- doc 04 §1: "verified/suspended → deactivated ... members removed"). guard_last_company_admin
-- (051) already has an escape when the COMPANY ROW is being deleted (member rows die via FK
-- cascade after the parent is gone), but deactivation is a soft status change — the company row
-- still exists — so removing/suspending the last active admin's membership during a deactivate
-- cascade always raises `last_admin`, by design, with no escape. The R-6 edge function
-- (insforge/functions/admin-companies/index.ts) therefore currently does NOT remove members on
-- deactivate — it only flips companies.status and closes open jobs. This migration adds the
-- missing escape so a full deactivate cascade becomes possible; apply it, then extend the
-- `deactivate` action to also set company_members.status='removed' for the company.

CREATE OR REPLACE FUNCTION public.guard_last_company_admin()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE v_other_admins INT; v_company_status TEXT;
BEGIN
  IF TG_OP = 'DELETE'
     AND NOT EXISTS (SELECT 1 FROM public.companies WHERE id = OLD.company_id) THEN
    RETURN OLD;
  END IF;

  -- New: a company mid-deactivation may shed all members, admin included — the company is
  -- terminal (doc 04 §1: deactivated has no outbound transition) so "must keep ≥1 active admin"
  -- is moot for it, same rationale as the DELETE-cascade escape above.
  SELECT status INTO v_company_status FROM public.companies WHERE id = OLD.company_id;
  IF v_company_status = 'deactivated' THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
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
