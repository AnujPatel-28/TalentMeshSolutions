# Recruiter / Company-First Alignment Audit

**Date:** 2026-08-02  
**Scope:** Recruiter portal, recruiter onboarding/status, company management, jobs ATS, routing, and legacy recruiter code.  
**Reference:** `docs/specs/`  
**Audit type:** Static source audit. No code was changed as part of this report.

## Executive verdict

The recruiter portal is **partially aligned** with the Company-First architecture, but it is not yet cleanly implemented as a single Company-First system.

The strongest part is the new server-side guard and the Jobs ATS API path. The main remaining risk is that active recruiter UI and onboarding/status screens still depend on the retired `recruiter_profiles` model and legacy edge functions. Several recruiter pages also scope data to `recruiter_id` even though the architecture requires company-wide visibility for active members.

Recommended target:

```text
session user
  -> active company_members row
  -> verified companies row
  -> company-scoped RLS/API reads
  -> recruiter UI
```

`recruiter_profiles` should remain only where it stores recruiter-specific profile attributes, if still needed. It must not be the source of approval, membership, company identity, or portal authorization.

## Confirmed aligned areas

| Area | Current status | Evidence |
|---|---|---|
| Server recruiter authorization | Mostly aligned | `app/dashboard/recruiter/[role_id]/layout.tsx` checks authenticated user, recruiter role, membership status, and company verification. |
| Shared dashboard guard | Aligned in principle | `app/dashboard/layout.tsx` applies session, suspension, onboarding, and MFA gates. |
| Recruiter proxy routing | Improved/aligned | `proxy.ts` routes recruiter traffic into `/dashboard/recruiter/[role_id]`, the guarded tree. |
| Access request creation | Mostly aligned | `/api/recruiter/request-access` creates/attaches companies, creates invited members, creates verification requests, and records audit events. |
| Verification decision path | Present | `/api/admin/verification/decide` and the documented RPC workflow exist. |
| Company-scoped job listing | Aligned | `/api/jobs?scope=company` derives the caller's active company and filters by `company_id`. |
| Job creation and entitlement | Aligned in API design | `POST /api/jobs` uses `create_job`; active-job limits and coordinator restrictions are server-side. |
| Job edit authorization | Mostly aligned | `PATCH /api/jobs/[jobId]` relies on company RLS and excludes ownership fields from the update schema. |
| Legacy job URLs | Good compatibility approach | Draft/published/expired routes redirect to the tabbed jobs page. |

## Findings and recommended fixes

### R-01 — P0: Replace legacy approval polling

**Problem:** `app/dashboard/recruiter/[role_id]/pending-approval/page.tsx` polls `recruiter_profiles.is_approved`. The Company-First source of truth is `company_members.status === 'active'` and `companies.status === 'verified'`.

**Fix:** Remove the direct `recruiter_profiles` approval query. Reuse `GET /api/recruiter/status`, which already returns membership, company, and verification state. Redirect only when both membership and company are approved.

**Acceptance criteria:**

- Approval succeeds when the membership/company rows are approved even if no `recruiter_profiles` row exists.
- Suspended, removed, unverified, and deactivated states remain blocked.
- No recruiter authorization decision is made from `recruiter_profiles.is_approved`.

### R-02 — P0: Remove legacy recruiter authorization from the alternate company tree

**Problem:** `app/portals/app/company/[companyId]/recruiter/[recruiterId]/layout.tsx` is a client-side guard that reads `recruiter_profiles`. The nested `app/company/[companyId]/recruiter/[recruiterId]` route tree also has no equivalent authoritative server guard.

**Fix:** Prefer removing these alternate recruiter route trees after confirming no public links require them. If compatibility is required, make them redirect to `/dashboard/recruiter/[role_id]`. Do not maintain a second authorization implementation.

**Acceptance criteria:**

- There is one recruiter portal route tree.
- Every recruiter route passes through the server guard in `[role_id]/layout.tsx`.
- Direct navigation, RSC requests, JavaScript-disabled navigation, and subdomain navigation have the same authorization result.

### R-03 — P0: Convert recruiter pages from owner scope to company scope

**Problem:** Pipeline, interviews, offers, NVite, candidate subviews, and some job views still filter by `recruiter_id = current user`. Document 06 requires active recruiters in one company to see company jobs and applicants. Ownership should control mutation permission, not company visibility.

**Fix:**

- Read the active company from the server guard/API, never from a URL parameter.
- Use company-scoped API endpoints or RLS queries based on `jobs.company_id`.
- Keep edit/delete/stage-transition rules separate: recruiter owns their own jobs; company admins may manage company jobs; coordinators cannot post or publish.

**Acceptance criteria:**

- Recruiter A can see Recruiter B's company jobs, applicants, interviews, offers, and pipeline records where the architecture permits.
- Recruiter A cannot edit Recruiter B's job unless the member role permits it.
- Cross-company records never appear.

### R-04 — P1: Remove or redirect broken recruiter links

