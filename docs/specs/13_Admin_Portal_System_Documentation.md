# 13 — Admin Portal: Complete System Documentation

**Audience:** External advisor / architect who will review the whole admin system and rebuild or
redesign it to fit the new recruiter-side changes.

**Method:** Every statement below was read out of source. Where documentation, comments, or naming
disagree with the implementation, the disagreement is called out explicitly under
**⚠ Discrepancy**. Nothing here is inferred from docs alone.

**Repo root for all paths:** `Talentmesh-demo/`

**Stack:** Next.js 15 App Router + TypeScript · InsForge (Postgres + Auth + Deno edge functions +
Storage) · session cookie auth · multi-tenant recruitment SaaS (India-first).

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Route Topology — Three Competing Admin Trees](#2-route-topology--three-competing-admin-trees)
3. [Authentication & Authorization Lifecycle](#3-authentication--authorization-lifecycle)
4. [Route Reference — Every Admin Page](#4-route-reference--every-admin-page)
5. [Backend Reference — Edge Functions](#5-backend-reference--edge-functions)
6. [Backend Reference — Next.js API Routes](#6-backend-reference--nextjs-api-routes)
7. [Data Model Touched by Admin](#7-data-model-touched-by-admin)
8. [Cross-Cutting Mechanisms](#8-cross-cutting-mechanisms)
9. [Functional Requirements Document (FRD)](#9-functional-requirements-document-frd)
10. [Confirmed Defects & Architectural Debt](#10-confirmed-defects--architectural-debt)
11. [What Could Not Be Verified](#11-what-could-not-be-verified)
12. [Rebuild Guidance](#12-rebuild-guidance)

---

## 1. Executive Summary

### What the admin portal is

A single-tenant **platform operator console** sitting above the multi-tenant recruiter/candidate
product. It is not a company-scoped admin — an admin sees *all* companies, *all* recruiters, *all*
candidates, *all* jobs across the platform. There is no tenant filter anywhere in the admin data
layer; every admin query is a global query.

### The nine functional domains

| # | Domain | Purpose |
|---|--------|---------|
| 1 | **Overview / Reports** | Platform-wide KPI counts, funnel, alert queues, activity feed |
| 2 | **Jobs & Approvals** | Moderate recruiter-posted jobs: approve, reject, feature, bulk edit, delete |
| 3 | **Applications** | Read/override any application's status across the platform |
| 4 | **Candidates** | Directory, suspend/activate, delete, CSV export |
| 5 | **Recruiters** | Directory, the full onboarding/approval/credential-issuance pipeline, custom proposals, CSV export |
| 6 | **Companies** | Directory, register new company, logo upload, KYC/verification decisioning |
| 7 | **Content** | Announcements (with fan-out notifications), blog posts, email templates |
| 8 | **System & Audit** | Audit log viewer, platform settings, admin team management, session/quarantine ops |
| 9 | **Billing & Plans** | Subscription plan editor, billing dashboards — *super_admin only, largely stubbed* |

### The single most important structural fact

**There are three parallel admin route trees in the repo, and only one is reachable.** A large
amount of working code — the real Plans editor, the real Billing dashboard, the real Admin Team /
RBAC screen, the real Impersonation console, the real Email Template editor — is **not wired into
the navigation**, while the routes the navigation *does* point at render "Coming Soon Q3 2026"
placeholders. See [§2](#2-route-topology--three-competing-admin-trees). Any rebuild must resolve
this first; everything else is downstream of it.

### Security posture in one line

Authorization is enforced **twice and independently** — once in the Next.js server layout/API
wrapper, and again inside each Deno edge function (which re-reads `profiles.role` with the service
key). That double gate is sound. The weakness is not the gate; it is that **every admin edge
function then operates with the InsForge service key**, so RLS is fully bypassed for the entire
admin surface. The blast radius of any authz bug is total.

---

## 2. Route Topology — Three Competing Admin Trees

### 2.1 The three trees

| Tree | Path prefix | Pages | Guard | Reachable? |
|------|-------------|-------|-------|-----------|
| **A — Live** | `app/dashboard/admin/**` | 22 | `app/dashboard/admin/layout.tsx` | ✅ Yes — this is what the sidebar links to |
| **B — Orphaned** | `app/portals/admin/dashboard/**` | 9 | `app/portals/admin/dashboard/layout.tsx` | ❌ No nav entry points here |
| **C — Orphaned** | `app/(dashboard)/admin/**` | 2 | *(inherits `(dashboard)` group layout)* | ❌ No nav entry points here |
| **D — Standalone auth** | `app/admin/**` | 4 | per-page (token / none) | ⚠ Partially — outside the dashboard shell |

### 2.2 The Coming-Soon inversion

This is the defect with the highest rebuild impact. Four sidebar destinations in Tree A render
`AdminComingSoonPage` — yet a **complete, working implementation of each already exists** in Tree
B or C:

| Sidebar link (Tree A) | What it renders | Working implementation that exists but is unreachable |
|---|---|---|
| `/dashboard/admin/plans` | Coming Soon "Q3 2026" — 23 lines | `app/portals/admin/dashboard/plans/page.tsx` — **390 lines**, full CRUD on `subscription_plans` incl. INR monthly/annual pricing, seat/job/AI-call quotas, popular-flag mutual exclusion |
| `/dashboard/admin/billing` | Coming Soon "Q3 2026" — 23 lines | `app/portals/admin/dashboard/billing/page.tsx` — **586 lines**, reads `subscriptions`, revenue views |
| `/dashboard/admin/team` | Coming Soon "Q3 2026" — 23 lines | `app/portals/admin/dashboard/team/page.tsx` — **471 lines**, full `admin_members` CRUD + invite via `admin-settings` + notification insert |
| `/dashboard/admin/email-templates` | Coming Soon "Q3 2026" — 23 lines | `app/(dashboard)/admin/email-templates/page.tsx` + `[template_key]/page.tsx` — real `email_templates` list, toggle, per-template editor, writes `audit_log` |

Similarly `/dashboard/admin/impersonate` (59 lines) is **hardcoded mock UI** — a static search box
that does nothing and three fake users (`john@candidate.test`, `hr@acme.test`, `jane@candidate.test`)
— while `app/portals/admin/dashboard/impersonate/page.tsx` (209 lines) is the real console that
queries `profiles`, reads `audit_log` history, and POSTs to the live `/api/impersonate` endpoint.

**⚠ Discrepancy:** The Coming-Soon copy states these features are "under active development" with
an ETA. The source shows they are *built* and merely disconnected. Do not trust the ETA text.

**Interpretation for the advisor:** Tree B looks like an in-progress migration toward a
`portals/`-based information architecture that was started and abandoned. Tree A is the tree that
kept receiving hardening work (the redirect-loop breaker, the `is_active` suspension check, the
audit-remediation comments) — Tree B's guard has none of it. Recommendation in
[§12](#12-rebuild-guidance).

### 2.3 URL obfuscation layer

`next.config.ts` → `rewrites()`:

```ts
const secretPath = process.env.NEXT_PUBLIC_ADMIN_SECRET_PATH || 'admin';
// always present:
'/job-seekers'  -> '/portals/jobs/job-seekers'
'/candidates'   -> '/dashboard/admin/candidates'
'/recruiters'   -> '/dashboard/admin/recruiters'
// only when secretPath is set AND !== 'admin':
`/${secretPath}/:path*` -> '/dashboard/admin/:path*'
`/${secretPath}`        -> '/dashboard/admin'
```

Three consequences the advisor must know:

1. **`/candidates` and `/recruiters` are permanent public-looking aliases for admin pages.** They
   are still guarded by the layout (an anonymous visitor is redirected to `/login`), so this is
   obfuscation, not a hole — but it means those two vanity URLs can never be used for a public
   candidate/recruiter marketing page.
2. The "secret path" is **security through obscurity only**. `/dashboard/admin/*` remains directly
   addressable regardless; the rewrite adds an alias, it does not remove the canonical path.
3. `NEXT_PUBLIC_ADMIN_SECRET_PATH` is a `NEXT_PUBLIC_` variable, i.e. **inlined into the client
   bundle**. The "secret" path ships to every browser.

---

## 3. Authentication & Authorization Lifecycle

### 3.1 The identity resolver — `lib/server-auth.ts` → `getServerUser()`

The single source of server-side identity. Full flow:

```
1. Read HttpOnly cookie `tm_access_token`.  → absent ⇒ return null
2. If process.env.ALLOW_MOCK_AUTH === 'true':
     token 'mock-admin-token' ⇒ synthetic admin  (id adm-uuid-999, role 'admin')
     token 'fake-token'       ⇒ synthetic candidate (id cand-uuid-123)
3. Build InsForge client with anonKey + edgeFunctionToken=token, isServerMode:true
4. insforge.auth.getCurrentUser()  → invalid ⇒ return null
5. SELECT * FROM profiles WHERE id = user.id
6. role := profile.role ?? 'candidate'
7. Return User { id, email, name, role, avatar_url, company_id, created_at,
                 mfa_enabled, password_set_at, is_active (default true),
                 completed_onboarding }
```

Three hardening decisions are documented **in code comments and verified true in code**:

- **The `x-access-token` request header is no longer accepted.** Only the HttpOnly cookie is read.
  (Comment cites `11_Admin_Portal_Audit_And_Remediation` A-1.) ✅ Implementation matches.
- **Mock identities are gated behind `ALLOW_MOCK_AUTH === 'true'`, default off.** A forged
  `mock-admin-token` cookie cannot mint an admin session in production. (Cites `01_Auth_Security_
  Audit_Report` C-2.) ✅ Implementation matches. **Production must never set this flag** — it is a
  total auth bypass by design.
- **Role comes only from the policy-controlled `profiles` table**, never from
  `user.metadata.role` (which is client-writable). (Cites A-3.) ✅ Implementation matches.

### 3.2 Page-level gate — `app/dashboard/admin/layout.tsx`

Server component. Order of operations:

```
1. depth := parseInt(headers()['x-redirect-depth'] ?? '0')
   if depth > 3 ⇒ render inline 403 "redirection loop detected" page, STOP
2. user := getServerUser()
   if !user ⇒ redirect(`/login?rd=${depth+1}`)
3. if role ∉ {admin, super_admin}:
       role === 'recruiter' ⇒ redirect(`/dashboard/recruiter/${user.id}?rd=${depth+1}`)
       else                 ⇒ redirect(`/dashboard/candidate/${user.id}?rd=${depth+1}`)
4. if user.is_active === false ⇒ redirect('/login?reason=suspended')
5. render children
```

The redirect-depth counter is a **loop breaker**: role mismatch between two portals would otherwise
ping-pong forever. Note it is threaded via an `?rd=` query param that some other layer must convert
into the `x-redirect-depth` header — see [§11](#11-what-could-not-be-verified).

Step 4 (suspension) is deliberate: *"A suspended admin keeps a valid session but must lose portal
access immediately."*

**⚠ Discrepancy:** `app/portals/admin/dashboard/layout.tsx` (Tree B) implements only steps 2 and 3,
with no depth breaker and **no `is_active` suspension check**. If Tree B is ever linked, a suspended
admin retains access through it. This is a live latent hole, not a hypothetical.

### 3.3 API-level gate — `lib/api/handler.ts` → `withApi()`

Higher-order wrapper used by the Next.js admin API routes. Pipeline:

```
1. Authentication  — getServerUser(); 401 if requireAuth && !user   (requireAuth defaults true)
2. Authorization   — 403 if allowedRoles set && !allowedRoles.includes(user.role)
3. Query validation — zod safeParse over searchParams; 400 + fieldErrors on failure
4. Body validation  — zod safeParse for POST/PUT/PATCH; 400 on failure or invalid JSON
5. Execute handler(req, { user, body, query, params })
6. Audit — if auditLog && mutating method: logAudit(user.id, method, pathname,
             { status, body_preview })   ← body_preview omitted for DELETE
7. Errors — ZodError ⇒ 400; else 500, message leaked only when NODE_ENV === 'development'
```

Good properties: fail-closed defaults, zod at the trust boundary, error messages not leaked in prod.

### 3.4 Edge-function gate — repeated in each `insforge/functions/admin-*/index.ts`

Every admin edge function independently re-authorizes. Canonical form (verified identical in
`admin-recruiters`, `admin-dashboard`, `admin-jobs`, `admin-candidates`, `admin-companies`,
`admin-settings`, `admin-announcements`, `admin-applications`, `admin-audit-logs`, `admin-blogs`,
`admin-reports`, `admin-audit`, `admin-export-audit`, `admin-recruiter`):

```ts
// 1. CORS preflight
if (req.method === 'OPTIONS') return 204;

// 2. Bearer token required
const token = req.headers.get('Authorization')?.split(' ')[1];
if (!token) return 401;

// 3. TWO clients are constructed:
const insforge    = createClient({ baseUrl, anonKey: SERVICE_KEY, isServerMode: true });
const verifyClient = createClient({ baseUrl, anonKey, edgeFunctionToken: token, isServerMode: true });

// 4. Identity proven with the CALLER's token
const { data: authData } = await verifyClient.auth.getCurrentUser();
if (!authData?.user) return 401;

// 5. Role read with the SERVICE key (RLS-independent)
const { data: profile } = await insforge.database
  .from('profiles').select('role, is_active').eq('id', authData.user.id).single();

if (profile?.role !== 'admin' && profile?.role !== 'super_admin') return 403;
if (profile?.is_active !== true) return 403; // "account is suspended"

// 6. …all subsequent data work uses `insforge` (SERVICE KEY, RLS bypassed)
```

The split-client pattern is correct: the caller's token proves *who*, the service key answers *what
role* without depending on RLS being right. But note the consequence stated in §1: **from step 6
onward there is no database-level authorization at all.** Every admin edge function is a
fully-privileged Postgres session.

### 3.5 Permission matrix — `lib/permissions.ts`

Declares `Role × Resource × Action`:

- Roles: `super_admin`, `admin`, `recruiter`, `candidate`
- Resources: `dashboard, jobs, candidates, recruiters, reports, settings, audit_logs, billing, team`
- Actions: `view, edit, delete, approve, export`
- Helpers: `canAccess`, `canEdit`, `canDelete`, `canPerform`

`super_admin` has all five actions on all nine resources. `admin` is narrower — notably
`billing: ['view']` only, `reports: ['view','export']`, `dashboard: ['view']`.

**⚠ Discrepancy — this matrix is effectively dead code.** The edge functions do not consult it;
they check only `role ∈ {admin, super_admin}` and then permit every operation. A plain `admin`
therefore has, at the API layer, the same power as a `super_admin` — including billing writes,
which the matrix says they must not have. The only place the admin/super_admin split is honoured is
**cosmetic sidebar filtering** in `components/dashboard/OpsDarkSidebarShell.tsx`:

```ts
if (isSuperAdmin) { items.push({ id: 'billing', label: 'Billing & Plans', … }); }
const toolsChildren = [{ label: 'Audit Logs', href: '/dashboard/admin/audit-logs' }];
if (isSuperAdmin) { toolsChildren.push({ label: 'System Settings', href: '/dashboard/admin/settings' }); }
```

Hiding a link is not authorization. A plain `admin` who navigates directly to
`/dashboard/admin/settings` passes the layout guard (`role ∈ {admin, super_admin}`) and every
`admin-settings` edge-function call succeeds. **Treat `admin` and `super_admin` as one privilege
level until this is fixed.**

### 3.6 The standalone admin auth pages — `app/admin/**`

| Route | Guard | Notes |
|---|---|---|
| `/admin/setup` | `validateAdminToken(searchParams.token)` — plain `===` against `process.env.ADMIN_INVITE_TOKEN` | Renders a generic **404 page** on failure rather than 403, to keep the page's existence secret. Renders `AdminSetupForm` on success. |
| `/admin/forgot-password` | none | POSTs to `/api/admin/forgot-password` |
| `/admin/reset-password` | none | POSTs to `/api/admin/forgot-password` |
| `/admin/recruiter-requests` | none at page level | Invokes edge function `admin-recruiter` (`list` / `approve` / `reject`) — which *does* enforce admin |

`lib/admin/token.ts` also exports `isAdminEmail(email)` reading
`NEXT_PUBLIC_ADMIN_EMAILS || ADMIN_EMAILS` (comma list), and `generateAdminToken()` (`crypto.randomUUID`,
dev/seed only).

**Two problems here, both confirmed:**

1. **`validateAdminToken` uses `token === secret`** — a non-constant-time comparison on a
   long-lived secret. Timing-oracle exposure is small over HTTP but this is a bootstrap credential
   for creating admins; use `crypto.timingSafeEqual`.
2. **`/api/admin/forgot-password` does not exist.** `find app/api -name route.ts` returns 36
   routes; there is no `app/api/admin/forgot-password/route.ts`, and `next.config.ts` rewrites do
   not map it. There *is* an edge function `insforge/functions/admin-forgot-password/index.ts` (59
   lines), but the pages fetch the Next path, not the edge path. **Admin password reset is broken
   end-to-end — both pages 404 on submit.**
3. `isAdminEmail` reads a `NEXT_PUBLIC_` variable — the admin email allowlist is shipped to the
   browser bundle.

---

## 4. Route Reference — Every Admin Page

### 4.1 Navigation structure (source: `OpsDarkSidebarShell.tsx`)

```
Overview                     /dashboard/admin
Jobs & Applications          /dashboard/admin/jobs
  ├ All Job Postings         /dashboard/admin/jobs
  ├ Job Approvals            /dashboard/admin/job-approvals
  └ Job Applications         /dashboard/admin/applications
Users & Companies            /dashboard/admin/candidates
  ├ Candidates Directory     /dashboard/admin/candidates
  ├ Recruiters Directory     /dashboard/admin/recruiters
  └ Companies Directory      /dashboard/admin/companies
Content Management           /dashboard/admin/announcements
  ├ Announcements Manager    /dashboard/admin/announcements
  ├ Blog Posts               /dashboard/admin/blogs
  └ Email Templates          /dashboard/admin/email-templates      [stub]
Billing & Plans              /dashboard/admin/plans                [super_admin only]
  ├ Subscription Plans       /dashboard/admin/plans                [stub]
  └ Billing & Invoices       /dashboard/admin/billing              [stub]
System & Audit               /dashboard/admin/audit-logs
  ├ Audit Logs               /dashboard/admin/audit-logs
  └ System Settings          /dashboard/admin/settings             [super_admin only]
Messages                     /dashboard/admin/{roleId|me}/messages
```

**Not in the sidebar but implemented and reachable by URL:**
`/dashboard/admin/verification`, `/dashboard/admin/reports`, `/dashboard/admin/search`,
`/dashboard/admin/notifications`, `/dashboard/admin/companies/register`,
`/dashboard/admin/impersonate`.

`/dashboard/admin/verification` is the **company KYC decisioning queue** — a P0-class operational
screen with a full backend (two hardened API routes + three SECURITY DEFINER RPCs) that **has no
navigation entry at all**. An operator cannot find it without being told the URL.

### 4.2 Per-route detail — Tree A (live)

Every page below is a client component (`'use client'`) unless noted, and every one of them sits
under the layout guard from §3.2.

---

#### `/dashboard/admin` — Overview
- **File:** `app/dashboard/admin/page.tsx` (322 lines)
- **Data:** `useAdminDashboardSummary()` React Query hook → edge fn `admin-dashboard`
  (`action: 'get-summary'`). Shared with the sidebar shell — one fetch, two consumers.
- **Functions:** `handleRefresh()` (invalidate + refetch, tracks `lastUpdated`), `handleRetry()`,
  and a `window` event listener on `'dashboard:invalidate'` — a custom cross-page cache-bust
  channel other admin pages fire after mutations.
- **UI:** `StatCard` KPI row, alerts panel, activity feed, quick actions, tab strip to
  `/dashboard/admin/reports`. Skeletons: `WidgetSkeletons.tsx`. Errors: `DashboardErrorState.tsx`.
- **Auth deps:** `useAuth()` from `lib/auth/AuthContext`.

#### `/dashboard/admin/jobs` — All Job Postings
- **File:** 1,215 lines. **Backend:** `admin-jobs`.
- **Operations:** paginated list (GET with `search, status, department, skill, title, location,
  experience, salary, page, limit, includeMeta`), single approve (`action:'approve'`),
  bulk update (`action:'bulk-update'`), create job (default POST), save/edit (PATCH `?id=`).

#### `/dashboard/admin/job-approvals` — Moderation queue
- **File:** 508 lines. **Backend:** `admin-jobs` + three direct `jobs` count queries for the tab
  badges.
- **Operations:** approve → `{is_approved:true, status:'active'}`; reject →
  `{is_approved:false, status:'closed'}`. Both write `audit_log` **inside the edge function**.

#### `/dashboard/admin/applications`
- **File:** 718 lines. **Backend:** `admin-applications` (GET list; PATCH status; DELETE).
- Also reads `application_status_history` directly for the timeline drawer.

#### `/dashboard/admin/candidates` — Directory + CSV export
- **File:** 1,276 lines. **Backend:** `admin-candidates` + direct DB.
- **Operations:** list (`search, discoverable, page, limit, sort`), `bulk-status`, `bulk-active`,
  `bulk-delete`, PATCH single, DELETE single.
- **Export subsystem (client-orchestrated):**
  ```
  insert  export_jobs
  insert  export_job_items          (relations)
  rpc     claim_export_job(...)     ← advisory lock so two tabs can't double-run
  select  profiles                  (batched row fetch)
  upload  storage bucket 'export-candidates' → jobs/{jobId}.csv
  getPublicUrl(...)
  update  export_jobs               (progress + terminal state)
  ```
  **Architectural note for the advisor:** CSV generation runs **in the browser**. The claim RPC is
  the only concurrency control. This same ~250-line block is **duplicated verbatim** in
  `recruiters/page.tsx` (lines ~2129–2363).

#### `/dashboard/admin/recruiters` — largest page in the portal
- **File:** 3,062 lines — 24% of all admin page code. **Backend:** `admin-recruiters` +
  `/api/admin/send-proposal` + the duplicated export block.
- **Operations:** list, PATCH `is_active`, `approve-setup`, `verify-otp`, `send-credentials`,
  `update-password`, `bulk-status`, `bulk-active`, `bulk-delete`, DELETE single, custom proposal.
- This is the file most affected by any recruiter-side redesign. See
  [§5.1](#51-admin-recruiters--the-recruiter-lifecycle-engine) for the semantics that matter.

#### `/dashboard/admin/companies`
- **File:** 674 lines. **Backend:** `admin-companies` (GET/POST/PATCH) + storage bucket
  `company-logos`.

#### `/dashboard/admin/companies/register`
- **File:** 33 lines — thin shell. Composes `AdminHeader` + `CompanyRegisterForm`
  (`_components/CompanyRegisterForm.tsx`: uploads to `company-logos`, then POSTs `admin-companies`).
  Redirects to `/dashboard/admin/companies` on success.

#### `/dashboard/admin/verification` — Company KYC queue *(not in nav)*
- **File:** 381 lines + `_components/VerificationDecisionModal.tsx`.
- **Backend:** `GET /api/admin/verification/queue`, `POST /api/admin/verification/decide`.
- Loads four parallel counts (`submitted`, `approved`, `rejected`, `needs_more_info`) for tab
  badges, then the filtered page. Decision modal posts one of three decisions with notes.

#### `/dashboard/admin/announcements`
- **File:** 864 lines. **Backend:** `admin-announcements` + `announcement_images` storage.
- POST/PATCH can **fan out**: the edge function selects target `profiles` and bulk-inserts
  `notifications` rows. DELETE cascades `announcement_dismissals` first, then `announcements`.

#### `/dashboard/admin/blogs`
- **File:** 462 lines. **Backend:** `admin-blogs` (table `blog`, singular) + `upload-blog-image`.

#### `/dashboard/admin/notifications` *(not in nav)*
- **File:** 464 lines. Direct reads on `notification_jobs`, `notification_receipts`,
  `notification_templates`; can manually trigger the `notification-worker` edge function and
  requeue failed `notification_jobs`. This is an **ops/debug console**, not an end-user feature.

#### `/dashboard/admin/audit-logs`
- **File:** 257 lines. **Backend:** `admin-audit-logs` (GET `search, page, limit`).
- The function reads `audit_log` then **hydrates actor names via a second `profiles` query**
  (no FK join).

#### `/dashboard/admin/settings` — System Settings *(super_admin in nav only)*
- **File:** 962 lines. The widest blast radius of any admin page.
- **Backend:** `admin-settings` (GET default + `?section=admins`; POST `add_admin` / `update_role`;
  PATCH settings; DELETE admin) **plus direct DB writes** to `profiles`, and direct reads/writes on
  `user_sessions` and `storage_quarantine`.
- Also calls `/api/v1/remote/functions/cleanup-stale-resources` twice — once to **restore** a
  quarantined object, once to **purge**.
- **⚠ Discrepancy:** `admin-settings` writes audit rows to **`audit_logs` (plural)** while
  `admin-jobs`, `/api/impersonate`, and the email-template editor write to **`audit_log`
  (singular)**. Two different audit tables are in use. `admin-audit-logs` (the viewer) reads
  **`audit_log`** — so **every settings/admin-management action is invisible in the audit log
  viewer.** `admin-audit/index.ts` reads `audit_logs`, confirming both tables really exist.
  This is a compliance-grade defect.

#### `/dashboard/admin/search` — Universal search *(not in nav; also a command palette)*
- **File:** 254 lines. Five parallel client-side queries: `profiles` (candidates), `profiles`
  (recruiters), `jobs`, `companies`, `applications`. Surfaced through
  `components/admin/UniversalSearch.tsx` and `components/search/CommandPalette.tsx`.

#### `/dashboard/admin/reports` *(not in nav; reachable via Overview tab)*
- **File:** 629 lines. **Backend:** `admin-dashboard` with `action: 'get-reports'`.

#### `/dashboard/admin/[role_id]/messages`
- **File:** 362 lines. Direct reads on `messages` + `profiles`. The `[role_id]` segment is the
  admin's own user id; the sidebar falls back to the literal string `'me'` when `roleId` is unset —
  which produces the route `/dashboard/admin/me/messages`. **Unverified** whether the page handles
  the non-UUID `'me'` value.

#### `/dashboard/admin/impersonate` — **mock only**
- **File:** 59 lines, 100% hardcoded JSX. No queries, no handlers, three fake users. The Search
  button has no `onClick`. See §2.2 for the real implementation.

#### Stub pages
`/plans`, `/billing`, `/team`, `/email-templates` — each 23 lines rendering
`_components/AdminComingSoonPage.tsx` with title, category, description, icon, `eta: 'Q3 2026'`,
and a `highlights[]` list.

### 4.3 Shared components — `app/dashboard/admin/_components/`

| Component | Role |
|---|---|
| `AdminHeader.tsx` | Title / eyebrow / subtitle / breadcrumbs |
| `AdminComingSoonPage.tsx` | The stub renderer |
| `AdminSectionPlaceholder.tsx` | Empty-state block |
| `AdminStatCard.tsx` | KPI tile |
| `AdminForm.tsx` | Generic form scaffold |
| `BulkConfirmModal.tsx` | Destructive-bulk confirmation gate |
| `CompanyRegisterForm.tsx` | Logo upload → `admin-companies` POST |
| `RecruiterRegisterForm.tsx` | Multi-step: create company → create recruiter → activate → send credentials |
| `RefreshButton.tsx` | Manual refetch + "last updated" |
| `WidgetSkeletons.tsx` | `StatsSkeleton`, `AlertsSkeleton`, `ActivitiesSkeleton`, `QuickActionsSkeleton` |
| `DashboardErrorState.tsx` | `WidgetErrorState`, `StatsErrorState` |

Outside that folder: `components/admin/ImpersonationBanner.tsx`,
`components/admin/UniversalSearch.tsx`, `components/dashboard/OpsDarkSidebarShell.tsx`,
`components/shared/NotificationBell.tsx`, `components/search/CommandPalette.tsx`.

Styling is **CSS Modules per page** (`*.module.css` colocated) — except `impersonate/page.tsx` and
parts of the layout guard, which use large inline `style={{}}` objects.

---

## 5. Backend Reference — Edge Functions

All under `insforge/functions/`, Deno runtime, default-exported `handler(req: Request)`.
All 15 share the §3.4 auth preamble.

| Function | LOC | Methods | Actions |
|---|---|---|---|
| `admin-recruiters` | 722 | GET POST PATCH DELETE | `bulk-status`, `bulk-active`, `bulk-delete`, `approve-setup`, `verify-otp`, `update-password`, `send-credentials`, default-create |
| `admin-settings` | 439 | GET POST PATCH DELETE | `add_admin`, `update_role` |
| `admin-candidates` | 336 | GET POST PATCH DELETE | `bulk-status`, `bulk-active`, `bulk-delete` |
| `admin-announcements` | 293 | GET POST PATCH DELETE | — |
| `admin-dashboard` | 258 | GET POST | `get-summary` (default), `get-reports` |
| `admin-applications` | 249 | GET PATCH DELETE | — |
| `admin-jobs` | 233 | GET POST PATCH DELETE | `approve`, `reject`, `bulk-update`, `bulk-delete` |
| `admin-reports` | 145 | GET | — |
| `admin-companies` | 142 | GET POST PATCH | — |
| `admin-audit-logs` | 141 | GET | — |
| `admin-blogs` | 128 | GET POST PATCH DELETE | — |
| `admin-export-audit` | 122 | GET | — |
| `admin-audit` | 112 | — | reads `audit_logs` |
| `admin-auth-login` | 109 | — | reads `profiles` |
| `admin-recruiter` | 86 | POST | `list`, `approve`, `reject` on `access_requests` |
| `admin-forgot-password` | 59 | — | **orphaned — nothing calls it** |

### 5.1 `admin-recruiters` — the recruiter lifecycle engine

The single most consequential file for a recruiter-side redesign. Read this section in full.

**GET** — paginated recruiter directory.
```
params: search, status, page (0-based), limit (default 25, HARD CAP 100), sort
sort ∈ { newest(default) | oldest | name_asc | name_desc }
search ⇒ .or(`name.ilike.%{s}%,email.ilike.%{s}%`)
```
Two-phase: exact `count` first, then the page. Then a **manual join** — fetch
`recruiter_profiles.select('*, companies(*)').in('id', profileIds)` and stitch in JS, overwriting
each `recruiter_profile.status` with the parent `profiles.status`.
Response ships the array **twice**: `{ items, recruiters, total, page, hasMore, nextCursor: null }`
— `recruiters` is a back-compat alias.

⚠ **`search` is string-interpolated into a PostgREST `.or()` filter with no escaping.** A value
containing `,` `)` or `.` breaks out of the intended predicate. This is filter injection, not SQL
injection (PostgREST parameterises the underlying SQL), but it can still corrupt or widen the
predicate. Same pattern in `admin-candidates`, `admin-jobs`, `admin-companies`, `admin-blogs`,
`admin-applications`, `admin-announcements`. **Fix once, centrally.**

**POST `action: 'approve-setup'`** — the critical path. Accepts `userId, email, name, password,
phone, job_title, company_name, company_website, industry, company_size, company_address,
pan_number, aadhaar_number, emergency_contact_name/phone/address, gstin, tan`.

```
1. Snapshot existing recruiter_profiles.{document_url, kyc_document_url, about}
2. IF password provided && length >= 8:
     a. DELETE auth user   (InsForge Admin API, POST-as-DELETE with serviceKey)
     b. DELETE recruiter_profiles, DELETE profiles
     c. publicClient.auth.signUp({email, password, name})
     d. re-resolve new id: SELECT id FROM profiles WHERE email = lower(email)
     e. finalUserId := new id
3. Company resolve-or-create, matched BY NAME:
     SELECT id FROM companies WHERE name = company_name
     found     ⇒ UPDATE website, industry, size, location, gstin, tan
     not found ⇒ INSERT the same fields
4. UPSERT profiles { id: finalUserId, email, name, role:'recruiter', phone,
                     status:'active', completed_onboarding:true }
5. UPSERT recruiter_profiles { id, company_id, job_title, is_approved:true,
                     pan_number, aadhaar_number, emergency_*,
                     document_url, kyc_document_url, about }   ← restored from step 1
```

**Four things the advisor must weigh before reusing this:**

1. **Password change = delete-and-recreate the user.** There is no update-password call. Consequences:
   the user's **UUID changes**, so every FK pointing at the old id — `applications`, `jobs.created_by`,
   `messages`, `audit_log.actor_id`, `notifications` — is orphaned or violated. Step 1 exists
   specifically because steps 2b destroy the recruiter profile; only three columns are rescued.
   **Everything else on `recruiter_profiles` is silently lost on any password change.**
2. **Not atomic.** Six-plus sequential writes with no transaction. A failure between 2a and 2c
   leaves the recruiter with no auth user and no profile — unrecoverable through the UI.
3. **Company identity is the `name` string.** No normalisation, no GSTIN/CIN uniqueness. "Acme Ltd"
   and "Acme Ltd." become two companies; a typo silently creates a duplicate tenant. For the Indian
   market, **GSTIN/CIN is the natural key** and should be it.
4. **PAN and Aadhaar are written as plain columns.** No encryption or masking is visible at this
   layer. Under the DPDP Act / IT Act these are sensitive personal data. **Verify column-level
   protection in the schema before go-live** — see §11.

**POST `action: 'verify-otp'`** — `insforge.auth.verifyEmail({email, otp})` using the **service
client**, then `UPDATE profiles SET status='active'`. This lets an admin complete a recruiter's
email verification on their behalf.

**POST `action: 'update-password'`** — **⚠ a no-op.** The entire body is:
```ts
const resPayload = { success: true, message: 'Password change requested.' };
```
No password is changed. It returns HTTP 200 with `success: true`. Any UI wired to this action shows
a success toast for an operation that did not happen.

**POST `action: 'send-credentials'`** — emails the recruiter's **plaintext password** inside a
`<code>` block, via `fetch(${baseUrl}/functions/v1/send-email)`. Also returns a **`mailtoUrl`
containing the plaintext password URL-encoded in the mail body**, as a fallback for the admin's
local mail client. Mail-send failure is swallowed (`console.warn`) and the response is still
`success: true`.
Risk: plaintext credentials in transit, at rest in two mailboxes, and in browser history via the
`mailto:`. Replace with a single-use, expiring set-password link.

**POST default (create recruiter)** — requires `email, firstName, companyId`, and a password ≥ 8
chars. Signs up via the **public anon client** (deliberate — avoids service-key signup), resolves
the new id by email lookup, upserts `profiles` with `status:'pending_verification'`, upserts
`recruiter_profiles { id, company_id }`, then always `resendVerificationEmail`. Returns 201.

**PATCH `?id=`** — branch: if `body.is_active !== undefined` → update `profiles.is_active`;
**else the entire raw body is spread into `recruiter_profiles.update(body)`**. No allowlist. Any
column on `recruiter_profiles` — including `is_approved`, `company_id`, `kyc_document_url` — is
writable by any admin through one generic call. Add a field allowlist.

**DELETE `?id=`** — `recruiter_profiles` → `profiles` → InsForge Admin API user delete. Not atomic;
a failure at step 3 leaves an auth user with no profile (which `getServerUser` then resolves to
role `'candidate'`, since `role := profile?.role || 'candidate'`).

**Idempotency** — `admin-recruiters` and `admin-candidates` implement it:
```
header x-idempotency-key
  checkIdempotency: SELECT * FROM idempotency_keys WHERE key = ?
                    hit ⇒ replay {success, idempotent:true, response_hash, response_ref}
  saveIdempotency:  SHA-256 the response body, extract a UUID from
                    payload.{id|candidate.id|recruiter.id|job.id|userId} as response_ref,
                    INSERT into idempotency_keys
```
⚠ The replay returns a **hash and a ref, not the original body** — a client replaying cannot
recover the response payload. And the key is written **after** the work completes, so two
concurrent requests with the same key both execute. It is replay-suppression after the fact, not a
concurrency guard. `admin-jobs`, `admin-companies`, `admin-settings`, `admin-announcements` have no
idempotency at all.

### 5.2 `admin-dashboard`

`action` from POST body, default `'get-summary'`. All counts via `Promise.allSettled` with a
`getValue` helper that degrades a rejected promise to `{count: 0}` — **so a failing query renders
as a zero, not as an error.** An operator cannot distinguish "no pending approvals" from "the
approvals query broke."

- **Common:** `jobs`, `applications`, `profiles(role=candidate)`, `profiles(role=recruiter)`.
- **`get-summary`:** + `recruiter_profiles(is_approved=false)`, `jobs(is_approved=false)`,
  `jobs(status='reported')`, `profiles(created_at > now-24h)`,
  `activity(select id,type,description,created_at, profiles(name) order desc limit 10)`,
  `jobs(is_approved=true AND status='active')`.
- **`get-reports`:** eight status counts over `applications` —
  `applied, reviewing, shortlisted, interviewing, offered, hired, rejected, withdrawn` — plus
  `candidate_profiles` aggregates.

`admin-reports` (145 lines) computes a near-identical set. **Two functions, one metric definition —
they will drift.**

### 5.3 `admin-jobs`

GET filters: `search, status, department, skill, title, location, experience, salary, page,
limit(default 20)`. Base query `jobs.select('*, companies!jobs_company_id_fkey(*)', {count:'exact'})`.
`includeMeta=true` additionally returns `companies(id, name)` for filter dropdowns.

- `approve` → `{is_approved:true, status:'active'}` + `audit_log` insert
- `reject` → `{is_approved:false, status:'closed'}` + `audit_log` insert
- `bulk-update` → `jobs.update(updates).in('id', ids)` — **`updates` is unvalidated**, any column
- `bulk-delete` → `jobs.delete().in('id', ids)` — hard delete, **no audit row**
- PATCH `?id=` → `jobs.update(body)` — again unvalidated
- DELETE `?id=` → hard delete, **no audit row**

⚠ **Approve/reject are audited; delete is not.** The destructive operation is the unaudited one.

⚠ **`limit` has no cap here** (contrast `admin-recruiters`/`admin-candidates`, capped at 100).
`?limit=1000000` is accepted.

### 5.4 `admin-candidates`

GET: `search, discoverable, page, limit (cap 100), sort`. Actions `bulk-status`, `bulk-active`,
`bulk-delete` (cascades `candidate_profiles` → `profiles`); PATCH and DELETE single. Has the
idempotency helpers.

### 5.5 `admin-companies`

GET `search, page, limit(20)` over `companies`; POST create; PATCH `?id=`. Reads an `action` query
param at the top. No DELETE — **companies cannot be deleted through the admin API**.

### 5.6 `admin-settings`

- **GET** — default returns `platform_settings`; `?section=admins` returns admin `profiles`.
- **POST `add_admin`** — touches `profiles`, `admin_members`, `admin_users`, and writes `audit_logs`.
- **POST `update_role`** — updates `profiles`, writes `audit_logs`.
- **PATCH** — updates `platform_settings`, writes `audit_logs`.
- **DELETE** — removes from `profiles` and `admin_users`, writes `audit_logs`.

⚠ **Three admin-identity tables coexist: `profiles`, `admin_members`, `admin_users`.** `add_admin`
writes all three; the Tree-B team page CRUDs only `admin_members`; `getServerUser` and every
authorization check read only `profiles`. **`profiles.role` is the only one that grants access** —
the other two are shadow records that can silently diverge. Any rebuild should collapse these to
one.

### 5.7 `admin-announcements`

GET `search, type, status('active'|'inactive'|''), page, limit(20)`. POST creates and optionally
fans out: select target `profiles` → bulk `notifications.insert(...)`. PATCH updates and can fan out
again. DELETE removes `announcement_dismissals` then `announcements`.

⚠ **The fan-out is an unbounded synchronous bulk insert inside a request-scoped edge function.**
At platform scale (every candidate + every recruiter) this will exceed the function timeout, and
there is no partial-progress tracking — a timeout leaves an unknown fraction of users notified with
no way to resume. This must become a queued job (the `notification_jobs` /
`notification-worker` infrastructure already exists and is the right home for it).

### 5.8 `admin-applications`

GET `search, status(default 'all'), page, limit`. PATCH resolves its target from
`params.id || searchParams.id || body.id` (three sources). DELETE likewise from two.

### 5.9 `admin-audit-logs` / `admin-audit` / `admin-export-audit`

- `admin-audit-logs` — GET `search, page, limit` over **`audit_log`**, then a second `profiles`
  query to hydrate actor names.
- `admin-audit` — reads **`audit_logs`**. Different table.
- `admin-export-audit` — GET `adminId, type(default 'all'), activeTab, from, to` over **`audit_log`**
  + `profiles` hydration.

### 5.10 `admin-recruiter` (singular) — access request queue

POST-only, `action ∈ {list, approve, reject}` over `access_requests`. Consumed **only** by
`/admin/recruiter-requests` (Tree D), which is outside the dashboard shell and unlinked from the
sidebar. Overlaps conceptually with the recruiter approval flow inside
`/dashboard/admin/recruiters`. **Two parallel recruiter-intake paths exist.**

---

## 6. Backend Reference — Next.js API Routes

36 route files total; 4 are admin-relevant.

### `GET /api/admin/verification/queue`
```ts
withApi({ schema: { query: verificationQueueQuerySchema },
          allowedRoles: ['admin','super_admin'] }, …)
```
Uses **`insforgeAdmin`** (service key) — and the code comment explains exactly why, which is worth
quoting because it is the clearest example of documentation matching implementation in this repo:

> *Service key is required: `company_verification_requests` has no platform-admin read policy
> (048 gives `cvr_read_own` to members and `admin_bypass` only to the `project_admin` DB role), so
> a platform admin's own token reads zero rows here.*

Selects `id, company_id, submitted_by, channel, status, kyc_documents, review_notes, created_at,
decided_at, companies(name, gstin, website, status)` with `count:'exact'`, ordered
`created_at desc`, `PAGE_SIZE = 20`, optional `status` filter. Returns
`formatPaginatedResponse(...)`. 500 if `insforgeAdmin` is unconfigured.

### `POST /api/admin/verification/decide`
```ts
withApi({ schema: { body: verificationDecisionSchema },
          allowedRoles: ['admin','super_admin'], auditLog: true }, …)
```
```ts
const RPC_BY_DECISION = {
  approved:         'approve_company_verification',
  rejected:         'reject_company_verification',
  needs_more_info:  'request_more_info_for_verification',
};
```
Uses **`getServerInsforgeClient()` — the caller's own token, not the service key** — and again the
comment states the reason and it checks out: all three RPCs are `SECURITY DEFINER` but gate on
`authz.is_admin()`, which resolves `auth.uid()` from the JWT; a service-key call has no `uid` and
would fail. `withApi`'s `allowedRoles` is the outer gate; `is_admin()` is defense in depth.

Error mapping: `'admin only'` → 403; `'not found'` → **409 `request_not_pending`**; else 500.

**This route is the best-engineered endpoint in the admin surface** — validated input, correct
client choice for the trust model, defense in depth, precise error semantics, audit enabled. Use it
as the reference pattern for the rebuild.

### `POST /api/admin/send-proposal`
```ts
proposalSchema = z.object({
  recruiterId: z.string().uuid().optional(),
  email: z.string().email(),
  name: z.string().default(''),
  company: z.string().default(''),
  features: z.array(z.string()),
  price: z.union([z.number(), z.string()]),
});
withApi({ schema: { body: proposalSchema },
          allowedRoles: ['admin','super_admin'], auditLog: true }, …)
```
Inserts `custom_proposals { recruiter_id, features, price: parseFloat(price) }` (**only if
`NEXT_PUBLIC_INSFORGE_URL` and `INSFORGE_SERVICE_KEY` are both present — otherwise the insert is
silently skipped and the email still sends**), then `sendEmail({ role: 'billing' })` with
`customProposalEmail(...)`. On email failure returns `{ success: true, warning: … }` — a 200 with a
soft warning, not an error.

⚠ `price` accepts `number | string` then `parseFloat`s it. `parseFloat('abc')` is `NaN` → a `NaN`
price row. Money should be `z.number().nonnegative()` or a validated decimal string.

### `POST | DELETE /api/impersonate`

**Not** wrapped in `withApi` — hand-rolled, and correspondingly weaker.

**POST:**
```
1. getServerInsforgeClient() → 401 if null
2. auth.getCurrentUser()     → 401 if invalid
3. insforgeAdmin required    → 500 if unconfigured
4. SELECT role, name, email FROM profiles WHERE id = actor
   role ∉ {admin, super_admin} ⇒ 403
5. const { userId, userRole } = await req.json()      ← NO VALIDATION
6. SELECT name, email FROM profiles WHERE id = userId  (for the log)
7. INSERT audit_log {
     actor_id, action:'user_impersonation_start', target_type:'profile', target_id:userId,
     metadata:{ impersonated_user, impersonated_role, impersonated_name,
                impersonated_email, admin_name, admin_email } }
8. Set three cookies { httpOnly, secure: NODE_ENV==='production', sameSite:'strict', maxAge:3600 }
     impersonating_user_id, impersonating_user_role, admin_user_id
```

**DELETE:** reads `admin_user_id` + `impersonating_user_id` from cookies, inserts
`user_impersonation_end`, deletes all three cookies.

Confirmed weaknesses:
- **No zod validation on `userId` / `userRole`.** `userRole` is caller-supplied and stored in a
  cookie **without being checked against the target's actual `profiles.role`**. Whether that cookie
  is later trusted for authorization is the deciding question — see §11.
- **No `is_active` check on the acting admin.** A suspended admin is blocked by the layout (§3.2
  step 4) and by every edge function, but this route never checks it. It is the one admin entry
  point that a suspended admin can still reach.
- **No guard against impersonating another admin or super_admin.** Privilege escalation:
  `admin` → impersonate `super_admin`.
- **No termination on the server side.** DELETE only clears cookies. There is no server record of
  an *active* impersonation to force-expire, and the 1-hour `maxAge` is the only bound.

`components/admin/ImpersonationBanner.tsx` is the UI affordance for exiting.

---

## 7. Data Model Touched by Admin

Tables and buckets the admin surface reads or writes, from source. **This is a usage map, not the
schema of record** — see `02_Schema_And_Database_Design.md` and verify against the live DB.

**Identity & access:** `profiles` *(authoritative role store)*, `admin_members`, `admin_users`,
`user_sessions`, `access_requests`

**Recruiter & company:** `recruiter_profiles`, `companies`, `company_verification_requests`,
`custom_proposals`

**Candidate:** `candidate_profiles`

**Jobs & pipeline:** `jobs`, `applications`, `application_status_history`

**Content:** `announcements`, `announcement_dismissals`, `announcement_images` *(bucket)*,
`blog`, `email_templates`

**Messaging & notifications:** `messages`, `notifications`, `notification_jobs`,
`notification_receipts`, `notification_templates`

**Billing:** `subscription_plans`, `subscriptions`

**Platform & ops:** `platform_settings`, `activity`, `audit_log` **and** `audit_logs`,
`idempotency_keys`, `export_jobs`, `export_job_items`, `storage_quarantine`

**Storage buckets:** `company-logos`, `announcement_images`, `export-candidates`

**RPCs:** `claim_export_job`, `approve_company_verification`, `reject_company_verification`,
`request_more_info_for_verification`

⚠ Naming inconsistencies confirmed in source, all of which will bite a rebuild:
`audit_log` vs `audit_logs` (two live tables, §5.6); `blog` singular vs every other plural;
`profiles` / `admin_members` / `admin_users` as three overlapping admin registries.

---

## 8. Cross-Cutting Mechanisms

**Client SDK.** `lib/insforge.ts` exports the browser client and `invokeFunction(name, opts)`.
Admin pages call edge functions through it; the user's bearer token rides along automatically.

**Server clients.** `lib/server-insforge.ts` → `getServerInsforgeClient()` (caller's token);
`lib/insforge-admin.ts` → `insforgeAdmin` (service key, may be `null` if env is unset — every
consumer checks and 500s).

**Caching.** React Query. `lib/queries/useAdminDashboardSummary.ts` exports the hook and
`useInvalidateAdminDashboard`. Cross-page invalidation additionally uses a
`window.dispatchEvent(new Event('dashboard:invalidate'))` channel — an ad-hoc second cache-bust
mechanism alongside React Query's own. Consolidate.

**Loading & error UI.** Nearly every admin route ships `loading.tsx`; Tree A's top level and five
sections ship `error.tsx`. Coverage is good and should be preserved.

**CORS.** Each edge function echoes the request `Origin` back:
```ts
const origin = req.headers.get('Origin') || 'http://localhost:3000';
'Access-Control-Allow-Origin': origin,
'Access-Control-Allow-Credentials': 'true',
```
⚠ **This reflects *any* origin with credentials allowed** — the exact configuration the CORS spec
forbids combining. The wildcard-equivalent + credentials pair means any site can make credentialed
cross-origin calls to these functions. The saving grace is that auth rides in an `Authorization`
header rather than a cookie on the edge-function call, so a drive-by site has no token to send —
but this is one refactor away from being a critical hole. **Replace with an explicit origin
allowlist.** The `http://localhost:3000` fallback should not exist in a production build.

**Idempotency.** §5.1. Only two functions; incomplete semantics.

**Audit.** `lib/api/audit.ts` → `logAudit(userId, method, path, meta)`, driven by
`withApi({ auditLog: true })`. Edge functions write their own rows directly — inconsistently, and
to two different tables.

**Export.** Browser-side CSV generation with an RPC-based claim lock, duplicated across the
candidates and recruiters pages. Should be one server-side job.

---

## 9. Functional Requirements Document (FRD)

Format per the project documentation standard. **Status** reflects verified source, not intent.

### FR-1 — Platform Observability

| Field | Detail |
|---|---|
| **Server-side** | `admin-dashboard` (`get-summary`, `get-reports`), `admin-reports` |
| **Client-side** | `/dashboard/admin`, `/dashboard/admin/reports`; `useAdminDashboardSummary`, `StatCard`, `WidgetSkeletons`, `DashboardErrorState`, `RefreshButton` |
| **Requirements** | Global counts (jobs, applications, candidates, recruiters); alert queues (unapproved recruiters, unapproved jobs, reported jobs, 24h signups); 10-item activity feed; 8-state application funnel |
| **Impact if changed** | Metric definitions unify; failed queries surface as errors instead of zeros |
| **Impact if not changed** | `Promise.allSettled` + `getValue` renders every failure as `0` — operators cannot tell "nothing pending" from "query broken". `admin-dashboard` and `admin-reports` duplicate metric logic and will drift |
| **Reason** | Operator trust in the console |
| **Deploy priority** | **P1** |

### FR-2 — Job Moderation

| Field | Detail |
|---|---|
| **Server-side** | `admin-jobs` — GET(8 filters) / `approve` / `reject` / `bulk-update` / `bulk-delete` / PATCH / DELETE |
| **Client-side** | `/dashboard/admin/jobs` (1,215 LOC), `/dashboard/admin/job-approvals` (508 LOC), `BulkConfirmModal` |
| **Requirements** | approve ⇒ `{is_approved:true, status:'active'}`; reject ⇒ `{is_approved:false, status:'closed'}`; both audited. Bulk ops behind confirmation. Featured-job ordering exists only in the orphaned Tree-B page |
| **Impact if changed** | Deletions become auditable; `limit` gains a cap; bulk payloads get an allowlist |
| **Impact if not changed** | Hard deletes leave **no audit trail** — an admin can erase a recruiter's job with no record. `?limit=1000000` is accepted. `bulk-update` writes arbitrary unvalidated columns |
| **Reason** | Moderation is a legal-exposure surface; deletion must be reconstructible |
| **Deploy priority** | **P0** (audit on delete) / **P1** (limit cap, allowlist) |

### FR-3 — Recruiter Lifecycle

| Field | Detail |
|---|---|
| **Server-side** | `admin-recruiters` (722 LOC, 8 actions), `admin-recruiter` (`access_requests`), `POST /api/admin/send-proposal` |
| **Client-side** | `/dashboard/admin/recruiters` (3,062 LOC), `RecruiterRegisterForm`, `/admin/recruiter-requests` |
| **Requirements** | Directory (search/status/sort, cap 100). Create ⇒ `pending_verification` + OTP. `approve-setup` ⇒ company resolve-or-create + activate + `is_approved`. Admin-side OTP verification. Credential issuance. Bulk status/active/delete. Custom INR proposals |
| **Impact if changed** | Password change stops destroying the user identity; company identity becomes GSTIN/CIN-keyed; credentials stop travelling in plaintext; `update-password` stops lying |
| **Impact if not changed** | (a) Password change **deletes and recreates the auth user → new UUID → orphaned FKs** across applications/jobs/messages/audit, and drops every `recruiter_profiles` column except 3. (b) `update-password` returns `success:true` and **does nothing**. (c) `send-credentials` emails a **plaintext password** and returns a `mailto:` URL containing it. (d) Company matched by raw name ⇒ duplicate tenants from a typo. (e) PATCH spreads the raw body into `recruiter_profiles` — `is_approved`/`company_id` freely writable. (f) No transaction: partial failure = unrecoverable state |
| **Reason** | This is the module the recruiter-side redesign lands on; every defect above compounds |
| **Deploy priority** | **P0** for (a)(b)(c)(e); **P1** for (d)(f) |

### FR-4 — Candidate Administration

| Field | Detail |
|---|---|
| **Server-side** | `admin-candidates` (+ idempotency); RPC `claim_export_job`; bucket `export-candidates` |
| **Client-side** | `/dashboard/admin/candidates` (1,276 LOC) |
| **Requirements** | Directory with `discoverable` filter; suspend/activate; bulk delete cascading `candidate_profiles`→`profiles`; async CSV export tracked in `export_jobs`/`export_job_items` |
| **Impact if changed** | Export moves server-side and stops being duplicated |
| **Impact if not changed** | CSV is generated **in the browser** — a closed tab abandons the job; ~250 lines duplicated verbatim in the recruiters page; PII export has no separate audit event |
| **Reason** | Bulk PII egress needs a server boundary and its own audit trail |
| **Deploy priority** | **P1** (dedupe) / **P0** (export audit event, DPDP) |

### FR-5 — Company Management & KYC

| Field | Detail |
|---|---|
| **Server-side** | `admin-companies` (GET/POST/PATCH — **no DELETE**); `GET /api/admin/verification/queue`; `POST /api/admin/verification/decide` → 3 SECURITY DEFINER RPCs |
| **Client-side** | `/dashboard/admin/companies`, `/companies/register`, `/dashboard/admin/verification` + `VerificationDecisionModal`; bucket `company-logos` |
| **Requirements** | Directory + register + logo. Verification queue over 4 states with count badges. Decisions: `approved` / `rejected` / `needs_more_info`, with notes, audited, 409 on already-decided |
| **Impact if changed** | KYC becomes discoverable by operators; GSTIN/CIN becomes the company key |
| **Impact if not changed** | **The verification queue has no navigation entry** — operators cannot reach the KYC screen without the raw URL, so company verification silently does not happen. Companies cannot be deleted or merged, so name-typo duplicates are permanent |
| **Reason** | GSTIN/CIN verification is a compliance gate for the Indian market |
| **Deploy priority** | **P0** (add nav) / **P1** (GSTIN key, merge tooling) |

### FR-6 — Content Management

| Field | Detail |
|---|---|
| **Server-side** | `admin-announcements`, `admin-blogs`, `upload-blog-image`; `email_templates` written directly from Tree C |
| **Client-side** | `/dashboard/admin/announcements` (864), `/blogs` (462); email templates **stubbed in Tree A**, real in Tree C |
| **Requirements** | Announcement CRUD + targeted notification fan-out; DELETE cascades dismissals. Blog CRUD with image upload. Email template list/toggle/edit with `audit_log` |
| **Impact if changed** | Fan-out becomes a queued job; the working template editor becomes reachable |
| **Impact if not changed** | Fan-out is an **unbounded synchronous bulk insert inside an edge function** — it will time out at scale with no resume path and unknown partial delivery. The Email Templates nav link shows "Coming Soon Q3 2026" while a working editor sits in `app/(dashboard)/admin/email-templates/` |
| **Reason** | Announcements are the platform's only broadcast channel |
| **Deploy priority** | **P1** (queue fan-out) / **P2** (rewire template editor) |

### FR-7 — Audit & Compliance

| Field | Detail |
|---|---|
| **Server-side** | `lib/api/audit.ts` `logAudit()`; `withApi({auditLog:true})`; `admin-audit-logs` (reads `audit_log`), `admin-audit` (reads `audit_logs`), `admin-export-audit` |
| **Client-side** | `/dashboard/admin/audit-logs` (257 LOC) |
| **Requirements** | Searchable, paginated log with actor-name hydration; date/type/admin-filtered export |
| **Impact if changed** | One audit table; every destructive action recorded; append-only enforced |
| **Impact if not changed** | **Two tables (`audit_log`, `audit_logs`) both receive writes and the viewer reads only `audit_log`** — every `admin-settings` action (add admin, change role, change platform settings, delete admin) is **invisible in the audit viewer**. Job/candidate/recruiter deletions write nothing at all. Retention and immutability are unverified |
| **Reason** | An audit log with known blind spots is worse than none — it gives false assurance |
| **Deploy priority** | **P0** |

### FR-8 — Platform Settings & Admin Team

| Field | Detail |
|---|---|
| **Server-side** | `admin-settings` (GET / `add_admin` / `update_role` / PATCH / DELETE); direct `user_sessions` + `storage_quarantine`; `cleanup-stale-resources` |
| **Client-side** | `/dashboard/admin/settings` (962 LOC); Team = **stub in Tree A**, real 471-LOC page in Tree B |
| **Requirements** | Platform settings CRUD; admin add/role-change/remove; session listing & revocation; quarantine restore/purge |
| **Impact if changed** | One admin registry; `super_admin` becomes a real privilege boundary |
| **Impact if not changed** | **`admin` and `super_admin` are the same privilege level in practice** — `lib/permissions.ts` is never consulted server-side and the split is enforced only by hiding sidebar links. **Three admin registries** (`profiles`/`admin_members`/`admin_users`) drift, and only `profiles` grants access. All settings mutations land in the unread `audit_logs` table |
| **Reason** | Admin-management is the highest-privilege surface in the product |
| **Deploy priority** | **P0** |

### FR-9 — Billing & Plans

| Field | Detail |
|---|---|
| **Server-side** | Reads `subscription_plans`, `subscriptions` — direct DB from the client, **no admin edge function** |
| **Client-side** | Tree A: two 23-line stubs. Tree B: `plans/page.tsx` (390) + `billing/page.tsx` (586), both functional, both unreachable |
| **Requirements** | Plan CRUD with INR monthly/annual pricing, seat/job/AI-call quotas, popular-flag mutual exclusion, display order, active toggle; subscription/revenue views |
| **Impact if changed** | Plan management becomes usable and gains a server authorization boundary |
| **Impact if not changed** | The Plans/Billing nav (already `super_admin`-only) shows "Coming Soon Q3 2026" while working code exists. Worse: the Tree-B editor **mutates `subscription_plans` directly from the browser** — pricing integrity depends entirely on RLS being correct on that table |
| **Reason** | Pricing is revenue-critical and must not be client-writable |
| **Deploy priority** | **P0** (server boundary before exposing) / **P2** (rewire nav) |

### FR-10 — Impersonation

| Field | Detail |
|---|---|
| **Server-side** | `POST\|DELETE /api/impersonate` — hand-rolled, not `withApi` |
| **Client-side** | Tree A: **mock UI, 3 hardcoded fake users, non-functional Search button**. Tree B: real 209-LOC console. `ImpersonationBanner` |
| **Requirements** | Admin assumes a user's identity for support; both start and end audited; 1-hour cookie TTL |
| **Impact if changed** | Zod-validated target, self-elevation blocked, server-side session record, suspended admins blocked |
| **Impact if not changed** | (a) `userId`/`userRole` **unvalidated**, and `userRole` is stored in a cookie without being checked against the target's real role. (b) **No block on impersonating an `admin` or `super_admin`** ⇒ privilege escalation. (c) **No `is_active` check** — the one admin entry point a suspended admin can still reach. (d) DELETE only clears cookies; no server-side active-session record to force-expire |
| **Reason** | Impersonation is total account takeover by design; it needs the tightest controls in the system |
| **Deploy priority** | **P0** |

### FR-11 — Universal Search

| Field | Detail |
|---|---|
| **Server-side** | None — five parallel client-side queries |
| **Client-side** | `/dashboard/admin/search` (254), `UniversalSearch`, `CommandPalette` |
| **Requirements** | Federated search over candidates, recruiters, jobs, companies, applications |
| **Impact if not changed** | Cross-entity PII search runs **entirely client-side with no server audit event** — an admin can sweep the platform's PII and nothing records it |
| **Deploy priority** | **P1** |

### FR-12 — Notification Ops

| Field | Detail |
|---|---|
| **Server-side** | `notification-worker` edge function |
| **Client-side** | `/dashboard/admin/notifications` (464) — reads `notification_jobs`, `notification_receipts`, `notification_templates`; manual worker trigger; requeue failed jobs |
| **Impact if not changed** | Fine as an internal ops console; **must never be linked into general admin nav** — manual worker triggering can duplicate sends |
| **Deploy priority** | **P2** |

### FR-13 — Admin Bootstrap & Recovery

| Field | Detail |
|---|---|
| **Server-side** | `lib/admin/token.ts` (`validateAdminToken`, `isAdminEmail`, `generateAdminToken`); edge fn `admin-forgot-password` (**orphaned**) |
| **Client-side** | `/admin/setup` (token-gated, 404s on failure), `/admin/forgot-password`, `/admin/reset-password` |
| **Impact if not changed** | **`/api/admin/forgot-password` does not exist** — neither page can submit; **admin password reset is broken end-to-end**. `validateAdminToken` uses non-constant-time `===` on a bootstrap secret. `NEXT_PUBLIC_ADMIN_EMAILS` ships the admin allowlist to the browser |
| **Reason** | A locked-out sole `super_admin` currently has no self-service recovery path |
| **Deploy priority** | **P0** |

---

## 10. Confirmed Defects & Architectural Debt

Every item below is verified against source, with the file to open.

### P0 — must fix before production

| # | Defect | Evidence |
|---|---|---|
| D-1 | **Admin password reset is dead.** Two pages POST `/api/admin/forgot-password`; no such route exists (36 API routes enumerated; no rewrite maps it). | `app/admin/forgot-password/page.tsx:23`, `app/admin/reset-password/page.tsx:129`, `find app/api -name route.ts` |
| D-2 | **Two audit tables; the viewer reads one.** All `admin-settings` mutations write `audit_logs`; the viewer reads `audit_log`. Admin-management is unauditable in the UI. | `admin-settings/index.ts:269,318,411` vs `admin-audit-logs/index.ts:81` |
| D-3 | **Destructive ops unaudited.** `admin-jobs` `bulk-delete`/DELETE, `admin-candidates` deletes, `admin-recruiters` deletes write no audit row. Approve/reject *are* audited. | `admin-jobs/index.ts:208,220`; `admin-candidates/index.ts:220,289` |
| D-4 | **`admin` ≡ `super_admin` at the API layer.** `lib/permissions.ts` is never consulted server-side; the split is sidebar-only. | `lib/permissions.ts` (no server importers); `OpsDarkSidebarShell.tsx:275,291` |
| D-5 | **Password change deletes and recreates the auth user**, changing the UUID and orphaning every FK; only 3 `recruiter_profiles` columns are rescued. Non-atomic. | `admin-recruiters/index.ts` `approve-setup` step 2 |
| D-6 | **`update-password` is a no-op returning `success: true`.** | `admin-recruiters/index.ts` action `update-password` |
| D-7 | **Plaintext passwords emailed**, plus a `mailto:` URL containing the password. Mail failure swallowed, still returns success. | `admin-recruiters/index.ts` action `send-credentials` |
| D-8 | **Impersonation:** unvalidated `userId`/`userRole`; no block on impersonating admins (escalation); no `is_active` check; no server-side session to revoke. | `app/api/impersonate/route.ts` |
| D-9 | **Company verification queue has no navigation entry** — KYC is effectively not performed. | `OpsDarkSidebarShell.tsx` nav array vs `app/dashboard/admin/verification/page.tsx` |
| D-10 | **CORS reflects any Origin with `Allow-Credentials: true`**, falling back to `http://localhost:3000`. | every `insforge/functions/admin-*/index.ts` header block |
| D-11 | **Pricing is client-writable.** The (orphaned) plans editor mutates `subscription_plans` directly from the browser; no server boundary exists. | `app/portals/admin/dashboard/plans/page.tsx:86,90` |
| D-12 | **PAN/Aadhaar written as plain columns** with no visible protection at the API layer. DPDP/IT Act exposure. | `admin-recruiters/index.ts` `approve-setup` step 5 |

### P1 — fix before scale

| # | Defect | Evidence |
|---|---|---|
| D-13 | **Filter injection:** unescaped `search` interpolated into PostgREST `.or()` across 7 functions. | `admin-recruiters/index.ts` GET, and 6 siblings |
| D-14 | **Unbounded synchronous notification fan-out** inside an edge function; no partial-progress tracking. | `admin-announcements/index.ts:167-181, 228-242` |
| D-15 | **Failures render as zeros** on the dashboard (`Promise.allSettled` + `getValue`). | `admin-dashboard/index.ts` `getValue` |
| D-16 | **PATCH spreads raw body** into `recruiter_profiles` / `jobs` — no field allowlist; `is_approved`, `company_id` freely writable. | `admin-recruiters/index.ts` PATCH; `admin-jobs/index.ts:151,203` |
| D-17 | **No `limit` cap in `admin-jobs`** (others cap at 100). | `admin-jobs/index.ts:74` |
| D-18 | **Three admin registries** (`profiles`, `admin_members`, `admin_users`); only `profiles` grants access. | `admin-settings/index.ts:137,152,261` |
| D-19 | **Duplicated export subsystem** — ~250 lines verbatim in two pages; CSV built in the browser. | `candidates/page.tsx:589-822` ≡ `recruiters/page.tsx:2129-2363` |
| D-20 | **Idempotency is replay-suppression only** — returns hash+ref not the body; key written after work, so concurrent duplicates both execute. | `admin-recruiters/index.ts` `checkIdempotency` / `saveIdempotency` |
| D-21 | **Duplicate metric logic** in `admin-dashboard` and `admin-reports`. | both files' `Promise.allSettled` blocks |
| D-22 | **Two recruiter intake paths** — `access_requests` via `admin-recruiter` vs the `admin-recruiters` pipeline. | `admin-recruiter/index.ts:48` vs `admin-recruiters` |
| D-23 | **`price: z.union([number, string])` → `parseFloat`** can persist `NaN`. | `app/api/admin/send-proposal/route.ts` |
| D-24 | **Proposal insert silently skipped** when service-key env is absent; email still sends. | same file, `if (supabaseUrl && serviceKey)` |
| D-25 | **Non-constant-time bootstrap token compare.** | `lib/admin/token.ts` `validateAdminToken` |
| D-26 | **Admin email allowlist and secret path are `NEXT_PUBLIC_`** — both ship to the browser. | `lib/admin/token.ts`; `next.config.ts` rewrites |
| D-27 | **Client-side PII search with no audit event.** | `app/dashboard/admin/search/page.tsx:41-67` |

### P2 — architectural debt

| # | Item | Evidence |
|---|---|---|
| D-28 | **Three parallel admin route trees**, ~2,900 LOC unreachable. | §2 |
| D-29 | **Tree B's guard lacks the `is_active` check and the loop breaker.** | `app/portals/admin/dashboard/layout.tsx` |
| D-30 | **Coming-Soon stubs shadow working implementations** (plans, billing, team, email-templates). | §2.2 |
| D-31 | **Impersonate page in the live tree is pure mock** with hardcoded fake users. | `app/dashboard/admin/impersonate/page.tsx` |
| D-32 | **`recruiters/page.tsx` is 3,062 lines** — a quarter of the admin codebase in one file. | line count |
| D-33 | **Table naming inconsistency** (`blog` singular; `audit_log`/`audit_logs`). | §7 |
| D-34 | **Two cache-invalidation mechanisms** — React Query + a `window` event bus. | `app/dashboard/admin/page.tsx` |
| D-35 | **Inline styles vs CSS Modules** mixed within the same tree. | `impersonate/page.tsx`, `layout.tsx` |

---

## 11. What Could Not Be Verified

Stated explicitly rather than guessed.

1. **RLS policies.** The admin surface bypasses RLS via the service key, so no admin code path
   exercises it. Whether `subscription_plans`, `announcements`, `admin_members`, `email_templates`
   are safe against **direct client writes** (which the orphaned Tree-B pages perform) requires
   reading the live policy set. D-11 is written on the assumption that RLS is the only guard there —
   **confirm against the live database, not the migration files.** (A prior memo in this repo
   records that production DDL was applied out-of-band and the migration ledger is empty.)
2. **PAN/Aadhaar column protection.** No encryption is visible at the API layer. Whether
   pgcrypto/column encryption/masking exists in the schema is unverified. D-12 assumes none.
3. **`x-redirect-depth` header origin.** The layout reads it; the redirects set `?rd=`. The
   component that converts the query param into the header was not located — there is no
   `middleware.ts` at the project root. **If nothing sets that header, the loop breaker never
   fires** and `depth` is permanently `0`.
4. **Whether the `impersonating_user_role` cookie is trusted for authorization.** The route sets it
   from unvalidated input. If any downstream guard reads it as an authorization input, D-8 escalates
   from P0 to critical. Trace every reader of that cookie.
5. **Audit log retention and immutability.** No retention policy or append-only constraint was found
   in application code. Likely a DB-level concern; verify.
6. **`/dashboard/admin/me/messages`.** The sidebar falls back to the literal `'me'` when `roleId` is
   unset. Whether the page tolerates a non-UUID segment was not tested.
7. **Live vs. repo drift.** Edge functions are deployed artifacts. The `insforge/functions/` source
   may not match what is running. **Diff deployed functions against this tree before trusting any
   backend statement here.**
8. **`admin-auth-login` (109 LOC).** Reads `profiles`. No caller was found in the app. Purpose
   unconfirmed — possibly a separate admin login path, possibly dead.
9. **Test coverage.** `__tests__/` and `e2e/` exist and were not analysed. Admin-path coverage is
   unknown.

---

## 12. Rebuild Guidance

Ordered. Each step assumes the previous one.

### Step 0 — Collapse to one route tree *(blocks everything else)*

Pick **Tree A** (`app/dashboard/admin/**`) as canonical: it holds the hardened guard (loop breaker,
`is_active` check, the audit-remediation fixes) and it is what the navigation and the `next.config`
rewrites already target. Then:

1. Port the four working Tree-B/C implementations into Tree A, replacing the Coming-Soon stubs:
   `plans`, `billing`, `team`, `email-templates`.
2. Port the real impersonation console over the mock page.
3. **Delete `app/portals/admin/**` and `app/(dashboard)/admin/**` outright.** Leaving them is worse
   than the stubs — Tree B's weaker guard (D-29) is a live hole the moment anything links to it.
4. Add nav entries for `verification` (D-9, P0), `reports`, `search`.

Until this is done, every other change risks landing in the tree nobody sees.

### Step 1 — Make the privilege model real

- Enforce `lib/permissions.ts` **server-side** — in `withApi` and in each edge function's preamble —
  or delete it and stop implying a boundary that does not exist. Do not leave it as decoration.
- Collapse `profiles` / `admin_members` / `admin_users` into one registry.
- Fix impersonation: zod-validate the target, resolve `userRole` **from the database** rather than
  the request, refuse targets whose role is `admin`/`super_admin`, add the `is_active` check, and
  persist a server-side impersonation session that can be force-expired.

### Step 2 — Make audit trustworthy

- One table. Migrate `audit_logs` → `audit_log` (or the reverse) and update all writers.
- Emit an audit row from **every** destructive path: job/candidate/recruiter delete, bulk delete,
  every settings mutation, every PII export, every universal search.
- Enforce append-only at the database level.

### Step 3 — Rebuild the recruiter lifecycle *(the module the redesign lands on)*

- **Replace delete-and-recreate with a real password-update API call.** The UUID must never change.
- Make `update-password` actually change the password, or remove the action.
- Replace `send-credentials` with a single-use, expiring set-password link. No plaintext password
  ever leaves the system.
- Key companies on **GSTIN/CIN**, not the display name. Add company merge/dedupe tooling.
- Add a field allowlist to every PATCH.
- Wrap `approve-setup` in a transaction or a compensating saga — the current partial-failure state
  is unrecoverable through the UI.
- Decide between the two intake paths (`access_requests` vs the `admin-recruiters` pipeline) and
  delete the loser.

### Step 4 — Harden the edge-function layer

The auth preamble is copy-pasted 15 times. Extract it to one shared module and fix these once:

- Explicit CORS origin allowlist; drop the `localhost:3000` fallback in production builds.
- One escaped search-filter builder (D-13).
- A `limit` cap on every list endpoint.
- Real idempotency: reserve the key **before** doing the work, and store the response body.
- Structured error responses instead of `throw` → generic 500.

### Step 5 — Move heavy work off the request path

- Notification fan-out → the existing `notification_jobs` + `notification-worker` queue.
- CSV export → server-side job. Delete the duplicated browser implementation from both pages.
- One shared metrics module for `admin-dashboard` and `admin-reports`; surface query failures as
  errors, never as `0`.

### Step 6 — Fix admin bootstrap

- Create `app/api/admin/forgot-password/route.ts` (or repoint the pages at the existing
  `admin-forgot-password` edge function) — **admin password reset does not work today.**
- `crypto.timingSafeEqual` for the bootstrap token.
- Move `NEXT_PUBLIC_ADMIN_EMAILS` and `NEXT_PUBLIC_ADMIN_SECRET_PATH` to server-only env vars.

### Patterns worth keeping

Not everything needs replacing. These are good and should survive the rebuild:

- **`POST /api/admin/verification/decide`** — the reference endpoint. Zod at the boundary, correct
  client for the trust model (caller's token because the RPC needs `auth.uid()`), defense in depth
  via `authz.is_admin()`, precise error mapping including 409 for already-decided. Model new
  endpoints on it.
- **The split-client auth preamble** (caller's token proves identity, service key reads role) — the
  right shape; it just needs to be extracted rather than duplicated.
- **`withApi`** — fail-closed defaults, zod validation, prod error suppression, built-in audit hook.
  Extend it, don't replace it. Hand-rolled routes like `/api/impersonate` are where the bugs are.
- **The `loading.tsx` / `error.tsx` coverage** across nearly every route.
- **The layout guard's redirect-depth loop breaker** — assuming §11 item 3 resolves.
- **`claim_export_job`** as a concurrency primitive — keep the RPC, move the work server-side.

---

**Document status:** Every claim traced to source at the cited path. Items that could not be
traced are listed in [§11](#11-what-could-not-be-verified) rather than asserted.

**Companion documents:** `01_Auth_Security_Audit_Report.md`, `02_Schema_And_Database_Design.md`,
`03_API_Routes_And_Endpoints.md`, `11_Admin_Portal_Audit_And_Remediation.md`,
`12_Admin_Portal_Functional_And_Calculation_Audit.md`,
`12_Admin_Production_Readiness_Execution_Plan.md`. Where any of those disagree with this document,
**this document reflects what the code does** — treat the others as intent.
