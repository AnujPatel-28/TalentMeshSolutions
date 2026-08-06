T7 (register migrations + TS types) — T-Mid, Sonnet/Gemini Flash

You are executing task T7 from docs/specs/09_Migration_Execution_Runbook.md in the Talentmesh-demo project. Preconditions met: migrations 046–051 exist and are Fable-reviewed. File-only: apply NOTHING to any database.

Do exactly 09 T7:
1. In scripts/apply-migrations-safely.mjs, add the six new entries to the checks map exactly as listed in 09 T7 step 1 (READ THE CURRENT 09 — note 046's caveat: no clean single-object sentinel; it is applied individually at T10, so use the approach 09 specifies rather than inventing a check type the script doesn't support — first read how the script's existing check types work and use only those).
2. Run the bare-auth.uid() grep gate from 09 T7 step 2 over insforge/migrations/046*–051*.sql — report the output (expected: empty).
3. Add/extend TypeScript row types for: companies (new status/verification/KYC columns), company_members, company_verification_requests, verification_audit_log, plan_limits. FIRST find where the repo declares existing DB row types (search types/ and lib/ for the existing Job/Company interfaces) and follow that exact pattern and location — do NOT invent a new types location. Note: live companies has `description` (not `about`) and no `recruiter_id`.
4. Run npx tsc --noEmit and report the result vs baseline (known pre-existing error: framer-motion in app/dashboard/candidate/[role_id]/applications/page.tsx:686 — that one is not yours).

Output: the checks-map diff, the grep-gate output, which file(s) got the types and why that location, and the tsc result. Fable review follows before T8.

---

No DB was touched — file-only, as required.

T7 report

1. Checks-map diff (scripts/apply-migrations-safely.mjs):
   '029_user_rate_limits.sql': { type: 'table', name: 'user_rate_limits' }
+  // 046_company_first_companies.sql has no clean single-object sentinel (in-place alter + drop);
+  // it is applied individually at T10, not via this script's automated loop — no entry here.
+  '047_company_members_and_authz.sql': { type: 'table', name: 'company_members' },
+  '048_verification_workflow.sql': { type: 'table', name: 'company_verification_requests' },
+  '049_repoint_ownership_and_rpcs.sql': { type: 'function', name: 'create_job' },
+  '050_company_scoped_rls_and_plans.sql': { type: 'table', name: 'plan_limits' },
+  '051_verification_and_member_rpcs.sql': { type: 'function', name: 'accept_company_invite' }
 };
046 deliberately has no entry, not a bogus one. The script only supports table/function/bucket/policy checks (read the checkExists implementation directly). 09's own code sample proposed { type: 'function', name: 'noop_046' }, but I grepped 046_company_first_companies.sql and no function named noop_046 (or any function) is defined there — pointing the check at a nonexistent function would make checkExists always return false, so the automated loop in main() would try to re-run 046 every time instead of skipping it. Since 09 §T10 step 3 says 046 is applied individually and file-by-file anyway (bypassing this script's loop), omitting the map entry is correct and matches 09's own fallback wording ("or just apply 046 individually"). Verified the other five sentinels exist by grepping CREATE TABLE/CREATE OR REPLACE FUNCTION in each file (company_members in 047, company_verification_requests+verification_audit_log in 048, create_job in 049, plan_limits in 050, accept_company_invite in 051).

2. Bare-auth.uid() grep gate over 046–051: empty output, exit 1 (no matches) — gate passes.

3. TypeScript types — new file lib/api/companies.ts. The repo's pattern for DB-row interfaces is one file per domain under lib/api/ (e.g. lib/api/jobs.ts exports interface Job matching the raw jobs table row and is imported by fetch functions in the same file). There was no existing companies.ts, Company interface, or generic DB-types file anywhere in types/ or lib/ — types/dashboard.ts only holds UI view-model shapes (Job, Candidate, etc. there are display-only, not row types). So a new lib/api/companies.ts follows the existing per-domain convention rather than inventing a new location. It exports Company (base columns from live schema per 046's comments — gstin, tan, logo_url, website, industry, size, description, location, is_verified, is_active — plus the new 046 columns status/verified_at/verified_by/created_by/updated_at/cin/pan/registered_email_domain/country_code/slug; uses description, no recruiter_id, per your note), plus CompanyMember, CompanyVerificationRequest, VerificationAuditLog, PlanLimits, each matching their migration's CREATE TABLE column-for-column.

4. npx tsc --noEmit: one error, at app/dashboard/candidate/[role_id]/applications/page.tsx:686 (framer-motion Variants type mismatch) — this is exactly the known pre-existing baseline error called out in your task. No new errors introduced.

Nothing applied to any database. Ready for Fable review before T8.
