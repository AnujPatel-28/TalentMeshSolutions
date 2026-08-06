-- FEATURE 01: Complete Schema + Admin RLS Bypass
-- Run this in InsForge SQL Editor

-- 1. Create Tables IF NOT EXISTS
-- profiles.id = auth.users.id (NOT a random UUID)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT UNIQUE,
  role TEXT CHECK(role IN ('candidate','recruiter','admin','super_admin')) DEFAULT 'candidate',
  avatar_url TEXT,
  location TEXT,
  phone TEXT,
  bio TEXT,
  company_id UUID,
  is_active BOOLEAN DEFAULT true,
  mfa_enabled BOOLEAN DEFAULT false,
  completed_onboarding BOOLEAN DEFAULT false,
  onboarding_step INTEGER DEFAULT 0,
  password_set_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- candidate_profiles.id = auth.users.id (mirrors profiles)
CREATE TABLE IF NOT EXISTS candidate_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  headline TEXT,
  skills TEXT[],
  experience_years NUMERIC,
  education JSONB,
  work_history JSONB,
  resume_url TEXT,
  profile_strength INTEGER DEFAULT 0,
  linkedin_url TEXT,
  github_url TEXT,
  portfolio_url TEXT,
  salary_min NUMERIC,
  salary_max NUMERIC,
  currency TEXT DEFAULT 'INR',
  preferred_locations TEXT[],
  is_visible BOOLEAN DEFAULT true,
  job_types TEXT[],
  open_to_remote BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recruiter_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  company_name TEXT,
  industry TEXT,
  company_size TEXT,
  is_approved BOOLEAN DEFAULT false,
  website_url TEXT,
  linkedin_url TEXT,
  about TEXT,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','suspended')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS company_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id UUID REFERENCES profiles(id),
  name TEXT,
  logo_url TEXT,
  about TEXT,
  website TEXT,
  industry TEXT,
  gstin TEXT,
  tan TEXT,
  kyc_documents JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id UUID REFERENCES profiles(id),
  company_id UUID REFERENCES company_profiles(id),
  title TEXT,
  description TEXT,
  requirements TEXT[],
  skills_required TEXT[],
  location TEXT,
  type TEXT CHECK(type IN ('full-time','part-time','contract','remote','hybrid')),
  department TEXT,
  salary_min INTEGER,
  salary_max INTEGER,
  currency TEXT DEFAULT 'INR',
  experience_min INTEGER,
  experience_max INTEGER,
  status TEXT DEFAULT 'draft' CHECK(status IN ('active','paused','closed','draft')),
  is_approved BOOLEAN DEFAULT false,
  views_count INTEGER DEFAULT 0,
  applications_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id),
  candidate_id UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'applied' CHECK(status IN ('applied','reviewing','shortlisted','interviewing','offered','hired','rejected','withdrawn')),
  cover_letter TEXT,
  applied_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT,
  entity_id UUID,
  action TEXT,
  performed_by UUID REFERENCES profiles(id),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS job_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES profiles(id),
  alert_name TEXT,
  search_query_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nvites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id),
  candidate_id UUID REFERENCES profiles(id),
  recruiter_id UUID REFERENCES profiles(id),
  message TEXT CHECK(char_length(message) <= 500),
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','viewed','applied','ignored')),
  sent_at TIMESTAMPTZ DEFAULT now(),
  viewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id UUID REFERENCES profiles(id),
  plan TEXT,
  amount_inr INTEGER,
  status TEXT,
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS application_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES applications(id),
  event_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE recruiter_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE nvites ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_events ENABLE ROW LEVEL SECURITY;

-- 3. Admin RLS Bypass Policies
DROP POLICY IF EXISTS admin_bypass ON public.profiles;
CREATE POLICY admin_bypass ON profiles TO project_admin USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS admin_bypass ON public.candidate_profiles;
CREATE POLICY admin_bypass ON candidate_profiles TO project_admin USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS admin_bypass ON public.recruiter_profiles;
CREATE POLICY admin_bypass ON recruiter_profiles TO project_admin USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS admin_bypass ON public.company_profiles;
CREATE POLICY admin_bypass ON company_profiles TO project_admin USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS admin_bypass ON public.jobs;
CREATE POLICY admin_bypass ON jobs TO project_admin USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS admin_bypass ON public.applications;
CREATE POLICY admin_bypass ON applications TO project_admin USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS admin_bypass ON public.audit_log;
CREATE POLICY admin_bypass ON audit_log TO project_admin USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS admin_bypass ON public.job_alerts;
CREATE POLICY admin_bypass ON job_alerts TO project_admin USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS admin_bypass ON public.nvites;
CREATE POLICY admin_bypass ON nvites TO project_admin USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS admin_bypass ON public.subscription_events;
CREATE POLICY admin_bypass ON subscription_events TO project_admin USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS admin_bypass ON public.application_events;
CREATE POLICY admin_bypass ON application_events TO project_admin USING (true) WITH CHECK (true);

