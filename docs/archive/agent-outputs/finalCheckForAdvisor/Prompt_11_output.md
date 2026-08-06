 T9 (P0-4 — job creation via RPC only) — T-High, Opus

This closes audit finding C-4, the last open Phase-0 item before the gate:

You are executing task T9 from docs/specs/09_Migration_Execution_Runbook.md in the Talentmesh-demo project. This closes audit finding C-4 (P0-4): the deployed jobs edge function creates jobs with the SERVICE KEY using client-supplied company_id/recruiter_id — cross-tenant job creation. File-only: no DB changes, no deploys (the edge-fn redeploy is T11).

Read first: 09 T9, insforge/functions/jobs/index.ts (the POST-create path, ~lines 28-29/55-61), the create_job RPC in insforge/migrations/049_repoint_ownership_and_rpcs.sql (already written/reviewed — derives company_id from the caller's JWT via authz.company_id_of, enforces the plan limit, sets is_approved=false), and doc 03's jobCreateSchema for the allowed payload fields.

Do:
1. Find every app code path that creates a job (the /api/jobs POST route if one exists, client callers, and the edge function). Replace direct inserts with the RPC: insforge.database.rpc('create_job', { p_payload }) passing ONLY job-content fields (title, description, requirements, skills_required, location, type, department, salary_min, salary_max, currency, experience_min, experience_max, status) — NEVER company_id or recruiter_id.
2. In insforge/functions/jobs/index.ts: per 09 T9 option (a) — DELETE the POST-create path entirely (creation goes through the RPC). Before deleting, check whether any live caller posts to this function (grep the app for invocations of the jobs function with POST/body). If you find one, wire it to the RPC path instead and say so; only keep a POST branch if a caller genuinely cannot use the RPC, and then it must call create_job with the CALLER's JWT, never the service key.
3. Client form (post-job page): drop any company_id/recruiter_id fields from the create payload. Surface the RPC's error contract: 'active job limit reached' (ERRCODE check_violation) → the 409/upgrade flow per doc 03; 'no active company membership' → pending-approval state.
4. IMPORTANT context: until migrations 046-051 are applied live (T10) and the fn redeployed (T11), the RPC does not exist in prod. Do not add temporary fallbacks to the old insert path — the working tree ships as a unit at T10/T11.

Verify: npx tsc --noEmit (baseline: one framer-motion error in applications/page.tsx:686); npx eslint on changed files; static read confirms NO code path inserts a job with client-supplied company_id/recruiter_id.

Output: per-file diff summary, which option you took for the edge fn and the caller evidence, tsc/eslint results, and anything where reality deviated from 09/03's description of the code. Deep Fable review follows.

---
T9 is done. C-4 is closed: no code path creates a job with client-supplied ownership anymore.

Per-file changes

insforge/functions/jobs/index.ts (−61/+9) — took option (a): deleted the entire POST-create branch, the jobCreateSchema, and narrowed CORS to GET, OPTIONS. POST now falls through to the existing 405. Left a comment at the old schema site pointing to the RPC so it doesn't get reintroduced. GET is untouched.

app/dashboard/recruiter/[role_id]/jobs/post-job/page.tsx (−9/+25) — invokeFunction('jobs', POST) → insforge.database.rpc('create_job', { p_payload }) with an explicit whitelist payload (no spread), so company_id/recruiter_id can't leak back in. Error contract mapped: active job limit reached → message with the close/upgrade prompt; no active company membership → redirect to the existing pending-approval page; coordinators cannot post jobs → role message. Dropped the now-orphaned invokeFunction import; useAuth/user stay (still used by the prefill effect).

Caller evidence for option (a)

The post-job form was the only POST caller. The other four invokeFunction('jobs', …) sites (app/jobs/page.tsx:50, app/browse-jobs/page.tsx:138, candidate page.tsx:504, candidate search/page.tsx:44) all pass method: 'GET' explicitly — I checked each, because invokeFunction defaults to POST, so an omitted method would have silently started 405ing. None do. I rewired the one caller to the RPC rather than leaving it broken.

Verification

npx tsc --noEmit → only the known baseline framer-motion error at applications/page.tsx:686, nothing new. npx eslint → post-job page clean; insforge/functions/jobs/index.ts is outside eslint's scope (same as prior edge-fn tasks, not a regression). Static re-grep: the only remaining from('jobs').insert is admin-jobs/index.ts:215.

Where reality deviated from the docs

The live jobs table has no category, openings, deadline, or coagainst the live schema, not the migrations). The deletededge-fn path inserted ...validation.data including all four — that insert could not have succeeded in prod. The live jobs table is also empty (rows: []),
which corroborates that job creation has never worked. So the ent rather than exploited — but the four fields the formcollects are now silently dropped, which is a real product gap: the category filter in the GET handler queries a column that doesn't exist, and
app/jobs/[id]/page.tsx:159 renders job.openings (always falls ows Category/Openings/Deadline/Company Name inputs that now gonowhere. This needs a decision — either add the columns or remove the inputs. I did not invent columns or extend create_job; that's outside T9.

/api/jobs does not exist. Docs 03 and 05 both describe a POST /api/jobs route with auditLog: true and a 409 ACTIVE_JOB_LIMIT body. There is no such route,
so the client calls the RPC directly and I map the Postgres ernce: no audit-log entry is written on job creation, contraryto doc 03's table.

No recruiter-facing upgrade route exists (only dashboard/admin/billing), so the "409/upgrade flow" per doc 03 has no destination. I surfaced the limit
inline instead of inventing a route — the real modal is 05/06'

admin-jobs/index.ts:215 left untouched — it's gated to admin/scheck, and doc 03 explicitly permits platform admins actingcross-company. Out of C-4's scope, but flagging that it does trust jobData wholesale.                                                                    
One caveat worth stating plainly: I verified this statically and against the live schema, but did not execute the create path — the RPC doesn't exist in prod until T10/T11, as expected.