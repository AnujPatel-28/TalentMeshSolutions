-- FEATURE 07: Allow 'admin' role in profiles_role_check constraint
-- Run this in InsForge SQL Editor

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role = ANY (ARRAY['candidate'::text, 'recruiter'::text, 'admin'::text, 'super_admin'::text, 'company_admin'::text, 'hr'::text]));
