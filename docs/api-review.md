# TalentMesh — Backend API Architecture Review

**Reviewer role:** Principal Software Architect
**Subject:** backend architecture, ahead of a Version 1 public API freeze
**Source of truth:** [`docs/backend-api-inventory.md`](backend-api-inventory.md) — verified against
the live production database on 2026-08-05
**Date:** 2026-08-05
**Nature of this document:** review and recommendation only. No source code, migration, endpoint,
or schema was created or modified.

---

## Section 1 — Executive Summary

### The finding that governs everything else

**TalentMesh does not currently have an API. It has a database tunnel.**

`app/api/v1/remote/[...path]/route.ts` forwards any path to InsForge with no allowlist, and the
browser uses it to speak PostgREST directly — building `.from().select().eq()` queries client-side.
The 42 Next.js route handlers are a real API layer, but they sit *beside* the tunnel rather than in
front of it, and they cover only a minority of traffic.

Every other conclusion in this review descends from that one fact:

- **You cannot version what you do not control.** PostgREST exposes table shape. Renaming a column
  is a breaking change to every client.
- **You cannot publish this.** A partner integrating against `/api/database/records/jobs?select=*`
  is coupled to your physical schema forever.
- **RLS is not a backstop here, it is the entire authorization layer** — which is why the policy
  duplication in §4 is a security issue rather than untidiness.
- **The service-key substitution (SEC-1) is only reachable because the tunnel exists.** Close the
  tunnel and that critical finding disappears with it.

The good news: this is recoverable, and cheaply, because the correct pattern already exists in the
codebase. `withApi()` is well-designed. It just needs to become mandatory.

### Architecture maturity

| Dimension | Level | Assessment |
|---|---|---|
| Authentication | **Mature** | HttpOnly parent-domain cookie, 12-char policy, TOTP MFA, OAuth. Genuinely well done. |
| Authorization (DB) | **Developing** | `authz` schema is textbook-correct; undermined by two live policy generations. |
| Authorization (API) | **Immature** | 22 of 57 operations declare roles; 5 declare permissions. |
| API surface design | **Immature** | No envelope, no error, no pagination standard. No versioning. |
| Data model | **Mature** | 76 FKs, sensible cascades, denormalised counters maintained by triggers. |
| Observability | **Immature** | `audit_log` has 15 rows; `auth_events`, `authorization_events` have 0. |
| Testing | **Developing** | 72 unit tests; e2e has never executed in CI. |
| Operational readiness | **Immature** | No health endpoint. Rate limiting is per-lambda in-memory. |

### Major strengths

1. **The authentication design is the best part of this system.** The HttpOnly parent-domain cookie
   solving the `jobs.`/`app.`/`admin.` subdomain split is a correct, non-obvious solution.
2. **`authz` as a dedicated schema.** `SECURITY DEFINER` with pinned `search_path`, `anon` denied
   USAGE. This is exactly how to avoid recursive-RLS deadlock, and most teams get it wrong.
3. **`jobs_no_direct_insert WITH CHECK (false)`.** Forcing creation through `create_job()` is a
   deliberate, correct choice — a workflow with entitlement limits should not be a table insert.
4. **`withApi()` is a good abstraction.** Auth, role, permission, Zod validation and audit in one
   declaration. The problem is adoption, not design.
5. **Leased queue claims.** `claim_notification_job`, `claim_export_job`, `claim_cleanup_lock` are
   correctly implemented against the check-then-act race that the rest of the codebase falls into.
6. **RLS is enabled on all 65 tables.** No table was forgotten.

### Major weaknesses

1. **The catch-all proxy** (above). Critical.
2. **Two generations of RLS policy live simultaneously.** SELECT policies OR together, so the
   legacy recruiter policies *widen* access. The legacy UPDATE policy on `applications` has no
   company-role check at all.
3. **No response contract.** 13 distinct success envelope keys (`job`, `jobs`, `data`, `member`,
   `members`, `user`, `company`, `request`, `requests`, `membership`, `status`, `success`,
   `purpose`). Two incompatible pagination shapes. Two incompatible error shapes.
4. **Edge functions used as an application layer.** 49 of 54 do nothing but talk to the database.
   They exist because there was no server-side place to put logic when they were written.
5. **Validation coverage is half the surface.** 32 of 57 operations have no declared schema.

### Technical debt (ranked by interest rate)

| Debt | Cost of carrying it |
|---|---|
| Catch-all proxy | Blocks V1 entirely. Compounds — every new client couples to schema. |
| Duplicate RLS generations | Security exposure that grows as `company_members` adoption grows. |
| No response/error standard | Every week of new endpoints makes the eventual normalization bigger. |
| 3× redundant `updated_at` triggers on hot tables | Constant tax on every write to `applications`, `profiles`, `candidate_profiles`. |
| 13 policies on `applications` where ~6 suffice | Evaluated per query, forever. |
| Dead schema (`interviews`, `offers`, `nvites`, `ai_*`, `messages`, `job_alerts` — all 0 rows) | Cognitive load; implies capability that does not exist. |
| `debug_output`, `test_rpc_sync`, `test-auth-pattern` in production | Signals low hygiene bar to anyone auditing. |

### Scalability concerns

Nothing here is slow *today* — the database is 24 MB with 6 jobs and 35 applications. These are
structural, and every one of them bites at a specific, predictable scale:

1. **In-memory rate limiting** (`Map` in module scope, `/api/v1/remote`) is per-lambda and resets on
   cold start. On Vercel this means **effectively no rate limiting in production, now.**
2. **Client-side PostgREST composition** means the client decides query shape. You cannot add an
   index for a query you do not know about.
3. **Edge function per read** — an extra network hop and cold start on the critical path for reads
   that PostgREST or a Next route could serve directly.
4. **Denormalised counters via AFTER triggers** (`update_job_applications_count`,
   `maintain_resume_upload_count`) are read-modify-write. They drift under concurrency and will
   contend on hot rows.
5. **Unbounded default page size** on any PostgREST read the client composes.
6. **Synchronous AI calls.** `ai-match` and `resume-parse` call Anthropic on the request path with
   no queue. One slow upstream stalls a user request.

### Security concerns

Carried forward from the inventory, with architectural framing:

| ID | Severity | Concern | Architectural root cause |
|---|---|---|---|
| SEC-1 | **Critical** | Proxy swaps in the service-role key for anonymous GETs matching a substring; RLS does not apply | The tunnel |
| SEC-2 | **High** | `anon` has EXECUTE on `http_*` → SSRF from inside the database | Extension installed with default PUBLIC grants |
| SEC-3 | **High** | Legacy recruiter RLS widens access; legacy UPDATE has no role check | Migration never completed |
| SEC-4 | ~~High~~ **Low** | Company-verification RPCs granted to `authenticated` — **but guarded in-body by `authz.is_admin()`; downgraded after reading source** | Authorization inside function body rather than in the grant |
| SEC-5 | Medium | `saved_candidates` RLS-forced with zero policies | Feature shipped without a policy |
| SEC-6 | Low | Anonymous users see scheduled/expired announcements | Two policies, different predicates |
| SEC-7 | Medium | 9 `SECURITY DEFINER` functions with no pinned `search_path` | Inconsistent with house style |
| SEC-8 | Medium *(unverified)* | Per-object storage authorization unconfirmed | — |

**SEC-4 has since been downgraded.** All three functions do carry
`IF NOT authz.is_admin() THEN RAISE EXCEPTION 'admin only'` as their first statement. What remains is
confirming the live body matches source, given known drift — one query, not a redesign.

### Overall readiness score

> ### **4 / 10**

A single number hides the shape of the problem, so:

