-- Migration 010: Schema Repair, Audit Table Rename, Notifications Table, and updated_at Triggers
-- Run this in InsForge SQL Editor

-- 1. Fix Profiles and Candidate Profiles RLS Policies (Repair user_id -> id drift)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS profiles_self ON public.profiles;

CREATE POLICY profiles_self ON public.profiles
FOR ALL USING (id = auth.uid()) WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS candidate_profiles_self ON public.candidate_profiles;
DROP POLICY IF EXISTS candidate_profiles_update ON public.candidate_profiles;
DROP POLICY IF EXISTS candidate_profiles_insert ON public.candidate_profiles;

CREATE POLICY candidate_profiles_self ON public.candidate_profiles
FOR SELECT USING (id = auth.uid());

CREATE POLICY candidate_profiles_update ON public.candidate_profiles
FOR UPDATE USING (id = auth.uid());

CREATE POLICY candidate_profiles_insert ON public.candidate_profiles
FOR INSERT WITH CHECK (id = auth.uid());

-- 2. Audit Table Standardization (audit_logs -> audit_log)
DROP TABLE IF EXISTS public.audit_log CASCADE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'audit_logs'
  ) THEN
    ALTER TABLE public.audit_logs RENAME TO audit_log;
  ELSE
    CREATE TABLE public.audit_log (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      table_name TEXT,
      record_id TEXT,
      old_data JSONB,
      new_data JSONB,
      metadata JSONB,
      ip_address TEXT,
      user_agent TEXT,
      status TEXT DEFAULT 'success',
      created_at TIMESTAMPTZ DEFAULT now()
    );
  END IF;
END $$;

-- Ensure audit_log RLS is enabled and has standard columns
ALTER TABLE IF EXISTS public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'success';

DROP POLICY IF EXISTS admin_bypass ON public.audit_log;
CREATE POLICY admin_bypass ON public.audit_log TO project_admin USING (true) WITH CHECK (true);

-- 3. Create Notifications Table (if not exists)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_bypass ON public.notifications;
CREATE POLICY admin_bypass ON public.notifications TO project_admin USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS notifications_self_read ON public.notifications;
CREATE POLICY notifications_self_read ON public.notifications FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS notifications_self_update ON public.notifications;
CREATE POLICY notifications_self_update ON public.notifications FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 4. Add Missing Columns to Applications Table
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS apply_type TEXT DEFAULT 'quick' CHECK (apply_type IN ('quick', 'manual'));
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS screening_answers JSONB;

-- 5. Reusable updated_at Trigger Function
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Attach BEFORE UPDATE triggers to tables
-- profiles
DROP TRIGGER IF EXISTS trigger_set_updated_at ON public.profiles;
CREATE TRIGGER trigger_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- candidate_profiles
DROP TRIGGER IF EXISTS trigger_set_updated_at ON public.candidate_profiles;
CREATE TRIGGER trigger_set_updated_at
  BEFORE UPDATE ON public.candidate_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- jobs
DROP TRIGGER IF EXISTS trigger_set_updated_at ON public.jobs;
CREATE TRIGGER trigger_set_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- applications
DROP TRIGGER IF EXISTS trigger_set_updated_at ON public.applications;
CREATE TRIGGER trigger_set_updated_at
  BEFORE UPDATE ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- candidate_resumes
DROP TRIGGER IF EXISTS trigger_set_updated_at ON public.candidate_resumes;
CREATE TRIGGER trigger_set_updated_at
  BEFORE UPDATE ON public.candidate_resumes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- notifications
DROP TRIGGER IF EXISTS trigger_set_updated_at ON public.notifications;
CREATE TRIGGER trigger_set_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- company_profiles
DROP TRIGGER IF EXISTS trigger_set_updated_at ON public.company_profiles;
CREATE TRIGGER trigger_set_updated_at
  BEFORE UPDATE ON public.company_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- recruiter_profiles
DROP TRIGGER IF EXISTS trigger_set_updated_at ON public.recruiter_profiles;
CREATE TRIGGER trigger_set_updated_at
  BEFORE UPDATE ON public.recruiter_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();
