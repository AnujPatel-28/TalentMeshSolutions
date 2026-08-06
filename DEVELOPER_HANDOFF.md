# TalentMesh Developer Handoff

**Project:** TalentMesh AI Recruiting Platform  
**Repository:** `tm-main`  
**Document status:** Working handoff, based on the current repository  
**Last reviewed:** 2026-08-04  

## 1. What this project is

TalentMesh is a recruitment SaaS platform for candidates, recruiters, companies, and platform administrators.

The product currently includes:

- Public job discovery and company pages.
- Candidate registration, onboarding, profiles, resumes, applications, saved jobs, interviews, messages, notifications, and privacy controls.
- Recruiter onboarding, company membership, job creation, job approval, candidate search, applicant pipeline, interviews, offers, reports, and recruiter settings.
- Admin dashboards for candidates, recruiters, companies, jobs, applications, verification, audit logs, DPDP requests, plans, billing, announcements, blogs, notifications, and settings.
- InsForge-backed authentication, PostgreSQL/PostgREST data, storage, serverless functions, and realtime features.

This document is a practical orientation document. It is not proof that every feature is production-ready or that every committed migration has been applied to the live backend.

## 2. Source-of-truth rules

Use the following order when information conflicts:

1. Current runtime code in `app/`, `components/`, `lib/`, and `insforge/functions/`.
2. The live InsForge schema, RLS policies, storage buckets, secrets, and deployed functions.
3. SQL files in `insforge/migrations/`.
4. Architecture and audit documents in `docs/` and `audits/`.

Committed SQL is not evidence that the SQL is live. Before changing a table, policy, function, bucket, or trigger, inspect the live backend and record the result.

The repository has 79 migration files and 66 numeric migration IDs. Numbering is not linear: several IDs are duplicated, including `010` through `014`, `027` through `029`, `035`, `052`, plus `045b` and `052b`. Do not create or apply a migration based only on the filename sequence.

There are 55 function directories under `insforge/functions/`. The `_shared` directory contains shared function code and is not itself a deployable business function.

## 3. High-level architecture

```text
Browser
  |
  | same-origin requests and HttpOnly session cookies
  v
Next.js App Router
  |
  | proxy.ts: redirects, portal routing, cookie metadata, MFA-cookie check
  | app/api/v1/remote/[...path]/route.ts: same-origin InsForge proxy
  v
InsForge
  |-- Authentication
  |-- PostgreSQL/PostgREST and RLS
  |-- Storage buckets
  |-- Serverless functions
  |-- Realtime
  |-- AI/OpenRouter integration
  v
External providers where configured
  |-- Daily.co for interview rooms
  |-- Cal.com for scheduling
  |-- Resend and/or SMTP/Nodemailer for email
```

The application uses Next.js App Router, React, TypeScript, CSS modules, Tailwind CSS 3.4, Zustand, TanStack React Query, Radix/MUI components, Framer Motion, and Lucide icons.

The package manifest requests Next.js `^16.2.4`; the lockfile currently resolves Next.js `16.2.12`. Do not describe the runtime as exactly 16.2.4 unless the lockfile is intentionally changed.

## 4. Important project folders

| Folder | Responsibility |
|---|---|
| `app/` | Next.js pages, layouts, route handlers, API endpoints, and route-specific styles |
| `components/` | Reusable UI and domain components |
| `lib/` | SDK clients, authentication, queries, validation, server helpers, DPDP logic, email, and utilities |
| `insforge/functions/` | Deployable Deno/InsForge serverless functions |
| `insforge/functions/_shared/` | Shared function authentication, CORS, permissions, errors, idempotency, and query helpers |
| `insforge/migrations/` | SQL schema, RLS, trigger, function, index, and data-change scripts |
| `scripts/` | Local setup, migration utilities, verification scripts, and test helpers |
| `e2e/` | Playwright browser tests |
| `__tests__/` and `lib/**/*.test.ts` | Vitest unit and integration-style tests |
| `docs/` | Architecture, audit, legal, implementation, and handoff history |
| `.insforge/` | Local InsForge project metadata; never add secrets to source control |

