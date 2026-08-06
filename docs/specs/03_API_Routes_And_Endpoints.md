# 03 — API Routes & Endpoints

**Status:** Draft for review
**Owner:** Platform / Backend
**Version:** 1.1 — wired the verification decide route to all three RPCs (approve/reject/needs_more_info, 02 migrations 049+051); added the member accept-invite endpoint + `updateMemberSchema`; noted member invite/update go through RLS + the last-admin trigger.
**Last Updated:** 2026-07-16

Cross-refs: `02_Schema_And_Database_Design.md` (tables/RPCs), `04_State_Machines_And_Business_Logic.md` (transitions each endpoint triggers), `06`/`07` (callers).

---

# Purpose

Specify every server endpoint the Recruiter Portal and Company Management modules need, with exact `withApi` config, Zod schemas, request/response types, error codes, and audit events — precise enough to implement without follow-up questions.

---

# Conventions (verified from code)

- **Wrapper:** `withApi(options, handler)` from `lib/api/handler.ts`. Real signature:
  ```ts
  withApi({
    schema?: { body?: ZodType; query?: ZodType };
    allowedRoles?: string[];   // checked against getServerUser().role
    requireAuth?: boolean;     // default true
    auditLog?: boolean;        // default false; logs POST/PUT/PATCH/DELETE via logAudit()
  }, handler)
  ```
  It runs `getServerUser()` (the authoritative boundary from `01`), enforces `allowedRoles`, validates body/query, and calls `logAudit(user.id, method, path, {...})` when `auditLog:true`.
- **`allowedRoles` is coarse** (platform role only: candidate/recruiter/admin/super_admin). **Company-level role** (admin/recruiter/coordinator) and **company scoping** are enforced *inside* the handler via the `authz.*` helpers / RLS from `02` — never trust `company_id` from the client (audit finding C-4).
- **Validation:** extend `lib/validation/recruiter.ts` (Zod + `validateX` returning `{success,data,errors}`). New schemas below live in `lib/validation/company.ts`.
- **Client calls:** internal routes via `apiFetch` (`lib/api/client.ts`); direct DB reads via the `insforge` proxy client. Lifecycle mutations call the **RPCs** from `02` (`insforge.database.rpc('create_job', {...})`), not direct table writes.
- **India context:** phone `+91` E.164, GSTIN/CIN/PAN validated by regex (below); amounts INR paise-safe integers.

## Shared validation (India KYC regexes)

```ts
// lib/validation/company.ts
import { z } from 'zod';

const GSTIN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const CIN   = /^[LUu][0-9]{5}[A-Za-z]{2}[0-9]{4}[A-Za-z]{3}[0-9]{6}$/;
const PAN   = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const PHONE_IN = /^\+91[6-9]\d{9}$/;   // international-ready: relax when country_code != 'IN'

export const createCompanySchema = z.object({
  name: z.string().min(2).max(120),
  industry: z.string().min(1),
  website: z.string().url().or(z.literal('')).optional(),
  gstin: z.string().regex(GSTIN, 'Invalid GSTIN').optional(),
  cin: z.string().regex(CIN, 'Invalid CIN').optional(),
  country_code: z.string().length(2).default('IN'),
  about: z.string().max(2000).optional(),
});

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  member_role: z.enum(['admin','recruiter','coordinator']),
});

export const updateMemberSchema = z.object({
  member_role: z.enum(['admin','recruiter','coordinator']).optional(),
  status: z.enum(['active','suspended','removed']).optional(),   // 'invited' is not settable here
}).refine(v => v.member_role || v.status, { message: 'nothing to update' });

export const verificationSubmitSchema = z.object({
  company_id: z.string().uuid(),           // validated against caller's membership in handler
  kyc_documents: z.array(z.object({ label: z.string(), ref: z.string() })).optional(),
  channel: z.enum(['gmail_kyc']).default('gmail_kyc'),
});

export const verificationDecisionSchema = z.object({
  request_id: z.string().uuid(),
  decision: z.enum(['approved','rejected','needs_more_info']),
  notes: z.string().max(2000).optional(),
});

export const jobCreateSchema = z.object({
  title: z.string().min(3).max(150),
  description: z.string().min(30),
  type: z.enum(['full-time','part-time','contract','remote','hybrid']),
  location: z.string().optional(),
  department: z.string().optional(),
  requirements: z.array(z.string()).max(30).optional(),
  skills_required: z.array(z.string()).max(30).optional(),
  salary_min: z.number().int().min(0).optional(),
  salary_max: z.number().int().min(0).optional(),
  currency: z.string().default('INR'),
  experience_min: z.number().int().min(0).optional(),
  experience_max: z.number().int().min(0).optional(),
  status: z.enum(['draft','active']).default('draft'),
  // NOTE: NO company_id / recruiter_id here — derived server-side (finding C-4)
});
```

