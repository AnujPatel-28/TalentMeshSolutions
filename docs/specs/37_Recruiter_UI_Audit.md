# 37 — Recruiter UI Audit (Static, Read-Only)

**Scope:** Next.js recruiter-facing UI only. `insforge/functions/` (edge functions) is explicitly out of scope — another audit covers it. No login was performed; everything below is static source-code analysis. Repo: `tm-main`, branch `fix/edge-fn-isservermode`.

---

## 1. Verdict

**Not shippable as-is.** The recruiter UI has a real, well-built core (Jobs, Interviews, Offers, Pipeline, NVite, Job posting, Settings profile/company tabs all do genuine data fetching with reasonable loading/empty states), but three classes of problems block launch: (a) a **fabricated-data problem** bigger than the known `ai_match_rate=85` precedent — the entire Reports page and the Messages "context" panel are invented, and a new `Math.random()`-based fake AI-match score is shown to recruiters as if real; (b) a **routing/architecture split-brain** — the app silently serves three different implementations of the recruiter portal depending on whether a request is a hard navigation or a client-side transition, and the one reached via hard navigation for NVite/Offers/Job-detail has no server-side approval gate at all; and (c) the documented "recruiters in the same company share visibility" model is **not what the code does** — almost every per-item recruiter page (NVite, Offers, Interviews, Pipeline, Candidates sub-tabs, Draft/Published/Expired Jobs) is scoped to the individual `recruiter_id`, not the company, so teammates cannot see each other's work. The dashboard tabs are **not fully correct**: one top-level nav item ("Smart Sourcing") points at routes that do not exist anywhere in the codebase, and it isn't even in the architecture doc's own information-architecture table.

---

## 2. Tab / navigation table

Live nav source: `components/dashboard/OpsDarkSidebarShell.tsx` (`recruiterNav`, lines 168–239). This is the shell actually rendered — see §5 for why `app/dashboard/DashboardLayoutClient.tsx`'s nav definition is dead and irrelevant.

| Tab | Target route(s) | Route exists? | Renders real data? | Verdict |
|---|---|---|---|---|
| Jobs → All Job Postings | `/jobs` | Yes | Yes (company-scoped via `/api/jobs?scope=company`) | OK |
| Jobs → Post a New Job | `/jobs/post-job` | Yes | Yes | OK |
| Jobs → Draft/Published/Expired | `/jobs?tab=drafts\|published\|expired` | Yes (query param on same page) | Yes | OK, but see §5 — dedicated `/jobs/drafts`,`/jobs/published`,`/jobs/expired` pages still exist unlinked with different (individual-scoped) queries |
| Jobs → Job Templates | `/jobs/templates` | Yes | No — static hardcoded template gallery (acceptable use of static content for a template picker) | OK (not a data-integrity issue) |
| **Smart Sourcing → Sourcing Overview** | `/sourcing` | **No route exists anywhere in the repo** | N/A | **Dead link (404)** |
| **Smart Sourcing → Search Candidates** | `/sourcing/search` | **No route exists** | N/A | **Dead link (404)** |
| Candidates → Candidates Database | `/candidates` | Yes | Yes | OK |
| Candidates → Shortlisted/On Hold/Saved | `/candidates?tab=...` | Yes (query param) | Yes, but **individually scoped**, see Finding F-05 | Partially broken (collaboration) |
| Candidates → Hiring Pipeline | `/pipeline` | Yes | Yes, but individually scoped | Partially broken |
| Candidates → NVite Inbox | `/nvite` | Yes | Yes, but individually scoped | Partially broken |
| Interviews → Scheduled Interviews | `/interviews` | Yes | Yes | OK |
| Interviews → Offers Manager | `/offers` | Yes | Yes, but individually scoped | Partially broken |
| Analytics → Analytics Dashboard | `/reports` | Yes | **No — 100% hardcoded** | **Broken (fake data)** |
| Analytics → Spend Snapshot | `/reports?tab=spend` | Route exists but page **ignores the `tab` query param entirely** — renders identical hardcoded content | No | **Dead differentiation** — the two nav entries are indistinguishable |
| Tools → Messages Inbox | `/messages` | Yes | Yes for the conversation list; **context sidebar is fake**, see F-08 | Partially broken |
| Tools → System Notifications | `/notifications` | Yes | Delegates to `NotificationCenter` component (not audited in depth; thin wrapper) | Not fully verified |
| Tools → Settings | `/settings` | Yes | Mostly real (Profile/Company/Hiring/Privacy); Billing tab hardcoded | Partially broken |
| Tools → TalentMesh Main Site | `/` (external) | Yes | N/A | OK |

