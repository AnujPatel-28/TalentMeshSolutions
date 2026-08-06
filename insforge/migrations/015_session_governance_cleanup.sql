-- ============================================================
-- Migration 015: Session Governance & Release Cleanup
-- ============================================================

-- 1. Seed Platform Settings for Session Policy
INSERT INTO public.platform_settings (key, value)
VALUES ('session_policy', '{
  "admin": {"idleMs": 600000, "warningMs": 60000},
  "recruiter": {"idleMs": 1200000, "warningMs": 60000},
  "candidate": {"idleMs": 1800000, "warningMs": 60000}
}'::jsonb)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value;

-- 2. Create user_sessions Table
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_type TEXT CHECK (session_type IN ('normal', 'impersonation')) DEFAULT 'normal',
  token_fingerprint TEXT UNIQUE NOT NULL, -- HMAC-SHA256 of refresh token
  session_name TEXT, -- Chrome • Windows, Safari • iPhone, etc.
  ip_hash TEXT NOT NULL, -- sha256(ip_address)
  user_agent TEXT,
  country TEXT,
  region TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  last_active_at TIMESTAMPTZ DEFAULT now(),
  impersonation_started_at TIMESTAMPTZ,
  impersonated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Enable RLS on user_sessions
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- 3. Create storage_quarantine Table
CREATE TABLE IF NOT EXISTS public.storage_quarantine (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_name TEXT NOT NULL,
  file_path TEXT UNIQUE NOT NULL,
  original_path TEXT NOT NULL,
  quarantined_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
  restore_requested_at TIMESTAMPTZ,
  restored_at TIMESTAMPTZ,
  status TEXT CHECK (status IN ('quarantined', 'restoring', 'restored', 'deleted')) DEFAULT 'quarantined'
);

-- Enable RLS on storage_quarantine
ALTER TABLE public.storage_quarantine ENABLE ROW LEVEL SECURITY;

-- 4. Create cleanup_job_runs Table
CREATE TABLE IF NOT EXISTS public.cleanup_job_runs (
  job_name TEXT PRIMARY KEY,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  locked_by TEXT
);

-- Enable RLS on cleanup_job_runs
ALTER TABLE public.cleanup_job_runs ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS Policies
-- user_sessions Policies
DROP POLICY IF EXISTS "Users can view own sessions" ON public.user_sessions;
CREATE POLICY "Users can view own sessions" 
  ON public.user_sessions FOR SELECT 
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can revoke own sessions" ON public.user_sessions;
CREATE POLICY "Users can revoke own sessions" 
  ON public.user_sessions FOR UPDATE 
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage user_sessions" ON public.user_sessions;
CREATE POLICY "Admins can manage user_sessions" 
  ON public.user_sessions FOR ALL 
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS admin_bypass ON public.user_sessions;
CREATE POLICY admin_bypass ON public.user_sessions TO project_admin USING (true) WITH CHECK (true);

-- storage_quarantine Policies
DROP POLICY IF EXISTS "Admins can manage storage_quarantine" ON public.storage_quarantine;
CREATE POLICY "Admins can manage storage_quarantine" 
  ON public.storage_quarantine FOR ALL 
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS admin_bypass ON public.storage_quarantine;
CREATE POLICY admin_bypass ON public.storage_quarantine TO project_admin USING (true) WITH CHECK (true);

-- cleanup_job_runs Policies
DROP POLICY IF EXISTS admin_bypass ON public.cleanup_job_runs;
CREATE POLICY admin_bypass ON public.cleanup_job_runs TO project_admin USING (true) WITH CHECK (true);

