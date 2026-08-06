# 16 — Job Approval: Single Source of Truth + Authorization Fix (P0)

Closes Phase 1 finding **N-2** before Phase 2.
See `15_Admin_Rebuild_Verification_Phase1_Admin_Parity.md` §N-2, `054_jobs_approval_status.sql`, `02_Admin_Portal_Schema_And_Database_Design.md` §054.

**Status: NOTHING APPLIED. NOTHING DEPLOYED.** Migration `058` is written and its logic verified in rolled-back transactions against the live database. Production is byte-for-byte unchanged — the two drifted rows are still drifted and the privilege grants are still wide. This document plus the patch is what goes to final review.

---

## 0. Product decision (MVP) — read this before reviewing anything else

> **Editing an already-approved job does NOT reset it to Pending. There is deliberately no automatic re-moderation after an edit.**
> Recorded 2026-07-25 as an intentional MVP decision.

Everything below is designed around that decision. The consequences are intentional:

- **No trigger resets `approval_status` on content change.** A recruiter edits an approved job; it stays approved and publicly visible.
- **RLS `jobs_update_company` is deliberately NOT given a `WITH CHECK (approval_status = 'pending')` clause.** An earlier draft of this document suggested exactly that. **That suggestion is withdrawn** — it would have blocked recruiters from editing approved jobs at all, which is the opposite of this decision.
- **The approval columns are protected by column privileges, not by restricting which rows a recruiter may edit.** Recruiters keep full edit rights on every content column; they simply have no write access to the two approval columns. This is what lets requirements "preserve approval on edit" and "recruiters can never change approval state" both hold at once.

Verified live (rolled back): recruiter edits an approved job's title/description → `approval_status=approved`, `is_approved=true`, both preserved.

---

## 1. Root cause of N-2

`054` added `jobs.approval_status` (`pending|approved|rejected`) as the moderation column and deliberately **retained** `jobs.is_approved`, because the public-visibility guards still read it. It left the two columns coupled **by convention only** — nothing in the database enforced agreement.

Two lifecycles read different columns:

| Concern | Column read | Readers |
|---|---|---|
| Public visibility | `is_approved = true` | RLS `jobs_select_approved` (050), `insforge/functions/jobs`, `insforge/functions/jobs-id` |
| Admin moderation queue | `approval_status` | `admin-jobs` GET filter, `app/dashboard/admin/job-approvals/page.tsx` |

The writer that broke the coupling — `handleBulkAction` in `app/dashboard/admin/jobs/page.tsx:540`:

```ts
// before
const edgeAction = action === 'delete' ? 'bulk-delete' : 'bulk-update';
const updates = action === 'approve' ? { is_approved: true } : { is_approved: false };
```

`admin-jobs` `bulk-update` applied it verbatim (`.update(updates).in('id', ids)`). `approval_status` was never written → `is_approved=true` (public) + `approval_status='pending'` (still queued).

Three aggravating properties of that same path:

1. It ran under **`jobs:edit`**, not `jobs:approve` — bulk approval bypassed the approval permission gate.
2. It wrote **no `audit_log` entry** — unlike single approve/reject.
3. It accepted **any** column, so it was an open write channel onto approval state.

### Live evidence

```
approval_status | is_approved | status | count
----------------+-------------+--------+------
approved        | true        | closed |   2
pending         | false       | draft  |   1
pending         | true        | active |   2   ← drift: publicly visible, queued as pending
```

The two drifted rows are `11111111-…-1111` ("React Developer (Talentmesh - Pending)") and `33333333-…-3333` ("Data Scientist (Google - Pending)"), both `status='active'`.

**On audit-log evidence:** an earlier draft of this document argued these rows were "never approved" because they have no `job_approved` audit event. **That inference was wrong and has been removed.** The pre-fix bulk-approve path wrote no audit entry at all, so the absence of a `job_approved` event is exactly what a bulk approval would also look like. Audit-log absence is evidence of nothing here. The repair direction is justified in §4 on other grounds.

---

## 2. The authorization issue — independently verified

The advisory review's framing is **correct, and I verified it rather than taking it on trust.** Restated precisely:

