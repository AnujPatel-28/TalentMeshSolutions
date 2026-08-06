# 12 — Admin Production-Readiness Execution Plan

**Date:** 2026-07-18
**Depends on:** `11_Admin_Portal_Audit_And_Remediation.md` (findings A-1…A-13)
**Purpose:** Sequenced, agent-assignable workstreams to take the admin portal from "P0s partially fixed" to production-ready.
**Status source:** Verified against source on 2026-07-18, *after* the remediation session.

---

## 0. Verified Current State

Do not trust the prior session's summary — this table is source-verified.

| ID | Claim | Actual state | Evidence |
|----|-------|--------------|----------|
| A-1 | Mock-auth bypass closed | ❌ **STILL OPEN** | `lib/server-auth.ts:22-33` — header fallback removed, but the cookie is equally attacker-controlled. See W1. |
| A-2 | Suspended admins blocked | ✅ Fixed | `app/dashboard/admin/layout.tsx:64-65` |
| A-3 | Metadata role fallback removed | ✅ Fixed | `lib/server-auth.ts:68` → `profile?.role \|\| 'candidate'` |
| F-7 | `is_active` on admin edge fns | ✅ Fixed | All 15 authenticated `admin-*` functions carry it (`admin-forgot-password` is unauthenticated by design) |
| A-4 | Impersonation | ❌ Open | `app/api/impersonate/route.ts:32,69` (`userRole` from body); mock UI intact |
| A-5 | Redirect-depth dead code | ❌ Open | 4 readers, still no writer |
| A-6 | `/unauthorized` page | ❌ Open | Route does not exist |
| A-7 | Client-bypass audit gap | ❌ Open | — |
| A-8 | Permission matrix unenforced | ❌ Open | — |
| A-9 | Orphaned `/portals/admin` | ❌ Open | `app/portals/admin` present |
| A-10 | Shadowed email-templates | ❌ Open | Stub still at `/dashboard/admin/email-templates` |
| A-11 | Rejected == closed | ❌ Open | No `approval_status` in migrations or code |

**Residual P0: one (A-1).** Everything else is P1 or lower.

---

## 1. Workstream Overview

| WS | Title | Priority | Blocks | Agent | Model |
|----|-------|----------|--------|-------|-------|
| **W1** | Close the mock-auth bypass | **P0** | Launch | `general-purpose` | **Opus 4.8** |
| **W2** | Live-backend verification | **P0** | W5, W7 | `general-purpose` + human | **Opus 4.8** |
| **W3** | Delete orphaned trees | P1 | W4, W6 | `general-purpose` | **Sonnet 5** |
| **W4** | Impersonation: remove or rebuild | P1 | — | `general-purpose` | **Opus 4.8** |
| **W5** | Job approval state model (F-6/A-11) | P1 | — | `Plan` → `general-purpose` | **Opus 4.8** |
| **W6** | Redirect guard + `/unauthorized` | P1 | — | `general-purpose` | **Sonnet 5** |
| **W7** | Route admin mutations through edge fns | P1 | W2 | `general-purpose` | **Opus 4.8** |
| **W8** | Enforce the permission matrix | P2 | W7 | `general-purpose` | **Sonnet 5** |
| **W9** | Admin authz regression suite | P2 | W1,W3,W6 | `general-purpose` | **Sonnet 5** |
| **W10** | Decompose oversized pages | P3 | W7 | `general-purpose` | **Sonnet 5** |

**Model rationale:** Opus 4.8 for anything where a wrong call is a security hole or a schema migration (W1, W2, W4, W5, W7). Sonnet 5 for mechanical, well-specified work with a clear verification step (W3, W6, W8, W9, W10). No task here suits Haiku — every one touches authorization or schema.

**Agent-type note:** the available subagent types are `general-purpose`, `Explore` (read-only fan-out search), and `Plan` (architecture only, cannot edit). Use `Explore` for the audit sweeps inside W2 and W7 and `Plan` for the W5 schema design; all code changes go to `general-purpose`. Run W3, W5, and W6 in worktree isolation (`isolation: "worktree"`) since they touch disjoint file sets and can proceed in parallel.

---

## 2. Sequencing

```
W1 (P0, ~30 min) ──────────────────────────► LAUNCH GATE
W2 (P0, needs live creds) ─────────────────► LAUNCH GATE
   │
   ├── W3 (delete) ──┬── W4 (impersonation)
   │                 └── W6 (redirect/404)
   ├── W5 (approval_status migration) [independent]
   └── W2 ──► W7 (mutations to edge fns) ──► W8 ──► W10
                                               │
W9 (test suite) ◄──────────────────────────────┘
```

