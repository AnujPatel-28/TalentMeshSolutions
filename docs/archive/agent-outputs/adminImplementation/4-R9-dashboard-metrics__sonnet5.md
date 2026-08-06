# R-9 — Dashboard & reports: one metric truth · model: Sonnet 5 · phase: 3 · date: 2026-07-20

## Prompt given

Implement R-9 from `docs/specs/14_Admin_Portal_Rebuild_Architecture.md`:
extract a shared `insforge/functions/_shared/metrics.ts` used by `admin-dashboard` and `admin-reports`
(D-21); replace `Promise.allSettled` + zero-degradation with per-metric `{value}|{error:true}` results
(D-15); add Company-First KPIs (pending verifications, companies-by-status, active-job slots vs
`plan_limits.max_active_jobs`); confirm F-5 (fabricated `avgTimeToHire`/"Operational" banner) is done;
client-side: `StatCard` gets a distinct error state, Review Queue panel gets a verification-queue card,
and the dead `window` `'dashboard:invalidate'` event bus is removed in favor of React Query invalidation
(D-34). Run `tsc --noEmit`, `tsc -p insforge/tsconfig.json`, `vitest run`, `playwright test` and paste
verbatim output.

## What changed

### F-5 check (before starting, per instructions)

Already done — `docs/archive/agent-outputs/adminImplementation/2-F5-docs-cleanup__haiku.md` (Haiku 4.5,
2026-07-20) removed `avgTimeToHire` from both edge functions and the "Operational" banner from
`app/dashboard/admin/page.tsx`. Verified current source has neither. No action taken.

### D-34 finding: the event bus had zero dispatchers

`grep -r "dashboard:invalidate"` found exactly one call site: the `addEventListener` in
`app/dashboard/admin/page.tsx`. No file anywhere calls `window.dispatchEvent(new Event('dashboard:invalidate'))`
— it's a listener for an event nothing fires. All real cross-page invalidation already goes through
`useInvalidateAdminDashboard()` / React Query's own cache. Removed the dead listener; no replacement
needed since there was nothing to replace.

### D-21 finding: `admin-reports` has no frontend caller

`app/dashboard/admin/reports/page.tsx` calls `admin-dashboard` with `{ action: 'get-reports' }`, not the
standalone `admin-reports` function. `admin-reports` is deployed (`scripts/deploy_edge_functions.mjs`)
but `grep -r "'admin-reports'"` across `app/`, `lib/`, `components/` returns nothing. It duplicates
`admin-dashboard`'s counting logic exactly (D-21) with zero consumers. **Not deleted** — R-9 as spec'd
names it as one of the two files metrics.ts must serve, and CLAUDE.md says flag pre-existing dead code
rather than remove it unasked. **[SUGGESTION]** delete `admin-reports` (function + `deploy_edge_functions.mjs`
line 50 + `metadata_full.json` entry) once confirmed no external/future caller is planned — until then it
now shares `_shared/metrics.ts` so at least the duplication is gone.

### Server: `insforge/functions/_shared/metrics.ts` (new)

`MetricResult<T> = { value: T } | { error: true }`, `unwrap()`, `toCountMetric()` (wraps one count
query), plus:
- `getCoreCounts(db)` — totalJobs/totalApplications/totalCandidates/totalRecruiters, each a `MetricResult<number>`.
- `getApplicationStatusCounts(db)` / `getTopSkills(db)` — the funnel/status-breakdown/skills logic that
  was byte-for-byte duplicated between `admin-dashboard`'s `get-reports` branch and `admin-reports`.
- `getPendingVerifications(db)` — counts `company_verification_requests` where
  `status IN ('submitted','under_review')`, mirroring the verification queue page's own definition of
  "pending" (`app/dashboard/admin/verification/page.tsx` comment: "submitted + under_review").
- `getCompaniesByStatus(db)` — counts `companies` grouped by the four `status` values from migration 046.
- `getActiveJobSlots(db)` — `used` = count of `jobs.status='active'`; `limit` = sum, over every
  non-deactivated company, of that company's current `plan_limits.max_active_jobs` (via its
  `trialing`/`active` subscription, defaulting to `'free'` — same fallback `enforce_active_job_limit()`
  uses in migration 050). No new RPC/migration; two small reads (`plan_limits` is 1 row today, companies
  are 6 live rows per project memory) plus a JS reduce.

