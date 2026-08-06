# Production Audit Report — Candidate Module

**Feature Area:** Candidate Profiles, Resumes, and Application Pipelines  
**Audit Date:** 2026-06-11  
**Auditor:** Principal SaaS Product Reviewer  
**Status:** ✅ Production Ready

---

## 1. Executive Evaluation

The Candidate Module is robust, covering file upload, resume parsing, application status tracking, offers management, and settings. A major safety improvement is the implementation of storage quarantining (moving deleted resumes to a 7-day retention bucket rather than immediate hard-delete), allowing admin restoration if needed.

### 1.1 Candidate Feature Matrix

| Feature | Sub-Feature | Functionality | Status | RLS Checked |
| :--- | :--- | :--- | :--- | :--- |
| **Profile** | Onboarding Info | Complete multi-step onboarding details (interests, kyc info, avatar) | `Production Ready` | Yes |
| **Resume** | Upload & Delete | Upload multiple resumes (up to 5). Quarantined on delete. | `Production Ready` | Yes |
| **Resume** | Primary Selection | Select single primary resume. Automatic data backfill handles old primary records. | `Production Ready` | Yes |
| **Resume** | AI Parsing | Edge Function parses resume text and populates profile details. | `Production Ready` | Yes |
| **Applications** | Status Tracking | Real-time tracking of applications (Applied, Interviewing, Offered, Rejected, Withdrawn). | `Production Ready` | Yes |
| **Offers** | Offers Dashboard | View offer letter PDFs, accept/decline offers with audit logging. | `Production Ready` | Yes |
| **Alerts** | Notification Center | Real-time BroadcastChannel sync of application status changes and message warnings. | `Production Ready` | Yes |

---

## 2. Key Findings & Vulnerability Matrix

| Feature | Sub-Feature | Issue / Risk | Severity | Status | Affected Roles | Files |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Resume Upload** | Sixth Resume Limit | Client enforces a max of 5 resumes. If bypassed on API level, server-side count must block insertion to prevent database bloat. | `P2` | `Needs Upgrade` | Candidate | [candidate-resumes.sql](file:///d:/Talentmesh-AI-Recruiting-/insforge/migrations/004_candidate_resumes.sql) |
| **Resume Parsing** | Parsing Failure Recovery | If the external parser fails (API timeout), the resume upload fails silently without warning to user. | `P2` | `Needs Upgrade` | Candidate | `insforge/functions/resume-parse/index.ts` |
| **File Deletion** | Storage Quarantine | Deleted files are marked as quarantined and physically cleaned after 7 days by split daily workers. | `P0` | `Production Ready` | Candidate, Admin | [cleanup-stale-resources/index.ts](file:///d:/Talentmesh-AI-Recruiting-/insforge/functions/cleanup-stale-resources/index.ts) |
| **UI Experience** | Resume Empty States | Showing a blank page when no resumes are uploaded instead of a helpful upload dialog component. | `P3` | `Needs Upgrade` | Candidate | `app/dashboard/candidate/[role_id]/resumes/page.tsx` |

---

## 3. Implementation Recommendations

### 3.1 Database Count Trigger for Maximum Resumes Limit
* **Problem**: A candidate can use direct API calls to insert more than 5 resumes, bypassing the client limit.
* **Recommendation**: Add a Postgres trigger `before insert on candidate_resumes` that checks:
  ```sql
  IF (SELECT count(*) FROM candidate_resumes WHERE candidate_id = NEW.candidate_id) >= 5 THEN
    RAISE EXCEPTION 'Maximum limit of 5 resumes exceeded.';
  END IF;
  ```
* **Estimated Effort**: 1 hour (P2)

### 3.2 Add Parser Retry queue
* **Problem**: Resume parsing failures due to third-party API issues leave candidate profiles partially set.
* **Recommendation**: Implement an automatic fallback parser using local regex or a queue worker to retry parsing after a brief timeout.
* **Estimated Effort**: 4 hours (P2)
