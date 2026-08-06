# T10/T11 — Live apply log (2026-07-17)

Executed by the Fable advisor session with explicit human go-ahead ("push the branch, then go ahead with T10").

## Preconditions
- Branch `hotfix/l1-companies-rls-resolved` pushed to origin at `71dc760` before the apply.
- **Snapshot:** cloud backups + backend branches are NOT available on this OSS-hosted project
  (`backups` API → "Project not found"; `branch create` → auth error). Fallback per runbook:
  full logical export `_db_snapshots/pre-mig-046-051_full.sql` (schema + data + policies +
  functions, 535 KB; no table near the 1000-row export cap, verified via pg_stat_user_tables).
- Direct-to-prod apply (no rehearsal branch) under the runbook's no-branch contingency, with
  per-file atomicity (each file ran as a single exec_sql call; a mid-file error rolls the file back — proven by the 046 first attempt).

## Apply sequence & incidents
| File | Result | Notes |
|---|---|---|
| 046 | ✅ (2nd attempt) | 1st attempt failed on `DROP TABLE company_profiles`: **`authorization_events.company_id` FK'd the vestige** (mig 028) — missed by the T1 baseline (it only captured companies/company_profiles/jobs). Atomic rollback confirmed (no partial state). Delta: repoint FK to `companies` (table empty, column nullable) — added to the 046 file. |
| 047 | ✅ | |
| 048 | ✅ (2nd attempt) | 1st call died at the gateway (HTML error) before executing — verified nothing applied, retried identical SQL. |
| 049 | ✅ (split into 2 calls) | Same gateway flake on the full-file payload; split backfills+FKs / RPCs. |
| 050 | ✅ (split into 2 calls) | |
| 051 | ✅ | |

## Post-apply verification (runbook T11)
- `company_profiles` → `to_regclass` NULL (dropped). ✅
- `companies.status` map: **3 verified / 3 pending / 0 deactivated** — exactly the T1 preview; no wrongly-reset rows. ✅
- gstin `''` normalized to NULL (0 left); `companies_gstin_key` unique index created. ✅
- `companies` policies: `admin_bypass, companies_owner_write, companies_public_read, project_admin_policy` — `"Recruiters manage company"` absent (L-1 closed). ✅
- `jobs` policies: exactly `admin_bypass, jobs_admin_all, jobs_delete_company, jobs_no_direct_insert, jobs_select_approved (verified-company predicate), jobs_select_company, jobs_update_company, project_admin_policy` — all 14 blanket policies gone (**L-2 closed**). ✅
- `plan_limits` → `free/1`. ✅ 8 functions + 3 triggers installed. ✅
- Backfill: 1 company got `created_by`; 1 active admin member (consistent with the 2 live jobs by one recruiter). ✅

## Security regressions (all PASS, run with simulated JWT contexts via `request.jwt.claim.sub` + `SET LOCAL ROLE authenticated`)
- **C-1:** candidate self-`role='super_admin'` on own row → blocked by `guard_profile_privileged_cols`. ✅
  - **Apply delta:** the guard as spec'd also blocked service-key admin flows (admin-settings/admin-candidates update role/status with NO JWT uid). Added `current_user IN ('postgres','project_admin')` bypass — user JWTs always run as `authenticated`, so C-1 protection is unchanged. Verified both directions.
- **L-1:** recruiter UPDATE on another company → 0 rows; own company (created_by) → 1 row. ✅
- **C-4 / entitlement:** `create_job(status='active')` at the limit → `active job limit reached` (the company has 2 grandfathered active jobs > free limit 1). ✅
- **Direct insert:** recruiter INSERT into jobs → denied (`jobs_no_direct_insert`). ✅
- **Cross-tenant reads:** recruiter's visible `applications` ≤ company-scoped set. ✅

## Edge-fn redeploy (T11 step 1)
`functions deploy jobs` — CLI printed "deployment failed" but the deploy log shows the full 53-function bundle packaged and deployed; **verified via `functions code jobs`: the live code has NO POST path and advertises `GET, OPTIONS`.** C-4 closed end-to-end (the old deployed fn's service-key POST bypassed RLS until this redeploy).

## Grandfathered / follow-ups
- The pre-existing company has 2 active jobs vs free limit 1 — grandfathered; it cannot *activate more* until below the limit. Decide whether to reconcile.
- The Next.js app (doc-10 auth fix + post-job RPC page) still needs its normal frontend deploy — not part of this gate.
- Rollback artifact: `_db_snapshots/pre-mig-046-051_full.sql` (do not delete; it is the only pre-046 restore point).