**Orphan pages (exist, no nav entry anywhere):** `/candidates/search`, `/candidates/saved`, `/candidates/shortlisted`, `/jobs/drafts`, `/jobs/published`, `/jobs/expired`. All reachable by direct URL; all do real (if narrower/duplicated) queries. Not dead code, just unlinked and partially redundant with the tabbed views the live nav actually uses.

**Answer to "are the dashboard tabs correct and complete?": No.** "Smart Sourcing" is broken (two dead links) and isn't part of the documented IA (`06_Recruiter_Portal_Architecture.md` lists no Sourcing section). "Spend Snapshot" is a nav entry with no distinct behavior. Everything else in the nav resolves to a real route, but several of those routes silo data per-recruiter in a way that contradicts the documented multi-recruiter model (§4).

---

## 3. Findings (most severe first)

### F-01 — P0 — Unapproved/suspended recruiters can bypass the approval gate for NVite, Offers, and Job Detail
**Files:** `proxy.ts` lines 481–538 (esp. 521–537); `app/company/[companyId]/recruiter/[recruiterId]/` (no `layout.tsx` anywhere under `app/company/`, confirmed via `find`).

**Evidence:** `proxy.ts` rewrites `app.*`/`/recruiter/*` traffic to `/dashboard/recruiter/${recruiterId}${relativePath}` **except** for NVite, Offers, and specific job-detail paths, which it silently rewrites instead to a completely different route tree:
```ts
const isNvite = cleanRelativePath === '/nvite' || cleanRelativePath.startsWith('/nvite/');
const isOffers = cleanRelativePath === '/offers' || cleanRelativePath.startsWith('/offers/');
...
if (isNvite || isOffers || isSpecificJobDetail) {
  targetPath = `/company/${recruiterCompanyId}/recruiter/${recruiterId}${relativePath}`;
}
return rewrite(new URL(targetPath, request.url), request);
```
The gate applied just before this rewrite (lines 482–489) only checks `isAuthenticated` and `role ∈ {'recruiter','super_admin','admin'}` — it does **not** check `company_members.status === 'active'` or `companies.status === 'verified'`, unlike `app/dashboard/recruiter/[role_id]/layout.tsx` (lines 30–51), which is the sole place that check lives. Because `app/company/[companyId]/recruiter/[recruiterId]/` has **zero** `layout.tsx` in its ancestry, a request routed there never passes through that check.

**Why it matters:** A recruiter whose company is still `pending` verification, or whose own membership is `invited`/`suspended`, is correctly bounced to `/pending-approval` for every route under `/dashboard/recruiter/[role_id]/…` — but can reach `/recruiter/nvite`, `/recruiter/offers`, or a specific job's detail page (which proxy silently serves from `app/company/.../recruiter/.../`) with no app-layer approval check at all. Whether InsForge RLS independently blocks the underlying queries is **not verified** (out of scope — DB policy review overlaps the parallel edge-function audit).

**Risk:** P0 (access-control gap, contradicts the explicit design intent stated in `01_Auth_Security_Audit_Report.md`/`06_Recruiter_Portal_Architecture.md` that "all authz in layout RSCs").

**Fix:** Either (a) add a `layout.tsx` under `app/company/[companyId]/recruiter/[recruiterId]/` that performs the same `getServerUser()` + `company_members`/`companies` check as `app/dashboard/recruiter/[role_id]/layout.tsx`, or (b) stop routing any traffic to that tree and consolidate NVite/Offers/Job-detail back into `app/dashboard/recruiter/[role_id]/` (see F-11/F-12 on why two parallel trees exist at all).

---

### F-02 — P0 — Reports page is 100% fabricated data, presented as real analytics
**File:** `app/dashboard/recruiter/[role_id]/reports/page.tsx` (all 109 lines — no data fetching of any kind, no `useEffect`, no `invokeFunction`).