## 5. Route and portal structure

### Public routes

- `/`
- `/jobs` and `/jobs/[id]`
- `/browse-jobs` and `/browse-jobs/[id]` (legacy/compatibility job routes)
- `/company/[companyId]`
- `/blog` and `/blog/[slug]`
- `/employers/*`
- `/privacy`
- `/terms`

### Authentication routes

- `/login`
- `/signup`
- `/signup/candidate`
- `/signup/recruiter`
- `/signup/verify`
- `/forgot-password`
- `/reset-password`
- `/auth/callback`
- `/auth/mfa-verify`
- `/auth/setup-mfa`
- `/auth/set-password`

Google and LinkedIn OAuth flows are present in the login and candidate signup pages. The callback is handled by `app/auth/callback/page.tsx` and the server exchange route at `app/api/auth/oauth/exchange/route.ts`. Provider configuration still has to be verified in the InsForge project and provider consoles.

### Candidate portal

The canonical candidate tree is under `app/dashboard/candidate/[role_id]/`, and host routing also supports the jobs portal candidate paths.

Important areas include:

- Dashboard and profile.
- Resume management.
- Job search and saved jobs.
- Applications and application details.
- Interviews and interview room pages.
- Messages and notifications.
- Analytics, referrals, company reviews, and settings.

### Recruiter portal

The canonical recruiter tree is under `app/dashboard/recruiter/[role_id]/`. The proxy also maps recruiter portal URLs to `/recruiter/dashboard` on the app portal.

Important areas include:

- Company setup and approval status.
- Job drafts, publishing, approval, expiry, and templates.
- Candidate search, saved candidates, and shortlisted candidates.
- Applicant pipeline.
- Interviews and interview guides.
- Offers.
- Reports, messages, notifications, invitations, integrations, and settings.

### Admin portal

The canonical admin pages are under `app/dashboard/admin/`, with public-facing compatibility routes under `app/admin/` and redirects handled by `proxy.ts`.

Admin features include job approvals, recruiter/company verification, candidate and recruiter administration, audit logs, DPDP requests, plans, billing, reports, settings, blogs, announcements, notifications, and email templates.

## 6. Authentication and request security

### Browser session flow

The browser calls the same-origin endpoint `/api/v1/remote`. The browser does not use the remote InsForge URL as its normal API base URL.

Relevant files:

- `lib/insforge.ts`
- `lib/auth/AuthContext.tsx`
- `proxy.ts`
- `app/api/v1/remote/[...path]/route.ts`
- `app/api/auth/session/route.ts`
- `app/api/auth/refresh/route.ts`
- `app/api/auth/logout/route.ts`

The session access token is carried by the `tm_access_token` HttpOnly cookie. Other cookies such as `tm_role`, `tm_onboarding`, `tm_mfa`, and `tm_company` are routing metadata and must not be treated as authoritative authorization. Server layouts, API handlers, edge functions, and database RLS must enforce authorization.

`proxy.ts` performs routing and optimistic checks. It must not become the only authorization layer. The authoritative checks happen in server auth helpers, route handlers, edge functions, and PostgreSQL RLS.

### Edge/function authorization

Functions should use the shared function helpers where applicable, especially:

- `insforge/functions/_shared/adminAuth.ts`
- `insforge/functions/_shared/cors.ts`
- `insforge/functions/_shared/errors.ts`
- `insforge/functions/_shared/idempotency.ts`
- `insforge/functions/_shared/permissions.ts`

Use a user-scoped client to validate the caller and a service client only after the caller has been authorized. Never expose a service key to browser code, never accept a service key from an untrusted request header, and never rely on a client-supplied role or company ID without checking it against the authenticated identity.

## 7. Data and backend model

The important domain areas are:

- `profiles`: identity, role, activation, onboarding, MFA metadata, and basic profile information.
- `candidate_profiles`: candidate-specific profile, skills, experience, preferences, visibility, and AI-related profile values.
- `recruiter_profiles`: recruiter-specific profile and legacy recruiter information.
- `companies`: company root entity, verification status, business metadata, and branding.
- `company_members`: recruiter/company membership and member role/status.
- `jobs`: job content, ownership, company relationship, lifecycle status, and approval status.
- `applications`: candidate/job relationship, candidate-owned application data, pipeline status, and recruiter assessment fields.
- `candidate_resumes`: resume metadata and storage references.
- `interviews`: interview setup, questions, transcript, analysis, and completion status.
- `offers`: recruiter-created offers and candidate offer status.
- `audit_log`, `verification_audit_log`, and related audit tables: administrative and compliance history.
- `consent_records`: append-only consent history.
- `data_principal_requests`: access, correction, withdrawal, and erasure request tracking.

The company-first architecture uses `companies` as the live company table. Older code and documents may still mention `company_profiles`; treat that as a compatibility shape or stale documentation until the live schema is checked.

RLS is a critical part of the security model. Application code should not replace RLS with frontend filters. Frontend filters improve UX; RLS and server-side authorization provide isolation.

## 8. External and platform services

| Service | Current use | Main code locations | Configuration to verify |
|---|---|---|---|
| InsForge | Auth, database, storage, functions, realtime, and AI gateway | `lib/insforge.ts`, `lib/insforge-admin.ts`, `insforge/functions/` | Project URL, anon key, service key, deployed functions, buckets, RLS |
| PostgreSQL/PostgREST | Application data and RLS | `insforge/migrations/` and SDK database calls | Live tables, policies, triggers, functions, indexes |
| InsForge Storage | Resumes, logos, blog images, exports, and documents | `lib/utils/storage-url.ts`, upload functions, storage routes | Bucket names, private/public status, storage RLS |
| OpenRouter through InsForge AI | AI completions used by current AI functions and interview code | `insforge/functions/ai-match/`, `insforge/functions/resume-parse/`, `lib/api/interview.ts` | Provisioned AI access, allowed models, cost limits, JSON response behavior |
| Daily.co | Interview room creation and management | `app/api/interview/room/route.ts`, interview room components | `DAILY_API_KEY`, room permissions, expiry, recording policy |
| Cal.com | Booking/scheduling embed | `components/auth/BookACallForm.tsx` and `NEXT_PUBLIC_CAL_LINK` | Embed configuration, event type, allowed origins |
| Resend | Newsletter confirmation and welcome email | `lib/newsletter/newsletter-email.ts` | `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, domain verification |
| Nodemailer/SMTP | General email service fallback or transactional email paths | `lib/email/email-service.ts` | SMTP host, port, username, password, sender settings |
| OAuth providers | Google and LinkedIn sign-in | `app/(auth)/login/page.tsx`, `app/auth/callback/page.tsx` | Redirect URLs, client IDs/secrets, provider enablement |

Do not add credentials to this document. Keep local values in `.env.local` and production values in the deployment/InsForge secret manager.

## 9. AI Intelligence Engine: current status

### Status: partially scaffolded, not a completed production AI platform

The repository contains AI-related files, but the AI Intelligence Engine should not be described as fully built. Development stopped while deciding the microservice boundary, orchestration model, model policy, data contracts, and operational controls.

Current pieces include:

1. `insforge/functions/resume-parse/index.ts`
   - Authenticates the caller.
   - Accepts a resume file.
   - Extracts PDF or text content.
   - Sends a prompt through InsForge AI.
   - Returns structured contact, profile, work history, and confidence data.

2. `insforge/functions/ai-match/index.ts`
   - Authenticates the caller.
   - Restricts access to recruiters/admins.
   - Loads a job and candidate profile.
   - Requests a score, reasons, and match level.
   - Returns the parsed result.

3. `lib/api/interview.ts`
   - Generates interview questions.
   - Scores interview transcripts.
   - Validates score output with `lib/validators/scores.ts`.
   - Persists interview analysis and candidate profile scores.

These pieces do not yet form one consistent AI service. They use different model names, prompt shapes, validation behavior, error behavior, and execution boundaries. Some AI calls are in edge functions and some are directly in application library code.

### AI engine target architecture

The recommended direction is to make AI a separately governed internal service boundary while keeping the first implementation inside InsForge functions. This avoids prematurely introducing another deployable microservice while still creating a stable contract.

```text
Next.js UI/API
  |
  v