---

# Endpoint catalog

Base path `app/api/`. Each row: method, path, roles, schema, RPC/table, audit, error codes.

## Recruiter access & onboarding

| Method | Path | allowedRoles | Body schema | Action | Audit |
|---|---|---|---|---|---|
| POST | `/api/recruiter/request-access` | `['candidate','recruiter']` | `createCompanySchema` (+ optional `attach_company_id`) | Create/attach company (pending) + `company_members(status='invited')` + verification request; returns instructions to email KYC | `true` (`company_created`/`verification_submitted`) |
| GET | `/api/recruiter/status` | `['recruiter','candidate']` | — | Returns caller's membership + company status (for pending-approval screen) | — |

**`request-access` handler logic (fixes C-4 pattern):**
```ts
export const POST = withApi({ schema: { body: createCompanySchema }, allowedRoles: ['candidate','recruiter'], auditLog: true },
  async (_req, { user, body }) => {
    // 1. dedupe by GSTIN → attach or create
    // 2. insert companies(status='pending', created_by=user.id)
    // 3. insert company_members(company_id, user_id=user.id, member_role='admin', status='invited')
    // 4. insert company_verification_requests(company_id, submitted_by=user.id, channel='gmail_kyc')
    // 5. bump profiles.role→'recruiter' via admin/RPC (NOT client), show KYC email instructions
    return NextResponse.json({ status: 'pending', verificationEmail: 'verification@talentmesh.com' });
  });
```
Errors: `409 company_exists` (GSTIN taken, offer attach), `403` (already a member of another company — Phase 1 single membership), `400` validation.

## Company management (company-admin scoped)

| Method | Path | allowedRoles | Schema | Action | Audit |
|---|---|---|---|---|---|
| GET | `/api/company/[companyId]` | `['recruiter','admin','super_admin']` | — | Company profile; handler asserts `authz.company_id_of(user.id)===companyId` or platform admin | — |
| PATCH | `/api/company/[companyId]` | `['recruiter']` | `createCompanySchema.partial()` | Update branding/profile; requires `authz.is_company_admin` | `true` |
| GET | `/api/company/[companyId]/members` | `['recruiter']` | — | Roster (RLS `company_members_read_own_company`) | — |
| POST | `/api/company/[companyId]/members/invite` | `['recruiter']` | `inviteMemberSchema` | Company-admin inserts an `invited` row via RLS `company_members_admin_write` (02/047) | `true` (`member_invited`) |
| PATCH | `/api/company/[companyId]/members/[userId]` | `['recruiter']` | `updateMemberSchema` | Change role / suspend / remove; direct update via RLS, **`guard_last_company_admin` trigger (02/051) rejects orphaning the last admin** → `422 last_admin` | `true` (`role_changed`/`member_removed`) |
| POST | `/api/company/[companyId]/members/accept` | `['recruiter','candidate']` | — | Invitee accepts their own invite → `rpc('accept_company_invite',{p_company_id})` (02/051); flips `invited→active` on a verified company | `true` (`member_activated`) |

Member **invite/update** are direct table writes under the `company_members_admin_write` RLS policy — no RPC needed; the last-admin invariant is enforced by the `guard_last_company_admin` trigger (02 migration 051), so the handler just surfaces the `check_violation`/`last_admin` error as `422`. Member **accept** needs the `accept_company_invite` RPC because the invitee is not a company admin. All company endpoints re-derive scope server-side; `companyId` in the URL is validated against the caller's active membership, never trusted for authorization.

## Verification (recruiter submit + platform-admin decide)

| Method | Path | allowedRoles | Schema | RPC | Audit |
|---|---|---|---|---|---|
| POST | `/api/company/verification/submit` | `['recruiter']` | `verificationSubmitSchema` | insert `company_verification_requests` (RLS `cvr_insert_own`) | `true` |
| GET | `/api/admin/verification/queue` | `['admin','super_admin']` | query `{status?, page?}` | select requests | — |
| POST | `/api/admin/verification/decide` | `['admin','super_admin']` | `verificationDecisionSchema` | branch on `decision` → `rpc('approve_company_verification')` / `rpc('reject_company_verification')` / `rpc('request_more_info_for_verification')` (all 02/049+051) | `true` (`approved`/`rejected`/`needs_more_info`) |