- **RLS is behaving exactly as PostgreSQL documents.** For `UPDATE`, a policy with no `WITH CHECK` reuses its `USING` expression for the new row. `jobs_update_company`'s `USING` constrains only tenancy (`company_id = authz.company_id_of(auth.uid())` and company-admin-or-own-recruiter). It says nothing about *which columns* may be written — because that is not RLS's job.
- **The actual defect is a privilege grant.** `authenticated` held **table-level** `UPDATE` on `public.jobs`, which covers every column including `approval_status` and `is_approved`. (`anon` held it too.) The `information_schema.column_privileges` rows for those columns are expansions of that table-level grant, not separate column grants.

### Proof of exploit (live, rolled back)

Executed as role `authenticated` with a recruiter's own JWT `sub`, targeting that recruiter's own job (`22222222-…`, `draft`/`pending`/`is_approved=false`):

```sql
SET LOCAL ROLE authenticated;
-- request.jwt.claims sub = 59b913d9-… (profiles.role = 'recruiter')
UPDATE public.jobs SET approval_status='approved', is_approved=true WHERE id='22222222-…';
```

Result: **`rows_updated=1`, `approval_status=approved`, `is_approved=true`.** A recruiter can self-approve their own job onto the public board. Rolled back; re-queried afterwards to confirm the row returned to `pending`/`false`.

**Confirmed. This is a real P0**, independent of N-2's column drift.

### Correction to the review's scope: `status` must stay writable

The review listed three columns to remove UPDATE on: `approval_status`, `is_approved`, **and `status`**. Removing `status` would be wrong:

- `POST /api/jobs/[jobId]/publish` and `/close` update `status` using **the caller's own token** (`getServerInsforgeClient()` → role `authenticated`). Revoking it breaks legitimate recruiter publish/close.
- `status` alone cannot expose an unapproved job: `jobs_select_approved` requires `status='active'` **AND** `is_approved=true`.
- Publication being recruiter-owned is existing intent, recorded in `admin-jobs`' reject branch ("do NOT force status='closed' — publication is recruiter-owned").

So the fix covers `approval_status` and `is_approved`. **`status` stays granted.** Confirmed empirically: with the fix applied, `UPDATE … SET status='closed'` as the recruiter succeeded.

---

## 3. The fix (migration `058`, section C)

```sql
REVOKE UPDATE ON public.jobs FROM authenticated;

GRANT UPDATE (
  title, description, requirements, skills_required, type, location,
  salary_min, salary_max, currency, experience_min, experience_max,
  department, status
) ON public.jobs TO authenticated;

REVOKE UPDATE ON public.jobs FROM anon;   -- section D, independently revertable
```

The allowlist is exactly the fields of `jobUpdateSchema` (`lib/validation/jobs.ts`) plus `status`.

**Deliberately not granted, and why:**

| Column(s) | Reason |
|---|---|
| `approval_status`, `is_approved` | the approval boundary — admin-only |
| `id`, `company_id`, `recruiter_id` | tenancy; writing these could move a job between tenants |
| `views_count`, `applications_count` | server-owned counters. `applications_count` is maintained by `update_job_applications_count`, a **SECURITY DEFINER** trigger owned by `postgres` — unaffected by this revoke |
| `updated_at` | set by the `set_current_timestamp_updated_at` BEFORE trigger, which needs no privilege |
| `fts`, `expires_at`, `created_at` | no recruiter write path exists |

**Roles untouched:** `postgres` and `project_admin` keep full `UPDATE`, so the admin approve/reject paths in `admin-jobs` (service key) work unchanged. Verified that no admin approval path writes jobs as `authenticated` — every admin job write goes through the `admin-jobs` edge function's service-key client.

### Why column privileges are the correct mechanism

1. **They are enforced before RLS and before triggers**, by the privilege system, for every access route — PostgREST/data API, RPC, raw SQL. Requirement: "recruiters must NEVER change these through any API, SQL path, or client update." A policy-based fix only covers rows reachable through that policy; a privilege covers the column itself.
2. **They express the actual rule.** The rule is "these two columns are not recruiter-writable" — a column rule, not a row rule. Encoding it as a row predicate (`WITH CHECK approval_status='pending'`) both under- and over-shoots: it would block editing approved jobs (violating the product decision) while still permitting approval writes on pending rows.
3. **They compose with the product decision.** Because the restriction is on columns rather than rows, a recruiter can edit an approved job freely and the approval columns simply are not part of the statement.
4. **They compose with the §A2 derive trigger.** A `BEFORE` trigger assigning to `NEW` is **not** subject to column privileges. Verified empirically: with `authenticated` holding no `UPDATE` on `is_approved`, a recruiter's title edit still fired the trigger and `is_approved` was written correctly. Without this property the revoke would have broken every recruiter edit — this was the single riskiest assumption in the design, so it was tested rather than reasoned about.

