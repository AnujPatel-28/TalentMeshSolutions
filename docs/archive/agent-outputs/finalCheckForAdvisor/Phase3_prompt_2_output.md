Phase 3 rows 2 (Jobs list + Post/Edit job) and 5 (pending-approval) are wired. Summary:

Diff summary

app/dashboard/recruiter/[role_id]/jobs/page.tsx
- fetchJobs: now calls GET /api/jobs?scope=company&limit=100 instead of a direct table read. Applicant counts aren't returned by that endpoint, so they're fetched separately via a plain applications.select('job_id').in(...) count (RLS apps_company_view scopes it) and merged onto each job as _applicantCount.
- handleExpireJob: now POST /api/jobs/[jobId]/close.
- New handlePublishJob: POST /api/jobs/[jobId]/publish; on 409 ACTIVE_JOB_LIMIT shows toast.error(json.message) — the API's message text already reads "Active job limit reached (N). Close an active job to post another," so that single toast covers the "limit + close prompt" requirement without a new modal component.
- Added a "Publish" action button for draft jobs (previously there was no publish path in this table at all, only expire).
- handleDeleteJob left untouched — no DELETE /api/jobs/[jobId] route exists in doc 03, only PATCH, so it still goes direct through insforge.database, matching what was already there.

app/dashboard/recruiter/[role_id]/jobs/post-job/page.tsx
- handleSubmit now calls POST /api/jobs instead of insforge.database.rpc('create_job', …), so creation goes through withApi's audit log as required. Same payload shape (no company_id/recruiter_id, server-derived).
- Error branches preserved: ACTIVE_JOB_LIMIT → alert; coordinators cannot post jobs → alert; no active company → redirect now goes to canonical /pending-approval (was the dead nested route, see below); added a fallback for Zod details (400 validation errors) which the old RPC path never surfaced.

app/(auth)/pending-approval/page.tsx (the canonical screen)
- Wired to GET /api/recruiter/status, polled every 30s.
- deriveContent() renders per state: no membership → "No Application Found"; member.status==='suspended'; company.status suspended/deactivated; verification.status rejected/needs_more_info (shows review_notes in a reused .errorAlert box); everything else (invited + submitted/under_review, or invited with no verification row yet) falls through to the exicopy.
- Auto-redirects to /dashboard/recruiter/{user.id} once membership.status==='active' && company.status==='verified'.

Dead code found

app/dashboard/recruiter/[role_id]/pending-approval/page.tsx (the inner recruiter_profiles.is_approved page) is now confirmed unreachable — layout.tsx's
server guard and proxy.ts both redirect to /pending-approval (e remaining link to it (post-job's error handler) was justrepointed to /pending-approval too. Per the architect ruling, I left it as-is rather than rewiring it — flagging for deletion, not touching it.

Page → API map

┌──────────────────┬─────────┬─────────────────────────────┬──────────────────────────────────────────────────────────────────────────────────────────┐
│       Page       │ Action  │             API             │        Errors rendered                                      │
├──────────────────┼─────────┼─────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
│ Jobs list        │ load    │ GET /api/jobs?scope=company │ t                                                           │
├──────────────────┼─────────┼─────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
│ Jobs list        │ publish │ POST                        │ 4ith server message; other → toast                          │
│                  │         │ /api/jobs/[jobId]/publish   │                                                                                          │
├──────────────────┼─────────┼─────────────────────────────┼─────────────────────────────────────────────────────────────┤
│ Jobs list        │ close   │ POST                        │ toast                                                                                    │
│                  │         │ /api/jobs/[jobId]/close     │                                                             │
├──────────────────┼─────────┼─────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
│ Post job         │ submit  │ POST /api/jobs              │ 4403 no active company → redirect /pending-approval; 403    │
│                  │         │                             │ coordinators cannot post jobs → alert; 400 validation → alert first field error          │
├──────────────────┼─────────┼─────────────────────────────┼─────────────────────────────────────────────────────────────┤
│ Pending-approval │ poll    │ GET /api/recruiter/status   │ renders membership/company/verification state; silent no-op on fetch failure (keeps last │
│                  │         │                             │                                                             │
└──────────────────┴─────────┴─────────────────────────────┴──────────────────────────────────────────────────────────────────────────────────────────┘

tsc/eslint

- npx tsc --noEmit: only the pre-existing framer-motion baseline error in an unrelated file (candidate/applications/page.tsx); nothing new.
- npx eslint on the three changed files: clean.

Doc 05 gaps noticed

- PlanUsageCard (spec'd for the Overview page) doesn't exist ymbered task list and already works via the recruiter-dashboardfunction, so I left it untouched rather than building a new component speculatively.                                                                  - Doc 05 says job description validation is "≥30" chars; the avalidation/jobs.ts requires ≥50. Implementation is source oftruth here — the post-job wizard doesn't client-validate description length either way, so this only surfaces as a 400 alert now (previously it threw whatever the RPC's own message was).