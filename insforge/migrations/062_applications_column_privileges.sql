-- 062_applications_column_privileges.sql
--
-- Doc ref: 24_Candidate_Side_Security_Audit.md (F-24.1)
-- Same fix pattern as 058_jobs_approval_single_source.sql §B: the security boundary for
-- "who may write this column" is a COLUMN PRIVILEGE, not RLS. RLS is row-level and
-- structurally cannot express "this row is yours, but these four columns are not yours to write".
--
-- STATUS: **APPLIED to live 2026-07-27** at the user's explicit instruction, which overrode the
-- standing "human applies — never an agent" rule for this migration only. The rule still stands
-- for future migrations. Applied as three separate single-line statements (the CLI truncates at
-- the first newline — doc 21 §7 trap 1), not as this file.
--
-- Post-apply verification actually performed (not assumed):
--   * grants: authenticated = applied_at, apply_type, cover_letter, resume_id,
--     resume_snapshot_key, resume_url, screening_answers, updated_at  |  anon = none
--   * re-ran the exact pre-fix exploit, role-switched to `authenticated` as the row's own
--     candidate: stage_index / recruiter_notes / ai_match_score / rejection_reason all now
--     "permission denied for table applications" (were rows=1 before)
--   * control: cover_letter update still rows=1 → not over-revoked
--   * INSERT grants untouched (16 cols) → candidates can still apply
--   * update_application_status() is SECURITY DEFINER owned by `postgres`, which also owns the
--     table → recruiter/admin status changes unaffected by the revoke
--
-- Problem (verified live 2026-07-27, role-switched to `authenticated` with a real candidate's
-- JWT sub, updating that candidate's OWN application row):
--     status           -> BLOCKED by trigger check_direct_application_status_update
--     stage_index      -> rows=1  SUCCEEDED
--     recruiter_notes  -> rows=1  SUCCEEDED
--     ai_match_score   -> rows=1  SUCCEEDED
--     rejection_reason -> rows=1  SUCCEEDED
-- RLS policy apps_update_own (candidate_id = auth.uid()) permits the row, and `authenticated`
-- held UPDATE on all 16 columns, so a candidate could set their own AI match score (drives
-- recruiter ranking), advance their own pipeline stage, and write/overwrite the recruiter's
-- private notes -- which are rendered in the recruiter UI (stored-injection surface).
--
-- Why revoking is safe (each verified before writing this migration):
--   * update_application_status() is SECURITY DEFINER -> runs as owner, unaffected by caller grants.
--     app/api/applications/[id]/status/route.ts reaches status only through that RPC.
--   * Edge functions (update-application, admin-applications, ai-match, resume-proxy) use the
--     service key (project_admin), which is unaffected by `authenticated`/`anon` grants.
--   * grep over app/, components/, lib/, app/api/ and insforge/functions/ found NO direct
--     .update() writer of stage_index / recruiter_notes / ai_match_score / rejection_reason,
--     and no client-side .from('applications').update() at all.
--   * Identity/tenancy columns (id, candidate_id, job_id) are revoked too: nothing updates them
--     after insert, and leaving them writable allows row re-pointing. INSERT is NOT touched, so
--     applying to a job still works (RLS WITH CHECK candidate_id = auth.uid() still governs it).
--
-- Net effect: client roles keep UPDATE only on the columns a candidate may legitimately revise
-- on their own application (cover_letter, resume_id, resume_url, resume_snapshot_key,
-- screening_answers, apply_type) plus the applied_at/updated_at timestamps.
--
-- Rollback:
--   GRANT UPDATE ON public.applications TO authenticated;
--   GRANT UPDATE ON public.applications TO anon;
--
-- Post-apply verification (expect ZERO rows for the revoked columns):
--   SELECT grantee, string_agg(column_name, ', ' ORDER BY column_name)
--     FROM information_schema.column_privileges
--    WHERE table_name = 'applications' AND privilege_type = 'UPDATE'
--      AND grantee IN ('authenticated','anon')
--      AND column_name IN ('id','candidate_id','job_id','status','stage_index',
--                          'recruiter_notes','ai_match_score','rejection_reason')
--    GROUP BY grantee;

BEGIN;

-- Table-wide UPDATE is what makes every column writable; drop it, then re-grant the allowed
-- subset explicitly. (Postgres has no "revoke one column" when a table-wide grant is present.)
REVOKE UPDATE ON public.applications FROM authenticated;
REVOKE UPDATE ON public.applications FROM anon;

-- Candidate-editable fields only. Deliberately excluded:
--   id, candidate_id, job_id          -- identity / tenancy, set once at INSERT
--   status                            -- via update_application_status() RPC only
--   stage_index, recruiter_notes,
--   ai_match_score, rejection_reason  -- recruiter/system-owned
GRANT UPDATE (
  cover_letter,
  resume_id,
  resume_url,
  resume_snapshot_key,
  screening_answers,
  apply_type,
  applied_at,
  updated_at
) ON public.applications TO authenticated;

-- anon is RLS-bound (auth.uid() is NULL, so apps_update_own matches no row) and therefore cannot
-- update anything today. Kept symmetric with `authenticated` rather than granted back: no
-- unauthenticated flow updates an application. 058 §D set the same precedent for jobs.

COMMIT;
