-- SQL Migration: 014_notification_queue
-- Creates notification schema with safe templates, jobs leasing, user receipts, user preferences, and a non-throwing throttle trigger.

-- 1. Notification Templates Table
CREATE TABLE IF NOT EXISTS public.notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    channels TEXT[] DEFAULT ARRAY['in_app', 'email']::TEXT[],
    title_template TEXT NOT NULL,
    body_template TEXT NOT NULL,
    allowed_variables TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Notification Jobs Table
CREATE TABLE IF NOT EXISTS public.notification_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    template_id UUID REFERENCES public.notification_templates(id) ON DELETE SET NULL,
    channel TEXT NOT NULL CHECK (channel IN ('in_app', 'email', 'push')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'sent', 'delivered', 'failed', 'expired', 'throttled')),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('critical', 'high', 'normal', 'low')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb,
    dedupe_key TEXT UNIQUE,
    retry_count INTEGER DEFAULT 0,
    last_error TEXT,
    locked_at TIMESTAMPTZ,
    locked_by TEXT,
    lease_expires_at TIMESTAMPTZ,
    heartbeat_at TIMESTAMPTZ,
    next_attempt_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Notification Receipts Table
CREATE TABLE IF NOT EXISTS public.notification_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_job_id UUID REFERENCES public.notification_jobs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    dismissed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Notification Events Table (System Lifecycle Only)
CREATE TABLE IF NOT EXISTS public.notification_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.notification_jobs(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('queued', 'sent', 'delivered', 'failed', 'retry', 'throttled')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. User Notification Preferences Table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    email_enabled BOOLEAN DEFAULT true,
    push_enabled BOOLEAN DEFAULT true,
    digest_enabled BOOLEAN DEFAULT false,
    quiet_hours JSONB DEFAULT '{"enabled": false, "start": "22:00", "end": "08:00"}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS templates_select_all ON public.notification_templates;
DROP POLICY IF EXISTS templates_write_admin ON public.notification_templates;
DROP POLICY IF EXISTS jobs_select_recipient ON public.notification_jobs;
DROP POLICY IF EXISTS jobs_all_admin ON public.notification_jobs;
DROP POLICY IF EXISTS receipts_select_update_recipient ON public.notification_receipts;
DROP POLICY IF EXISTS receipts_all_admin ON public.notification_receipts;
DROP POLICY IF EXISTS events_select_recipient ON public.notification_events;
DROP POLICY IF EXISTS events_all_admin ON public.notification_events;
DROP POLICY IF EXISTS prefs_select_update_recipient ON public.notification_preferences;
DROP POLICY IF EXISTS prefs_all_admin ON public.notification_preferences;

-- RLS Policies Definition
CREATE POLICY templates_select_all ON public.notification_templates
    FOR SELECT USING (true);

CREATE POLICY templates_write_admin ON public.notification_templates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND (p.role = 'admin' OR p.role = 'super_admin')
        )
    );

CREATE POLICY jobs_select_recipient ON public.notification_jobs
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY jobs_all_admin ON public.notification_jobs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND (p.role = 'admin' OR p.role = 'super_admin')
        )
    );

CREATE POLICY receipts_select_update_recipient ON public.notification_receipts
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY receipts_all_admin ON public.notification_receipts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND (p.role = 'admin' OR p.role = 'super_admin')
        )
    );

CREATE POLICY events_select_recipient ON public.notification_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.notification_jobs j
            WHERE j.id = job_id AND j.user_id = auth.uid()
        )
    );

CREATE POLICY events_all_admin ON public.notification_events
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND (p.role = 'admin' OR p.role = 'super_admin')
        )
    );

CREATE POLICY prefs_select_update_recipient ON public.notification_preferences
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY prefs_all_admin ON public.notification_preferences
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND (p.role = 'admin' OR p.role = 'super_admin')
        )
    );

-- 6. Trigger Function for Throttling (Non-throwing, status-based)
CREATE OR REPLACE FUNCTION check_notification_throttle()
RETURNS TRIGGER AS $$
DECLARE
  recent_count INTEGER;
BEGIN
  -- Count notifications for this user in the last minute (excluding failed or throttled)
  SELECT COUNT(*) INTO recent_count
  FROM public.notification_jobs
  WHERE user_id = NEW.user_id
    AND created_at > now() - INTERVAL '1 minute'
    AND status IN ('pending', 'queued', 'sent', 'delivered');

  IF recent_count >= 5 THEN
    NEW.status := 'throttled';
    NEW.next_attempt_at := now() + INTERVAL '1 minute';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS notification_jobs_throttle_trigger ON public.notification_jobs;
