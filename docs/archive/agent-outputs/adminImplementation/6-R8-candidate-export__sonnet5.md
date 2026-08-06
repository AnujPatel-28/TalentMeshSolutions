# R-8 — Candidate administration: server-side export   ·   model: Claude Sonnet 5 (Claude Code)   ·   phase: 6   ·   date: 2026-07-20

## Prompt given

Implement doc 14 §R-8 in full. `admin-candidates` was described as needing migration onto the `_shared/` kit — verified via `git log -- insforge/functions/admin-candidates/index.ts` that it was already migrated in `6a15d0f` (the R-2 exemplar itself), so no change was needed there; core logic untouched, confirmed unmodified. The real work: new edge fn `admin-export` (`start`/`status` actions, claims via `claim_export_job` RPC, streams batched rows to the `export-candidates` bucket, `export_started`/`export_completed` audit events — FR-4, P0) serving both candidates and recruiters, deleting the ~250-line duplicated browser export block from both `candidates/page.tsx` and `recruiters/page.tsx` (D-19).

## What changed

**`insforge/functions/admin-export/index.ts` (new).** `POST { action:'start', entity:'candidates'|'recruiters', filters:{search,status,sort} }` → inserts an `export_jobs` row, claims it via `claim_export_job`, queries `profiles` (+ `candidate_profiles` / `recruiter_profiles(*, companies(*))`) with the same search/sort/status logic each directory's own GET handler already uses, builds the CSV in 5 progress-tracked chunks (same cadence the old browser worker used), uploads it to the `export-candidates` bucket, marks the job `completed`, and returns `{ jobId }`. `POST { action:'status', jobId }` reads the job row back as `{ state, progress, downloadUrl?, error? }`. Both actions gate on the existing `candidates.export`/`recruiters.export` permission (`view` for `status`) via `_shared/permissions.ts` — no new permission entries needed, they already existed. `export_started` audit metadata carries `{entity, filters, expected_row_count}`; `export_completed` carries `{entity, row_count}` — both on `export_jobs`/`jobId`, matching the P0 requirement (FR-4).

Capped at 5000 rows per export (`MAX_EXPORT_ROWS`) — the whole export runs synchronously inside the one `start` request/response rather than a decoupled worker; see Deviations #1.

**`insforge/functions/_shared/adminAuth.ts`** — added one export, `getUserClient(token)`. Needed because `claim_export_job`'s SQL body checks `user_id = auth.uid() OR EXISTS(... role IN ('admin','super_admin'))`; a service-role call (what `requireStaff` hands every other kit function) carries no JWT, so `auth.uid()` there is `NULL` and the claim would always fail. `getUserClient` re-wraps the same bearer token `requireStaff` already verified into a caller-scoped SDK client, used only for the one RPC call — everything else (`profiles`, `export_jobs`, `audit_log`, storage) still goes through the service-role `db` `requireStaff` returns, same as every other admin-* function.

**`app/dashboard/admin/candidates/page.tsx`** — deleted `runExportWorker`, the "resume active export" effect that re-fetched `export_job_items`/`profiles` and re-ran the browser worker, and the size-branching `handleExport` (local CSV for <100 rows, browser-driven queue for ≥100). Replaced with `pollExportJob` (POST `admin-export` `status`, 1.5s interval, terminates on `done`/`failed`) and a `handleExport` that just POSTs `start` and hands the returned `jobId` to the poller. The unused `insforge` client import was dropped (only used by the deleted block); `invokeFunction` (already imported) covers the new calls.

**`app/dashboard/admin/recruiters/page.tsx`** — identical replacement for the recruiters copy of the same block. `insforge` import kept — still used elsewhere in this file for `auth.resendVerificationEmail`.

Net diff: -366 lines across the two pages (284/280 removed, ~105 added) against +1 new 287-line edge function and a 12-line kit addition.

## SQL authored (if any)

None. `export_jobs`, `export_job_items`, `claim_export_job`, and the `export-candidates` bucket (migrations 011/013) were reused as-is per the task instruction — confirmed their shape first (`export_jobs.type`/`filters`/`progress_percent`/`download_url` etc., `claim_export_job(job_id, worker_id)` signature) before writing the function against them. `export_job_items` is no longer written to by either page (the new flow queries rows by filter, not by a client-supplied id list) — left in place; still referenced by the DB schema/RLS policies and out of scope to drop here.

## Verification run

