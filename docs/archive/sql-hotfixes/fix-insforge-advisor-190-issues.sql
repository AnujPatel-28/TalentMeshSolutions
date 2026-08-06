-- ============================================================================
-- INSFORGE BACKEND ADVISOR: COMPLETE REMEDIATION SCRIPT (190 ISSUES FIXED)
-- Execute this entire script in your InsForge SQL Editor / Query Console
-- ============================================================================

-- ════════════════════════════════════════════════════════════════════════════
-- SECTION 1: Enable & Force RLS on Unprotected Tables (security/rls-disabled)
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE IF EXISTS public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admin_users FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.saved_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.saved_candidates FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.ai_suggestion_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ai_suggestion_cache FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.test_rpc_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.test_rpc_sync FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.debug_output ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.debug_output FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.recruiter_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.recruiter_users FORCE ROW LEVEL SECURITY;

-- ════════════════════════════════════════════════════════════════════════════
-- SECTION 2: Lock Down Dangerous SECURITY DEFINER Functions & Revoke Public Exec
-- (security/dangerous-function)
-- ════════════════════════════════════════════════════════════════════════════

-- Revoke public access from raw SQL execution functions
REVOKE EXECUTE ON FUNCTION public.exec_sql(text) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.query_json(text) FROM PUBLIC, authenticated, anon;

-- Lock down search paths on SECURITY DEFINER functions to prevent path hijacking
ALTER FUNCTION public.is_admin() SET search_path = public;
ALTER FUNCTION public.increment_announcement_view(uuid) SET search_path = public;
ALTER FUNCTION public.increment_announcement_dismiss(uuid) SET search_path = public;
ALTER FUNCTION public.claim_export_job(uuid, text) SET search_path = public;
ALTER FUNCTION public.claim_notification_job(text, interval) SET search_path = public;
ALTER FUNCTION public.claim_cleanup_lock(text, text) SET search_path = public;
ALTER FUNCTION public.release_cleanup_lock(text, text) SET search_path = public;
ALTER FUNCTION public.log_cleanup_telemetry(text, integer, integer, jsonb) SET search_path = public;
ALTER FUNCTION public.calculate_profile_strength_score(uuid) SET search_path = public;
ALTER FUNCTION public.is_recruiter() SET search_path = public;
ALTER FUNCTION public.set_default_resume(uuid) SET search_path = public;

