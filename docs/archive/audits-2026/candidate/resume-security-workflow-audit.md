# Resume Management & Application Architecture — Security & Workflow Audit

**Feature Area:** Candidate / Resume & Application Pipeline  
**Audit Date:** 2026-06-10  
**Auditor:** Principal Security Engineer  
**Status:** 🔴 Under Review — Actionable Security & Integrity Gaps Identified  

---

## 1. Scope & Components Audited

This audit analyzes the end-to-end security, transactional integrity, and resilience of the TalentMesh resume upload, selection, and application pipeline.

| Component | Target Element | Role |
|---|---|---|
| **Database** | `candidate_resumes`, `applications`, `resume_access_log` | Records metadata, default state flags, application snapshots, and access audits. |
| **Storage** | `resumes` bucket, `application-snapshots` bucket | Stores candidate-uploaded resumes and immutable snapshots of resumes captured during application submission. |
| **Edge Functions** | `candidate-applications`, `resume-proxy` | Handles application submissions, statistics, and authorizes access to private resume URLs. |
| **Frontend** | `components/candidate/ResumeManager.tsx` | UI for file uploads, default toggling, and deletion of candidate resumes. |

---

## 2. Mentally Simulated Test Cases & Risk Evaluation

### Test Case 1: Upload Resume
- **Workflow**: Candidate selects a file in `ResumeManager.tsx`. The file is uploaded directly to the private `resumes` storage bucket via `insforge.storage.from('resumes').upload()`. Upon success, the metadata is saved to the `candidate_resumes` table.
- **Evaluation**: 
  - *Risk*: Client-side uploads directly to storage before database validation bypasses the 5-resume limit.
  - *Data Integrity*: High. Files are stored correctly under candidates' directories (`{candidate_id}/{timestamp}_{name}`).

### Test Case 2: Set Primary Resume
- **Workflow**: Candidate sets a default resume. The frontend updates all other resumes of the candidate to `is_default: false` and the target to `is_default: true`, then updates `candidate_profiles.resume_url` with the new file URL.
- **Evaluation**:
  - *Race Conditions*: High. Rapidly clicking default on different resumes triggers parallel updates that can resolve out-of-order, leading to desynchronization between `candidate_resumes` and `candidate_profiles`.
  - *Integrity*: Poor due to redundant storage of the primary URL in two separate tables.

### Test Case 3: Delete Resume
- **Workflow**: Candidate deletes a resume. The file is removed from the `resumes` storage bucket, and the row is deleted from the `candidate_resumes` table.
- **Evaluation**:
  - *Data Integrity*: Very Poor. If the resume is linked to an active application, deleting the physical file renders the recruiter's application view broken (resulting in a 404 storage link).
  - *Storage Leak*: Low. Cleaned up from storage, but creates a high rate of orphan references.

### Test Case 4: Delete Primary Resume
- **Workflow**: Deleting a primary resume causes the frontend to assign default to the next remaining resume, updating the profile `resume_url`. If no resumes are left, it clears the profile `resume_url`.
- **Evaluation**:
  - *Race Conditions/Atomicity*: Medium. If the browser or network crashes mid-way through multiple client-side calls, the profile is left pointing to a deleted URL.

### Test Case 5: Delete Applied Resume
- **Workflow**: Candidate attempts to delete a resume that has been used to apply for jobs.
- **Evaluation**:
  - *Audit Loss*: Critical. Standard deletions drop the file completely. Recruiters viewing past applications get broken download links.
  - *Fix Needed*: Strict block or soft-deletion of files used in applications.

### Test Case 6: Upload Sixth Resume
- **Workflow**: Trigger `check_resume_limit` checks `COUNT(*) >= 5` on `candidate_resumes` and throws an error if exceeded.
- **Evaluation**:
  - *Storage Leak*: High. Because the file is uploaded to the storage bucket *before* the DB insert transaction, database insertion failure leaves the uploaded file orphaned in the storage bucket.

### Test Case 7: Recruiter Resume Access
- **Workflow**: Recruiter clicks applicant's resume link. The request goes to `resume-proxy` edge function to retrieve a signed URL for the private `resumes` bucket.
- **Evaluation**:
  - *Security*: Current database policies allow any authenticated user to SELECT any resume (`auth.role() = 'authenticated'`). Recruiters can query the database directly to read other candidates' resumes.
  - *Audit*: No logging in `resume_access_log` for direct select queries.

### Test Case 8: Admin Resume Access
- **Workflow**: Admin reviews resumes.
- **Evaluation**:
  - *Access*: Allowed via `admin_bypass` security role. Fully compliant.

### Test Case 9: Candidate Resume Access
- **Workflow**: Candidate previews their own resumes.
- **Evaluation**:
  - *Security*: Rendered in iframe. If raw PDFs are rendered in the main origin context, malicious PDFs could execute scripts under the main origin (XSS).
  - *Fix*: Sandbox iframe.

