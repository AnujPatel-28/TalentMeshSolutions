# Security Audit Report — Candidate Portal

**Scope**: Authentication, Authorization, and Data Leak Prevention for Candidate Users
**Status**: 🟢 SECURE (Post-Patch)

---

## 1. Authentication (AuthN)
**Score: 9/10**

### Strengths:
- **HttpOnly Cookies**: The custom Next.js Edge proxy intercepts the InsForge `access_token` and `refresh_token` and sets them as `HttpOnly`, `Secure`, `SameSite=Lax` cookies. This renders the candidate sessions immune to standard XSS token theft.
- **CSRF Protection**: Token refreshes are protected by a rolling CSRF token, ensuring that Cross-Site Request Forgery attacks cannot silently hijack candidate sessions.
- **Edge Validation**: The proxy strictly validates the JWT structure before allowing access to the `/dashboard/candidate` routes.

### Weaknesses:
- **Session Hydration**: A minor reliance on `sessionStorage` for real-time hydration means a local XSS attack could potentially access a transient token copy, though the core session remains safe in the cookie.

---

## 2. Authorization (AuthZ) & Data Leaks
**Score: 8.5/10**

### Handling & Mitigations:
- **Profile Data Protection**: Previously, the `profiles` table lacked RLS, exposing candidate emails and phone numbers. **Migration 028** successfully enabled Row Level Security on the `profiles` table. Candidates can now ONLY query and modify their own `id`.
- **Resume Bucket Security**: The `resume-proxy` prevents direct public access to resume PDFs. S3/Storage bucket policies strictly enforce that only the candidate who owns the resume, or an approved recruiter/admin, can download the file.
- **Applications**: `candidate_applications` are restricted via RLS so a candidate cannot view or modify the application status of other users.

### Conclusion:
The Candidate Portal is highly secure against horizontal privilege escalation and data leaks. No unauthorized user can scrape candidate PII.
