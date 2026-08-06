Prompt 1 — Opus (or Gemini Pro 3.1): P0-6 hotfix prep — live companies RLS hole

You are executing task P0-6 from docs/specs/08_Implementation_Execution_Plan.md (Phase 0) in the Talentmesh-demo project. Context: 01_Auth_Security_Audit_Report.md finding L-1 — the LIVE production database has a policy "Recruiters manage company" on public.companies that lets ANY recruiter update/delete ANY company. This is a live cross-tenant write hole and must be hotfixed before Phase 1.

Read first: 01 (finding L-1), 08 (P0-6 row), 09 (Architect decisions — they are LOCKED, do not re-decide).

Do (READ-ONLY against the live DB — use the InsForge MCP tools):
1. Capture the exact live policy list on public.companies: SELECT polname, polcmd, qual/with_check via pg_policy (or get-table-schema). Confirm the exact name of the dangerous policy and record its full definition (needed for rollback).
2. Verify whether ANY current code path legitimately writes to companies as a recruiter (grep app code + insforge/functions for inserts/updates to 'companies'). The recruiter portal is behind a coming-soon rewrite in proxy.ts — confirm that, because if no legitimate writer exists, a bare DROP with no replacement policy is correct for the hotfix (the proper scoped policies arrive in migration 046).
3. Produce the exact hotfix SQL: DROP POLICY IF EXISTS "<exact live name>" ON public.companies; — using the live name from step 1, NOT the name in the docs if they differ. If you found a legitimate recruiter write path in step 2, STOP and report it instead of proposing a replacement policy — do not improvise scoped policies outside migration 046.
4. Write a rollback note: the captured CREATE POLICY statement that restores the dropped policy verbatim.

DO NOT apply anything to the live database. Output: (a) live policy dump, (b) legit-writer analysis, (c) the exact DROP statement, (d) rollback CREATE POLICY. This goes to a Fable review + human gate before apply.
No bare auth.uid() in anything you propose — always (SELECT auth.uid()).

---

Bottom line: the hole is already closed. Do not apply anything.

The policy "Recruiters manage company" does not exist on the live public.companies table. Finding L-1 is stale as written, and the P0-6 hotfix is a no-op. I did not apply anything (task was read-only regardless).

I confirmed I'm querying the real production backend, not a branch: SMTP sender noreply@mail.talentmeshsolutions.com, companies = 6 rows, company_profiles = 0 rows — matching the audit's L-1/L-3 fingerprints exactly.

(a) Live policy dump — public.companies

RLS is enabled (relrowsecurity = true, relforcerowsecurity = false). All three policies:

┌──────────────────────────────┬────────┬─────────────────┬────────────────────┬────────────┐
│           polname            │  cmd   │      roles      │        qual        │ with_check │
├──────────────────────────────┼────────┼─────────────────┼────────────────────┼────────────┤
│ Public view active companies │ SELECT │ {} (public)     │ (is_active = true) │ —          │
├──────────────────────────────┼────────┼─────────────────┼────────────────────┼────────────┤
│ admin_bypass                 │ ALL    │ {project_admin} │ true               │ true       │
├──────────────────────────────┼────────┼─────────────────┼────────────────────┼────────────┤
│ project_admin_policy         │ ALL    │ {project_admin} │ true               │ true       │
└──────────────────────────────┴────────┴─────────────────┴────────────────────┴────────────┘

There is no recruiter-writable policy of any kind. Since RLS is on and no permissive policy grants INSERT/UPDATE/DELETE to public or authenticated roles,
every non-project_admin write to companies is already denied. te P0-6 was meant to produce.

I also searched pg_policy across all schemas for %recruiter% —on companies. The name is not hiding on company_profiles either (admin-only, as L-3 says).

(b) Legitimate-writer analysis — no legit recruiter write path exists

Every write to companies goes through service-key edge functions that bypass RLS, so the drop is safe and always was:

- insforge/functions/company-profile/index.ts:101,117 — UPDATE/INSERT via insforgeAdmin, built at :42 as createClient({ baseUrl, anonKey:
resolvedServiceKey, isServerMode: true }). Same pattern in admst, recruiter-profile, admin-recruiters.
- All client-side .from('companies') calls are read-only .select(): app/company/[companyId]/page.tsx:169,
app/dashboard/recruiter/[role_id]/jobs/post-job/page.tsx:167, _id]/company-reviews/page.tsx:62, lib/server/jobs.ts:344 (admin client), plus the two admin search pages.
- The only client-shaped write is scripts/create-test-recruitept that also uses INSFORGE_SERVICE_KEY (:15) — not a production path.

