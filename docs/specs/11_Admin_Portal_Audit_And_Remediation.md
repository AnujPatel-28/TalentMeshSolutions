# 11 — Admin Portal Audit & Remediation Plan

**Date:** 2026-07-18
**Scope:** Admin surface only — guards, routes, API layer, edge functions, admin UI data flow.
**Method:** Source-verified. Every finding cites file and line. Claims that could not be proven from source are explicitly marked UNVERIFIED.
**Verdict:** **NOT production-ready.**

Related: `01_Auth_Security_Audit_Report.md`, `03_API_Routes_And_Endpoints.md`, `10_Auth_Token_Propagation_And_Subdomain_Fix.md`

---

## 0. Executive Summary

The admin **backend** is largely sound. The 18 `admin-*` edge functions and the three `withApi` routes implement correct token verification, role gating, and (in the edge functions) `is_active` enforcement.

The admin **frontend and its guards** are not sound, and the two halves disagree:

1. **Four parallel admin implementations coexist** — `app/dashboard/admin/**` (live), `app/portals/admin/dashboard/**` (orphaned), `app/(dashboard)/admin/**` (shadowed), `app/admin/**` (shells with no pages).
2. **The strictest checks live in the layer the UI mostly bypasses.** Most admin pages are `'use client'` and query InsForge directly from the browser, skipping `withApi` and its audit log.
3. **Two divergent session resolvers** (`lib/server-auth.ts` vs `lib/auth/server-auth.ts`) with different mock-auth safety levels — the weaker one guards admin.

### Finding Register

| ID | Finding | Priority |
|----|---------|----------|
| A-1 | Mock-auth admin bypass via attacker-controlled request header | **P0** |
| A-2 | Suspended admins retain full portal access | **P0** |
| A-3 | Role falls back to auth metadata | **P0** |
| A-4 | Impersonation broken end-to-end + role-from-body escalation | **P1** |
| A-5 | Redirect-loop guard is dead code | **P1** |
| A-6 | Unauthorized admins redirect to a 404 | **P1** |
| A-7 | Admin pages bypass the API layer and its audit log | **P1** |
| A-8 | Permission matrix is decorative (client-only) | **P2** |
| A-9 | `/portals/admin/**` fully orphaned but live-routable | **P2** |
| A-10 | Working email-template editor shadowed by a stub | **P2** |
| A-11 | "Rejected" and "closed" are the same job state | **P2** |
| A-12 | Edge functions accept service key from a request header | **P2** |
| A-13 | 3,062-line single-component admin pages | **P3** |

---

## A-1 — Mock-auth admin bypass via request header

**Evidence** — `lib/server-auth.ts`, `getServerUser()`, lines 12 and 20–31:

```ts
const token = headersList.get('x-access-token') || cookieStore.get('tm_access_token')?.value;

const allowMockAuth = process.env.ALLOW_MOCK_AUTH === 'true';
if (allowMockAuth && token === 'mock-admin-token') {
  return { id: 'adm-uuid-999', email: 'admin@test.com', role: 'admin', ... };
}
```

Two defects compound:

- The token is read from an **inbound request header before the cookie**. `x-access-token` is fully attacker-controlled, which defeats the purpose of the HttpOnly cookie established in `10_Auth_Token_Propagation_And_Subdomain_Fix.md`.
- `ALLOW_MOCK_AUTH` has **no `NODE_ENV` guard**. The sibling resolver `lib/auth/server-auth.ts:93` does have one:
  ```ts
  const allowMockAuth = process.env.NODE_ENV !== 'production' && process.env.ENABLE_MOCK_AUTH === 'true';
  ```
  Different variable name, different safety level, same responsibility.

Exploit if the flag is ever set in production — no cookie required:
```
curl -H 'x-access-token: mock-admin-token' https://<host>/dashboard/admin
```

The in-code comment asserts safety by convention ("the real production deployment must never set this flag"). That is a deploy-time hope, not a control.

| Field | Detail |
|---|---|
| **Server-side changes** | `lib/server-auth.ts` → `getServerUser()`: delete the `headersList.get('x-access-token')` fallback so the cookie is the only token source; add `process.env.NODE_ENV !== 'production' &&` to both mock branches. Preferred: remove mock identities from the runtime path and seed real test users in the e2e harness instead. |
| **Client-side changes** | None. |
| **Impact if changed** | Header-injection and flag-misconfiguration paths to admin are both closed. HttpOnly regains its meaning. |
| **Impact if not changed** | A single env-var misconfiguration grants unauthenticated full admin over the entire multi-tenant platform. |
| **Reason for change** | Authorization must not depend on a client-supplied header or on deploy-time discipline. |
| **Deploy priority** | **P0** |