| Question | Score | Justification |
|---|:--:|---|
| Is the **data model** sound? | **8** | Well-normalised, correct cascades, good constraint use |
| Is **authentication** production-ready? | **8** | Genuinely strong |
| Is **authorization** production-ready? | **5** | Right primitives, incomplete migration, unverified RPC grants |
| Is the **API surface** production-ready? | **3** | No contract, no versioning, no standard |
| Is it ready for a **public V1 API**? | **2** | The tunnel makes a stable contract impossible today |
| Is it ready for **continued internal use**? | **6** | Works; carries one critical and three high findings |

**The gap between 8 (data model) and 2 (public API) is the whole story.** The foundation is better
than the surface. That is a much better position than the reverse — you are not rebuilding, you are
putting a facade on something structurally sound.

---

## Section 2 — API Classification Review

Classification of all 42 route handlers. `CRUD` = PostgREST resource access; `RPC` = PostgreSQL
function; `EF` = Edge Function; `AI` = Future AI Microservice; `API` = Next.js route handler that
should own the operation.

### Auth module (10)

| Endpoint | Today | Recommended | Reason |
|---|---|---|---|
| `POST /api/auth/signup` | API → EF | **API + RPC** | Multi-table transaction (profiles + consent_records + preferences). Must be atomic; today it is not. Consent capture is a legal record — it cannot half-write. |
| `POST /api/auth/verify` | API → EF | **API** | Token exchange against the auth provider. No business logic. The EF hop adds latency to a conversion-critical step. |
| `POST /api/auth/session` | API → EF | **API** | Cookie minting is a Next.js concern; it must happen where `Set-Cookie` is written. The EF round-trip is pure overhead. |
| `POST /api/auth/refresh` | API | **API** | Correct. Cookie-scoped rotation. |
| `POST /api/auth/logout` | API | **API** | Correct. |
| `POST /api/auth/oauth/exchange` | API | **API** | Correct. Provider secret must stay server-side. |
| `POST /api/auth/mfa-complete` | API | **API** | Correct. TOTP verification must not be client-visible. |
| `GET/DELETE /api/auth/sessions` | API | **API** | Correct, but has no caller — see §5. |
| `GET/DELETE /api/auth/sessions/current` | API | **API** | Correct. Same. |
| `ALL /api/auth/email/[...slug]` | API | **API, split** | A catch-all on an auth surface is a design smell. Should be explicit routes. |

### Jobs module (5)

| Endpoint | Today | Recommended | Reason |
|---|---|---|---|
| `GET /api/jobs` | API (`withApi`) | **API** — keep | Not simple retrieval. The handler applies company scope *in addition to* RLS because OR'd SELECT policies would otherwise leak other companies' approved jobs. That defensive layer is correct and must not be replaced by raw CRUD. |
| `POST /api/jobs` | API → **RPC** `create_job` | **Keep RPC** | Textbook RPC: multi-table, enforces plan entitlement, must be atomic. `jobs_no_direct_insert` correctly makes this the only path. |
| `GET/PATCH/DELETE /api/jobs/[jobId]` | API | **API** | PATCH must not become raw CRUD — approval fields must stay non-client-writable. |
| `POST /api/jobs/[jobId]/publish` | API | **API → RPC** | State transition with entitlement + approval implications. Belongs in the same transaction as the limit check (RACE-1). |
| `POST /api/jobs/[jobId]/close` | API | **API → RPC** | Same. Should cascade to application state consistently. |

**Public job board reads** (`browse-jobs`, `/jobs`) currently go through the tunnel to PostgREST.
**Recommend: a first-class `GET /api/jobs/public`.** This is the single change that lets SEC-1's
service-key substitution be deleted.

### Applications module (2)

| Endpoint | Today | Recommended | Reason |
|---|---|---|---|
| `GET/POST /api/applications` | API | **API** (POST → RPC) | Applying is a workflow: create application, snapshot resume, fire notification, update counters. Currently spread across triggers; should be one transaction. |
| `PATCH /api/applications/[id]/status` | API → EF → RPC | **API → RPC directly** | Already an RPC (`update_application_status`), correctly guarded by a trigger. The `update-application` EF in the middle adds a hop and a second auth surface for no gain. |

### Companies module (6)

| Endpoint | Today | Recommended | Reason |
|---|---|---|---|
| `GET/PATCH /api/company/[companyId]` | API | **API** | Verification fields must never be client-writable. |
| `GET /api/company/[companyId]/members` | API | **CRUD acceptable** | Genuinely simple retrieval, and `company_members` RLS is correct. Low-value to wrap. |
| `POST …/members/invite` | API | **API → RPC** | Multi-table + invariant. |
| `POST …/members/accept` | API → RPC | **Keep RPC** | Correct already. |
| `PATCH/DELETE …/members/[userId]` | API | **API → RPC** | Must respect `guard_last_company_admin` atomically (RACE-4). |
| `POST /api/company/verification/submit` | API | **API** | Correct. No caller yet — §5. |

### Admin module (6)

| Endpoint | Today | Recommended | Reason |
|---|---|---|---|
| `GET /api/admin/verification/queue` | API | **API** | Correct. One of only two routes using the pagination helper. |
| `POST /api/admin/verification/decide` | API → RPC | **Keep RPC, fix grant** | Correct shape. Grant is broad but the body enforces `authz.is_admin()` — SEC-4 downgraded. |
| `GET /api/admin/dpdp/queue` | API | **API** | Correct. |
| `POST /api/admin/dpdp/decide` | API | **API → RPC** | Erasure must be atomic across many tables. `lib/dpdp/erasure.ts` defines the plan; it should execute in one transaction. |
| `POST /api/admin/forgot-password` | API → EF | **API** | Env-gated by `ADMIN_EMAILS`. |
| `POST /api/admin/send-proposal` | API | **API** | Contains a stale `supabaseUrl` variable name — cosmetic, but a reviewer will flag it. |

### Consent & DPDP (4)

| Endpoint | Today | Recommended | Reason |
|---|---|---|---|
| `GET/POST /api/consent` | API | **API** | **Never CRUD.** `consent_records` is an append-only legal ledger under DPDP; a client-composed write is unacceptable. |
| `POST /api/consent/withdraw` | API | **API → RPC** | Latest-row-wins semantics must be transactional. |
| `GET /api/dpdp/export` | API | **API → EF (async)** | Full-subject export is unbounded work on a request path. Should become a job. |
| `GET/POST /api/dpdp/requests` | API | **API** | Statutory deadlines — needs its own audit trail. |

### Newsletter (4)

All four → **API**, unchanged. `newsletter_subscribers` and `newsletter_rate_limits` have RLS with
zero policies, which is correct here — service-role-only writes.

### Interviews / Platform / Proxy (5)

| Endpoint | Today | Recommended | Reason |
|---|---|---|---|
| `POST /api/interview/room` | API → Daily.co | **Future AI/RTC service** | External vendor on the request path. Paused feature. Contains a `mock-room-` fallback that must not survive into V1. |
| `POST /api/email/send` | API → Resend | **Internal only, then a service** | Must never be publicly callable — it is an open relay if exposed. |
| `ALL /api/storage/[...path]` | API | **API, allowlisted** | Catch-alls on a storage surface need explicit bucket allowlisting. |
| `ALL /api/v1/remote/[...path]` | Tunnel | **DEPRECATE** | See §11 REC-1. |

### Database CRUD — what should legitimately stay PostgREST

Reads where RLS fully expresses the rule and the shape is a plain resource:

| Table | Access | Why CRUD is right |
|---|---|---|
| `subscription_plans` | public read | Static catalogue, `plan_read USING (true)` |
| `plan_limits` | authenticated read | Static, read-only |
| `blog` | public read published | `status='published'` fully expresses it |
| `notifications` | own read/update | `user_id = auth.uid()` is the whole rule |
| `saved_jobs` | own CRUD | Same |
| `notification_preferences` | own CRUD | Same |
| `user_preferences` | own CRUD | Same |
| `announcements` | read active | **After fixing SEC-6** |

