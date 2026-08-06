# R-3 — One Audit Spine — Implementation Report

**Model:** Claude Opus 4.6 (Thinking)  
**Date:** 2026-07-19  
**Scope:** doc 14 §R-3, doc 12 audit findings, doc 13 audit section  

---

## 1. Live audit_log column shape (confirmed from migrations)

The `public.audit_log` table was created in `001_schema_and_rls.sql` and rebuilt/standardized in `010_schema_repair_drift_fix.sql`. The **live columns** are:

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | `gen_random_uuid()` |
| `actor_id` | UUID | FK `profiles(id)` ON DELETE SET NULL |
| `action` | TEXT NOT NULL | |
| `table_name` | TEXT | entity type |
| `record_id` | TEXT | entity id |
| `old_data` | JSONB | |
| `new_data` | JSONB | |
| `metadata` | JSONB | |
| `ip_address` | TEXT | |
| `user_agent` | TEXT | |
| `status` | TEXT | DEFAULT 'success' |
| `created_at` | TIMESTAMPTZ | DEFAULT now() |

**Not live:** `on_behalf_of`, `reason`, `target_type`, `target_id` — these do NOT exist on the live table.

All runtime audit writes in this PR use **only** the live columns above. Values that would go into `on_behalf_of` or `reason` (when relevant) are placed inside `metadata` until migration 055 is applied.

---

## 2. Migration authored (file only)

**File:** `insforge/migrations/055_audit_spine_hardening.sql`

Contents:
1. `ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS on_behalf_of uuid;`
2. `ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS reason text;`
3. `REVOKE UPDATE, DELETE ON public.audit_log FROM authenticated, anon, project_admin;` — append-only
4. Three indexes: `audit_log_actor_idx`, `audit_log_target_idx`, `audit_log_behalf_idx`

**Pre-check query and post-check query** are documented in the migration file header.

**NOT applied live.** Numbered 055 because 054 is already used for W5 (jobs_approval_status).

---

## 3. Bug fix — admin-jobs broken audit writes

The W5 approve/reject audit writes used `target_type` and `target_id` — columns that **do not exist** on the live `audit_log` table. These inserts were silently failing (caught+swallowed by the try/catch).

**Fix:** Changed to `table_name: 'jobs'` and `record_id: id` to match the live schema.

---

## 4. Audit writes added

### admin-jobs (`insforge/functions/admin-jobs/index.ts`)
| Action | Audit event | Columns used |
|---|---|---|
| approve (POST, existing — **fixed**) | `job_approved` | actor_id, action, table_name, record_id, metadata(reason), created_at |
| reject (POST, existing — **fixed**) | `job_rejected` | same |
| DELETE (single) | `job_deleted` | actor_id, action, table_name, record_id, created_at |
| bulk-delete (POST) | `jobs_bulk_deleted` | actor_id, action, table_name, record_id, metadata(deleted_ids, count), created_at |

### admin-candidates (`insforge/functions/admin-candidates/index.ts`)
| Action | Audit event | Columns used |
|---|---|---|
| bulk-active (suspension) | `candidates_unsuspended` / `candidates_suspended` | actor_id, action, table_name, record_id, metadata(target_ids, count, is_active), created_at |
| bulk-delete | `candidates_bulk_deleted` | actor_id, action, table_name, record_id, metadata(deleted_ids, count), created_at |
| DELETE (single) | `candidate_deleted` | actor_id, action, table_name, record_id, created_at |

Also added `userId` to the `requireStaff` destructure (was missing).

### admin-recruiters (`insforge/functions/admin-recruiters/index.ts`)
| Action | Audit event | Columns used |
|---|---|---|
| bulk-status | `recruiters_bulk_status_changed` | actor_id, action, table_name, record_id, metadata(target_ids, count, new_status), created_at |
| bulk-active (suspension) | `recruiters_unsuspended` / `recruiters_suspended` | actor_id, action, table_name, record_id, metadata(target_ids, count, is_active), created_at |
| bulk-delete | `recruiters_bulk_deleted` | actor_id, action, table_name, record_id, metadata(deleted_ids, count), created_at |
| PATCH (single is_active toggle) | `recruiter_unsuspended` / `recruiter_suspended` | actor_id, action, table_name, record_id, metadata(is_active), created_at |
| PATCH (profile update) | `recruiter_updated` | actor_id, action, table_name, record_id, metadata(fields_updated), created_at |
| DELETE (single) | `recruiter_deleted` | actor_id, action, table_name, record_id, created_at |

> Note: admin-recruiters is NOT on the R-2 shared kit. Audit writes use its existing `insforge` service client and `userData.id`.

