-- FEATURE 08: Status History Tracking + update_application_status RPC
-- Run this in InsForge SQL Editor

-- 1. Create application_status_history table
CREATE TABLE IF NOT EXISTS public.application_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_type TEXT CHECK (actor_type IN ('candidate', 'recruiter', 'admin', 'system')),
  metadata JSONB DEFAULT '{}'::jsonb,
  note TEXT,
  changed_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_application_history_application
ON public.application_status_history(application_id);

CREATE INDEX IF NOT EXISTS idx_application_history_changed_at
ON public.application_status_history(changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_application_history_actor
ON public.application_status_history(changed_by);

-- Enable RLS
ALTER TABLE public.application_status_history ENABLE ROW LEVEL SECURITY;

-- Idempotent RLS Policies
DROP POLICY IF EXISTS admin_bypass ON public.application_status_history;
CREATE POLICY admin_bypass ON public.application_status_history TO project_admin USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS status_history_select_own ON public.application_status_history;
CREATE POLICY status_history_select_own ON public.application_status_history FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.applications a
    WHERE a.id = application_status_history.application_id
    AND a.candidate_id = auth.uid()
  )
);

DROP POLICY IF EXISTS status_history_select_recruiter ON public.application_status_history;
CREATE POLICY status_history_select_recruiter ON public.application_status_history FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.applications a
    JOIN public.jobs j ON j.id = a.job_id
    WHERE a.id = application_status_history.application_id
    AND j.recruiter_id = auth.uid()
  )
);

-- 2. Add Status Constraint on Applications Table
ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS applications_status_check;
ALTER TABLE public.applications ADD CONSTRAINT applications_status_check CHECK (
  status IN ('applied', 'reviewing', 'shortlisted', 'interviewing', 'offered', 'hired', 'rejected', 'withdrawn')
);

-- 3. Trigger Function for Status History Auto-logging
CREATE OR REPLACE FUNCTION public.log_application_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_actor_id UUID;
  v_actor_type TEXT;
