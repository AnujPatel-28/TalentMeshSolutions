# InsForge Backend Advisor Audit Verification

This report provides a formal evaluation of the 158 performance warnings flagged by the **InsForge Backend Advisor**, focusing specifically on the **Candidate** and **Admin** scopes of the TalentMesh AI Recruiting Platform.

---

## 1. Issue Categorization and Correctness

Both categories of issues flagged by the Advisor are **highly correct** and represent critical optimizations for a production-ready PostgreSQL backend integrated with InsForge (Supabase). Below is the technical breakdown of why these warnings are correct and how they impact the system.

### Category A: Missing Foreign Key Indexes (`performance/missing-fk-index`)
In PostgreSQL, creating a Foreign Key (FK) constraint does **not** automatically create an index on the referencing column. 
* **The Problem**: 
  1. **Query Performance**: Every time a join is executed (e.g., matching a candidate profile to their primary resume, or pulling notifications for an admin), PostgreSQL is forced to perform a sequential (full table) scan on the referencing table.
  2. **Referential Integrity Locks**: When a row in the parent table is updated or deleted, PostgreSQL must scan the referencing table to enforce constraints (like `ON DELETE CASCADE`). Without an index on the foreign key column, this scan requires a full table lock, blocking concurrent writes to that table. Under high concurrency, this leads to transaction timeouts and deadlock states.
* **The Fix**: Creating B-Tree indexes on these foreign key columns. In production, this should be done using `CREATE INDEX CONCURRENTLY` to avoid blocking table writes during index creation.

### Category B: RLS Policy Calls `auth.uid()` Per Row (`performance/rls-policy-perf`)
By default, Row Level Security (RLS) policies that filter data using `auth.uid() = column_name` suffer from a query planner inefficiency.
* **The Problem**: PostgreSQL treats `auth.uid()` as a volatile function because its return value depends on the session context (JWT claims config). As a result, the query planner evaluates `auth.uid()` **for every single row scanned** rather than caching it as a constant. For a table with 10,000 rows, the function is executed 10,000 times. This prevents the query planner from using index scans, causing queries to be up to 100x slower.
* **The Fix**: Wrapping `auth.uid()` in a scalar subquery: `(SELECT auth.uid())`. This forces PostgreSQL to evaluate the subquery exactly once at query startup, treating the result as a query parameter/constant. PostgreSQL can then leverage index scans on columns like `user_id` or `candidate_id` directly, resulting in an immediate performance recovery.

---

## 2. Candidate & Admin Scope Matrix

Below is the verification matrix categorizing which flagged issues belong to the **Candidate** and **Admin** scopes, versus general recruiter/billing modules.

### 2.1 Candidate Module Scope

| Affected Table | Column / Policy | Warning Type | Verification & Action |
| :--- | :--- | :--- | :--- |
| `candidate_profiles` | `primary_resume_id` | Missing FK Index | **Correct.** Crucial for loading primary resumes in candidate profiles during user logins. |
| `ai_interviews` | `candidate_id` | Missing FK Index | **Correct.** Used for fetching candidate-specific AI mock interview details. |
| `live_ai_interviews` | `candidate_id` | Missing FK Index | **Correct.** Used for logging active realtime voice/text AI interviews. |
| `saved_jobs` | `job_id` | Missing FK Index | **Correct.** Candidate dashboard query to retrieve bookmarked jobs. |
| `job_alerts` | `candidate_id` | Missing FK Index | **Correct.** Used by cron jobs to match candidate search patterns. |
| `application_events` | `application_id` | Missing FK Index | **Correct.** Logs candidate application status history transitions. |
| `nvites` | `candidate_id`, `job_id` | Missing FK Index | **Correct.** Invites sent to candidate profiles. *(Note: Typo in schema as `nvites` is confirmed)*. |
| `offers` | `candidate_id`, `job_id` | Missing FK Index | **Correct.** Job offers sent directly to candidates. |
| `applications` | `apps_select_own`, `apps_insert_own`, `apps_update_own` | RLS `auth.uid()` | **Correct.** Candidate self-lookup optimization. |
| `candidate_profiles` | `candidate_profiles_self`, `candidate_profiles_update` | RLS `auth.uid()` | **Correct.** Candidate profile loading optimization. |
| `candidate_resumes` | `candidate_resumes_select_self` | RLS `auth.uid()` | **Correct.** Resume manager load query optimization. |
| `job_alerts` | `job_alerts_self` | RLS `auth.uid()` | **Correct.** Job alerts load optimization. |
| `nvites` | `nvites_select_candidate` | RLS `auth.uid()` | **Correct.** Invites list load optimization. |

### 2.2 Admin Module Scope

