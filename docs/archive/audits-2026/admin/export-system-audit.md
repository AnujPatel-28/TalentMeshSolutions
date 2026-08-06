# Background Export Queue & Worker Lock — Technical Audit Report

**Feature Area:** Admin / Export Infrastructure  
**Audit Date:** 2026-06-10  
**Audited By:** Internal implementation review  
**Status:** ✅ Active — Release Candidate Passed  

---

## 1. Summary

This audit covers the background CSV export queue system that processes large candidate and recruiter record exports asynchronously, including the database schema migrations, generic item mappings, client-side progress notifications, and worker lock recovery rules.

---

## 2. Generic Export Item Mapping

**Problem:** Previously, specific tables were created for each entity type (e.g. `export_candidates`), causing database schema bloat and requiring new tables for every future export type (reports, logs, analytics, etc.).

**Solution:**
- Created a generic background export architecture.
- Replaced separate candidate export references with generic `export_jobs` and `export_job_items`.
- **Database Schema**:
  - `export_jobs`: `id`, `user_id`, `status` (`pending`, `running`, `completed`, `failed`), `type` (e.g. `candidate`, `recruiter`), `filters`, `file_url`, `error_message`, `locked_at`, `created_at`, `updated_at`.
  - `export_job_items`: `job_id` (foreign key), `entity_type` (e.g. `'candidate'`, `'recruiter'`), `entity_id` (UUID), `created_at`.

---

## 3. Worker Lock Claims & Expiration Recovery

**Problem:** If an export worker crashed while processing a large job, that job would remain locked in `running` status indefinitely. This blocked the queue and prevented the user from retrying or getting the export file.

**Solution:**
- Enforced lock recovery: jobs stuck in the `running` status for longer than 10 minutes are considered expired.
- The queue worker claims pending jobs OR expired jobs (`locked_at < now - 10m`) to reset and restart processing automatically.
- Integrated lock claiming checks in database transactions and scheduled migrations.

---

## 4. Client-side Progress Notifications

**Problem:** When exports contain more than 100 rows, the operation is queued. The user had no visual confirmation of progress and did not know if the file was generating.

**Solution:**
- Designed an interactive progress notification banner.
- The banner checks the job state via polling or web sockets and updates to show the precise progress percentage (e.g., "Exporting 58%") based on the ratio of completed items in `export_job_items` relative to the total estimated count.

---

## 5. Server-Enforced Lock Claims RPC (Gap B)

**Problem:** Client-side lock claiming checks could be bypassed or suffer from client concurrency race conditions.

**Solution:**
- Created and deployed `013_claim_export_job.sql` migration defining `claim_export_job(job_id, worker_id)` function.
- Enforces inside the database that a worker can claim a job ONLY if status is `pending` or the job has been locked in `running` status for $\ge$ 10 minutes.
- Returns a boolean indicating if the claim was successful, allowing workers to proceed atomically.

---

## 6. Worker Recovery & Progress Restoration (Gap D)

**Problem:** Refreshing the page aborted the client-worker processing in the browser, leaving the job permanently locked or stalled.

**Solution:**
- Saved the active export job ID to `sessionStorage` (`tm_active_export_candidates_job_id` or `tm_active_export_recruiters_job_id`).
- On page load, if a job ID is present, the client queries its database status. If it is `pending` or `running`, it fetches related IDs and resumes processing under a new worker lock claim.

---

## 7. File Changes

| File | Change | Role |
|---|---|---|
| `insforge/migrations/011_export_jobs.sql` | [NEW] SQL migration creating `export_jobs` and `export_job_items` tables with RLS and generic mapping | DB Migration |
| `insforge/migrations/012_cleanup_idempotency_keys.sql` | [NEW] SQL migration establishing scheduled daily cleanup procedures | DB Migration |
| `insforge/migrations/013_claim_export_job.sql` | [NEW] SQL migration defining server-enforced lock claim transaction logic | DB Migration |
| `app/dashboard/admin/candidates/page.tsx` | [MODIFY] Wired progress banner, `runExportWorker` and mount recovery hooks | UI Page |
| `app/dashboard/admin/recruiters/page.tsx` | [MODIFY] Refactored background export processing to `runExportWorker` and mount recovery hooks | UI Page |
| `e2e/admin-stabilization.spec.ts` | [MODIFY] Playwright tests verifying the export queue progress banner lifecycle and mocking claim RPC | Testing |

---

## 8. Verification Checklist

| Check | Status |
|---|---|
| Generic `export_jobs` and `export_job_items` schema successfully created | ✅ Verified |
| CSV export triggers background queue for listings with >= 100 records | ✅ Verified |
| Background export banner shows percentage progress dynamically | ✅ Verified |
| Worker lock expiration and recovery claims jobs older than 10 minutes | ✅ Verified |
| Playwright E2E tests for export queue progress model pass successfully | ✅ Verified |
| Server-enforced RPC lock claim successfully integrated and verified | ✅ Verified |
| Reload-time export progress restoration successfully integrated and verified | ✅ Verified |

---

## Changelog

| Date | Change | Author |
|---|---|---|
| 2026-06-10 | Updated Export System and Worker Lock Technical Audit report for Phase C | Antigravity |
