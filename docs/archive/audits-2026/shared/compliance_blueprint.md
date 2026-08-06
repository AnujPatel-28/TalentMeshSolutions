# TalentMesh — Master Compliance Blueprint & Technical Single Source of Truth

> # ⛔ DO NOT USE THIS AS A SOURCE OF TRUTH — UNVERIFIED DRAFT INPUT
>
> Audited 2026-07-28 against the live system, the deployed edge functions and the InsForge
> contracts. **13 claims are wrong**, and every error runs the dangerous direction — asserting a
> control that does not exist. Notably: §18's `agreed_at` consent timestamp **does not exist** (no
> such column, no such write); §9's cookie consent banner **does not exist**; §11's "Fully
> Compliant" rights rows are **unbuilt**; §6/§7 place all InsForge data in Singapore when object
> storage and backups are in **US-EAST-2** and edge compute runs in **`gcp-asia-southeast1` and
> `gcp-us-east4`**; §6 calls the resume text sent to the AI gateway "Anonymized" when the prompt
> extracts name, email, phone and location; §1's `talentmesh.in` domain **does not exist** — it is
> `talentmeshsolutions.com`. §5/§6's AI features are **not actually running** at all (doc 26 §11).
>
> **Full register:** `docs/specs/26_Legal_DPDP_Compliance_Handoff.md` §10.
> That document plus its §9 are the source of truth for the legal/DPDP workstream.
>
> Still useful as *checklists to re-verify*, not as facts: §4 (data collected), §9 (cookie/token
> table), §10 (transactional email inventory). Do not hand this file to a drafting agent.

**Document Version:** 1.0.0  
**Last Updated:** July 6, 2026 · **Audited and demoted:** July 28, 2026  
**Status:** ⛔ Unverified draft input — superseded by doc 26 §9/§10  
**Target Compliance Frameworks:** Digital Personal Data Protection Act (DPDP India 2023), GDPR, Information Technology Act (2000 & Rules), SOC2 Audit Readiness.

---

## 1. Company Information & Legal Entity Structure
> [!IMPORTANT]
> The following business facts must be verified by your legal counsel prior to final publication of public terms.

- **Legal Entity Name:** `[CONFIRM: e.g. TalentMesh Solutions Private Limited]`
- **Brand / Trade Name:** TalentMesh (`TalentMesh Solutions`)
- **Country of Incorporation:** `[CONFIRM: India]`
- **Corporate Identification Number (CIN):** `[CONFIRM: e.g. U72900KA2026PTC123456]`
- **GSTIN Number:** `[CONFIRM: e.g. 29AAAAA1111A1Z1]`
- **Registered Corporate Address:** `[CONFIRM: Full Registered Address]`
- **Support & Help Desk Email:** `[CONFIRM: support@talentmeshsolutions.com — mailbox must exist]`
- **Privacy & DPO Email:** `[CONFIRM: privacy@talentmeshsolutions.com — mailbox must exist]`
- **Grievance Officer Name:** `[CONFIRM]`
- **Grievance Officer Email & Phone:** `[CONFIRM: grievance@talentmeshsolutions.com | +91-XXXXX-XXXXX]`
- **Primary Website URL:** `https://talentmeshsolutions.com`
- **Application Portal Base Domain:** `app.talentmeshsolutions.com` / `admin.talentmeshsolutions.com` / `jobs.talentmeshsolutions.com`

- **Business Operating Hours:** `[CONFIRM: Monday – Friday, 9:00 AM – 6:00 PM IST]`

> **Corrected 2026-07-28.** This section previously listed `talentmesh.in` addresses and portal
> domains. **`talentmesh.in` is not a TalentMesh domain and never was** — confirmed by the owner. The
> canonical domain is `talentmeshsolutions.com` (see `app/layout.tsx`, `app/robots.ts`,
> `app/sitemap.ts`, and the `.talentmeshsolutions.com` session cookie). The `.in` addresses were
> invented here and then propagated into the §2 deletion warning, §11 and §17, where they are
> corrected in place. The only email address actually present in the codebase is
> `info@talentmeshsolutions.com`.

---

## 2. Platform Information & Capabilities Matrix