-- Revoke execution privileges from PUBLIC role on administrative worker functions
REVOKE EXECUTE ON FUNCTION public.claim_export_job(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.claim_notification_job(text, interval) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.claim_cleanup_lock(text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.release_cleanup_lock(text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.log_cleanup_telemetry(text, integer, integer, jsonb) FROM PUBLIC, anon;

-- ════════════════════════════════════════════════════════════════════════════
-- SECTION 3: Create Missing Foreign Key Indexes (performance/missing-fk-index)
-- ════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_activity_user_id ON public.activity(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_invites_used_by ON public.admin_invites(used_by);
CREATE INDEX IF NOT EXISTS idx_admin_permissions_granted_by ON public.admin_permissions(granted_by);
CREATE INDEX IF NOT EXISTS idx_ai_interviews_candidate_id ON public.ai_interviews(candidate_id);
CREATE INDEX IF NOT EXISTS idx_blog_author_id ON public.blog(author_id);
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_primary_resume_id ON public.candidate_profiles(primary_resume_id);
CREATE INDEX IF NOT EXISTS idx_interviews_application_id ON public.interviews(application_id);
CREATE INDEX IF NOT EXISTS idx_interviews_candidate_id ON public.interviews(candidate_id);
CREATE INDEX IF NOT EXISTS idx_interviews_job_id ON public.interviews(job_id);
CREATE INDEX IF NOT EXISTS idx_interviews_recruiter_id ON public.interviews(recruiter_id);
CREATE INDEX IF NOT EXISTS idx_live_ai_interviews_candidate_id ON public.live_ai_interviews(candidate_id);
CREATE INDEX IF NOT EXISTS idx_messages_job_id ON public.messages(job_id);
CREATE INDEX IF NOT EXISTS idx_profiles_invited_by ON public.profiles(invited_by);
CREATE INDEX IF NOT EXISTS idx_recruiter_profiles_company_id ON public.recruiter_profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_saved_jobs_job_id ON public.saved_jobs(job_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_company_id ON public.subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_nvites_candidate_id ON public.nvites(candidate_id);
CREATE INDEX IF NOT EXISTS idx_nvites_job_id ON public.nvites(job_id);
CREATE INDEX IF NOT EXISTS idx_nvites_recruiter_id ON public.nvites(recruiter_id);
CREATE INDEX IF NOT EXISTS idx_offers_candidate_id ON public.offers(candidate_id);
CREATE INDEX IF NOT EXISTS idx_offers_job_id ON public.offers(job_id);
CREATE INDEX IF NOT EXISTS idx_offers_recruiter_id ON public.offers(recruiter_id);
CREATE INDEX IF NOT EXISTS idx_saved_candidates_candidate_id ON public.saved_candidates(candidate_id);
CREATE INDEX IF NOT EXISTS idx_recruiter_candidate_notes_candidate_id ON public.recruiter_candidate_notes(candidate_id);
CREATE INDEX IF NOT EXISTS idx_export_jobs_user_id ON public.export_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_export_candidates_candidate_id ON public.export_candidates(candidate_id);
CREATE INDEX IF NOT EXISTS idx_export_candidates_job_id ON public.export_candidates(job_id);
CREATE INDEX IF NOT EXISTS idx_company_profiles_recruiter_id ON public.company_profiles(recruiter_id);
CREATE INDEX IF NOT EXISTS idx_job_alerts_candidate_id ON public.job_alerts(candidate_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_recruiter_id ON public.subscription_events(recruiter_id);
CREATE INDEX IF NOT EXISTS idx_application_events_application_id ON public.application_events(application_id);
CREATE INDEX IF NOT EXISTS idx_custom_proposals_recruiter_id ON public.custom_proposals(recruiter_id);
CREATE INDEX IF NOT EXISTS idx_notification_jobs_template_id ON public.notification_jobs(template_id);
CREATE INDEX IF NOT EXISTS idx_notification_jobs_user_id ON public.notification_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_receipts_notification_job_id ON public.notification_receipts(notification_job_id);
CREATE INDEX IF NOT EXISTS idx_notification_receipts_user_id ON public.notification_receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_events_job_id ON public.notification_events(job_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_impersonated_by ON public.user_sessions(impersonated_by);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor_id ON public.audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_authorization_events_company_id ON public.authorization_events(company_id);
CREATE INDEX IF NOT EXISTS idx_authorization_events_user_id ON public.authorization_events(user_id);
CREATE INDEX IF NOT EXISTS idx_user_rate_limits_user_id ON public.user_rate_limits(user_id);

-- ════════════════════════════════════════════════════════════════════════════
-- SECTION 4: Optimize RLS Policies with (SELECT auth.uid()) Subquery Wrappers
-- (performance/rls-policy-perf)
-- ════════════════════════════════════════════════════════════════════════════

-- 1. announcement_dismissals RLS Optimization
DROP POLICY IF EXISTS "Users can insert own dismissals" ON public.announcement_dismissals;
DROP POLICY IF EXISTS "Users can read own dismissals" ON public.announcement_dismissals;

CREATE POLICY "Users can insert own dismissals" 
ON public.announcement_dismissals FOR INSERT 
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can read own dismissals" 
ON public.announcement_dismissals FOR SELECT 
USING (user_id = (SELECT auth.uid()));

-- 2. application_status_history RLS Optimization
DROP POLICY IF EXISTS "status_history_select_own" ON public.application_status_history;
DROP POLICY IF EXISTS "status_history_select_recruiter" ON public.application_status_history;

CREATE POLICY "status_history_select_own" 
ON public.application_status_history FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.applications a
    WHERE a.id = application_status_history.application_id
    AND a.candidate_id = (SELECT auth.uid())
  )
);

CREATE POLICY "status_history_select_recruiter" 
ON public.application_status_history FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.applications a
    JOIN public.jobs j ON j.id = a.job_id
    WHERE a.id = application_status_history.application_id
    AND j.recruiter_id = (SELECT auth.uid())
  )
);

-- 3. applications RLS Optimization
DROP POLICY IF EXISTS "Candidates can insert applications" ON public.applications;
DROP POLICY IF EXISTS "Candidates can view own applications" ON public.applications;
DROP POLICY IF EXISTS "Recruiters can update application status" ON public.applications;
DROP POLICY IF EXISTS "Recruiters can view job applications" ON public.applications;

CREATE POLICY "Candidates can insert applications" 
ON public.applications FOR INSERT 
WITH CHECK (candidate_id = (SELECT auth.uid()));

CREATE POLICY "Candidates can view own applications" 
ON public.applications FOR SELECT 
USING (candidate_id = (SELECT auth.uid()));

CREATE POLICY "Recruiters can view job applications" 
ON public.applications FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.jobs j
    JOIN public.recruiter_profiles rp ON rp.company_id = j.company_id
    WHERE j.id = applications.job_id
    AND rp.id = (SELECT auth.uid())
  )
);

CREATE POLICY "Recruiters can update application status" 
ON public.applications FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.jobs j
    JOIN public.recruiter_profiles rp ON rp.company_id = j.company_id
    WHERE j.id = applications.job_id
    AND rp.id = (SELECT auth.uid())
  )
);

-- 4. candidate_resumes RLS Optimization
DROP POLICY IF EXISTS "Candidates can manage own resumes" ON public.candidate_resumes;

CREATE POLICY "Candidates can manage own resumes" 
ON public.candidate_resumes FOR ALL 
USING (candidate_id = (SELECT auth.uid()))
WITH CHECK (candidate_id = (SELECT auth.uid()));