| Affected Table | Column / Policy | Warning Type | Verification & Action |
| :--- | :--- | :--- | :--- |
| `admin_invites` | `used_by` | Missing FK Index | **Correct.** Tracks which profile used the administrative invite code. |
| `admin_permissions` | `granted_by` | Missing FK Index | **Correct.** Tracks which administrator granted specific permissions. |
| `audit_log` | `actor_id` | Missing FK Index | **Correct.** *(Standardized from performed_by in migration 010)*. Essential for administrative change-audits. |
| `export_jobs` | `user_id` | Missing FK Index | **Correct.** Tracks admin bulk data export tasks. |
| `export_candidates` | `candidate_id`, `job_id` | Missing FK Index | **Correct.** Tracks candidate mapping exports. |
| `export_jobs` | `Users can view/insert/update own export jobs` | RLS `auth.uid()` | **Correct.** Admin export dashboard queries. |
| `export_candidates` | `Users can view own export candidates` | RLS `auth.uid()` | **Correct.** Admin export details queries. |
| `profiles` | `profiles_admin_select` | RLS `auth.uid()` | **Correct.** Admin search profiles queries (bypasses RLS recursion). |

### 2.3 Shared / Platform Core Scope

| Affected Table | Column / Policy | Warning Type | Verification & Action |
| :--- | :--- | :--- | :--- |
| `activity` | `user_id` | Missing FK Index | **Correct.** General activity feed logged for both candidates and admins. |
| `user_sessions` | `user_id`, `impersonated_by` | Missing FK Index | **Correct.** Session management, device lists, and admin impersonation logs. |
| `notification_jobs` | `user_id`, `template_id` | Missing FK Index | **Correct.** Platform notification dispatch engine. |
| `notification_receipts`| `user_id`, `notification_job_id` | Missing FK Index | **Correct.** Delivery logs for SMS/Email notifications. |
| `notification_events` | `job_id` | Missing FK Index | **Correct.** Log of notification event occurrences. |
| `user_sessions` | RLS policies | RLS `auth.uid()` | **Correct.** Active session tracking queries. |
| `notifications` | RLS policies | RLS `auth.uid()` | **Correct.** Candidate & admin in-app notification center queries. |

---

## 3. SQL Remediation Scripts (Candidate & Admin Scopes Only)

These SQL blocks are pre-formatted for direct execution in the InsForge SQL editor. They target the Candidate and Admin modules only.

### 3.1 Foreign Key Index Creation

> [!NOTE]
> Creating indexes concurrently is recommended for live databases (`CREATE INDEX CONCURRENTLY`). However, `CONCURRENTLY` cannot run inside a transaction block. If your migration runner wraps scripts in transactions, omit `CONCURRENTLY`.

```sql
-- =========================================================================
-- INDEX REMEDIATION: CANDIDATE MODULE
-- =========================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_candidate_profiles_primary_resume_id ON public.candidate_profiles(primary_resume_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_interviews_candidate_id ON public.ai_interviews(candidate_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_live_ai_interviews_candidate_id ON public.live_ai_interviews(candidate_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_saved_jobs_job_id ON public.saved_jobs(job_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_alerts_candidate_id ON public.job_alerts(candidate_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_application_events_application_id ON public.application_events(application_id);

-- Invites and Offers
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_nvites_candidate_id ON public.nvites(candidate_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_nvites_job_id ON public.nvites(job_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_nvites_recruiter_id ON public.nvites(recruiter_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_offers_candidate_id ON public.offers(candidate_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_offers_job_id ON public.offers(job_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_offers_recruiter_id ON public.offers(recruiter_id);

-- Candidate-facing human interviews
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_interviews_candidate_id ON public.interviews(candidate_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_interviews_application_id ON public.interviews(application_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_interviews_job_id ON public.interviews(job_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_interviews_recruiter_id ON public.interviews(recruiter_id);

-- Notes and Saves
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_saved_candidates_candidate_id ON public.saved_candidates(candidate_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recruiter_candidate_notes_candidate_id ON public.recruiter_candidate_notes(candidate_id);

-- =========================================================================
-- INDEX REMEDIATION: ADMIN & CORE MODULE
-- =========================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_admin_invites_used_by ON public.admin_invites(used_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_admin_permissions_granted_by ON public.admin_permissions(granted_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_actor_id ON public.audit_log(actor_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_user_id ON public.activity(user_id);

-- Session Governance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_impersonated_by ON public.user_sessions(impersonated_by);

-- Data Export Jobs
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_export_jobs_user_id ON public.export_jobs(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_export_candidates_candidate_id ON public.export_candidates(candidate_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_export_candidates_job_id ON public.export_candidates(job_id);

-- Notification Pipeline
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notification_jobs_user_id ON public.notification_jobs(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notification_jobs_template_id ON public.notification_jobs(template_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notification_receipts_user_id ON public.notification_receipts(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notification_receipts_notification_job_id ON public.notification_receipts(notification_job_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notification_events_job_id ON public.notification_events(job_id);
```