Everything else should move behind a route handler.

---

## Section 3 — Edge Function Review

54 functions. The governing observation: **49 of 54 do nothing but talk to PostgreSQL.** They are
not compute — they are an application layer that was built in Deno because, at the time, there was
nowhere else to put it. `withApi()` now exists and is better: same process as the cookie, typed
end-to-end, testable with the rest of the codebase, no cold start, no second auth surface.

An edge function earns its keep when it needs (a) a secret the browser must never see, (b) a
service-role privilege escalation, (c) long-running or scheduled work, or (d) an external vendor
call. Judged on that:

### 3.1 Verdict summary

| Verdict | Count |
|---|--:|
| Keep as Edge Function | 14 |
| Collapse into Next.js API routes | 30 |
| Convert to PostgreSQL RPC | 5 |
| Become AI Microservice | 3 |
| Remove | 2 |

### 3.2 Keep as Edge Function (14)

| Function | Why it earns its place |
|---|---|
| `notification-worker` | Scheduled queue consumer with leased claims. Correct use — runs off the request path. |
| `cleanup-stale-resources` | Cron, mutexed via `claim_cleanup_lock`. Correct. |
| `cleanup-idempotency-keys` | Cron. Correct. |
| `resume-proxy` | Service-role storage read + per-object authorization + `resume_access_log` write. Needs privilege the browser must never hold. |
| `recruiter-document-proxy` | Same, for KYC documents. |
| `upload-resume` | Service-role storage write + quarantine hook. |
| `upload-logo` | Service-role storage write. |
| `upload-blog-image` | Service-role storage write. |
| `admin-export` | Long-running CSV generation. Belongs off the request path. |
| `admin-auth-login` | Separate admin auth surface; service-key dependent. |
| `admin-forgot-password` | Service-role, env-gated. |
| `mfa-status` | Service-role MFA state. |
| `mfa-backup-codes` | Service-role secret generation. |
| `auth-signup` | External vendor (Resend) + service-role profile seeding. |

### 3.3 Collapse into Next.js API routes (30)

These are read-shaped or thin-write functions with no privilege requirement. Each costs a cold
start and an extra network hop on the user's critical path.

**Admin readers (13):** `admin-dashboard`, `admin-candidates`, `admin-recruiters`,
`admin-recruiter`, `admin-companies`, `admin-jobs`, `admin-applications`, `admin-audit`,
`admin-audit-logs`, `admin-export-audit`, `admin-reports`, `admin-settings`, `admin-plans`.
*Why:* aggregation queries an admin route handler can run directly. `withApi({ allowedRoles:
['admin'] })` expresses the guard better than a hand-rolled preamble in each function.

**Candidate readers (5):** `candidate-dashboard`, `candidate-profile`, `candidate-applications`,
`candidate-applications-id`, `recommendations`.
*Why:* all four React Query keys in the entire app point at these. Collapsing them removes a hop
from the app's hottest path.

**Recruiter readers (6):** `recruiter-dashboard`, `recruiter-profile`, `candidates`,
`company-profile`, `jobs`, `jobs-id`.
*Why:* `jobs` and `jobs-id` **duplicate** `/api/jobs` and `/api/jobs/[jobId]`. Two implementations
of one resource with two different authorization paths is a defect waiting to happen.

**Content (3):** `blogs`, `blogs-slug`, `dashboard`.
*Why:* public reads. `blog` RLS already expresses `status='published'`. These could even be static
with ISR.

**Writes (3):** `update-application`, `recruiter-request`, `profile-complete-onboarding`,
`admin-announcements`, `admin-billing`.
*Why:* `update-application` is the clearest — it is a pass-through to an RPC that is *already*
`project_admin`-only. The function adds a hop and a duplicate auth check.

### 3.4 Convert to PostgreSQL RPC (5)

| Function | Why RPC beats Edge |
|---|---|
| `update-application` | The transition is already `update_application_status()`. Call it from a route handler. |
| `activate-recruiter` | Multi-table role transition — must be atomic. Also currently **orphaned** (callers removed, function still deployed). |
| `profile-complete-onboarding` | Multi-table write across `profiles` + role profile. Atomicity matters. |
| `recruiter-request` | Creates request + notification. One transaction. |
| `company-profile` (write path) | Company mutation with verification invariants. |

### 3.5 Become AI Microservice (3)

| Function | Model | Why it must leave |
|---|---|---|
| `ai-match` | `claude-sonnet-4-20250514` | Unbounded latency and cost per call, on a synchronous request path. Needs its own queue, retry policy, budget ceiling and independent scaling. Also the natural owner of embeddings when semantic matching arrives. |
| `resume-parse` | `claude-3.5-haiku` | Long-running, retry-prone, and the pipeline owner for a document workflow. Failure here must not fail a user request. |
| `interview-generator` | none yet | Reads `jobs` only — the generation step was never implemented. Should be born in the microservice rather than completed in Deno. |

**Prerequisite, and it is not optional:** none of the three is asynchronous today. Extracting them
without an async job-status contract relocates the latency instead of removing it. Build the job
contract first.

### 3.6 Remove (2)

| Function | Why |
|---|---|
| `test-auth-pattern` | A test scaffold deployed to production. Nothing should call it. |
| `activate-recruiter` | Callers were deliberately removed (documented in `app/(auth)/verify-recruiter/page.tsx`). Either delete it or fold it into the RPC per §3.4 — leaving a deployed, unreferenced function that performs a **role transition** is an unnecessary attack surface. |

### 3.7 Cross-cutting

- **`isServerMode: true` is load-bearing.** Omitting it makes `getCurrentUser()` return null in
  ~0 ms. This is a footgun repeated 54 times; a shared factory would make it unforgettable.
- **Cold starts sit on read paths.** Every collapse in §3.3 removes one from a user-visible read.
- **Source drift is a known hazard** — deployed functions have diverged from local `.ts`. This
  compounds per function, and is an argument for having fewer of them.

---

## Section 4 — Database API Review

### 4.1 Overexposed tables

Reachable through the tunnel via PostgREST today, where RLS is the *only* control:

| Table | Exposure | Risk |
|---|---|---|
| `jobs` | **anon, service-role via SEC-1** | Drafts and unapproved jobs readable. **Critical.** |
| `blog` | anon, service-role via SEC-1 | Unpublished drafts readable. |
| `profiles` | authenticated | 27 columns; legacy recruiter policy widens reach. |
| `candidate_profiles` | authenticated | 27 columns of personal data; legacy policy widens reach. |
| `candidate_resumes` | authenticated | Resume metadata; legacy policy widens reach. |
| `applications` | authenticated | 13 policies, OR'd — the widest surface in the system. |
| `companies` | anon read | 24 columns. Verification and internal notes should not be public. |

**Column-level exposure is the underrated issue.** `profiles` and `candidate_profiles` have 27
columns each. PostgREST `select=*` returns all of them subject only to row filtering. There is no
column projection policy. A route handler returning an explicit DTO fixes this permanently.

### 4.2 Missing RLS

**None.** All 65 tables have RLS enabled — genuinely good.

But nine have RLS with **zero policies** (deny-all except service role):

| Table | Intentional? |
|---|---|
| `auth_attempts`, `newsletter_rate_limits`, `newsletter_subscribers`, `admin_invites` | **Yes** — service-role stores |
| `ai_suggestion_cache` | Moot — feature unwired |
| `admin_permissions` | Probably — but the granular model is unbuilt (GAP-4) |
| **`saved_candidates`** | **No — SEC-5.** A V1 capability with no reachable API. 0 rows. |
| `debug_output`, `test_rpc_sync` | **No — should not exist in production** |