**Evidence:**
```tsx
<span className={styles.statVal}>18 days</span>           {/* Avg. Time to Hire */}
<span className={styles.statVal}>82%</span>                {/* Offer Accept Rate */}
<span className={styles.statVal}>$4,200</span>              {/* Cost per Hire — USD, not INR */}
<span className={styles.statVal}>4.5/5</span>               {/* Candidate Quality */}
...
{ label: 'Applications Received', value: 234, bar: '100%', color: '#3b82f6' },
{ label: 'Screened', value: 156, bar: '67%', color: '#60a5fa' },
...
{ source: 'LinkedIn', hires: 6, pct: '40%' },
```
Every number on the entire page — the four stat cards, the six-stage hiring funnel, and the four-row "Top Sources" table — is a literal constant. There is no loading state, no empty state, and no error state, because there is nothing being fetched.

**Why it matters:** This is the nav's "Analytics Dashboard" — a recruiter will see identical numbers regardless of company, regardless of whether they've posted zero jobs or a thousand. It also uses `$` (USD), directly contradicting the project's Indian-market requirement (INR/GSTIN throughout — every other money value in the codebase, e.g. `offers/page.tsx`, correctly uses `Intl.NumberFormat('en-IN', {currency:'INR'})`).

**Risk:** P0 (worse than the previously-known `ai_match_rate=85` precedent — that was one field; this is an entire page).

**Fix:** Wire to a real `recruiter-reports`/`analytics` endpoint or remove the page/nav entries until built. At minimum, do not ship static numbers under a "Reports" label.

---

### F-03 — P0 — Fabricated `Math.random()` "AI Match" score shown as real
**File:** `app/dashboard/recruiter/[role_id]/candidates/page.tsx`, lines 189 and 220 (two independent occurrences in the same file).

**Evidence:**
```tsx
match: cp?.ai_match_score || (85 + Math.floor(Math.random() * 15)),
```
Rendered as a color-coded "AI Match" column (green ≥80%, blue ≥60%) with a star icon — visually indistinguishable from a genuine score. Every time the tab re-fetches, a candidate's displayed match percentage can change at random.

**Why it matters:** This is the same fabricated-metric pattern already flagged once (`ai_match_rate` hardcoded to 85), but worse: it's randomized per-render rather than a flat constant, so it looks "alive" and convincingly real to a recruiter deciding who to shortlist.

**Risk:** P0.

**Fix:** Render "—" / "Not scored" when `ai_match_score` is null; never synthesize a number.

---

### F-04 — P0 — `pending-approval` page polls the legacy, largely-empty `recruiter_profiles` table
**File:** `app/dashboard/recruiter/[role_id]/pending-approval/page.tsx`, lines 20–31.

**Evidence:**
```tsx
const { data } = await insforge.database
    .from('recruiter_profiles')
    .select('is_approved')
    .eq('id', user.id)
    .single();
if (data?.is_approved) {
    router.push(`/dashboard/recruiter/${user.id}`);
}
```
This runs every 30 seconds while the user is on the pending-approval screen. But the actual, current source of truth — enforced by both `app/dashboard/recruiter/[role_id]/layout.tsx` and `app/dashboard/recruiter/layout.tsx` — is `company_members.status === 'active'` AND `companies.status === 'verified'`, per doc 14's explicit statement that the legacy `recruiter_profiles` pipeline was killed.

**Why it matters:** Per prior session notes, `recruiter_profiles` is missing rows for the large majority of recruiters. A recruiter who is correctly approved via `company_members`/`companies` will likely never satisfy this client-side poll (no row, or `is_approved` false/null), so they sit on "Auto-refreshing status..." indefinitely and must manually navigate away or hard-refresh (which re-runs the *correct* server-side layout guard and would let them in). This is a distinct, verified occurrence of the same legacy-table class of bug already tracked for the onboarding flow, but manifesting here in the recruiter UI's own pending-approval page.

**Risk:** P0 for UX-breaking (recruiters stuck indefinitely after being approved); not a security hole (fails closed, not open).

**Fix:** Replace the query with the same `company_members` + `companies` check the layout uses, or better, have the layout's redirect chain be the only source of truth and drop the client poll's own approval decision.

---

