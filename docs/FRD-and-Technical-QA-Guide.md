# TalentMesh Solutions — Functional Requirements Document (FRD) & Technical QA Guide

**Product**: TalentMesh Recruitment & Staffing Platform  
**Version**: 1.0 (Public Beta)  
**Company**: Talent Mesh Solution Pvt. Ltd.  
**Last Updated**: 2026-07-08  
**Prepared For**: QA Team — Functional & Regression Testing  

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Tech Stack & Architecture](#2-tech-stack--architecture)
3. [Authentication & Session Management](#3-authentication--session-management)
4. [Onboarding Flows](#4-onboarding-flows)
5. [Candidate Portal — Features & Test Cases](#5-candidate-portal)
6. [Recruiter Portal — Features & Test Cases (Stubs / Disabled)](#6-recruiter-portal)
7. [Admin Portal — Features & Test Cases](#7-admin-portal)
8. [Platform-Wide / Shared Features](#8-platform-wide--shared-features)
9. [Edge Functions (Backend API) Reference](#9-edge-functions-backend-api-reference)
10. [Database Tables Reference](#10-database-tables-reference)
11. [Known Stubs & Planned Features](#11-known-stubs--planned-features)
12. [Status Legend](#12-status-legend)

---

## 1. Product Overview

TalentMesh Solutions is a result-driven recruitment and staffing platform providing end-to-end hiring lifecycle management. The platform serves **three user roles**, though recruiter access is currently disabled for this phase:

| Role | Description | Subdomain | Current Status |
|------|-------------|-----------|----------------|
| **Candidate** | Job seekers — browse jobs, apply, track applications, manage profile | `jobs.*` | ✅ ACTIVE |
| **Recruiter** | Hiring managers — post jobs, manage pipeline (Coded but login/signup disabled) | `app.*` | 🔲 STUB |
| **Admin** | Platform administrators — oversee all users, approve jobs, manage settings | `admin.*` | ✅ ACTIVE |

### Business Rules & Constraints (Current Phase)
- **Candidate Registration**: Only Candidates can register via Email/Password, Google OAuth, or LinkedIn OAuth.
- **Recruiter Registration**: Disabled. Recruiter signup/login endpoints are currently stubbed.
- **Admin Access**: Admin login is supported. Admin registration is disabled (pre-seeded accounts only).
- **Core Session Security**: All session cookies are exclusively governed by `/api/auth/session` (server-side, HttpOnly).

---

## 2. Tech Stack & Architecture

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14+ (App Router), React 19, TypeScript |
| **Styling** | CSS Modules, Vanilla CSS |
| **State Management** | React Context (AuthContext), TanStack React Query |
| **Backend-as-a-Service** | InsForge (PostgreSQL, Auth, Storage, Edge Functions) |
| **Authentication** | InsForge Auth (Email/Password + Google & LinkedIn OAuth) |
| **File Storage** | InsForge Storage (Resumes, Avatars, Logos, Blog Images) |
| **Edge Functions** | Edge functions (Deno runtime) |
| **Middleware** | `proxy.ts` — route protection, MFA validation, role-based redirects |
| **Deployment** | Vercel (Frontend), InsForge (Edge Functions) |
| **Real-time** | InsForge WebSocket pub/sub (currently disabled) |
| **Animations** | Framer Motion |

### Key Architecture Patterns
- **Cookie Governance**: All session cookies (`tm_access_token`, `tm_role`, `tm_admin_access`) are exclusively set/cleared by `/api/auth/session` (server-side, HttpOnly).
- **Proxy Middleware**: `proxy.ts` validates `tm_access_token` cookie or `x-access-token` header on every request.
- **Edge Function Pattern**: Client → `invokeFunction('function-name', { method, body, queries })` → InsForge Edge Function → PostgreSQL.

---

## 3. Authentication & Session Management

### 3.1 Login Flow
| # | Feature | Description | Backend | Status |
|---|---------|-------------|---------|--------|
| 3.1.1 | **Email/Password Login** | User enters email + password (Candidate & Admin only) | `insforge.auth.signInWithPassword` | ✅ LIVE |
| 3.1.2 | **Google OAuth Login** | Candidate "Continue with Google" button → OAuth redirect | InsForge OAuth | ✅ LIVE |
| 3.1.3 | **LinkedIn OAuth Login** | Candidate "Continue with LinkedIn" button → OAuth redirect | InsForge OAuth | ✅ LIVE |
| 3.1.4 | **GitHub OAuth Login** | "Continue with GitHub" button (Disabled) | InsForge OAuth | 🔲 STUB |
| 3.1.5 | **Recruiter Login** | Recruiter login attempts are blocked | Blocked in AuthContext | 🔲 STUB |
| 3.1.6 | **Error Handling** | Shows "Invalid email or password" or validation errors | Client-side validation | ✅ LIVE |
| 3.1.7 | **"Remember Me"** | Session persists for 7 days via HttpOnly cookie | `/api/auth/session` | ✅ LIVE |
| 3.1.8 | **Auto-redirect** | Valid session skips login page | `proxy.ts` middleware | ✅ LIVE |

#### QA Test Points — Login
- [ ] Enter valid candidate credentials → redirects to `/candidate/dashboard`
- [ ] Enter valid admin credentials → redirects to `/<adminPath>/dashboard`
- [ ] Enter wrong password → shows "Invalid email or password"
- [ ] Try logging in as recruiter → shows "Recruiter login is currently disabled"
- [ ] Verify GitHub button is non-functional / displays coming soon
- [ ] Verify `tm_access_token` cookie is `HttpOnly` (not accessible from JS console)

### 3.2 Signup Flow
| # | Feature | Description | Backend | Status |
|---|---------|-------------|---------|--------|
| 3.2.1 | **Candidate Signup** | Email + password, Google, or LinkedIn registration | `auth-signup` | ✅ LIVE |
| 3.2.2 | **Recruiter Signup** | Registration is disabled | — | 🔲 STUB |
| 3.2.3 | **Admin Signup** | Registration is disabled (pre-seeded accounts only) | — | 🔲 STUB |
| 3.2.4 | **Email Verification (OTP)** | 6-digit OTP sent to email after email/password signup | InsForge Auth | ✅ LIVE |
| 3.2.5 | **Resend OTP** | Cooldown timer (60s) before allowing resend | Client-side timer | ✅ LIVE |

#### QA Test Points — Signup
- [ ] Candidate signup → receives verification email → OTP flow → redirect to onboarding
- [ ] Verify recruiter signup returns a "Registration is disabled" message or is disabled in UI
- [ ] OTP resend button disabled during cooldown

### 3.3 Password Recovery
| # | Feature | Description | Backend | Status |
|---|---------|-------------|---------|--------|
| 3.3.1 | **Forgot Password** | Candidate/Admin enters email → receives reset link | InsForge Auth | ✅ LIVE |
| 3.3.2 | **Reset Password** | Token-based password reset page | InsForge Auth | ✅ LIVE |

### 3.4 Session Security
| # | Feature | Description | Backend | Status |
|---|---------|-------------|---------|--------|
| 3.4.1 | **MFA (Multi-Factor Auth)** | TOTP-based MFA enrollment and verification | `mfa-status`, `mfa-backup-codes` | ✅ LIVE |
| 3.4.2 | **Session Timeout Warning** | Warning modal appears before session expires | AuthContext timer | ✅ LIVE |
| 3.4.3 | **Multi-tab Session Sync** | Session refresh coordinates across tabs | `useSessionRefresh` hook | ✅ LIVE |
| 3.4.4 | **Offline Detection** | Detects network loss and shows reconnect prompt | `useNetworkState` hook | ✅ LIVE |
| 3.4.5 | **Logout** | Clears all cookies via `/api/auth/session` DELETE | `/api/auth/session` | ✅ LIVE |

---

## 4. Onboarding Flows

### 4.1 Candidate Onboarding
| # | Step | Description | Backend | Status |
|---|------|-------------|---------|--------|
| 4.1.1 | **Personal Info** | Name, phone, location | `candidate-profile` | ✅ LIVE |
| 4.1.2 | **Resume Upload** | PDF/DOCX upload (no AI parsing) | `upload-resume` | ✅ LIVE |
| 4.1.3 | **Skills & Experience** | Skills tags, experience years | `candidate-profile` | ✅ LIVE |
| 4.1.4 | **Job Preferences** | Preferred locations, job types, salary range, remote preference | `candidate-profile` | ✅ LIVE |
| 4.1.5 | **Complete Onboarding** | Marks `completed_onboarding = true` → redirects to dashboard | `profile-complete-onboarding` | ✅ LIVE |

#### QA Test Points — Candidate Onboarding
- [ ] Upload PDF/DOCX resume → pre-fills form fields (manual entry required, AI parsing disabled)
- [ ] Skip optional fields → still completes onboarding
- [ ] After completion → `completed_onboarding` = true in DB

### 4.2 Recruiter Onboarding
| # | Step | Description | Backend | Status |
|---|------|-------------|---------|--------|
| 4.2.1 | **Company & Profile Setup** | Coded but inaccessible due to signup blockage | — | 🔲 STUB |

---

## 5. Candidate Portal

**Base Route**: `/dashboard/candidate/[role_id]/`  
**Layout**: Sidebar navigation + top header  

### 5.1 Dashboard Home (`page.tsx`)
| # | Feature | Description | Backend | Status |
|---|---------|-------------|---------|--------|
| 5.1.1 | **Job Feed** | Job listings based on profile and preferences | `candidate-dashboard`, `jobs` | ✅ LIVE |
| 5.1.2 | **Search Bar** | Real-time job search by title, company, location | Client-side filter + `jobs` | ✅ LIVE |
| 5.1.3 | **Save Job** | Bookmark icon to save/unsave jobs | InsForge DB `saved_jobs` | ✅ LIVE |
| 5.1.4 | **Apply Modal** | Quick-apply modal with cover letter + resume selection | `ApplyModal` component | ✅ LIVE |
| 5.1.5 | **Job Cards** | Display: title, company, location, salary, type, experience, posted date | — | ✅ LIVE |
| 5.1.6 | **Company Logo** | Shows company logo from storage | `getPublicStorageUrl` | ✅ LIVE |
| 5.1.7 | **Share Job** | Share job button is disabled / stubbed | Client-side | 🔲 STUB |
| 5.1.8 | **Application Stats Banner** | Shows total applications, interviews, profile strength | `candidate-dashboard` | ✅ LIVE |

#### QA Test Points — Dashboard Home
- [ ] Search "Frontend" → filters matching jobs
- [ ] Click bookmark → job saved → icon fills
- [ ] Click "Apply" → Apply Modal opens with resume picker
- [ ] Submit application → success toast → job card shows "Applied" badge

### 5.2 Find Jobs (`jobs/page.tsx`)
| # | Feature | Description | Backend | Status |
|---|---------|-------------|---------|--------|
| 5.2.1 | **Job Search Page** | Dedicated job search with filters | `jobs` | ✅ LIVE |
| 5.2.2 | **Filters** | Location, Job Type, Experience, Salary | Client filter | ✅ LIVE |

### 5.3 Job Detail (`jobs/[id]/page.tsx`)
| # | Feature | Description | Backend | Status |
|---|---------|-------------|---------|--------|
| 5.3.1 | **Full Job Description** | Title, company, location, salary, description, requirements | `jobs-id` | ✅ LIVE |
| 5.3.2 | **Apply Button** | Direct apply from detail page | `ApplyModal` | ✅ LIVE |
| 5.3.3 | **Save/Bookmark** | Save from detail page | `saved_jobs` DB | ✅ LIVE |
| 5.3.4 | **Similar Jobs** | Recommendations are disabled | — | 🔲 STUB |

### 5.4 My Applications (`applications/page.tsx`)
| # | Feature | Description | Backend | Status |
|---|---------|-------------|---------|--------|
| 5.4.1 | **Tab: Applied** | Applications in `applied`, `reviewing`, `shortlisted` status | `candidate-applications` | ✅ LIVE |
| 5.4.2 | **Tab: Interviews** | Applications in `interviewing`, `offered`, `hired` status | `candidate-applications` | ✅ LIVE |
| 5.4.3 | **Tab: Archived** | Applications in `rejected`, `withdrawn` status | `candidate-applications` | ✅ LIVE |
| 5.4.4 | **Withdraw Application** | Withdraw from `applied`, `reviewing`, `shortlisted`, `interviewing`, `offered` | `candidate-applications-id` PATCH | ✅ LIVE |
| 5.4.5 | **Status Pill** | Color-coded status badge | Client component | ✅ LIVE |

#### QA Test Points — My Applications
- [ ] Applied tab shows correct count & apps
- [ ] Click Withdraw → confirmation modal → confirm → app moves to Archived

### 5.5 Application Detail (`applications/[app_id]/page.tsx`)
| # | Feature | Description | Backend | Status |
|---|---------|-------------|---------|--------|
| 5.5.1 | **Status Card** | Current status with description and icon | `candidate-applications-id` GET | ✅ LIVE |
| 5.5.2 | **Progress Timeline** | Visual progress: Resume Review → Shortlisting → Interview → Offer | Client render | ✅ LIVE |
| 5.5.3 | **Withdraw Button** | Withdraw from detail page (for eligible statuses) | `candidate-applications-id` PATCH | ✅ LIVE |
| 5.5.4 | **Cover Letter Display** | Shows submitted cover letter text | `candidate-applications-id` GET | ✅ LIVE |

### 5.6 Saved Jobs (`saved-jobs/page.tsx`)
| # | Feature | Description | Backend | Status |
|---|---------|-------------|---------|--------|
| 5.6.1 | **Saved Jobs List** | All bookmarked jobs with unsave option | InsForge DB `saved_jobs` | ✅ LIVE |

### 5.7 Interviews (`interviews/page.tsx`)
| # | Feature | Description | Backend | Status |
|---|---------|-------------|---------|--------|
| 5.7.1 | **Interviews Feed** | Scheduling is disabled, this tab is non-functional | — | 🔲 STUB |

### 5.8 Messages (`messages/page.tsx`)
| # | Feature | Description | Backend | Status |
|---|---------|-------------|---------|--------|
| 5.8.1 | **In-app Messaging** | Chat features are currently disabled | — | 🔲 STUB |

### 5.9 Notifications (`notifications/page.tsx`)
| # | Feature | Description | Backend | Status |
|---|---------|-------------|---------|--------|
| 5.9.1 | **Notification System** | Push & list notifications are currently disabled | — | 🔲 STUB |

### 5.10 Profile (`profile/page.tsx`)
| # | Feature | Description | Backend | Status |
|---|---------|-------------|---------|--------|
| 5.10.1 | **Personal Information** | Name, email, phone, location | `candidate-profile` GET/PATCH | ✅ LIVE |
| 5.10.2 | **Avatar Upload** | Profile photo upload is disabled | — | 🔲 STUB |
| 5.10.3 | **Professional Details** | Headline, skills tags, work experience, education | `candidate_profiles` JSON columns | ✅ LIVE |
| 5.10.4 | **Resume Management** | Upload/replace resume, view current (PDF/DOCX) | `upload-resume`, `resume-proxy` | ✅ LIVE |
| 5.10.5 | **Social Links** | LinkedIn, GitHub, Portfolio URLs | `candidate_profiles` | ✅ LIVE |
| 5.10.6 | **Salary Expectations** | Min/max salary + currency | `candidate_profiles` | ✅ LIVE |
| 5.10.7 | **Profile Strength Meter** | Completion indicator (calculated client-side) | Client calculation | ✅ LIVE |

### 5.11 Resumes (`resumes/page.tsx`)
| # | Feature | Description | Backend | Status |
|---|---------|-------------|---------|--------|
| 5.11.1 | **Resume List** | All uploaded resumes | `resume-proxy` | ✅ LIVE |
| 5.11.2 | **Upload Resume** | PDF/DOCX file upload | `upload-resume` | ✅ LIVE |
| 5.11.3 | **AI Resume Parsing** | Parsing is disabled | — | 🔲 STUB |

### 5.12 Contributions/Referrals (`referrals/page.tsx`)
| # | Feature | Description | Backend | Status |
|---|---------|-------------|---------|--------|
| 5.12.1 | **My contributions** | Reviews, questions, and answers are disabled | — | 🔲 STUB |

### 5.13 Analytics (`analytics/page.tsx`)
| # | Feature | Description | Backend | Status |
|---|---------|-------------|---------|--------|
| 5.13.1 | **Application Stats** | Graphs/data are disabled in this phase | — | 🔲 STUB |

### 5.14 Company Reviews (`company-reviews/page.tsx`)
| # | Feature | Description | Backend | Status |
|---|---------|-------------|---------|--------|
| 5.14.1 | **Browse & Rate** | Reviews and rating submissions are disabled | — | 🔲 STUB |

### 5.15 Salary Guide (`salary-guide/page.tsx`)
| # | Feature | Description | Backend | Status |
|---|---------|-------------|---------|--------|
| 5.15.1 | **Salary Comparison** | Directory is disabled | — | 🔲 STUB |

### 5.16 Settings (`settings/page.tsx`)
| # | Feature | Description | Backend | Status |
|---|---------|-------------|---------|--------|
| 5.16.1 | **Tab: Profile** | Edit personal details | `candidate-profile` PATCH | ✅ LIVE |
| 5.16.2 | **Tab: Preferences** | Job preferences (salary, remote, locations, job types) | `candidate-profile` PATCH | ✅ LIVE |
| 5.16.3 | **Tab: Security** | Change password, MFA toggle | `mfa-status`, InsForge Auth | ✅ LIVE |
| 5.16.4 | **Tab: Privacy** | Profile visibility toggle, data download, account deletion | `candidate-profile` PATCH | ✅ LIVE |

---

## 6. Recruiter Portal (Stubs / Disabled)

**Status**: **DISABLED**. Recruiters cannot register, login, or access any portal features in this release. All recruiter routes return a "Feature Disabled" page or redirect.

| # | Page/Feature | Target Path | Current Status |
|---|--------------|-------------|----------------|
| 6.1 | **Dashboard Home** | `/dashboard/recruiter/[role_id]` | 🔲 STUB |
| 6.2 | **Jobs Management** | `/dashboard/recruiter/[role_id]/jobs` | 🔲 STUB |
| 6.3 | **Post Job** | `/dashboard/recruiter/[role_id]/jobs/post-job` | 🔲 STUB |
| 6.4 | **Pipeline/Kanban Board** | `/dashboard/recruiter/[role_id]/pipeline` | 🔲 STUB |
| 6.5 | **Candidate Search** | `/dashboard/recruiter/[role_id]/candidates` | 🔲 STUB |
| 6.6 | **AI Match Score** | — | 🔲 STUB |
| 6.7 | **Interviews Scheduling** | `/dashboard/recruiter/[role_id]/interviews` | 🔲 STUB |
| 6.8 | **Offer Page** | `/dashboard/recruiter/[role_id]/offers` | 🔲 STUB |
| 6.9 | **NVite (Candidate Invite)** | `/dashboard/recruiter/[role_id]/nvite` | 🔲 STUB |
| 6.10 | **Messages** | `/dashboard/recruiter/[role_id]/messages` | 🔲 STUB |
| 6.11 | **Reports & Funnel** | `/dashboard/recruiter/[role_id]/reports` | 🔲 STUB |
| 6.12 | **Integrations** | `/dashboard/recruiter/[role_id]/integrations` | 🔲 STUB |

---

## 7. Admin Portal

**Base Route**: `/dashboard/admin/` (protected by `NEXT_PUBLIC_ADMIN_SECRET_PATH`)  
**Layout**: Sidebar navigation + top header  

### 7.1 Dashboard Home (`page.tsx`)
| # | Feature | Description | Backend | Status |
|---|---------|-------------|---------|--------|
| 7.1.1 | **Platform Metrics** | Total Jobs, Applications, Candidates, Recruiters (Pre-cached) | `admin-dashboard` | ✅ LIVE |
| 7.1.2 | **Alerts Widget** | Pending recruiters, pending jobs, reported jobs, new users 24h | `admin-dashboard` | ✅ LIVE |
| 7.1.3 | **Recent Activity Feed** | Latest platform activities with actor info | `admin-dashboard` | ✅ LIVE |
| 7.1.4 | **Quick Actions** | Post Job, Review Applications, View Reports | Navigation links | ✅ LIVE |
| 7.1.5 | **Refresh Button** | Manual data refresh with cache invalidation | `invalidateDashboardCache` | ✅ LIVE |

#### QA Test Points — Admin Dashboard
- [ ] Metrics load correctly from DB / cache
- [ ] Click "Refresh" → data updates without crash
- [ ] Alerts count reflects actual unapproved jobs

### 7.2 Job Approvals (`job-approvals/page.tsx`)
| # | Feature | Description | Backend | Status |
|---|---------|-------------|---------|--------|
| 7.2.1 | **Pending Jobs List** | Recruiter jobs submitted for approval | `admin-jobs` | ✅ LIVE |
| 7.2.2 | **Approve Job** | Approve and publish job listing | `admin-jobs` PATCH | ✅ LIVE |
| 7.2.3 | **Reject Job** | Reject with reason | `admin-jobs` PATCH | ✅ LIVE |
| 7.2.4 | **Job Preview** | Full job preview before approval | Job detail render | ✅ LIVE |

### 7.3 Applications (`applications/page.tsx`)
| # | Feature | Description | Backend | Status |
|---|---------|-------------|---------|--------|
| 7.3.1 | **All Applications** | Platform-wide applications list with filters | `admin-applications` | ✅ LIVE |
| 7.3.2 | **Update Status** | Admin can update any application status | `admin-applications` PATCH | ✅ LIVE |
| 7.3.3 | **Withdrawn Guard** | Cannot update withdrawn applications (409 error) | Backend validation | ✅ LIVE |

### 7.4 Candidates (`candidates/page.tsx`)
| # | Feature | Description | Backend | Status |
|---|---------|-------------|---------|--------|
| 7.4.1 | **Candidate Directory** | All registered candidates | `admin-candidates` | ✅ LIVE |
| 7.4.2 | **Suspend/Ban** | Admin can disable candidate accounts | Role/status update | ✅ LIVE |

### 7.5 Recruiters (`recruiters/page.tsx`)
| # | Feature | Description | Backend | Status |
|---|---------|-------------|---------|--------|
| 7.5.1 | **Recruiter Directory** | Directory of recruiters (Note: Recruiters cannot log in) | `admin-recruiters` | ✅ LIVE |
| 7.5.2 | **Approve Recruiter** | Activate recruiter account status | `activate-recruiter` | ✅ LIVE |

### 7.6 Companies (`companies/page.tsx`)
| # | Feature | Description | Backend | Status |
|---|---------|-------------|---------|--------|
| 7.6.1 | **Company Directory** | All registered companies | `admin-companies` | ✅ LIVE |
| 7.6.2 | **Edit Company** | Modify company name, industry, website, logo | `admin-companies` PATCH | ✅ LIVE |

### 7.7 Jobs Management (`jobs/page.tsx`)
| # | Feature | Description | Backend | Status |
|---|---------|-------------|---------|--------|
| 7.7.1 | **All Jobs List** | Platform-wide job listings | `admin-jobs` | ✅ LIVE |
| 7.7.2 | **Edit/Delete Job** | Modify details or remove job listings | `admin-jobs` PATCH/DELETE | ✅ LIVE |

### 7.8 Announcements (`announcements/page.tsx`)
| # | Feature | Description | Backend | Status |
|---|---------|-------------|---------|--------|
| 7.8.1 | **Announcements** | Platform announcements feed is disabled | — | 🔲 STUB |

### 7.9 Blogs (`blogs/page.tsx`)
| # | Feature | Description | Backend | Status |
|---|---------|-------------|---------|--------|
| 7.9.1 | **Blog List** | All blog posts | `admin-blogs` | ✅ LIVE |
| 7.9.2 | **Create/Edit Blog** | Title, content, cover image upload, tags | `admin-blogs` POST/PATCH | ✅ LIVE |
| 7.9.3 | **Upload Blog Image** | Cover image upload | `upload-blog-image` | ✅ LIVE |

### 7.10 Audit Logs (`audit-logs/page.tsx`)
| # | Feature | Description | Backend | Status |
|---|---------|-------------|---------|--------|
| 7.10.1 | **Audit Log Feed** | Admin actions audit log | `admin-audit-logs` | ✅ LIVE |
| 7.10.2 | **Export Audit** | Download audit log as CSV | `admin-export-audit` | ✅ LIVE |

### 7.11 Reports (`reports/page.tsx`)
| # | Feature | Description | Backend | Status |
|---|---------|-------------|---------|--------|
| 7.11.1 | **Reports & Telemetry** | Reports, growth trends, telemetry tabs are disabled | — | 🔲 STUB |

### 7.12 Search (`search/page.tsx`)
| # | Feature | Description | Backend | Status |
|---|---------|-------------|---------|--------|
| 7.12.1 | **Global Search** | Search across users, jobs, companies | Multi-table query | ✅ LIVE |

### 7.13 Notifications (`notifications/page.tsx`)
| # | Feature | Description | Backend | Status |
|---|---------|-------------|---------|--------|
| 7.13.1 | **Admin Alerts** | Alerts and notifications are disabled | — | 🔲 STUB |

### 7.14 Settings (`settings/page.tsx`)
| # | Feature | Description | Backend | Status |
|---|---------|-------------|---------|--------|
| 7.14.1 | **Tab: General** | Profile name, Feature Flags, Maintenance Mode | `admin-settings` | ✅ LIVE |
| 7.14.2 | **Tab: Devices** | Active user sessions list with revoke ability | `user_sessions` query | ✅ LIVE |
| 7.14.3 | **Tab: Quarantine** | Quarantined file restore/delete management | `quarantined_files` | ✅ LIVE |

---

## 8. Platform-Wide / Shared Features

### 8.1 Navigation & Layout
| # | Feature | Description | Status |
|---|---------|-------------|--------|
| 8.1.1 | **Sidebar** | Candidate and Admin layouts | ✅ LIVE |
| 8.1.2 | **Responsive** | Mobile/desktop compatibility | ✅ LIVE |
| 8.1.3 | **Notification Bell** | Notification bell is disabled / hidden | 🔲 STUB |

### 8.2 Shared UI Components
- `Toast`: Success/error notifications
- `ConfirmModal`: Confirmation flows
- `DataTable`: Sortable data grids
- `FilterBar`: Filters and search inputs
- `StatusPill`: Visual status indicators
- `CustomSelect`: Stylized selector dropdowns

---

## 9. Edge Functions (Backend API) Reference

Only edge functions matching the active features are called in this phase.

| # | Function Name | Purpose | Status in Use |
|---|---------------|---------|---------------|
| 1 | `auth-session` | Session validation & user_sessions management | ✅ ACTIVE |
| 2 | `auth-signup` | Candidate registration | ✅ ACTIVE |
| 3 | `auth-verify` | Candidate email OTP verification | ✅ ACTIVE |
| 4 | `candidate-applications` | Fetch candidate applications list | ✅ ACTIVE |
| 5 | `candidate-applications-id` | Get application details + withdraw | ✅ ACTIVE |
| 6 | `candidate-dashboard` | Get job listings feed for candidates | ✅ ACTIVE |
| 7 | `candidate-profile` | Get/update candidate profiles | ✅ ACTIVE |
| 8 | `profile-complete-onboarding` | Mark candidate onboarding as completed | ✅ ACTIVE |
| 9 | `admin-dashboard` | Admin metrics and alerts feed | ✅ ACTIVE |
| 10 | `admin-jobs` | Admin approve/reject/delete jobs | ✅ ACTIVE |
| 11 | `admin-applications` | Admin update application status | ✅ ACTIVE |
| 12 | `admin-candidates` | Admin candidate directory | ✅ ACTIVE |
| 13 | `admin-recruiters` | Admin recruiter directory | ✅ ACTIVE |
| 14 | `activate-recruiter` | Admin activate recruiter account status | ✅ ACTIVE |
| 15 | `admin-companies` | Admin companies directory + edits | ✅ ACTIVE |
| 16 | `admin-blogs` | Admin blog listing and edits | ✅ ACTIVE |
| 17 | `upload-blog-image` | Upload blog post cover image | ✅ ACTIVE |
| 18 | `admin-audit-logs` | Admin audit logs feed | ✅ ACTIVE |
| 19 | `admin-export-audit` | Download audit logs as CSV | ✅ ACTIVE |
| 20 | `admin-settings` | Admin settings management | ✅ ACTIVE |
| 21 | `upload-resume` | Candidate resume file upload | ✅ ACTIVE |
| 22 | `resume-proxy` | Secure download candidate resume PDF | ✅ ACTIVE |
| 23 | `jobs` | Public job feed and search queries | ✅ ACTIVE |
| 24 | `jobs-id` | Job detail overview | ✅ ACTIVE |

---

## 10. Database Tables Reference

Only the active tables listed below are fully utilized for Candidate and Admin features.

- `profiles`
- `candidate_profiles`
- `companies`
- `jobs`
- `applications`
- `saved_jobs`
- `user_sessions`
- `audit_logs`
- `blog_posts`
- `quarantined_files`
- `platform_settings`

---

## 11. Known Stubs & Planned Features

All recruiter portal views, candidate integrations (notifications, messaging, interviews, salary comparisons, reviews, recommendations), and admin tools (email templates, billing engine, announcements, RBAC, reports) are configured as **Stubs / Disabled** in this release.

---

## 12. Status Legend

| Symbol | Meaning |
|--------|---------|
| ✅ LIVE | Feature is fully implemented and functional |
| 🔲 STUB | Disabled / Stubbed / Hidden / Placeholder UI |

---

*This document is a living reference updated to guide testing efforts for the Active Candidate & Admin portal scopes.*

**Prepared by**: Engineering Team  
**Review Date**: 2026-07-08  
**Next Review**: Before Production Launch