### 4.3 Tables that should never be exposed directly

| Table | Why |
|---|---|
| `consent_records` | Append-only legal ledger. DPDP evidence. Writes only through a controlled path. |
| `audit_log` | Tamper-evidence requires it be append-only and service-written. |
| `verification_audit_log` | Same. |
| `authorization_events`, `auth_events` | Security telemetry. |
| `resume_access_log` | DPDP access record — the thing that proves who read a CV. |
| `idempotency_keys` | Internal mechanism. |
| `user_auth_state` | Session invalidation state — client visibility invites tampering. |
| `admin_users`, `recruiter_users` | Trigger-maintained denormalisations. Any direct write corrupts them. |
| `platform_settings` | Runtime config. |
| `plan_limits` | Read-only entitlement source. Writable = billing bypass. |
| `notification_jobs`, `notification_events`, `notification_receipts` | Queue internals. |
| `storage_quarantine` | Security workflow. |
| `debug_output`, `test_rpc_sync` | Should not exist. |

### 4.4 Tables that should only be accessed through RPC

| Table | Required invariant |
|---|---|
| `jobs` (insert) | **Already enforced** by `jobs_no_direct_insert`. The model to copy. |
| `applications` (status) | Trigger-guarded; must route through `update_application_status`. |
| `company_members` | `guard_last_company_admin` must hold under concurrency. |
| `companies` (verification cols) | Must not be self-settable — SEC-4 depends on this. |
| `consent_records` | Append-only, latest-row-wins. |
| `subscriptions` | Billing state. |
| `export_jobs` | Claim semantics. |

### 4.5 Read-only resources

`subscription_plans`, `plan_limits`, `notification_templates`, `blog` (published),
`announcements` (active), `companies` (public projection).

### 4.6 Internal-only resources

`idempotency_keys`, `cleanup_job_runs`, `newsletter_rate_limits`, `user_rate_limits`,
`auth_attempts`, `notification_jobs`/`_events`/`_receipts`, `export_jobs`/`export_candidates`,
`storage_quarantine`, `admin_users`, `recruiter_users`, `user_auth_state`, `debug_output`,
`test_rpc_sync`, `ai_suggestion_cache`.

### 4.7 Dead schema

`interviews`, `offers`, `nvites`, `ai_interviews`, `live_ai_interviews`, `messages`, `job_alerts`,
`access_requests`, `custom_proposals`, `subscriptions`, `subscription_events`,
`application_events`, `announcement_*`, `admin_permissions`, `admin_invites`, `export_*`,
`recruiter_candidate_notes`, `saved_candidates` — **all 0 rows.**

That is 18 of 65 tables (28%) carrying policies, indexes and FKs for capability that does not exist.
They should not appear in a V1 API. Keep the schema — deleting it is not worth the risk — but the
public contract must not imply these work.

---

## Section 5 — Endpoint Standardization Review

### 5.1 Naming is actually mostly good

No verb-based routes (`/getJobs`, `/createCandidate`) exist. Resources are plural, IDs are path
segments, methods are used correctly. **The naming is not the problem — the contract is.**

### 5.2 Genuine REST violations

| Endpoint | Violation | Recommended |
|---|---|---|
| `POST /api/jobs/[jobId]/publish` | RPC-style verb on a resource | Acceptable as-is. State transitions are the recognised exception; `PATCH /jobs/{id} {status}` would hide an entitlement check. **Keep, document as an action sub-resource.** |
| `POST /api/jobs/[jobId]/close` | Same | Same. |
| `POST /api/consent/withdraw` | Verb | `DELETE /consent/{purpose}` is more RESTful, but withdrawal is an *append* to a ledger, not a delete. **Keep; the verb is more honest.** |
| `POST /api/company/[id]/members/accept` | Verb | `PATCH /company/{id}/members/{userId} {status:'active'}`. Genuine improvement — the actor is the invitee. |
| `POST /api/recruiter/request-access` | Verb + non-resource | `POST /recruiter/access-requests` — it creates a record. |
| `GET /api/recruiter/status` | Non-resource | `GET /recruiter/me` or fold into `/api/auth/session`. |
| `POST /api/admin/verification/decide` | Verb | `PATCH /admin/verification/requests/{id} {decision}`. |
| `POST /api/admin/dpdp/decide` | Verb | `PATCH /admin/dpdp/requests/{id} {decision}`. |
| `POST /api/newsletter/resend-confirmation` | Verb | `POST /newsletter/subscribers/{id}/confirmations`. Low priority. |
| `ALL /api/v1/remote/[...path]` | Not an endpoint | Deprecate. |
| `ALL /api/auth/email/[...slug]` | Catch-all on auth | Split into explicit routes. |

### 5.3 Duplicate endpoints — the real finding

| Resource | Implementation A | Implementation B | Problem |
|---|---|---|---|
| Jobs list | `GET /api/jobs` (`withApi`, role-checked, company-scoped) | `jobs` edge function | **Two authorization paths for one resource.** |
| Job detail | `GET /api/jobs/[jobId]` | `jobs-id` edge function | Same. |
| Candidate applications | `/api/applications` | `candidate-applications`, `candidate-applications-id` | Same. |
| Company profile | `/api/company/[companyId]` | `company-profile` edge function | Same. |
| Admin recruiters | — | `admin-recruiter` **and** `admin-recruiters` | Two functions, near-identical names. |
| Audit | — | `admin-audit` **and** `admin-audit-logs` | Same. |
| Admin predicate | `public.is_admin()` | `authz.is_admin()` + a third inline `EXISTS` spelling | Three sources of one truth (GAP-2). |

**This is the highest-value cleanup in this section.** Duplicate resource implementations mean a
security fix applied to one path silently misses the other.

### 5.4 Response format — no standard exists

**13 distinct success envelope keys observed:** `error`(130), `user`(8), `success`(6), `status`(6),
`member`(4), `job`(4), `company`(3), `membership`(2), `requests`, `request`, `purpose`, `members`,
`jobs`, `data`.

`/api/jobs` returns `{ jobs, total, page, limit }`. `lib/api/pagination.ts` defines
`{ data, pagination: { total, page, limit, totalPages } }` — and is used by **2 of 42 routes**.
Two incompatible pagination contracts, and the better one is nearly unused.

### 5.5 Error format — two conventions, plus leakage

```
{ error: 'Unauthorized' }                                     // 130 occurrences — human string
{ error: 'already_member', message: 'This user already…' }     // machine code + message — better
{ error: error.message }                                       // leaks internal errors
{ error: 'Internal Server Error: Admin client not configured' } // leaks configuration state
```

The second form is correct and should become the standard. The fourth tells an attacker about your
deployment.

**Status codes:** 56×500, 23×403, 22×401, 21×400, 16×200, 15×404, 10×409, 6×429, 5×422, 2×413,
2×201, 1×504, 1×405. **Three times more 500s than 400s** suggests errors are not being classified —
client faults are being reported as server faults. Only 2 uses of 201; deletes return 200, not 204.

---

## Section 6 — Business Workflow Review

Criterion: if a workflow can leave the database in an invalid state when interrupted halfway, it is
a transaction, not a sequence of calls.

