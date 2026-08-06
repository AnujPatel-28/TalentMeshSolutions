# TalentMesh project overview

**Audience:** Senior engineers, architects, and developers joining the project  
**Purpose:** First-read orientation for the TalentMesh product and codebase  
**Status:** Current high-level overview; verify live infrastructure before making production claims  
**Last reviewed:** 2026-08-04

## 1. Executive summary

TalentMesh is a recruitment SaaS platform that connects candidates, recruiters, companies, and platform administrators in one hiring workflow. The product combines public job discovery, candidate profiles and applications, recruiter applicant tracking, company verification, interviews, offers, administrative governance, and privacy operations.

The web application is built with Next.js and React. InsForge provides the primary backend platform for authentication, PostgreSQL/PostgREST data access, storage, serverless functions, realtime capabilities, and AI-provider access. Additional services support scheduling, video interviews, and email delivery.

The repository contains a substantial working product surface, but not every documented or scaffolded capability is production-complete. In particular, the AI features are currently not working as a reliable production capability. Development was paused while deciding the correct microservice/service boundary, orchestration model, contracts, and operational controls.

## 2. Problem statement

Recruitment workflows are commonly split across job boards, spreadsheets, applicant tracking systems, email, scheduling tools, video platforms, and disconnected evaluation processes. This creates several problems:

- Candidates have limited visibility into application progress.
- Recruiters manually move data between sourcing, screening, interviewing, and offer workflows.
- Companies require verification and controlled access for their recruiting teams.
- Administrators need consistent approval, audit, security, and privacy controls.
- AI-assisted recruiting features require careful governance because they process sensitive candidate information and can influence hiring decisions.

TalentMesh is intended to provide a single, governed workflow for these activities while preserving tenant isolation and candidate control over personal data.

## 3. Vision

TalentMesh aims to become a trusted talent network and recruitment operating system where:

- Candidates maintain a reusable professional profile and receive transparent application experiences.
- Recruiters discover, evaluate, communicate with, and hire candidates through one structured workspace.
- Companies control their recruiting organization, job postings, members, and approval state.
- Administrators can operate the marketplace safely through strong authorization, auditability, and privacy processes.
- AI augments human decision-making without becoming an opaque or ungoverned replacement for it.

## 4. Business goals

The business goals are:

1. Build a trusted two-sided marketplace for candidates and hiring organizations.
2. Increase the quality and speed of candidate-to-job matching.
3. Give recruiters a complete applicant tracking workflow from job creation to offer.
4. Establish company verification and recruiter team controls suitable for a production SaaS product.
5. Provide monetizable recruiter/company plans and platform services.
6. Build candidate trust through transparent status, privacy, consent, and data-request workflows.
7. Create a foundation for governed AI-assisted recruiting.

**Project-specific commercial targets:** [Add revenue targets, launch markets, conversion targets, retention targets, and service-level objectives.]

## 5. Technical goals

The technical goals are:

- Maintain a clear separation between presentation, request/session handling, backend functions, data access, and external providers.
- Enforce authentication and authorization on the server and in PostgreSQL RLS; do not rely on frontend filtering for isolation.
- Support candidate, recruiter, company, and admin workflows without duplicating business rules across clients.
- Keep sensitive credentials server-side and use explicit allow-lists for privileged operations.
- Make migration, deployment, function, storage, and live-schema state observable and verifiable.
- Provide testable contracts for APIs, functions, state transitions, and data-request operations.
- Introduce AI only behind a stable, governed service boundary with versioned contracts, validation, usage controls, and human-review safeguards.

**Project-specific non-functional targets:** [Add availability, latency, throughput, recovery-time, recovery-point, data-retention, and compliance targets.]

## 6. Target users

### Candidates

Candidates create profiles, manage resumes, discover jobs, apply, track application progress, attend interviews, review offers, manage notifications, and exercise privacy/data rights.

### Recruiters

