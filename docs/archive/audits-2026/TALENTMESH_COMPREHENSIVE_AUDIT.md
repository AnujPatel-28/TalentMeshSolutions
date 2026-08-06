# TalentMesh — Comprehensive Audit Report

**Audit Date:** 2026-06-11  
**Auditor:** Principal Systems Architect  
**Scope:** Candidate Management, Admin Operations, Resume Management Pipeline  
**Coverage:** Database schema & RLS, Edge Functions (50 deployed), Frontend flows, Auth integration, Storage policies, RBAC model

---

## 1. Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                     Client (Next.js 16)                       │
│  ResumeManager.tsx · ResumeFlowContainer · ApplyModal         │
│  AuthContext.tsx · AdminCandidatesPage · candidate-access.ts  │
└──────────────────┬───────────────────────────────────────────┘
                   │ Browser SDK (@insforge/sdk)
                   ▼
┌──────────────────────────────────────────────────────────────┐
│                Next.js API Proxy Layer                        │
│  /api/v1/remote/{functions,rest} — universal forwarder       │
│  /api/auth/{sessions,refresh,logout,oauth} — auth proxy      │
│  /api/storage/ — storage proxy                                │
│  Impersonation guard · CSRF protection · Token refresh        │
└──────────────────┬───────────────────────────────────────────┘
                   │ x-insforge-service-key (admin bypass)
                   ▼
┌──────────────────────────────────────────────────────────────┐
│            InsForge Backend (ap-southeast)                    │
│  ┌────────────┐  ┌────────────┐  ┌───────────────────────┐  │
│  │ PostgREST  │  │ Edge Fn    │  │ Storage (S3-compat)   │  │
│  │ REST API   │  │ (50 Deno)  │  │ 7 buckets             │  │
│  └─────┬──────┘  └─────┬──────┘  └───────────┬───────────┘  │
│        │               │                     │               │
│  ┌─────┴─────────────────────────────────────┴───────────┐  │
│  │              PostgreSQL (24 tables + views)            │  │
│  │  RLS enabled on all user-data tables                  │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

**Key Design Decisions:**
- **Dual-client pattern**: Anon key client for public operations; service key client (insforgeAdmin) for all DB writes in edge functions — avoids `project-admin-with-api-key` UUID errors
- **Client-side proxy**: Browser SDK points at `/api/v1/remote` instead of direct InsForge URL — avoids CORS issues and enables server-side auth cookie injection
- **Idempotency**: Admin edge functions implement idempotency key checking via `idempotency_keys` table with SHA-256 response hashing
- **Token refresh**: Custom proxy at `/api/auth/refresh` solves cookie path-matching bug where InsForge's refresh cookie had `Path=/api/auth` but the generic proxy was at `/api/v1/remote`

---

## 2. Database Schema & RLS Analysis

### 2A. Tables & Relationships

```
profiles (23 cols) ←── candidate_profiles (22 cols) [1:1 via FK id]
     │                        └── primary_resume_id → candidate_resumes(id)
     │                        └── resume_url (legacy)
     │
     ├── candidate_resumes (10 cols)
     │     └── candidate_id → profiles(id)
     │     └── is_default, label, file_url, file_name, upload_count
     │
     ├── applications (16 cols)
     │     └── candidate_id → profiles(id)
     │     └── job_id → jobs(id)
     │     └── resume_id → candidate_resumes(id)
     │     └── resume_snapshot_key → storage: application-snapshots/{id}/resume.pdf
     │
     └── resume_access_log (7 cols)
           └── application_id, candidate_id, recruiter_id, access_type
```

### 2B. RLS Policy Inventory