### Server: `admin-dashboard/index.ts`

- `get-summary` (the live path `app/dashboard/admin/page.tsx` and `DashboardLayoutClient.tsx` consume):
  `metrics.{totalJobs,activeJobs,totalApplications,totalCandidates,totalRecruiters}` are now each a
  `MetricResult<number>` (**wire-format change**, see Client section). Added `companyKpis: { companiesByStatus,
  activeJobSlots }` (also `MetricResult`-wrapped). Added `alerts.pendingVerifications: number` (kept as a
  plain number like the other alert counts — the Review Queue panel only has a whole-widget error state,
  not per-row, so there's nothing for a per-field error to drive here).
- `get-reports` branch (consumed by `app/dashboard/admin/reports/page.tsx` for chart data): now built from
  the shared `getApplicationStatusCounts`/`getTopSkills`, but the **response contract is unchanged** — still
  plain numbers throughout, since nothing there renders a StatCard-style error tile and changing it would
  have been scope creep with no consumer to benefit.

### Server: `admin-reports/index.ts`

Rebuilt on `getCoreCounts`/`getApplicationStatusCounts`/`getTopSkills`. Response shape intentionally left
as plain numbers (same reasoning as `get-reports` above) since this endpoint has no caller to define a
contract for.

### Client: `lib/queries/useAdminDashboardSummary.ts`

Added `MetricResult<T>`, `metricValue(m, fallback)`, `metricFailed(m)` (exported — a second consumer
needed them, see below). `AdminDashboardData.metrics.*` retyped to `MetricResult<number>`; added
`companyKpis: { companiesByStatus: MetricResult<CompaniesByStatus>; activeJobSlots: MetricResult<ActiveJobSlots> }`;
`alerts.pendingVerifications: number` added. `FALLBACK_DASHBOARD` (the `placeholderData` shown before the
first fetch resolves) uses `{ value: 0 }` neutrals, not `{ error: true }`, so nothing flashes a false error
state on initial load.

### Client: `components/dashboard/StatCard.tsx` + `.module.css`

New `error?: boolean` prop. When true: value renders `—` in `.valueError` (reuses
`--tm-status-error-text`, the same token `.deltaNegative` already uses), delta area replaced with "Failed
to load" in the existing `.deltaNegative` style. This is the tile-level error state the doc asks for,
distinct from the whole-panel `StatsErrorState`/`WidgetErrorState` that already existed for a total fetch
failure.

### Client: `app/dashboard/admin/page.tsx`

- Removed the dead `dashboard:invalidate` `useEffect`/listener (D-34).
- Every `metrics.*` StatCard now reads through `metricValue()`/`metricFailed()` and passes `error={...}`.
- Two new StatCards: "Companies" (value = verified count, delta = `"N verified · N pending · N suspended"`,
  links to `/dashboard/admin/companies`) and "Job Slots Used" (value = `"used/limit"`). `.stats` is a
  4-column CSS grid (`shared-dashboard.module.css`); 6 cards wrap to a second row of 2 — no CSS touched,
  acceptable per the existing responsive rules (2-col at ≤992px, 1-col at ≤480px already exist).
- Review Queue panel: new row for `alerts.pendingVerifications` linking to `/dashboard/admin/verification`
  (spec'd placement), folded into the existing "anything pending?" condition and the "All Caught Up" copy.

### Client: `app/dashboard/DashboardLayoutClient.tsx` — bug caught by the contract change, fixed

This file is the **second** consumer of `useAdminDashboardSummary` (sidebar shell; the hook's own comment
says "Shared with the sidebar shell — one fetch, two consumers"). It computed
`adminSummaryData?.metrics?.totalJobs || 0` etc. for `adminCounts`, which feeds `SUPER_ADMIN_NAV(adminCounts, ...)`
nav badge counts. With `metrics.totalJobs` now `{value:15}` instead of `15`, `|| 0` would have kept the
*object* (truthy) and fed it straight into nav badges — not caught by any existing test, only found by
grepping every consumer of the changed type. Fixed with the same `metricValue()` helper. `alerts.*` reads
in this file were untouched (alerts stayed plain numbers).

## SQL authored

None. No migration needed — `company_verification_requests`, `companies.status`, `plan_limits`, and
`subscriptions` all already exist (migrations 046/048/050).

## Verification

```
$ npx tsc --noEmit
app/dashboard/candidate/[role_id]/applications/page.tsx(686,37): error TS2322: ... (framer-motion Variants)
EXIT: 1
```
Single pre-existing error, identical to the one documented in `2-F5-docs-cleanup__haiku.md` — unrelated to
this change (framer-motion typing on a candidate page this task never touched).

```
$ npx tsc -p insforge/tsconfig.json
EXIT: 0
```

```
$ npx vitest run
 Test Files  7 passed (7)
      Tests  44 passed (44)
EXIT: 0
```

```
$ npx playwright test --reporter=list
  41 passed
  7 skipped
EXIT: 0
```
The 7 skips are pre-existing (`[needs real-JWT fixture]` / candidate onboarding flow gated on external
state) — unrelated to this change. `e2e/dashboard.spec.ts` (8/8) is the file the prompt called out
specifically; all pass, including the exact assertions named at risk: stat-card values (`15`,
`10 cand. + 5 rec.`), Review Queue rows (`Approval Requests`, `Job Reviews`), `Failed to Load` /
`Review Queue Error` whole-widget states, and the retry-cooldown button sequence.

**Note on the verification run itself:** `playwright.config.ts`'s `webServer` runs `npm run start`
(serves the existing `.next` production build, does not rebuild). The first run against a stale build hit
two failures — a Next.js error boundary ("Minified React error #31 ... object with keys {value}"),
because a stale bundle predating the wire-format change was still running. Ran `npm run build` first, then
the suite above is against that fresh build. Flagging this because it's easy for a future task to get a
false "all green" or false "broken" result here depending on build freshness — worth a `pretest: npm run build`
in `package.json` if this class of task recurs. **[SUGGESTION]**, not applied (out of scope, touches CI).

## Deviations / assumptions

- `get-reports` (admin-dashboard) and `admin-reports`'s own response shapes were **not** converted to
  `MetricResult` — only `get-summary`'s `metrics`/`companyKpis` were, because those are the only fields
  StatCard tiles render. Converting the chart-feeding endpoints too would have meant reshaping
  `app/dashboard/admin/reports/page.tsx`'s funnel/growth/topSkills rendering for no stated benefit.
- `alerts.*` (including the new `pendingVerifications`) stayed plain numbers, not `MetricResult` — the
  Review Queue panel has only a whole-widget error state today (`WidgetErrorState` on total fetch
  failure), not a per-row one, so wrapping would add a type nobody reads differently.
- "Active-job slots vs plan" interpreted as a **platform-wide** capacity stat (used = all active jobs,
  limit = sum of every non-deactivated company's entitlement), not a per-company number — the admin
  dashboard is platform-wide everywhere else, and R-12 (billing UI) doesn't exist yet to make a
  per-company framing meaningful here.
- "Companies" StatCard shows the *verified* count as its headline number (not total companies) since
  that's the "healthy" number an operator wants at a glance; pending/suspended surface in the delta line.

## Open questions for the advisor

1. Should `admin-reports` be deleted now that it's confirmed to have zero callers (D-21 also flagged this
   as a bigger cleanup than "share the logic")? Left as a [SUGGESTION] per protocol — didn't want to
   remove a deployed function unasked.
2. Is the platform-wide framing for "active-job slots vs plan" the intended one, or did the doc mean a
   per-company breakdown (which would need a list/table, not a single StatCard)?
3. Worth adding `pretest: "npm run build"` (or an explicit note in the runbook) so `playwright test`
   verification runs never silently serve a stale `.next` build — this cost a full debug cycle today.

## Outcome

**Ready to ship.** Shared metrics module in place (D-21), per-metric error truth on the live dashboard
path (D-15), Company-First KPIs added, dead event bus removed (D-34), F-5 reconfirmed already fixed. All
four verification commands pass (one pre-existing, unrelated tsc error noted above). Caught and fixed one
real latent bug (`DashboardLayoutClient.tsx` nav badges) that the contract change would otherwise have
introduced silently.
