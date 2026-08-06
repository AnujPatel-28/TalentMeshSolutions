Prompt 3 — Gemini Flash 3.5 (or Sonnet): Runbook T1 — reference audit + live baseline (read-only)

You are executing task T1 from docs/specs/09_Migration_Execution_Runbook.md in the Talentmesh-demo project. T1 is strictly READ-ONLY: no code edits, no DB writes, no deploys. Architect decisions in 09 are locked — do not re-decide anything.

Do exactly what T1 specifies:
1. Grep the repo (exclude node_modules, docs/, insforge/migrations/, *.md) for the literal string company_profiles in **/*.{ts,tsx,js,mjs,cjs} and insforge/functions/**.
2. Categorize every hit: (a) SDK .from('company_profiles') calls, (b) SQL string literals, (c) type/interface names, (d) edge functions needing redeploy. Also grep .from('companies') to confirm edge functions already use the live table.
3. Capture the LIVE database baseline via InsForge MCP (get-table-schema / run-raw-sql, reads only):
   - Full CREATE TABLE DDL for companies, company_profiles, and jobs. The company_profiles DDL is mandatory — migration 046 drops that table and it cannot be un-dropped without this capture.
   - ALL policy names + definitions on companies (exact name of "Recruiters manage company" for the L-1 drop) and ALL policies on jobs (expected ~16 — the L-2 drop list). If live names differ from what 02/050 list, flag each difference explicitly.
   - Confirm company_profiles row count is 0 and companies has 6 rows.
4. Save everything to docs/specs/_migration_refs.md — that file is the ONLY write you make.

Done when: _migration_refs.md names every code site + edge function touching company_profiles AND contains the live companies/company_profiles/jobs DDL and complete policy name lists. Report the file contents summary + any live-vs-doc discrepancies. This feeds T2, T6, T8, and the T10/T11 gates.

---
Sequencing notes:
- Prompt 1 and Prompt 3 can run in parallel (both read-only). Prompt 2 is independent working-tree code, so it can also run in parallel in a separate session — just don't have two agents in the same working tree at once.
- Nothing touches the live DB from these three prompts. The actual P0-6 DROP POLICY apply happens only after you paste Opus's output back here and I gate it.
- When each finishes, bring me: Prompt 1's SQL + analysis (deep review, then human go/no-go), Prompt 2's diff (deep review vs doc 10 §4/§5), Prompt 3's _migration_refs.md (light review, then T2 can start).

-----

T1 is complete. Summary:

Code references to company_profiles (repo-wide, excluding node_modules/docs/migrations/*.md):
- (a) SDK .from('company_profiles'): exactly 1 hit — app/company/[companyId]/page.tsx:176 (runs alongside a .from('companies') call and merges results — currently dead weight since the table is empty).
- (b) SQL literals: 2 hits, both in scripts/verify_rls_regression.mjs:41-42 (a raw-SQL test/regression script, not app code).
- (c) Type/interface names: none — no CompanyProfile type exists anywhere.
- (d) Edge functions: exactly 1 — insforge/functions/jobs-id/index.ts:78, but it's a response-shape shim (builds a company_profiles key entirely from record.companies, doesn't query the table).
- Confirmed via .from('companies') grep that all edge functions (recruiter-request, recruiter-profile, admin-recruiters, admin-jobs, company-profile, admin-companies) already query the live companies table — decision #5 holds.
- New finding beyond the literal grep: ~15 frontend call sites (JobCard.tsx, browse-jobs/*, jobs/[id]/*, candidate dashboard) read job.company_profiles?.x depending on that same shim staying in place. These won't show up as errors in tsc/eslint/grep if the shim is removed without updating them — flagged for T8 to handle explicitly (either keep the shim permanently or update all read sites).

Live DB baseline (via InsForge MCP, read-only):
- company_profiles: 0 rows, full DDL captured (mandatory before 046 drops it).
- companies: 6 rows, full DDL captured; policies are exactly Public view active companies / project_admin_policy / admin_bypass — confirms "Recruiters manage company" is already gone live, matching the runbook's own note.
- jobs: 16 policies captured by exact name (matches expected count); also confirmed a duplicate index (idx_jobs_status vs idx_jobs_status_approved) and 3 redundant updated_at triggers, both consistent with what 050's planned dedupe already expects.
- is_verified→status mapping preview: 3 companies → verified, 3 → pending, 0 → deactivated.

No live-vs-doc contradictions were found — the runbook's v1.1 corrections check out against live state. Everything is saved to docs/specs/_migration_refs.md (the only file written), ready to feed T2, T6, T8, and the T10/T11 gates.