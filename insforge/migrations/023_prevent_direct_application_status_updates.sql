-- Migration 023: Prevent Direct Application Status Updates
-- Run this in InsForge SQL Editor

CREATE OR REPLACE FUNCTION public.check_direct_application_status_update()
RETURNS TRIGGER AS $$
DECLARE
  v_actor_id TEXT;
  v_actor_type TEXT;
BEGIN
  -- Block direct updates to the status column unless called via update_application_status RPC
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    BEGIN
      v_actor_id := NULLIF(current_setting('app.current_actor_id', true), '');
    EXCEPTION WHEN OTHERS THEN
      v_actor_id := NULL;
    END;

    BEGIN
      v_actor_type := NULLIF(current_setting('app.current_actor_type', true), '');
    EXCEPTION WHEN OTHERS THEN
      v_actor_type := NULL;
    END;

    IF v_actor_id IS NULL OR v_actor_type IS NULL THEN
      RAISE EXCEPTION 'Direct updates to application status are blocked. Use the update_application_status RPC.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_direct_application_status_update ON public.applications;
CREATE TRIGGER trigger_check_direct_application_status_update
  BEFORE UPDATE OF status ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.check_direct_application_status_update();