**Problem:** Several UI actions still use `/recruiter/nvite/compose`, while the canonical internal route is `/dashboard/recruiter/[role_id]/nvite/compose`.

**Fix:** Replace hard-coded legacy links in:

- `app/dashboard/recruiter/[role_id]/candidates/page.tsx`
- `app/dashboard/recruiter/[role_id]/candidates/search/page.tsx`
- `components/recruiter/CandidateProfileDrawer.tsx`
- remaining nested company recruiter pages, if they are retained temporarily

Use `Link`/router navigation with the authenticated role ID and avoid user-controlled company/recruiter IDs for authorization.

**Acceptance criteria:** Candidate invite actions never navigate to a non-existent route and work from every candidate surface.

### R-05 — P1: Finish the Company-First settings surface

**Problem:** Recruiter settings still calls `recruiter-profile` and `company-profile` edge functions. The architecture requires company/member APIs for company identity and team management. Billing is also not demonstrated as live company-scoped data.

**Fix:** Split settings by ownership:

- Personal profile: `profiles` and recruiter-only attributes.
- Company profile: `/api/company/[companyId]`.
- Team: `/api/company/[companyId]/members`, `/invite`, and member PATCH/accept routes.
- Billing: company-scoped `subscriptions`, `plan_limits`, and billing APIs.
- Privacy: existing consent APIs.

The server guard should provide the company ID and member role to the client as UX context only.

**Acceptance criteria:** Company admins can update company data and manage members; non-admins see read-only company/team controls; all mutations are audited and last-admin protection is enforced by the database.

### R-06 — P1: Namespace and standardize recruiter data fetching

**Problem:** `lib/queries/queryKeys.ts` lacks the documented `recruiter` and `company` namespaces. Many pages fetch directly through `insforge` or legacy functions, creating inconsistent authorization and cache behavior.

**Fix:** Add stable keys such as:

```ts
recruiter: {
  dashboard: ['recruiter', 'dashboard', companyId],
  jobs: ['recruiter', 'jobs', companyId, filters],
  pipeline: ['recruiter', 'pipeline', companyId, filters],
},
company: {
  detail: ['company', companyId],
  members: ['company', companyId, 'members'],
}
```

Move reads to the documented APIs/RLS paths. Do not add client-side company filtering as an authorization substitute.

### R-07 — P1: Remove fabricated recruiter metrics before launch

**Problem:** Reports and some candidate/message context UI contain hardcoded or synthetic values. A randomized AI-match value must never be shown as a real score.

**Fix:** Either wire each metric to a real company-scoped analytics endpoint or render an explicit unavailable/empty state. Render `Not scored` when `ai_match_score` is null. Do not use `Math.random()` for product data.

**Acceptance criteria:** Every displayed recruiter metric has a documented data source, loading state, empty state, and error state.

### R-08 — P1: Consolidate legacy edge-function dependencies

**Problem:** Legacy functions and source references remain in `insforge/functions/`, login flows, dashboard helpers, settings, DPDP export/erasure code, and admin recruiter tooling.

**Fix:** Classify each reference:

1. **Replace** with Company-First API/RLS logic.
2. **Retain intentionally** for recruiter-specific profile attributes, with an explicit ownership contract.
3. **Delete after migration** when no caller remains.

Do not delete functions until `rg` confirms there are no callers and deployed-function compatibility has been checked.

## Suggested implementation order

1. Fix R-01 pending status and R-02 route consolidation.
2. Add/verify integration tests for server guard states: no session, wrong role, no membership, invited, suspended, removed, unverified company, verified company.
3. Convert R-03 reads to company scope, beginning with jobs/applications/pipeline.
4. Fix R-04 route links.
5. Replace settings with the documented company/member endpoints.
6. Add recruiter/company TanStack Query keys and migrate repeated reads.
7. Remove fabricated metrics or implement real analytics.
8. Perform the legacy-function inventory and delete only confirmed orphaned code.

## Required verification before calling this complete

- Static search confirms no recruiter authorization check depends on `recruiter_profiles.is_approved`.
- Static search confirms no recruiter UI link points to a missing `/recruiter/...` route.
- Two recruiters in the same verified company can see the same company-scoped jobs/applications.
- A recruiter from another company cannot read or mutate those records.
- Coordinator job creation/publishing is rejected server-side.
- Last active company admin cannot be removed or demoted.
- Company suspension immediately blocks the portal and hides public jobs.
- Verification approval activates invited members through the documented RPC path.
- `npm run lint` passes.
- `npm test` and the authenticated browser smoke tests pass in an environment where the Vitest config can load.

## Files reviewed

- `docs/specs/06_Recruiter_Portal_Architecture.md`
- `docs/specs/07_Company_Management_Architecture.md`
- `docs/specs/03_API_Routes_And_Endpoints.md`
- `docs/specs/04_State_Machines_And_Business_Logic.md`
- `docs/specs/39_Jobs_ATS_Implementation_Report.md`
- recruiter layouts, proxy routing, recruiter APIs, Jobs ATS APIs, settings, pending approval, and legacy edge-function references.