W1 and W2 gate launch. W3 must precede W4 and W6 so guard fixes are not applied to two trees. W5 is independent and can start immediately.

---

## W1 — Close the mock-auth bypass (P0)

**Finding:** A-1. **Agent:** `general-purpose` · **Model:** Opus 4.8

**Evidence** — `lib/server-auth.ts:22-33`:
```ts
const allowMockAuth = process.env.ALLOW_MOCK_AUTH === 'true';
if (allowMockAuth && token === 'mock-admin-token') { return { role: 'admin', ... } }
```

The prior fix removed the `x-access-token` header but left the cookie path. **HttpOnly does not help here** — it prevents JavaScript in a victim's browser from reading a cookie; it does not prevent an attacker from sending an arbitrary `Cookie:` header in their own request:

```bash
curl -H 'Cookie: tm_access_token=mock-admin-token' https://<host>/dashboard/admin
```

Identical bypass, different header name. The only remaining control is that `ALLOW_MOCK_AUTH` is never `true` in production — a deploy-time convention, not an enforced control.

| Field | Detail |
|---|---|
| **Server-side changes** | `lib/server-auth.ts` → `getServerUser()`. Replace the single-condition gate with three independent conditions: (1) `process.env.ALLOW_MOCK_AUTH === 'true'`, (2) `process.env.VERCEL_ENV !== 'production'`, (3) token equals `process.env.E2E_MOCK_ADMIN_TOKEN` — a high-entropy value, **not** a hardcoded literal. Return `null` (not a mock user) if `E2E_MOCK_ADMIN_TOKEN` is unset. Apply the same treatment to the `fake-token` candidate branch. |
| **Client-side changes** | None. |
| **Test changes** | `playwright.config.ts` — set `E2E_MOCK_ADMIN_TOKEN` / `E2E_MOCK_CANDIDATE_TOKEN` from the harness env and use those values wherever the literals are currently set. |
| **Impact if changed** | Three independent failures are required to reach the bypass instead of one. Even with the flag leaked to prod, the token is unguessable. |
| **Impact if not changed** | One env-var misconfiguration grants unauthenticated full admin over a multi-tenant platform holding candidate PII. |
| **Reason for change** | Authorization must not rest on deploy-time discipline. |
| **Deploy priority** | **P0 — launch blocker** |

**Verification:** `curl -H 'Cookie: tm_access_token=mock-admin-token' localhost:3000/dashboard/admin` must redirect to login with `ALLOW_MOCK_AUTH=true` and `VERCEL_ENV=production` set. Existing admin e2e specs must still pass.

**[SUGGESTION] Preferred end-state:** delete mock auth entirely; seed a real test admin in the e2e backend and have Playwright perform a real login. *Trade-off:* requires an e2e seed fixture and slower test setup, but removes a production auth branch that exists purely for tests. W1 as specified is the fast fix; this is the right one.

---

## W2 — Live-backend verification (P0)

**Findings:** A-3, A-7 (the two UNVERIFIED items). **Agent:** `general-purpose` + human · **Model:** Opus 4.8

Two claims could not be settled from source and gate how urgent W7 is. Project records document out-of-band production DDL drift, so committed SQL is not evidence of live state.

| Field | Detail |
|---|---|
| **Server-side changes** | None — this is a verification task producing a written finding. |
| **Checks** | **(a)** Attempt a direct InsForge native signup/user-update with `metadata: { role: 'admin' }`, bypassing the `auth-signup` edge function. Then confirm whether that metadata can influence any authorization decision. **(b)** Enumerate live RLS policies for every table reached directly from admin client pages: `profiles`, `export_jobs`, `export_job_items`, `user_sessions`, `jobs`, `notifications`. Confirm a non-admin token cannot read or write them. |
| **Tooling** | `mcp__insforge__run-raw-sql` for policy enumeration; `mcp__insforge__get-backend-metadata` for schema truth. Use `Explore` to enumerate every direct `insforge.database` call site first, so the table list is complete. |
| **Impact if changed** | W7's scope and urgency become known rather than assumed. |
| **Impact if not changed** | Launch proceeds without knowing whether RLS is the only control on candidate PII — and whether it holds. |
| **Reason for change** | The audit's two open questions are the difference between "defense in depth" and "no defense". |
| **Deploy priority** | **P0 — launch blocker** |

**Human gate:** requires live credentials. Do not let an agent apply DDL — report only.

---

## W3 — Delete orphaned trees (P1)