-- 6. Lock Management functions
CREATE OR REPLACE FUNCTION public.claim_cleanup_lock(job_name_val TEXT, worker_val TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  success BOOLEAN := FALSE;
BEGIN
  -- Clean up old completed locks first
  DELETE FROM public.cleanup_job_runs
  WHERE job_name = job_name_val
    AND (completed_at IS NOT NULL OR started_at < now() - interval '10 minutes');

  INSERT INTO public.cleanup_job_runs (job_name, started_at, locked_by)
  VALUES (job_name_val, now(), worker_val)
  ON CONFLICT (job_name) DO UPDATE
  SET started_at = now(),
      completed_at = NULL,
      locked_by = worker_val
  WHERE public.cleanup_job_runs.completed_at IS NOT NULL
     OR public.cleanup_job_runs.started_at < now() - interval '10 minutes';
     
  IF FOUND THEN
    success := TRUE;
  END IF;
  
  RETURN success;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.release_cleanup_lock(job_name_val TEXT, worker_val TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.cleanup_job_runs
  SET completed_at = now(),
      locked_by = NULL
  WHERE job_name = job_name_val
    AND locked_by = worker_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Audit Log Telemetry helper
CREATE OR REPLACE FUNCTION public.log_cleanup_telemetry(job_name_val TEXT, deleted_count_val INTEGER, duration_ms_val INTEGER, metadata_val JSONB DEFAULT '{}'::jsonb)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.audit_log (entity_type, entity_id, action, performed_by, metadata)
  VALUES (
    'cleanup_job',
    NULL,
    job_name_val || ':completed',
    '00000000-0000-0000-0000-000000000000'::uuid, -- System user placeholder or null
    jsonb_build_object(
      'job_name', job_name_val,
      'deleted_count', deleted_count_val,
      'duration_ms', duration_ms_val,
      'run_at', now()
    ) || metadata_val
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Split Cleanup Procedures

-- PROCEDURE: cleanup_sessions
CREATE OR REPLACE PROCEDURE public.cleanup_sessions(worker_val TEXT, OUT deleted_count INTEGER)
AS $$
DECLARE
  start_time TIMESTAMPTZ := now();
  duration_ms INTEGER;
BEGIN
  deleted_count := 0;
  IF public.claim_cleanup_lock('cleanup_sessions', worker_val) THEN
    -- Delete revoked or expired sessions older than 7 days
    DELETE FROM public.user_sessions
    WHERE (expires_at < now() OR revoked_at IS NOT NULL)
      AND last_active_at < now() - interval '7 days';
      
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    PERFORM public.release_cleanup_lock('cleanup_sessions', worker_val);
    
    duration_ms := extract(epoch from (now() - start_time)) * 1000;
    PERFORM public.log_cleanup_telemetry('cleanup_sessions', deleted_count, duration_ms);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- PROCEDURE: cleanup_exports
CREATE OR REPLACE PROCEDURE public.cleanup_exports(worker_val TEXT, OUT deleted_count INTEGER)
AS $$
DECLARE
  start_time TIMESTAMPTZ := now();
  duration_ms INTEGER;
BEGIN
  deleted_count := 0;
  IF public.claim_cleanup_lock('cleanup_exports', worker_val) THEN
    -- Delete export jobs older than 7 days
    DELETE FROM public.export_jobs
    WHERE created_at < now() - interval '7 days';
      
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    PERFORM public.release_cleanup_lock('cleanup_exports', worker_val);
    
    duration_ms := extract(epoch from (now() - start_time)) * 1000;
    PERFORM public.log_cleanup_telemetry('cleanup_exports', deleted_count, duration_ms);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- PROCEDURE: cleanup_notifications
CREATE OR REPLACE PROCEDURE public.cleanup_notifications(worker_val TEXT, OUT deleted_count INTEGER)
AS $$
DECLARE
  start_time TIMESTAMPTZ := now();
  duration_ms INTEGER;
BEGIN
  deleted_count := 0;
  IF public.claim_cleanup_lock('cleanup_notifications', worker_val) THEN
    -- Delete notification jobs older than 7 days
    DELETE FROM public.notification_jobs
    WHERE expires_at < now()
      AND created_at < now() - interval '7 days';
      
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    PERFORM public.release_cleanup_lock('cleanup_notifications', worker_val);
    
    duration_ms := extract(epoch from (now() - start_time)) * 1000;
    PERFORM public.log_cleanup_telemetry('cleanup_notifications', deleted_count, duration_ms);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- PROCEDURE: cleanup_idempotency
CREATE OR REPLACE PROCEDURE public.cleanup_idempotency(worker_val TEXT, OUT deleted_count INTEGER)
AS $$
DECLARE
  start_time TIMESTAMPTZ := now();
  duration_ms INTEGER;
BEGIN
  deleted_count := 0;
  IF public.claim_cleanup_lock('cleanup_idempotency', worker_val) THEN
    -- Clean up expired idempotency keys
    DELETE FROM public.idempotency_keys
    WHERE expires_at < now();
      
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    PERFORM public.release_cleanup_lock('cleanup_idempotency', worker_val);
    
    duration_ms := extract(epoch from (now() - start_time)) * 1000;
    PERFORM public.log_cleanup_telemetry('cleanup_idempotency', deleted_count, duration_ms);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- PROCEDURE: cleanup_storage (marks items in db for edge function storage deletion)
CREATE OR REPLACE PROCEDURE public.cleanup_storage(worker_val TEXT, OUT deleted_count INTEGER)
AS $$
DECLARE
  start_time TIMESTAMPTZ := now();
  duration_ms INTEGER;
BEGIN
  deleted_count := 0;
  IF public.claim_cleanup_lock('cleanup_storage', worker_val) THEN
    -- Purge database quarantine records that are older than 7 days and not restored
    UPDATE public.storage_quarantine
    SET status = 'deleted'
    WHERE status = 'quarantined'
      AND expires_at < now();
      
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    PERFORM public.release_cleanup_lock('cleanup_storage', worker_val);
    
    duration_ms := extract(epoch from (now() - start_time)) * 1000;
    PERFORM public.log_cleanup_telemetry('cleanup_storage', deleted_count, duration_ms);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 9. Daily Scheduled cron job updates using pg_cron (if available)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove the old single cleanup cron job
    PERFORM cron.unschedule('cleanup_idempotency_keys');
    
    -- Schedule modular split cron jobs
    PERFORM cron.schedule('cleanup_sessions_job', '0 1 * * *', 'CALL public.cleanup_sessions(''cron_worker'', NULL);');
    PERFORM cron.schedule('cleanup_exports_job', '15 1 * * *', 'CALL public.cleanup_exports(''cron_worker'', NULL);');
    PERFORM cron.schedule('cleanup_notifications_job', '30 1 * * *', 'CALL public.cleanup_notifications(''cron_worker'', NULL);');
    PERFORM cron.schedule('cleanup_idempotency_job', '45 1 * * *', 'CALL public.cleanup_idempotency(''cron_worker'', NULL);');
    PERFORM cron.schedule('cleanup_storage_job', '0 2 * * *', 'CALL public.cleanup_storage(''cron_worker'', NULL);');
    
    RAISE NOTICE 'Scheduled modular cleanup cron jobs successfully.';
  ELSE
    RAISE NOTICE 'pg_cron extension not found. Modular cron jobs were not registered.';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Failed to configure cron jobs: %', SQLERRM;
END;
$$;
