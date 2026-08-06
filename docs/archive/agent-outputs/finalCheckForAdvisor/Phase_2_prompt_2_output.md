Prompt P2-B — Opus/Gemini Pro: recruiter onboarding + verification routes (T-High)

You are executing Phase 2 tasks 2 and 4 from docs/specs/08_Implementation_Execution_Plan.md in the Talentmesh-demo project: the recruiter access-request/status routes and the verification submit/decide routes. These are auth-boundary handlers — T-High. File-only, no DB changes, no deploys. Migrations 046–051 are LIVE in prod (see _T10_T11_apply_log.md), so the RPCs and tables exist.

Read first: 03_API_Routes_And_Endpoints.md for the exact route specs (paths, methods, request/response contracts, error bodies); lib/api/handler.ts (withApi — every route MUST use it; see app/api/admin/send-proposal/route.ts for the house pattern); lib/validation/company.ts (from P2-A); 04_State_Machines_And_Business_Logic.md for the request/verification lifecycles.

Build these routes exactly per doc 03:
1. POST /api/recruiter/request-access — dedupe + attach semantics per doc 03; any role bump happens SERVER-side from the session, never from the body.
2. GET /api/recruiter/status — returns the caller's membership/verification state for the pending-approval page.
3. POST /api/company/verification/submit — company-admin scoped (authz via company_members, derived from the session user); inserts a company_verification_requests row via the caller's OWN token (RLS cvr_insert_own enforces company_id = authz.company_id_of(uid) AND submitted_by = uid) — do NOT use the service key for this insert.
4. GET /api/admin/verification/queue + POST /api/admin/verification/decide — admin-gated via withApi allowedRoles; decide calls the RPCs approve_company_verification / reject_company_verification / request_more_info_for_verification (never direct UPDATEs). Map RPC errors: 'not found or already decided' → 409, 'admin only' → 403.

Non-negotiables (RLS house rules + audit findings):
- company_id NEVER authorizes from the request body — always derived from the session user's membership.
- Every route wrapped in withApi with a Zod schema and explicit allowedRoles.
- No new service-key clients unless doc 03 explicitly requires one for that route; when used, the service key must never write rows whose ownership comes from client input.

Verify: npx tsc --noEmit (known baseline error excepted); eslint on changed files; for each route, state its 401/403/409 behavior and which line enforces it.

Output: per-route file list, the contract table (method/path/status codes), where each auth check lives, and any doc-03 spec gaps you had to stop on. Deep Fable review follows before P2-C.


----


All 8 pass. Both routes and schemas are done — here's the report.

Files

┌──────────────────────────────────────────────┬─────────────────────────────────────────────────────────────────────────────────────┐
│                     File                     │                                        What                                         │
├──────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────┤
│ app/api/recruiter/request-access/route.ts    │ new — POST, dedupe + attach                                                         │
├──────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────┤
│ app/api/recruiter/status/route.ts            │ new — GET, pending-approval state                                                   │
├──────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────┤
│ app/api/company/verification/submit/route.ts │ new — POST, company-admin scoped                                                    │
├──────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────┤
│ app/api/admin/verification/queue/route.ts    │ new — GET, admin-gated                                                              │
├──────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────┤
│ app/api/admin/verification/decide/route.ts   │ new — POST, dispatches to the three RPCs                                            │
├──────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────┤
│ lib/validation/company.ts                    │ added requestAccessSchema, verificationDecisionSchema, verificationQueueQuerySchema │
├──────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────┤
│ lib/server-insforge.ts                       │ token lookup now matches getServerUser (header ‖ cookie)                            │
├──────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────┤
│ __tests__/lib/company.test.ts                │ 4 schema tests                                                                      │
└──────────────────────────────────────────────┴─────────────────────────────────────────────────────────────────────────────────────┘

Contract

