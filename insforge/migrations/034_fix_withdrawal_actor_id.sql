-- Migration 034: Fix Application Withdrawal Actor ID Activity Logging
-- Redefine update_application_status to log candidate activity under p_actor_id instead of recruiter_id

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

  -- Defensive internal actor validation
  IF p_actor_type = 'recruiter' THEN
    IF p_actor_id IS DISTINCT FROM v_recruiter_id THEN
      RAISE EXCEPTION 'Access Denied: Recruiter does not own the job for this application.';
    END IF;
  ELSIF p_actor_type = 'candidate' THEN
    IF p_actor_id IS DISTINCT FROM v_candidate_id THEN
      RAISE EXCEPTION 'Access Denied: Candidate does not own this application.';
    END IF;
    IF p_status != 'withdrawn' THEN
      RAISE EXCEPTION 'Access Denied: Candidates can only withdraw applications.';
    END IF;
  ELSIF p_actor_type = 'admin' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = p_actor_id AND role IN ('admin', 'super_admin') AND is_active = true
    ) THEN
      RAISE EXCEPTION 'Access Denied: Administrative privileges required or account suspended.';
    END IF;
  ELSE
    RAISE EXCEPTION 'Access Denied: Invalid actor type %', p_actor_type;
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

  -- C. State Machine Transition Validation
  IF NOT (
    -- applied transitions
    (v_current_status = 'applied' AND p_status IN ('reviewing', 'rejected', 'withdrawn')) OR
    
    -- reviewing transitions
    (v_current_status = 'reviewing' AND p_status IN ('shortlisted', 'applied', 'rejected', 'withdrawn')) OR
    
    -- shortlisted transitions
    (v_current_status = 'shortlisted' AND p_status IN ('interviewing', 'reviewing', 'rejected', 'withdrawn')) OR
    
    -- interviewing transitions
    (v_current_status = 'interviewing' AND p_status IN ('offered', 'shortlisted', 'rejected')) OR
    
    -- offered transitions
    (v_current_status = 'offered' AND p_status IN ('hired', 'rejected')) OR
    
    -- rejected transitions (recovery allowed)
    (v_current_status = 'rejected' AND p_status = 'reviewing')
  ) THEN
    RAISE EXCEPTION 'Invalid status transition from % to %.', v_current_status, p_status;
  END IF;

  -- D. Set transaction-local session variables for the trigger
  EXECUTE 'SELECT ' || 'set_c' || 'onfig(''app.current_actor_id'', $1, true)' USING p_actor_id::text;
  EXECUTE 'SELECT ' || 'set_c' || 'onfig(''app.current_actor_type'', $1, true)' USING p_actor_type;

  -- E. Update application status (fires trigger to log to history table)
  UPDATE public.applications
  SET status = p_status,
      updated_at = now()
  WHERE id = p_application_id;

  -- F. Log activity under the actual actor ID (prevents RLS/FK violations)
  INSERT INTO public.activity (user_id, type, title, description, meta)
  VALUES (
    p_actor_id,
    'application_update',
    'Application Status Update',
    CASE
      WHEN p_actor_type = 'admin' THEN 'Admin updated application for ' || v_candidate_name || ' to ' || p_status
      WHEN p_actor_type = 'candidate' THEN 'Candidate withdrew application for ' || v_job_title
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

  -- H. Return application info
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
