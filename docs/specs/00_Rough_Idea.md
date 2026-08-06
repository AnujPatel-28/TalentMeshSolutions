Company and Recruter side  Architecture ( rough idea) for fable 5

Purpose This repository contains the official architecture idea documentation for the TalentMesh Recruiter Platform. The purpose of these documents is to define how the platform is thought to be designed, why certain architectural decisions were made, and how every engineer or ai agents should implement new features while maintaining consistency, scalability, and security. This documentation is considered the single source of truth for idea of  the Recruiter Platform architecture. if you have any suggestion thing we missed then suggest 

---

 Vision TalentMesh is designed to become a trusted recruitment platform where verified companies can securely recruit candidates while protecting candidate privacy, maintaining strong authorization boundaries, and supporting collaborative recruiter teams. Unlike traditional job portals, TalentMesh follows a Company-First Architecture. The company—not the recruiter—is the primary business entity. Everything inside the recruiter platform belongs to a company. ( you can refer best praacticess used by indeed and other recutment portal)

Examples include: 
- Recruiters
- Jobs 
- Hiring Pipelines 
- Recruiter Teams 
- Candidate Access 
- Billing 
- Company Branding
Recruiters simply act on behalf of their company.

# Core Design Principles Every engineering decision within TalentMesh should follow these principles. 
## 1. Company First Companies own data. 
Recruiters never own company resources. Jobs belong to companies. Candidate pipelines belong to companies. Subscriptions belong to companies. Recruiters are members of a company.

## 2. Verification Before Access 
Recruiter features are unavailable until TalentMesh verifies that the recruiter belongs to a legitimate company. Verification is a business process, not merely an authentication step.

## 3. Security by Default Security should not depend on frontend code. 
Every sensitive operation must be validated by the backend. The database is the final authority for authorization.

## 4. Least Privilege Every recruiter receives only the permissions required for their role.
No recruiter receives administrative privileges by default.

## 5. Zero Trust Every request must be validated.
Never assume: - authenticated users are authorized - company IDs from the client are trustworthy - hidden UI elements provide security Authorization is performed on the server. ---

## 6. Database Enforced Authorization 
Authorization must be enforced using Row-Level Security (RLS) wherever possible. 
Frontend restrictions are only for user experience. Backend authorization is mandatory.

## 7. Single Source of Truth 
Each business concept should have exactly one authoritative location. Examples: Company status → companies table Recruiter profile → recruiter_profiles table User identity → profiles table Avoid duplicated business state across multiple tables. 

---
## 8. Audit Everything Important
Administrative actions should be traceable. Examples: Company approval Recruiter approval Role changes Permission changes Document verification Company suspension Every important action should eventually produce an audit record. ---

## 9. Scalability Design 
decisions should support growth from: 10 companies to 100 companies to 10,000 companies without architectural redesign.

## 10. Simplicity First TalentMesh
Phase 1 intentionally favors simple and understandable systems over premature optimization. Complexity should only be introduced when justified.

# Architecture Overview

High-Level Domain Model

                    TalentMesh

                         │

          ┌──────────────┴──────────────┐

          ▼                             ▼

    Candidate Platform          Recruiter Platform

                                        │

                                 Verified Companies

                                        │

                              ┌─────────┴──────────┐

                              ▼                    ▼

                       Recruiter Teams          Company Data

                              │

                     ┌────────┴─────────┐

                     ▼                  ▼

                 Recruiters           Jobs

                     │                  │

                     └──────────┬───────┘

                                ▼

                         Candidate Applications

---
# Recruiter Platform Philosophy

TalentMesh is not designed around recruiters.

It is designed around organizations.

A recruiter may:

- leave the company
- change departments
- lose permissions
- be suspended

The company continues operating.

Jobs remain active.

Candidate history remains intact.

Billing continues.

Other recruiters continue hiring.

This principle prevents data loss and simplifies long-term ownership.

---

# Security Philosophy

TalentMesh follows industry-standard security principles commonly adopted by enterprise SaaS platforms.

Examples include:

- Principle of Least Privilege
- Zero Trust
- Defense in Depth
- Secure by Default
- Server-side Authorization
- Database-enforced Authorization
- Private Document Storage
- Audit Logging
- Session Validation
- Role-Based Access Control

Where possible, authorization decisions should be enforced at the database layer using Row-Level Security.

---

# Current Phase 

describes Phase 1 of the Recruiter Platform.

Characteristics:

✔ Manual Company Verification

✔ Manual Recruiter Approval

✔ Gmail-based KYC Submission

✔ Internal Document Storage

✔ Company-Centric Architecture

✔ Recruiter Teams

✔ Role-Based Permissions

✔ Database Authorization

---

# Future Phase

Future versions of TalentMesh may introduce:

- Secure Upload Portal
- Automated Company Verification
- OCR Processing
- AI-Assisted Document Review
- Permission-Based RBAC
- Enterprise SSO
- Multi-Tenant Organizations
- Department Hierarchies
- Billing Administration
- API Access
- Organization Invitations

These future enhancements are documented separately and are intentionally excluded from Phase 1 implementation.

---

# Guiding Rule

Whenever implementation and documentation disagree,

the documentation should be reviewed first.

If implementation intentionally changes architecture,

the documentation must be updated before the feature is considered complete.

This keeps the architecture as the single source of truth for the TalentMesh platform.

----
Documentation if done suggested format :- 

# Document Title

Status:
Owner:
Version:
Last Updated:

---

# Purpose

...

---

# Background

...

---

# Problem Statement

...

---

# Goals

...

---

# Non Goals

...

---

# Architecture

...

---

# Database Model

...

---

# State Machine

...

---

# Workflow

...

---

# Mermaid Diagrams

...

---

# Security

...

---

# Edge Cases

...

---

# Failure Recovery

...

---

# Tradeoffs

...

---

# Future Improvements

...

---

# Implementation Checklist

...

---

# References

...

---

for phase 1 
 rough idea for mannual verificaation:- 
 Recruiter
      │
      ▼
Clicks "Request Recruiter Access"
      │
      ▼
Completes Registration Form
      │
      ▼
Creates Auth Account
      │
      ▼
Creates Profile
      │
      ▼
Status = Pending
      │
      ▼
Instructions shown to recruiter
      │
      ▼
Recruiter emails KYC documents
      │
      ▼
verification@talentmesh...


Recruiter Email
        │
        ▼
TalentMesh Gmail
        │
        ▼
Admin Reviews
        │
        ├─────────────► Company Website
        │
        ├─────────────► GST Details
        │
        ├─────────────► LinkedIn
        │
        ├─────────────► Business Documents
        │
        ├─────────────► Company Email Domain
        │
        └─────────────► Additional Checks



# Company Creation

After verification:

```
Company Not Found
        │
        ▼
Create Company Record
        │
        ▼
companies
```

If the company already exists:

```
Recruiter
      │
      ▼
Attach Recruiter
      │
      ▼
Existing Company
```

Only one company record exists for one organization.

Multiple recruiters belong to the same company.

---
# Recruiter Activation

Once verification succeeds:

```
profiles

status = active

↓

completed_onboarding = true
```

The recruiter can now sign in.

----

# Login Flow

```
Recruiter Login
        │
        ▼
Authentication
        │
        ▼
Load Profile
        │
        ▼
status == active ?
        │
   Yes ───────► Continue
        │
        No
        ▼
Pending Approval Screen
```

---

# Authorization

Every authenticated recruiter belongs to exactly one company.

```
Recruiter

↓

company_id

↓

companies

↓

Jobs

↓

Candidates

↓

Recruiter Team

↓

Billing
```

Every recruiter action is scoped by `company_id`.


----
# Job Posting

```
Recruiter
      │
      ▼
Create Job
      │
      ▼
jobs

company_id

recruiter_id
```

Jobs belong to the company, not to the individual recruiter.

If a recruiter leaves, the jobs remain with the company.

----

# Candidate Privacy (RLS)

A recruiter cannot view every candidate.