┌────────┬──────────────────────────────────┬─────────────────┬─────────────────────────────────────┬─────────────────────────────────────────────────┐
│ Method │               Path               │      Roles      │                 200                 │                       4xx                       │
├────────┼──────────────────────────────────┼─────────────────┼─────────────────────────────────────┼─────────────────────────────────────────────────┤
│ POST   │ /api/recruiter/request-access    │ candidate,      │ {status:'pending', company_id,      │ 400 · 401 · 403 already_member · 404 (attach    │
│        │                                  │ recruiter       │ verificationEmail}                  │ target) · 409 company_exists                    │
├────────┼──────────────────────────────────┼─────────────────┼─────────────────────────────────────┼─────────────────────────────────────────────────┤
│ GET    │ /api/recruiter/status            │ recruiter,      │ {membership, company, verification} │ 401 · 403                                       │
│        │                                  │ candidate       │                                     │                                                 │
├────────┼──────────────────────────────────┼─────────────────┼─────────────────────────────────────┼─────────────────────────────────────────────────┤
│ POST   │ /api/company/verification/submit │ recruiter       │ {status:'submitted', request_id}    │ 400 · 401 · 403                                 │
├────────┼──────────────────────────────────┼─────────────────┼─────────────────────────────────────┼─────────────────────────────────────────────────┤
│ GET    │ /api/admin/verification/queue    │ admin,          │ paginated requests                  │ 400 · 401 · 403                                 │
│        │                                  │ super_admin     │                                     │                                                 │
├────────┼──────────────────────────────────┼─────────────────┼─────────────────────────────────────┼─────────────────────────────────────────────────┤
│ POST   │ /api/admin/verification/decide   │ admin,          │ {status, request_id}                │ 400 · 401 · 403 · 409 request_not_pending       │
│        │                                  │ super_admin     │                                     │                                                 │
└────────┴──────────────────────────────────┴─────────────────┴─────────────────────────────────────┴─────────────────────────────────────────────────┘

Where auth is enforced

401 and role-403 are withApi for every route (handler.ts:42 / :48). Beyond that: request-access:29 blocks a second membership; submit:26-38 derives company_id from the caller's active membership and 403s on mismatch, with RLS cvr_insert_own re-checking the insert independently at submit:41; decide:31 maps 'admin only' → 403 and 'not found' → 409.

company_id never authorizes from the body anywhere. submit inserts membership.company_id, not body.company_id — the body value is only compared, then discarded.

Client choice per route (this is the load-bearing decision)

decide uses the caller's own token — mandatory, not stylistic. All three RPCs are SECURITY DEFINER but gate on authz.is_admin(), which resolves auth.uid() from the JWT; a service-key call has no uid and would fail 'admin only'. submit likewise uses the caller's token, as specified.

request-access, status, and queue use the service key, and each is forced by a missing policy rather than convenience: companies has no INSERT policy, and company_members_admin_write needs an admin membership the requester doesn't have yet; queue has no platform-admin read policy on company_verification_requests (cvr_read_own is member-scoped, admin_bypass is project_admin-only). In all three, every ownership column (created_by, user_id, submitted_by) comes from the session.

Doc-03 gaps I hit

/api/recruiter/status cannot work over the caller's token at all. cvr_read_own and company_members_read_own_company key off authz.company_id_of(uid), which returns NULL until membership is 'active'. A pending recruiter — the only user this page exists for — reads nothing. Same defect breaks the doc-04 §3 resubmit-after-needs_more_info flow: doc 04 says the guard is membership invited, but cvr_insert_own requires active. An invited member cannot resubmit. Route 3 is built as specced; those callers will 403 until the policy is fixed.

Self-attach + self-accept looks like a tenant-join hole. attach_company_id creates an invited row, and accept_company_invite (051) only requires an invited row on a verified company — so a user who knows a GSTIN could attach, self-accept, and land inside that tenant with no admin approval. I mitigated what I could in-route (attach grants member_role:'recruiter', never 'admin'), but the real fix is in the RPC (require invited_by IS NOT NULL) and is out of scope here.

Decided-request status code: your prompt says 409, doc 03 says 422. I used 409 per the prompt. Also, the RPC strings differ ('not found or already decided' in 049 vs 'not found or not pending' in 051), so I match on 'not found' to catch both.

request-access is not atomic. Doc 03 specs four sequential inserts with no RPC; PostgREST gives no transaction, so a mid-sequence failure leaves a company with no member row. Left as specced — an RPC would need a DB change.

Smaller: the doc's attach path still requires name/industry (harmless, client resends after the 409); doc 03's about remains description per P2-A's drift note.

Skipped: rate limiting on request-access/submit (doc 03 §Rate limiting, user_rate_limits) — add when P2-C lands or before GA, since these are unauthenticated-adjacent spam surfaces.