### Candidate Capabilities
- **Account Management:** Sign up, log in (Email/Password, Google OAuth, GitHub OAuth, LinkedIn OAuth), email verification via 6-digit OTP, password reset, MFA registration/verification.
- **Profile & Resume:** Edit personal profile, upload multi-format resumes (PDF, DOCX), trigger AI resume parsing, view calculated profile strength score.
- **Job Discovery & Application:** Browse live job postings, search with filters (skills, location, salary, job type), apply to jobs, save bookmark jobs, track real-time application status (`applied`, `reviewing`, `shortlisted`, `interviewing`, `offered`, `hired`, `rejected`).
- **Communication & Alerts:** Receive in-app notifications, receive system transactional emails, send messages to recruiters, view company profiles, view salary benchmarks, request referral links.

### Recruiter Capabilities
- **Company & Job Postings:** Submit corporate KYC verification documents, post new job openings (requires admin approval), edit/close job postings.
- **Applicant Pipeline Management:** Review applicant queue, view AI candidate match scores, move candidates across pipeline stages, view candidate resumes (logged in `resume_access_log`).
- **Communication & Scheduling:** Message candidates directly, schedule video interviews (Daily.co integration), send credentials, view recruitment analytics.

### Admin Capabilities
- **Platform Governance:** Approve or reject pending recruiter accounts and corporate documents using the in-app interactive document viewer (`DocViewerModal`).
- **Job Approval Queue:** Review, approve, or reject recruiter job postings.
- **User & Account Management:** Search candidates/recruiters across multi-field queries, trigger bulk status updates (`active`, `suspended`, `delete`), perform irreversible hard account deletions.
- **Security & System Observability:** Inspect real-time audit logs (`admin-audit-logs`), track system telemetry & performance metrics, issue broadcast announcements, inspect quarantined files.
- **Impersonation:** Impersonate candidate or recruiter sessions with automatic TTL expiry and mandatory audit log recording.

### Roadmap Features (Present in Code but Pending Deployment)
- **Video Interview Rooms:** Daily.co WebRTC integrations.
- **Serverless AI Resume Parsing Edge Deployment:** Functions deployed locally, queued for production deployment.

> [!WARNING]
> **Self-Service Account Deletion Gap:** There is currently no self-service "Delete Account" button in the candidate or recruiter user settings. Account deletion is currently initiated exclusively by system administrators. Public privacy policies should outline a manual deletion request workflow via `privacy@talentmeshsolutions.com [CONFIRM mailbox exists]` until self-service deletion is released.

---

## 3. Authentication & Identity Management

| Method | Implementation Status | Technical Mechanism |
|---|---|---|
| **Email + Password** | ✅ Active | InsForge Auth SDK (`signUp`, `signInWithPassword`), bcrypt hashed, 8+ char policy |
| **Google OAuth** | ✅ Active | InsForge `signInWithOAuth` + PKCE (`insforge_pkce_verifier`) |
| **GitHub OAuth** | ✅ Active | InsForge `signInWithOAuth` + PKCE |
| **LinkedIn OAuth** | ✅ Active (UI + SDK) | InsForge `signInWithOAuth` + PKCE (`oauth_state_linkedin`) |
| **Phone OTP** | ❌ Not in schema | Phone number stored as profile attribute only |
| **Multi-Factor Auth (MFA)** | ✅ Active | TOTP authenticator app verification (`mfa_enabled`, `/auth/setup-mfa`, `/auth/mfa-verify`) |
| **Email Verification** | ✅ Active | 6-digit email OTP verification code with 2-minute expiration timer |
| **Password Reset** | ✅ Active | Time-bound token password reset flow (`/auth/reset-password`) |

---

## 4. Candidate Information Collected (Database Schema Audit)

### 1. Basic & Demographic Data (`profiles` table)
- `id` (UUID, primary key)
- `email` (citext, unique)
- `name` (text)
- `phone` (text, optional)
- `avatar_url` (text, public URL)
- `location` (text)
- `role` (`candidate`, `recruiter`, `admin`, `super_admin`)
- `bio` (text)

### 2. Professional Data (`candidate_profiles` table)
- `headline` (text, e.g. "Senior Full-Stack Engineer")
- `skills` (`text[]` array)
- `experience_years` (numeric/integer)
- `education` (JSONB array of institutions, degrees, years)
- `work_history` (JSONB array of companies, titles, descriptions, dates)
- `resume_url` (text, InsForge private storage path)
- `primary_resume_id` (UUID reference)
- `profile_strength` (integer 0-100)
- `salary_min`, `salary_max`, `currency` (numeric / text)
- `preferred_locations`, `job_types`, `open_to_remote` (JSONB / boolean)