### Verification matrix (live, all inside rolled-back transactions)

| Probe | Expected | Result |
|---|---|---|
| Recruiter sets `approval_status='approved'` on own job | denied | `insufficient_privilege` ✅ |
| Recruiter sets `is_approved=true` on own job | denied | `insufficient_privilege` ✅ |
| Recruiter edits `title` | allowed, derive trigger fires | OK, `appr=pending, flag=false` ✅ |
| Recruiter sets `status='closed'` | allowed | OK ✅ |
| Recruiter sets `status='active'` | allowed, then business rule | reached `enforce_active_job_limit` (plan cap), i.e. past the privilege check ✅ |
| Recruiter sets `company_id` | denied | `insufficient_privilege` ✅ |
| **Recruiter edits an approved job** | **approval preserved** | **`approval_status=approved`, `is_approved=true`** ✅ |
| Insert `(is_approved=true, approval_status='pending')` | forced to `false` | `false` ✅ |
| `UPDATE SET is_approved=true` on pending row | stays `false` | `false` ✅ (old bug shape, inert) |
| `UPDATE SET approval_status='approved'` | derives `true` | `true` ✅ |

After every probe, production state was re-queried: no trigger, no constraint, no function, grants intact, job titles unchanged, drift still present.

---

## 4. Single source of truth (migration `058`, sections A–B)

**`approval_status` is the single source of truth; `is_approved` becomes a derived mirror.** Not a preference:

- `approval_status` is strictly more expressive (3 states vs 2). `is_approved` cannot represent `rejected`, so it can never be the source without information loss — it already made the admin jobs list render rejected jobs as "Pending".
- `approval_status` is `NOT NULL DEFAULT 'pending'`; `is_approved` was nullable.
- `is_approved` cannot be dropped yet: RLS `jobs_select_approved` and both public job-board functions guard on it, and the policy depends on the column. `054` deferred that drop; it stays deferred.

```sql
-- A2
NEW.is_approved := (NEW.approval_status = 'approved');   -- BEFORE INSERT OR UPDATE
```

Every writer routes through it, so a writer touching only `is_approved` can no longer publish a job. Patching only `handleBulkAction` would have left the other write sites able to reproduce the identical state.

Section B adds `NOT NULL` plus `CHECK (is_approved = (approval_status = 'approved'))` as a tripwire — the trigger normalises first so it should never fire; it exists so that if the trigger is dropped, Postgres refuses to *store* a drifted row. `NOT NULL` comes first because `NULL = (…)` is `NULL`, which a CHECK treats as a pass.

### Repair direction: fail closed

```sql
UPDATE public.jobs SET is_approved = (approval_status = 'approved')
 WHERE is_approved IS DISTINCT FROM (approval_status = 'approved');
```

Justification, stated only from what is supported:

- The drifted rows read `approval_status='pending'`. `'pending'` is `054`'s column default, and no verified writer sets `'pending'` to mean approved. Recomputing the other direction would publish rows the moderation queue lists as unreviewed.
- Fail-closed is the safe direction under uncertainty: it removes public exposure and is trivially reversible by an admin clicking Approve, whereas the opposite silently grants approval that no one is prompted to notice.

*Not* claimed: that these rows were never approved. See §1.

**Effect on live data:** the 2 seeded rows flip to `is_approved=false`, leaving the public board and remaining pending. No other row changes. The public board will then serve **0 jobs** until an admin approves something — expected, and worth stating to whoever watches the board after deploy.

---

## 5. Task 3 — review of the other changes in the N-2 working tree

**These four changes are not mine.** They were already present in the working tree when this session began; I did not author or modify them. All four live in the public job-read path and are **local-only — the deployed `jobs` and `jobs-id` functions still have the old behaviour** (both last deployed 2026-06-15). Classified against N-2's scope:

