# Job Approval and Active Job Limit Test Plan

This document outlines the test steps to verify the **Job Approval Workflow (054 + W5)** and the **Active Job Limit Entitlement (050)** on the TalentMesh platform.

---

## 1. Test Data Setup Summary

We have configured the following data in the database for testing:

*   **Company:** `Talentmesh Solutions` (on the Free plan, active job limit = 1).
    *   *Existing active jobs (DevOps Engineer & Data Analysts) have been set to `closed` to free up the active slot.*
    *   **Job 1 (For Approval Test):** `React Developer (Talentmesh - Pending)`
        *   **Status:** `active` (submitted)
        *   **Approval Status:** `pending`
    *   **Job 2 (For Limit Test):** `Backend Engineer (Talentmesh - Draft)`
        *   **Status:** `draft`
        *   **Approval Status:** `pending`
*   **Company:** `Google`
    *   **Job 3 (For Rejection Test):** `Data Scientist (Google - Pending)`
        *   **Status:** `active`
        *   **Approval Status:** `pending`

---

## 2. Verification Steps

### Step 2.1: Job Approval Queue (Verify 054 + W5)

1.  Log in as an administrator and navigate to `/dashboard/admin/job-approvals`.
2.  In the **Pending** tab, look for **`React Developer (Talentmesh - Pending)`** (Company: Talentmesh Solutions).
3.  Click the job and choose **Approve**.
4.  **Verify:**
    *   The job moves to the **Approved** tab.
    *   Its DB `approval_status` is updated to `approved` and `is_approved` is `true`.
    *   The job now appears on public job boards / candidate dashboards.

---

### Step 2.2: Job Rejection Queue (Verify 054 + W5)

1.  In `/dashboard/admin/job-approvals`, select the **Pending** tab.
2.  Look for **`Data Scientist (Google - Pending)`** (Company: Google).
3.  Click the job and choose **Reject** (enter a moderation reason when prompted).
4.  **Verify:**
    *   The job moves to the **Rejected** tab.
    *   Its DB `approval_status` is updated to `rejected` and `is_approved` is `false`.
    *   **Crucial Fix Verification:** The job's publication `status` remains `active` (or `draft`/whatever it was originally) and is **not** silently overwritten to `closed`. This separates the admin moderation state from recruiter publication state.
    *   The job is excluded from public search listings.

---

### Step 2.3: Active Job Limit Entitlement (Verify 050)

1.  Since `React Developer (Talentmesh - Pending)` is now approved and has `status = 'active'`, Talentmesh Solutions has used its **1 active job slot**.
2.  Try to publish/activate **`Backend Engineer (Talentmesh - Draft)`** (by changing its status from `draft` to `active` via the recruiter dashboard or database update).
3.  **Verify:**
    *   The action is blocked.
    *   The database trigger (`trg_active_job_limit`) raises the exception:
        `active job limit reached (1). Close an active job to post another.`
