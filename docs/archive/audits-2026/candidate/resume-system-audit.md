# Candidate Resume System — Technical Audit Report

**Feature Area:** Candidate  
**Audit Date:** 2026-06-09  
**Audited By:** External technical review (shared by collaborator)  
**Status:** 🔴 Critical bugs found — Implementation in progress

---

## 1. Executive Summary

This report covers a thorough technical audit of the candidate-side resume and profile management system. Multiple critical bugs and design discrepancies were identified:

- A **major validation bug** in the job application flow blocking users from applying with existing resumes.
- **Missing Storage RLS policies** for `resumes` and `avatars` buckets causing client SDK operations to fail.
- **Missing Authorization headers** in the API wrapper for the `upload-resume` edge function.
- **Overly permissive SELECT policy** on `candidate_resumes` allowing any authenticated user to see all resume records.

---

## 2. System Components Overview

| Component | File | Role |
|---|---|---|
| Apply page | `app/jobs/[id]/apply/page.tsx` | Job application with resume selection/upload |
| Resume Manager | `components/candidate/ResumeManager.tsx` | Upload, manage, label, delete up to 5 resumes |
| Profile page | `app/dashboard/candidate/[role_id]/profile/page.tsx` | Displays and updates primary resume URL |
| Storage API wrapper | `lib/api/storage.ts` | Helper for resume upload edge function |
| Edge function | `insforge/functions/candidate-applications/index.ts` | Registers job applications to DB |
| Edge function | `insforge/functions/candidate-profile/index.ts` | Updates candidate profile fields |
| Migration | `insforge/migrations/004_candidate_resumes.sql` | Schema and RLS for candidate_resumes table |

---

## 3. Bugs Found

