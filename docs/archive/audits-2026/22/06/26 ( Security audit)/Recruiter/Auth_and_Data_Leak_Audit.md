# Security Audit Report — Recruiter Portal

**Scope**: Authentication, Authorization, and Data Leak Prevention for Recruiter Users
**Status**: 🟢 SECURE

---

## 1. Authentication (AuthN)
**Score: 9/10**

### Strengths:
- Same core Next.js Edge proxy and HttpOnly cookie mechanisms as the Candidate portal, completely eliminating XSS token theft risks.
- **Onboarding Guard**: The proxy enforces completion of company onboarding before allowing access to the main dashboard, preventing recruiters from entering a broken state.

---

## 2. Authorization (AuthZ) & Data Leaks
**Score: 8/10**

### Handling & Mitigations:
- **Company Sandboxing**: Recruiters are strictly bound to their `company_id`. RLS policies on the `jobs` and `applications` tables ensure that a recruiter can only view applications for jobs posted by their own company.
- **Approval Workflow**: Jobs posted by recruiters begin in a `draft` or `pending` state and are hidden from the public job board until explicitly approved by an Admin. RLS on the `jobs` table enforces that `status = 'active'` and `is_approved = true` for public visibility.
- **Candidate Data Privacy**: Recruiters can only access candidate profiles and resumes *if* the candidate has applied to their job, or if they have actively sourced them. Global scraping of candidates is blocked by RLS.

### Conclusion:
Recruiters are securely isolated into tenant-like boundaries. They cannot leak cross-company data or bypass the Admin approval pipeline.