### 3. Social & External Links
- `linkedin_url` (text)
- `github_url` (text)
- `portfolio_url` (text)

### 4. Identity & System Metadata
- `is_visible` (boolean, candidate search privacy toggle)
- `onboarding_complete` / `is_onboarded` (boolean)
- `mfa_enabled` (boolean)
- `password_set_at` (timestamp)
- `is_active` (boolean)
- `created_at`, `updated_at` (timestamps)

> [!NOTE]
> Gender, Date of Birth (DOB), and Physical Street Addresses are **NOT** collected or stored in the candidate database schema.

---

## 5. Artificial Intelligence & Machine Learning Pipeline

1. **AI Match Score Engine:**
   - **Mechanism:** Computes semantic compatibility (`ai_match_score` 0–100%) between candidate profile skills/experience and posted job requirements.
   - **Provider & Model:** Executed via server-side OpenRouter API gateway calling OpenAI-compatible models (`gpt-4o-mini` / `claude-3-5-sonnet`).
2. **AI Resume Parser:**
   - **Mechanism:** Extracts structured text, skills array, education history, and work timeline from PDF/DOCX resume file uploads.
   - **Execution Environment:** Executed via serverless Edge function `parse-resume`.

---

## 6. Third-Party Ecosystem & Service Subprocessors

| Subprocessor / Service | Purpose | Data Transferred | Location / Region |
|---|---|---|---|
| **InsForge BaaS** | Core Backend, Auth, Database API, Private Storage | Profiles, Credentials, Resumes, Applications | Singapore `[CONFIRM]` |
| **PostgreSQL (via InsForge)** | Primary Relational Database | All Application Data & Audit Logs | Singapore `[CONFIRM]` |
| **OpenRouter** | AI Model Gateway (Resume Parsing & Matching) | Anonymized Resume Text & Job Requirements | United States |
| **Gmail SMTP (Nodemailer)** | Transactional Email Delivery | Recipient Email, Name, System Notifications | Global / India |
| **Razorpay** | Payment Gateway | Order IDs, Subscription Event Tokens, Amount | India |
| **Daily.co** | Video Interview Infrastructure | WebRTC Session IDs & Peer Tokens | Global / US |

---

## 7. Infrastructure, Storage & Regional Isolation

- **Primary Database:** Managed PostgreSQL cluster provisioned via InsForge.
- **Storage Buckets:**
  - `resumes` (Private bucket — protected via JWT signed proxy)
  - `recruiter_documents` (Private bucket — KYC verification docs, GST, Aadhaar/PAN scans)
  - `avatars` & `company_logos` (Public bucket)
- **File Quarantine Bucket:** Deleted or flagged files are stored in `quarantined_files` with a 7-day retention window prior to hard purge.
- **Hosting Region:** Singapore (`ap-southeast-1`) `[CONFIRM with InsForge Project Config]`.

---

## 8. Security Controls, Row Level Security (RLS) & Access Governance

- **Row Level Security (RLS):** Enabled and enforced (`ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY`) across all **33 PostgreSQL tables**.
- **Session Security:** Short-lived JWT Access Tokens (15-min TTL) coupled with HttpOnly Refresh Tokens (30-day sliding window). Multi-tab session synchronization via `BroadcastChannel`.
- **Admin Impersonation:** Time-To-Live (TTL) limited impersonation sessions with mandatory logging in `audit_logs`.
- **Resume Access Tracking:** Every view, download, or unlock of a candidate resume by a recruiter is immutably recorded in `resume_access_log` (actor ID, candidate ID, timestamp, access type).
- **Network Rate Limiting:** Enforced via Edge Proxy rules on API routes.

---

## 9. Cookie Governance & Local Storage Policy

| Cookie / Token Key | Type | Storage Location | Lifetime | Purpose |
|---|---|---|---|---|
| `insforge_refresh_token` | Strict Essential | HttpOnly Cookie | 30 Days | Secure Auth Session Renewal |
| `tm_token` / `tm_access_token` | Strict Essential | Session Storage / HttpOnly | Session / 15 Mins | API Authorization Bearer Token |
| `tm_user` | Functional | Local Storage | Session | Frontend UI Role State Sync |
| `tm_last_active_time` | Essential | Local Storage | Session | Session Timeout Monitor |

> [!NOTE]
> TalentMesh employs **ZERO** third-party tracking or advertising cookies (No Google Analytics, Meta Pixel, or Mixpanel SDKs present).