---

## A-2 — Suspended admins retain full portal access

**Evidence** — `app/dashboard/admin/layout.tsx:54` checks role only:

```ts
if (user.role !== 'admin' && user.role !== 'super_admin') { ... }
```

`getServerUser()` (`lib/server-auth.ts:76`) *does* return `is_active`. The edge function `insforge/functions/admin-jobs/index.ts:46,59` *does* enforce it:

```ts
.select('role, is_active')
...
return new Response(JSON.stringify({ error: 'Forbidden, account is suspended' }), { status: 403 })
```

The Next.js layout guarding **every admin page** ignores it. A deactivated admin loses job-approvals (edge-function-gated) but keeps candidates, settings, search, notifications, and audit-logs — precisely the pages that query the DB directly (see A-7).

| Field | Detail |
|---|---|
| **Server-side changes** | `app/dashboard/admin/layout.tsx`: add `if (!user.is_active) redirect('/login?reason=suspended');` after the role check. `lib/api/handler.ts` → `withApi()`: reject when `requireAuth && user && user.is_active === false` with 403. |
| **Client-side changes** | Add a "Your account has been suspended" state to the login page keyed on `?reason=suspended`. |
| **Impact if changed** | Deactivation becomes a real, immediate control across all three access layers. |
| **Impact if not changed** | Offboarding an admin does not revoke their access. Terminated staff retain candidate-PII access until token expiry. |
| **Reason for change** | Deactivation is the primary incident-response and offboarding lever; today it is only partially wired. |
| **Deploy priority** | **P0** |

---

## A-3 — Role falls back to auth metadata

**Evidence** — `lib/server-auth.ts:63–64`:

```ts
const authMetadataRole = (user.metadata as any)?.role;
const role = profile?.role || authMetadataRole || 'candidate';
```

If the `profiles` row is missing or its `role` is null, authorization authority shifts to `user.metadata.role`.

**Verified safe (application path):** `insforge/functions/auth-signup/index.ts:37–40` clamps privileged roles on public signup:
```ts
let safeRole = role;
if (safeRole === 'admin' || safeRole === 'super_admin') { safeRole = 'candidate'; }
```
`lib/auth/AuthContext.tsx:434–438` confirms the app's only signup path invokes that edge function.

> **UNVERIFIED — requires live backend check.** Whether InsForge's *native* signup/user-update endpoint is reachable directly by a client with arbitrary `metadata`, bypassing the `auth-signup` edge function, cannot be determined from this repository. If it is reachable, this is a direct privilege-escalation path. **This must be tested against the live backend before launch.**

| Field | Detail |
|---|---|
| **Server-side changes** | `lib/server-auth.ts:63–64` → replace with `const role = normalizeRole(profile?.role);` (reuse `normalizeRole` from `lib/auth/server-auth.ts:49`). Treat a missing profile as unauthenticated: `if (!profile) return null;`. |
| **Client-side changes** | None. |
| **Impact if changed** | `profiles.role` becomes the single source of truth for authorization; a missing profile can no longer be an authorization input. |
| **Impact if not changed** | Latent escalation whose exploitability depends on backend configuration that is not controlled in this repo. |
| **Reason for change** | Defense in depth. Auth metadata is provider-managed and frequently client-writable; the `profiles` table is policy-controlled. |
| **Deploy priority** | **P0** |

---

## A-4 — Impersonation broken end-to-end + role-from-body escalation

The feature is non-functional in four independent ways, and carries an escalation primitive.

**Evidence:**

| Layer | File | Defect |
|---|---|---|
| UI | `app/dashboard/admin/impersonate/page.tsx` (59 lines) | Entirely hardcoded mock — three fake users (`john@candidate.test`, `hr@acme.test`), a search input with no handler, buttons with no `onClick`. Never calls `/api/impersonate`. |
| Cookie read | `lib/auth/AuthContext.tsx:327–329` | Reads `document.cookie` for cookies set `httpOnly: true` at `app/api/impersonate/route.ts:61`. **Always undefined.** |
| Cookie name | `app/dashboard/DashboardLayoutClient.tsx:345`, `lib/insforge.ts:175` | Look for `tm_impersonating_user_id`; the API sets `impersonating_user_id`. Wrong name *and* unreadable. |
| Data layer | `app/api/impersonate/route.ts` | No token is minted for the target. The admin's JWT stays active, so RLS still resolves the admin. `insforge/functions/auth-session/index.ts:203` gates on `userId === impersonatingId`, which is therefore unreachable. |

