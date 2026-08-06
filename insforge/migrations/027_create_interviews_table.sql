-- Migration 027: Create Interviews Table and RLS Policies

CREATE TABLE IF NOT EXISTS public.interviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled',
    meeting_link TEXT,
    questions JSONB,
    transcript TEXT,
    analysis TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;

-- Admin policy
DROP POLICY IF EXISTS admin_bypass ON public.interviews;
CREATE POLICY admin_bypass ON public.interviews TO project_admin USING (true) WITH CHECK (true);

-- Select policy for candidates
DROP POLICY IF EXISTS interviews_candidate_select ON public.interviews;
CREATE POLICY interviews_candidate_select ON public.interviews
    FOR SELECT TO public USING (candidate_id = auth.uid());

-- Select policy for recruiters
DROP POLICY IF EXISTS interviews_recruiter_select ON public.interviews;
CREATE POLICY interviews_recruiter_select ON public.interviews
    FOR SELECT TO public USING (
        EXISTS (
            SELECT 1 FROM public.jobs j
            WHERE j.id = interviews.job_id AND j.recruiter_id = auth.uid()
        )
    );

-- Insert policy for recruiters
DROP POLICY IF EXISTS interviews_recruiter_insert ON public.interviews;
CREATE POLICY interviews_recruiter_insert ON public.interviews
    FOR INSERT TO public WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.jobs j
            WHERE j.id = job_id AND j.recruiter_id = auth.uid()
        )
    );

-- Update policy for recruiters
DROP POLICY IF EXISTS interviews_recruiter_update ON public.interviews;
CREATE POLICY interviews_recruiter_update ON public.interviews
    FOR UPDATE TO public USING (
        EXISTS (
            SELECT 1 FROM public.jobs j
            WHERE j.id = interviews.job_id AND j.recruiter_id = auth.uid()
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.jobs j
            WHERE j.id = job_id AND j.recruiter_id = auth.uid()
        )
    );

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_set_updated_at ON public.interviews;
CREATE TRIGGER trigger_set_updated_at
BEFORE UPDATE ON public.interviews
FOR EACH ROW EXECUTE FUNCTION set_current_timestamp_updated_at();
