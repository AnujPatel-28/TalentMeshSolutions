-- Migration 041: Add missing indexes for RLS policy filter columns
-- Advisor fixes: performance/missing-rls-index
-- Important: CREATE INDEX CONCURRENTLY must not run inside BEGIN/COMMIT.
--
-- ════════════════════════════════════════════════════════════════════════════
-- DIAGNOSTIC AUDIT & FALSE-POSITIVES NOTE
-- ════════════════════════════════════════════════════════════════════════════
-- InsForge Backend Advisor flags 11 missing RLS indexes. However, a direct database 
-- schema query confirms that 10 of these are false-positives because the target 
-- columns do not exist on the parent tables. 
--
-- The Advisor's static analysis parses subqueries/joins inside RLS policies and 
-- incorrectly attributes the columns to the parent table rather than the joined table.
--
-- Detailed Audit of the 10 Skipped Warnings:
-- 1. public.application_status_history(candidate_id)
--    - Reason: Column does not exist. The policy 'status_history_select_own' filters on
--      applications.candidate_id via JOIN. applications.candidate_id is indexed.
-- 2. public.application_status_history(recruiter_id)
--    - Reason: Column does not exist. The policy 'status_history_select_recruiter' filters on
--      jobs.recruiter_id via JOIN. jobs.recruiter_id is indexed.
-- 3. public.applications(recruiter_id)
--    - Reason: Column does not exist. Policies join jobs table where jobs.recruiter_id is indexed.
-- 4. public.candidate_profiles(recruiter_id)
--    - Reason: Column does not exist. Joins jobs table where recruiter_id is indexed.
-- 5. public.candidate_resumes(recruiter_id)
--    - Reason: Column does not exist. Joins jobs table where recruiter_id is indexed.
-- 6. public.export_candidates(user_id)
--    - Reason: Column does not exist. Joins export_jobs where export_jobs.user_id is indexed.
-- 7. public.notification_events(user_id)
--    - Reason: Column does not exist. Joins notification_jobs where user_id is indexed.
-- 8. public.notification_preferences(id)
--    - Reason: Column does not exist (uses user_id as primary key).
-- 9. public.notification_templates(user_id)
--    - Reason: Column does not exist.
-- 10. public.profiles(recruiter_id)
--    - Reason: Column does not exist.
--
-- Real database indexes have been verified for all target join columns.
-- Only the 2 valid table/column indexes are created below.
-- ════════════════════════════════════════════════════════════════════════════

-- 1. [VALID] Table: public.announcement_dismissals, Column: user_id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_announcement_dismissals_user_id
  ON public.announcement_dismissals(user_id);

-- 2. [VALID] Table: public.auth_events, Column: user_id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_auth_events_user_id
  ON public.auth_events(user_id);