**Escalation primitive** — `app/api/impersonate/route.ts:32,69`:

```ts
const { userId, userRole } = await req.json();   // userRole is caller-supplied
...
cookieStore.set('impersonating_user_role', userRole, cookieOptions);
```

The route fetches the target profile at line 35 but selects only `name, email` — never the real role. An `admin` can post `userRole: 'super_admin'`. Nothing trusts that cookie *today* only because the read path is broken (see above); fixing the read path without fixing this would open the escalation.

Additional gaps: no guard against impersonating another admin/super_admin, no self-impersonation guard, no existence check on `userId` (a null `targetProfile` still proceeds), and no `path` on `cookieOptions`.

| Field | Detail |
|---|---|
| **Server-side changes** | `app/api/impersonate/route.ts`: derive role from the target's profile (`.select('role, name, email')`) and **delete `userRole` from the request contract**; return 404 if the target profile is null; return 403 if target role is `admin`/`super_admin` or `userId === user.id`; require a non-empty `reason` string and persist it to `audit_log`; add `path: '/'` to `cookieOptions`; mint a short-lived scoped token for the target rather than relying on cookie flags. Migrate the route to `withApi({ allowedRoles: ['super_admin'] })` for consistency with the other admin routes. |
| **Client-side changes** | Replace the mock `impersonate/page.tsx` with a real user search backed by an edge function. Remove the three `document.cookie` readers (`AuthContext.tsx:327–329`, `DashboardLayoutClient.tsx:345`, `lib/insforge.ts:175`); pass impersonation state from a server component into `ImpersonationBanner`. |
| **Impact if changed** | Support staff can reproduce user-reported bugs with a full, tamper-proof audit trail. |
| **Impact if not changed** | A security-sensitive feature ships visibly broken; the escalation primitive activates the moment anyone "fixes" the cookie read. |
| **Reason for change** | Impersonation is the most abuse-prone admin capability. Under India's DPDP Act, unlogged staff access to candidate PII is a compliance liability. |
| **Deploy priority** | **P1** — or remove the feature and its route until it can be built properly. |

---

## A-5 — Redirect-loop guard is dead code

**Evidence** — `app/dashboard/admin/layout.tsx:6–10` (identical code in `app/dashboard/layout.tsx:8`, `app/dashboard/candidate/layout.tsx:7`, `app/dashboard/recruiter/layout.tsx:8`):

```ts
const headersList = await headers();
const depthStr = headersList.get('x-redirect-depth') || '0';
const depth = parseInt(depthStr, 10);
if (depth > 3) { /* ~40-line 403 page */ }
```

A repo-wide grep for `x-redirect-depth` returns only these four *readers* — **no writer**, and **there is no `middleware.ts`** in the project (only an unrelated `proxy.ts`). `depth` is permanently `0` and the 403 page is unreachable.

Meanwhile the redirects write a query param nothing reads — `app/dashboard/admin/layout.tsx:51,56,59`:
```ts
redirect(`/login?rd=${depth + 1}`);
```

| Field | Detail |
|---|---|
| **Server-side changes** | Pick one mechanism. Simplest: read the param already being written — accept `searchParams.rd` in each layout and drop the `headers()` read. Alternative: add `middleware.ts` promoting `?rd` to `x-redirect-depth`. Extract the duplicated 403 markup into one shared component. |
| **Client-side changes** | None. |
| **Impact if changed** | A genuine role/route mismatch terminates with a 403 instead of looping. |
| **Impact if not changed** | Any role/route mismatch produces an infinite redirect loop in production — the exact failure these ~160 duplicated lines exist to prevent. |
| **Reason for change** | Dead safety code is worse than no safety code: it implies a protection that does not exist. |
| **Deploy priority** | **P1** |

---

## A-6 — Unauthorized admins redirect to a 404

**Evidence** — `app/portals/admin/dashboard/layout.tsx:12–15`:

```ts
if (user.role !== 'admin' && user.role !== 'super_admin') {
  console.warn(`[Admin Guard] Unauthorized access attempt by user ${user.id} (${user.role})`);
  redirect('/unauthorized');
}
```

`find app -type d -name unauthorized` returns only `app/portals/jobs/unauthorized` → route `/portals/jobs/unauthorized`. **`/unauthorized` does not exist.**

Note this guard also diverges from `app/dashboard/admin/layout.tsx`, which redirects by role instead. Two admin guards, two behaviours.

| Field | Detail |
|---|---|
| **Server-side changes** | Resolved by A-9 (delete the orphaned tree). If retained, create `app/unauthorized/page.tsx` and unify with the `dashboard/admin` guard. |
| **Client-side changes** | None. |
| **Impact if changed** | Denied users get an explanation instead of a 404. |
| **Impact if not changed** | Confusing failure; the `console.warn` is the only signal and it is not aggregated anywhere. |
| **Reason for change** | Authorization denials must be observable and legible. |
| **Deploy priority** | **P1** |

---

## A-7 — Admin pages bypass the API layer and its audit log

**Evidence** — access-pattern census across all 20 admin pages (`fn` = `invokeFunction`, `db` = direct `insforge.database`, `api` = Next API route):

```
fn=5   db=0   api=0   announcements      fn=0  db=0  api=0   billing (stub)
fn=3   db=1   api=0   applications       fn=0  db=0  api=0   email-templates (stub)
fn=2   db=0   api=0   audit-logs         fn=0  db=0  api=0   impersonate (mock)
fn=5   db=0   api=0   blogs              fn=0  db=0  api=0   plans (stub)
fn=7   db=10  api=0   candidates         fn=0  db=0  api=0   team (stub)
fn=5   db=0   api=0   companies          fn=0  db=5  api=0   search
fn=3   db=3   api=0   job-approvals      fn=7  db=7  api=2   settings
fn=5   db=0   api=0   jobs               fn=14 db=10 api=1   recruiters
fn=2   db=4   api=0   notifications      fn=0  db=0  api=5   verification
fn=2   db=0   api=0   reports            fn=0  db=0  api=0   admin (dashboard, via hook)
```

All 20 pages are `'use client'`. Three access patterns coexist with no rule governing which is used. Mutations confirmed executing directly from the browser include `app/dashboard/admin/settings/page.tsx:364,383,401,430` (session rename, **session revocation**, profile status → `'deleted'`) and `app/dashboard/admin/candidates/page.tsx:601–668,803–822` (`export_jobs` lifecycle).

Consequence: `withApi`'s `auditLog: true` (`lib/api/handler.ts:94–104`) **never fires** for these operations, and enforcement rests entirely on RLS.

> **UNVERIFIED — requires live backend check.** Whether RLS policies actually cover every table reached directly from these client pages could not be confirmed from source. Project records note prior out-of-band DDL drift on production, so the committed SQL files are not reliable evidence of live policy state. **Enumerate live policies for `profiles`, `export_jobs`, `user_sessions`, and `jobs` before launch.**

| Field | Detail |
|---|---|
| **Server-side changes** | Establish one rule: **all admin mutations go through an edge function.** `insforge/functions/admin-jobs/index.ts` is the correct template (token verify → role check → `is_active` check → act with service key). Add `admin-settings` / extend `admin-candidates` to absorb the direct writes listed above. |
| **Client-side changes** | Replace direct `insforge.database.update/insert/delete` calls in `settings/page.tsx` and `candidates/page.tsx` with `invokeFunction` calls. Reads may remain direct where RLS is verified. |
| **Impact if changed** | Every privileged mutation is uniformly authorized and audit-logged; RLS becomes defense-in-depth rather than the sole control. |
| **Impact if not changed** | No forensic trail for admin actions on candidate PII and sessions — a DPDP Act reasonable-security gap and an unanswerable question during incident response. |
| **Reason for change** | Client-side callers cannot be trusted to enforce authorization, and an audit log that misses most admin actions is not an audit log. |
| **Deploy priority** | **P1** |

---

## A-8 — Permission matrix is decorative

**Evidence** — `lib/permissions.ts` defines a 4-role × 9-resource × 5-action matrix (81 lines). Repo-wide, it is imported by **2 of 20 admin pages**:

- `app/dashboard/admin/candidates/page.tsx:11,106–109`
- `app/dashboard/admin/recruiters/page.tsx:14,1437–1440`