AI orchestration function
  |-- authenticate caller
  |-- authorize tenant/resource access
  |-- create job/request record
  |-- redact and normalize input
  |-- select approved model/prompt version
  |-- call InsForge AI/OpenRouter
  |-- validate structured output
  |-- persist result, usage, status, and failure reason
  v
PostgreSQL + storage
```

### Suggested AI capabilities

Build these as separate capabilities behind one consistent contract:

- Resume parsing.
- Job/candidate matching.
- Interview question generation.
- Interview transcript scoring.
- Candidate profile improvement suggestions.
- Recruiter sourcing recommendations.

Each capability should have:

- A versioned request and response schema.
- A model policy and fallback model.
- A prompt version.
- An explicit tenant/user authorization check.
- Input size limits and prompt-injection defenses.
- JSON/schema validation before persistence.
- Retry and timeout behavior.
- Idempotency for repeatable jobs.
- Usage/cost tracking.
- A human-review or “AI-assisted” product label where appropriate.
- A safe failure state that does not overwrite good existing data.

### Recommended implementation phases

#### Phase A — contract and safety foundation

- Define shared TypeScript/Zod schemas under `lib/ai/` or a shared package.
- Define request states: `queued`, `running`, `completed`, `failed`, `cancelled`.
- Define capability names and prompt versions.
- Add maximum input lengths and timeout limits.
- Decide which fields are persisted and which are transient.
- Decide how candidate consent and recruiter visibility apply to every capability.

#### Phase B — orchestration function

- Add one function such as `ai-orchestrator` or capability-specific functions using the same shared contract.
- Move direct browser/server-library AI calls behind the function boundary.
- Validate the caller before loading candidate, job, or interview data.
- Use service access only after authorization.
- Store request metadata and result status.

#### Phase C — migrate existing capabilities

- Migrate `resume-parse` to the shared contract.
- Migrate `ai-match` to the shared contract.
- Migrate interview question generation and transcript scoring out of `lib/api/interview.ts` into the function boundary.
- Keep compatibility response adapters until all callers are migrated.

#### Phase D — operations and quality

- Add structured logs without storing unnecessary resume or transcript content.
- Track model, prompt version, latency, token usage, cost, and failure reason.
- Add replayable test fixtures with synthetic candidate/job data.
- Add evaluation datasets for parsing accuracy, matching consistency, and interview scoring.
- Add rate limits and per-tenant quotas.
- Add admin visibility into failed and long-running AI jobs.

#### Phase E — only then consider a separate microservice

Create a separate AI microservice only when there is a demonstrated need such as independent scaling, long-running workers, GPU processing, specialized Python libraries, provider routing, or queue infrastructure. Until then, an InsForge function boundary is easier to operate and keeps authorization close to the data.

### AI implementation warnings

- Do not claim that AI matching is production-grade solely because `ai-match` exists.
- Do not expose service keys or provider keys to the browser.
- Do not let an AI result directly reject, rank, or exclude candidates without product-approved human review rules.
- Do not persist raw resumes or interview transcripts in logs.
- Do not allow model output to update arbitrary database columns.
- Do not trust model-produced scores without schema validation and range checks.
- Do not mix model names and response formats without recording the model/prompt version.
- Do not change the AI boundary and the database schema in production without a backend branch, migration plan, and rollback plan.

## 10. Core business flows

### Candidate

```text
Sign up → verify email → choose candidate role → complete onboarding
  → create profile/resume → browse jobs → apply
  → recruiter pipeline updates → interview → offer/hire or rejection
