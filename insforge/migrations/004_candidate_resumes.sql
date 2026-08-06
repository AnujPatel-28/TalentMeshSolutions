-- Migration 004: Create candidate_resumes table and policies
-- Run this script in the InsForge SQL Editor to enable resume uploads and management.

-- 1. Create candidate_resumes table
CREATE TABLE IF NOT EXISTS public.candidate_resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size_bytes BIGINT,
  is_default BOOLEAN DEFAULT false,
  upload_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.candidate_resumes ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies
-- Admin Bypass Policy
DROP POLICY IF EXISTS admin_bypass ON public.candidate_resumes;
CREATE POLICY admin_bypass ON public.candidate_resumes TO project_admin USING (true) WITH CHECK (true);

-- Select Policy: Candidates can view their own resumes, and recruiters/admins can view them if needed (read-only)
DROP POLICY IF EXISTS candidate_resumes_select ON public.candidate_resumes;
CREATE POLICY candidate_resumes_select ON public.candidate_resumes FOR SELECT USING (
  candidate_id = auth.uid() OR auth.role() = 'authenticated'
);

-- Insert Policy: Candidates can insert their own resumes
DROP POLICY IF EXISTS candidate_resumes_insert ON public.candidate_resumes;
CREATE POLICY candidate_resumes_insert ON public.candidate_resumes FOR INSERT WITH CHECK (
  candidate_id = auth.uid()
);

-- Update Policy: Candidates can update their own resumes (e.g. toggle is_default or change label)
DROP POLICY IF EXISTS candidate_resumes_update ON public.candidate_resumes;
CREATE POLICY candidate_resumes_update ON public.candidate_resumes FOR UPDATE USING (
  candidate_id = auth.uid()
) WITH CHECK (
  candidate_id = auth.uid()
);

-- Delete Policy: Candidates can delete their own resumes
DROP POLICY IF EXISTS candidate_resumes_delete ON public.candidate_resumes;
CREATE POLICY candidate_resumes_delete ON public.candidate_resumes FOR DELETE USING (
  candidate_id = auth.uid()
);

-- 4. Enable RPC exec_sql helper function for future programmatic admin debug scripts (if not exists)
CREATE OR REPLACE FUNCTION public.exec_sql(query text)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  EXECUTE query;
  RETURN '{"success": true}'::jsonb;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
