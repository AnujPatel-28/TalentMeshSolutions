# T1 — Reference Audit + Live-State Baseline (READ-ONLY)

**Captured:** 2026-07-17. No code or DB writes were made producing this file — this file itself is the only write (per T1 scope).

---

## 1. Code references to `company_profiles`

Scope: `**/*.{ts,tsx,js,mjs,cjs}` repo-wide + `insforge/functions/**`, excluding `node_modules/`, `docs/`, `insforge/migrations/`, `*.md`. (`node_modules` is already gitignored so ripgrep never descended into it.)

### (a) SDK `.from('company_profiles')` calls — reads the EMPTY vestige, already effectively broken

| File | Line | Note |
|---|---|---|
| `app/company/[companyId]/page.tsx` | 176 | `insforge.database.from('company_profiles').select('*').eq('id', companyId).maybeSingle()`. Runs **alongside** a `.from('companies')` call at line 169 for the same id; the component merges both results (`compData?.x || profileData?.x`) at lines 187–199. Since `company_profiles` is empty, `profileData` is always null in practice today — this call is dead weight, not a functional dependency, but it must still be deleted/merged into the `companies` read in T8 since 046 drops the table outright (post-T10 this becomes a hard error, not a silent no-op, because the table won't exist to query at all — currently it just returns 0 rows). |

**Grep used:** `\.from\('company_profiles'\)` / `\.from\("company_profiles"\)` — exactly one hit, confirmed above.

### (b) SQL string literals referencing `company_profiles`

| File | Line | Note |
|---|---|---|
| `scripts/verify_rls_regression.mjs` | 41 | `INSERT INTO public.company_profiles (name) VALUES ('Test Company A') RETURNING id INTO comp_a;` — inside a raw `DO $$ ... $$` block run via `exec_sql`/raw SQL, not the SDK. Standalone test/regression script, not part of the app runtime. |
| `scripts/verify_rls_regression.mjs` | 42 | Same pattern for Test Company B. |

Both lines seed test companies that are then referenced by `comp_a`/`comp_b` throughout the rest of the DO block (recruiter/candidate profiles, jobs, applications, etc. — not themselves `company_profiles` references, so not further enumerated here). After 046 drops `company_profiles`, this script will fail at line 41 unless updated to `INSERT INTO public.companies`. **Not an edge function, not app code — a standalone maintenance/test script**, but still must be migrated in T8 since it references the table by name and the runbook's scope for T8 is "every code site in this file."

No other SQL string literals containing `company_profiles` were found in app code or edge functions.

### (c) Type/interface names

**None found.** Grepped `CompanyProfile` (PascalCase, the natural TS type name) across `**/*.{ts,tsx,js,mjs,cjs}` — zero matches. There is no `CompanyProfile` interface/type to rename. The `company_profiles` string appears only as:
- a literal SDK table-name argument (category a),
- a raw SQL identifier (category b),
- **an object *key*** in several places that are NOT table references — see "Response-shape usages" below. These are plain object literal keys (`company_profiles: {...}`), not TS type/interface declarations, so they don't belong in category (c), but they DO need updating in T8 since they shape what `job.company_profiles` resolves to on the client.

### (d) Edge functions needing redeploy

| File | Line | What it does |
|---|---|---|
| `insforge/functions/jobs-id/index.ts` | 78 | `serializeJob()` builds a response object with a `company_profiles: {...}` key, populated **entirely from `record.companies`** (line 79–86: `record.companies?.id`, `record.companies?.name`, etc.) — it does NOT query a `company_profiles` table. This is a client-compatibility shim: the function already reads only from `companies` (confirmed — see `.from('companies')` results below) and manually re-shapes the row under a `company_profiles` key in the JSON payload so older frontend code (`job.company_profiles?.x`) keeps working. **This is the only edge function with any `company_profiles` string.** It needs redeploy in T11 not because it queries the dropped table, but because after T8 removes/renames the `company_profiles` key on the frontend, this shim becomes unnecessary (or must be kept if any consumer still expects it — see recommendation below). |

**No other edge function under `insforge/functions/**` references `company_profiles`.**

### Cross-check: `.from('companies')` usage — confirms edge functions already use the live table

Edge functions already querying `companies` (the live canonical table), confirming decision #5's claim ("Deployed edge functions already use `companies`"):

| File | Lines |
|---|---|
| `insforge/functions/recruiter-request/index.ts` | 168, 179, 199 |
| `insforge/functions/recruiter-profile/index.ts` | 113, 123 |
| `insforge/functions/admin-recruiters/index.ts` | 387, 396, 414 |
| `insforge/functions/admin-jobs/index.ts` | 139 |
| `insforge/functions/company-profile/index.ts` | 70, 101, 117 |
| `insforge/functions/admin-companies/index.ts` | 75, 99, 126 |

App code also already reading `companies` directly:

| File | Lines |
|---|---|
| `lib/server/jobs.ts` | 344 |
| `app/dashboard/recruiter/[role_id]/jobs/post-job/page.tsx` | 167 |
| `app/company/[companyId]/page.tsx` | 169 |
| `app/dashboard/candidate/[role_id]/company-reviews/page.tsx` | 62 |
| `app/dashboard/admin/search/page.tsx` | 61 |
| `components/admin/UniversalSearch.tsx` | 92 |
| `app/portals/admin/dashboard/search/page.tsx` | 66 |
| `scripts/create-test-recruiter.ts` | 78, 94 |

**Confirmed:** no edge function anywhere queries `company_profiles` as its data source. The single hit in `jobs-id/index.ts` is an output-shaping key derived from `companies`, not a table read. Decision #5's claim holds.

### Response-shape ("client compat key") usages — not table reads, but must be migrated in T8

These construct/consume a `company_profiles` object key on already-fetched job records (sourced from `companies`), for frontend components that still read `job.company_profiles?.x`. None of these query a database table named `company_profiles` — they're pure JS object shaping — but T8 must address them because after 046 the underlying data only ever comes from `companies`, and leaving dead dual-key fallbacks (`job.company_profiles || job.companies`) is exactly the kind of un-migrated reference the runbook's ⚠️ note in T8 warns about (silent broken fields, not hard errors, since these are JS optional-chaining reads, not SQL/SDK calls against a dropped table — but still broken product behavior since `company_profiles` is empty/undefined once the shim funcs are also cleaned up).

| File | Lines | Pattern |
|---|---|---|
| `lib/server/jobs.ts` | 112–121 | `serializeJob()` — builds `company_profiles: {...}` from `record.companies`, same shim pattern as the edge function above. |
| `insforge/functions/jobs-id/index.ts` | 78–87 | Same shim (see category d). |
| `components/jobs/JobCard.tsx` | 32 | `const company = job.company_profiles \|\| job.companies \|\| job.company \|\| {};` — read-side fallback chain. |
| `app/browse-jobs/page.tsx` | 150, 164, 246, 329, 577 | Same fallback-chain pattern; line 164 also **writes** a `company_profiles` key when constructing a job object client-side. |
| `app/browse-jobs/[id]/page.tsx` | 137, 227, 228, 230, 237, 374, 375 | Reads `job.company_profiles?.x` directly (no fallback to `.companies`) — relies entirely on the shim from `lib/server/jobs.ts` / `jobs-id` staying present. |
| `app/jobs/[id]/page.tsx` | 61, 62, 67 | Same direct-read pattern as above. |
| `app/jobs/[id]/apply/page.tsx` | 188, 209 | Same direct-read pattern. |
| `app/jobs/[id]/share/page.tsx` | 86 | Same direct-read pattern. |
| `app/dashboard/candidate/[role_id]/page.tsx` | 180, 397, 1672 | Reads `job.company_profiles?.x`; line 397 also **writes** `company_profiles: job.companies || {}` when normalizing a job object. |

**Note for T8:** several of these pages (`browse-jobs/[id]`, `jobs/[id]/*`) have NO fallback to `.companies` and depend entirely on the server (`lib/server/jobs.ts` / `jobs-id` edge fn) continuing to emit a `company_profiles` key. If T8 removes the shim without updating these ~15 direct-read call sites to read `.companies` instead, they will silently render blank company names/logos (not a hard TS/SDK error, since it's optional chaining on a JS object — `npm run build`/`tsc` will NOT catch this). **T8 must either (a) keep the `company_profiles` shim key in `lib/server/jobs.ts`/`jobs-id` indefinitely as an intentional, documented compat alias, or (b) update all ~15 direct-read sites to `job.companies?.x` in the same pass.** This is called out because the runbook's automated Verify steps (`tsc`, `eslint`, grep) will NOT catch a silently-dropped display field — it needs manual/visual verification too.

---

## 2. Live database baseline (via InsForge MCP, read-only: `get-table-schema` + `run-raw-sql`)

### 2.1 `companies` — CREATE TABLE DDL (reconstructed from live schema)

```sql
CREATE TABLE public.companies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  website text,
  industry text,
  size text,
  description text,
  location text,
  is_verified boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  gstin text,
  tan text,
  kyc_documents jsonb,
  CONSTRAINT companies_pkey PRIMARY KEY (id)
);
-- Indexes: companies_pkey (unique, primary) on (id) — no other indexes live.
-- No foreign keys on companies.
-- RLS: ENABLED.
```

**Note:** live `companies` has `description` (not `about`) and has **no `recruiter_id` column** — matches decision #9/#5's premise exactly. Any T8 code site selecting `about` or `recruiter_id` off a company row must be corrected to `description` / (no direct column — use `company_members`/`created_by` per 047/049).

### 2.2 `companies` — live RLS policies (exact names, for the T2/046 L-1 drop)

| Policy name | Command | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| `Public view active companies` | SELECT | `public` | `(is_active = true)` | — |
| `project_admin_policy` | ALL | `project_admin` | `true` | `true` |
| `admin_bypass` | ALL | `project_admin` | `true` | `true` |

**🔴 DISCREPANCY CONFIRMED (matches runbook's own note, re-verified independently here):** the live policy set is exactly `Public view active companies` / `project_admin_policy` / `admin_bypass` — **`"Recruiters manage company"` does NOT exist on live `companies`.** This matches decision #5's claim that L-1 was "already resolved out-of-band as of 2026-07-16." **T2/046's `DROP POLICY IF EXISTS "Recruiters manage company"` is confirmed to be a no-op against current live state** (the `IF EXISTS` guard makes this safe either way — no correction needed to the DROP statement itself, since dropping a nonexistent policy by name with `IF EXISTS` succeeds silently).

### 2.3 `company_profiles` — CREATE TABLE DDL (MANDATORY capture — 046 drops this, not reversible without this record)

```sql
CREATE TABLE public.company_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  recruiter_id uuid,
  name text,
  logo_url text,
  about text,
  website text,
  industry text,
  gstin text,
  tan text,
  kyc_documents jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT company_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT company_profiles_recruiter_id_fkey FOREIGN KEY (recruiter_id)
    REFERENCES public.profiles(id)
);

CREATE INDEX idx_company_profiles_recruiter_id ON public.company_profiles USING btree (recruiter_id);

CREATE TRIGGER trigger_set_updated_at
  BEFORE UPDATE ON public.company_profiles
  FOR EACH ROW EXECUTE FUNCTION set_current_timestamp_updated_at();

-- RLS: ENABLED. Policies: project_admin_policy (ALL, role project_admin, true/true),
--                          admin_bypass          (ALL, role project_admin, true/true).
-- No public/authenticated policy exists on company_profiles at all — it has never been
-- readable by normal users under RLS; only project_admin role and above.
```

**Row count: 0** (confirmed via `SELECT count(*) FROM public.company_profiles` — matches the "empty vestige" premise; 046's empty-table guard will pass).

### 2.4 `jobs` — live RLS policies (exact names, for the T6/050 L-2 drop list — expected ~16)

**Confirmed: 16 policies live**, matching the runbook's expected count:

| # | Policy name | Command | Roles | USING | WITH CHECK |
|---|---|---|---|---|---|
| 1 | `Admins can view all jobs` | SELECT | `authenticated` | `authz.is_admin()` | — |
| 2 | `admins_all` | ALL | `authenticated` | `authz.is_admin()` | `authz.is_admin()` |
| 3 | `project_admin_policy` | ALL | `project_admin` | `true` | `true` |
| 4 | `public_select` | SELECT | `public` | `(status = 'active' AND is_approved = true)` | — |
| 5 | `admin_bypass` | ALL | `project_admin` | `true` | `true` |
| 6 | `Recruiters can insert jobs` | INSERT | `authenticated` | — | `((SELECT auth.uid()) = recruiter_id) AND authz.is_recruiter()` |
| 7 | `jobs_select_approved` | SELECT | `public` | `(status = 'active' AND is_approved = true)` | — |
| 8 | `Recruiters can delete own jobs` | DELETE | `public` | `((SELECT auth.uid()) = recruiter_id)` | — |
| 9 | `Recruiters can update own jobs` | UPDATE | `public` | `((SELECT auth.uid()) = recruiter_id)` | — |
| 10 | `Recruiters view own jobs` | SELECT | `public` | `((SELECT auth.uid()) = recruiter_id)` | — |
| 11 | `jobs_update_unapproved` | UPDATE | `public` | `((SELECT auth.uid()) = recruiter_id AND is_approved = false)` | `((SELECT auth.uid()) = recruiter_id AND is_approved = false)` |
| 12 | `jobs_update_approved` | UPDATE | `public` | `((SELECT auth.uid()) = recruiter_id AND is_approved = true)` | `((SELECT auth.uid()) = recruiter_id)` |
| 13 | `jobs_select_own` | SELECT | `public` | `((SELECT auth.uid()) = recruiter_id)` | — |
| 14 | `jobs_insert_own` | INSERT | `public` | — | `((SELECT auth.uid()) = recruiter_id)` |
| 15 | `jobs_update_own` | UPDATE | `public` | `((SELECT auth.uid()) = recruiter_id)` | — |
| 16 | `jobs_delete_own` | DELETE | `public` | `((SELECT auth.uid()) = recruiter_id)` | — |

**All live `auth.uid()` calls found in existing `jobs` policies are already the safe `(SELECT auth.uid())` form** — none are bare. (Relevant to decision #3's grep gate, though that gate targets the *new* migration files, not live policies.)

**⚠️ ACTION REQUIRED before T6/050 is finalized:** compare this 16-name list against the exact `DROP POLICY` list written into `02_Schema_And_Database_Design.md` / `050_company_scoped_rls_and_plans.sql` **once that file is drafted in T6** — this file only captures the live truth; T6 is responsible for doing the actual name-for-name reconciliation per the runbook's step 2. Names to watch in particular: `jobs_select_approved` is listed twice-equivalent to `public_select` (both identical predicates) — confirm 050's DROP list drops **both** `public_select` and `jobs_select_approved` (not just one), since RLS policies are OR'ed and a missed duplicate leaves a blanket-equivalent policy live.

### 2.5 `jobs` — DDL summary (for context, not the primary T1 deliverable but useful for T5/T6 authors)

Columns: `id uuid PK`, `company_id uuid NOT NULL` (FK → `companies.id`, no cascade rule set — `NO ACTION`/`NO ACTION`), `recruiter_id uuid NOT NULL`, `title text NOT NULL`, `description text NOT NULL`, `requirements text[]`, `skills_required text[]`, `type text`, `location text`, `salary_min/max numeric`, `currency text DEFAULT 'INR'`, `experience_min int DEFAULT 0`, `experience_max int`, `department text`, `status text DEFAULT 'draft'`, `is_approved boolean DEFAULT false`, `views_count int DEFAULT 0`, `applications_count int DEFAULT 0`, `fts tsvector`, `expires_at timestamptz`, `created_at/updated_at timestamptz DEFAULT now()`.

Indexes: `idx_jobs_company(company_id)`, `idx_jobs_fts` (gin on `fts`), `idx_jobs_recruiter_id(recruiter_id)`, `idx_jobs_status(status, is_approved)`, `idx_jobs_status_approved(status, is_approved)` **— note: `idx_jobs_status` and `idx_jobs_status_approved` are duplicate indexes on the identical column pair; 050's dedupe step (runbook line 95: "dedupes triggers/index") should drop one.**

Triggers (3, all BEFORE UPDATE, all doing the same thing): `tr_jobs_update` → `update_updated_at_column()`, `trigger_set_updated_at` → `set_current_timestamp_updated_at()`, `update_jobs_updated_at` → `update_updated_at_column()`. **Three redundant updated_at triggers on the same table — confirms runbook line 95's "dedupes triggers" is necessary, not speculative.**

FK: `jobs_company_id_fkey (company_id) → companies(id)`.

### 2.6 Row counts (confirmed via raw SQL, read-only)

| Table | Row count |
|---|---|
| `company_profiles` | **0** ✅ (guard in 046 will pass) |
| `companies` | **6** ✅ (matches decision #5/#9's "6 existing companies") |
| `jobs` | 2 (not required by T1 spec, captured incidentally) |

`companies.is_verified` values for the 6 rows (relevant to 046's `is_verified→status` mapping in T2, all `is_active=true` so none map to `deactivated`):

| id | name | is_verified | is_active |
|---|---|---|---|
| `8773045c-c46c-4834-9efd-3226e00e5833` | Talentmesh Solutions | true | true |
| `c1a755b9-cff8-4c5e-be21-401400671b52` | Test Acme Corp 1780120170589 | false | true |
| `3931b4cf-e9d9-4569-bee1-4653311d0100` | chatgpt | true | true |
| `86f298b4-1c22-4fff-ba1a-589672a4e8f0` | Test Tech Company | false | true |
| `bb3d76bd-81d6-400f-a584-3377dc14dc49` | TalentMesh Solutions | false | true |
| `d9f0cbe2-f838-4a11-a9fd-9bbf616938c8` | google | true | true |

Under decision #9's mapping (`true→verified`, inactive→`deactivated`, else→`pending`): 3 rows map to `status='verified'`, 3 rows map to `status='pending'`, 0 rows map to `status='deactivated'` (all 6 are `is_active=true`).

---

## 3. Summary of discrepancies vs. docs 01/02/09 found during this audit

1. **`companies` policy set confirmed** to already exclude `"Recruiters manage company"` — matches runbook v1.1's own correction. No further action needed for T2 beyond keeping the `DROP POLICY IF EXISTS` idempotent (already specified).
2. **`jobs` policy count confirmed at 16**, names captured above — feeds T6 directly.
3. **Duplicate index** `idx_jobs_status` / `idx_jobs_status_approved` (identical columns) confirmed live — supports the planned 050 dedupe.
4. **Triple redundant `updated_at` trigger** on `jobs` confirmed live — supports the planned 050 dedupe.
5. **New finding, not previously flagged in 01/02/09:** the `company_profiles → companies` "shim key" pattern (`lib/server/jobs.ts`, `insforge/functions/jobs-id/index.ts`) means T8's grep-based verify (`tsc`/`eslint`/re-grep for the literal string `company_profiles`) will pass even if ~15 frontend call sites are left silently reading a field that no server response populates anymore. **Recommend T8 explicitly include a manual/visual check of the job-detail and browse-jobs pages** (company name/logo rendering), not just the automated checks listed in the runbook, OR keep the shim key intentionally and document it as permanent rather than transitional.
6. **`scripts/verify_rls_regression.mjs`** is a raw-SQL test script (not app code, not an edge function) that inserts into `company_profiles` — it's in scope for T8 per the runbook's literal instruction ("every code site in this file") but is worth flagging separately since it's a dev/test utility, not user-facing product code; breaking it doesn't affect production but will break CI/local regression testing if not updated.

No other discrepancies between live state and docs 01/02/09 were found during this read-only pass.
