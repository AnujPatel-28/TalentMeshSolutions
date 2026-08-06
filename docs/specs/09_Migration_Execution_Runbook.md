# 09 — Migration Execution Runbook (for executing agents)

**Status:** Active — execute in order
**Owner / Architect:** (senior advisor) — decisions locked below; do not re-decide
**Version:** 1.1 — **corrected against the live database (2026-07-16).** The v1.0 plan renamed `company_profiles → companies` and added a compat view. Live inspection shows `companies` **already exists** (6 rows, FK target) and `company_profiles` is an **empty vestige**, so there is **no rename** and **no compat view** — 046 alters `companies` in place and drops the empty `company_profiles`. Decisions #5/#9 and tasks T1/T2/T6/T7/T8/T10/T12 updated. Follows `02` v1.1.
**Last Updated:** 2026-07-16

> **How to use this file.** Each task `T#` is a self-contained unit for ONE agent. Do tasks strictly in order. Do not start a task whose **Preconditions** are unmet. Do not make architectural choices — they are locked in "Architect decisions" below; if a task seems to require a new decision, STOP and report, do not improvise. Tasks marked **🚦 GATE** must not run until a human gives explicit go-ahead (they change the live database or redeploy live functions).

Source of truth for DDL: **`02_Schema_And_Database_Design.md`** (migrations 046–051 are specified there verbatim). This runbook tells you which file to create, what to copy, the exact **deltas** to apply on top, how to verify, and the order. Where a delta is given here, it overrides doc 02.

---

# Architect decisions (LOCKED — do not change)

1. **Migration numbers are 046→051, one file each**, in `insforge/migrations/`. Apply strictly in that order.
2. **All SQL files are idempotent** (`IF NOT EXISTS` / `DROP POLICY IF EXISTS` / `CREATE OR REPLACE`). Never assume a clean DB.
3. **No bare `auth.uid()`** in any new policy — always `(SELECT auth.uid())`. (Grep-enforced in T7.)
4. **Nothing is applied to the live database until the 🚦 GATE (T10).** All SQL + code changes are written and reviewed as working-tree files first. Rationale: the in-place alter + `company_profiles` drop in 046 and the ownership backfill in 049 are hard to reverse on a live prod DB.
5. **NO RENAME (corrected v1.1).** `companies` is already the live canonical table (6 rows, `jobs.company_id` FK target). Migration 046 **alters it in place** (adds lifecycle/KYC cols, maps `is_verified→status`, drops the dangerous `"Recruiters manage company"` policy — finding L-1, **already resolved out-of-band as of 2026-07-16, so this drop is now a verified no-op; keep it idempotent rather than removing it**) and **drops the empty `company_profiles`** (guarded: abort if it has rows). **No compat view** — because all code references to `company_profiles` are migrated in **T8, which runs before the live apply in T10**, so no path reads the dropped table. (This removes the v1.0 security_invoker view and the PG≥15 guard.) Deployed edge functions already use `companies`; verify in T1.
6. **Job creation goes through the `create_job` RPC only** (defined in 049). The deployed edge function `insforge/functions/jobs/index.ts` POST-create path is locked down in T9 (it must not accept client-supplied `company_id`/`recruiter_id`). This is audit fix P0-4.
7. **P0-5 (profiles privileged-column guard trigger) ships inside migration 047** — it depends only on `authz.is_admin()` which already exists (migration 037), so it needs no other schema.
8. **Backfill (049) is idempotent** (`ON CONFLICT DO NOTHING`) and must run only once ordering-wise but is safe to re-run.
9. **Company verification status is mapped, not blanket-set.** 046 maps the live `is_verified` boolean onto `status` (`true→verified`, inactive→`deactivated`, else `pending`) for the 6 existing companies. Do NOT blanket-verify in 049. This preserves the real verification state — do not re-gate already-verified companies.
10. **Rollback plan is per-file** and lives in doc 02's "Rollback" notes; T10 must capture a DB snapshot first so rollback is a restore, not a hand-reversal. **T1 must additionally capture the live `CREATE TABLE company_profiles` DDL** before 046 drops it, since a table drop is not auto-reversible.

---

# Model assignment per task (tiers defined in `08` → Model assignment)

Every task follows the loop: **Fable 5 plans → execution model builds → Fable 5 (parallel session) reviews the result against the task's Verify block before the next task starts.** Gated tasks (T10/T11) also need explicit human go-ahead.