**Finding:** A-9, A-10. **Agent:** `general-purpose` · **Model:** Sonnet 5 · **Isolation:** worktree

| Field | Detail |
|---|---|
| **Server-side changes** | Delete `app/portals/admin/` (9 pages + CSS, zero inbound links). Delete page-less `error.tsx`/`loading.tsx` shells under `app/admin/{dashboard,candidates,jobs,settings,team,onboarding}/`. **Precondition:** diff `app/portals/admin/dashboard/{billing/actions.ts,plans,team}` against the `AdminComingSoonPage` stubs at `app/dashboard/admin/{billing,plans,team}` — the orphaned copies may hold the only implementation. Preserve anything real. Then move `app/(dashboard)/admin/email-templates/**` → `app/dashboard/admin/email-templates/**`, replacing the stub (A-10). |
| **Client-side changes** | None — the sidebar link at `OpsDarkSidebarShell.tsx:270` becomes correct once the page moves. |
| **Impact if changed** | One admin tree, one guard. Removes a live route reachable through a divergent weaker guard, and restores a built-but-unreachable feature. |
| **Impact if not changed** | Every subsequent guard fix must be applied twice and will drift again — the root cause of A-6. |
| **Reason for change** | Duplicate route trees caused A-6 and A-10. |
| **Deploy priority** | **P1 — do first among P1s** |

**Verification:** `next build` succeeds; `/admin/email-templates` and `/dashboard/admin/email-templates` both resolve to the real editor; no route regressions in the admin e2e specs.

---

## W4 — Impersonation: remove or rebuild (P1)

**Finding:** A-4. **Agent:** `general-purpose` · **Model:** Opus 4.8 · **Depends on:** W3

