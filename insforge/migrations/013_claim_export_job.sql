-- ============================================================
-- Migration 013: Create claim_export_job RPC function
-- ============================================================

CREATE OR REPLACE FUNCTION public.claim_export_job(job_id UUID, worker_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  claimed BOOLEAN := FALSE;
BEGIN
  UPDATE public.export_jobs
  SET status = 'running',
      locked_by = worker_id,
      locked_at = now(),
      started_at = now()
  WHERE id = job_id
    AND (status = 'pending' OR (status = 'running' AND locked_at < now() - INTERVAL '10 minutes'))
    AND (user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    ));

  IF FOUND THEN
    claimed := TRUE;
  END IF;

  RETURN claimed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