| Task | Tier | Model | Why |
|---|---|---|---|
| T1 | T-Read | Gemini Flash 3.5 / Sonnet | read-only grep + live-schema capture, no writes |
| T2 (046) | **T-High** | Opus / Gemini Pro 3.1 | in-place alter, `is_verified→status` map, drops the L-1 policy + a live table — irreversible |
| T3–T4 (047, 048) | T-Mid | Sonnet / Gemini Flash 3.5 | verbatim transcription from `02` |
| T5 (049) | **T-High** | Opus / Gemini Pro 3.1 | SECURITY DEFINER RPCs + `created_by` backfill logic |
| T6 (050) | **T-High** | Opus / Gemini Pro 3.1 | dropping 16 live policies by name; company-scoped RLS |
| T6b (051) | **T-High** | Opus / Gemini Pro 3.1 | RPCs + last-admin trigger (privilege/invariant logic) |
| T7 | T-Mid | Sonnet / Gemini Flash 3.5 | register checks map, TS types, grep gate |
| T8 | T-Mid | Sonnet / Gemini Flash 3.5 | mechanical `company_profiles→companies` refactor (but 100% coverage matters — Fable review confirms zero left) |
| T9 | **T-High** | Opus / Gemini Pro 3.1 | closes C-4 (auth boundary); no client-trusted ownership |
| T10 🚦 | **T-High** + human | Opus / Gemini Pro 3.1 | applies to LIVE prod DB — snapshot first, stop on first ❌ |
| T11 🚦 | **T-High** + human | Opus / Gemini Pro 3.1 | edge-fn redeploy + the security regressions that gate launch |

Every **T-High** task gets a **deep** Fable review; T-Mid/T-Read get a **light-to-medium** review. A red Fable review blocks advancement.

---

# Task sequence

## T1 — Reference audit + live-state baseline capture (READ-ONLY)
**Agent:** Explore/general-purpose. **Preconditions:** none.
**Do:**
1. Grep the repo (exclude `node_modules`, `docs/`, `insforge/migrations/`, `*.md`) for the literal `company_profiles`:
   - App/server code: `**/*.{ts,tsx,js,mjs,cjs}`
   - Deployed edge functions: `insforge/functions/**`
2. Produce a categorized list: (a) SDK `.from('company_profiles')` calls (these are reading the EMPTY vestige — already effectively broken), (b) SQL string literals, (c) type/interface names, (d) edge functions that will need redeploy. Also grep for `.from('companies')` to confirm edge fns already use the live table.
3. **Capture the LIVE baseline (needed because git migrations do NOT match live state):** record, into `_migration_refs.md`, the live DDL/policies for `companies`, `company_profiles`, and `jobs` — obtained via MCP `get-table-schema` or `pg_dump`. Specifically capture: the `CREATE TABLE company_profiles` DDL (046 drops it — not auto-reversible), the exact `companies` policy names (for the L-1 drop), and **all 16 `jobs` policy names** (for the L-2 drops in 050). If a live policy name differs from what `02`/`050` lists, the DROPs must be corrected to match the live names before T6.
**Output (report only, no edits):** the reference list + live baseline, saved to `docs/specs/_migration_refs.md`. This feeds T6 (exact policy names), T8, and T10/T11.
**Done when:** the file names every code site + edge fn touching `company_profiles`, AND contains the live `companies`/`company_profiles`/`jobs` DDL + policy names.

## T2 — Write `046_company_first_companies.sql`
**Agent:** general-purpose. **Preconditions:** T1 done (incl. live baseline).
**Do:**
1. Copy the DDL from doc 02 → "Migration 046" (v1.1 — in-place alter) verbatim into `insforge/migrations/046_company_first_companies.sql`. It already contains: the empty-`company_profiles` guard, the column adds, the `is_verified→status` mapping UPDATE, the index adds, the `updated_at` trigger, the L-1 policy drop + replacements, and `DROP TABLE company_profiles`.
2. **No compat-view delta (removed in v1.1).** Because T8 migrates all `company_profiles` code references before the live apply (T10), no compat view is needed. Do NOT add the security_invoker view.
3. **Reconcile against the T1 baseline:** confirm the live policy names in step 5 of the 046 DDL (`"Recruiters manage company"`, `"Public view active companies"`) match `_migration_refs.md`. If they differ live, correct the `DROP POLICY` names.
   - **This step is load-bearing — it is the control that caught L-1 being stale.** As of 2026-07-16 the live set is `"Public view active companies"`, `admin_bypass`, `project_admin_policy`; `"Recruiters manage company"` is **already gone**. Production DDL has been reaching this DB without `system.custom_migrations` recording it (the ledger is empty), so **no live-state claim in `01`/`02` may be trusted without re-running this reconciliation immediately before apply.**