Broken in four independent ways *and* carries an escalation primitive (`userRole` read from the request body at `app/api/impersonate/route.ts:32`, written to a trusted cookie at line 69, while the target's real role is never fetched).

**Decision required from the user before starting.**

**Option A — Remove (recommended for launch).** Delete `app/api/impersonate/route.ts`, the mock page, the three broken `document.cookie` readers (`AuthContext.tsx:327-329`, `DashboardLayoutClient.tsx:345`, `lib/insforge.ts:175`), and `components/admin/ImpersonationBanner.tsx`. *Ships nothing that appears to work but doesn't.*

**Option B — Rebuild.** Derive role server-side (`.select('role, name, email')`), delete `userRole` from the request contract, 404 on missing target, 403 on admin/super_admin targets and self-impersonation, require a non-empty `reason` persisted to `audit_log`, add `path: '/'` to cookies, mint a short-lived scoped token for the target, restrict to `super_admin`, and render the banner from a server component.

| Field | Detail |
|---|---|
| **Server-side changes** | Per chosen option above. If B, migrate the route to `withApi({ allowedRoles: ['super_admin'], auditLog: true })` for consistency with the other three admin routes. |
| **Client-side changes** | If A: delete the mock page and all three cookie readers. If B: real user-search UI backed by an edge function; server-rendered banner. |
| **Impact if changed** | A: no broken security surface ships. B: support can reproduce user issues with a tamper-proof trail. |
| **Impact if not changed** | A visibly broken security feature ships, and the escalation activates the moment someone "fixes" the cookie read without fixing the body-supplied role. |
| **Reason for change** | Most abuse-prone admin capability; unlogged PII access is a DPDP Act liability. |
| **Deploy priority** | **P1** |

---

## W5 — Job approval state model (P1)

**Finding:** A-11 / F-6. **Agent:** `Plan` (design) → `general-purpose` (implement) · **Model:** Opus 4.8 · **Isolation:** worktree

`app/dashboard/admin/job-approvals/page.tsx:64-68` infers rejection from `status = 'closed'`, so any job a recruiter merely closed and that was never approved appears in the admin **Rejected** tab.

| Field | Detail |
|---|---|
| **Server-side changes** | Migration: `ALTER TABLE jobs ADD COLUMN approval_status text NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending','approved','rejected'));` plus backfill (`is_approved = true` → `'approved'`; `is_approved = false AND status = 'closed'` → **requires a product decision**, since today's data cannot distinguish rejected from closed). Update `insforge/functions/admin-jobs/index.ts` to write `approval_status`. Cross-ref `02_Schema_And_Database_Design.md`, `04_State_Machines_And_Business_Logic.md`, and follow the `09_Migration_Execution_Runbook.md` gates. |
| **Client-side changes** | `job-approvals/page.tsx`: filter all three counts on `approval_status`; remove `is_approved`/`status` inference; correct the optimistic-count arithmetic at lines 148-157, which assumes a job leaving a tab lands in the tab implied by `approve`. |
| **Impact if changed** | Approval counts become correct; moderation lifecycle separates from publication lifecycle. |
| **Impact if not changed** | Admins act on wrong queues; approval metrics are unusable; the 30s poll masks the drift rather than fixing it. |
| **Reason for change** | Two independent lifecycles are encoded in one column. |
| **Deploy priority** | **P1** |

**Human gate:** the backfill is irreversible and the historical rejected-vs-closed distinction is unrecoverable. Agent writes SQL + code; **a human applies the migration.** Never let an agent apply live DDL on this project.

---

## W6 — Redirect guard + `/unauthorized` (P1)

**Findings:** A-5, A-6. **Agent:** `general-purpose` · **Model:** Sonnet 5 · **Depends on:** W3 · **Isolation:** worktree

| Field | Detail |
|---|---|
| **Server-side changes** | Pick one mechanism for loop detection. Simplest: read the `?rd` param already being written (`app/dashboard/admin/layout.tsx:51,56,59`) via `searchParams`, and delete the `headers().get('x-redirect-depth')` read from all four layouts (`dashboard/`, `dashboard/admin/`, `dashboard/candidate/`, `dashboard/recruiter/`). Extract the duplicated ~40-line 403 markup into one shared component. Create `app/unauthorized/page.tsx` if any guard still redirects there after W3. |
| **Client-side changes** | Add a "Your account has been suspended" state keyed on `?reason=suspended` (the redirect target added by the A-2 fix, which currently lands on a generic login page). |
| **Impact if changed** | A genuine role/route mismatch terminates with a 403 instead of looping; denied users get an explanation. |
| **Impact if not changed** | Infinite redirect loop in production — the exact failure the dead code was written to prevent. |
| **Reason for change** | Dead safety code implies a protection that does not exist. |
| **Deploy priority** | **P1** |

---

## W7 — Route admin mutations through edge functions (P1)

**Finding:** A-7. **Agent:** `Explore` (census) → `general-purpose` (implement) · **Model:** Opus 4.8 · **Depends on:** W2

All 20 admin pages are `'use client'`; most write to InsForge directly, so `withApi`'s `auditLog` never fires. Confirmed direct mutations: `app/dashboard/admin/settings/page.tsx:364,383,401,430` (session rename, **session revocation**, profile → `'deleted'`) and `app/dashboard/admin/candidates/page.tsx:601-668,803-822` (`export_jobs` lifecycle).

| Field | Detail |
|---|---|
| **Server-side changes** | Establish one rule: **all admin mutations go through an edge function.** `insforge/functions/admin-jobs/index.ts` is the template (token verify → role check → `is_active` check → act with service key). Add `admin-settings` coverage for session/profile writes; extend `admin-candidates` for the export lifecycle. Also fix A-12 while in these files: `admin-jobs/index.ts:7` sources the service key from a request header — read from env only and fail loudly if unset. Audit all 16 `admin-*` functions for that line. |
| **Client-side changes** | Replace direct `insforge.database.update/insert/delete` in `settings/page.tsx` and `candidates/page.tsx` with `invokeFunction`. Reads may stay direct **only** where W2 confirmed RLS coverage. |
| **Impact if changed** | Every privileged mutation is uniformly authorized and audit-logged; RLS becomes defense in depth rather than the sole control. |
| **Impact if not changed** | No forensic trail for admin actions on candidate PII and sessions — a DPDP Act reasonable-security gap, unanswerable during incident response. |
| **Reason for change** | An audit log that misses most admin actions is not an audit log. |
| **Deploy priority** | **P1** |

---

## W8 — Enforce the permission matrix (P2)

**Finding:** A-8. **Agent:** `general-purpose` · **Model:** Sonnet 5 · **Depends on:** W7

`lib/permissions.ts` defines an 81-line matrix used by 2 of 20 pages, client-side only, to hide buttons. Server-side, `lib/api/handler.ts:47-51` gates on `allowedRoles: ['admin','super_admin']` — treating the two roles as identical. Every distinction the matrix encodes is enforced nowhere.

| Field | Detail |
|---|---|
| **Server-side changes** | Extend `WithApiOptions` with `requiredPermission?: { resource: Resource; action: Action }`, evaluated via `canPerform(user.role, resource, action)` after the `allowedRoles` check. Mirror the same check inside the `admin-*` edge functions. |
| **Client-side changes** | None — existing `canPerform` calls become the UI reflection of a real server rule. |
| **Impact if changed** | The `admin`/`super_admin` split becomes a real privilege boundary, enabling least-privilege ops staffing. |
| **Impact if not changed** | Any `admin` performs every `super_admin` action by calling the API directly; hidden buttons are the only barrier. |
| **Reason for change** | An unenforced permission model creates false confidence during access reviews. |
| **Deploy priority** | **P2** |

**Precondition:** confirm the intended real-world role split with the user first. Enforcing the matrix as written will immediately block `admin` users from billing export and settings deletion.

---

## W9 — Admin authorization regression suite (P2)

**Agent:** `general-purpose` · **Model:** Sonnet 5 · **Depends on:** W1, W3, W6

Every finding in doc 11 is mechanically testable. This is the only durable defense against the guard drift that produced A-1, A-2, and A-6 — and against a future session "fixing" A-1 the way this one did.

| Field | Detail |
|---|---|
| **Test changes** | Add `e2e/admin-authz.spec.ts` covering: unauthenticated → redirect; `candidate`/`recruiter` role → 403/redirect; **suspended admin → 403 on every `admin-*` edge function**; forged `mock-admin-token` cookie with `VERCEL_ENV=production` → denied (locks in W1); `admin` attempting a `super_admin` action → 403 (locks in W8). `vitest` unit tests for `getServerUser()` token-source and role-resolution behaviour. |
| **Impact if changed** | Guard regressions fail CI instead of shipping. |
| **Impact if not changed** | The same three findings recur; this audit gets repeated in six months. |
| **Reason for change** | `e2e/` and `vitest` are already configured — this is cheap. |
| **Deploy priority** | **P2** |

---

## W10 — Decompose oversized pages (P3)

**Finding:** A-13. **Agent:** `general-purpose` · **Model:** Sonnet 5 · **Depends on:** W7

`recruiters/page.tsx` is 3,062 lines; `candidates` ~1,000+; `announcements` 864. Single `'use client'` components mixing data fetching, permission logic, modals, and inline styles. This is *why* A-7 went unnoticed — the direct-DB calls sit in files no reviewer reads end to end.

Split by concern into `_components/` per route; move data access into `lib/hooks/`; replace inline style objects with CSS modules (already the pattern elsewhere). **Do after W7**, so the data-access migration isn't done twice.

---

## 3. Launch Gate

Production deploy is blocked until:

- [ ] **W1** — mock-auth bypass closed and verified by curl with `VERCEL_ENV=production`
- [ ] **W2** — both UNVERIFIED items resolved against the live backend
- [ ] **W4** — impersonation removed or rebuilt (no half-working security feature)
- [ ] **W5** — approval state migrated, or the Rejected tab disabled with a known-issue note
- [ ] **W6** — no redirect loop reachable; suspended-admin redirect lands somewhere real

W7–W10 are strongly recommended but not strictly launch-blocking **provided W2 confirms RLS covers every directly-accessed table.** If W2 finds gaps, **W7 becomes a launch blocker.**

---

## 4. Agent Dispatch Summary

| Task doc / workstream | Agent type | Model | Isolation | Human gate |
|---|---|---|---|---|
| W1 mock-auth | `general-purpose` | Opus 4.8 | — | review diff |
| W2 live verification | `Explore` → `general-purpose` | Opus 4.8 | — | **yes — live creds, report only** |
| W3 delete trees | `general-purpose` | Sonnet 5 | worktree | review deletions |
| W4 impersonation | `general-purpose` | Opus 4.8 | worktree | **yes — choose Option A or B first** |
| W5 approval_status | `Plan` → `general-purpose` | Opus 4.8 | worktree | **yes — human applies DDL** |
| W6 redirect/404 | `general-purpose` | Sonnet 5 | worktree | — |
| W7 mutations → edge fns | `Explore` → `general-purpose` | Opus 4.8 | worktree | — |
| W8 permission matrix | `general-purpose` | Sonnet 5 | worktree | **yes — confirm role split** |
| W9 authz tests | `general-purpose` | Sonnet 5 | worktree | — |
| W10 decomposition | `general-purpose` | Sonnet 5 | worktree | — |

**Standing rule for every agent on this project:** never apply live DDL, and never treat committed SQL as evidence of live schema state — production has documented out-of-band drift. Report and let a human apply.

**Parallelism:** W3, W5, and W6 touch disjoint file sets and can run concurrently in worktrees. W4 must wait for W3. W7 must wait for W2. Do not parallelize W7 with W10 — they edit the same files.