-- 4. Specific RLS Policies
-- Profiles
DROP POLICY IF EXISTS admin_bypass ON public.profiles;
DROP POLICY IF EXISTS profiles_self ON public.profiles;
CREATE POLICY profiles_self ON profiles FOR ALL USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Candidate Profiles
DROP POLICY IF EXISTS admin_bypass ON public.candidate_profiles;
DROP POLICY IF EXISTS candidate_profiles_self ON public.candidate_profiles;
DROP POLICY IF EXISTS candidate_profiles_update ON public.candidate_profiles;
CREATE POLICY candidate_profiles_self ON candidate_profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY candidate_profiles_update ON candidate_profiles FOR UPDATE USING (id = auth.uid());

-- NVites
DROP POLICY IF EXISTS nvites_insert_recruiter ON public.nvites;
DROP POLICY IF EXISTS nvites_select_candidate ON public.nvites;
CREATE POLICY nvites_insert_recruiter ON nvites FOR INSERT WITH CHECK (recruiter_id = auth.uid());
CREATE POLICY nvites_select_candidate ON nvites FOR SELECT USING (candidate_id = auth.uid());

-- Job Alerts
DROP POLICY IF EXISTS job_alerts_self ON public.job_alerts;
CREATE POLICY job_alerts_self ON job_alerts FOR ALL USING (candidate_id = auth.uid());

-- Applications
DROP POLICY IF EXISTS applications_self ON public.applications;
DROP POLICY IF EXISTS applications_insert_candidate ON public.applications;
CREATE POLICY applications_self ON applications FOR SELECT USING (candidate_id = auth.uid());
CREATE POLICY applications_insert_candidate ON applications FOR INSERT WITH CHECK (candidate_id = auth.uid());

-- Incorporate existing policies for jobs and applications
-- Jobs
DROP POLICY IF EXISTS "jobs_select_approved" ON public.jobs;
DROP POLICY IF EXISTS "jobs_select_own" ON public.jobs;
DROP POLICY IF EXISTS "jobs_insert_own" ON public.jobs;
DROP POLICY IF EXISTS "jobs_update_own" ON public.jobs;
DROP POLICY IF EXISTS "jobs_delete_own" ON public.jobs;
CREATE POLICY "jobs_select_approved" ON public.jobs FOR SELECT USING (status = 'active' AND is_approved = true);
CREATE POLICY "jobs_select_own" ON public.jobs FOR SELECT USING (auth.uid() = recruiter_id);
CREATE POLICY "jobs_insert_own" ON public.jobs FOR INSERT WITH CHECK (auth.uid() = recruiter_id);
CREATE POLICY "jobs_update_own" ON public.jobs FOR UPDATE USING (auth.uid() = recruiter_id);
CREATE POLICY "jobs_delete_own" ON public.jobs FOR DELETE USING (auth.uid() = recruiter_id);

-- Applications (additional)
DROP POLICY IF EXISTS "apps_select_own" ON public.applications;
DROP POLICY IF EXISTS "apps_insert_own" ON public.applications;
DROP POLICY IF EXISTS "apps_update_own" ON public.applications;
DROP POLICY IF EXISTS "apps_recruiter_view" ON public.applications;
DROP POLICY IF EXISTS "apps_recruiter_update" ON public.applications;
CREATE POLICY "apps_select_own" ON public.applications FOR SELECT USING (auth.uid() = candidate_id);
CREATE POLICY "apps_insert_own" ON public.applications FOR INSERT WITH CHECK (auth.uid() = candidate_id);
CREATE POLICY "apps_update_own" ON public.applications FOR UPDATE USING (auth.uid() = candidate_id);
CREATE POLICY "apps_recruiter_view" ON public.applications FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = applications.job_id AND j.recruiter_id = auth.uid())
);
CREATE POLICY "apps_recruiter_update" ON public.applications FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = applications.job_id AND j.recruiter_id = auth.uid())
);

-- AI Suggestion Cache (Disable RLS)
CREATE TABLE IF NOT EXISTS ai_suggestion_cache (
  query_key TEXT PRIMARY KEY,
  suggestions JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE ai_suggestion_cache DISABLE ROW LEVEL SECURITY;