| Change | Where | What it does | Required for N-2? | Classification |
|---|---|---|---|---|
| **Verified-company filter** | `jobs/index.ts:58`, `jobs-id/index.ts:136` — `companies!inner(…status)` + `.eq('companies.status','verified')` | Restates the `companies.status='verified'` condition of RLS `jobs_select_approved`, which the service-key client bypasses | **No.** A different condition of the same policy; N-2 is about the approval columns | **Scope creep** — but a genuine P1 leak (jobs from unverified companies reach the public board) |
| **`expires_at` filter** | `jobs/index.ts:59`, `jobs-id/index.ts:137` | Hides expired jobs from the public board | **No.** Not in the RLS policy at all; pure product behaviour | **Scope creep** |
| **`category` filter removal** | `jobs/index.ts` (deployed has it, local does not) | Removes a filter on `jobs.category` — **a column that does not exist** on the table (24 columns, no `category`). The deployed filter would error if ever exercised | **No** | **Optional** — dead/broken code removal, harmless either way |
| **`ai_match_rate` removal** | `jobs-id/index.ts` (deployed hardcodes `ai_match_rate: 85`) | Removes a fabricated constant presented to candidates as an "AI Fit Score" | **No** | **Scope creep** — though shipping a fabricated score is its own defect |

**None of the four is required for N-2.** After `058`, the public read path's `.eq('is_approved', true)` is correct unchanged, because `is_approved` becomes derived.

### Resolution — REVERTED (instructed 2026-07-25)

**All four changes have been reverted.** `git checkout HEAD -- insforge/functions/jobs/index.ts insforge/functions/jobs-id/index.ts`. Both files are now clean against HEAD and are **not part of this patch**.

The revert turned out to be cleaner than expected, which is worth recording:

- The four changes were **uncommitted working-tree edits only** (14 insertions / 7 deletions total). `git diff HEAD` contained *precisely* the four items and nothing else.
- Therefore reverting to HEAD removed exactly those four items and **did not** disturb the committed state of these functions — the shared-module refactor (`_shared/cors.ts` origin allowlist, `_shared/errors.ts`, `escapeOrFilter`, `capLimit`, removal of the `jobs` POST create handler) is committed at HEAD and is untouched.
- On all four items, HEAD's behaviour **matches deployed**: `category` filter present, `ai_match_rate: 85` present, verified-company filter absent, `expires_at` filter absent.

**Clarification on "match deployed":** reverting to HEAD does *not* make these files byte-identical to the deployed functions. Deployed was last updated 2026-06-15 and predates the committed refactor above, so a HEAD↔deployed gap remains. That gap is **pre-existing** — not created by the N-2 work — and is a separate deployment-sequencing item (compare Phase 1 finding N-3). Making local byte-identical to deployed would have meant reverting committed work including a CORS origin-allowlist hardening, which was not the intent of scope-limiting this patch.

**Consequences of the revert, stated plainly:**

- The public board continues to serve jobs from **unverified** companies (the RLS `jobs_select_approved` condition the service-key read path does not restate). This is a live P1 that is now **unfixed again** — see §8.
- `jobs-id` again returns a hardcoded `ai_match_rate: 85` presented as an AI Fit Score.
- The `category` filter on a non-existent column is back; harmless unless exercised.

These are tracked as their own findings in §8 and need their own patch, review and deploy.

---

## 6. Every read/write site of the approval columns

### Writers (complete)

| # | Path | Before | After `058` + patch |
|---|---|---|---|
| 1 | `admin-jobs` POST `action='approve'` | both fields ✅ | unchanged ✅ |
| 2 | `admin-jobs` POST `action='reject'` | both fields ✅ | unchanged ✅ |
| 3 | `admin-jobs` POST `action='bulk-update'` | arbitrary `updates`, `is_approved` only ❌ **N-2 root cause** | approval keys → 400 |
| 4 | `admin-jobs` POST default insert (unvalidated `jobData`) | could set either ❌ | drift neutralised by trigger; permission gap remains, §8 |
| 5 | `admin-jobs` PATCH | `jobPatchSchema.strict()` excludes both ✅ | unchanged ✅ |
| 6 | `create_job` RPC (049, SECURITY DEFINER) | `is_approved=false`, `approval_status` defaults `pending` ✅ | unchanged ✅ |
| 7 | `PATCH /api/jobs/[jobId]` (recruiter) | schema strips both ✅ | + privilege denial ✅ |
| 8 | `/api/jobs/[jobId]/publish` \| `/close` | `status` only ✅ | unchanged ✅ (`status` still granted) |
| 9 | `lib/server/jobs.ts` | `is_approved` only ❌ | **dead code, zero callers** — left in place, §8 |
| 10 | **Direct client write as `authenticated`** | **self-approval possible ❌ P0** | **`insufficient_privilege` ✅** |