Recruiter portal coming-soon confirmed: proxy.ts:269 rewrites every non-API/static, non-auth isAppPortal request to /portals/coming-soon.

(c) The hotfix SQL

None to run. A DROP POLICY IF EXISTS would execute cleanly and change nothing. If you want the no-op on record for the human gate:

-- Verified no-op as of 2026-07-16: policy already absent from live public.companies.
DROP POLICY IF EXISTS "Recruiters manage company" ON public.co

(d) Rollback note

Not applicable — nothing is being dropped, so there is nothingrly: I could not capture the original CREATE POLICY from thelive DB, because the policy is not there. Reconstructing it from 01's prose would be a guess, so I'm not presenting one as a verified rollback artifact.

---
Two things that need your decision

1. There's an uncommitted migration nobody told you about. inspanies_rls_L1.sql already exists and does exactly this drop —but it is untracked in git (?? insforge/migrations/045b_fix_companies_rls_L1.sql), and system.custom_migrations is empty, so no migration ledger records it. Someone almost certainly ran this by hand via MCP and nevehonest about the limit here: admin_bypass on companies matches045b's CREATE verbatim, which is suggestive, but admin_bypass also exists on 22 of 59 public tables, so its presence is not proof 045b ran. What I can
state as fact is the end state is correct; how it got there isth the out-of-band DDL history L-2 already documents.

2. Docs 01, 02, 08, 09, and README all still describe L-1 as Oe documents asserting a live critical hole that isn't live.Migration 046 (02:155) folds in the same idempotent drop, so it stays correct either way — but 09:69's instruction to reconcile live policy names against
the T1 baseline is exactly the check that catches this, and it

My recommendation: commit 045b as-is for provenance, mark L-1/2026-07-16, applied out-of-band) across the five docs, and skip the human-gate apply entirely. The real finding worth escalating isn't L-1 — it's that production DDL is being applied without the ledger recording it,
which means no doc's claim about live state can be trusted wit6 policies on jobs are the next place that bites you.

✻ Baked for 4m 57s

※ recap: Goal was hotfixing the live companies RLS hole (P0-6), lready gone from production, so no SQL needs applying. Next:decide whether to commit the untracked 045b migration and mark L-1 resolved across the five docs. (disable recaps in /config)

---

Done. Committed as c8d1d80 on a new branch hotfix/l1-companies-rls-resolved — 12 files, unpushed.

What landed: 045b_fix_companies_rls_L1.sql is now tracked, and L-1/P0-6 is marked RESOLVED across 01, 02, 08, 09, and the README. Migration 046 keeps its DROP POLICY IF EXISTS as an idempotent, now-verified no-op.

One thing I found mid-task that changed the story: my own memory file from a prior session records that the policy was dropped via run-raw-sql on 2026-07-16, with 045b authored but never committed. So the provenance I told you was undeterminable is actually well-attested — I corrected the docs and the migration header rather than leave the weaker claim standing. The database and repo still hold no record of it; only that session's notes did.

Three things worth flagging:

The commit is larger than "one migration plus doc edits" — the entire specs/ folder was untracked, so all 11 docs are new files in this commit. I included them because the cross-references I wrote (and the ones already in those docs) point at siblings that otherwise wouldn't be in git. Say the word if you'd rather split them.

I made two mistakes while committing and corrected both: I used PowerShell here-string syntax in the Bash tool, which put a stray @ in the subject line, and my first --amend fix ran without path scoping and swallowed the 8 unrelated files that were already staged (CLAUDE.md, the rough-idea doc, three PNGs, etc.). I reset and recommitted scoped to my paths. Those 8 files are still staged and uncommitted, exactly as I found them.

I updated memory: P0-6 is now recorded as closed, and I added a note on the live-DB drift, since that's what made this task's premise false and will mislead the next session the same way.

The systemic issue is the real finding here. A P0 security change reached production by hand, the migration was never committed, the ledger stayed empty, and five documents kept asserting a critical hole that had already been fixed. Nothing currently prevents that policy being re-added the same way it was removed — I added an unchecked box in 08 for a regression test pinning the live companies policy set. L-2 (16 policies on jobs) is the next live-state finding and I have not re-checked it against the live DB — given what happened here, I wouldn't trust its description until someone does.