`decide` dispatches to one of the three `SECURITY DEFINER` RPCs by `body.decision`:
```ts
const { request_id, decision, notes } = body;
const fn = { approved: 'approve_company_verification',
             rejected: 'reject_company_verification',
             needs_more_info: 'request_more_info_for_verification' }[decision];
const { error } = await insforge.database.rpc(fn, { p_request_id: request_id, p_notes: notes ?? '' });
```
Each RPC re-checks `authz.is_admin()` in the DB (defense in depth vs the route's `allowedRoles`) and does the company/member state flip + audit write atomically. All three accept a request in `submitted` or `under_review`; a stale/decided request → `422`.

## Jobs (company-scoped, entitlement-enforced)

| Method | Path | allowedRoles | Schema | RPC/table | Audit |
|---|---|---|---|---|---|
| GET | `/api/jobs?scope=company` | `['recruiter']` | query filters | select via RLS `jobs_select_company` | — |
| POST | `/api/jobs` | `['recruiter']` | `jobCreateSchema` | `rpc('create_job', { p_payload })` — derives company_id/recruiter_id, checks plan limit | `true` (`job_created`) |
| PATCH | `/api/jobs/[jobId]` | `['recruiter']` | `jobCreateSchema.partial()` | update via RLS `jobs_update_company` | `true` |
| POST | `/api/jobs/[jobId]/publish` | `['recruiter']` | — | set `status='active'` → trigger `enforce_active_job_limit` | `true` (`job_published`) |
| POST | `/api/jobs/[jobId]/close` | `['recruiter']` | — | set `status='closed'` (frees an active slot) | `true` |

**Publish error contract (free-plan rule):** if the active-job limit is hit, the trigger raises `check_violation`; the route returns:
```json
{ "error": "ACTIVE_JOB_LIMIT", "message": "Active job limit reached (1). Close an active job to post another.", "limit": 1 }
```
HTTP `409`. Client shows the "close one to open another" flow (`05`, `06`).

## Applications / pipeline (company-scoped candidate access)

| Method | Path | allowedRoles | Schema | Action | Audit |
|---|---|---|---|---|---|
| GET | `/api/applications?job_id=` | `['recruiter']` | query | RLS `apps_company_view`; candidate PII gated by `028` company-level policy | — (read logged to `resume_access_log` on resume view) |
| PATCH | `/api/applications/[id]/status` | `['recruiter']` | `{ status }` | existing `update_application_status()` RPC (do NOT direct-update — `022/034` lockdown) | `true` |

Reuse the existing application-status RPC and `authorization_events`/`resume_access_log` audit — no new tables needed here.

---

# Error code conventions

| Code | Meaning | Example |
|---|---|---|
| 400 | Validation (`{error, details: fieldErrors}`) | bad GSTIN |
| 401 | No session | expired token |
| 403 | Wrong platform role OR not a company-admin/member | coordinator posting a job |
| 404 | Resource not in caller's company scope | job of another company |
| 409 | Conflict / entitlement | GSTIN exists; active-job limit |
| 422 | Business-rule violation | verification not in `under_review` |

---

# Rate limiting

The `/api/v1/remote` proxy already rate-limits (in-memory, per instance — `app/api/v1/remote/[...path]/route.ts:130-173`). For the sensitive new routes (`request-access`, `verification/submit`, `members/invite`) add explicit per-user limits via the existing `user_rate_limits` table (`029`). **[SUGGESTION]** move the proxy limiter to `user_rate_limits` too so limits hold across serverless instances (also noted in `01`).

---

# Edge cases

- **`company_id` mismatch:** every handler that takes a `companyId`/`company_id` re-derives `authz.company_id_of(user.id)` and 403s on mismatch — the schema deliberately omits `company_id` from `jobCreateSchema`.
- **Coordinator posting:** `create_job` RPC raises; route surfaces `403 coordinators cannot post jobs`.
- **Pending recruiter calling job APIs:** `authz.company_id_of` returns null (membership `invited`, not `active`) → `403 no active company`.
- **Platform admin acting cross-company:** allowed via `allowedRoles:['admin']` + `admin_bypass` RLS; still audit-logged.

# Implementation checklist
- [ ] `lib/validation/company.ts` with schemas above
- [ ] Routes under `app/api/{recruiter,company,jobs,admin/verification}/**/route.ts` using `withApi`
- [ ] All mutations use RPCs from `02`, not direct writes; `company_id` never read from body for authorization
- [ ] `auditLog:true` on every state-changing route

# References
`lib/api/handler.ts`, `lib/api/client.ts`, `lib/validation/recruiter.ts`, `lib/insforge.ts`, `insforge/functions/jobs/index.ts`; `02_Schema_And_Database_Design.md`, `04_State_Machines_And_Business_Logic.md`.