| # | Workflow | Today | Verdict | Reasoning |
|---|---|---|---|---|
| 1 | **Candidate applies** | Insert `applications`; 7 triggers fire (history, counters, resume count) | **→ RPC** | Currently correct *only* because triggers do the work. But snapshot + notification are outside the transaction. A failure leaves a counted application with no notification. Make the boundary explicit. |
| 2 | **Recruiter creates job** | `create_job()` RPC | **Keep — the model** | Atomic, entitlement-checked, direct insert blocked. This is what the others should look like. |
| 3 | **Job publish / close** | Route handler | **→ RPC** | RACE-1: check-then-insert against `plan_limits`. Two concurrent publishes both pass. Needs the limit check and the state change in one transaction. |
| 4 | **Application status change** | Route → EF → RPC (trigger-guarded) | **Keep RPC, drop the EF hop** | Logic is right; the path has one hop too many. |
| 5 | **Company registration → verification** | Insert + 3 RPCs | **Keep RPCs** | Pattern correct; in-body admin guard confirmed in source (SEC-4 downgraded). |
| 6 | **Recruiter onboarding** | Multi-step across EFs | **→ RPC** | Spans `profiles`, `company_members`, `companies`. Partial completion strands users mid-funnel. |
| 7 | **Company member invite → accept** | Invite (route) + accept (RPC) | **Both → RPC** | RACE-4: `guard_last_company_admin` is check-then-act. |
| 8 | **Resume upload → parse** | `upload-resume` EF → `resume-parse` EF (Anthropic) | **Split: upload EF, parse → AI service** | Parsing must not block upload. RACE-2 on the resume cap. |
| 9 | **Consent capture** | Part of signup | **→ RPC with signup** | DPDP legal record. Must not half-write. Presently `auth-signup` writes profile and consent separately. |
| 10 | **Consent withdrawal** | Route handler | **→ RPC** | Latest-row-wins must be atomic. |
| 11 | **DPDP export** | Synchronous route | **→ async EF job** | Unbounded work on a request path. |
| 12 | **DPDP erasure** | Route + plan in `lib/dpdp/erasure.ts` | **→ RPC** | Multi-table, must never orphan recruiter-owned columns. `applications.candidate_id` has **two** CASCADE FKs — partial execution is catastrophic. |
| 13 | **Notification dispatch** | `notification-worker` + leased claim | **Keep** | Correctly built. |
| 14 | **Interview scheduling** | `/api/interview/room` → Daily.co | **Future service** | `interviews` has never held a row. Paused. |
| 15 | **Offer creation** | None | **Not built** | `offers` = 0 rows, cut to v1.1. |
| 16 | **Admin export** | `admin-export` EF + claim | **Keep** | Correct. |
| 17 | **Pipeline stage move** | Via #4 | **Keep** | 7 stages, drag-to-move. |
| 18 | **Save/unsave candidate** | — | **Broken** | SEC-5: no policies, no API, 0 rows. |

**Pattern:** workflows built *recently* (create_job, notification worker, cleanup locks, export
claims) are correct. Workflows built *earlier* (apply, onboarding, consent, invite) are check-then-act
sequences. The team's instincts improved; the older code did not get revisited.

---

## Section 7 — Security Review

### Per-module matrix

