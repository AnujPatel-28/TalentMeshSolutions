-- Migration 055 — Audit spine hardening (doc 14 R-3)
-- ⚠ FILE ONLY — do NOT apply live without human review.
--
-- Pre-check:
--   SELECT column_name FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'audit_log'
--   ORDER BY ordinal_position;
--   → must show: id, actor_id, action, table_name, record_id, old_data, new_data,
--                metadata, ip_address, user_agent, status, created_at
--   → must NOT yet show: on_behalf_of, reason
--
-- Post-check (after applying):
--   Same query → should now include on_behalf_of, reason
--   SELECT has_table_privilege('authenticated', 'public.audit_log', 'UPDATE') → false
--   SELECT has_table_privilege('authenticated', 'public.audit_log', 'DELETE') → false

-- 1. New columns the rebuild writes (doc 14 R-3)
ALTER TABLE public.audit_log
  ADD COLUMN IF NOT EXISTS on_behalf_of uuid,          -- company_id when staff intervenes
  ADD COLUMN IF NOT EXISTS reason text;                 -- mandatory for interventions

-- 2. Append-only at the DB level
REVOKE UPDATE, DELETE ON public.audit_log FROM authenticated, anon, project_admin;
-- service role keeps INSERT/SELECT; no role keeps UPDATE/DELETE.

-- 3. Indexes for the viewer's filters (doc 03 §7)
CREATE INDEX IF NOT EXISTS audit_log_actor_idx   ON public.audit_log (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_target_idx  ON public.audit_log (table_name, record_id);
CREATE INDEX IF NOT EXISTS audit_log_behalf_idx  ON public.audit_log (on_behalf_of) WHERE on_behalf_of IS NOT NULL;

-- Note: doc 02's migration 053 also contains a `DROP TABLE public.audit_logs` step.
-- Per live truth verification, audit_logs (plural) does not exist, so that step is
-- omitted here. If your environment does have audit_logs, merge rows first per doc 02.