No triggers, cron jobs, or automation touch approval state. `pg_trigger` on `public.jobs` holds only `trigger_set_updated_at` and `trg_active_job_limit`; the only routine referencing either column is `create_job`. Deployed `admin-jobs` was fetched live and matches local source — no drift.

### Readers

- `is_approved`: RLS `jobs_select_approved`, `insforge/functions/jobs`, `jobs-id`, `admin-dashboard` metrics, `admin-export`, admin jobs CSV "Approved" column. **All stay correct** — the column is always derived.
- `approval_status`: `admin-jobs` GET filter + detail, `job-approvals` page, `admin-companies` breakdown, `admin/jobs/[id]`, `admin/companies/[id]`.

---

## 7. Files in this patch

| File | Change |
|---|---|
| `insforge/migrations/058_jobs_approval_single_source.sql` | **new** — renumbered from the 055 draft (055/056/057 taken, 055 already applied). Sections: A drift repair + derive trigger, B `NOT NULL` + CHECK tripwire, C column privileges, D anon revoke. Product decision recorded in a header block |
| `app/dashboard/admin/jobs/page.tsx` | `handleBulkAction` fans out to the audited `approve`/`reject` action; `AdminJob.approval_status` added; approval column, pending count and preview gate read `approval_status` |
| `insforge/functions/admin-jobs/index.ts` | `bulk-update` rejects `is_approved` / `approval_status` with 400 |
| `scripts/verify_job_approval_invariant.mjs` | **new** — asserts the invariant, the privilege boundary, and that editing an approved job preserves approval |
| `docs/…/16_Job_Approval_Single_Source_Of_Truth_Fix.md` | this document |

**Deleted:** the `055_jobs_approval_single_source.sql` draft (renumbered to `058`).
**Reverted, not in this patch:** `insforge/functions/jobs/index.ts`, `insforge/functions/jobs-id/index.ts` — restored to HEAD, clean (§5).

**Also modified in the working tree but NOT mine and NOT part of this patch:** `insforge/functions/admin-blogs/index.ts` and `insforge/functions/admin-settings/index.ts` carry pre-existing uncommitted edits by other work. They would ride along if those functions are deployed — do not deploy them as part of this patch. The `admin-jobs` diff is mine and is exactly the 13-line `bulk-update` guard, no deletions.

### Server-side changes
Migration `058`; `admin-jobs` `bulk-update` guard.

### Client-side changes
`app/dashboard/admin/jobs/page.tsx` only.

### Impact if changed
Unmoderated jobs cannot reach the public board. Recruiters cannot self-approve. Bulk approval gains the `jobs:approve` gate and a per-job audit entry. Rejected jobs display as "Rejected". Recruiter editing — including of approved jobs — is unaffected.

### Impact if not changed
Jobs stay publicly visible without moderation, and **any recruiter can approve their own job listing** — a content-liability and trust exposure on a multi-tenant recruitment platform.

### Reason for change
`054` left two columns coupled by convention with no enforcement, and column access was never restricted when the approval boundary was introduced.

### Deploy priority
**P0 (blocker)** — gates Phase 2.

---

## 8. Backward compatibility

1. **`is_approved` writes become silent no-ops** for privileged roles (service key), and hard `insufficient_privilege` errors for `authenticated`. In-repo writers are all handled (§6), but **external tooling, SQL scripts and seed fixtures that set `is_approved` directly will silently not take effect.** Seeds should set `approval_status` instead. This is the intended trade: a silent no-op fails closed.
2. **Two live jobs leave the public board**, taking it to 0 visible jobs until an admin approves. Correct per §4.
3. **RLS and public reads unchanged** — no policy is touched, so no public-visibility regression beyond item 2.
4. **`bulk-update` returns 400** for approval keys. No in-repo caller sends them post-patch.
5. **`NOT NULL` on `is_approved`** is safe today (0 NULLs) but rejects an explicit `is_approved: null` write. No in-repo writer does this.
6. **Any *new* recruiter-editable column must be added to the §C `GRANT UPDATE` list**, or writes to it will fail with `insufficient_privilege`. This is the main ongoing maintenance cost of the column-privilege approach and the most likely future surprise — noted here so the next person adding a column to `jobs` finds it.
7. **`INSERT` privileges are deliberately not narrowed.** `jobs_no_direct_insert` has `WITH CHECK (false)`, which blocks *every* direct insert for `public`, so job creation only happens through the SECURITY DEFINER `create_job` RPC. Narrowing INSERT would add risk without closing a reachable path.
8. **`lib/server/jobs.ts` is dead code** — `setAdminJobState`, `createAdminJob`, `listPublicJobs`, `getPublicJobById`, `listAdminJobs`, `updateAdminJob` have zero callers repo-wide; two write `is_approved` without `approval_status`. Left in place (not in scope to delete); the trigger makes them safe if revived. Flagged for a separate cleanup decision.