### F-05 — P0 — Multi-recruiter collaboration is broken: most pages scope data to the individual recruiter, not the company
**Files (all confirmed by direct `.eq('recruiter_id', ...)` / `.eq('jobs.recruiter_id', ...)` on the signed-in user's own id):**
- `app/dashboard/recruiter/[role_id]/nvite/page.tsx` line 34
- `app/dashboard/recruiter/[role_id]/offers/page.tsx` line 32
- `app/dashboard/recruiter/[role_id]/interviews/page.tsx` line 374
- `app/dashboard/recruiter/[role_id]/pipeline/page.tsx` line 36
- `app/dashboard/recruiter/[role_id]/candidates/page.tsx` lines 81, 88, 95, 102, 116, 123, 172 (shortlisted/on-hold/rejected/saved tabs + job filter options)
- `app/dashboard/recruiter/[role_id]/candidates/saved/page.tsx` line 21, `shortlisted/page.tsx` line 21
- `app/dashboard/recruiter/[role_id]/jobs/drafts/page.tsx` line 28, `published/page.tsx` line 26, `expired/page.tsx` line 27

**Evidence (representative):**
```tsx
// pipeline/page.tsx
.select('id, candidate:..., jobs!inner(title, recruiter_id), status, applied_at')
.eq('jobs.recruiter_id', user.id)   // NOT company-scoped
```

**Why it matters:** `docs/.../06_Recruiter_Portal_Architecture.md` §"Collaboration rules" states explicitly: *"Recruiter A and Recruiter B in the same company both see all **company** jobs and applicants"*. The code does the opposite in essentially every page except the main Jobs list (`/jobs?scope=company`) and the "All Candidates" tab (delegates to an edge function, not directly verifiable here). For any company with more than one recruiter — which the product's own "Team" concept in `company_members` assumes — colleagues cannot see each other's pipeline stage, scheduled interviews, sent offers, or NVites, and each recruiter's "Shortlisted/On Hold/Saved" candidate views are silently incomplete (missing everyone else's shortlists).

**Risk:** P0 (product-breaking for the documented multi-tenant/multi-recruiter use case; not a crash, but a silent, wrong-answer bug — recruiters will believe they're seeing "the pipeline" when they're seeing a fraction of it).

**Fix:** Change these queries to scope by `jobs.company_id` (or company-membership) rather than the individual `recruiter_id`, with edit/delete permissions still restricted per the "recruiter edits only their own jobs" rule doc 06 also states.

---

### F-06 — P1 — "Smart Sourcing" nav item is entirely dead
**File:** `components/dashboard/OpsDarkSidebarShell.tsx` lines 183–192.
```tsx
{ id: 'sourcing', label: 'Smart Sourcing', href: `/dashboard/recruiter/${roleId}/sourcing`, ...
  children: [
    { label: 'Sourcing Overview', href: `/dashboard/recruiter/${roleId}/sourcing` },
    { label: 'Search Candidates', href: `/dashboard/recruiter/${roleId}/sourcing/search` }
  ]
}
```
Confirmed via `find "app/dashboard/recruiter/[role_id]"` that no `sourcing` directory exists anywhere. Clicking this main nav section (2nd item, always visible) or either child 404s. It is not in `06_Recruiter_Portal_Architecture.md`'s information-architecture table either — this was added to the live shell without ever being built or documented.