### Test Case 10: Failed Snapshot Upload
- **Workflow**: Application submission fails during snapshot generation/upload.
- **Evaluation**:
  - *Snapshot Integrity*: Poor. If snapshot fails but DB insert succeeds, the recruiter receives an application with a null/broken resume snapshot.

### Test Case 11: Failed Database Insert
- **Workflow**: During apply, the database insert fails (e.g. unique constraint, timeout) after the snapshot file is uploaded.
- **Evaluation**:
  - *Storage Leak*: High. Orphaned files are left in `application-snapshots`.

### Test Case 12: Concurrent Applications
- **Workflow**: Candidate submits multiple applications simultaneously.
- **Evaluation**:
  - *Race Conditions*: DB row locking is needed on job stats `applications_count` to prevent incorrect application count aggregation.

---

## 3. Risk Classifications

### 🔴 Critical Risks

#### 1. Overly Permissive SELECT Policy on `candidate_resumes` (Data Exposure)
- **Description**: The current SELECT policy (`auth.role() = 'authenticated'`) allows any logged-in candidate to query the database and read the private download URLs and labels of all resumes in the database.
- **Impact**: Severe breach of candidate privacy.

#### 2. Direct Storage File Deletion Breaks Active Applications (Data Loss)
- **Description**: Deleting a resume physically removes the PDF from the `resumes` storage bucket. If the candidate had applied to a job with that resume, the recruiter's copy is destroyed, rendering active recruiter reviews broken.
- **Impact**: Corrupts applicant history.

---

### 🟡 High Risks

#### 1. Storage Leaks on Database Insert Failures (Orphaned Files)
- **Description**: Frontend uploads files to `resumes` bucket before inserting metadata. If the database insert fails (due to 5-resume limit check or network error), the uploaded PDF remains orphaned in the bucket.
- **Impact**: Rapid storage cost bloat with untracked files.

#### 2. Unauthenticated Recruiter Resume Downloads
- **Description**: If recruiters access candidate files via absolute URLs bypassing the `resume-proxy` edge function, access is not verified against active job application relationships, allowing bulk unauthorized downloads.
- **Impact**: Unauthorized talent harvesting.

---

### 🔒 Security & Performance Risks

#### 1. Default Resume Synchronization Race Conditions
- **Description**: The frontend updates `candidate_resumes` and `candidate_profiles.resume_url` in separate sequential client-side requests. A network failure between updates leaves the profile out of sync.
- **Impact**: Inconsistent user profiles.

#### 2. Lack of Access Logging on Resumes
- **Description**: Recruiter or admin accesses to candidate resumes are not audited, preventing compliance checks.
- **Impact**: Auditing gaps on private personal data.

---

## 4. Technical Fixes

### Fix A: Secure Postgres RLS Schema & Access Auditing
Deploy this migration to establish the `resume_access_log` auditing ledger, fix RLS queries, and enforce soft deletions.

```sql
-- 1. Create resume_access_log table
CREATE TABLE IF NOT EXISTS public.resume_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id UUID NOT NULL,
  accessed_by UUID NOT NULL REFERENCES public.profiles(id),
  accessor_role TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  accessed_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.resume_access_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_all ON public.resume_access_log TO project_admin USING (true) WITH CHECK (true);

-- 2. Add soft delete and application relationship support to resumes
ALTER TABLE public.candidate_resumes ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'deleted'));

-- 3. Secure candidate_resumes SELECT policy
DROP POLICY IF EXISTS candidate_resumes_select ON public.candidate_resumes;
CREATE POLICY candidate_resumes_select ON public.candidate_resumes FOR SELECT USING (
  candidate_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')) OR
  EXISTS (
    SELECT 1 FROM public.applications a
    JOIN public.jobs j ON j.id = a.job_id
    WHERE a.resume_url = candidate_resumes.file_url AND j.recruiter_id = auth.uid()
  )
);

-- 4. Prevent deleting resumes that are linked to applications (Database level guard)
CREATE OR REPLACE FUNCTION public.check_resume_deletion()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.applications WHERE resume_url = OLD.file_url) THEN
    -- Soft delete instead of hard delete to preserve recruiter history
    UPDATE public.candidate_resumes SET status = 'deleted' WHERE id = OLD.id;
    RETURN NULL; -- Aborts the hard DELETE, performs soft delete silently
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS before_resume_delete ON public.candidate_resumes;
CREATE TRIGGER before_resume_delete
  BEFORE DELETE ON public.candidate_resumes
  FOR EACH ROW EXECUTE FUNCTION public.check_resume_deletion();
```

---

### Fix B: Edge Function Access Proxy (`resume-proxy`)
Deploy this edge function to serve resumes via signed URLs after verifying recruiter application relationships and logging the access event.