### admin-applications (`insforge/functions/admin-applications/index.ts`)
| Action | Audit event | Columns used |
|---|---|---|
| DELETE | `application_deleted` | actor_id, action, table_name, record_id, created_at |

### admin-export-audit (`insforge/functions/admin-export-audit/index.ts`)
| Action | Audit event | Columns used |
|---|---|---|
| GET (export) | `export_started` | actor_id, action, table_name, record_id, metadata(export_type, filters, row_count), created_at |

---

## 5. Unchanged files (no gaps)

| File | Reason |
|---|---|
| `admin-settings/index.ts` | Already writes to `audit_log` (singular) for add_admin, update_role, update_settings, toggle_feature, remove_admin — all actions covered |
| `admin-audit/index.ts` | Standalone audit-write endpoint, already writes to `audit_log` correctly |
| `admin-audit-logs/index.ts` | Read-only viewer, reads `audit_log` — no writes needed |
| `_shared/permissions.ts` | `audit_logs` is a resource key name, not a table reference |
| `lib/permissions.ts` | Same — resource key name |

---

## 6. Design decisions

1. **All audit writes are fire-and-forget with try/catch.** A failed audit insert must not break the admin operation itself. This matches the existing pattern in admin-jobs and admin-settings.

2. **Bulk operations log one audit row with all IDs in metadata.** Alternative was one row per ID, but this matches the existing pattern and avoids N+1 inserts on bulk operations.

3. **admin-recruiters was not migrated to the shared kit.** Per scope rules (R-3 only, not R-2 migration), audit writes use its existing client. This means audit writes there use `insforge.database` instead of `db.database` and `userData.id` instead of `userId`.

4. **`on_behalf_of` and `reason` are NOT written as columns.** Per user directive: these values go inside `metadata` until migration 055 is applied. For example, job approval reason is in `metadata.reason`.

---

## 7. Verification output

### `npx tsc -p insforge/tsconfig.json`
```
(no output — zero errors)
```

### `npm run build`
```
> talentmesh-web@0.1.0 build
> next build

▲ Next.js 16.2.9 (Turbopack)
- Environments: .env.local
- Experiments (use with caution):
  · cpus: 2

  Creating an optimized production build ...
✓ Compiled successfully in 72s
  Skipping validation of types
  Finished TypeScript config validation in 186ms ...
  Collecting page data using 2 workers ...
  Generating static pages using 2 workers (0/108) ...
✓ Generating static pages using 2 workers (108/108) in 3.2s
  Finalizing page optimization ...
```

### Grep for remaining `audit_logs` plural in runtime code
```
Get-ChildItem -Path "insforge\functions" -Filter "*.ts" -Recurse |
  Select-String -Pattern "audit_logs" |
  Where-Object { $_.Path -notmatch "permissions\.ts" -and $_.Path -notmatch "admin-audit-logs" }

(no output — zero hits)
```

All `audit_logs` hits are in:
- `_shared/permissions.ts` — resource key name (not a table name) ✅
- `admin-audit-logs/index.ts` — URL path name (reads `audit_log` singular table) ✅

---

## 8. Audit coverage matrix (post R-3)

| Edge Function | Destructive/Sensitive Actions | Audited? |
|---|---|---|
| **admin-jobs** | approve, reject, DELETE, bulk-delete | ✅ all |
| **admin-candidates** | bulk-active (suspend), bulk-delete, DELETE | ✅ all |
| **admin-recruiters** | bulk-status, bulk-active (suspend), bulk-delete, PATCH, DELETE | ✅ all |
| **admin-applications** | DELETE | ✅ |
| **admin-export-audit** | CSV export | ✅ |
| **admin-settings** | add_admin, update_role, update_settings, toggle_feature, remove_admin | ✅ (pre-existing) |
| **admin-audit** | audit write endpoint | ✅ (is the writer) |
| **admin-companies** | POST (create), PATCH (update) | ❌ not in R-3 scope (R-6) |
| **admin-blogs** | CRUD | ❌ content, not admin-sensitive |
| **admin-announcements** | CRUD | ❌ content, not admin-sensitive |

---

## 9. What remains for full R-3 completion

1. **Apply migration 055** (human-only, after review)
2. **After 055:** refactor `metadata.reason` → dedicated `reason` column; add `on_behalf_of` writes where company context is available
3. **admin-companies audit writes** — deferred to R-6 (company-first admin)
4. **Universal search audit** (`admin_search` with query) — deferred; the current universal search is client-side parallel queries, not a dedicated edge function. Adding audit here requires either a new edge function or client-side audit call, both of which exceed R-3 scope.
