# 38 — Executor Prompt: make the recruiter Jobs section a working ATS (V1)

**Hand this whole file to the executor.** It is self-contained.
Written 2026-08-02. Scope is the **Jobs** area of the recruiter portal only.

---

## Your role

You are implementing V1 of the TalentMesh recruiter ATS. Work in
`C:\Users\Anuj\Desktop\tm_web\tm-main` — a clean worktree off `origin/main`.

**Never work in `Talentmesh-demo`.** It is ~39 commits behind with ~110 dirty files.

Current branch: `codex/fix-recruiter-sidebar-routing`. It has one uncommitted, **correct** change to
`components/dashboard/OpsDarkSidebarShell.tsx` — commit it first, do not revert it.

**V1 is a plain ATS. No AI features.** No matching scores, no AI interview generation, no smart
sourcing. If a task below touches AI, the instruction is always to remove it, never to improve it.

**Line numbers in this document may have moved. Re-grep before editing.**

---

## Context you must not re-derive

- Next.js App Router. Recruiter pages live in `app/dashboard/recruiter/[role_id]/`.
- `proxy.ts` is the middleware. On the `app.` subdomain the browser URL is `/recruiter/...` and
  proxy.ts *rewrites* internally to `/dashboard/recruiter/{userId}/...`. `usePathname()` returns the
  **browser** path, not the rewrite. That is what the sidebar fix addresses.
- `proxy.ts:492` sets `recruiterId = userId`, so the `[role_id]` segment is the **auth user id**.
  `user.role_id` does not exist on the user object; `user.id` is the real value.
- Applicant stage changes go through the `update-application` edge function:
  `invokeFunction('update-application', { body: { id, status } })`. It works today. Do not rewrite it.
- Valid application stages, from `app/dashboard/recruiter/[role_id]/pipeline/page.tsx:9-15`:
  `applied`, `reviewing`, `shortlisted`, `interviewing`, `offered`, `hired`, `rejected`.
- Job statuses in use, from `app/dashboard/recruiter/[role_id]/jobs/page.tsx:152-156`:
  `active`/`published`, `draft`, `closed`/`expired`.
- Indian market: INR only. Never render `$` or USD.

---

## Tasks, in order. Do not reorder.

### T-1 · Commit the sidebar routing fix — P0

`components/dashboard/OpsDarkSidebarShell.tsx` has an uncommitted change that broadens
`isRecruiterRoute` to match `/recruiter` and `/recruiter/*`, and makes the `roleId` fallback
`user?.role_id || user?.id`.

This is correct — verified against `proxy.ts:492`. Commit it as-is.

**Verify:** `git status` shows a clean tree afterwards.

---

### T-2 · Per-job applicants view — P0, the core ATS gap

**Problem.** `app/dashboard/recruiter/[role_id]/jobs/[job_id]/page.tsx` already fetches
`.from('jobs').select('*, applications(*)')` but renders only a count:

```tsx
<div style={{ ... }}>{job.applications?.length || 0}</div>
<p>Total applications received</p>
```

A recruiter cannot see **who** applied to a job. That is the single thing an ATS must do.

**Build.** On the job detail page, replace that count tile with an applicants table.

Server-side changes: none — widen the existing select to pull the candidate:

```ts
.from('jobs')
.select('*, applications(id, status, applied_at, candidate:profiles!candidate_id(id, name, email, avatar_url, candidate_profiles(headline, skills)))')
.eq('id', job_id)
```

Client-side changes, in that same file:
- A table with columns: Candidate name, headline, applied date, current stage, actions.
- Stage rendered with the existing `StatusPill` component used in `jobs/page.tsx` — reuse it, do
  not write a new one.
- A stage dropdown per row. On change call
  `invokeFunction('update-application', { body: { id: applicationId, status: newStage } })`,
  optimistically update local state, and roll back on `error`.
- Clicking a row opens the existing `components/recruiter/CandidateProfileDrawer.tsx`. **Reuse it.**
  Do not build a new drawer.
- Empty state: "No applications yet" plus a link to the public job posting.
- Loading skeleton and an error state. The DB will be empty at launch — the empty path must look
  deliberate, not broken.

**Impact if changed:** recruiters can actually process applicants per job — V1 becomes usable.
**Impact if not changed:** the product is a job board, not an ATS.
**Deploy priority:** P0.

**Verify:** with a job that has applications, the table lists them; changing a stage persists across
a page reload; with a job that has none, the empty state renders.

---

### T-3 · Remove the AI call from job detail — P0 (V1 scope)

Same file, around line 43:

```ts
const { data } = await invokeFunction('interview-generator', { ... });
```

Delete the call, its state, its button and any UI that renders its output. Remove imports your
deletion orphans. **Do not delete the `interview-generator` edge function** — it stays deployed for
a later version, it just must not be called from V1 UI.

**Verify:** `grep -rn "interview-generator" app/` returns no hits under `app/dashboard/recruiter/`.

---

### T-4 · Edit an existing job — P0