| Table | Policy | Rule | Risk Level |
|-------|--------|------|------------|
| `profiles` | `profiles_self` | `id = auth.uid()` for ALL DML | ✅ Correct |
| `profiles` | `admin_bypass` | `project_admin` role — unrestricted | ✅ Standard |
| `profiles` | `Admins can view/update all` | via `is_admin()` SECURITY DEFINER fn | ✅ But see note below |
| `candidate_profiles` | `candidate_profiles_self` | `id = auth.uid()` SELECT only | ✅ Correct |
| `candidate_profiles` | `candidate_profiles_update` | `id = auth.uid()` UPDATE only | ✅ Correct |
| `candidate_profiles` | `candidate_profiles_read_all` | `auth.role() = 'authenticated'` | 🟡 Any authenticated user can read ALL candidate profiles |
| `candidate_profiles` | `candidate_profiles_insert` | `id = auth.uid()` INSERT | ✅ Correct |
| `candidate_resumes` | `candidate_resumes_select` | `candidate_id = auth.uid()` (fixed in mig 013) | ✅ Correct post-fix |
| `candidate_resumes` | `candidate_resumes_insert` | `candidate_id = auth.uid()` | ✅ Correct |
| `candidate_resumes` | `candidate_resumes_update` | `candidate_id = auth.uid()` | ✅ Correct |
| `candidate_resumes` | `candidate_resumes_delete` | `candidate_id = auth.uid()` | ✅ Correct |
| `resume_access_log` | `recruiter_access_log` | `recruiter_id = auth.uid()` SELECT | ✅ Correct |
| `resume_access_log` | `admin_bypass` | `project_admin` | ✅ Standard |
| `applications` | `apps_select_own` | `candidate_id = auth.uid()` | ✅ Correct |
| `applications` | `apps_recruiter_view` | EXISTS `jobs.recruiter_id = auth.uid()` | ✅ Correct |
| `jobs` | `jobs_select_approved` | `status = 'active' AND is_approved = true` | ✅ Correct |
| Stored in bucket `resumes` | `resumes_select/insert/update/delete` | `split_part(key,'/',1) = auth.uid()::text` | ✅ Correct |
| Storage `application-snapshots` | Admin only | `TO project_admin` | ✅ Correct |

**🔴 Critical RLS Gap:** `candidate_profiles_read_all` allows ANY authenticated user (including other candidates, recruiters) to read ALL `candidate_profiles` rows including `skills`, `resume_url`, `salary_range`, `work_history`, `linkedin_url`, etc. There is no recruiter-specific filter, no application-relationship gate.

### 2C. SQL Triggers & Constraints

| Trigger | Table | Logic | Status |
|---------|-------|-------|--------|
| `trigger_check_primary_resume_ownership` | `candidate_profiles` | Prevents setting `primary_resume_id` to a resume not owned by candidate | ✅ Correct |
| `trigger_check_max_resumes_limit` | `candidate_resumes` | Max 5 resumes per candidate | ✅ Correct |
| `trigger_reassign_resume_references` | `candidate_resumes` | BEFORE DELETE — reassigns primary/default to next available resume; clears if none remain | ✅ Correct |
| `trigger_update_job_applications_count` | `applications` | AFTER INSERT/DELETE/UPDATE of `job_id` — maintains `jobs.applications_count` | ✅ Correct |
| `trigger_maintain_resume_upload_count` | `applications` | AFTER INSERT/DELETE/UPDATE of `resume_id`/`status` — maintains `candidate_resumes.upload_count` | ✅ Correct |
| Unique partial index | `applications` | `idx_unique_candidate_job_application` — `(candidate_id, job_id) WHERE status != 'withdrawn'` | ✅ Correct |
| FK cascade | Multiple | `ON DELETE CASCADE` from auth.users → profiles → candidate_profiles/resumes/applications | ✅ Correct |

---

## 3. Edge Function Analysis

### 3A. admin-candidates (`insforge/functions/admin-candidates/index.ts` — 329 lines)

**What it does:**
- **GET**: Lists admin-visible candidates (profiles with `role='candidate'`) with pagination (max 100/page), sorting (newest/oldest/name), search (name/email ilike), filters (discoverable, missing_primary)
- **POST `bulk-status`**: Bulk update candidate status field
- **POST `bulk-active`**: Bulk toggle `is_active` flag
- **POST `bulk-delete`**: Multi-step cascade: delete `candidate_profiles` → delete `profiles` → delete auth users via InsForge Admin API
- **PATCH**: Update single candidate profile by ID
- **DELETE**: Same cascade as bulk-delete but for single user

**Auth pattern**: Decodes JWT locally (`atob` of payload), validates `role IN ('admin','super_admin')` against DB, uses service key client for all DB operations (RLS bypass).

