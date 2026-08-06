# 12 — Admin Portal Functional & Calculation Audit

**Date:** 2026-07-18
**Scope:** Admin functionality — does each module *do the right thing*: correct math, correct state flow, no dead/fake features. Complements `11_Admin_Portal_Audit_And_Remediation.md` (which covers guards/auth). This doc does **not** repeat the security findings; it covers logic and flow.
**Method:** Source-verified. Each finding cites file + line.
**Verdict:** Backend plumbing works; several **numbers shown to admins are wrong or fabricated**, two modules are empty shells, and `is_active` (suspension) is enforced inconsistently across edge functions.

---

## Finding Register

| ID | Module | Finding | Priority |
|----|--------|---------|----------|
| F-1 | Dashboard | "Active Jobs" counts **all** jobs, not active ones | P1 |
| F-2 | Dashboard vs Reports | "Total Applications" differs between two screens (withdrawn) | P2 |
| F-3 | Reports | "Week 1–4" growth chart is not weekly; oldest bucket absorbs all history | P1 |
| F-4 | Reports | `statusBreakdown` mislabels data — `offered` folded into `applied`, `hired`/`withdrawn` dropped | P1 |
| F-5 | Dashboard/Reports | `avgTimeToHire`, `platformUptime`, `appsPerJob` denominator — hardcoded/fabricated | P2 |
| F-6 | Job Approvals | "Rejected" == any `closed` job (dup of A-11); counts drift under optimistic update | P1 |
| F-7 | Edge functions | `is_active` suspension gate missing on 5 of ~16 admin functions | P0 |
| F-8 | Billing / Plans | Both are `AdminComingSoonPage` stubs — no functionality | P2 (scope) |
| F-9 | Settings | Session revoke / profile-delete / quarantine purge write **direct from browser** | P1 |
| F-10 | Messages | Conversation list loads **every** message for the user into the browser and groups client-side | P2 |
| F-11 | Dashboard | `newUsers24h` computed by backend, never rendered | P3 |

---

## F-1 — "Active Jobs" is really "All Jobs"

**Evidence** — `insforge/functions/admin-dashboard/index.ts:73`:

```ts
db.database.from('jobs').select('*', { count: 'exact', head: true }),   // no status filter
```

The card in `app/dashboard/admin/page.tsx:158` labels this `Active Jobs` with sub-text `"Active published listings"`. It includes drafts, paused, closed, reported, and unapproved jobs. The number is inflated versus what the label promises.

**Fix:** add `.eq('status','active').eq('is_approved', true)` to the count, or relabel the card "Total Jobs". Pick one meaning and make label + query agree.

---

## F-2 — Two screens report different application totals

**Evidence** — dashboard uses raw count (`admin-dashboard/index.ts:242` → `totalApplications: totalApps`), while the reports action subtracts withdrawn (`:187` → `totalApplications: totalApps - withdrawn`). Same metric name, two values, depending on which page the admin is on.

**Fix:** decide whether "Total Applications" includes withdrawn, then use the same expression in both branches.

---

## F-3 — Growth chart buckets are not weeks

**Evidence** — `admin-dashboard/index.ts:162–182`:

```ts
if (ageMs > 3 * oneWeekMs)      w1Count++;   // everything older than 3 weeks
else if (ageMs > 2 * oneWeekMs) w2Count++;
else if (ageMs > oneWeekMs)     w3Count++;
else                            w4Count++;
```

`w1Count` is not "Week 1" — it is *every candidate older than three weeks*, i.e. the entire back-catalogue. As the platform ages, "Week 1" grows without bound and the cumulative line (`:177–182`) looks like healthy growth even when zero new candidates joined. The chart tells the opposite of the truth on any account older than a month.

**Fix:** bucket by absolute calendar window from `now` (last 4 discrete weeks) and **exclude** anything older, or relabel axis honestly ("> 3 wks / …"). Also note it counts `candidate_profiles` rows, not `profiles` — candidates without a profile row are invisible here.

---

## F-4 — `statusBreakdown` mixes unrelated statuses

**Evidence** — `admin-dashboard/index.ts:202–207`:

```ts
statusBreakdown: {
  applied:     applied + reviewing + offered,   // 'offered' counted as 'applied'
  shortlisted: shortlisted,
  interview:   interviewing,
  rejected:    rejected
}                                                 // 'hired' and 'withdrawn' silently dropped
```

An offered candidate is late-stage, not "applied". Folding `offered` into `applied` understates the pipeline's progress and overstates top-of-funnel. `hired` and `withdrawn` vanish entirely, so the four segments don't sum to the funnel or to total applications. Any pie/bar built on this is wrong.

**Fix:** one bucket per real status; if the UI needs coarse stages, define them explicitly and make them partition the set (every application in exactly one bucket).

---

## F-5 — Fabricated / misleading metrics

**Evidence** — `admin-dashboard/index.ts`:
- `:190` `avgTimeToHire: '18 Days'` — string literal, not computed.
- `:246` `platformUptime: '99.98%'` — literal; surfaced as "Operational / All services working" (`page.tsx:314`), which is not a health check.
- `:191` `appsPerJob: (totalApps - withdrawn) / totalJobs` — divides withdrawn-adjusted apps by **all** jobs (incl. drafts/closed), so the ratio is against the wrong denominator.