They can only access candidates who applied to jobs belonging to their own company.

```
Candidate

↓

Application

↓

Job

↓

Company

↓

Recruiter
```

The database enforces this using Row-Level Security (RLS).

The frontend never decides permissions.

----
 Talentpool feature for companies ( it will be payable means on based on the plan they perchase it will be decided later)

feaature like:- [Naukri Resdex](https://www.naukri.com/recruit/resume-database-access-resdex) and [Indeed Smart Sourcing](https://in.indeed.com/employers/smart-sourcing) are both active talent sourcing databases where employers can search for candidates rather than waiting for applications. However, they differ in ==database size, geographic focus, and sourcing features==. [[1](https://www.indeed.com/hire/resources/howtohub/how-to-consistently-attract-and-filter-quality-applicants), [2](https://internshala.com/blog/employer-naukri-resdex-price/)]

Naukri Resdex

**Key Features:**

- **Scale:** Access to India's largest job-seeker database with over 10 crore searchable resumes.

- **Search Tools:** Includes advanced filters, Boolean logic, custom role matching, and specific IT or EZ (single-textbox) search options.

- **Quick Actions:** Allows recruiters to shortlist, email, SMS, or directly dial and chat with candidates using a single click via the Naukri app.

- **AI Matching:** Suggests similar candidate profiles and recommends relevant keywords to expand your talent pool. [[1](https://www.naukri.com/recruit/resume-database-access-resdex), [2](https://www.scribd.com/presentation/278954010/rersdex), [3](https://recruiterzone.naukri.com/introducing-a-refreshed-resdex/), [4](https://in.indeed.com/employers/smart-sourcing), [5](https://internshala.com/blog/employer-naukri-resdex-price/)]

Indeed Smart Sourcing (Resume Search)

**Key Features:**

- **Scale:** Access to a global pool of over 350 million candidates.

- **AI & Sourcing Assistant:** Uses AI to highlight candidate skills, generate custom outreach messages, and automatically source candidates 24/7.

- **Candidate Fit:** Generates "Smart Fit" scores indicating how closely a profile aligns with your specific job criteria.

- **Insights:** Provides access to candidate Glassdoor profiles and engagement analytics (like open rates and response rates). [[1](https://www.indeed.com/employers/solutions/smart-sourcing), [2](https://in.indeed.com/employers/smart-sourcing), [3](https://www.indeed.com/hire/resources/howtohub/what-is-indeed-smart-screening), [4](https://resumes.indeed.com/purchase?co=CH&hl=en), [5](https://resumes.indeed.com/purchase?co=CA&hl=en)]


for phase 1 we will not use ai for talent pool feature 

and for phase 1 we are thinking of giving free 1 active job posting and in it if they have to post 2 active  post for free it is not able to for that we will decide a paid plan and in free they can do like if live posting iss there they can close the active posting of the job and they can live another active posting 

----

just an idea do you have suggestion then say accourding to the architecture :-
---

# Recruiter Role Evolution

Phase 1:

```
Admin

Recruiter

Coordinator
```

Phase 2:

Permission-based RBAC.

Example permissions:

- Post Jobs
- Manage Recruiters
- View Candidates
- Export Data
- Manage Billing
- Purchase Subscription
- Create Departments
- Manage Hiring Pipeline

Roles become collections of permissions rather than fixed labels.


-----

# Audit Trail

Every verification action will be recorded.

Example:

```
Company Created

↓

Documents Uploaded

↓

Reviewed By

↓

Verification Notes

↓

Approved

↓

Recruiter Activated
```

This creates a complete history for support, compliance, and investigations.


----

# Automated Verification Assistance

Future enhancements may include:

- GST validation
- Company domain verification
- Email domain matching
- Duplicate company detection
- AI-assisted document review
- OCR extraction from business documents
- Fraud detection signals

These features assist administrators but do not replace human approval.

---

# Guiding Principles

1. **Trust before access** — Employer features are available only after company verification.
2. **Company-first architecture** — Companies own recruiters, jobs, and organizational resources.
3. **Database-enforced security** — RLS is the final authority; the frontend is never trusted for authorization.
4. **Single source of truth** — Each entity has one authoritative record and clear ownership.
5. **Incremental evolution** — Phase 1 prioritizes simplicity and trust, while Phase 2 introduces scalable automation without changing the core architecture.
---

##documentation creation guide suggestion (changes can be done' based on architecture dicissions ):-

The Phase 1 documentation would be much more detailed than the summary we created. It would cover topics such as:

### 1. System Overview
for eg:- 
- Purpose of the recruiter platform
- Core design philosophy
- Why companies are the primary entity
- High-level architecture

### 2. Database Model
for eg :-
- `profiles`
- `recruiter_profiles`
- `companies`
- relationships between tables
- ownership rules
- entity diagrams

### 3. Company Model
for eg :-
- company lifecycle
- company creation
- company uniqueness
- verified vs pending companies
- company ownership

### 4. Recruiter Model
for eg :-
- recruiter lifecycle
- recruiter profile
- company assignment
- onboarding flow

### 5. Company Verification
for eg :-
- Gmail-based document submission
- admin verification workflow
- required KYC documents
- approval process
- rejection process
- document storage

### 6. Authentication
for eg :-
- login
- session validation
- recruiter activation
- pending users
- rejected users
### 7. Authorization (RBAC)
eg :- 
Including detailed permission matrices such as:
|Permission|Company Admin|Recruiter|Coordinator|
|---|---|---|---|
|Post Jobs|✅|✅|❌|
|Edit Jobs|✅|Own Jobs|❌|
|Delete Jobs|✅|Own Jobs|❌|
|View Applicants|✅|Assigned|Assigned|
|Invite Recruiters|✅|❌|❌|
|Remove Recruiters|✅|❌|❌|
|Manage Company|✅|❌|❌|
|Billing|✅|❌|❌|

along with explanations of why each permission exists.


### 8. Multi-Recruiter Collaboration

How multiple recruiters work within the same company, for example:

- Recruiter A posts Software Engineer.
- Recruiter B posts Product Manager.
- Company Admin can see both.
- Recruiter A cannot edit Recruiter B's jobs unless granted permission.
- Coordinators assist with scheduling and communication but cannot publish jobs.

This section would also describe ownership, visibility, and collaboration rules.


### 9. Job Ownership
eg :- 
- recruiter ownership
- company ownership
- reassignment
- recruiter leaves company
- deleted recruiters
- archived jobs

### 10. Candidate Access Rules
eg :-
- RLS principles
- who can see candidate data
- when candidate data becomes visible
- privacy guarantees

### 11. Security Model
eg :-
- why company-based authorization
- avoiding email-domain trust
- audit principles
- server-side authorization
- RLS overview

### 12. Edge Cases
eg :-
Examples such as:

- recruiter joins existing company
- duplicate company requests
- recruiter rejected
- recruiter leaves company
- company deactivated
- suspended recruiter
- company name changes

### 13. Admin Dashboard Responsibilities
eg :-
- pending approvals
- verification queue
- recruiter management
- company management
- audit history

### 14. Complete Workflow Diagrams
eg :-
Using Mermaid diagrams for:

- recruiter onboarding
- approval
- login
- authorization
- job posting
- candidate visibility
- recruiter invitation

### 15. Future Evolution
eg :-
A section at the end describing how Phase 1 naturally evolves into Phase 2 without changing the core architecture.

---
## My recommendation

Given the importance of this system, I would write this as **professional engineering documentation**, roughly **40–60 pages** worth of Markdown if rendered. It would read like an internal architecture specification rather than simple notes.

It would include:

- detailed explanations
- architecture decisions
- diagrams
- database relationships
- permission matrices
- lifecycle diagrams
- sequence diagrams
- edge cases
- security considerations
- implementation notes
- rationale for each design choice

The goal would be that **a new engineer—or even an AI coding agent—could implement the entire Phase 1 recruiter/company system correctly by reading only these documents**, without needing additional clarification. That level of documentation becomes a long-term asset as the project grows.