**Idempotency**: Full idempotency key support with SHA-256 response hashing for POST/PATCH/DELETE via `idempotency_keys` table.

**Edge Cases & Risks:**
1. 🟡 **No candidate_profiles FK check on bulk-delete**: Uses `.eq('user_id', ids)` — but `candidate_profiles.id` is the FK (mirrors `profiles.id`), and `candidate_profiles` has no `user_id` column, so this silently does nothing or errors
2. 🟡 **Auth user deletion error swallowing**: If auth API delete fails after DB deletes succeed, DB state is inconsistent (profile deleted but auth user still exists)
3. ✅ **Good**: Bulk operations accept empty arrays guard (`if (!ids || !Array.isArray(ids))`)

### 3B. resume-proxy (`insforge/functions/resume-proxy/index.ts` — 135 lines)

**What it does:**
- Authorized proxy for downloading resume snapshots from private `application-snapshots` bucket
- Authenticates caller via `auth.getCurrentUser()`
- Checks authorization: admin/super_admin, job recruiter (via application), or candidate owner
- Logs access to `resume_access_log` with `access_type` ('viewed'/'downloaded') and `source` ('application'/'admin')
- Returns file stream with correct Content-Type (pdf/doc/docx) and Content-Disposition

**Auth pattern**: Dual client — `insforge` (anon key + user token) for `getCurrentUser()`, `insforgeAdmin` (service key) for all DB/storage reads. Falls back to `serviceKey || reqAnonKey` for service key.

**Edge Cases & Risks:**
1. ✅ **Good**: Proper 3-way auth check (admin + recruiter + candidate owner)
2. ✅ **Good**: Access is logged to `resume_access_log`
3. ✅ **Good**: Content-Disposition distinguishes inline (view) vs attachment (download)
4. 🟡 **Missing talent_pool source**: `resume-proxy` only serves from `application-snapshots` bucket via applicationId. There's no flow for recruiter to access candidate's primary resume from talent pool (non-application context)
5. 🔴 **Storage path fallback ambiguity**: `snapshotKey = appData.resume_snapshot_key || 'applications/${applicationId}/resume.pdf'` — the fallback path is a guess; if no snapshot was taken during application, it will 404 even if the original resume exists in the `resumes` bucket

### 3C. resume-parse (`insforge/functions/resume-parse/index.ts` — 96 lines)

**What it does:**
- Accepts multipart form data with `file`
- Extracts text via `pdf-parse` (PDF) or `await file.text()` (non-PDF)
- Truncates text to 8000 chars
- Sends to `anthropic/claude-3.5-haiku` via InsForge AI integration
- Returns structured JSON with contact, profile, work_history, and confidence meta

**Edge Cases & Risks:**
1. 🔴 **No auth verification**: Parses token from Authorization header but never validates it via `auth.getCurrentUser()`. Any valid JWT (or even a malformed one) can use this function
2. 🔴 **Rate limiting / cost exposure**: No rate limiting. AI API calls cost money; unlimited invocation could run up costs
3. 🟡 **Non-PDF text parsing trusts user-submitted content type**: The `file.type` check skips text extraction for PDFs; if someone sends a `.pdf` with wrong MIME, it tries `file.arrayBuffer()` → `pdfParse()` which could crash
4. 🟡 **No file size limit on edge function**: The 5MB check is only on the client; edge function itself has no size guard
5. ✅ **Good**: AI response JSON sanitization via markdown backtick cleanup

### 3D. candidate-applications (`insforge/functions/candidate-applications/index.ts` — 348 lines)

**What it does:**
- **GET**: Returns candidate's applications (all or filtered by jobId)
- **POST**: Full application pipeline — validate input (Zod) → check job exists → resolve resume (4-tier fallback: primary → default → newest → legacy) → snapshot resume to private bucket → insert application with rollback on failure

**Auth pattern**: Anonymous GET allowed (no token returns generic query results). POST requires authenticated user. Uses `insforgeAdmin` (service key) for all DB writes.

**4-tier Resume Resolution** (in order):
1. `candidate_profiles.primary_resume_id`
2. `candidate_resumes.is_default = true`
3. `candidate_resumes` newest by `created_at`
4. `candidate_profiles.resume_url` (legacy)