```

### Recruiter/company

```text
Sign up/request recruiter access → company setup
  → company/member verification → recruiter onboarding
  → create job draft → submit for approval → published
  → review candidates → move application through pipeline
  → schedule interview → create offer → hire or close
```

### Job approval

The repository contains both job lifecycle status and approval status. Do not collapse them into one field without checking the relevant migrations and functions. Admin approval determines whether a job is approved; recruiter-owned lifecycle status determines whether the job is draft, active, paused, or closed.

### DPDP/data requests

Relevant code includes:

- `lib/dpdp/erasure.ts`
- `lib/dpdp/execute-erasure.ts`
- `lib/dpdp/export.ts`
- `app/api/dpdp/export/route.ts`
- `app/api/dpdp/requests/route.ts`
- `app/api/consent/route.ts`
- `app/api/consent/withdraw/route.ts`
- migrations `063_consent_records.sql` and `065_data_principal_requests.sql`

These are implementation components, not a substitute for legal review, appointed contacts, retention policy, incident response, or production verification.

## 11. Local development

From `tm-main`:

```powershell
npm install
npm run dev
npm run lint
npm test
npm run e2e
npm run build
```

Required local configuration is kept in `.env.local`. Use the existing variable names; do not commit `.env.local`.

At minimum, developers should understand these variable groups:

- `NEXT_PUBLIC_INSFORGE_URL`
- `NEXT_PUBLIC_INSFORGE_ANON_KEY`
- `INSFORGE_SERVICE_KEY`
- `NEXT_PUBLIC_INSFORGE_FUNCTIONS_URL` when the function host must be explicit
- `MFA_SIGNING_SECRET`
- `DAILY_API_KEY`
- `NEXT_PUBLIC_CAL_LINK`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- SMTP variables used by `lib/email/email-service.ts`
- Admin allow-list/configuration variables used by `lib/admin/`

Never paste actual secret values into tickets, documentation, commit messages, screenshots, or chat.

## 12. Testing and verification expectations

Before handing over a change:

1. Run focused unit tests for changed logic.
2. Run lint.
3. Run the production build.
4. Run relevant Playwright flows.
5. If a database, RLS, storage, function, or secret changed, run a live backend verification with a test account and record the result.
6. Check both an authorized and unauthorized path.
7. Check candidate, recruiter, and admin tenant boundaries for affected resources.
8. Confirm that no service key or sensitive personal data appears in browser bundles or logs.

The build/test commands may require network access because the application imports remote fonts through `next/font/google`. A successful local code compilation alone does not prove that the live InsForge schema or deployed functions are correct.

## 13. Known gaps and risks

- Live database state can differ from committed migrations.
- Migration numbering and the migration ledger need cleanup before treating migrations as a reliable release history.
- The AI Intelligence Engine is not yet unified behind a stable microservice/function contract.
- Some routes are canonical and others are compatibility routes; new links should use canonical routes.
- External provider configuration is environment-specific and must be verified separately.
- Build success does not prove RLS, storage policy, function deployment, OAuth configuration, email delivery, Daily rooms, or Cal.com scheduling.
- Privacy and DPDP implementation still requires operational and legal completion before making compliance claims.
- Existing uncommitted worktree changes must be preserved and reviewed separately from new work.

## 14. First-day developer checklist

- Read this document and `AGENTS.md`.
- Confirm the current branch and `git status` before editing.
- Run the app locally with a non-production test backend/account.
- Inspect `.insforge/project.json` without exposing keys.
- Identify the live InsForge project and verify the target environment.
- Read the relevant migration and inspect the live table/policies before backend changes.
- Follow existing auth, validation, error, storage, and function patterns.
- Do not apply migrations automatically to production.
- Do not rewrite the AI engine until the capability contracts and service boundary are agreed.
- Update this handoff when the canonical routes, services, data model, or AI architecture changes.

