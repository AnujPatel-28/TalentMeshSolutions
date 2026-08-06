-- ============================================================
-- SQL Fix: NVite RLS Policies for Candidates and Recruiters
-- Run this script in the InsForge SQL Editor
-- ============================================================

-- 1. Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS nvites_insert_recruiter ON public.nvites;
DROP POLICY IF EXISTS nvites_select_candidate ON public.nvites;
DROP POLICY IF EXISTS nvites_select_recruiter ON public.nvites;
DROP POLICY IF EXISTS nvites_update_candidate ON public.nvites;
DROP POLICY IF EXISTS nvites_update_recruiter ON public.nvites;
DROP POLICY IF EXISTS admin_bypass ON public.nvites;

-- 2. Ensure Row Level Security is active
ALTER TABLE public.nvites ENABLE ROW LEVEL SECURITY;

-- 3. SELECT Policies
-- Candidates can view invitations sent to them
CREATE POLICY nvites_select_candidate ON public.nvites
    FOR SELECT
    USING (candidate_id = auth.uid());

-- Recruiters can view invitations they created
CREATE POLICY nvites_select_recruiter ON public.nvites
    FOR SELECT
    USING (recruiter_id = auth.uid());

-- 4. INSERT Policies
-- Recruiters can insert/create new invitations
CREATE POLICY nvites_insert_recruiter ON public.nvites
    FOR INSERT
    WITH CHECK (recruiter_id = auth.uid());

-- 5. UPDATE Policies
-- Candidates can update invitations (e.g., set status to read, accepted, declined)
CREATE POLICY nvites_update_candidate ON public.nvites
    FOR UPDATE
    USING (candidate_id = auth.uid())
    WITH CHECK (candidate_id = auth.uid());

-- Recruiters can update invitations they created (e.g., cancel/retract)
CREATE POLICY nvites_update_recruiter ON public.nvites
    FOR UPDATE
    USING (recruiter_id = auth.uid())
    WITH CHECK (recruiter_id = auth.uid());

-- 6. Admin Bypass Policy
-- Allows the service key / project admin role full bypass access
CREATE POLICY admin_bypass ON public.nvites
    TO project_admin
    USING (true)
    WITH CHECK (true);