Both use it only to compute `hasEditPerm` / `hasDeletePerm` / `hasApprovePerm` / `hasExportPerm` for hiding buttons. **No server-side equivalent exists.** `lib/api/handler.ts:47–51` gates on a coarse array:

```ts
if (!user || !allowedRoles.includes(user.role)) { return 403 }
```

Every route uses `allowedRoles: ['admin', 'super_admin']`, treating the two roles as identical. So every distinction the matrix encodes — `admin` cannot `export` billing, cannot `delete` settings, has `dashboard: ['view']` only — **is enforced nowhere**. Client-side permissions are UX, not security.

| Field | Detail |
|---|---|
| **Server-side changes** | Extend `WithApiOptions` in `lib/api/handler.ts` with `requiredPermission?: { resource: Resource; action: Action }` and evaluate it via `canPerform(user.role, resource, action)` after the `allowedRoles` check. Mirror the same check inside the `admin-*` edge functions. |
| **Client-side changes** | None required; existing `canPerform` calls become the UI reflection of a real server rule. |
| **Impact if changed** | The `admin` / `super_admin` split becomes a real privilege boundary, enabling least-privilege ops staffing. |
| **Impact if not changed** | Any `admin` can perform every `super_admin` action by calling the API directly; hidden buttons are the only barrier. |
| **Reason for change** | An unenforced permission model is worse than none — it creates false confidence during access reviews. |
| **Deploy priority** | **P2** |

---

## A-9 — `/portals/admin/**` fully orphaned but live-routable

**Evidence** — `app/portals/admin/dashboard/**` contains 9 pages plus CSS modules: `announcements`, `audit-logs`, `billing` (+`actions.ts`), `companies`, `impersonate`, `job-approvals`, `plans`, `search`, `team`.

A repo-wide grep for `portals/admin` outside that directory returns **zero inbound links**. Sidebar (`components/dashboard/OpsDarkSidebarShell.tsx:237–298`) and command palette (`components/search/CommandPalette.tsx:68–77`) point exclusively at `/dashboard/admin/*`.

It is nonetheless live-routable and carries its own weaker guard (A-6). Dead code that is also attack surface.

Also orphaned: `app/admin/{dashboard,candidates,jobs,settings,team,onboarding}/` contain `error.tsx` / `loading.tsx` **with no `page.tsx`** — leftovers from an abandoned tree.

| Field | Detail |
|---|---|
| **Server-side changes** | Delete `app/portals/admin/`. Delete the page-less `error.tsx`/`loading.tsx` shells under `app/admin/`. Before deleting, diff `app/portals/admin/dashboard/billing/actions.ts` and the `plans`/`team` pages against the `/dashboard/admin` stubs (A-10) — the orphaned versions may contain the only implementation. |
| **Client-side changes** | None (nothing links to them). |
| **Impact if changed** | One admin tree, one guard. Removes a live route reachable via a divergent, weaker authorization path. |
| **Impact if not changed** | Guard fixes must be applied in two places forever, and will drift again. |
| **Reason for change** | Duplicate route trees are the root cause of A-6 and A-10. |
| **Deploy priority** | **P2** — but do this **first**, since it removes surface the P0/P1 fixes would otherwise have to be applied to twice. |

---

## A-10 — Working email-template editor shadowed by a stub

**Evidence:**

- Real implementation: `app/(dashboard)/admin/email-templates/page.tsx` + `[template_key]/page.tsx` (with `editor.module.css`). Because `(dashboard)` is a route group, these resolve to **`/admin/email-templates`**.
- Sidebar link: `components/dashboard/OpsDarkSidebarShell.tsx:270` → **`/dashboard/admin/email-templates`**.
- What lives there: `app/dashboard/admin/email-templates/page.tsx` — a 23-line `AdminComingSoonPage` reading *"Q3 2026 … under active development."*

**The built feature is unreachable from the UI.** Three other stubs may have the same problem and must be checked against A-9: `billing`, `plans`, `team` — all `AdminComingSoonPage`, all with counterpart pages in the orphaned `/portals/admin` tree.

| Field | Detail |
|---|---|
| **Server-side changes** | Move `app/(dashboard)/admin/email-templates/**` to `app/dashboard/admin/email-templates/**`, replacing the stub. Verify `plans`, `billing`, `team` against their `/portals/admin` counterparts before deleting that tree. |
| **Client-side changes** | None — the sidebar link becomes correct once the page moves. |
| **Impact if changed** | Shipped, paid-for functionality becomes reachable. |
| **Impact if not changed** | Completed work is invisible to users and will likely be rebuilt. |
| **Reason for change** | The route group `(dashboard)` does not contribute a URL segment; this was almost certainly the original mistake. |
| **Deploy priority** | **P2** |

