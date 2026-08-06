-- ============================================================
-- Migration 012: Setup daily scheduled cron job for cleaning expired idempotency keys and reclaiming worker locks
-- ============================================================

-- Safely run the pg_cron setup block using an anonymous DO block.
-- This prevents the migration from hard-crashing if pg_cron is not enabled or supported on this environment.
DO $$
BEGIN
  -- Enable pg_cron extension if not already present
  CREATE EXTENSION IF NOT EXISTS pg_cron;

  -- Remove the cron job if it already exists to prevent duplicate execution errors
  PERFORM cron.unschedule('cleanup_idempotency_keys');
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Skipping pg_cron extension enablement / unscheduling check';
END;
$$;

-- Register the daily cron job
-- If pg_cron is present, schedule it.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'cleanup_idempotency_keys',
      '0 0 * * *', -- daily at midnight
      'DELETE FROM public.idempotency_keys WHERE expires_at < now(); UPDATE public.export_jobs SET status = ''pending'', locked_by = NULL, locked_at = NULL WHERE status = ''running'' AND locked_at < now() - interval ''10 minutes'';'
    );
    RAISE NOTICE 'Daily cleanup_idempotency_keys scheduled successfully via pg_cron.';
  ELSE
    RAISE NOTICE 'pg_cron extension not found. Daily cleanup job was not registered.';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Failed to register pg_cron job: %', SQLERRM;
END;
$$;
