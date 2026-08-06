# 22 — Gate E Closure + Async-Params Production Fix

**Written:** 2026-07-27 · **Role:** Advisor (verification + fixes)
**Continues:** `21_Advisor_Session_Handoff_2.md`. Everything below was executed against the
**live production system** this session unless marked otherwise.

---

## 0. Status in one paragraph

The recruiter flow has now completed **end to end for the first time**:
`approve_company_verification()` executed atomically on its first-ever run, and every Gate E item
— including cross-company row scoping, never before proven — passed on production under a real
recruiter identity. Getting there surfaced and fixed a **production P0**: `withApi` never awaited
Next 15+'s async route `params`, so all 9 dynamic-segment API routes returned fabricated 404s in
production. Fixed in **`f9f6a86`** on `main`, deployed (deployment required a manual authorization
in Vercel, which the user granted). One new P2 contract-drift finding (§4). Test-data cleanup from
doc 21 §5 is now due (§5).

---

## 1. Approval — `approve_company_verification()` first execution: **atomic, PASS**

Admin (`anujpatel30106@gmail.com`) clicked Approve in the Verification Queue. Verification query
from doc 21 §1 returned, in a single read:

| Field | Required | Actual |
|---|---|---|
| `company` | `verified` | `verified` ✅ |
| `request` | `approved` | `approved` ✅ |
| `member` | `active` | `active` ✅ |
| `audit_approved` | `1` | `1` ✅ |
| `reviewer` | staff email | `anujpatel30106@gmail.com` ✅ |

All four state transitions moved together — the RPC is atomic in practice, not just by design.

---

## 2. P0 found and fixed: `withApi` vs Next 15+ async `params`

### Symptom
Recruiter `PATCH /api/jobs/5128aa8a…` (their **own, RLS-visible** job) → `404 {"error":"Job not
found"}` on production, while the identical select via the data API with the same token returned
the row.

### Root cause — `lib/api/handler.ts`, `withApi()`
Next 15+ delivers route-handler `params` as a **Promise**; Next 16 (deployed: `next ^16.2.4`)
removed the sync-access shim entirely. `withApi` passed the Promise through unawaited
(`params: params || {}`), so `params.jobId` read a property off a Promise → `undefined` →
`.eq('id', undefined)` → 0 rows → the route's own "not found"/no-op path.

### Blast radius (every `withApi` route under a dynamic segment — all broken in production until today)
- `PATCH /api/jobs/[jobId]`, `POST /api/jobs/[jobId]/publish`, `POST /api/jobs/[jobId]/close`
- `GET|PATCH /api/company/[companyId]`, all `/api/company/[companyId]/members/*` routes
  (including **invite/accept** — the R-6/R-7 flow)
- `PATCH /api/applications/[id]/status`

### Proof chain (each step verified)
1. Prod PATCH own job → 404; direct data-API select, same token, same id → 200 with row.
2. Local SDK reproduction with the production token → `maybeSingle` returns the row (RLS fine).
3. Local `next dev` (same Next version, production backend) → **same 404** with valid id.
4. One-line fix (`params: (await params) || {}`) → local PATCH → **200**, title updated,
   `approval_status` unchanged.
5. Deployed `f9f6a86` → production PATCH → **200**.

### Fix
`lib/api/handler.ts` — `params: (await params) || {}` (awaiting a plain object is a no-op, so the
fix is version-agnostic). Commit `f9f6a86`, single file, pushed to `main` from a clean worktree
off `8233a55` (the local working tree carries ~72 unrelated dirty files — doc 21 §5 rule upheld).

### Deploy gotcha worth remembering
The push did **not** auto-deploy: Vercel held the deployment for manual **authorization** (commit
author unknown to the Vercel project). The user approved it in the Vercel dashboard; only then did
production flip. A push to `main` is therefore *not yet* a deploy on this project — verify
behaviorally.

---

## 3. Gate E — **all items PASS on production** (recruiter `nikavx28@gmail.com`, company `f91e3561` "Advisor E2E Test Co")

