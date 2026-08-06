-- Migration 012: Data Backfill for Resumes and Applications
-- Run this in InsForge SQL Editor

-- 1. Backfill primary_resume_id in candidate_profiles
UPDATE public.candidate_profiles cp
SET primary_resume_id = (
  SELECT id FROM public.candidate_resumes cr
  WHERE cr.candidate_id = cp.id
  ORDER BY cr.is_default DESC, cr.created_at DESC
  LIMIT 1
)
WHERE cp.primary_resume_id IS NULL;

-- 2. Backfill applications.resume_snapshot_key from legacy applications.resume_url if exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'applications' AND column_name = 'resume_url'
  ) THEN
    UPDATE public.applications 
    SET resume_snapshot_key = resume_url 
    WHERE resume_snapshot_key IS NULL AND resume_url IS NOT NULL;
  END IF;
END $$;