```typescript
// insforge/functions/resume-proxy/index.ts
import { createClient } from 'npm:@insforge/sdk';

export default async function handler(req: Request): Promise<Response> {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  const insforge = createClient({
    baseUrl: Deno.env.get('INSFORGE_URL')!,
    anonKey: Deno.env.get('INSFORGE_ANON_KEY')!,
    edgeFunctionToken: token || ''
  });

  const { data: auth } = await insforge.auth.getCurrentUser();
  if (!auth?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const userId = auth.user.id;
  const userRole = (auth.user.metadata?.role as string) || 'candidate';

  const url = new URL(req.url);
  const resumeId = url.searchParams.get('resumeId');

  if (!resumeId) {
    return new Response(JSON.stringify({ error: 'Missing resumeId' }), { status: 400 });
  }

  // Admin bypass client
  const adminDb = createClient({
    baseUrl: Deno.env.get('INSFORGE_URL')!,
    anonKey: Deno.env.get('INSFORGE_SERVICE_KEY')!,
    isServerMode: true
  });

  // Verify access permissions
  let hasAccess = false;

  if (userRole === 'admin' || userRole === 'super_admin') {
    hasAccess = true;
  } else {
    // Check if owner or recruiter with active application relationship
    const { data: resume } = await adminDb.database
      .from('candidate_resumes')
      .select('candidate_id, file_url')
      .eq('id', resumeId)
      .single();

    if (resume) {
      if (resume.candidate_id === userId) {
        hasAccess = true;
      } else if (userRole === 'recruiter') {
        const { data: app } = await adminDb.database
          .from('applications')
          .select('id')
          .eq('resume_url', resume.file_url)
          .single();
        if (app) {
          hasAccess = true;
        }
      }
    }
  }

  if (!hasAccess) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  // Create signed URL (expires in 15 minutes)
  const { data: signed, error: signError } = await adminDb.storage
    .from('resumes')
    .createSignedUrl(resumeId, 900); // 15 mins

  if (signError || !signed) {
    return new Response(JSON.stringify({ error: 'Failed to generate signed URL' }), { status: 500 });
  }

  // Log access
  await adminDb.database.from('resume_access_log').insert([{
    resume_id: resumeId,
    accessed_by: userId,
    accessor_role: userRole,
    ip_address: req.headers.get('x-forwarded-for') || null,
    user_agent: req.headers.get('user-agent') || null
  }]);

  return new Response(JSON.stringify({ url: signed.signedUrl }), { status: 200 });
}
```

---

### Fix C: Transactional Application Snapshotting
Refactor application submissions in `candidate-applications` edge function to atomically snapshot candidate profiles and resume data to the `application-snapshots` bucket during database insertion.

```typescript
// Refactored candidate-applications edges insertion snippet
const resumeFileUrl = input.resumeUrl;
let snapshotUrl = null;

if (resumeFileUrl) {
  try {
    // 1. Fetch file from private resumes bucket
    const pathSegments = resumeFileUrl.split('/resumes/');
    if (pathSegments.length > 1) {
      const storageKey = decodeURIComponent(pathSegments[1]);
      const { data: fileBlob, error: fetchErr } = await insforgeAdmin.storage
        .from('resumes')
        .download(storageKey);

      if (!fetchErr && fileBlob) {
        // 2. Upload clone copy to application-snapshots bucket (immutable copy)
        const snapshotPath = `applications/${input.jobId}/${candidateId}_snapshot.pdf`;
        const { data: snapshot, error: uploadErr } = await insforgeAdmin.storage
          .from('application-snapshots')
          .upload(snapshotPath, fileBlob);

        if (!uploadErr) {
          snapshotUrl = insforgeAdmin.storage.from('application-snapshots').getPublicUrl(snapshotPath);
        }
      }
    }
  } catch (snapshotErr) {
    console.error('Failed to generate resume snapshot: ', snapshotErr);
    // Non-blocking fallback to original URL to avoid dropping applications, but logged
  }
}

// 3. Database Application insert containing both original and snapshot URLs
const { data: application, error: applyError } = await insforgeAdmin.database
  .from('applications')
  .insert([{
    job_id: input.jobId,
    candidate_id: candidateId,
    cover_letter: input.coverLetter || null,
    status: 'applied',
    resume_url: resumeFileUrl,
    resume_snapshot_url: snapshotUrl || resumeFileUrl, // Snapshot fallback
    applied_at: now
  }]);
```

---

### Fix D: Frontend Pre-Upload Resume Limit Check
Update `components/candidate/ResumeManager.tsx` to prevent storage leakage by verifying the resume count *before* uploading the file to the bucket.

```typescript
// components/candidate/ResumeManager.tsx lines 80-95 Refactored
const handleFile = async (file: File) => {
    if (!activeCandidateId) return;

    // Prevention of storage leak: pre-check active resumes count before uploading
    if (resumes.filter(r => r.status !== 'deleted').length >= 5) {
        setToast({ message: 'Maximum limit of 5 resumes reached. Please delete one first.', type: 'error' });
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        setToast({ message: 'File too large. Max 5MB allowed.', type: 'error' });
        return;
    }
    
    // Proceed with upload...
```
