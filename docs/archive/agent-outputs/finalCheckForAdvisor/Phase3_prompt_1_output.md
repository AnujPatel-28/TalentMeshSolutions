: Phase 3, starting with P0-2 (the last security blocker) — T-High, Opus

You are executing P0-2 from docs/specs/08_Implementation_Execution_Plan.md (Phase 3) in the Talentmesh-demo project: the recruiter layout SERVER guard, closing audit finding H-9 (recruiter routes are client-guarded only). This is an auth boundary — T-High. File-only, no deploys.

Read first: 06_Recruiter_Portal_Architecture.md (the server-guard spec — follow it exactly), 08 Phase 3 row 1, app/dashboard/recruiter/[role_id]/layout.tsx (current, unguarded), and the guarded siblings app/dashboard/admin/*/layout.tsx and app/dashboard/candidate/layout.tsx (house pattern: getServerUser from lib/server-auth.ts). Phase 2 context: /api/recruiter/status exists; company_members/companies are live with RLS; company_members_read_self (052) lets a member read their own row with their own token.

Do:
1. Rewrite app/dashboard/recruiter/[role_id]/layout.tsx as a server component guard:
   - getServerUser() → no session → redirect to login with returnTo.
   - role not recruiter/admin → redirect away (same target the candidate/admin layouts use for role mismatch).
   - Load the caller's company_members row + company status (server-side — use the caller's token path or the service client the way doc 06 specifies; ownership filter is ALWAYS user.id from the session).
   - No membership → redirect to the request-access/onboarding page; membership invited/suspended or company not verified → redirect to the pending-approval page; active + verified → render, passing companyId/memberRole as props to RecruiterLayoutClient per doc 06.
2. Keep client-side UX checks if the client layout has them, but the SERVER redirect is the enforcement — JS-off must be blocked (RSC redirect, not client effect).
3. Do not weaken anything: no mock-token paths, no role from query/params — [role_id] in the URL is addressing, not authorization.

Verify: npx tsc --noEmit (one known framer-motion baseline error); state the exact redirect matrix (no session / wrong role / no membership / pending / suspended / verified) and which server line enforces each.

Output: file list, the redirect matrix, how companyId/memberRole reach the client layout, and any doc-06 vs code drift found. Deep Fable review follows.

After P0-2 clears review, the rest of Phase 3 (recruiter Overview/Jobs/Post-job pages wired to the new APIs) is T-Mid work, and the final un-gate step — removing the app.* coming-soon rewrite in proxy.ts — stays gated on the Phase 5 security regressions per doc 08.


----



H-9 is closed. npx tsc --noEmit is clean except the one known framer-motion baseline error in app/dashboard/candidate/[role_id]/applications/page.tsx:686 — untouched by this change.

Files changed

- app/dashboard/recruiter/[role_id]/layout.tsx — rewritten as an RSC guard (was a pass-through that returned the client wrapper and never called getServerUser). Dropped the now-unused insforgeAdmin import.
- app/dashboard/recruiter/[role_id]/RecruiterLayoutClient.tsx — props widened to accept companyId/memberRole.

Redirect matrix

┌──────────────────────────────────────┬────────────────────────────────┬──────────────────┐
│              Condition               │            Redirect            │  Enforcing line  │
├──────────────────────────────────────┼────────────────────────────────┼──────────────────┤
│ No session                           │ /login?returnTo=<pathname>     │ layout.tsx:10-13 │
├──────────────────────────────────────┼────────────────────────────────┼──────────────────┤
│ Role admin/super_admin               │ /admin/dashboard               │ layout.tsx:18-20 │
├──────────────────────────────────────┼────────────────────────────────┼──────────────────┤
│ Role candidate (any non-recruiter)   │ /dashboard/candidate/[user.id] │ layout.tsx:21    │
├──────────────────────────────────────┼────────────────────────────────┼──────────────────┤
│ No membership (or removed)           │ /onboarding/recruiter/setup    │ layout.tsx:38    │
├──────────────────────────────────────┼────────────────────────────────┼──────────────────┤
│ Membership invited/suspended         │ /pending-approval              │ layout.tsx:41    │
├──────────────────────────────────────┼────────────────────────────────┼──────────────────┤
│ Company not verified (or unreadable) │ /pending-approval              │ layout.tsx:51    │
├──────────────────────────────────────┼────────────────────────────────┼──────────────────┤
│ active + verified                    │ renders                        │ layout.tsx:53-57 │
└──────────────────────────────────────┴────────────────────────────────┴──────────────────┘

Every one is a redirect() in a server component, so it's a 307ff and direct RSC hits both hit it. The client layout has noauth checks to preserve; it only wraps children in GlobalErrorBoundary, which stays.

companyId/memberRole come from the company_members row the server read (layout.tsx:30-35) and are passed as props at layout.tsx:54. I did not add a
context — nothing consumes them yet, and no-unused-vars is off props land cleanly ahead of the Jobs/Team rows that need them.

I verified the RLS path against the live DB rather than trustiour standing drift warning): company_members_read_self existslive with qual (user_id = (SELECT auth.uid())), and companies_public_read is live as is_active = true AND status <> 'deactivated'. So the caller's own
token can read their own membership at any status and their coey needed, and ownership filters on user.id from the sessiononly.

Doc-06 vs code drift

H-9 is overstated. Doc 06 line 21 says recruiter routes are "effectively unprotected server-side." They aren't — the parent app/dashboard/recruiter/layout.tsx:52 already calls getServerUal gap was narrower: no membership or company-verificationgate, and no companyId/memberRole plumbing. Worth correcting in the doc, since "unprotected" overstates the pre-existing exposure.

Doc 06's snippet has two defects I did not copy:
1. It uses an embedded join, .select('company_id, member_role, I used two separate queries instead — that's what the working/api/recruiter/status route does, and the embedded-join form isn't a pattern this codebase uses anywhere.
2. It filters .eq('status','active') then sends every miss to d dump a recruiter with no company at all onto an "AccountUnder Review" screen that will never resolve. I fetch without the status filter and split no-membership → /onboarding/recruiter/setup.

Doc 06 also says role mismatch → /dashboard; I used the candidate/admin layouts' actual mismatch targets, as you specified.

Two pre-existing bugs I found but did not touch (outside this task's diff):                                                                             
- app/dashboard/recruiter/layout.tsx:60 reads header x-url, but proxy.ts:41 only ever sets x-pathname. So pathname is always '', and the                !pathname.includes('/pending-approval') exemption at line 64 n its is_approved check on the pending-approval page too. I used x-pathname in the new guard.                                                                                                                            - Nothing anywhere sets x-redirect-depth; it's only ever read.pth > 3 403 loop-breaker in all four layouts is dead code, andthe ?rd= params thread through to nothing. I deliberately did not replicate that block in the new guard — it would have been ~40 lines of provably dead code, and the parent layout already runs it for these routes.
                                                                                                                                                          One consequence worth flagging for the Fable review: the innerage.tsx still checks recruiter_profiles.is_approved (thepre-company_members model) and is now effectively unreachable for pending users — my guard bounces them to the (auth) /pending-approval screen first. The Phase 3 "pending-approval wiring" row wants that page on /api/ reconciling with which of the two pending screens survives.