CREATE TRIGGER notification_jobs_throttle_trigger
BEFORE INSERT ON public.notification_jobs
FOR EACH ROW
EXECUTE FUNCTION check_notification_throttle();

-- 7. Add automatic profile prefs creation trigger
CREATE OR REPLACE FUNCTION handle_new_profile_prefs()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_profile_created_prefs ON public.profiles;
CREATE TRIGGER on_profile_created_prefs
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION handle_new_profile_prefs();

-- Seed some preferences for existing users
INSERT INTO public.notification_preferences (user_id)
SELECT id FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

-- Seed default templates
INSERT INTO public.notification_templates (key, channels, title_template, body_template, allowed_variables)
VALUES 
  ('application_update', ARRAY['in_app', 'email']::TEXT[], 'Application Status Update: {{job}}', 'Hello {{candidate}}, your application status for {{job}} at {{company}} has been updated to {{status}}.', ARRAY['candidate', 'job', 'company', 'status']::TEXT[]),
  ('interview_scheduled', ARRAY['in_app', 'email']::TEXT[], 'Interview Scheduled: {{job}}', 'Hello {{candidate}}, your interview for {{job}} has been scheduled at {{time}}.', ARRAY['candidate', 'job', 'time']::TEXT[]),
  ('security_alert', ARRAY['in_app']::TEXT[], 'Security Notice: New Login', 'We detected a new login on your account from IP {{ip_address}}.', ARRAY['ip_address']::TEXT[]),
  ('export_ready', ARRAY['in_app']::TEXT[], 'Export Completed: {{export_type}}', 'Your CSV export for {{export_type}} is ready for download.', ARRAY['export_type']::TEXT[]),
  ('test_notification', ARRAY['in_app']::TEXT[], 'Test Notification', 'This is a test notification containing variable {{test_val}}.', ARRAY['test_val']::TEXT[])
ON CONFLICT (key) DO UPDATE SET 
  title_template = EXCLUDED.title_template,
  body_template = EXCLUDED.body_template,
  allowed_variables = EXCLUDED.allowed_variables;

-- 8. Worker Leasing: Claim Notification Job atomic RPC
CREATE OR REPLACE FUNCTION public.claim_notification_job(worker_id TEXT, lease_duration INTERVAL)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    template_id UUID,
    channel TEXT,
    status TEXT,
    priority TEXT,
    title TEXT,
    message TEXT,
    payload JSONB,
    dedupe_key TEXT,
    retry_count INTEGER,
    last_error TEXT
) AS $$
DECLARE
  claimed_id UUID;
BEGIN
  -- Find the highest priority pending, expired-lease running, or next-attempt due throttled/failed job
  SELECT j.id INTO claimed_id
  FROM public.notification_jobs j
  WHERE (
      -- Pending jobs
      j.status = 'pending'
      -- Stuck running jobs with expired leases
      OR (j.status = 'queued' AND (j.lease_expires_at IS NULL OR j.lease_expires_at < now()))
      -- Throttled jobs that are ready for retry
      OR (j.status = 'throttled' AND j.next_attempt_at <= now())
      -- Failed jobs that are ready for retry
      OR (j.status = 'failed' AND j.retry_count < 3 AND j.next_attempt_at <= now())
    )
    AND j.expires_at > now()
  ORDER BY 
    CASE j.priority
      WHEN 'critical' THEN 1
      WHEN 'high' THEN 2
      WHEN 'normal' THEN 3
      WHEN 'low' THEN 4
      ELSE 5
    END ASC,
    j.created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF claimed_id IS NOT NULL THEN
    UPDATE public.notification_jobs j
    SET status = 'queued',
        locked_by = worker_id,
        locked_at = now(),
        heartbeat_at = now(),
        lease_expires_at = now() + lease_duration,
        updated_at = now()
    WHERE j.id = claimed_id;

    RETURN QUERY
    SELECT 
      j.id,
      j.user_id,
      j.template_id,
      j.channel,
      j.status,
      j.priority,
      j.title,
      j.message,
      j.payload,
      j.dedupe_key,
      j.retry_count,
      j.last_error
    FROM public.notification_jobs j
    WHERE j.id = claimed_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