### 🚨 BUG-001 — Job Application Blocks Existing Resume Selection
**Severity:** Critical  
**Status:** 🔴 Open → Implementation planned  
**File:** [`app/jobs/[id]/apply/page.tsx:L85`](file:///d:/Talentmesh-AI-Recruiting-/app/jobs/%5Bid%5D/apply/page.tsx#L85)

**Root Cause:**
```typescript
// Current (broken):
if (!resume) {  // resume = File | null (new upload state)
  alert('Please upload your resume.');
  return;
}
```
When a candidate selects an existing resume from the radio list, `resume` (the `File` state for new uploads) stays `null`. The guard fires and blocks submission unconditionally.

**Fix:**
```typescript
const isUploadingNew = !selectedResumeId || selectedResumeId === 'new';
if (isUploadingNew && !resume) {
  alert('Please upload your resume.');
  return;
}
```

---

### 🚨 BUG-002 — Missing Storage RLS Policies (resumes + avatars Buckets)
**Severity:** Critical  
**Status:** 🔴 Open → SQL migration planned  
**File:** Database — `storage.objects` RLS policies

**Root Cause:** The `resumes` bucket is private (`public: false`) and `avatars` is public. Neither has any INSERT, SELECT, or DELETE policies on `storage.objects`. All client-side uploads (resumes & avatars) are blocked at the database level.

**Fix:** See `shared/storage-rls-audit.md` — SQL policies to be applied via migration `010_storage_rls.sql`.

---

### 🚨 BUG-003 — Profile Resume and Resume Manager Are Out of Sync
**Severity:** High  
**Status:** 🟡 Partially mitigated — `ResumeManager.tsx` syncs `candidate_profiles.resume_url` on default toggle, but `ProfilePage.tsx` upload does NOT insert to `candidate_resumes`

**Root Cause:**
- `ProfilePage.tsx` → uploads directly, updates `candidate_profiles.resume_url`, never inserts to `candidate_resumes`.
- `ResumeManager.tsx` → inserts to `candidate_resumes`, syncs `candidate_profiles.resume_url` only on default set.

**Fix:** Add `primary_resume_id` column to `candidate_profiles` and establish `candidate_resumes` as single source of truth.

---

### ⚠️ BUG-004 — Authorization Header Missing in `uploadResume` Storage Wrapper
**Severity:** Medium  
**Status:** 🟡 Currently inactive (profile page doesn't use this wrapper), but would fail if called  
**File:** `lib/api/storage.ts:L50`

**Root Cause:** `lib/api/storage.ts`'s `uploadResume()` function does not pass `Authorization: Bearer <token>` header, but the `upload-resume` edge function requires it.

**Fix:** Add `Authorization` header in the fetch call, or inject the session token from `insforge.auth`.

---

### 🔒 BUG-005 — Overly Permissive SELECT Policy on `candidate_resumes`
**Severity:** High (Security)  
**Status:** 🔴 Open → SQL migration planned  
**File:** `insforge/migrations/004_candidate_resumes.sql:L28`

**Current policy:**
```sql
CREATE POLICY candidate_resumes_select ON public.candidate_resumes FOR SELECT USING (
  candidate_id = auth.uid() OR auth.role() = 'authenticated'
);
```
Any logged-in user can SELECT any resume record.

**Fix:**
```sql
CREATE POLICY candidate_resumes_select ON public.candidate_resumes FOR SELECT USING (
  candidate_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')) OR
  EXISTS (
    SELECT 1 FROM public.applications a
    JOIN public.jobs j ON j.id = a.job_id
    WHERE a.resume_id = candidate_resumes.id AND j.recruiter_id = auth.uid()
  )
);
```

---

### ⚠️ BUG-006 — `upload-resume` Edge Function Trusts `userId` from FormData
**Severity:** Medium (Security)
**Status:** 🟡 Open  
**File:** `insforge/functions/upload-resume/index.ts`

**Root Cause:** The function extracts `userId` from formData rather than from the validated JWT token. A malicious user could spoof `userId` in the form body to write to another user's storage path.

**Fix:** Extract user ID exclusively from the server-validated token (`auth.getCurrentUser().data.user.id`), not from request body/formData.

---

## 4. Confirmed Good Practices

| Practice | Location | Notes |
|---|---|---|
| Dynamic PDF import with `ssr: false` | `ResumePreviewModal.tsx` | Prevents hydration errors |
| URL whitelist in PDF viewer | `PdfViewer.tsx:L9-25` | Blocks XSS via iframe |
| Storage cleanup on delete | `ResumeManager.tsx:L234` | Prevents orphaned files |
| Optimistic UI with rollback | `ResumeManager.tsx:toggleDefault` | Fast UX, safe fallback |
| Content-Disposition rewrite to `inline` | `app/api/v1/remote/[...path]/route.ts` | Forces PDF preview not download |
| Dirty state debounce (200ms) | `useProfileDirtyState` hook | Prevents expensive serialization per keystroke |

---

## 5. Architecture Decisions

### Storage Provider Abstraction
**Current:** Absolute URLs in `file_url` (insforge-tied)
**Target:** Three-column storage abstraction:
```
storage_provider = 'insforge'   -- future: 's3', 'r2', 'gcs'
storage_bucket   = 'resumes'
storage_key      = 'user-uuid/1234_file.pdf'   -- relative path
```
Enables InsForge → S3 → Cloudflare R2 → GCS migration without DB rewrite.

### Resume Versioning
Add `resume_version INTEGER DEFAULT 1` and `resume_status TEXT DEFAULT 'active'` (`active` / `archived` / `deleted`) to `candidate_resumes`. Applications always reference their original version via `resume_snapshot_key` — immune to future edits.

### Primary Resume Architecture
**Current:** `candidate_profiles.resume_url` (string URL, insforge-tied)
**Target:** `primary_resume_id UUID` → FK to `candidate_resumes(id)`, single source of truth
**Transition:** Write both simultaneously (weeks 1–4), then drop `resume_url`

### Resume Snapshotting
**Current:** `applications.resume_url` — mutable URL
**Target:** `resume_snapshot_key TEXT` + `snapshot_provider` + `snapshot_bucket` — immutable relative path captured at submission time

### Search & Talent Pool Readiness
Three columns added to `candidate_profiles` (schema-ready, implementation deferred):
- `search_index TSVECTOR` — full-text search
- `skills_vector JSONB` — structured skills for filtering
- `embedding_version INTEGER` — AI embedding version tracking

### Feature Flag Deployment
All Phase 1 UI changes gated by `NEXT_PUBLIC_FEATURE_RESUME_V2`. Rollout: 5% → 25% → 50% → 100%. Rollback = disable flag, no redeploy.

---

## 6. Database Schema Changes Required

**Migrations 010–016** (run in order in InsForge SQL Editor)

```sql
-- candidate_resumes: storage abstraction + versioning
ALTER TABLE public.candidate_resumes
  ADD COLUMN IF NOT EXISTS storage_provider TEXT DEFAULT 'insforge',
  ADD COLUMN IF NOT EXISTS storage_bucket   TEXT DEFAULT 'resumes',
  ADD COLUMN IF NOT EXISTS storage_key      TEXT,
  ADD COLUMN IF NOT EXISTS resume_version   INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS resume_status    TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS resume_type      TEXT DEFAULT 'General';

-- candidate_profiles: primary resume + discoverability + AI readiness
ALTER TABLE public.candidate_profiles
  ADD COLUMN IF NOT EXISTS primary_resume_id UUID REFERENCES public.candidate_resumes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_discoverable   BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS search_index      TSVECTOR,
  ADD COLUMN IF NOT EXISTS skills_vector     JSONB,
  ADD COLUMN IF NOT EXISTS embedding_version INTEGER DEFAULT 0;

-- applications: snapshot with storage abstraction
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS resume_id           UUID REFERENCES public.candidate_resumes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS resume_snapshot_key TEXT,
  ADD COLUMN IF NOT EXISTS snapshot_provider   TEXT DEFAULT 'insforge',
  ADD COLUMN IF NOT EXISTS snapshot_bucket     TEXT DEFAULT 'resumes';

-- file_migrations: future storage provider migration support
CREATE TABLE IF NOT EXISTS public.file_migrations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_provider TEXT NOT NULL,
  target_provider TEXT NOT NULL,
  old_key         TEXT NOT NULL,
  new_key         TEXT,
  status          TEXT DEFAULT 'pending',   -- pending | running | done | failed
  error_message   TEXT,
  migrated_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);
```

---

## 7. 5-Resume Limit Trigger

Trigger counts only `resume_status = 'active'` rows to allow soft-deleted versions to remain:

```sql
CREATE OR REPLACE FUNCTION public.check_resume_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.candidate_resumes
      WHERE candidate_id = NEW.candidate_id AND resume_status = 'active') >= 5 THEN
    RAISE EXCEPTION 'Maximum limit of 5 resumes reached. Please delete one before uploading a new version.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS before_resume_insert ON public.candidate_resumes;
CREATE TRIGGER before_resume_insert
  BEFORE INSERT ON public.candidate_resumes
  FOR EACH ROW EXECUTE FUNCTION public.check_resume_limit();
```

---

## 8. Admin Bypass Requirements

Admins must bypass all candidate-level restrictions:

| Permission | Rule |
|---|---|
| View all candidates | Ignore `is_discoverable` flag |
| View & download all resumes | Bypass recruiter/credit unlock checks |
| Access talent pool without credits | Bypass `recruiter_unlocks` ledger |
| View candidate contact info | No restriction for admin/super_admin roles |

---

## 9. Future Talent Pool Compatibility

This architecture directly supports the future recruiter unlock credits flow:

```
Candidate uploads 5 resumes → sets Primary
Enables is_discoverable = true

Recruiter searches talent pool
→ Sees candidate card
→ Unlocks candidate (credits deducted)
→ Views primary resume + contact info
```

No schema redesign required when credits are implemented.

---

## Changelog

| Date | Change | Author |
|---|---|---|
| 2026-06-09 | Initial audit created from collaborator review | External |
| 2026-06-09 | Architecture updated — storage abstraction, resume versioning, file_migrations table, feature flag strategy, talent pool readiness | Migration Readiness Review |

---

> **Update this file** whenever you change resume upload logic, RLS policies, schema, or the apply page flow.