| Module | AuthN | AuthZ model | Roles | Escalation risk | Validation | Leakage | Audit |
|---|---|---|---|---|---|---|---|
| **Auth** | n/a (entry) | — | — | **Low** — `profiles_self_insert` forces `candidate`; `guard_profile_privileged_cols` blocks column escalation | Zod on signup only | Verification codes | `auth_events` **0 rows** |
| **Jobs** | cookie | `withApi` + RLS + explicit company scope | recruiter | **Low** | Zod | **SEC-1: drafts leak to anon** | Partial |
| **Applications** | cookie | RLS (13 policies, OR'd) | candidate/recruiter | **HIGH — SEC-3**, legacy UPDATE has no role check | Zod on PATCH | Candidate PII via legacy policy | `application_status_history` ✅ 36 rows |
| **Companies** | cookie | `authz.company_role` | company admin | Low — SEC-4 guarded in-body | Zod partial | 24 cols public-readable | `verification_audit_log` ✅ 7 rows |
| **Candidates** | cookie | RLS + legacy recruiter policy | recruiter | **HIGH — SEC-3** | — | 27 cols, no projection | `resume_access_log` 1 row |
| **Admin** | cookie + MFA | `authz.is_admin()` (3 spellings) | admin/super_admin | Medium — GAP-2 | Partial | — | `audit_log` **15 rows only** |
| **Consent/DPDP** | cookie | own-row RLS | user | Low | Zod | — | `consent_records` ✅ 52 rows |
| **Storage** | cookie via proxy fns | per-object in proxy | varies | **SEC-8 unverified** | MIME/size | Resume URLs | `resume_access_log` |
| **Newsletter** | anon | service-role only | — | Low | Zod | Email enumeration via `resend-confirmation` | None |
| **Proxy** | cookie | **none — no allowlist** | — | **CRITICAL — SEC-1/SEC-2** | none | Arbitrary table reach | None |

### Privilege escalation paths, ranked

1. **SEC-1** — anonymous → service-role for any GET matching a substring. RLS bypassed on ~30
   tables. *Critical.*
2. ~~**SEC-4**~~ — **downgraded.** The in-body `authz.is_admin()` guard is present in source;
   only live-vs-source drift remains to confirm.
3. **SEC-3** — recruiter with a legacy `recruiter_profiles` row → update applications for a whole
   company with no role check.
4. **SEC-2** — anonymous → SSRF from inside the database via `http_get`.
5. **SEC-7** — 9 `SECURITY DEFINER` functions without pinned `search_path`.

**Well defended:** direct role escalation. `profiles_self_insert WITH CHECK (role='candidate')` plus
`guard_profile_privileged_cols` is genuine defence in depth. Credit where due.

### Audit logging gaps

This is worse than it looks. `audit_log` has **15 rows**; `auth_events`, `authorization_events`,
`application_events` have **0**. `log_admin_action()` exists and is correctly locked to
`project_admin` with `search_path=""` — the strictest setting in the system — but is barely called.
`withApi({ auditLog: true })` is opt-in and rarely opted into.

**For a platform processing personal data under DPDP, you cannot currently answer "who accessed
this candidate's data?"** `resume_access_log` has 1 row against 43 resumes and 35 applications.

### DPDP considerations

**Strong:** `consent_records` (52 rows, append-only, latest-row-wins), `data_principal_requests`,
`lib/dpdp/erasure.ts` with an explicit plan that never deletes an identity row — correct, because
`applications.candidate_id` carries two CASCADE FKs.

**Weak:**
- Access logging is effectively absent (above). This is a statutory exposure, not a nice-to-have.
- Erasure is not transactional (§6 #12).
- No documented retention on `application-snapshots` (34 objects) or `resumes` (80 objects).
- Avatars are in a **public** bucket with no cleanup on account deletion — erased users' photos
  remain publicly addressable.
- OAuth signup path and the 18+ age gate: consent capture on the OAuth branch needs re-verification
  against the current code before launch.

---

## Section 8 — Performance Review

**Framing:** nothing is slow now — 24 MB, 6 jobs, 35 applications, 160 profiles. Everything below is
structural, with the scale at which it bites.

### Expensive queries

| Query | Cost | Bites at |
|---|---|---|
| `applications` SELECT | **13 policies**, several with correlated `EXISTS` subqueries joining `jobs` + `recruiter_profiles`. Every policy evaluated per query. | ~10k applications |
| `candidate_profiles` recruiter read | `EXISTS` over `applications JOIN jobs` with a 6-value `status = ANY` | ~5k candidates |
| `notification_*` policies | Inline `EXISTS (SELECT 1 FROM profiles …)` instead of `authz.is_admin()` — re-queries `profiles` per policy per row | Immediately, on any notification list |
| Admin dashboard aggregates | Full-table counts | ~50k rows |

**The `(SELECT auth.uid())` wrapper is used correctly throughout** — it makes the call an InitPlan
evaluated once per query rather than once per row. Someone understood this properly.

### N+1 problems

1. **Client-composed PostgREST** — the client fetches a list then loops for details. Structural, and
   invisible to server-side profiling.
2. **Only 4 React Query keys.** Most components `fetch` in `useEffect` with no dedupe. Three
   components mounting the same data = three requests.
3. **Denormalised counters** exist specifically to avoid N+1 — good — but are maintained by AFTER
   triggers that drift under concurrency (RACE-5).

### Large payloads

- `profiles` and `candidate_profiles`: **27 columns each**, no projection. `select=*` is the default
  the client reaches for.
- `jobs`, `companies`: 24 columns each.
- `notification_jobs`: 22 columns including `payload jsonb`.
- No response compression or field-selection contract at the API layer.

### Pagination

**Not standardized.** `lib/api/pagination.ts` is used by 2 of 42 routes. `/api/jobs` implements its
own flat shape. Everything through the tunnel has **no enforced limit at all** — the client can
request the entire table. Offset pagination (`page`/`limit` → `.range()`) degrades on deep pages;
keyset pagination is the right V1 choice for `applications` and `jobs`.

### Missing indexes

Six unindexed FKs. All are on small tables today, so nothing is slow — but note that an unindexed FK
also makes `ON DELETE`/`SET NULL` cascades from `profiles` do a sequential scan **per deleted row**,
and `profiles` is the target of 43 FKs.

| Table | Column | Will matter |
|---|---|---|
| `data_principal_requests` | `handled_by` | **Yes** — DPDP queue filters by handler |
| `verification_audit_log` | `request_id` | **Yes** — audit lookups by request |
| `companies` | `verified_by` | Low |
| `company_members` | `invited_by` | Low |
| `company_verification_requests` | `submitted_by`, `reviewer_id` | Low |

### Slow workflows

1. **Synchronous AI** — `ai-match`, `resume-parse` call Anthropic on the request path.
2. **DPDP export** — unbounded, synchronous.
3. **Admin export** — correctly async already.
4. **Edge function hop** — cold start + extra network leg on every read in §3.3.

### Unnecessary Edge Functions

30 (§3.3). Each is a cold start and a hop. The 5 candidate-facing ones are the highest-value to
collapse — they are on the app's hottest path and back all four React Query keys.

### Caching opportunities

| Target | Method | Value |
|---|---|---|
| `subscription_plans`, `plan_limits` | Long-lived HTTP cache / ISR | Static, read constantly |
| Published `blog`, public job board | ISR / edge cache | Public, high traffic, SEO |
| `notification_templates` | In-process | 5 rows, read per send |
| `authz.company_id_of()` | `STABLE` + per-statement memo | Called in nearly every RLS policy |
| React Query | Adopt beyond 4 keys | Removes the client N+1 |
| `ai_suggestion_cache` | Table exists, unwired | Already designed for this |

**Wrong caching today:** `admin-dashboard-summary` is deliberately *not* user-scoped, with a comment
noting a user-agnostic key would survive into the next login. It is invalidated explicitly instead.
That works but is fragile — a missed invalidation shows one admin another's data.

---

## Section 9 — Microservice Readiness

Identification only, per instruction. Criterion: independent scaling profile, independent failure
domain, or independent deployment cadence.

### Tier 1 — extract first (AI, already external-dependent)

| Service | Currently | Why it must be independent |
|---|---|---|
| **Resume Parsing** | `resume-parse` EF, Anthropic `claude-3.5-haiku` | Long-running, retry-prone, spiky. Failure must not fail an upload. Owns the document pipeline. |
| **Candidate Matching / AI Ranking** | `ai-match` EF, Anthropic `claude-sonnet-4` | Unbounded cost and latency per call. Needs its own budget ceiling, queue and scaling curve. |
| **Job Description Generation** | Not built | Pure LLM workload, no shared state. |
| **Interview Question Generation** | `interview-generator` EF — generation step never implemented | Should be born in the service, not finished in Deno. |

### Tier 2 — extract when the feature arrives

| Service | Currently | Why |
|---|---|---|
| **Embeddings** | `pgvector` installed, **no vector column exists** | Generation is a batch GPU-shaped workload; storage stays in Postgres. Split generation from storage. |
| **Semantic Search** | Not built | Depends on embeddings. Different scaling profile from OLTP. |

### Tier 3 — extract for reliability, not AI

| Service | Currently | Why |
|---|---|---|
| **Email** | Resend calls scattered — `auth-signup` EF, `/api/email/send`, SMTP config | Needs retry, bounce handling, suppression lists, template versioning. Currently no unified send path, and `/api/email/send` is an open relay if ever exposed. |
| **Notifications** | `notification-worker` + `notification_jobs`/`_events`/`_receipts`/`_templates` | **Already 90% a service** — leased queue, templates, receipts, throttle. The best-built subsystem here. Extract when a second channel (SMS/push) lands. |
| **Document Storage / Virus Scanning** | `upload-*`, `*-proxy` EFs, `storage_quarantine` (0 rows) | Quarantine is designed but unexercised. Scanning is CPU-bound and vendor-dependent. |
| **Export / Reporting** | `admin-export` EF + `export_jobs` claim | Already async with correct claim semantics. Extract when exports get large. |
| **Audit / Event Log** | `audit_log`, `auth_events`, `authorization_events` (mostly empty) | Append-only, write-heavy, different retention. Should not contend with OLTP. |

### Not microservice candidates

Auth (must stay with cookie issuance), job/application CRUD (core OLTP), RLS, company verification
(human workflow, low volume), `recommendations` (rule-based, not AI — reclassify only if it becomes
embedding-based).

### The prerequisite nobody can skip

**None of the three Tier-1 workloads is asynchronous today.** There is no job-submission,
job-status, or callback contract anywhere in the system. Extracting a synchronous call into a
network service makes latency *worse*. Build the async job contract before the first extraction —
it is the gating dependency for all of Tier 1.

---

## Section 10 — Public API Readiness

**Overall verdict: nothing is publishable today**, because the tunnel means most data access does
not go through a controlled endpoint. The classification below is a *target state*.

| Classification | Meaning |
|---|---|
| **Public** | Unauthenticated or any authenticated user; stable contract; documented |
| **Partner** | API-key/OAuth clients (job boards, ATS integrations); versioned; rate-limited |
| **Internal** | First-party frontend only; may change without notice |
| **Admin** | Platform staff only |
| **System** | Service-to-service; never browser-reachable |
| **Future** | Not ready to expose |

### Public API (with an explicit contract)

| Endpoint | Why |
|---|---|
| `GET /jobs/public`, `GET /jobs/{id}` *(does not exist yet)* | The job board is inherently public. **Building this is what lets SEC-1 be deleted.** |
| `GET /companies/{id}` (projection) | Employer profiles are public — but a **narrow projection**, not the 24-column row. |
| `GET /blog`, `GET /blog/{slug}` | Public content. |
| `GET /subscription-plans` | Public pricing. |
| `POST /newsletter/subscribers` | Public with rate limiting. |

### Partner API (future — none ready)

Job distribution (`GET /jobs` + webhooks), application submission (`POST /applications`), status
callbacks. All require API-key auth, quotas, versioning and a stable contract — **none of which
exist**. Do not promise partner integrations against the current surface.

### Internal API (first-party frontend)

All candidate endpoints (`/api/applications`, `/api/consent`, `/api/dpdp/*`, saved jobs,
preferences), all recruiter endpoints (`/api/jobs` CRUD, publish/close, application status,
`/api/company/*`), all auth endpoints, and every function in §3.3.

**These should be explicitly marked internal and excluded from any published spec.** Most are
cookie-authenticated and assume a browser — they are not designed to be third-party contracts.

### Admin only

`/api/admin/*` (all 6), all 17 `admin-*` edge functions. Additionally: admin endpoints should sit on
a **separate spec** and ideally a separate host, so admin surface area never leaks into public docs.

### System only

| Endpoint | Why |
|---|---|
| `POST /api/email/send` | **Open relay if exposed.** Must be service-to-service only. |
| `notification-worker`, `cleanup-*` | Cron. |
| `resume-proxy`, `recruiter-document-proxy` | Service-role privilege. |
| `update_application_status`, `exec_sql`, `query_json`, `claim_*`, `log_admin_action` RPCs | Correctly `project_admin`-only already. |
| `ALL /api/v1/remote/[...path]` | Should not exist by V1. |

### Future API

`/api/interview/room` (paused), offers, nvites, saved candidates (SEC-5), job alerts, messages, all
AI endpoints. **These must not appear in a V1 spec** — publishing an endpoint backed by a table that
has never held a row is a promise you will have to break.

---

## Section 11 — Architecture Recommendations

### CRITICAL

---

**REC-1 — Close the catch-all proxy**

- **Problem:** `app/api/v1/remote/[...path]/route.ts` forwards any path to InsForge with no
  allowlist, and substitutes the service-role key for anonymous GETs matching a substring (SEC-1).
  The browser speaks PostgREST directly for most reads.
- **Impact:** Anonymous RLS bypass on ~30 tables via `admin_bypass`. No stable API contract. No
  versioning possible. Physical schema is the public interface. **Blocks V1 entirely.**
- **Recommendation:** (1) Replace the substring test with exact-match paths and delete the
  service-key substitution — express the intent as an RLS policy instead. (2) Add a path allowlist.
  (3) Build `GET /api/jobs/public`. (4) Migrate reads to route handlers module by module.
  (5) Deprecate the tunnel behind a feature flag, then delete it.
- **Reasoning:** Every other recommendation is cheaper after this one. It converts "we have a
  database on the internet" into "we have an API."
- **Priority:** Critical.

---

**REC-2 — Confirm the live body of the verification RPCs matches source**

- **Problem:** `approve_company_verification`, `reject_company_verification` and
  `request_more_info_for_verification` are `SECURITY DEFINER` granted to `authenticated` (SEC-4).
  **Reading migrations 049/051 shows all three are correctly guarded** by
  `IF NOT authz.is_admin() THEN RAISE EXCEPTION 'admin only'` as their first statement.
- **Impact:** Low as written. The residual risk is only that this project has known live-vs-migration
  drift — the grant was confirmed live, the body was not.
- **Recommendation:** One query: `SELECT prosrc FROM pg_proc WHERE proname LIKE '%_company_verification'`.
  If the guard is present, close this. Optionally harden by moving the grant to `project_admin` so
  correctness no longer depends on the body.
- **Reasoning:** Downgraded from Critical after reading the source. Recorded because "grant is broad"
  looks alarming in isolation and will be re-raised by the next reviewer otherwise.
- **Priority:** Low (was Critical).

---

**REC-3 — Revoke PUBLIC EXECUTE on the `http` extension**

- **Problem:** `anon` has EXECUTE on `http_get`/`http_post`/etc., plus USAGE on `public` (SEC-2).
- **Impact:** Unauthenticated SSRF from inside the database, reachable through the tunnel. Cloud
  metadata endpoints are the standard target.
- **Recommendation:** `REVOKE ALL ON FUNCTION http_*(...) FROM PUBLIC`, or relocate the extension to
  an unexposed schema. If nothing uses it, drop it.
- **Reasoning:** One-line fix, high severity, no functional trade-off.
- **Priority:** Critical.

---

### HIGH

---

**REC-4 — Retire the legacy recruiter RLS generation**

- **Problem:** Two policy generations co-exist on `applications`, `candidate_profiles`,
  `candidate_resumes`, `profiles`. SELECT policies OR together, so legacy *widens* access. The
  legacy UPDATE policy on `applications` has **no company-role check** (SEC-3).
- **Impact:** Any `recruiter_profiles` row with a matching `company_id` can update a whole company's
  applications. `recruiter_profiles` is partially populated (5 rows vs 27 `recruiter_users`).
- **Recommendation:** Confirm `recruiter_profiles` is unused, then drop the legacy policies. Migrate
  any remaining rows to `company_members` first.
- **Reasoning:** Half-finished migrations are worse than either endpoint — you carry both attack
  surfaces and neither's guarantees.
- **Priority:** High.

---

**REC-5 — Standardize the response, error and pagination contract**

- **Problem:** 13 success envelope keys, two pagination shapes (the better one used by 2 of 42
  routes), two error shapes plus `error.message` leakage, 3× more 500s than 400s.
- **Impact:** Cannot generate a coherent OpenAPI spec. Every client hand-codes per-endpoint parsing.
- **Recommendation:** Adopt one envelope, one error shape (`{ error: 'machine_code', message }` —
  already used by the company-members endpoints), one pagination shape (`lib/api/pagination.ts`,
  already written). Never return `error.message` to a client. Classify 4xx vs 5xx properly.
- **Reasoning:** **This is the actual gate on OpenAPI.** Generating a spec over 13 envelope shapes
  documents the inconsistency rather than fixing it.
- **Priority:** High.

---

**REC-6 — Make `withApi()` mandatory**

- **Problem:** 32 of 57 operations bypass it — no Zod schema, no declared roles. Only 22 declare
  `allowedRoles`, 5 declare `requiredPermission`.
- **Impact:** Validation and authorization are opt-in on half the surface.
- **Recommendation:** Migrate remaining handlers; add a lint rule or CI check that a `route.ts`
  export must be wrapped.
- **Reasoning:** The abstraction is good. Adoption is the gap. A CI check makes it permanent.
- **Priority:** High.

---

**REC-7 — Replace in-memory rate limiting**

- **Problem:** `Map` in module scope with a `setInterval` sweep, per-lambda, resets on cold start.
- **Impact:** **Effectively no rate limiting in production today.** Auth endpoints are exposed to
  credential stuffing.
- **Recommendation:** Move to a shared store. `user_rate_limits` and `auth_attempts` tables already
  exist and are empty.
- **Reasoning:** The schema was built for this; only the implementation went in-memory.
- **Priority:** High.

---

**REC-8 — Close the audit gap**

- **Problem:** `audit_log` 15 rows; `auth_events`, `authorization_events` 0; `resume_access_log` 1
  row against 43 resumes.
- **Impact:** **Cannot answer "who accessed this candidate's data?"** — a statutory DPDP exposure.
- **Recommendation:** Make `auditLog: true` the default in `withApi()` for mutations; log every
  resume access in the proxy functions; log auth events.
- **Reasoning:** `log_admin_action()` is already correctly built and locked down. It is simply not
  being called.
- **Priority:** High.

---

### MEDIUM

**REC-9 — Collapse 30 pass-through edge functions** into route handlers (§3.3). Removes cold starts
from read paths and eliminates the duplicate-implementation problem (§5.3). *Medium.*

**REC-10 — Pin `search_path` on 9 `SECURITY DEFINER` functions** (SEC-7). Mechanical; matches the
house style already used elsewhere. *Medium.*

**REC-11 — Fix check-then-act races** RACE-1/2/4 by moving limit checks into the same transaction as
the write, or adding constraints. `claim_notification_job` is the in-repo pattern to copy. *Medium.*

**REC-12 — Resolve `saved_candidates`** (SEC-5): RLS-forced, zero policies, zero rows, but listed as
a working V1 capability. Either add policies and an API, or remove it from the feature list.
*Medium.*

**REC-13 — Add column projections** for `profiles`/`candidate_profiles` (27 columns each). Return
explicit DTOs. *Medium.*

**REC-14 — Add the six missing FK indexes**, prioritising `data_principal_requests.handled_by` and
`verification_audit_log.request_id`. *Medium.*

**REC-15 — Unify the three admin predicates** (`public.is_admin()`, `authz.is_admin()`, inline
`EXISTS`) into one (GAP-2). *Medium.*

**REC-16 — Decide the DPDP retention policy** for `resumes` (80), `application-snapshots` (34), and
public `avatars` (25, not cleaned on deletion). *Medium.*

### LOW

**REC-17 — Remove production test artifacts**: `debug_output`, `test_rpc_sync`, `test-auth-pattern`,
orphaned `activate-recruiter` (HYG-1). *Low, but trivially cheap.*

**REC-18 — Deduplicate triggers and policies**: 3× `updated_at` triggers on four hot tables; 13
policies on `applications` where ~6 suffice (HYG-2, HYG-3). *Low.*

**REC-19 — Fix SEC-6**: anonymous readers see scheduled/expired announcements. *Low.*

**REC-20 — Normalize verb routes** per §5.2 (`/recruiter/status`, `/recruiter/request-access`,
`.../decide`). *Low — do it during the V1 freeze, not before.*

**REC-21 — Add `GET /api/health`.** None exists. *Low, but required before any real SLA.*

**REC-22 — Adopt React Query beyond 4 keys** to remove the client-side N+1. *Low.*

### Sequencing

```
Phase 0 (days)    REC-2  confirm live RPC body vs source   ← now a 1-query check, downgraded
                  REC-3  revoke http PUBLIC
                  REC-17 remove test artifacts
Phase 1 (weeks)   REC-1  close the proxy  ────┐
                  REC-5  standardize contract ├── these two are the V1 gate
                  REC-4  retire legacy RLS    │
                  REC-7  real rate limiting   │
Phase 2           REC-6  mandatory withApi ───┘
                  REC-8  audit coverage
                  REC-9  collapse edge functions
Phase 3           REC-10..16 hardening
                  Async job contract  ← gating dependency for ALL AI extraction
Phase 4           OpenAPI V1 freeze
                  AI microservice extraction
```

---

## Section 12 — Version 1 API Freeze Checklist

**Do not generate OpenAPI until the Critical and High items are Complete.** A spec generated today
documents 13 envelope shapes and a database tunnel — it would harden the current inconsistency into
a published contract.

### Contract

| # | Item | Status | Notes |
|---|---|---|---|
| 1 | Endpoint naming finalized | **Needs Review** | Naming is good — no verb-based routes. But §5.2 verbs and §5.3 duplicates must be resolved. |
| 2 | Duplicate endpoints eliminated | **Missing** | `/api/jobs` vs `jobs` EF; `/api/applications` vs `candidate-applications`; `admin-audit` vs `admin-audit-logs`. |
| 3 | Response format standardized | **Missing** | 13 distinct envelope keys. |
| 4 | Error responses standardized | **Missing** | Two conventions + `error.message` leakage + config disclosure. |
| 5 | Pagination standardized | **Missing** | Helper used by 2 of 42 routes; tunnel has no limit at all. |
| 6 | HTTP status codes correct | **Needs Review** | 3× more 500s than 400s; 2 uses of 201; no 204. |
| 7 | Versioning strategy decided | **Missing** | `/api/v1/remote` is the *only* use of "v1" and it is the tunnel. No strategy exists. |
| 8 | Field projections defined | **Missing** | 27-column tables returned wholesale. |
| 9 | Idempotency contract | **Needs Review** | `idempotency_keys` table exists, 0 rows, no header contract. |

### Security

| # | Item | Status | Notes |
|---|---|---|---|
| 10 | Authentication finalized | **Complete** | Cookie, OAuth, MFA, 12-char policy. The strongest area. |
| 11 | Authorization finalized | **Needs Review** | 22/57 declare roles; 5 declare permissions; 3 admin predicates. |
| 12 | RLS verified | **Needs Review** | Enabled on all 65 tables ✅, but SEC-3 legacy policies and SEC-5 `saved_candidates` are open. |
| 13 | Verification RPC grants verified | **Needs Review** | Guard confirmed in source; confirm live body matches (drift). No longer blocking. |
| 14 | Service-key substitution removed | **Missing** | **SEC-1. Blocking.** |
| 15 | `http` extension revoked from PUBLIC | **Missing** | **SEC-2. Blocking.** |
| 16 | `SECURITY DEFINER` `search_path` pinned | **Missing** | 9 functions (SEC-7). |
| 17 | Rate limiting production-grade | **Missing** | In-memory per-lambda. |
| 18 | Public/internal API separation | **Missing** | The tunnel makes the boundary meaningless. |
| 19 | Storage per-object authz verified | **Missing** | SEC-8 unverified. |
| 20 | Input validation complete | **Needs Review** | 32/57 operations have no schema. |

### Data & compliance

| # | Item | Status | Notes |
|---|---|---|---|
| 21 | Audit logging complete | **Missing** | 15 rows in `audit_log`; 0 in auth/authz events. |
| 22 | DPDP access logging | **Missing** | `resume_access_log` has 1 row against 43 resumes. |
| 23 | DPDP erasure transactional | **Needs Review** | Plan is correct; execution is not atomic. |
| 24 | Retention policy defined | **Missing** | No lifecycle on resumes, snapshots, avatars. |
| 25 | Consent capture on all signup paths | **Needs Review** | Email path ✅ (52 rows). OAuth path + 18+ gate need re-verification. |
| 26 | Dead schema excluded from spec | **Missing** | 18 of 65 tables have 0 rows. |

### Operational

| # | Item | Status | Notes |
|---|---|---|---|
| 27 | Health/readiness endpoint | **Missing** | None exists. |
| 28 | E2E tests passing | **Missing** | Never executed in CI. |
| 29 | Unit tests | **Complete** | 14 files, 72 tests, green. |
| 30 | Coverage thresholds meaningful | **Needs Review** | Ratchet at ~30% lines — a floor, not a target. |
| 31 | Async job contract for AI | **Missing** | Gating dependency for all microservice extraction. |
| 32 | Edge function source drift resolved | **Needs Review** | Deployed functions diverge from local `.ts`. |
| 33 | Monitoring / alerting | **Missing** | `lib/observability.ts` at 0% coverage. |

### Summary

| Status | Count |
|---|--:|
| ✅ Complete | **2** |
| ⚠️ Needs Review | **10** |
| ❌ Missing | **21** |

**2 of 33 complete.** The two that are complete — authentication and unit tests — are genuinely
solid, which supports the §1 conclusion: the foundation is better than the surface.

**Five items are hard blockers for V1:** #13 (verification grants), #14 (service-key substitution),
#15 (`http` PUBLIC), #3/#4 (response and error contract). Items #13 and #15 are each roughly an
hour's work. #14 and the contract items are the real project.

---

## Closing assessment

This is a **well-built database with an underbuilt API in front of it.** The data model, the RLS
kernel, the auth design and the newest workflows (`create_job`, the notification queue, the leased
claims) are the work of someone who knows what they are doing. The gap is that a large amount of
functionality was shipped by exposing PostgREST to the browser, and that decision — reasonable for
getting a product working — is incompatible with publishing a stable API.

The fix is not a rewrite. `withApi()` is already the right abstraction; `create_job` is already the
right pattern; `lib/api/pagination.ts` is already the right contract. **All three exist and are
under-adopted.** V1 readiness is mostly a matter of finishing decisions that have already been made
correctly once.

**Recommended immediate action:** REC-3 — revoke PUBLIC EXECUTE on the `http_*` family. One
statement, no functional trade-off, closes an unauthenticated SSRF path. Then REC-1, which is the
only item that actually gates a V1 API.

*(REC-2 was the recommended first action in the initial draft. Reading migrations 049 and 051
showed all three verification RPCs already carry an `authz.is_admin()` guard, so it was downgraded
to a one-query drift check before this document was finalised.)*