BEGIN
  -- Attempt to read from transaction-local config variables, fallback to auth.uid()
  BEGIN
    v_actor_id := NULLIF(current_setting('app.current_actor_id', true), '')::UUID;
  EXCEPTION WHEN OTHERS THEN
    v_actor_id := NULL;
  END;

  BEGIN
    v_actor_type := NULLIF(current_setting('app.current_actor_type', true), '');
  EXCEPTION WHEN OTHERS THEN
    v_actor_type := NULL;
  END;

  IF v_actor_id IS NULL THEN
    BEGIN
      v_actor_id := auth.uid()::UUID;
    EXCEPTION WHEN OTHERS THEN
      v_actor_id := NULL;
    END;
  END IF;

  IF v_actor_type IS NULL THEN
    IF v_actor_id IS NOT NULL THEN
      -- Lookup profile role to set actor_type
      SELECT role INTO v_actor_type FROM public.profiles WHERE id = v_actor_id;
      IF v_actor_type IN ('admin', 'super_admin') THEN
        v_actor_type := 'admin';
      ELSIF v_actor_type = 'recruiter' THEN
        v_actor_type := 'recruiter';
      ELSE
        v_actor_type := 'candidate';
      END IF;
    ELSE
      v_actor_type := 'system';
    END IF;
  END IF;

  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.application_status_history (
      application_id, from_status, to_status, changed_by, actor_type, note
    ) VALUES (
      NEW.id, NULL, NEW.status, v_actor_id, v_actor_type, 'Application submitted'
    );
  ELSIF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.application_status_history (
      application_id, from_status, to_status, changed_by, actor_type, note
    ) VALUES (
      NEW.id, OLD.status, NEW.status, v_actor_id, v_actor_type, 
      CASE 
        WHEN NEW.status = 'withdrawn' THEN 'Application withdrawn by candidate'
        ELSE 'Status updated'
      END
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger definition
DROP TRIGGER IF EXISTS trigger_log_application_status_change ON public.applications;
CREATE TRIGGER trigger_log_application_status_change
  AFTER INSERT OR UPDATE OF status ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.log_application_status_change();

-- 4. Shared Application Status RPC Function
CREATE OR REPLACE FUNCTION public.update_application_status(
  p_application_id UUID,
  p_status TEXT,
  p_actor_id UUID,
  p_actor_type TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB AS $$
DECLARE
  v_application JSONB;
  v_current_status TEXT;
  v_job_title TEXT;
  v_recruiter_id UUID;
  v_candidate_id UUID;
  v_candidate_name TEXT;
  v_candidate_email TEXT;
BEGIN
  -- A. Fetch details and current status
  SELECT a.status, a.candidate_id, j.title, j.recruiter_id, p.name, p.email
  INTO v_current_status, v_candidate_id, v_job_title, v_recruiter_id, v_candidate_name, v_candidate_email
  FROM public.applications a
  JOIN public.jobs j ON j.id = a.job_id
  JOIN public.profiles p ON p.id = a.candidate_id
  WHERE a.id = p_application_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  -- B. Prevent No-Op Updates
  IF v_current_status = p_status THEN
    RETURN jsonb_build_object(
      'success', true,
      'no_op', true,
      'application', jsonb_build_object(
        'id', p_application_id,
        'status', p_status,
        'candidate_name', v_candidate_name,
        'candidate_email', v_candidate_email,
        'job_title', v_job_title
      )
    );
  END IF;

  -- C. Block Invalid Transitions (e.g. from withdrawn)
  IF v_current_status = 'withdrawn' AND p_status <> 'withdrawn' THEN
    RAISE EXCEPTION 'Cannot update a withdrawn application.';
  END IF;

  -- D. Set transaction-local session variables for the trigger
  PERFORM set_config('app.current_actor_id', p_actor_id::text, true);
  PERFORM set_config('app.current_actor_type', p_actor_type, true);

  -- E. Update application status (fires trigger to log to history table)
  UPDATE public.applications
  SET status = p_status,
      updated_at = now()
  WHERE id = p_application_id;

  -- F. Log recruiter activity (fixed columns)
  INSERT INTO public.activity (user_id, type, title, description, meta)
  VALUES (
    COALESCE(v_recruiter_id, p_actor_id),
    'application_update',
    'Application Status Update',
    CASE
      WHEN p_actor_type = 'admin' THEN 'Admin updated application for ' || v_candidate_name || ' to ' || p_status
      ELSE 'Updated application for ' || v_candidate_name || ' to ' || p_status
    END,
    jsonb_build_object('application_id', p_application_id, 'status', p_status, 'actor_id', p_actor_id, 'actor_type', p_actor_type)::text
  );

  -- G. Log in-app notification for candidate
  INSERT INTO public.notifications (user_id, type, title, message, is_read, metadata)
  VALUES (
    v_candidate_id,
    'application_update',
    'Application Status Update',
    'Your application for "' || v_job_title || '" has been updated to: ' || p_status || '.',
    false,
    jsonb_build_object('application_id', p_application_id, 'status', p_status, 'job_title', v_job_title)
  );

  -- H. Return application info for email sending in edge function
  SELECT jsonb_build_object(
    'id', p_application_id,
    'status', p_status,
    'candidate_name', v_candidate_name,
    'candidate_email', v_candidate_email,
    'job_title', v_job_title
  ) INTO v_application;

  RETURN jsonb_build_object(
    'success', true,
    'no_op', false,
    'application', v_application
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Backfill existing applications
INSERT INTO public.application_status_history (application_id, from_status, to_status, changed_at, actor_type, note)
SELECT id, NULL, status, applied_at, 'candidate', 'Backfilled status history'
FROM public.applications a
WHERE NOT EXISTS (
  SELECT 1 FROM public.application_status_history h WHERE h.application_id = a.id
);