### 3.2 Row Level Security Policy Optimization

We optimize the RLS policies by altering or recreating them to wrap `auth.uid()` in a scalar subquery `(SELECT auth.uid())`.

```sql
-- =========================================================================
-- RLS OPTIMIZATION: CANDIDATE MODULE
-- =========================================================================

-- profiles (Candidate lookup)
ALTER POLICY profiles_select_self ON public.profiles USING (id = (SELECT auth.uid()));

-- candidate_profiles
ALTER POLICY candidate_profiles_self ON public.candidate_profiles USING (id = (SELECT auth.uid()));
ALTER POLICY candidate_profiles_update ON public.candidate_profiles USING (id = (SELECT auth.uid()));
ALTER POLICY candidate_profiles_insert ON public.candidate_profiles WITH CHECK (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS candidate_profiles_self_and_admin_select ON public.candidate_profiles;
CREATE POLICY candidate_profiles_self_and_admin_select ON public.candidate_profiles
  FOR SELECT USING (
    id = (SELECT auth.uid()) 
    OR EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = (SELECT auth.uid()) AND (p.role = 'admin' OR p.role = 'super_admin')
    )
  );

-- candidate_resumes
ALTER POLICY candidate_resumes_select_self ON public.candidate_resumes USING (candidate_id = (SELECT auth.uid()));
ALTER POLICY candidate_resumes_insert ON public.candidate_resumes WITH CHECK (candidate_id = (SELECT auth.uid()));
ALTER POLICY candidate_resumes_update ON public.candidate_resumes USING (candidate_id = (SELECT auth.uid())) WITH CHECK (candidate_id = (SELECT auth.uid()));
ALTER POLICY candidate_resumes_delete ON public.candidate_resumes USING (candidate_id = (SELECT auth.uid()));

-- applications
ALTER POLICY apps_select_own ON public.applications USING ((SELECT auth.uid()) = candidate_id);
ALTER POLICY apps_insert_own ON public.applications WITH CHECK ((SELECT auth.uid()) = candidate_id);
ALTER POLICY apps_update_own ON public.applications USING ((SELECT auth.uid()) = candidate_id);

-- job_alerts & nvites & interviews
ALTER POLICY job_alerts_self ON public.job_alerts USING (candidate_id = (SELECT auth.uid()));
ALTER POLICY nvites_select_candidate ON public.nvites USING (candidate_id = (SELECT auth.uid()));
ALTER POLICY interviews_candidate_select ON public.interviews USING (candidate_id = (SELECT auth.uid()));


-- =========================================================================
-- RLS OPTIMIZATION: ADMIN & PLATFORM MODULES
-- =========================================================================

-- profiles (Admin lookup)
DROP POLICY IF EXISTS profiles_admin_select ON public.profiles;
CREATE POLICY profiles_admin_select ON public.profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (SELECT auth.uid()))
  );

-- export_jobs
ALTER POLICY "Users can view own export jobs" ON public.export_jobs USING (user_id = (SELECT auth.uid()));
ALTER POLICY "Users can insert own export jobs" ON public.export_jobs WITH CHECK (user_id = (SELECT auth.uid()));
ALTER POLICY "Users can update own export jobs" ON public.export_jobs USING (user_id = (SELECT auth.uid()));

-- export_candidates
ALTER POLICY "Users can view own export candidates" ON public.export_candidates USING (
  EXISTS (SELECT 1 FROM public.export_jobs WHERE id = job_id AND user_id = (SELECT auth.uid()))
);

-- user_sessions (impersonation & active sessions check)
ALTER POLICY user_sessions_select ON public.user_sessions USING (user_id = (SELECT auth.uid()));
ALTER POLICY user_sessions_delete ON public.user_sessions USING (user_id = (SELECT auth.uid()));

-- notifications (Candidate & Admin inbox)
ALTER POLICY notifications_self_read ON public.notifications USING (user_id = (SELECT auth.uid()));
ALTER POLICY notifications_self_update ON public.notifications USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

-- announcement_dismissals
ALTER POLICY "Users can read own dismissals" ON public.announcement_dismissals USING (user_id = (SELECT auth.uid()));
ALTER POLICY "Users can insert own dismissals" ON public.announcement_dismissals WITH CHECK (user_id = (SELECT auth.uid()));
```
