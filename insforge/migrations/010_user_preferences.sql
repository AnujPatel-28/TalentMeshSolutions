-- ============================================================
-- Migration: Create user_preferences table and RLS policies
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  sidebar_preferences JSONB DEFAULT '{"version": 1, "collapsed": false, "width": 280}'::jsonb,
  dashboard_preferences JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure RLS is enabled
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Auto-update timestamp function and trigger
CREATE OR REPLACE FUNCTION public.update_user_preferences_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER update_user_preferences_timestamp_trig
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_preferences_timestamp();

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own preferences" ON public.user_preferences;
CREATE POLICY "Users can view own preferences" 
  ON public.user_preferences FOR SELECT 
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own preferences" ON public.user_preferences;
CREATE POLICY "Users can update own preferences" 
  ON public.user_preferences FOR UPDATE 
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own preferences" ON public.user_preferences;
CREATE POLICY "Users can insert own preferences" 
  ON public.user_preferences FOR INSERT 
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all preferences" ON public.user_preferences;
CREATE POLICY "Admins can view all preferences" 
  ON public.user_preferences FOR SELECT 
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update all preferences" ON public.user_preferences;
CREATE POLICY "Admins can update all preferences" 
  ON public.user_preferences FOR UPDATE 
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert all preferences" ON public.user_preferences;
CREATE POLICY "Admins can insert all preferences" 
  ON public.user_preferences FOR INSERT 
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete all preferences" ON public.user_preferences;
CREATE POLICY "Admins can delete all preferences" 
  ON public.user_preferences FOR DELETE 
  USING (public.is_admin());

DROP POLICY IF EXISTS "admin_bypass" ON public.user_preferences;
CREATE POLICY "admin_bypass" ON public.user_preferences TO project_admin USING (true) WITH CHECK (true);
