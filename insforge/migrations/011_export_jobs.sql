-- ============================================================
-- Migration 011: Create export_jobs, export_job_items, and idempotency_keys
-- ============================================================

-- 1. Create or update export_jobs table
CREATE TABLE IF NOT EXISTS public.export_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, running, completed, failed, expired
  type TEXT NOT NULL,                     -- candidates, recruiters
  filters JSONB DEFAULT '{}'::jsonb,
  download_url TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  locked_by TEXT,
  locked_at TIMESTAMPTZ,
  progress_percent INTEGER DEFAULT 0,
  processed_count INTEGER DEFAULT 0,
  total_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Safely add new columns to export_jobs if table already exists
ALTER TABLE public.export_jobs ADD COLUMN IF NOT EXISTS progress_percent INTEGER DEFAULT 0;
ALTER TABLE public.export_jobs ADD COLUMN IF NOT EXISTS processed_count INTEGER DEFAULT 0;
ALTER TABLE public.export_jobs ADD COLUMN IF NOT EXISTS total_count INTEGER DEFAULT 0;

-- Drop old export_candidates if exists
DROP TABLE IF EXISTS public.export_candidates CASCADE;

-- 2. Create export_job_items table
CREATE TABLE IF NOT EXISTS public.export_job_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.export_jobs(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL, -- candidate, recruiter, report
  entity_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create idempotency_keys table
CREATE TABLE IF NOT EXISTS public.idempotency_keys (
  key TEXT PRIMARY KEY,
  status INTEGER NOT NULL,
  response_hash TEXT NOT NULL,
  response_ref UUID NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '24 hours')
);

-- Enable RLS
ALTER TABLE public.export_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_job_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;

-- 1. Policies for export_jobs
DROP POLICY IF EXISTS "Users can view own export jobs" ON public.export_jobs;
CREATE POLICY "Users can view own export jobs" ON public.export_jobs FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own export jobs" ON public.export_jobs;
CREATE POLICY "Users can insert own export jobs" ON public.export_jobs FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own export jobs" ON public.export_jobs;
CREATE POLICY "Users can update own export jobs" ON public.export_jobs FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can do everything on export jobs" ON public.export_jobs;
CREATE POLICY "Admins can do everything on export jobs" ON public.export_jobs TO project_admin USING (true) WITH CHECK (true);

-- 2. Policies for export_job_items
DROP POLICY IF EXISTS "Users can view own export items" ON public.export_job_items;
CREATE POLICY "Users can view own export items" ON public.export_job_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.export_jobs WHERE id = job_id AND user_id = auth.uid())
);

DROP POLICY IF EXISTS "Admins can do everything on export items" ON public.export_job_items;
CREATE POLICY "Admins can do everything on export items" ON public.export_job_items TO project_admin USING (true) WITH CHECK (true);

-- 3. Policies for idempotency_keys
DROP POLICY IF EXISTS "Admins can do everything on idempotency keys" ON public.idempotency_keys;
CREATE POLICY "Admins can do everything on idempotency keys" ON public.idempotency_keys TO project_admin USING (true) WITH CHECK (true);

-- Storage bucket for export candidates
INSERT INTO storage.buckets (id, name, public)
VALUES ('export-candidates', 'export-candidates', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for export candidates
DROP POLICY IF EXISTS "Public Select export-candidates" ON storage.objects;
CREATE POLICY "Public Select export-candidates" ON storage.objects FOR SELECT TO public USING (bucket_id = 'export-candidates');

DROP POLICY IF EXISTS "Admin All export-candidates" ON storage.objects;
CREATE POLICY "Admin All export-candidates" ON storage.objects FOR ALL TO project_admin USING (bucket_id = 'export-candidates') WITH CHECK (bucket_id = 'export-candidates');