Recruiters represent a company, create and manage jobs, search candidate profiles, operate applicant pipelines, coordinate interviews, communicate with candidates, and prepare offers.

### Company administrators and members

Companies manage organization details, verification, recruiter membership, job ownership, and company-level recruiting controls. Member permissions vary by company role.

### Platform administrators

Platform administrators manage users, companies, recruiters, job approvals, verification queues, audit records, subscriptions/plans, content, notifications, reports, and data-principal requests.

### Internal operators and developers

Internal teams operate deployments, backend configuration, support workflows, security reviews, data operations, and provider integrations.

## 7. Product modules

| Module | Purpose |
|---|---|
| Public marketplace | Landing pages, job discovery, company pages, employer content, blog, privacy, and terms |
| Candidate experience | Registration, onboarding, profile, resume management, job search, applications, interviews, messages, notifications, analytics, and settings |
| Recruiter workspace | Company onboarding, jobs, candidate discovery, applicant pipeline, interviews, offers, reports, invitations, integrations, and settings |
| Company management | Company profile, business metadata, verification, members, roles, and company lifecycle |
| Admin operations | User, recruiter, company, job, application, content, notification, plan, billing, report, and settings administration |
| Authentication and session governance | Email authentication, OAuth, verification, password recovery, sessions, MFA, role routing, and onboarding gates |
| Communication | Email, notifications, messages, scheduling, interview-room access, and application updates |
| Privacy and compliance operations | Consent history, data access/export, withdrawal, erasure requests, audit trails, and administrative review |
| AI Intelligence Engine | Planned AI-assisted parsing, matching, interview assistance, and recommendations; currently paused and not production-working |

## 8. Core features

### Candidate features

- Candidate signup, verification, authentication, and onboarding.
- Profile, skills, experience, education, preferences, and social links.
- Resume upload, storage, selection, preview, and management.
- Public job browsing, filtering, job details, saving, and application submission.
- Application status and timeline visibility.
- Interview scheduling, interview-room access, interview history, and review pages.
- Notifications, messages, analytics, referrals, company reviews, and account settings.
- Consent management, data export, privacy requests, and account/erasure workflows.

### Recruiter and company features

- Recruiter access request and company setup.
- Company verification and business metadata.
- Company member invitations, membership status, and member roles.
- Job drafts, templates, editing, approval submission, publishing, pausing, closing, and expiry.
- Candidate search, saved candidates, shortlists, profile review, and recruiter notes.
- Application pipeline management across screening, interviewing, offer, hire, rejection, and withdrawal states.
- Interview preparation, scheduling, interview guides, and candidate communication.
- Offer creation, offer status, salary information, and offer review.
- Reports, notifications, integrations, and recruiter settings.

### Admin features

- Candidate, recruiter, and company administration.
- Company and recruiter verification queues.
- Job approval and application oversight.
- Audit logs and security-sensitive administrative actions.
- DPDP/data-principal request review.
- Subscription plans, billing views, reports, platform settings, blogs, announcements, notifications, and email templates.

## 9. High-level system overview

```text
Users
  |
  v
Next.js web application
  |-- Public pages and role-based portals
  |-- Server-rendered layouts and client components
  |-- Same-origin API/session proxy
  v
InsForge platform
  |-- Authentication and sessions
  |-- PostgreSQL/PostgREST database
  |-- Row-Level Security and database functions
  |-- Storage buckets
  |-- Serverless functions
  |-- Realtime features
  |-- AI-provider access
  v
External services
  |-- Daily.co video rooms
  |-- Cal.com scheduling
  |-- Resend and/or SMTP email
  |-- Configured OAuth providers
```

The application uses host- and role-aware routing for public, candidate, recruiter, and admin experiences. Compatibility routes exist alongside newer canonical routes; new work should use the canonical route conventions established in the current application code.

The system is multi-tenant at the company/recruiter level. The exact authorization path for a feature must be checked across the UI, server/API/function layer, and database RLS.

## 10. Technology stack

