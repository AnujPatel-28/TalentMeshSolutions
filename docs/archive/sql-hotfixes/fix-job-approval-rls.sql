-- ============================================================
-- RUN THIS ENTIRE SCRIPT IN YOUR INSFORGE SQL EDITOR
-- Fixes: Recruiter bypassing admin approval for job postings.
-- ============================================================

-- 1. Drop existing insert/update policies on jobs
DROP POLICY IF EXISTS "jobs_insert_own" ON public.jobs;
DROP POLICY IF EXISTS "jobs_update_own" ON public.jobs;
DROP POLICY IF EXISTS "jobs_update_unapproved" ON public.jobs;
DROP POLICY IF EXISTS "jobs_update_approved" ON public.jobs;

-- 2. Prevent recruiters from setting is_approved = true on new job insertion
CREATE POLICY "jobs_insert_own" ON public.jobs
    FOR INSERT WITH CHECK (
        auth.uid() = recruiter_id 
        AND is_approved = false
    );

-- 3. Prevent recruiters from self-approving their pending jobs during update
CREATE POLICY "jobs_update_unapproved" ON public.jobs
    FOR UPDATE USING (
        auth.uid() = recruiter_id 
        AND is_approved = false
    ) WITH CHECK (
        auth.uid() = recruiter_id 
        AND is_approved = false
    );

-- 4. Allow recruiters to update their already-approved active jobs
CREATE POLICY "jobs_update_approved" ON public.jobs
    FOR UPDATE USING (
        auth.uid() = recruiter_id 
        AND is_approved = true
    ) WITH CHECK (
        auth.uid() = recruiter_id
    );