```
$ npx tsc --noEmit
```
1 pre-existing, unrelated error (`app/dashboard/candidate/[role_id]/applications/page.tsx:686` — framer-motion `Variants` typing). File untouched by this change (`git status --short` on that path returns nothing before or after). No errors in any file this task touched.

```
$ npx tsc -p insforge/tsconfig.json
```
Exit 0, no output.

```
$ npx vitest run
```
```
 Test Files  8 passed (8)
      Tests  46 passed (46)
```

```
$ npx playwright test --reporter=list
```
```
  41 passed
  7 skipped
```
0 failed. Skips are pre-existing (`[needs real-JWT fixture]` tags, unrelated to this change).

**Not verified:** no edge function was deployed (InsForge deploys per-file; `admin-export` and the `adminAuth.ts` change are not live until deployed via `scripts/deploy-all-functions.js`, which auto-discovers the new function directory — no manifest edit needed). No manual browser click-through of the export button was performed; the dev server was not started for this task, only the automated suites above were run. The `claim_export_job` auth.uid()-forwarding approach (Deviation #2) is reasoned from the RPC's SQL body and the existing browser code's working pattern, not confirmed against a live database.

## Deviations / assumptions

1. **Synchronous single-request export, not a decoupled worker.** Doc 14 describes `start` as inserting the job, claiming it, then streaming/updating progress — read literally this could mean `start` kicks off async work and returns immediately, polled by `status`. Given this Deno edge function has no `EdgeRuntime.waitUntil`-style background-continuation primitive in evidence anywhere else in the codebase (the only comparable "background" pattern, `notification-worker`, is a separate function invoked repeatedly, e.g. by cron, to claim and process one job at a time), I did the entire claim→fetch→build→upload→complete sequence inside the one `start` call and return `{jobId}` only once it's actually done. `status` still works as a poll — it just usually observes an already-terminal job. This satisfies the doc's stated outcome ("a closed tab no longer abandons an export" — true here because the work now happens server-side regardless of whether the browser tab is still open, not because it's decoupled from the request) without inventing a new worker/cron primitive the task didn't ask for. Flagging in case the advisor wants a true decoupled worker (mirroring `notification-worker` + a cron trigger) instead — it's a bigger diff and a new schedule, not something I'd default to.
2. **`claim_export_job` called via a caller-scoped client, not the service-role client every other kit function uses.** See the `adminAuth.ts` change above for the reasoning (the RPC's own `auth.uid()` check would otherwise always fail under service-role). This mirrors exactly how the browser code called this same RPC today (with the user's own JWT) — I did not modify the RPC's SQL, only where the identity for that one call comes from.
3. **Row cap of 5000, not unbounded.** Doc 14 doesn't state a cap. Given the synchronous-request design (#1), an unbounded export risks the request timing out mid-build with no resumption. Picked 5000 as a safety ceiling consistent with the "capped limits" pattern used elsewhere in this kit (`capLimit` on list endpoints); noted inline as a `ponytail:` comment with the upgrade path (a claim-and-resume worker) if a tenant's dataset outgrows it.
4. **CSV column values reproduce the directory tables' existing field access exactly** (`p?.company_name`, `p?.industry`, `p?.company_size`, `p?.is_approved` for recruiters) rather than the `p?.companies?.name` fallback chain used elsewhere in the same file for a different purpose (proposal generation, line ~734). Worth flagging: if `recruiter_profiles` no longer carries `company_name`/`industry`/`company_size` directly and those now live only under the joined `companies` row, the recruiters directory's "Company"/"Industry" **columns** are already blank for every row today — this export would just faithfully reproduce that same blank, not introduce a new one. Did not attempt to fix this since it's a pre-existing data-shape question outside R-8's scope and I have no live DB access to confirm which is actually true; flagging so the advisor can check `recruiter_profiles` columns directly if the exported CSV comes back with an empty Company column.
5. **"Export selected only" is gone.** The old client code branched on `selectedIds` (export just the checked rows, or just the loaded page if size <100) — but it never actually exported more than what was already loaded client-side (25 rows/page), even in the "background queue" branch. `admin-export`'s `filters` contract (doc 03 §4: "same as directory GET") has no `ids` field, so the new export always covers every row matching the current search/status/sort — the full filtered dataset, not just the visible page. This is a behavior change (broader, and arguably a fix of the old page-bound limitation) but drops row-level selection scoping for export specifically; bulk approve/reject/activate/delete still use `selectedIds` unchanged.