| Area | Technology or service | Status/notes |
|---|---|---|
| Web framework | Next.js App Router | Current application framework |
| UI runtime | React and TypeScript | Current application runtime |
| Styling | Tailwind CSS 3.4, CSS Modules, utility/component styling | Tailwind major version is intentionally 3.x |
| UI components | Radix UI, MUI, project components, shadcn-related tooling | Use existing patterns before introducing new primitives |
| Client data | TanStack React Query | Server data fetching and caching |
| Client state | Zustand | UI and local application state |
| Animation/icons | Framer Motion, Lucide React | Presentation layer |
| Backend platform | InsForge | Auth, database, storage, functions, realtime, and AI access |
| Database | PostgreSQL through PostgREST | RLS and database functions are part of the security model |
| Serverless runtime | InsForge/Deno functions | Function deployment state must be verified live |
| Video | Daily.co | Interview-room integration; provider configuration required |
| Scheduling | Cal.com embed | Booking integration; provider configuration required |
| Email | Resend and Nodemailer/SMTP paths | Delivery configuration must be verified per environment |
| Authentication providers | Email/password and configured OAuth providers | Google and LinkedIn flows exist in the application; provider setup remains environment-specific |
| Validation | Zod and project validators | Used for request and response validation |
| Testing | Vitest, Testing Library, Playwright | Unit/component and browser-level test suites |
| Deployment | Next.js hosting plus InsForge backend deployment | Exact production topology: [Document hosting, domains, CI/CD, and environments.] |

Package versions should be taken from `package.json` and `package-lock.json`, not copied from older architecture documents.

## 11. Architecture principles

1. **Server-side authorization is authoritative.** UI guards improve navigation; they do not provide security.
2. **Database isolation is defense in depth.** RLS should enforce user, company, role, and tenant boundaries.
3. **Service keys never reach the browser.** Privileged access belongs in trusted server routes or functions.
4. **Business transitions have one authoritative owner.** Avoid implementing the same approval or lifecycle rule independently in multiple clients.
5. **Explicit contracts beat inferred shapes.** Validate request bodies, responses, state transitions, and AI outputs.
6. **Live backend state must be verified.** A committed migration or function file does not prove deployment.
7. **Prefer incremental, reversible changes.** Backend schema and authorization changes require a migration and rollback/recovery plan.
8. **Privacy is part of the data model.** Consent, visibility, erasure, export, retention, and audit behavior must be considered when adding data.
9. **AI is assistive and governed.** AI output must be versioned, validated, observable, and subject to product-approved human oversight.
10. **Canonical routes and shared modules should be preferred.** Compatibility routes should not become new integration targets.

## 12. Repository structure

The high-level repository layout is:

```text
tm-main/
├── app/                    # Next.js routes, pages, layouts, and API handlers
├── components/             # Shared and domain UI components
├── lib/                    # Clients, auth, queries, validation, server helpers, and utilities
├── insforge/
│   ├── functions/           # Serverless functions and shared function code
│   └── migrations/          # SQL schema, RLS, trigger, and data migrations
├── scripts/                # Setup, verification, migration, and operational helpers
├── e2e/                    # Playwright tests
├── __tests__/              # Unit and component tests
├── docs/                   # Architecture, product, audit, legal, and operational documents
├── public/                 # Static assets
├── proxy.ts                # Next.js request routing/session boundary
├── next.config.ts          # Next.js configuration and headers/rewrites
├── package.json            # Scripts and dependencies
└── .insforge/              # Local project metadata; no secrets
```

This section intentionally omits individual files and implementation-level dependency graphs. Use the documentation map and the relevant module code for those details.

## 13. Current development status

### Working product areas

The repository contains implemented product surfaces for public pages, authentication, candidate workflows, recruiter/company workflows, admin workflows, storage, notifications, interviews, offers, consent, and data-principal request handling. The depth and live readiness of each area still require environment-specific verification.

### AI status: not working in production right now