**Fix:** compute `avgTimeToHire` from `application_status_history` (applied→hired deltas) or remove the card; drive platform status from a real probe or delete the banner; divide apps by *active* jobs.

---

## F-6 — "Rejected" queue = any closed job (confirms A-11)

**Evidence** — `job-approvals/page.tsx:64–68` and `admin-jobs/index.ts:86–87` both define rejected as `is_approved=false AND status='closed'`. A recruiter who merely *closes* an unapproved job (filled elsewhere, expired) lands in the admin **Rejected** tab though no admin rejected it. The optimistic count math (`job-approvals/page.tsx:148–157`) assumes a job always moves into the tab implied by the action, which the shared `closed` state can't guarantee; the 30 s poll (`:112`) hides the drift.

**Fix:** as A-11 — add an explicit `approval_status` column (`pending|approved|rejected`) and filter all three tabs and counts on it. Separate moderation state from publication state.

---

## F-7 — Suspension (`is_active`) enforced on only some edge functions

**Evidence** — the `is_active !== true → 403` gate is present in `admin-jobs`, `admin-candidates`, `admin-recruiters`, `admin-companies`, `admin-settings`, `admin-audit`, `admin-audit-logs`. It is **absent** in:

- `admin-dashboard/index.ts` (role check only, `:54`)
- `admin-applications/index.ts` (role check only, `:60`) — includes status mutation and **DELETE**
- `admin-blogs`, `admin-announcements`, `admin-reports`, `admin-export-audit`

So a *suspended* admin still reads the full dashboard, edits/deletes applications, and manages content. This contradicts doc 11's premise that the edge layer uniformly enforces `is_active`, and combined with A-2 (layout doesn't check it either) means suspension is only partial. This is the incident-response/offboarding lever — it must be all-or-nothing.

**Fix:** extract the token→profile→role→`is_active` preamble into one shared helper and call it from every `admin-*` function. The copy-paste divergence is the root cause; a shared guard removes it permanently.

---

## F-8 — Billing and Plans are empty shells

**Evidence** — `billing/page.tsx` and `plans/page.tsx` render `AdminComingSoonPage` ("Q3 2026"). No data, no actions. For a paid SaaS these are core, but they are out of the current functional scope. Flagging so they aren't mistaken for working. (Note per doc 11 A-9/A-10: the orphaned `/portals/admin/dashboard/billing/actions.ts` may hold the only real billing code — diff before deleting that tree.)

**Fix (scope decision):** either build them or hide their sidebar entries until built, so admins aren't shown dead tabs in production.

---

## F-9 — Settings mutations run direct from the browser (subset of A-7)

**Evidence** — `settings/page.tsx`: session rename `:364`, **session revoke** `:383` (`user_sessions.revoked_at`), quarantine restore `:401`, quarantine **purge** `:430` (`storage_quarantine.status='deleted'`) — all via `insforge.database.update(...)` from a `'use client'` component. Security angle is A-7 (no audit log, RLS is the only guard). **Functional** angle: revoke sets `revoked_at` but there is no verification that any session-check path actually reads it, and purge flips a status then fires a fire-and-forget `cleanup-stale-resources` call whose failure is swallowed (`.catch(console.error)`), so the UI reports "purged successfully" even if the file was never deleted.

**Fix:** move these to an `admin-settings` edge action that performs the DB write **and** the physical purge in one transaction and returns real success/failure; stop reporting success on a fire-and-forget.

---

## F-10 — Messages list is an O(all-messages) client fetch

**Evidence** — `[role_id]/messages/page.tsx:34–72`: pulls **every** row where the user is sender or receiver, sorts and groups by partner in the browser to build the conversation list. Fine at demo volume; at scale this ships the admin's entire message history to the client on every open and grows unbounded. Unread counts are also computed only from whatever was fetched.

**Fix:** a `get-conversations` edge/RPC that returns the grouped last-message + unread-count per partner (one row per conversation), paginated.

---

## F-11 — Computed metric never shown

**Evidence** — `admin-dashboard/index.ts:230,253` computes `newUsers24h`; the type carries it (`useAdminDashboardSummary.ts:25`); no component renders it. Either surface it (it's a useful "new signups today" stat) or drop the query — right now it's wasted work.

---

## Removal / Cleanup Candidates (functional)

| Item | Rationale |
|---|---|
| Hardcoded `avgTimeToHire`, `platformUptime`, "Operational" banner | Fabricated numbers shown as real (F-5) |
| `newUsers24h` query **or** add a card | Computed, never displayed (F-11) |
| Billing / Plans sidebar links | Point at empty shells in production (F-8) |
| Client-side conversation grouping | Replace with server aggregation (F-10) |

---

## Recommended Order

1. **F-7** (P0) — unify the `is_active` guard across all `admin-*` functions (shared preamble). Fixes a real suspension hole and prevents future drift.
2. **F-1, F-3, F-4, F-6** (P1) — the four wrong-number bugs admins actually look at. F-6 shares the schema fix with A-11.
3. **F-9** (P1) — make settings purge/revoke report truthful success and log.
4. **F-2, F-5, F-10** (P2) — reconcile the app-total, replace fabricated metrics, server-side conversations.
5. **F-8, F-11** (P2/P3) — scope decision on billing/plans; wire or drop `newUsers24h`.