| Item | Result | Evidence |
|---|---|---|
| **E8** create | ✅ | `POST /api/jobs` → 201; `company_id`/`recruiter_id` derived server-side; `approval_status=pending`, `is_approved=false`, `status=draft`; public board unchanged (`['11111111','33333333']`) |
| **E1** edit pending | ✅ | PATCH → 200, title changed, still `pending/false` (DB re-read) |
| **E3a** publish | ✅ | → 200 `draft→active`, still `pending/false`; **board still unchanged** — an `active` but unapproved job never leaks |
| *(setup)* | — | `approval_status='approved'` set via SQL (test setup only, not the property under test); trigger derived `is_approved=true`; board immediately showed `5128aa8a` — board gating proven end-to-end for a freshly verified company |
| **E2** edit approved | ✅ | PATCH (title + salary) → 200, **`approval_status=approved` unchanged** — the product decision holds under a real recruiter token |
| **E3b** close | ✅ | → 200 `active→closed`; board dropped the job |
| **Row scoping** ⭐ | ✅ **first proof ever** | See below |

### Row scoping (cross-company isolation) — the previously unproven property
Recruiter of `f91e3561` against Talentmesh Solutions' (`8773045c`) jobs:

| Probe | Layer | Result |
|---|---|---|
| SELECT other company's **non-public** job `22222222` | data API (RLS) | `[]` — invisible ✅ |
| UPDATE other company's **public** job `11111111` | data API (RLS) | 200 with **0 rows affected**; DB `title`/`updated_at` unchanged ✅ |
| UPDATE other company's draft `22222222` | data API (RLS) | 0 rows ✅ |
| PATCH `11111111` | API route | **403 Forbidden** (visible via `jobs_select_approved`, write blocked by `jobs_update_company`) ✅ |
| PATCH `22222222` | API route | **404** (not even visible) ✅ |
| publish `11111111` | API route | **403** ✅ |

`updated_at` of both target rows re-read after all probes: still `2026-07-25T15:21:55` /
`2026-07-25T15:28:46` — untouched. **Not tested:** cross-company DELETE (deliberately skipped —
a policy failure would have destroyed a seed row; `jobs_delete_company` requires company-admin of
the target company, same `authz` path as the proven update policy).

---

## 4. New finding (P2): `GET /api/jobs?scope=company` is not company-scoped

**Evidence:** recruiter's list request returned `total=3` — their own job **plus**
`11111111` (Talentmesh Solutions) and `33333333` (google).
**File/function:** `app/api/jobs/route.ts` GET; comment claims "RLS jobs_select_company scopes to
the caller's own company."
**Why:** RLS SELECT policies are OR'ed — the query rides `jobs_select_company` **∪**
`jobs_select_approved`, so every publicly-approved job of every company appears in the
"my company's jobs" list.
**Risk:** P2, functional not security (the extra rows are public data), but the recruiter
dashboard will show other companies' jobs as if they were the tenant's own, with counts wrong.
**Fix:** add an explicit filter in the route: `.eq('company_id', <caller's company>)` (resolve via
`authz.company_id_of()` semantics — e.g. select the caller's `company_members` row first), or add
`?scope=company` semantics server-side. Do not rely on the policy union.

---

## 5. Cleanup — now due (Gate E is finished)

Per doc 21 §5, **pending user confirmation** before deleting production rows:

- Job `5128aa8a-3ab3-4cd5-8d47-7c1d132e7b0c` (Gate E probe, now `closed/approved`)
- Company `f91e3561-b143-43b8-bb09-6150ad01d133` + its `company_members` +
  `company_verification_requests` rows (note: `verification_audit_log` now holds the historic
  first `approved` row — decide whether to keep it)
- Revert `nikavx28@gmail.com` (`466abcc4…`) to `role='candidate'`, `phone=NULL`
- Probe accounts (InsForge dashboard, no delete endpoint): see doc 21 §5 list

## 6. Backlog delta vs doc 21 §4

- Items 1 & 2 (**Approve + Gate E**): **DONE**.
- **NEW P2:** §4 above (company list not company-scoped).
- Everything else (R3-5 backfill, R3-6, R3-4 legacy callers, F dead UI, E dead code, S-3, job
  state machine, doc-17 §4 leftovers) unchanged.
- Doc 21 §8's production-readiness answer upgrades to: **admin side production-ready; recruiter
  side now proven end-to-end** — remaining pre-launch work is backlog items 3–6, not proof.