There is no way to edit a job anywhere in the app. Confirmed by grep: no `handleEdit`, no `/edit`
route, no `mode=edit`.

**Build.** Reuse `app/dashboard/recruiter/[role_id]/jobs/post-job/page.tsx` (515 lines) rather than
writing a second form.

- Accept `?edit=<jobId>`. When present, fetch that job and pre-fill every field.
- Submit path does an update instead of an insert.
- Change the heading and submit button to "Save changes" when editing.
- Add an **Edit** action to each row in `jobs/page.tsx`, next to the existing publish/expire/delete
  buttons (currently around lines 282-303).

**Critical — do not break job approval.** `approval_status` is the single source of truth for
whether a job is live, and editing a job must **never** reset it. This was fixed once already
(migration 058) and must not regress. Do not write `approval_status` from the edit path at all.

**Verify:** edit a published job, save, and confirm with
`npx --no-install insforge db query "select id, status, approval_status from jobs where id = '<id>'"`
that `approval_status` is unchanged. **SQL must be a single line** — the Windows shim truncates at
the first newline and still prints success.

---

### T-5 · Delete the three orphaned duplicate routes — P1

The sidebar links to `jobs?tab=drafts|published|expired`, and `jobs/page.tsx:35` reads that param
correctly. These three directories are a second, inferior implementation nothing links to:

- `app/dashboard/recruiter/[role_id]/jobs/drafts/` (74 lines)
- `app/dashboard/recruiter/[role_id]/jobs/published/` (67 lines)
- `app/dashboard/recruiter/[role_id]/jobs/expired/` (70 lines)

Delete all three directories including their `error.tsx` and `loading.tsx`.

**Before deleting, confirm nothing links to them:**
`grep -rn "jobs/drafts\|jobs/published\|jobs/expired" app components lib --include=*.tsx --include=*.ts`
Ignore hits inside `.next/`. If anything in `app/`, `components/` or `lib/` links to them, stop and
report instead of deleting.

**Verify:** `npx tsc --noEmit` reports no new errors. Stale `.next/types` errors are expected and
regenerate on build.

---

### T-6 · Job Templates — make real or remove — P1

`app/dashboard/recruiter/[role_id]/jobs/templates/page.tsx` is a hardcoded `TEMPLATES` array with
zero data access. It presents fabricated content as a product feature.

**Preferred (lazy and honest):** keep the hardcoded templates but make them *functional* — clicking
a template navigates to `post-job` with the fields pre-filled from the template via query params or
router state. Static starter templates are a legitimate feature; a static template that does
nothing is not.

If that cannot be done cleanly, **remove the nav item and the route entirely** rather than shipping
a dead page.

**Do not** build a database-backed template CRUD for V1. That is out of scope.

**Verify:** clicking a template lands on the post-job form with the title, description and skills
already filled in.

---

### T-7 · Remove Smart Sourcing from the sidebar — P1 (V1 scope)

In `components/dashboard/OpsDarkSidebarShell.tsx`, the `recruiterNav` array has a `sourcing`
category pointing at `/sourcing` and `/sourcing/search`. **Neither route exists anywhere in the
repo** — both are dead links. It is also an AI feature, so it is out of V1 scope.

Delete the whole `sourcing` entry from `recruiterNav`. Remove `Icons.sourcing` if nothing else uses
it.

**Verify:** `grep -rn "sourcing" components/dashboard/OpsDarkSidebarShell.tsx` returns nothing.

---

## What NOT to do

- **Do not** touch `insforge/functions/` — a separate workstream owns it, and two P0 auth fixes are
  pending there.
- **Do not** touch `proxy.ts`. Its job-detail rewrite has a known P0 approval-gate bypass being
  fixed separately. If your work appears blocked by it, report and stop.
- **Do not** delete the `interview-generator`, `ai-match` or `recommendations` edge functions. V1
  only stops calling them.
- **Do not** add AI, matching scores, or `Math.random()`-derived numbers. If you need a value you do
  not have, render an empty state.
- **Do not** run `npm audit fix --force` — it downgrades Next 16.2.12 to 14.2.35.
- **Do not** run `git push`. Commit locally only.
- **Do not** add a new dependency. Everything here is doable with what is installed.

## House rules

- Match the surrounding style. These files use CSS modules
  (`shared-dashboard.module.css`) and inline styles — follow what the file already does rather than
  introducing Tailwind or a new pattern.
- Reuse before building: `StatusPill`, `CandidateProfileDrawer`, and the existing `post-job` form
  all already exist and are listed above for that reason.
- Every `invokeFunction` call returns `{ data, error }`. Handle `error` — do not ignore it.
- Smallest diff that works. If you write 200 lines where 50 would do, rewrite it.

## Reporting back

For each task: what you changed (files + functions), how you verified it, and the actual observed
result — not "should work". **State explicitly anything you could not verify.** An honest gap is
more useful than a confident guess. Do not claim a task is done because a CLI printed success.