---

## A-11 — "Rejected" and "closed" are the same job state

**Evidence** — `app/dashboard/admin/job-approvals/page.tsx:51–75`:

```ts
pending:  .eq('is_approved', false).eq('status', 'active')
approved: .eq('is_approved', true ).eq('status', 'active')
rejected: .eq('is_approved', false).eq('status', 'closed')   // line 64–68
```

Rejection is inferred from `status = 'closed'`. Any job a recruiter merely **closed** (filled, withdrawn, expired) and that was never approved is counted and displayed as admin-**Rejected**.

Related: the optimistic count arithmetic at lines 148–157 assumes a job leaving a tab always lands in the tab implied by `approve`, which the shared `closed` state cannot guarantee. The 30-second `fetchCounts` poll (line 112) masks the drift.

| Field | Detail |
|---|---|
| **Server-side changes** | Add an explicit approval state to `jobs` rather than overloading `status`: `ALTER TABLE jobs ADD COLUMN approval_status text NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending','approved','rejected'));` plus a backfill. Update `insforge/functions/admin-jobs/index.ts` to write it. See `02_Schema_And_Database_Design.md` and `04_State_Machines_And_Business_Logic.md`. |
| **Client-side changes** | `job-approvals/page.tsx`: filter all three counts on `approval_status`; drop `is_approved`/`status` inference. |
| **Impact if changed** | Approval counts become correct; approval lifecycle is separable from publication lifecycle. |
| **Impact if not changed** | Admins act on wrong queues; the rejected tab shows jobs no admin rejected. Approval metrics are unusable. |
| **Reason for change** | Two independent lifecycles (moderation, publication) are currently encoded in one column. |
| **Deploy priority** | **P2** |

---

## A-12 — Edge functions accept the service key from a request header

**Evidence** — `insforge/functions/admin-jobs/index.ts:7`:

```ts
const SERVICE_KEY = request.headers.get('x-insforge-service-key')
  || Deno.env.get('INSFORGE_SERVICE_KEY') || Deno.env.get('API_KEY') || INSFORGE_ANON_KEY;
```

A client-supplied header is the **first** source for a privileged credential. Not directly exploitable without knowing the key, and the caller is still authenticated via their own token at line 37 — but a privilege credential must never be sourced from the request. The silent fallback chain ending at `INSFORGE_ANON_KEY` also means a misconfigured deployment degrades to anon privileges with no error, producing confusing empty results instead of a hard failure.

| Field | Detail |
|---|---|
| **Server-side changes** | Read from env only: `const SERVICE_KEY = Deno.env.get('INSFORGE_SERVICE_KEY'); if (!SERVICE_KEY) return 500;`. Audit the other 17 `admin-*` functions for the same line. |
| **Client-side changes** | None. |
| **Impact if changed** | Service-key provenance is unambiguous; misconfiguration fails loudly. |
| **Impact if not changed** | A leaked key becomes directly replayable against every admin function, and misconfiguration is silent. |
| **Reason for change** | Privilege credentials come from the environment, never the request. |
| **Deploy priority** | **P2** |

---

## A-13 — Oversized single-component admin pages

**Evidence:** `app/dashboard/admin/recruiters/page.tsx` — **3,062 lines**; `candidates/page.tsx` — ~1,000+; `announcements/page.tsx` — 864; `applications/page.tsx` — 718; `reports/page.tsx` — 629. All single `'use client'` components mixing data fetching, permission logic, modals, and inline styles.

This is why A-7 went unnoticed: the direct-DB calls in `recruiters` are spread across a file no reviewer reads end to end.

| Field | Detail |
|---|---|
| **Server-side changes** | None. |
| **Client-side changes** | Split by concern into `_components/` per route; move data access into hooks under `lib/hooks/`; replace inline style objects with CSS modules (the pattern already used elsewhere in the tree). |
| **Impact if changed** | Security-relevant data access becomes reviewable. |
| **Impact if not changed** | Findings like A-7 continue to hide in files too large to audit. |
| **Reason for change** | Reviewability is a security property. |
| **Deploy priority** | **P3** |

