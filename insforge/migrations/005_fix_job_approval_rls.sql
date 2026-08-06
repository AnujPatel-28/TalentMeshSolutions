-- ============================================================
-- SQL Migration: Enforce Admin Approval on Job Postings
-- Fixes recruiter bypass by separating approved/unapproved jobs 
-- update policies and enforcing is_approved = false on inserts.
-- ============================================================

-- Step 1: Drop old RLS policies for jobs table update/insert
DROP POLICY IF EXISTS "jobs_insert_own" ON public.jobs;
DROP POLICY IF EXISTS "jobs_update_own" ON public.jobs;
DROP POLICY IF EXISTS "jobs_update_unapproved" ON public.jobs;
DROP POLICY IF EXISTS "jobs_update_approved" ON public.jobs;

-- Step 2: Enforce is_approved = false on insert by recruiters
CREATE POLICY "jobs_insert_own" ON public.jobs
    FOR INSERT WITH CHECK (
        auth.uid() = recruiter_id 
        AND is_approved = false
    );

-- Step 3: Mutually exclusive update policies to prevent self-approval
-- recruiters can update unapproved jobs, but the updated state must remain unapproved.
CREATE POLICY "jobs_update_unapproved" ON public.jobs
    FOR UPDATE USING (
        auth.uid() = recruiter_id 
        AND is_approved = false
    ) WITH CHECK (
        auth.uid() = recruiter_id 
        AND is_approved = false
    );

-- recruiters can update approved jobs freely.
CREATE POLICY "jobs_update_approved" ON public.jobs
    FOR UPDATE USING (
        auth.uid() = recruiter_id 
        AND is_approved = true
    ) WITH CHECK (
        auth.uid() = recruiter_id
    );
