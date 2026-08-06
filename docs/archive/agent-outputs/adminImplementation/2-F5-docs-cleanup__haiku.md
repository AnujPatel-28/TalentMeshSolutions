# F-5 — Fabricated Dashboard Metrics Cleanup + Stale Docs   ·   model: Haiku 4.5   ·   phase: 0   ·   date: 2026-07-20

## Prompt given

Two independent cleanups in the TalentMesh admin portal repo:

A) Fabricated dashboard metrics (finding F-5): Remove hardcoded `avgTimeToHire` strings and static "Operational" banner. Either compute from `application_status_history` or delete entirely; prefer deletion over new fake computations.

B) Stale doc references: Fix `DENO_ENV=production` → `APP_ENV=production` in 0-R2__fable5.md and update auth.spec.ts section in Fixes_check.md to point to actual shipped pattern.

## What changed

### A. Removed Fabricated Metrics

**Deleted avgTimeToHire hardcodes:**

- `insforge/functions/admin-dashboard/index.ts:118` — Removed `avgTimeToHire: '18 Days'` from metrics response
- `insforge/functions/admin-reports/index.ts:108` — Removed `avgTimeToHire: '12 days'` from metrics response

**Rationale:** The `application_status_history` table exists (migration 008) but `avgTimeToHire` requires reliable data backfill across all transitions. No client code relies on this metric yet, so deletion is the lazy, safe choice over inventing a new computation.

**Deleted static "Operational" banner:**

- `app/dashboard/admin/page.tsx:342-346` — Removed the `featuredCard` div with hardcoded "Operational" status. The banner has no real health check behind it (no metrics, no live API call), so it's misleading at best and violates the "no fake data" rule.

**Impact:** The dashboard right column now contains only Quick Actions. If health status becomes a requirement, it should be computed from real monitoring data (e.g., a dedicated health-check edge function) and rendered only when data is available.

### B. Fixed Stale Documentation

**Fixed secret name in 0-R2__fable5.md:**

- Line 61 — Changed `DENO_ENV=production` → `APP_ENV=production`
- Reason: Deno Subhosting reserves the `DENO_` prefix and rejects deployments with it. The actual codebase uses `APP_ENV` (confirmed in `insforge/functions/_shared/cors.ts:16` and `errors.ts:23`). Doc now matches implementation.

**Updated auth.spec.ts section in Fixes_check.md:**

- Proposed Changes Section C — Added a note flagging the superseded plan, with a cross-reference to the "What I applied" section (line 85+) that documents the actual pattern that shipped.
- Reason: The proposed token-grant mock URL and approach proved wrong in practice. The real endpoint is `/api/auth/sessions`, and the mock must plant cookies per-host. Linking to the working implementation prevents future confusion.

## Verification run

```
$ npx tsc -p insforge/tsconfig.json
EXIT_CODE: 0
```

**Note:** `npx tsc --noEmit` over the entire repo returns exit code 2 due to a pre-existing TypeScript error in `app/dashboard/candidate/[role_id]/applications/page.tsx:686` (Framer Motion transition type mismatch, unrelated to these changes). This error existed before the edits and is not caused by the removal of avgTimeToHire or the "Operational" banner.

`npx vitest run` reports "No test files found, exiting with code 1" — the project does not have unit tests in the standard test file pattern. This is not a regression from these changes.

## Deviations / assumptions

- **Deletion over computation:** `avgTimeToHire` is genuinely useful for reporting, but the implementation strategy (hardcoded strings, no live computation) was creating fake data. Computing it properly from `application_status_history` is a future task when the use case is clearer. For now, removing the lie is better than keeping it.
- **No "Operational" fallback:** If platform health monitoring becomes a requirement later, it should be a separate initiative with a real data source. The UI can render a health widget only when actual health data exists.
- **Doc-only changes:** The DENO_ENV and auth.spec.ts fixes are pure documentation corrections with no code impact.

## Open questions for the advisor

1. Should avgTimeToHire (when computed) be rendered in reports, or left off until a backfill is verified across the entire application history?
2. Should the right-column space in admin dashboard now host a different card (e.g., recent approvals, top-posted jobs), or is the Quick Actions-only layout preferred?
3. Is there a health-check endpoint or monitoring dashboard already deployed that the "Operational" banner should have been wired to?

## Outcome

**Ready to ship.** All fabricated metrics removed. Docs corrected. `npx tsc -p insforge/tsconfig.json` passes. Changes are surgical and do not introduce new dependencies or complexity.
