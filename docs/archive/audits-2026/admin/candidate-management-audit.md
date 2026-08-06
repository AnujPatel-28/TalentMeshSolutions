# Candidate Management View — Technical Audit Report

**Feature Area:** Admin / Candidate Directory  
**Audit Date:** 2026-06-10  
**Audited By:** Internal implementation review  
**Status:** ✅ Active — Release Candidate Passed  

---

## 1. Summary

This audit covers the stabilization of the Admin Candidate Directory, including URL state persistence, selection hooks, bulk status/delete operations, responsive layouts, hydration/navigation race conditions, and undo persistence.

---

## 2. URL State Sync & Hydration Race Fix

**Problem:** Typing in search, reloading, or clearing search filters caused a race condition in Next.js where asynchronous router navigation would update `searchParams` with stale values. This resulted in state overwrites and duplicate/unnecessary API requests.

**Solution:**
- Introduced `internalNavRef` (a boolean React ref) inside the `AdminCandidatesPage` component.
- Set `internalNavRef.current = true` before calling `router.push`.
- Checked `internalNavRef.current` inside the `searchParams` syncing `useEffect`. If `true`, the effect resets the flag to `false` and skips state overwrites and duplicate fetches.

---

## 3. Bulk Selection & Mutation Queue

**Problem:** Multiple rapid bulk status updates or deletions could lead to network congestion, out-of-order execution, and inconsistent client UI states.

**Solution:**
- Implemented `useSelection()` custom page-scoped selection hook that resets selections automatically when filters change.
- Integrated `mutationQueue` to serialize all updates and execute them sequentially with idempotency.
- Created `BulkConfirmModal` to ask for verification before executing irreversible bulk actions.
- Optimistic updates with automatic rollback: immediately update the table rows locally and roll back to a backup state in case of network or function failure.

---

## 4. Undo Persistence Across Navigation

**Problem:** Users performing status updates and immediately navigating away would lose their window to undo the action, or the action could trigger twice.

**Solution:**
- Added 30-second Undo banner for status actions.
- Saved the pending action, backups, and expiration time to `sessionStorage` (`tm_pending_action_candidates`).
- Synced and verified `sessionStorage` on page mount, allowing users to return to the page and still trigger the Undo command or let the timer run down.

---

## 5. Server-Enforced Worker Locking (Gap B)

**Problem:** Standard client-side lock checking (`locked_at < now - 10m`) was prone to race conditions or bypasses, enabling multiple browser instances or workers to claim the same export job.

**Solution:**
- Created database migration `013_claim_export_job.sql` introducing `claim_export_job(job_id, worker_id)` RPC function in Postgres.
- Executed updates inside a single database transaction, ensuring atomically that jobs are only claimed if their status is `pending` or `running` with an expired lock (`locked_at < now() - INTERVAL '10 minutes'`).
- The client-worker invokes `claim_export_job` via RPC, making claiming operations strictly server-enforced.

---

## 6. Observability Storage Safety (Gap C)

**Problem:** Excessive trace logs or metrics stored in `localStorage` could lead to browser storage exhaust errors or slow page performance.

**Solution:**
- Enforced a strict maximum limit of `500` raw trace entries in local storage.
- Aggregated metrics are pruned automatically to keep daily metrics for a rolling `30-day` retention window, and raw traces for `7 days`.
- Integrated automated pruning hooks in `lib/observability.ts`.

---

## 7. Export Progress Recovery on Reload (Gap D)

**Problem:** Page refreshes or navigation terminated active client-worker export processes, leaving the export progress banner lost.

**Solution:**
- Saved the active export job ID to `sessionStorage` (`tm_active_export_candidates_job_id`) during export.
- On mount, the page queries `export_jobs` for the job's current status and retrieves related records from `export_job_items` table.
- If the status is pending or running, the worker is automatically resumed and claims the lock, restoring progress seamlessly.

---

## 8. File Changes

| File | Change | Role |
|---|---|---|
| `app/dashboard/admin/candidates/page.tsx` | [MODIFY] Added `internalNavRef`, selection wiring, optimistic states, undo storage, and UI skeleton loaders | UI Page |
| `hooks/useSelection.ts` | [NEW] Reusable page-scoped selection tracking hook | Helper Hook |
| `app/dashboard/admin/_components/BulkConfirmModal.tsx` | [NEW] Verification drawer/modal for bulk actions | UI Component |
| `lib/mutationQueue.ts` | [NEW] Local client-side serialization and idempotency execution queue | Infrastructure |
| `lib/observability.ts` | [MODIFY] Observability logs with limits (500 traces max, 30 days retention) | Observability |
| `insforge/migrations/013_claim_export_job.sql` | [NEW] RPC function migration for server-enforced worker lock claiming | DB Migration |
| `insforge/functions/admin-candidates/index.ts` | [MODIFY] Edge function supporting pagination, sort, search, and bulk operations | Backend Function |
| `e2e/admin-stabilization.spec.ts` | [NEW] Spec file for Playwright E2E verification of candidates, state synchronization, and mock RPC locking | Testing |

---

## 9. Verification & E2E Tests

| Check | Status |
|---|---|
| Search updates URL parameter and persists across page reloads | ✅ Verified |
| Clearing search and filters resets search input and lists all candidates | ✅ Verified |
| Bulk selection floating bar is responsive and displays correct counts | ✅ Verified |
| Bulk actions trigger BulkConfirmModal confirmation step | ✅ Verified |
| Mobile drawer is responsive and scroll locks correctly on viewport sizes <= 768px | ✅ Verified |
| Pending undo action survives tab/page navigation via sessionStorage | ✅ Verified |
| Server-enforced lock claim RPC is called and mock validated | ✅ Verified |
| Active export job is recovered and worker resumed after refresh | ✅ Verified |
| Playwright E2E tests run successfully (6/6 passing) | ✅ Verified |

---

## Changelog

| Date | Change | Author |
|---|---|---|
| 2026-06-10 | Updated Candidate Management Technical Audit report for Phase C | Antigravity |
