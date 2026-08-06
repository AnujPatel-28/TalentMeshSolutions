-- ============================================================
-- Fix: Infinite Recursion in Jobs & Applications RLS Policies
-- Run the ENTIRE script at once in InsForge SQL Editor
-- ============================================================

-- Step 1: Drop ALL policies on jobs and applications tables
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename IN ('jobs', 'applications')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
        RAISE NOTICE 'Dropped policy: % on %', pol.policyname, pol.tablename;
    END LOOP;
END $$;

-- Step 2: Re-enable RLS on both tables
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Step 3: Jobs policies (simple, no cross-table references)
CREATE POLICY "jobs_select_approved" ON public.jobs
    FOR SELECT USING (status = 'active' AND is_approved = true);

CREATE POLICY "jobs_select_own" ON public.jobs
    FOR SELECT USING (auth.uid() = recruiter_id);

CREATE POLICY "jobs_insert_own" ON public.jobs
    FOR INSERT WITH CHECK (auth.uid() = recruiter_id);

CREATE POLICY "jobs_update_own" ON public.jobs
    FOR UPDATE USING (auth.uid() = recruiter_id);

CREATE POLICY "jobs_delete_own" ON public.jobs
    FOR DELETE USING (auth.uid() = recruiter_id);

-- Step 4: Applications policies (safe - candidate checks only)
CREATE POLICY "apps_select_own" ON public.applications
    FOR SELECT USING (auth.uid() = candidate_id);

CREATE POLICY "apps_insert_own" ON public.applications
    FOR INSERT WITH CHECK (auth.uid() = candidate_id);

CREATE POLICY "apps_update_own" ON public.applications
    FOR UPDATE USING (auth.uid() = candidate_id);

-- Step 5: Employers can view applications for their posted jobs
-- Uses a direct subquery on jobs.recruiter_id - no circular reference
CREATE POLICY "apps_recruiter_view" ON public.applications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.jobs j
            WHERE j.id = applications.job_id
            AND j.recruiter_id = auth.uid()
        )
    );

CREATE POLICY "apps_recruiter_update" ON public.applications
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.jobs j
            WHERE j.id = applications.job_id
            AND j.recruiter_id = auth.uid()
        )
    );
