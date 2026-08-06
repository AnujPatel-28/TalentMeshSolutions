# Phase C: Admin Stabilization Backlog Items

These non-blocking backlog items are registered for future release iteration, following the acceptance of Phase C.

---

### Item A — Replace Per-Page Export Session Keys
- **Description**: Refactor candidate and recruiter background export session keys into a single object under a unified key `tm_active_export_jobs` in `sessionStorage`.
- **Target Structure**:
  ```json
  {
    "candidate": "job1_uuid",
    "recruiter": "job2_uuid"
  }
  ```
- **Files Affected**:
  - `app/dashboard/admin/candidates/page.tsx`
  - `app/dashboard/admin/recruiters/page.tsx`
- **Priority**: 🟡 Medium

---

### Item B — Add Export Heartbeat
- **Description**: Add `heartbeat_at` timestamp tracking to the `export_jobs` table to automatically reclaim crashed workers if heartbeats grow stale (> 120s).
- **Target Schema**:
  ```sql
  ALTER TABLE public.export_jobs ADD COLUMN IF NOT EXISTS heartbeat_at TIMESTAMPTZ;
  ```
- **Priority**: 🟡 Medium

---

### Item C — Add Export Cancel
- **Description**: Add states `cancel_requested` and `cancelled` to `export_jobs` and create a UI cancel button to enable admins to terminate long-running processes manually.
- **Priority**: 🟢 Low

---

### Item D — Add Bulk Action Audit Expansion
- **Description**: Expand `audit_log` records to capture telemetry metrics including `selection_size`, `undo_used`, and `retry_count`.
- **Priority**: 🟢 Low
