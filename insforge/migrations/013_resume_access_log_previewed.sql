-- Migration 013: Add 'previewed' to resume_access_log access_type check constraint
-- Run this in InsForge database

ALTER TABLE public.resume_access_log DROP CONSTRAINT IF EXISTS resume_access_log_access_type_check;
ALTER TABLE public.resume_access_log ADD CONSTRAINT resume_access_log_access_type_check CHECK (access_type IN ('viewed', 'downloaded', 'unlocked', 'previewed'));
