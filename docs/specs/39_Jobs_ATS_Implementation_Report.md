# 39 — Jobs ATS V1 Implementation Report

**Date:** 2026-08-02  
**Branch:** `codex/fix-recruiter-sidebar-routing`  
**Scope:** Recruiter Jobs section only  
**Edge functions changed:** No

## Summary

Implemented the Jobs ATS V1 prompt with the reviewed Company-First and V1-safety additions.

The Jobs area now has a real per-job applicant view, candidate profile access, application-stage updates through the existing API route, a functional edit form, functional static job templates, and backward-compatible redirects for legacy job-status URLs. V1 AI interview generation was removed from the recruiter job-detail UI.

## Changes made

### Recruiter navigation

File: `components/dashboard/OpsDarkSidebarShell.tsx`

- Preserved the recruiter sidebar fix for both `/recruiter/*` and `/dashboard/recruiter/*` paths.
- Preserved the correct user-ID fallback for recruiter links.
- Removed the V1 Smart Sourcing navigation group and unused icon because its routes do not exist and the feature is deferred.

### Job detail and applicants

File: `app/dashboard/recruiter/[role_id]/jobs/[job_id]/page.tsx`

- Replaced the application count-only panel with an applicants table.
- Displays candidate name, email, headline, application date, and current stage.
- Reuses `StatusPill` and `CandidateProfileDrawer`.
- Adds an intentional empty state and link to the public job posting.
- Uses `PATCH /api/applications/[id]/status` for stage changes.
- Performs optimistic updates and restores the previous stage if the request fails.
- Removed the AI interview-question generation call and related UI.
- Changed job visibility from recruiter-owner-only UI denial to company/RLS-scoped viewing. The database/RLS result remains authoritative.
- Stage editing is currently limited to the job owner because the existing status RPC and edge function enforce `jobs.recruiter_id = actor_id`. This avoids presenting a control that is known to fail for a non-owner company admin.

### Job editing

Files:

- `app/dashboard/recruiter/[role_id]/jobs/post-job/page.tsx`
- `app/dashboard/recruiter/[role_id]/jobs/page.tsx`

- Added `?edit=<jobId>` loading and form prefill.
- Existing Jobs “Manage” actions now open the edit form rather than the old detail page.
- Edit submission uses the existing `PATCH /api/jobs/[jobId]` endpoint.
- Edit payload deliberately excludes `status`, `approval_status`, `company_id`, and `recruiter_id`.
- Create submission continues to use the existing `POST /api/jobs` endpoint.
- Edit mode changes the heading and submit button to “Edit Job” and “Save Changes”.
- Job templates now prefill title, category, description, and requirements in the post-job form.

### Legacy job routes

Files:

- `app/dashboard/recruiter/[role_id]/jobs/drafts/page.tsx`
- `app/dashboard/recruiter/[role_id]/jobs/published/page.tsx`
- `app/dashboard/recruiter/[role_id]/jobs/expired/page.tsx`

These routes were retained as redirects instead of deleted:

```text
/jobs/drafts   → /jobs?tab=drafts
/jobs/published → /jobs?tab=published
/jobs/expired  → /jobs?tab=expired
```

This preserves bookmarks and old shared links while keeping one implementation.

## Why these decisions were made

- V1 is a standard ATS, not an AI ATS.
- Company-First architecture requires teammates to view company jobs and applicants.
- Existing API routes and RLS remain the authorization boundary.
- Job approval state must not be modified by ordinary editing.
- Existing edge functions remain untouched because this work is UI/API integration only.
- Redirects are safer than removing reachable legacy URLs immediately.

## Verification

### Passed

- Focused ESLint passed for all affected TypeScript/TSX files.
- `git diff --check` passed before the final report was created.
- No files under `insforge/functions/` were changed.
- No API route or migration was added.
- No AI or matching score code was added.

### Not fully verified

- No authenticated browser session was run in this execution, so live applicant data, RLS behavior, and the full edit journey still need local browser testing.
- `npx tsc --noEmit` remains blocked by existing generated `.next/types` references to missing:
  - `app/onboarding/recruiter/documents/page.tsx`
  - `app/onboarding/recruiter/interests/page.tsx`
- The existing application-status RPC is narrower than the Company-First model for non-owner company admins. A separate backend/RPC authorization decision is required before enabling stage edits for company admins.

## Recommended local test sequence

1. Start the app with `npm run dev`.
2. Log in as a recruiter and open `/recruiter/dashboard/jobs`.
3. Open a job created by the logged-in recruiter.
4. Confirm the applicants table, empty state, candidate drawer, and stage update behavior.
5. Open an existing job through the Jobs list and confirm the edit form is prefilled.
6. Edit and save a published job; verify its approval state remains unchanged.
7. Open each old route and confirm it redirects to the matching tabbed Jobs page.
8. Confirm Smart Sourcing is absent from the recruiter sidebar.
9. Test a teammate viewing a company job; confirm viewing is allowed by company/RLS policy.
10. Test a teammate attempting a stage update; confirm the current owner-only limitation is clear and non-destructive.