**Verify (static only — do NOT apply):** file parses as SQL; grep the file for bare `auth.uid()` → must be zero; confirm there is NO rename statement and NO `CREATE VIEW public.company_profiles`; confirm the empty-table guard and the `is_verified→status` UPDATE are present.
**Done when:** file exists with doc-02 v1.1 DDL, policy names reconciled to live, no compat view.

## T3 — Write `047_company_members_and_authz.sql`
**Agent:** general-purpose. **Preconditions:** T2 done.
**Do:** copy doc 02 → "Migration 047" verbatim into `insforge/migrations/047_company_members_and_authz.sql`. No deltas. This file includes the `company_members` table, the `authz.company_id_of / company_role / is_company_admin` helpers, and the **P0-5** `guard_profile_privileged_cols` trigger.
**Verify (static):** zero bare `auth.uid()`; the profile-guard trigger and all three `authz` helpers are present; `GRANT USAGE ON SCHEMA authz` present.
**Done when:** file exists matching doc 02.

## T4 — Write `048_verification_workflow.sql`
**Agent:** general-purpose. **Preconditions:** T3 done.
**Do:** copy doc 02 → "Migration 048" verbatim into `insforge/migrations/048_verification_workflow.sql`. No deltas.
**Verify (static):** both tables (`company_verification_requests`, `verification_audit_log`), RLS enabled, `admin_bypass` present, zero bare `auth.uid()`.
**Done when:** file exists matching doc 02.