---

## 10. Transactional Email Inventory

1. **Welcome Email (Candidate):** Account registration confirmation.
2. **Welcome Email (Recruiter):** Recruiter registration confirmation.
3. **Email Verification Code:** 6-digit OTP verification email.
4. **Password Reset Token:** Self-service password recovery email.
5. **Application Submitted:** Candidate receipt confirmation upon job application.
6. **Application Status Update:** Candidate notification when application moves pipeline stages.
7. **Interview Scheduled:** Calendar invite & video room link for candidate & recruiter.
8. **New Application Alert:** Recruiter notification for incoming applicant.
9. **Recruiter Onboarding Credentials:** Admin-issued login credentials.
10. **Security Alert:** Session anomaly / password change notification.

---

## 11. Candidate Rights & DPDP Act Alignment

| DPDP Right | Code / System Implementation | Action Required |
|---|---|---|
| **Right to Access Data** | Built: Candidates view full profile & application history in dashboard. | Self-service JSON/PDF export feature recommended. |
| **Right to Correction** | Built: Candidates edit profile, skills, education, experience, and resumes anytime. | Fully Compliant. |
| **Right to Erasure / Deletion** | Partial: Hard-deletion supported via Admin Dashboard. Self-service button not in UI. | Document manual request process via `privacy@talentmeshsolutions.com [CONFIRM mailbox exists]`. |
| **Right to Withdraw Consent** | Built: Candidates can toggle `is_visible: false` to hide profile from recruiters. | Fully Compliant. |

---

## 12. Data Retention & Erasure Schedule

- **Active Candidate & Recruiter Accounts:** Retained for duration of active relationship.
- **Resumes & Applications:** Soft-deleted resumes move to `quarantined_files` for **7 days** (admin-restorable), then permanently purged.
- **Security Audit Logs (`audit_logs`):** Retained for **365 days** for legal compliance and threat analysis.
- **Inactive Accounts:** `[CONFIRM: Inactive accounts purged after 24 months of zero login activity]`.

---

## 13. Operational Release & Beta Status
`[CONFIRM: TalentMesh is currently in General Commercial Availability / Production Access]`.

---

## 14. Recruiter Access Controls & Resume Tracking
- Recruiters can search and view candidate profiles matching posted job requirements.
- Resume access is restricted to candidates who have applied to recruiter jobs or enabled public candidate search (`is_visible: true`).
- Access logging: All resume downloads/views create immutable records in `resume_access_log`.

---

## 15. User Communication Preferences
- Candidates can configure email and in-app notification preferences in `/dashboard/candidate/[id]/settings`.
- SMS / WhatsApp messaging integrations are currently out of scope.

---

## 16. Governing Law & Jurisdiction
- **Governing Law:** Laws of the Republic of India `[CONFIRM]`.
- **Jurisdiction:** Courts of Bengaluru, Karnataka, India `[CONFIRM]`.
- **Minimum Age Requirement:** 18 years of age `[CONFIRM]`.

---

## 17. Account Deletion Workflow
1. **User Initiation:** User sends formal erasure request to `privacy@talentmeshsolutions.com [CONFIRM mailbox exists]`.
2. **Admin Verification:** Admin verifies identity and executes bulk delete in `/dashboard/admin/candidates` or `/dashboard/admin/recruiters`.
3. **Database Purge:** Triggers cascading hard delete across `profiles`, `candidate_profiles`, `recruiter_profiles`, and `applications`.
4. **Storage Purge:** Resume and document files moved to 7-day quarantine before hard object store deletion.

---

## 18. Consent Logging Architecture
- User signup records explicit acceptance of Terms & Privacy Policy (`agreed_at` timestamp).
- Cookie consent banner manages essential storage tokens.

---

## 19. Product Roadmap Toggles
- **Phase 1 (Live):** Core AI Matching, Multi-Role Dashboards, Recruiter KYC Inspection, RLS Security, Document Viewer.
- **Phase 2 (Q3 2026):** Revenue Billing Engine, Email Template Studio, User Impersonation, Plan Tier Manager, RBAC Staff Roles.

---

## 20. Brand Assets & Visual Standards
- **Primary Color:** `#2563eb` / `#3b82f6` (TalentMesh Royal Blue)
- **Dark Neutral:** `#0f172a` (Slate 900)
- **Tagline:** *"Next-Gen AI Recruitment & Smart Matching"*
