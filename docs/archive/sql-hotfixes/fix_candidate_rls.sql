-- ============================================================
-- CRITICAL FIX: Allow Recruiters to view Candidate Profiles
-- Run this in InsForge SQL Editor
-- ============================================================

-- Drop the old overly-restrictive policy if it exists
DROP POLICY IF EXISTS "candidate_profiles_self" ON public.candidate_profiles;

-- Allow candidates to update their own profile
CREATE POLICY "candidate_profiles_update" 
ON public.candidate_profiles FOR UPDATE 
USING (id = auth.uid());

-- Allow any authenticated user (including recruiters) to view candidate profiles
-- (This is required for recruiters to see candidate skills, resume_url, etc. in the Candidate Profile Drawer)
CREATE POLICY "candidate_profiles_read_all" 
ON public.candidate_profiles FOR SELECT 
USING (auth.role() = 'authenticated');

-- Ensure candidates can insert their own profile
CREATE POLICY "candidate_profiles_insert" 
ON public.candidate_profiles FOR INSERT 
WITH CHECK (id = auth.uid());

-- Done!