### Open findings, deliberately out of scope

- **[P2] `admin-jobs` POST default insert** spreads unvalidated `jobData`, under `jobs:edit`, so a staff user can create a job with `approval_status='approved'` without `jobs:approve` and with no audit entry. Needs a Zod schema like PATCH's.
- **[P1] Public board serves jobs from unverified companies.** RLS `jobs_select_approved` requires `companies.status='verified'`, but `insforge/functions/jobs` and `jobs-id` read with the **service key**, so RLS does not apply and that condition is never restated. A local fix existed but was **reverted on instruction** (§5), so there is now no pending fix in the tree. **Needs its own patch, review and deploy** — do not fold it into the approval workflow. Reference implementation, for whoever picks it up: add `companies!inner(…, status)` to the select and `.eq('companies.status','verified')` to both queries.
- **[P3] `jobs-id` returns a fabricated `ai_match_rate: 85`** presented to candidates as an "AI Fit Score". `app/jobs/page.tsx` already renders only a real score (`j.ai_match_rate ?? null`), so the constant is the sole source of the fake number. Reverted (§5); still live.
- **[P3] `jobs` filters on `jobs.category`, a column that does not exist** (24 columns, no `category`). Dead unless the query param is supplied, in which case it errors. Reverted (§5); still live.
- **[P3] `admin-dashboard`** counts pending jobs as `is_approved=false`, conflating `pending` with `rejected`. Cosmetic.
- **[P3] `anon` retains `INSERT`/`DELETE`** on `jobs`, blocked only by RLS. Section D removes only `UPDATE`.

---

## 9. Deployment checklist

**Nothing in this list has been done. Do not start until §0's product decision and §5's exclusion call are signed off.**

### Gate A — decisions required before any deploy

- [ ] **A1.** Sign off the §0 product decision (edits preserve approval; no auto re-moderation).
- [x] **A2.** ~~Confirm §5~~ — **DONE.** Instructed and performed: the four non-N-2 changes in `jobs` / `jobs-id` were reverted (`git checkout HEAD --`). Both files are clean against HEAD and out of this patch (§5).
- [ ] **A3.** Accept that after `058`, the public board serves **0 jobs** until an admin approves (§4). Decide whether to pre-approve the 2 seeded jobs through the admin UI *after* deploy, so the approval is audited.
- [ ] **A4.** Confirm section D (`REVOKE UPDATE … FROM anon`) is in scope, or drop that one line.

### Gate B — pre-apply verification

- [ ] **B1.** Re-run the drift query — live state can move (`_migration_refs.md` ledger is unreliable; verify live, do not trust docs):
      `SELECT id, is_approved, approval_status, status FROM public.jobs WHERE is_approved IS DISTINCT FROM (approval_status='approved');`
- [ ] **B2.** Confirm `058` is still the correct number (no new migration has claimed it).
- [ ] **B3.** Confirm `0` rows with `is_approved IS NULL` (required by the `NOT NULL` in §B).
- [ ] **B4.** Confirm no new `jobs` writer has appeared since this review, especially any client-side write of a column outside the §C grant list.
- [ ] **B5.** Take a `jobs` table snapshot (`id, status, is_approved, approval_status`) for rollback comparison.

### Gate C — apply the migration (human, never an agent)

- [ ] **C1.** Apply `insforge/migrations/058_jobs_approval_single_source.sql` as a single transaction.
- [ ] **C2.** Run `node scripts/verify_job_approval_invariant.mjs` → must print all six ✅ lines.
- [ ] **C3.** Spot-check the three post-apply queries in the `058` footer.
- [ ] **C4.** Confirm exactly 2 rows changed vs the B5 snapshot.

