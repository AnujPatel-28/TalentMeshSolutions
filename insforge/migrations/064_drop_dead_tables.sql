-- 064_drop_dead_tables.sql  (renumbered from 063 — 063 is 063_consent_records.sql, the L-2 consent table;
--  apply 063 FIRST: consent is the legal P0, this cleanup is P2.
-- Dead-table cleanup. Verified 2026-07-28 against code AND the live backend
-- (see docs/RecruiterAndCompany_ArchitectureAndImplementation_Doc/questions_forAdvisor.md,
-- "ADVISOR VERIFICATION VERDICT"). Every table below: 0 rows live and 0 app-code
-- references (matches exist only in old migration SQL, or in the dead legacy
-- supabase/functions/ directory).
--
-- Deliberately NOT dropped:
--   cleanup_job_runs        — live lock table for the active cleanup-* crons
--                             (claim_cleanup_lock RPC, migration 015); 0 rows is its
--                             normal self-cleaned state. Dropping it breaks the crons.
--   subscriptions, subscription_plans, plan_limits — live readers: admin-billing,
--                             admin-plans, admin-companies, _shared/metrics, pricing page.
--   applications.ai_match_score, audit_log.reason — still read by deployed functions
--                             (candidates/index.ts:169, admin-audit-logs/index.ts:93).
--
-- authorization_events: its single writer (resume-proxy logAuditEvent) is
-- try/catch-wrapped, so the drop cannot crash resume access; it will just log a
-- caught error. Strip that dead insert on the next resume-proxy deploy.
--
-- access_requests: 0 rows despite 26 recruiter_users — the live recruiter
-- request→admin-approve flow does not touch it; only the dead supabase/ dir does.
--
-- Applied by a human, never by an agent (doc 25 §5).

BEGIN;

DROP TABLE IF EXISTS public.test_rpc_sync CASCADE;
DROP TABLE IF EXISTS public.debug_output CASCADE;
DROP TABLE IF EXISTS public.application_events CASCADE;
DROP TABLE IF EXISTS public.auth_events CASCADE;
DROP TABLE IF EXISTS public.authorization_events CASCADE;
DROP TABLE IF EXISTS public.auth_attempts CASCADE;
DROP TABLE IF EXISTS public.access_requests CASCADE;
DROP TABLE IF EXISTS public.admin_permissions CASCADE;
DROP TABLE IF EXISTS public.ai_interviews CASCADE;
DROP TABLE IF EXISTS public.live_ai_interviews CASCADE;
DROP TABLE IF EXISTS public.ai_suggestion_cache CASCADE;
DROP TABLE IF EXISTS public.export_candidates CASCADE;
DROP TABLE IF EXISTS public.subscription_events CASCADE;

COMMIT;