**Risk:** P1 (highly visible — it's a top-level, always-expanded-looking nav category).
**Fix:** Either build `/sourcing` (likely meant to reuse `/candidates/search`) and point the nav at it, or remove the nav item until it exists.

---

### F-07 — P1 — "Invite"/NVite links are broken in two places (systemic, not a typo)
**Files:** `app/dashboard/recruiter/[role_id]/candidates/page.tsx` line 485; `app/dashboard/recruiter/[role_id]/candidates/search/page.tsx` line 405.
```tsx
<a href={`/recruiter/nvite/compose?candidate_id=${c.id}`} ...>
```
`app/recruiter` does not exist as a top-level route (confirmed via `find`). The correct path used everywhere else in the app is `/dashboard/recruiter/${roleId}/nvite/compose`. Both occurrences are plain `<a>` tags (not even a Next.js `<Link>`), so this always produces a real full-page 404 navigation, not a soft client error.

**Risk:** P1 (core "invite a sourced candidate" action is broken from two of the three candidate-browsing surfaces).
**Fix:** `` `/dashboard/recruiter/${roleId}/nvite/compose?candidate_id=${c.id}` `` in both files.

---

### F-08 — P1 — Messages "context" sidebar is hardcoded fake data
**File:** `app/dashboard/recruiter/[role_id]/messages/page.tsx` lines 297–343.
```tsx
<div style={{ fontSize: '0.75rem', ... }}>Software Engineer</div>
...
<div>Senior Frontend Developer</div>
<div>Mumbai, India</div>
...88% Match...Interviewing...
{['React', 'TypeScript', 'Node.js', 'Next.js'].map(skill => ...)}
...
<span className={styles.fileName}>📄 resume_jane.pdf</span>
```
`Conversation` (the only real state available, defined lines 9–16) has no job/application/skills/attachment fields at all — this panel is not driven by any data, real or fetched; it is static markup that renders identically for every conversation.

**Risk:** P1 (misleading — looks like real ATS context tied to the conversation, isn't).
**Fix:** Either fetch the actual linked application/candidate context for the selected conversation, or remove the panel.

---

### F-09 — P1 — Job "Manage" link denies access to teammates' jobs
**Files:** `app/dashboard/recruiter/[role_id]/jobs/[job_id]/page.tsx` line 59; duplicated in `app/company/[companyId]/recruiter/[recruiterId]/jobs/[job_id]/page.tsx` line 44.
```tsx
if (job.recruiter_id !== user?.id) {
    return ( ... "Access Denied" ... );
}
```
`jobs/page.tsx` (the company-wide Jobs list, `scope=company`) links every row's "Manage" action to this same detail page regardless of who posted it. Any recruiter clicking "Manage" on a colleague-posted job sees a false "Access Denied," even though they can see it in the list.

**Risk:** P1 (contradicts doc 06's stated per-role permission model, where only *editing* should be owner-restricted, not *viewing*/managing within the company).
**Fix:** Scope the check to company membership for read access; keep ownership (or company-admin role) checks only for destructive/edit actions.

---

### F-10 — P1 — Settings "Billing & Subscriptions" tab is hardcoded fake data
**File:** `app/dashboard/recruiter/[role_id]/settings/page.tsx` lines 565–618.
```tsx
<div style={{ fontWeight: 600 }}>Enterprise Plan</div>
<div>Renews on July 15, 2026</div>
...Active...
<input placeholder="billing@company.com" defaultValue="billing@company.com" />
```
No fetch, no save handler wired for this section (the page's `handleSaveAll` only touches `recruiter-profile`/`company-profile` endpoints). A company admin sees a specific fake plan name and fake renewal date presented as their real subscription state.

**Risk:** P1 (financial/billing information being fabricated is a trust problem, even pre-launch).
**Fix:** Wire to a real billing/subscription source, or replace with an explicit "Billing coming soon" placeholder.

---

### F-11 — P1 — Two more parallel recruiter-portal trees exist, and which one serves a request depends on navigation type
**Files:** `app/dashboard/recruiter/[role_id]/{nvite,offers,jobs/[job_id]}` vs. `app/company/[companyId]/recruiter/[recruiterId]/{nvite,offers/[offer_id],jobs/[job_id]/interview-guide}`.

**Evidence:** Per `proxy.ts` (F-01), a **hard navigation / full page load / deep link / bookmark** to `/dashboard/recruiter/[role_id]/nvite` (or `/offers`, or a job-detail URL) gets 302-redirected to `/recruiter/dashboard/...` and then internally rewritten to `/company/{companyId}/recruiter/{recruiterId}/...` — a different file, different component, different query shape (e.g. `app/company/.../nvite/page.tsx` selects `candidate:candidate_profiles(*)` instead of `candidate:profiles!candidate_id(...)`). A **client-side `<Link>` transition** from within the dashboard (which is how every internal nav item is built, all pointing at `/dashboard/recruiter/${roleId}/...`) fetches the RSC payload directly and is not subject to that redirect (`if (!isRsc)` guards it), so it renders the `app/dashboard/recruiter/[role_id]/...` version instead. Additionally, `app/company/.../offers/[offer_id]/page.tsx` (a dedicated offer-detail page) and `.../jobs/[job_id]/interview-guide/page.tsx` have **no equivalent at all** under `app/dashboard/recruiter/[role_id]/`.

**Why it matters:** The same URL a user bookmarks, refreshes, or shares can render two genuinely different implementations with different bugs, different auth exposure (F-01), and in two cases (offer detail, interview guide) functionality that simply disappears depending on how you got there.

**Risk:** P1 (architecture-level; compounds F-01's severity).
**Fix:** Pick one tree. Given `app/dashboard/recruiter/[role_id]/` has the working layout guard and is what all in-app links point to, retire the `app/company/[companyId]/recruiter/[recruiterId]/` tree (after porting the offer-detail and interview-guide pages it uniquely has) and stop the proxy's `isNvite/isOffers/isSpecificJobDetail` special-case rewrite.

---

### F-12 — P2 — Integrations page is entirely decorative
**File:** `app/dashboard/recruiter/[role_id]/integrations/page.tsx`.
`Connect`/`Disconnect` only flips a local `useState` (`connected` record) — no network call anywhere in the file. State resets on every page refresh. Presented under a real product-sounding pitch ("Connect your favourite tools to streamline your recruitment workflow").
**Risk:** P2 (not deceptive about business-critical data, but misleading about product capability).
**Fix:** Either implement real OAuth connections or label the page "Coming soon."

---

### F-13 — P2 — Orphan pages duplicate logic with narrower (individually-scoped) data than their tabbed replacements
**Files:** `jobs/drafts/page.tsx`, `jobs/published/page.tsx`, `jobs/expired/page.tsx` (all `.eq('recruiter_id', user.id)`) vs. `jobs/page.tsx`'s `?tab=` views (`scope=company`); `candidates/saved/page.tsx`, `candidates/shortlisted/page.tsx` vs. `candidates/page.tsx?tab=`.
No nav item links to any of these six pages (confirmed against `OpsDarkSidebarShell`'s full `recruiterNav`), but they're live routes. A bookmarked link to any of them will show an incomplete, individually-scoped subset of what the equivalent tab shows.
**Risk:** P2.
**Fix:** Delete these six files (once F-05's company-scoping fix lands, they'd be doubly wrong) or redirect them to the corresponding `?tab=` URL.

---

### F-14 — P2 — "View All Applicants" button is non-functional
**File:** `app/dashboard/recruiter/[role_id]/jobs/[job_id]/page.tsx` lines 123–125. Plain `<button>` with no `onClick`.
**Risk:** P2.

---

### F-15 — P2 — `analytics/` route is an incomplete scaffold
**Path:** `app/dashboard/recruiter/[role_id]/analytics/` contains only `error.tsx` and `loading.tsx`, no `page.tsx`. Not linked by nav (which uses `/reports`). Visiting it directly 404s (no page boundary to render).
**Risk:** P2 (leftover, harmless unless someone links to it).

---

### F-16 — P3 — Settings "Team" section is documented but not built
`06_Recruiter_Portal_Architecture.md` lists `Team* → .../settings/team (company-admin only)` in its information architecture. The actual `settings/page.tsx` tab list (lines 269–275) has no `team` entry, and no `activeTab === 'team'` branch exists anywhere in the file, despite the `activeTab` TypeScript union still including `'team'` as a possible (dead) value.
**Risk:** P3 (missing feature, not a bug in what exists).

---

## 4. Known-issue cross-reference (not separately scored, per audit brief)

The already-known `applications?select=...&job.recruiter_id=eq...` 400 pattern (embedding via an **alias** — `job:jobs!inner(...)` — then filtering with `.eq('job.recruiter_id', …)`) appears in the recruiter UI at:
- `app/dashboard/recruiter/[role_id]/page.tsx` lines 57–64 (`fetchApplicationsQueue`, the "Response Manager — New Applications Queue" widget on the recruiter's own home dashboard).

This is the **same bug class** already flagged as known and out of scope for re-reporting, but flagging its exact location matters: if it 400s, the home dashboard's main queue widget silently shows nothing (caught by a `try/catch` that only `console.error`s, no user-facing error state — see also F-17 below).

Pages that use the **table name** (not an alias) in the same filter position — `jobs!inner(title, recruiter_id)` + `.eq('jobs.recruiter_id', ...)` (pipeline, candidates, shortlisted, offers via `jobs(title)`) — were **not verified at runtime**; whether InsForge/PostgREST resolves that form correctly is assumed, not confirmed.

**F-17 — P3 (related, minor) — silent-fail on the home dashboard queue:** `page.tsx`'s `fetchApplicationsQueue` catches its own error and only `console.error`s (line 69-71); the UI shows an empty "Applications Queue Empty 🎉" state indistinguishable from a real empty state. If the known 400 above fires, a recruiter with a full applications queue would see a cheerful "you're all caught up" message instead of an error.

---

## 5. Doc vs. implementation divergences

| Doc claim | Source | What the code actually does | Which is right |
|---|---|---|---|
| "`app/dashboard/recruiter/[role_id]/layout.tsx` returns a pass-through client wrapper and never calls `getServerUser()`" (H-9, P0-2 open) | `06_Recruiter_Portal_Architecture.md` §Background, §"The server guard" | The **current** `layout.tsx` already implements almost exactly the guard the doc proposes as the fix (`getServerUser()`, `company_members`/`companies` check, redirect to `/pending-approval`) | **Code is right / doc is stale** — P0-2 has shipped since the doc was written (2026-07-16); the doc's checklist item should be marked done. |
| "the portal is currently disabled behind a `coming-soon` rewrite in `proxy.ts`" | same doc, §Purpose | `proxy.ts` has no coming-soon rewrite; a comment confirms it was intentionally removed ("Phase 5... the coming-soon rewrite is removed now that the portal is complete and security-verified") | **Code is right / doc is stale.** |
| Information architecture table lists: Overview, Jobs, Pipeline, Candidates, Interviews, Offers, Invitations, Messages, Reports, Team*, Company*, Settings — **no Sourcing section** | `06_Recruiter_Portal_Architecture.md` §"Information architecture" | Live nav (`OpsDarkSidebarShell`) has a "Smart Sourcing" section with two dead links (F-06); doc's "Team*" settings section does not exist in code (F-16) | **Neither matches the other** — code added an unbuilt section the doc never asked for, and skipped a section the doc did ask for. |
| "Recruiter A and Recruiter B in the same company both see all **company** jobs and applicants (RLS `jobs_select_company`, `apps_company_view`)" | `06_Recruiter_Portal_Architecture.md` §"Collaboration rules" | Nearly every page other than the main Jobs list filters by the signed-in recruiter's own id (F-05) | **Doc describes the intended/correct behavior; code does not implement it.** |
| "Reads go through the insforge proxy client (RLS scopes them to the company automatically — no client-side `company_id` filtering needed)" | same doc, §"Data fetching" | Code does the opposite: hand-rolled client-side `.eq('recruiter_id', ...)` filters everywhere (F-05) | **Doc describes intended pattern; code violates it.** |
| `05_UI_Components_And_Pages.md`: "These pages exist — the work is wiring them to the `03` endpoints... (e.g., `reports/`)" | `05_UI_Components_And_Pages.md` line 36 | `reports/page.tsx` is still 100% unwired/static (F-02) | **Doc correctly predicted this gap; it was never closed.** |

---

## 6. Likely-dead code

| Path | Evidence | Confidence |
|---|---|---|
| `app/dashboard/DashboardLayoutClient.tsx` (1006 lines) | `LayoutSwitcher.tsx` (the component `app/dashboard/layout.tsx` actually renders) branches only to `CandidateTopNavShell` or `OpsDarkSidebarShell` — never to `DashboardLayoutClient`. `grep -r "DashboardLayoutClient"` across all `.tsx` finds only the file's own definition, zero importers. It contains its own separate, **stale** recruiter-approval check reading `recruiter_profiles.is_approved` (same legacy-table problem as F-04) and its own separate, disagreeing `getRecruiterNav()`. | High |
| `app/portals/app/company/[companyId]/recruiter/[recruiterId]/{analytics,candidates,layout.tsx,onboarding,pending-approval,pipeline}` | Would only be reachable at literal URL path `/portals/app/company/...`. `proxy.ts`'s rewrite targets are `/dashboard/recruiter/...` or `/company/{companyId}/recruiter/{recruiterId}/...` — never `/portals/app/company/...`. Repo-wide grep for `"portals/app/company"` returns zero hits outside this directory itself. Reads as an earlier, abandoned scaffold of the same portal (it even has its own `layout.tsx`, `onboarding/`, `pending-approval/` — a full mini-app in miniature). | High |
| `app/dashboard/recruiter/[role_id]/analytics/` (error.tsx + loading.tsx, no page.tsx) | Not linked by nav; no `page.tsx` means the route boundary can't render anything if hit directly. | High (this one is unambiguous — Next.js requires a `page.tsx` to have a routable page) |
| `app/dashboard/recruiter/[role_id]/{jobs/drafts,jobs/published,jobs/expired,candidates/saved,candidates/shortlisted}` | Not linked from the live nav (`OpsDarkSidebarShell`); nav uses `?tab=` on the parent page instead. Still reachable and functional via direct URL — **orphaned, not dead.** | Medium (functional but unreferenced; conservative call is "orphan" not "dead") |

---

## 7. Could not verify (explicit)

- **Any runtime/authenticated behavior.** No login was performed anywhere in this audit; every finding above is from reading source, not from observing the app run. Everything phrased as "would 404" / "would show fake data" is a static-analysis inference from route existence and code paths, not an observed HTTP response.
- **Whether InsForge RLS independently blocks unapproved recruiters** from the `app/company/[companyId]/recruiter/[recruiterId]/` tree identified in F-01/F-11. If RLS enforces `company_members.status = 'active'` at the row level regardless of the app-layer gate, the practical severity of F-01 is lower (still a defense-in-depth gap, but not a live data leak). RLS policy review is out of this audit's scope (Next.js UI only) and overlaps the parallel edge-function/backend audit.
- **Whether the `candidates` edge function** (`invokeFunction('candidates')`, used by `candidates/page.tsx`'s "All" tab and `candidates/search/page.tsx`) returns a genuine computed `match` score or another instance of fabricated data. Edge function internals are explicitly out of scope for this audit.
- **`/api/jobs`, `/api/jobs/[id]/close`, `/api/jobs/[id]/publish`, `/api/consent`, `/api/consent/withdraw`** — these Next.js API routes are called from recruiter pages (`jobs/page.tsx`, `settings/page.tsx`) but their server-side implementations were not read as part of this audit (route handlers under `app/api/`, adjacent to but not squarely "recruiter UI").
- **Whether `.eq('jobs.recruiter_id', ...)` (real table name, not alias) reliably works** in InsForge/PostgREST, as used by `pipeline/page.tsx`, `candidates/page.tsx`, `candidates/shortlisted/page.tsx`, `offers/page.tsx` (via `.jobs(title)`). This is assumed to be the *working* counterpart to the known-broken alias form, based on the pattern difference alone — not confirmed by any runtime test.
- **`components/notifications/NotificationCenter.tsx`** (rendered by `notifications/page.tsx`) was not read in depth — only confirmed the page is a thin 10-line wrapper around it.
- **Mobile responsiveness beyond table overflow.** Confirmed `DataTable` wraps content in `overflow-x: auto` (`components/dashboard/DataTable.module.css`), so wide tables scroll rather than break layout. Did not audit every page's CSS module for fixed-width elements below common mobile breakpoints beyond this spot-check.

---

## References

Files read in full or substantially: `proxy.ts`; `app/dashboard/layout.tsx`, `LayoutSwitcher.tsx`, `DashboardLayoutClient.tsx`; `components/dashboard/OpsDarkSidebarShell.tsx`; `app/dashboard/recruiter/layout.tsx`; `app/dashboard/recruiter/[role_id]/{layout.tsx,RecruiterLayoutClient.tsx,page.tsx,pending-approval/page.tsx,reports/page.tsx,integrations/page.tsx,messages/page.tsx,settings/page.tsx,jobs/page.tsx,jobs/[job_id]/page.tsx,jobs/{drafts,published,expired,templates}/page.tsx,candidates/{page.tsx,saved/page.tsx,shortlisted/page.tsx,search/page.tsx},interviews/page.tsx,interviews/[interview_id]/page.tsx,pipeline/page.tsx,nvite/page.tsx,nvite/compose/page.tsx,offers/page.tsx,notifications/page.tsx}`; `app/company/[companyId]/recruiter/[recruiterId]/{offers/page.tsx,nvite/page.tsx,jobs/[job_id]/page.tsx}`; `docs/specs/{05_UI_Components_And_Pages.md,06_Recruiter_Portal_Architecture.md}`.