---

## Removal Candidates

| Item | Rationale |
|---|---|
| `app/portals/admin/**` | Orphaned duplicate tree (A-9) |
| `app/admin/{dashboard,candidates,jobs,settings,team,onboarding}/` | `error.tsx`/`loading.tsx` with no `page.tsx` |
| Mock-auth blocks, `lib/server-auth.ts:20–42` | Runtime auth bypass for test convenience (A-1) |
| `x-redirect-depth` / `?rd` machinery (4 layouts) | Dead code, ~160 duplicated lines (A-5) |
| One of `lib/server-auth.ts` / `lib/auth/server-auth.ts` | Two divergent session resolvers (7 vs 1 importers). The 1-importer version has better hygiene (`normalizeRole`, `requireEnv`, MFA awareness); the 7-importer version is the one guarding admin. Consolidate onto the stronger implementation. |
| `lib/permissions.ts` | Enforce server-side (A-8) or delete — do not leave as decoration |

---

## Suggestions

> Per the Suggestion Protocol, these are beyond the audited scope and are not required remediation.

**[SUGGESTION] Collapse to one admin tree with one guard.**
Four route trees × three access patterns is the root cause of A-6, A-7, A-9, and A-10. Target: a single `app/dashboard/admin` tree, a single `getServerUser`, and a single enforcement point.
*Trade-off:* a large one-time move-and-delete diff, and any unmerged work on the orphaned tree must be reconciled first.

**[SUGGESTION] Make `admin` vs `super_admin` a real boundary.**
They are synonyms server-side today. For an Indian-market SaaS, ops staff who approve job postings should not implicitly be able to touch billing or impersonate users. A-8 supplies the mechanism; this is the policy decision to actually staff against it.
*Trade-off:* requires deciding the real-world role split now, and may generate support friction when an `admin` hits a wall.

**[SUGGESTION] Redesign impersonation to audit grade before relaunch.**
Short-lived scoped token, target role derived server-side, admin/super_admin targets blocked, mandatory reason string, server-rendered banner, and a queryable `audit_log` view of all sessions. Restrict to `super_admin`.
*Trade-off:* meaningfully more work than fixing the current route; the honest alternative is to remove the feature until it can be built.

**[SUGGESTION] Add an admin-route authorization test suite.**
Every finding here is mechanically testable: unauthenticated → 401/redirect; wrong role → 403; suspended admin → 403; `admin` on a `super_admin` action → 403. `e2e/` and `vitest` are already configured.
*Trade-off:* upfront cost, but this is the only durable defense against the guard drift that produced A-1, A-2, and A-6.

---

## Recommended Execution Order

1. **A-9** — delete orphaned trees (stop fixing everything twice; check A-10 shadowing first)
2. **A-1, A-2, A-3** — P0 guard fixes on the now-single tree
3. **Live backend verification** — the two UNVERIFIED items: InsForge metadata writability (A-3), RLS coverage for direct-access tables (A-7)
4. **A-4** — impersonation: remove or rebuild
5. **A-5, A-6** — redirect guard and denial page
6. **A-7** — migrate admin mutations to edge functions
7. **A-8, A-10, A-11, A-12** — permission enforcement, route restoration, job state model, key sourcing
8. **A-13** — decomposition, ongoing

---

## Verification Status

| Claim | Status |
|---|---|
| Mock-auth header bypass exists in source | **Verified** — `lib/server-auth.ts:12,20–31` |
| `is_active` unchecked in Next.js guards, checked in edge fn | **Verified** — `layout.tsx:54` vs `admin-jobs/index.ts:46,59` |
| App signup path clamps privileged roles | **Verified** — `auth-signup/index.ts:37–40`, `AuthContext.tsx:434–438` |
| InsForge native signup accepts arbitrary metadata | **UNVERIFIED** — requires live backend test |
| `x-redirect-depth` has no writer; no `middleware.ts` | **Verified** — repo-wide grep + file search |
| `/unauthorized` route does not exist | **Verified** — directory search |
| Impersonation cookies are HttpOnly yet read via `document.cookie` | **Verified** — `impersonate/route.ts:61` vs `AuthContext.tsx:327–329` |
| `/portals/admin` has zero inbound links | **Verified** — repo-wide grep |
| RLS covers all directly-accessed admin tables | **UNVERIFIED** — requires live policy enumeration; committed SQL is unreliable due to recorded prod DDL drift |