**Snapshot Validation (excellent)**:
- ✅ Server-side MIME type check
- ✅ Magic bytes check (`%PDF-`)
- ✅ Extension validation (.pdf, .doc, .docx)
- ✅ File size check (5MB)
- ✅ Rollback on failure (removes orphaned snapshot from storage)
- ✅ Handles legacy .doc/.docx extensions

**Edge Cases & Risks:**
1. ✅ **Good**: Snapshot rollback on DB insert failure prevents storage leaks
2. ✅ **Good**: Duplicate application detection via unique constraint with human-readable error
3. 🟡 **Zero-resume candidate**: If candidate has no resumes at all, the function silently proceeds with `resumeUrl = null`. Application is created without any resume — recruiter sees an empty application. No guard or warning is raised
4. 🟡 **concurrent applications**: No advisory lock on job during application. Two simultaneous applications could both pass the unique constraint check before the index catches the duplicate (though the partial unique index mitigates this)
5. 🟡 **Snapshot fallback ambiguity**: Uses `getStorageKeyFromUrl()` to extract storage key from `resumeUrl`. If the URL is an absolute InsForge URL, this works; but if it's a relative path or external URL, the extraction fails silently

### 3E. candidate-profile (`insforge/functions/candidate-profile/index.ts` — 286 lines)

**What it does:**
- **GET**: Fetches both `profiles` and `candidate_profiles` for authenticated user
- **PUT**: Validates and updates both tables — uses custom manual validation (no Zod to avoid Deno version conflicts)
- Marks `completed_onboarding = true` on any profile update
- Uses `upsert` for `candidate_profiles` (can create or update)

