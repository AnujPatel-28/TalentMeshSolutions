-- Migration 044: Health cleanup settings for dead tuple advisor warnings
-- Advisor fixes: health/dead-tuples
--
-- Important:
-- VACUUM cannot run inside an explicit transaction block.
-- Therefore this migration only applies safe table-level autovacuum settings.
-- The VACUUM ANALYZE statements at the bottom must be run manually one-by-one
-- in the InsForge SQL editor (outside any transaction).
--
-- Note: 'definitions' and 'email_otps' were listed in the original Advisor report
-- but do not exist in the live database. They are excluded from this migration.

ALTER TABLE IF EXISTS public.candidate_profiles SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02
);

ALTER TABLE IF EXISTS public.profiles SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02
);

ALTER TABLE IF EXISTS public.notification_preferences SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02
);

ALTER TABLE IF EXISTS public.user_sessions SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02
);

-- ════════════════════════════════════════════════════════════════════════════
-- MANUAL STEP: Run these VACUUM ANALYZE statements one-by-one in the SQL editor.
-- They cannot run inside a migration transaction.
-- ════════════════════════════════════════════════════════════════════════════
-- VACUUM ANALYZE public.candidate_profiles;
-- VACUUM ANALYZE public.profiles;
-- VACUUM ANALYZE public.notification_preferences;
-- VACUUM ANALYZE public.user_sessions;

-- ════════════════════════════════════════════════════════════════════════════
-- InsForge-managed schema tables (cannot ALTER TABLE, but VACUUM is allowed):
-- ════════════════════════════════════════════════════════════════════════════
-- 'definitions' lives in the 'functions' schema (InsForge-managed).
-- 'email_otps' lives in the 'auth' schema (InsForge-managed).
-- ALTER TABLE SET(...) is blocked by InsForge on these schemas.
-- Run VACUUM manually when the Advisor flags dead tuples:
-- VACUUM ANALYZE functions.definitions;
-- VACUUM ANALYZE auth.email_otps;

