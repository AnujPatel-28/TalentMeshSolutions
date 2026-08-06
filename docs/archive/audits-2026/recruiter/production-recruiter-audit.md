# Production Audit Report — Recruiter Module

**Feature Area:** Recruiter Dashboards, Company Profiles, Job Pipelines, and Placements  
**Audit Date:** 2026-06-11  
**Auditor:** Principal SaaS Product Reviewer  
**Status:** 🔄 Needs Upgrade (due to missing sub-role RBAC)

---

## 1. Executive Evaluation

The Recruiter Module is functional, containing hiring workflows, scorecards, job creation (Draft -> Publish -> Archive), and resume reviews. However, the lack of recruiter sub-roles (e.g. Recruiter Admin vs Standard Recruiter) leaves company-wide settings vulnerable to modification by standard team members.

### 1.1 Recruiter Production Score
* **Production Score**: 78 / 100
* **Hiring Pipeline Usability**: 9.0 / 10
* **Team RBAC Security**: 5.5 / 10
* **Export Stability**: 9.5 / 10

---

## 2. Key Findings & Vulnerability Matrix

| Feature | Sub-Feature | Issue / Risk | Severity | Status | Affected Roles | Files |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Team Control** | Recruiter Sub-Roles | Any recruiter in a company can change the company settings, billing details, and edit other recruiters' job posts. No read-only or standard role separation exists. | `P1` | `Needs Upgrade` | Recruiter | `app/dashboard/recruiter/[role_id]/settings/page.tsx` |
| **Job Publishing** | Approval Pipeline | Jobs require approval from Admin. Recruiters can view unapproved jobs locally, but cannot bypass approval to make jobs active. RLS is enforced correctly. | `P2` | `Production Ready` | Recruiter, Admin | [jobs_select_approved policy](file:///d:/Talentmesh-AI-Recruiting-/insforge/migrations/001_schema_and_rls.sql#L247) |
| **Duplicate Profiles** | Company Domain Mapping | Multiple recruiters can sign up under different variations of the same company name, resulting in company profile fragmentation. | `P2` | `Needs Upgrade` | Recruiter | `insforge/functions/recruiter-profile/index.ts` |
| **Reporting** | CSV Export Queue | Large candidate/recruiter CSV exports utilize the background `export_jobs` queue, protecting server-side execution from client timeouts. | `P0` | `Production Ready` | Recruiter, Admin | [export-system-audit.md](../admin/export-system-audit.md) |

---

## 3. Implementation Recommendations

### 3.1 Implement Recruiter Sub-Roles (Recruiter Admin vs standard)
* **Problem**: Standard recruiters have the same company-wide configuration privileges as the hiring manager / admin.
* **Recommendation**: Add a `recruiter_role` enum (`admin`, `recruiter`, `coordinator`) in the `recruiter_profiles` table. Enforce checks in settings page components and write API middleware:
  ```typescript
  if (recruiterProfile.recruiter_role !== 'admin') {
    throw new Error('Access denied to company billing configurations.');
  }
  ```
* **Estimated Effort**: 8 hours (P1)

### 3.2 Implement Company Auto-Matching via Email Domain
* **Problem**: Fragmented company profile creation.
* **Recommendation**: Parse the recruiter's email domain on registration and automatically associate them with an existing company profile matching that domain, requiring admin approval for new company registrations.
* **Estimated Effort**: 5 hours (P2)