## T5 — Write `049_repoint_ownership_and_rpcs.sql`
**Agent:** general-purpose. **Preconditions:** T4 done.
**Do:** copy doc 02 → "Migration 049" (v1.1) verbatim into `insforge/migrations/049_repoint_ownership_and_rpcs.sql`. No deltas. Includes `created_by` backfill (from the earliest job's recruiter — live `companies` has NO `recruiter_id`), member backfill (from `created_by`, `profiles.company_id`, and `jobs.recruiter_id`), FK enforcement, and the `approve_company_verification` + `create_job` RPCs (with `REVOKE`/`GRANT EXECUTE`).
**Verify (static):** backfill uses `ON CONFLICT DO NOTHING`; there is **NO `DROP COLUMN companies.recruiter_id`** (it never existed live); the member backfill is FK-safe (skips dangling `profiles.company_id`); `create_job` derives `company_id` via `authz.company_id_of(v_uid)` and does NOT read company_id from input for authorization; both RPCs are `SECURITY DEFINER` with `SET search_path`; `GRANT EXECUTE ... TO authenticated` present.
**Done when:** file exists matching doc 02.

## T6 — Write `050_company_scoped_rls_and_plans.sql`
**Agent:** general-purpose. **Preconditions:** T5 done + T1 live policy-name baseline available.
**Do:**
1. Copy doc 02 → "Migration 050" (v1.1) verbatim into `insforge/migrations/050_company_scoped_rls_and_plans.sql`. It already DROPs the 16 live `jobs` policies by name (finding L-2), dedupes triggers/index, and recreates a single public read + company-scoped policies.
2. **Reconcile the DROP list against `_migration_refs.md` (T1 live policy names).** If the live `jobs` policy set differs from the names in `02`, update the `DROP POLICY` statements to match live exactly — a missed blanket policy leaves the L-2 hole open (policies are OR-ed).
   **ARCHITECT DECISION (2026-07-17, resolving the T6 stop):** the DROP list is the **14 recruiter/user-reachable** policies from doc 02, NOT all 16 live names. `admin_bypass` and `project_admin_policy` on `jobs` are **retained** — they are `TO project_admin` only (unreachable from user JWTs, so not part of L-2), and house rule #2 requires `admin_bypass` on every table; dropping them without recreation would strand platform-admin access. `project_admin_policy` is a redundant duplicate of `admin_bypass` (here and on `companies`) — dedupe is post-launch cleanup, not 050.
   **ARCHITECT DECISION (2026-07-17):** every `CREATE POLICY` in 050 must be preceded by `DROP POLICY IF EXISTS` (locked decision #2 — idempotency); doc 02's 050 block omits the guard on 7 policies (`jobs_admin_all`, `jobs_select_company`, `jobs_no_direct_insert`, `jobs_update_company`, `jobs_delete_company`, `apps_company_view`, `apps_company_update`) — add them.
3. **RECORDED ARCHITECT DECISION (was a v1.0 [SUGGESTION], now decided):** the public jobs read policy includes a verified-company predicate so suspended/unverified companies' jobs disappear from public listings. This is the `jobs_select_approved` recreated in doc-02 050 — extend it to:
   ```sql
   DROP POLICY IF EXISTS jobs_select_approved ON public.jobs;
   CREATE POLICY jobs_select_approved ON public.jobs FOR SELECT TO public
     USING (status = 'active' AND is_approved = true
            AND EXISTS (SELECT 1 FROM public.companies c
                        WHERE c.id = jobs.company_id AND c.status = 'verified'));
   ```
   Rationale/trade-off: hides jobs the moment a company is suspended (desired for trust/safety) at the cost of a subquery per public row — covered by `companies(status)` index from 046. This is now in-scope, not a suggestion.
**Verify (static):** all **recruiter/user-reachable** live `jobs` policy names from T1 (14 of 16 — `admin_bypass`/`project_admin_policy` retained per the 2026-07-17 decision) appear in a `DROP POLICY`; every `CREATE POLICY` preceded by `DROP POLICY IF EXISTS`; `plan_limits` seeded with `('free',1,0,false)`; company-scoped `jobs`/`applications` policies use `authz.company_id_of((SELECT auth.uid()))`; `enforce_active_job_limit` trigger present; the verified-company public read present; zero bare `auth.uid()`.
**Done when:** file exists with doc-02 v1.1 DDL, DROP list reconciled to live, verified-company predicate present.

## T6b — Write `051_verification_and_member_rpcs.sql`
**Agent:** general-purpose. **Preconditions:** T6 done.
**Do:** copy doc 02 → "Migration 051" verbatim into `insforge/migrations/051_verification_and_member_rpcs.sql`. No deltas. Includes `reject_company_verification` + `request_more_info_for_verification` RPCs, the `guard_last_company_admin` trigger, and the `accept_company_invite` RPC (with `REVOKE`/`GRANT EXECUTE`).
**Verify (static):** all three functions are `SECURITY DEFINER` with `SET search_path`; each verification RPC re-checks `authz.is_admin()` and accepts `status IN ('submitted','under_review')`; the trigger is `BEFORE UPDATE OR DELETE ON company_members`; `accept_company_invite` scopes the flip to `user_id = (SELECT auth.uid())`; `GRANT EXECUTE ... TO authenticated` present for all three; zero bare `auth.uid()`.
**Done when:** file exists matching doc 02.

## T7 — Register migrations + idempotency checks + TS types
**Agent:** general-purpose. **Preconditions:** T2–T6b done.
**Do:**
1. In `scripts/apply-migrations-safely.mjs`, add to the `checks` map:
   ```js
   '046_company_first_companies.sql': { type: 'function', name: 'noop_046' }, // no reliable single-object check; rely on idempotent DDL
   '047_company_members_and_authz.sql': { type: 'table', name: 'company_members' },
   '048_verification_workflow.sql': { type: 'table', name: 'company_verification_requests' },
   '049_repoint_ownership_and_rpcs.sql': { type: 'function', name: 'create_job' },
   '050_company_scoped_rls_and_plans.sql': { type: 'table', name: 'plan_limits' },
   '051_verification_and_member_rpcs.sql': { type: 'function', name: 'accept_company_invite' },
   ```
   (046 has no clean single-object sentinel because it's an in-place alter + drop; its DDL is idempotent **except the `DROP TABLE company_profiles` and the `is_verified→status` UPDATE** — re-running the UPDATE is harmless (idempotent mapping), and the DROP is `IF EXISTS`. Still, prefer running 046 **once, file-by-file** at T10 rather than relying on re-run. Use a `'table_absent'`/manual check or just apply 046 individually.)
2. Repo-wide grep gate: `grep -rn "auth.uid()" insforge/migrations/04[6-9]*.sql insforge/migrations/05[0-1]*.sql | grep -v "SELECT auth.uid()"` → must return **nothing**. If it returns lines, fix them.
3. Add/extend TypeScript types for the new tables (`companies` status field, `company_members`, `plan_limits`) wherever the repo declares DB row types (search `types/` and `lib/` for existing `Job`/`Company` interfaces; follow that pattern). Do not invent a new type location.
**Verify:** `npx tsc --noEmit` shows no NEW errors vs baseline; the bare-`auth.uid()` grep is empty.
**Done when:** checks map updated, grep gate clean, types compile.

## T8 — Migrate code references `company_profiles` → `companies` (BLOCKING before T10)
**Agent:** general-purpose. **Preconditions:** T1 (list) + T7 done.
**Do:** for every code site in `_migration_refs.md` (from T1), change `company_profiles` to `companies` — SDK `.from('company_profiles')` → `.from('companies')`, SQL literals, and any type names (rename `CompanyProfile`→`Company` only if it does not collide; otherwise leave the type name and just fix the table string). Note the column drift: live `companies` has `description` (not `about`) and no `recruiter_id` — any site selecting `about`/`recruiter_id` from the old table must be updated to the `companies`/`company_members` equivalents. **Do not** touch `insforge/migrations/` history or `docs/`.
> ⚠️ **There is no compat view (v1.1).** 046 DROPs `company_profiles`, so any reference left un-migrated will **error** after T10. This task MUST be 100% complete and verified before the T10 gate — it is a hard precondition of T10, not a cleanup that can trail into T12.
**Verify:** `npx tsc --noEmit` no new errors; `npx eslint <changed files>` clean; re-grep confirms **zero** remaining `company_profiles` references in app code AND edge functions.
**Done when:** no code or edge function references `company_profiles` by name (their redeploy is T11).

## T9 — P0-4: route job creation through `create_job` RPC + lock down the edge fn
**Agent:** general-purpose. **Preconditions:** T5 (create_job defined) + T8 done.
**Do:**
1. Wherever the app creates a job (find the `/api/jobs` POST route and any client caller; also see `insforge/functions/jobs/index.ts`), replace the direct insert with a call to the RPC: `insforge.database.rpc('create_job', { p_payload })`, passing ONLY the job content fields from `jobCreateSchema` (03) — never `company_id`/`recruiter_id`.
2. In `insforge/functions/jobs/index.ts` POST branch: remove `company_id`/`recruiter_id` from `jobCreateSchema` and the insert; either (a) delete the POST-create path entirely (preferred — creation now goes through the RPC), or (b) if the fn must keep POST, have it call the `create_job` RPC with the caller's JWT (not the service key) so RLS/entitlement apply. Pick (a) unless T1/T8 shows a live caller that needs the fn endpoint.
**Verify:** `npx tsc --noEmit`/eslint clean; static read confirms no code path inserts a job with a client-supplied `company_id`.
**Done when:** the only way to create a job is the `create_job` RPC; edge-fn create path no longer trusts client ownership.

## T10 — 🚦 GATE: apply migrations 046–051 to the live database
**Agent:** general-purpose, **only after explicit human go-ahead.** **Preconditions:** T2–T9 done and reviewed; **T8 fully complete (zero `company_profiles` references remain)** — 046 drops that table with no compat view.
**Do (in this exact order):**
1. **Snapshot/backup** the InsForge database (via the InsForge console or CLI) and record the snapshot id. Do not proceed without it.
2. Apply to a **dev/staging branch restored from the live snapshot first** if available (insforge-cli backend branches) — the git migrations do NOT reflect live state, so only a live-restored branch is a valid rehearsal. If no branch is available, apply directly to the project only with the human's explicit confirmation.
3. **Apply each of 046–051 individually via `exec_sql`, in order** — 046 first (it contains the guarded `DROP TABLE` and the `is_verified→status` map; confirm its precondition guard passed, i.e. company_profiles was empty). **ARCHITECT DECISION (2026-07-17): do NOT run `scripts/apply-migrations-safely.mjs` at T10.** Its loop applies every `.sql` in the directory that lacks a `checks` entry **unconditionally** — that includes 046 AND all legacy 030–045b files, which would be blindly re-executed against prod. The checks-map entries added in T7 remain useful skip-detection if the script is ever run, but the gated apply is manual, file-by-file. Watch for the first `❌` and STOP if any migration fails — report the failing file + error; do not continue.
4. If 046's empty-`company_profiles` guard raises (table not empty), STOP — someone wrote to the vestige; reconcile those rows into `companies` before retrying.
**Verify:** run the verification SQL in T11.
**Done when:** all five migrations report success and T11 passes. **Rollback on failure:** restore the snapshot from step 1 (do NOT hand-reverse — `company_profiles` is dropped and cannot be un-dropped without the DDL captured in T1).

## T11 — 🚦 GATE: post-apply verification + edge-fn redeploy + security smoke tests
**Agent:** general-purpose, paired with T10. **Preconditions:** T10 applied.
**Do:**
1. **Redeploy** the edge functions flagged in T1/T8/T9 (at minimum `jobs`) so they run the migrated code.
2. Run verification queries (via `exec_sql`/console):
   - `SELECT count(*) FROM company_members;` → ≥ number of existing recruiters with a job or `profiles.company_id` (backfill worked).
   - `SELECT id, name, status FROM companies;` → all 6 rows present; previously `is_verified=true` companies now `status='verified'` (mapping worked); none wrongly reset to `pending`.
   - `SELECT to_regclass('public.company_profiles');` → **NULL** (vestige dropped).
   - Policy check: `SELECT polname FROM pg_policy WHERE polrelid='public.jobs'::regclass;` includes `jobs_select_company`, `jobs_update_company`, verified-company `jobs_select_approved`, and **excludes** the dropped blanket policies (`jobs_update_own`, `"Recruiters can update own jobs"`, etc. — L-2 closed).
   - `SELECT polname FROM pg_policy WHERE polrelid='public.companies'::regclass;` → **excludes** `"Recruiters manage company"` (L-1 closed).
   - `SELECT * FROM plan_limits;` → `free / 1`.
3. **Security regressions (the point of all this):**
   - **C-1:** as a normal candidate JWT, `PATCH .../profiles?id=eq.<self>` with `role='super_admin'` → must be **rejected** (guard trigger).
   - **C-4 / entitlement:** as a recruiter, call `create_job` twice with `status='active'` → 2nd must fail `active job limit reached`; and confirm a recruiter cannot create a job under another company (create_job derives company from the JWT).
   - **L-1:** as recruiter A, `PATCH .../companies?id=eq.<company-of-B>` → must be **rejected** (the "any recruiter edits any company" policy is gone).
   - **L-2:** as the owner of an **approved** job, attempt to edit it directly via the data API → must be constrained by `jobs_update_company` (no blanket owner-update path remains).
   - Cross-tenant read: recruiter A cannot select recruiter B-company applications.
**Done when:** all security regressions (C-1, C-4, L-1, L-2, cross-tenant) pass and verification queries match. Record results in `_migration_refs.md` or a short verify note.

## T12 — (removed in v1.1)
There is no compat view to drop — 046 alters `companies` in place and drops the empty `company_profiles` outright, with all code references migrated beforehand in T8. The old T12 "drop compat view" step no longer applies. Post-launch cleanup of the legacy `is_verified`/`is_active` columns (once all readers use `status`) can be scheduled as a later migration, but it is not part of this runbook.

---

# Dependency graph

```
T1 ─┬─> T2 ─> T3 ─> T4 ─> T5 ─> T6 ─> T6b ─> T7 ─┬─> T8 ─> T9 ─> [🚦 T10 ─> T11]
    │        (T1 baseline feeds T2/T6)            │
    └──────────────────(feeds T8)────────────────┘
(T8 must be 100% complete before the T10 gate — no compat view backstops un-migrated refs.)
```

# Global rules for every agent
- Static/file work (T1–T9) makes **no live-DB changes** and needs no gate.
- Any `exec_sql`, migration apply, edge-fn deploy, or `DROP` against the live project is **gated** (T10–T11) — never run without explicit human go-ahead in that turn.
- **The git migrations do not describe the live DB.** Always work from the T1 live baseline for policy/table names, not from `001`/`docs/database_schema.md`.
- If a task's Verify step fails, STOP and report; do not "fix forward" into an unlisted change.
- Report each task's Done-criteria result before the next agent starts.

# References
`02_Schema_And_Database_Design.md` (DDL v1.1), `01_Auth_Security_Audit_Report.md` (P0-4/P0-5 + live findings L-1/L-2), `03`, `04`; `scripts/apply-migrations-safely.mjs`; `insforge/functions/jobs/index.ts`; `insforge/migrations/` (045 latest — note duplicate-numbered files exist, so "strict order" is by-number-then-filename).