### Gate D — deploy code (order does not matter; independent of C)

> **⚠ Working-tree hazard — read before D2.** This branch's working tree contains a large volume of
> uncommitted work unrelated to N-2: a whole public route restructure (`app/browse-jobs/**` →
> `app/jobs/[slug]/**`, with deletions of `app/jobs/[id]/**`), blog changes, `next.config.ts`,
> `proxy.ts`, `package.json`/`package-lock.json`, `app/sitemap.ts`, `app/robots.ts`, and
> `public/robots.txt` / `public/sitemap.xml` deletions. **Building and deploying the frontend from
> this tree as-is would ship all of it**, including public URL and SEO changes — far beyond this
> patch. This patch's only frontend file is `app/dashboard/admin/jobs/page.tsx`.
> Isolate it before deploying: commit it on its own branch, or cherry-pick that single file.


- [ ] **D1.** Deploy `admin-jobs` (adds the `bulk-update` 400 guard). Re-fetch live source afterwards and diff against local — this repo has a history of deployed/local drift.
- [ ] **D2.** Deploy the frontend containing `app/dashboard/admin/jobs/page.tsx`.
- [ ] **D3.** Do **not** deploy `jobs` or `jobs-id` — now reverted to HEAD, so they contain no N-2 change to ship (§5 / A2). A HEAD↔deployed gap still exists on these two from earlier committed work; that is a separate deployment item, not this patch's.
- [ ] **D4.** Do **not** deploy `admin-blogs` or `admin-settings` — they carry unrelated uncommitted edits (§7).

### Gate E — post-deploy functional verification — **CLOSED 2026-07-27** (all items proven on production with a real recruiter identity; see `22_Gate_E_Closure_And_Async_Params_Fix.md` for evidence)

- [x] **E1.** Recruiter edits a **pending** job → succeeds; stays pending. *(2026-07-27, recruiter `nikavx28@gmail.com`, job `5128aa8a` — PATCH 200, `approval_status=pending` after edit)*
- [x] **E2.** Recruiter edits an **approved** job → succeeds; **stays approved** (the product decision). *(PATCH 200 on approved job, `approval_status=approved` unchanged)*
- [x] **E3.** Recruiter publish/close → succeeds (`status` still granted). *(publish 200 `draft→active`; close 200 `active→closed`)*
- [x] **E4.** Recruiter attempts a direct data-API write of `approval_status` → denied. *(2026-07-25 with staff token — column privilege is role-level, user-independent)*
- [x] **E5.** Admin single approve → job appears on the public board; `audit_log` entry present. *(2026-07-25)*
- [x] **E6.** Admin **bulk** approve of 2+ jobs → all become `approved`, all publicly visible, **one `audit_log` entry per job**, and the moderation queue count drops correctly. *(2026-07-25)*
- [x] **E7.** Admin reject → leaves the public board, shows "Rejected" (not "Pending") in the admin jobs list. *(2026-07-25)*
- [x] **E8.** Job creation by a recruiter → `pending`, not publicly visible. *(2026-07-27 — POST 201, `approval_status=pending`, `is_approved=false`, board unchanged even after publish made it `active`)*
- [x] **Row scoping (cross-company isolation).** Recruiter of company `f91e3561` cannot read the other company's non-public job (data-API select → `[]`), cannot update its jobs (data API → 0 rows; API route → 403 on visible job / 404 on invisible job; publish → 403). Target rows' `updated_at` verified unchanged. **First time ever proven.** *(2026-07-27)*

### Rollback

Statements are in the `058` header. Order: drop constraint → drop `NOT NULL` → drop trigger → drop function → `GRANT UPDATE ON public.jobs TO authenticated` (and `anon` if D was applied). The data repair in A1 is not auto-reversible — use the B5 snapshot.

~~**Known blocker:** Gate E cannot be completed without staging credentials.~~ **Resolved 2026-07-27:** the recruiter identity came from the real onboarding pipeline (`request-access` → admin approve), not seeding. Note: completing E1–E3 required fixing a production bug first — `withApi` never awaited Next 15+'s async route `params`, so every dynamic-segment API route 404'd; fixed in `f9f6a86` on `main`. See `22_Gate_E_Closure_And_Async_Params_Fix.md`.
