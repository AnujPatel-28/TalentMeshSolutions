Prompt for T2 (Opus / Gemini Pro 3.1)

You are executing task T2 from docs/specs/09_Migration_Execution_Runbook.md in the Talentmesh-demo project. Architect decisions in 09 are LOCKED — no rename, no compat view, in-place alter of companies. T1 is complete: the live baseline is in docs/specs/_migration_refs.md — treat it as the ONLY truth about live state (git migrations do not reflect live).

Do:
1. Copy the DDL from 02_Schema_And_Database_Design.md → "Migration 046" (v1.1) verbatim into insforge/migrations/046_company_first_companies.sql.
2. Reconcile every DROP POLICY name against _migration_refs.md. Known: "Recruiters manage company" is ALREADY GONE live (L-1 closed 2026-07-16, see 045b_fix_companies_rls_L1.sql) — keep the idempotent DROP POLICY IF EXISTS as a no-op guard. Live companies policies are: "Public view active companies", "admin_bypass", "project_admin_policy".
3. Confirm the file keeps: the empty-company_profiles guard (abort if rows exist), the is_verified→status mapping UPDATE (T1 preview: 3→verified, 3→pending, 0→deactivated — your file must produce exactly that), the index adds, the updated_at trigger, and DROP TABLE IF EXISTS company_profiles.
4. Do NOT add a compat view, do NOT add any rename, do NOT apply anything to any database. File-only task.

Verify (static): file parses as SQL; grep the file for bare auth.uid() not wrapped as (SELECT auth.uid()) → zero; no CREATE VIEW company_profiles; no ALTER TABLE ... RENAME; guard + status-mapping UPDATE present.

Output: the file path, a section-by-section summary of the SQL, and any place where doc 02's DDL disagreed with the T1 live baseline (list each with what you chose and why the baseline wins). This goes to a deep Fable review before T3 starts.

Bring me the T2 output and the e2e result, and I'll gate both. I've also updated my memory notes so future sessions know P0-6 is closed and doc 10 is implemented-pending-e2e.

---

T2 done, file-only, nothing applied to any database.

File: Talentmesh-demo/insforge/migrations/046_company_first_companies.sql

Section-by-section

┌─────┬────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  §  │                                                                  What it does                                                                  │
├─────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 0   │ DO $$ guard — RAISE EXCEPTION if company_profiles exists and has any row. T1 confirms 0 rows, so it passes.                                    │
├─────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│     │ ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS × 10: status (NOT NULL DEFAULT 'pending', CHECK in                                       │
│ 1   │ pending/verified/suspended/deactivated), verified_at, verified_by, created_by (both FK → profiles(id) ON DELETE SET NULL), updated_at, cin,    │
│     │ pan, registered_email_domain, country_code (DEFAULT 'IN'), slug. No rename, no drop of is_verified/is_active.                                  │
├─────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│     │ The is_verified→status mapping UPDATE: is_active = false → 'deactivated', else is_verified = true → 'verified', else 'pending'; plus           │
│ 2   │ verified_at = COALESCE(verified_at, created_at, now()) for verified rows only. Against the 6 live rows in the T1 baseline this yields exactly  │
│     │ 3 verified / 3 pending / 0 deactivated, matching the T1 preview.                                                                               │
├─────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 3   │ Four index adds, all IF NOT EXISTS: partial unique on gstin, partial unique on slug, plus btree on status and on created_by.                   │
├─────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 4   │ DROP TRIGGER IF EXISTS trigger_set_updated_at then recreate it BEFORE UPDATE calling set_current_timestamp_updated_at() (the same house        │
│     │ function the live company_profiles trigger used).                                                                                              │
├─────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 5   │ RLS: no-op DROP POLICY IF EXISTS "Recruiters manage company"; recreate admin_bypass; replace "Public view active companies" with               │
│     │ companies_public_read (is_active = true AND status <> 'deactivated'); add interim companies_owner_write on created_by = (SELECT auth.uid()).   │
├─────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 6   │ DROP TABLE IF EXISTS public.company_profiles.                                                                                                  │
└─────┴────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

Verification

Bare auth.uid() not wrapped in (SELECT ...): 0. No CREATE VIEW company_profiles, no ALTER TABLE ... RENAME (the single "RENAME" hit is doc 02's own "NO RENAME" comment, copied verbatim). Guard, status-mapping UPDATE, and the table drop are all present. On "parses as SQL": no real Postgres parser is available here — psql isn't installed and Python is a Store stub — so I ran a structural check instead (balanced $$, balanced parens, terminated statements, 18 top-level statements enumerated and each one is the expected form). That is not equivalent to a genuine parse; a true syntax check needs the T10 apply against Postgres, or psql locally.

Doc 02 vs T1 baseline

Every DROP POLICY name reconciles cleanly — no correction was needed:

- "Recruiters manage company" — doc 02 drops it; baseline §2.2 confirms it's already gone live (L-1 closed out-of-band 2026-07-16). Kept as an idempotent no-op guard per locked decision #5.
- admin_bypass and "Public view active companies" — both live, both correctly targeted.
- project_admin_policy is live but doc 02 never touches it, and I left it alone. Worth naming for the Fable review: it's ALL / project_admin / true / true, functionally identical to admin_bypass, so it survives 046 as a redundant duplicate. Not my call to fix — no delta authorizes it.

One deliberate deviation from verbatim, flagged for review: doc 02 creates companies_public_read and companies_owner_write with no preceding DROP POLICY IF EXISTS, so a re-run would fail with "policy already exists". That contradicts locked decision #2 (all SQL idempotent, never assume a clean DB) and the 045b house pattern. I added the two DROP POLICY IF EXISTS guards (lines 73 and 77). Semantically neutral on a first run; makes re-runs safe. If the architect wants strict verbatim over decision #2, remove those two lines — but then 046 is single-shot only.

Baseline-vs-doc facts I relied on and confirmed hold: live companies has description not about, has no recruiter_id, and has no updated_at — the DDL's column adds and comments match all three.