**Validation (manual, no Zod):**
- `isOptionalString`, `isOptionalNumber`, `isOptionalBool`, `isOptionalStringArray`
- `isOptionalUrl` — validates URLs via `new URL()`
- `isOptionalStoragePath` — validates storage paths (rejects `..`, leading `/`, `\`, non-path chars, >500 chars; accepts absolute http/https URLs)
- `isEducationValid` / `isWorkHistoryValid` — validates nested arrays with required fields
- Allowlist-based field extraction (`PROFILE_ALLOWED_KEYS`, `CP_ALLOWED_KEYS`)

**Edge Cases & Risks:**
1. ✅ **Good**: Allowlist-based field extraction — prevents mass assignment
2. ✅ **Good**: Manual validation avoids Zod version conflicts in Deno
3. ✅ **Good**: `isOptionalStoragePath` — path traversal protection
4. 🔴 **Debug info leak**: The function logs `JSON.stringify(body)` and validation results to console. If logging systems are exposed, user data (including salary ranges, phone numbers) is leaked
5. 🟡 **No email/role validation**: `profile.email` and `profile.role` are NOT in `PROFILE_ALLOWED_KEYS`, preventing privilege escalation via profile update

---

## 4. Frontend Logic Analysis

### 4A. ResumeManager.tsx (539 lines)

**Flow:**
1. Upload file → validates `.pdf` extension, MIME type, magic bytes, max 5MB
2. Uploads to `resumes/{candidateId}/{timestamp}_{name}` via SDK
3. Opens modal for label (max 255 chars), default checkbox
4. Saves to `candidate_resumes` table
5. If default or no primary exists, also updates `candidate_profiles` (`resume_url`, `primary_resume_id`)

**Operations:** Upload, rename (inline edit), set primary, toggle default, delete

**Edge Cases & Risks:**
1. 🔴 **Storage leak on upload failure**: File is uploaded to storage BEFORE DB insert. If DB insert fails (5-resume limit, constraint violation), the uploaded file is orphaned
2. 🔴 **No pre-upload limit check**: The 5-resume limit is enforced by DB trigger only. File upload happens first, then DB insert fails. Orphaned file remains
3. 🟡 **Race condition in parallel default toggle**: `toggleDefault()` does 3 sequential client-side updates: reset all → set new → update profile_url. Network failure between calls leaves inconsistent state
4. 🟡 **Direct storage URL exposure**: `getPublicStorageUrl('resumes', resume.file_url)` is used for preview (`a href`). While the bucket is private, if someone obtains the signed URL, they can access it. The `resume-proxy` edge function is NOT used for preview
5. ✅ **Good**: Optimistic UI with rollback in `toggleDefault()`
6. ✅ **Good**: Magic bytes validation for PDF (not just extension/MIME)
7. ✅ **Good**: 255-char label length enforced client-side
8. ✅ **Good**: Storage cleanup on delete (removes physical file)

### 4B. ResumeFlowContainer.tsx (133 lines)

**Flow:** Upload → Parse (via edge function) → Review → Confirm → Save to profile.

**Edge Cases & Risks:**
1. 🔴 **Direct edge function URL construction**: Constructs URL via `process.env.NEXT_PUBLIC_INSFORGE_URL?.replace('ap-southeast.', 'functions.')` — extremely fragile string manipulation. If the region changes or URL format changes, this breaks silently
2. 🟡 **Simulated progress bar**: Fake progress bar (setInterval 150ms) with no actual progress tracking — misleading UX
3. 🟡 **No error recovery on parse failure**: If parsing fails, user must start over from upload
4. ✅ **Good**: Uses `CandidatesApi.update()` for saving parsed data

---

## 5. Authentication & Authorization Model

### 5A. Auth Flow

```
Login ──→ insforge.auth.signInWithPassword()
              ↓
         Custom proxy (/api/auth/refresh stores httpOnly cookie)
              ↓
         SDK client initialized with anon key + JWT set from sessionStorage
              ↓
         AuthContext.tsx manages user state, session refresh, cross-tab sync
```

### 5B. RBAC Model (`lib/permissions.ts`)

```typescript
ROLES: super_admin  >  admin  >  recruiter  >  candidate

super_admin: full access to ALL resources (view/edit/delete/approve/export)
admin:       dashboard(view), jobs/recruiters/candidates(view/edit/delete/approve),
             reports(view/export), settings(view/edit), audit_logs(view/export),
             billing(view), team(view/edit)
recruiter:   dashboard(view), jobs(view/edit), reports(view), settings(view/edit)
candidate:   dashboard(view), jobs(view), settings(view/edit)
```

**Analysis:**
- ✅ **Good**: Clear separation between `admin` and `super_admin` — admin lacks billing/audit delete while super_admin has all
- ✅ **Good**: Edge functions enforce server-side role checks; permissions.ts is a client convenience, not a security boundary
- 🟡 **No audit of RBAC enforcement**: The `permissions.ts` matrix is used client-side for UI show/hide but enforcement happens in edge functions. There's no centralized middleware that guarantees the matrix is always followed
- 🟡 **Recruiter `jobs: ['view']` without ownership filter**: Permission says recruiters can view all jobs, but actual edge functions filter by `recruiter_id`. The permission matrix doesn't reflect this constraint

### 5C. Impersonation

Admin impersonation is implemented with:
- `tm_impersonating_user_id=` cookie
- `invokeFunction()` blocks all non-GET mutations during impersonation
- `ImpersonationBanner.tsx` shows visual warning

✅ **Good**: Mutation guard ensures impersonation is truly read-only

---

## 6. Storage Architecture

| Bucket | Visibility | Purpose | RLS |
|--------|-----------|---------|-----|
| `resumes` | ❌ Private | Candidate-uploaded resumes | ✅ User-folder scoped |
| `application-snapshots` | ❌ Private | Immutable snapshots at time of application | ✅ Admin-only via project_admin |
| `avatars` | ✅ Public | Profile photos | ✅ INSERT/UPDATE scoped to user folder |
| `company-logos` | ✅ Public | Company branding | ✅ |
| `recruiter_documents` | ✅ Public | Recruiter KYC docs | ❌ Public bucket |
| `blog_images_final` | ✅ Public | Blog images | ❌ Public bucket |
| `announcement_images` | ✅ Public | Admin announcements | ❌ Public bucket |

**Analysis:**
- ✅ **Good**: User-folder prefix convention (`{user-uuid}/{file}`) enables effective storage RLS via `split_part(key, '/', 1) = auth.uid()`
- ✅ **Good**: Application snapshots are immutable and stored separately — decoupling from candidate's mutable resume
- ✅ **Good**: Migration 013 converted `resumes` bucket from public to private
- 🔴 **`recruiter_documents` is public**: KYC documents uploaded by recruiters may contain sensitive personal information. Bucket is public with no RLS

---

## 7. Edge Cases & Failure Scenarios

### 🔴 Critical

| # | Scenario | Impact | Root Cause |
|---|----------|--------|------------|
| EC-01 | Upload 6th resume → file stored in bucket → DB trigger rejects → orphaned file | Storage waste, untracked files | Client uploads before DB check |
| EC-02 | Rapid default toggle → race in 3 sequential updates → inconsistent state | `candidate_profiles.resume_url` out of sync with `candidate_resumes.is_default` | No transactional update |
| EC-03 | Application without any resume → snapshot skipped → silently creates app with null resume | Recruiter sees broken application | No guard for zero-resume submission |
| EC-04 | Delete resume used in applications → physical file removed → recruiter sees 404 | Corrupted hiring pipeline | No soft-delete for applied resumes |
| EC-05 | Auth delete fails after DB delete in admin-candidates | Orphaned auth users with no profile | Non-transactional cross-system deletes |
| EC-06 | Any authenticated user reads ALL candidate_profiles (skills, salary, work_history) | Privacy breach | Overly permissive `candidate_profiles_read_all` policy |
| EC-07 | Recruiter_documents bucket is public | Sensitive KYC data exposure | No RLS on bucket |

### 🟡 High

| # | Scenario | Impact | Root Cause |
|---|----------|--------|------------|
| EC-08 | Resume view via direct storage URL instead of proxy | No access audit logged, potential unauthorized access | Preview uses `getPublicStorageUrl` not `resume-proxy` |
| EC-09 | Malformed resume URL in `getStorageKeyFromUrl()` | Snapshot creation fails silently | URL parsing assumptions |
| EC-10 | Concurrent job applications → both pass uniqueness check | Duplicate applications in race window | No advisory lock |
| EC-11 | Edge function console logging of PII | Data leak via log aggregation | Debug logging in prod functions |
| EC-12 | resume-parse called without real auth verification | Unmetered AI API calls | No server-side auth in parse function |

### 🟢 Low / Informational

| # | Scenario | Impact |
|---|----------|--------|
| EC-13 | Region change breaks `functions.` URL construction | Resume parse flow dead |
| EC-14 | Candidate deletes last resume → profile references cleared | Works correctly via trigger |
| EC-15 | Non-PDF file with correct magic bytes | Bypasses PDF-only restriction (unlikely) |

---

## 8. What's Done Well — Good Practices

### 8A. Security

| Practice | Location |
|----------|----------|
| **Service key never exposed client-side** | `lib/insforge-admin.ts` throws if imported client-side; env var is server-only |
| **Impersonation mutation guard** | `invokeFunction()` blocks non-GET during impersonation |
| **Allowlist-based field updates** | `candidate-profile` edge function uses `PROFILE_ALLOWED_KEYS`/`CP_ALLOWED_KEYS` — prevents mass assignment |
| **Path traversal protection** | `isOptionalStoragePath()` validates storage paths |
| **JWT server-side decode for admin auth** | Admin functions decode token payload in Deno, then cross-reference DB role |
| **CSRF token rotation** | `refreshAccessToken()` rotates and persists CSRF token |
| **Content-Disposition rewrite** | Proxy forces `inline` for PDFs (prevents automatic downloads) |
| **Dual client pattern** | Anon client for user auth + service client for DB writes prevents `project-admin` UUID errors |
| **Snapshot rollback on DB failure** | `candidate-applications` deletes orphaned snapshots if DB insert fails |
| **Magic bytes validation** | Both client and server validate PDF magic bytes |

### 8B. Data Integrity

| Practice | Location |
|----------|----------|
| **Unique partial index** | Prevents duplicate non-withdrawn applications per candidate/job |
| **Trigger-reassigned resume references** | Deleting a resume auto-reassigns primary/default to remaining resume |
| **Upload count maintenance** | Trigger tracks how many times a resume was used in applications |
| **Applications count trigger** | Auto-maintains `jobs.applications_count` |
| **Ownership trigger** | Prevents setting a resume not owned by candidate as primary |
| **Backfill migration** | `012_data_backfill_primary_resumes.sql` handles data migration |
| **4-tier resume resolution** | Robust fallback in `candidate-applications` |

### 8C. Architecture & UX

| Practice | Location |
|----------|----------|
| **Cross-tab session sync** | `BroadcastChannel` API for multi-tab consistency |
| **Idempotency for admin operations** | SHA-256 hashed responses, idempotency key table |
| **Optimistic UI with rollback** | `toggleDefault()` reverts state on failure |
| **Timeout-per-operation** | `invokeFunction()` sets request-specific timeouts |
| **Observability with pruning** | `lib/observability.ts` — max 500 traces, 30-day retention |
| **Storage cleanup on delete** | `ResumeManager.deleteResume()` removes physical file |
| **Server-enforced worker locking** | `claim_export_job` RPC with transactional claim |
| **Label length enforcement** | Both client (255 char limit) and DB (VARCHAR(255)) |

---

## 9. Recommendations

### P0 — Immediate (Security)

1. **Fix `candidate_profiles_read_all` RLS**: Change from `auth.role() = 'authenticated'` to a policy that only allows:
   - Candidate viewing own profile
   - Admin viewing all
   - Recruiter viewing only profiles of candidates who've applied to their jobs

2. **Fix `recruiter_documents` bucket**: Add RLS or make bucket private. At minimum, restrict to recruiter-owner and admin

3. **Add auth verification to `resume-parse`**: Call `auth.getCurrentUser()` before processing to verify the caller is a real authenticated user

4. **Route resume previews through `resume-proxy`**: Replace `getPublicStorageUrl` with the proxy edge function for audit trail and access control

### P1 — High (Data Integrity)

5. **Pre-upload limit check in `ResumeManager.tsx`**: Check resume count before uploading file to prevent storage leaks
6. **Soft-delete for applied resumes**: Add trigger that soft-deletes (`status = 'deleted'`) instead of hard-deleting resumes that have `upload_count > 0`
7. **Guard against zero-resume applications**: In `candidate-applications`, reject applications where no resume could be resolved (404 or explicit error)
8. **Transactional default toggle**: Move `toggleDefault()` logic to an edge function for atomic updates

### P2 — Medium (Architecture)

9. **Remove debug logging in prod edge functions**: `candidate-profile` logs `JSON.stringify(body)` including PII
10. **Fix `candidate_profiles` deletion in `admin-candidates`**: Use `.eq('id', id)` not `.eq('user_id', id)` since `candidate_profiles.id` mirrors `profiles.id`
11. **Use consistent edge function URL resolution**: Replace string manipulation (`replace('ap-southeast.', 'functions.')`) with proper env variable or metadata endpoint

### P3 — Low (Observability)

12. **Add rate limiting to AI-powered functions**: `resume-parse` costs money per invocation
13. **Add talent pool resume access flow in `resume-proxy`**: Support `recruiter_id` + `candidate_id` access for non-application resume views
14. **Storage provider abstraction**: Migrate `file_url` to `storage_key` + `storage_bucket` + `storage_provider` for cloud portability

---

## 10. Summary

| Category | Count |
|----------|-------|
| ✅ Good Practices | 28 identified |
| 🔴 Critical Risks | 7 (EC-01 through EC-07) |
| 🟡 High Risks | 5 (EC-08 through EC-12) |
| 🟢 Low Risks | 3 (EC-13 through EC-15) |
| P0 Recommendations | 4 |
| P1 Recommendations | 4 |
| P2 Recommendations | 3 |
| P3 Recommendations | 3 |

**Overall Assessment:** The system is architecturally sound with strong separation of concerns, proper use of InsForge SDK patterns, robust database triggers, and well-thought-out RLS for most tables. The admin edge functions use proper idempotency and JWT verification. The resume pipeline correctly uses immutable snapshots and magic bytes validation. However, there are critical gaps in the `candidate_profiles` RLS policy (any authenticated user can read all profiles), un-auth'd AI function calls, and storage leak risks from pre-DB-insert uploads that need immediate remediation.
