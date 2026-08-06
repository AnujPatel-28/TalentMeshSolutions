# TalentMesh Role-Based Security Matrix

This document provides a detailed security matrix evaluating access control boundaries, permission restrictions, data isolation rules, and potential privilege escalation vectors across all platform user roles.

---

## 1. Role Definition Overview

```
+-----------------------------------------------------------------------------------+
|                            PRIVILEGE HIERARCHY MAP                                |
+-----------------------------------------------------------------------------------+
| LEVEL 4: SUPER ADMIN (`super_admin`)                                              |
|  - Full DB RLS Bypass via Service Key                                             |
|  - User Impersonation, System Config, Audit Logs, Platform Governance             |
+-----------------------------------------------------------------------------------+
| LEVEL 3: ADMINISTRATOR (`admin`)                                                  |
|  - Approve Job Postings, Verify Recruiter Companies, Manage Users                 |
+-----------------------------------------------------------------------------------+
| LEVEL 2: RECRUITER / EMPLOYER (`recruiter`)                                       |
|  - Post & Manage Company Jobs, Review Applicants, Download Resumes (Active Apps)  |
+-----------------------------------------------------------------------------------+
| LEVEL 1: CANDIDATE (`candidate`)                                                  |
|  - Manage Personal Profile, Upload Resumes, Apply to Jobs, View Application Status |
+-----------------------------------------------------------------------------------+
| LEVEL 0: ANONYMOUS / PUBLIC VISITOR (`anonymous`)                                 |
|  - Browse Published Jobs, View Blog Posts, Contact Form, Login / Signup Pages     |
+-----------------------------------------------------------------------------------+
```

---

## 2. Granular Role Security Analysis

### 2.1 Anonymous / Public Visitor (`anonymous`)
- Read-only access to published jobs and public blog posts. All protected candidate/recruiter/admin pages redirect to `/login`.

### 2.2 Candidate Role (`candidate`)
- Access restricted to own candidate profile, resume management, and application status. Attempting to access candidate B's profile or recruiter pages is blocked by Edge Proxy (`proxy.ts`) and database RLS.

### 2.3 Recruiter / Employer Role (`recruiter`)
- Access restricted to company jobs, company applicants, and company recruiters. Pending recruiters are restricted to `/pending-approval`. Candidate resume downloads require an active application submitted to the recruiter's company.

### 2.4 Administrator & Super Admin (`admin` / `super_admin`)
- Platform-wide governance, job approvals, company verification, audit logs, and user impersonation capabilities. Requires MFA verification when `mfa_enabled = true`.

---

## 3. Comprehensive Role Permission Matrix

| System Resource / Action | Anonymous | Candidate | Recruiter (Pending) | Recruiter (Active) | Admin / Super Admin |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Browse Published Jobs** | ✅ Allowed | ✅ Allowed | ❌ Blocked | ✅ Allowed | ✅ Allowed |
| **View Candidate Dashboard** | ❌ Redirect | ✅ Allowed | ❌ Redirect | ❌ Redirect | ❌ Redirect |
| **Upload Resume** | ❌ Denied | ✅ Own Only | ❌ Denied | ❌ Denied | ❌ Denied |
| **Apply for Job** | ❌ Redirect | ✅ Allowed | ❌ Denied | ❌ Denied | ❌ Denied |
| **Post Job Listing** | ❌ Denied | ❌ Denied | ❌ Redirect | ✅ Own Co Only| ✅ All |
| **Review Company Applicants** | ❌ Denied | ❌ Denied | ❌ Redirect | ✅ Own Co Only| ✅ All |
| **Download Applicant Resume** | ❌ Denied | ✅ Own Only | ❌ Blocked | ✅ Active Apps | ✅ All |
| **Access Recruiter Documents** | ❌ Denied | ❌ Denied | ❌ Denied | ❌ Denied | ✅ Verified Admin |
| **User Impersonation** | ❌ Denied | ❌ Denied | ❌ Denied | ❌ Denied | ✅ Super Admin |