AI functionality must currently be treated as **paused and non-operational**. The repository contains AI-related files and partial flows, including resume parsing, candidate/job matching, and interview assistance, but these pieces do not yet constitute a stable production AI engine.

Development stopped because the team needs to decide the microservice/service boundary before continuing. The unresolved design questions include:

- Whether AI runs entirely in InsForge functions or through a separate service.
- How long-running AI jobs are queued, retried, cancelled, and monitored.
- Which model providers and model versions are approved.
- How prompts, schemas, evaluations, cost, and usage are versioned.
- How candidate consent, recruiter access, privacy, and retention apply to AI inputs and outputs.
- Which AI results require human review before affecting a recruiting workflow.

Until that decision is made and validated, developers must not describe AI parsing, matching, recommendations, or interview scoring as production-ready. Any AI work should begin with an agreed contract and a testable service boundary rather than adding more isolated prompts to existing files.

Other project-specific status items:

- Live migration state: [Record the current live migration/schema verification date.]
- Production deployment status: [Record environment URLs and release version.]
- External provider readiness: [Record provider-by-provider readiness.]
- Known launch blockers: [Record current release gates.]

## 14. Documentation map

This overview is the entry point. Continue with the documents most relevant to the task:

| Document | Use it for |
|---|---|
| `AGENTS.md` | Repository and engineering instructions |
| `README.md` | Basic project setup and repository introduction |
| `DOCUMENTATION.md` | Existing project-level technical notes |
| `docs/database_schema.md` | Database concepts and schema notes; verify against live state |
| `docs/auth.md` | Authentication and session documentation |
| `docs/job_board_architecture.md` | Public job-board architecture |
| `docs/job_approval_test_plan.md` | Job approval testing |
| `docs/FRD-and-Technical-QA-Guide.md` | Product requirements and technical QA guidance |
| `docs/live_backend_security_audit.md` | Backend security findings and verification context |
| `docs/auth-audit-response.md` | Authentication audit findings and remediation context |
| `docs/RecruiterAndCompany_ArchitectureAndImplementation_Doc/` | Detailed recruiter, company, admin, migration, and implementation architecture |
| `audits/` | Product, security, database, operations, and production-readiness audits |
| `insforge/migrations/` | Committed SQL changes; not proof of live application |
| `insforge/functions/` | Current serverless function implementations |
| `e2e/` and `__tests__/` | Automated verification and regression coverage |

When documentation conflicts, check the current code and then the live backend. Update the relevant detailed document when a decision changes the architecture.

## 15. Glossary

| Term | Meaning |
|---|---|
| AI Intelligence Engine | Planned governed layer for AI-assisted parsing, matching, interview assistance, and recommendations; currently paused and not production-working |
| Applicant Tracking System (ATS) | Recruiter workflow for managing candidates and applications through hiring stages |
| Candidate | A person seeking employment through the platform |
| Company | Organization that owns recruiting activity, jobs, and recruiter memberships |
| Company member | Recruiter or company user associated with a company and governed by a company role/status |
| Edge/serverless function | Backend function deployed through the InsForge function platform |
| InsForge | Backend-as-a-service platform used by TalentMesh |
| Job approval | Administrative review of a recruiter-created job before public publication |
| PostgREST | HTTP interface exposing PostgreSQL data and database operations |
| RLS | PostgreSQL Row-Level Security policies that restrict records by authenticated identity and authorization rules |
| Recruiter | User who manages company hiring workflows |
| Role | Platform or company authorization classification, such as candidate, recruiter, admin, or super admin |
| Same-origin proxy | Application endpoint that forwards browser requests to backend services while preserving the application session boundary |
| Service key | Privileged backend credential; must remain server-side |
| Tenant | An isolated organization/company context and its associated users and data |
| Data principal request | A request by a person to access, correct, withdraw, or erase personal data |
| DPDP | India’s Digital Personal Data Protection context; implementation must be validated with current legal and operational requirements |
