One architect decision made now so the executor doesn't improvise: keep the jobs-id response-shape shim. It builds a company_profiles key purely from record.companies — no DB dependency, so dropping the table can't break it — and renaming the key would churn ~15 frontend files for zero security value. T8 shrinks to the real table references.

You are executing task T8 from docs/specs/09_Migration_Execution_Runbook.md in the Talentmesh-demo project. This is BLOCKING for T10: migration 046 drops the company_profiles table with NO compat view, so any remaining reference errors at runtime after the live apply. File-only, no DB changes, no deploys.

The T1 reference list is in _migration_refs.md. ARCHITECT DECISION (2026-07-17): the jobs-id edge function's response-shape shim (insforge/functions/jobs-id/index.ts:78, which builds a company_profiles response key from record.companies) is KEPT — it has no dependency on the dropped table, and its ~15 frontend readers stay untouched. Add a one-line comment at the shim: "response-shape alias built from `companies`; the company_profiles TABLE is dropped (mig 046) — do not query it."

Fix the actual table references:
1. app/company/[companyId]/page.tsx:176 — the .from('company_profiles') call. T1 notes it runs alongside a .from('companies') query and merges results, and is dead weight (table is empty). Remove the company_profiles query and the merge, keeping the .from('companies') path. Column drift note: live companies has `description` (not `about`) and no `recruiter_id` — if the removed merge read those fields, wire the companies equivalents.
2. scripts/verify_rls_regression.mjs:41-42 — the two SQL string literals. Update them to target `companies` if the assertion still makes sense against the new policy set (046: companies_public_read, companies_owner_write, admin_bypass), otherwise replace with an equivalent assertion against companies and say what you changed.
3. Re-grep the whole repo (exclude node_modules, docs/, insforge/migrations/, *.md) for company_profiles — after your edits the ONLY hits must be the jobs-id shim (response key + your comment). Report the final grep output.

Verify: npx tsc --noEmit (baseline: one known framer-motion error in applications/page.tsx:686); npx eslint on changed files.

Output: per-file diff summary, the final grep output, tsc/eslint results. Fable review follows before T9.

---

T8 report

Diffs

1. app/company/[companyId]/page.tsx — removed the .from('company_profiles') query and the !compData && !profileData / merge logic entirely. mergedCompany now reads only from compData (the companies row): about now sources compData?.description (was profileData?.about || compData?.about, and about never existed on companies), location now sources compData?.location (was profileData?.location only, silently dropped when the empty vestige returned null), industry/logo_url/website/name collapsed to compData only.
2. scripts/verify_rls_regression.mjs:41-42 — INSERT INTO public.company_profiles (name) VALUES (...) → INSERT INTO public.companies (name) VALUES (...). No other change needed: the script never asserts against company/company_profiles RLS policies directly — comp_a/comp_b are only used as FK values feeding jobs.company_id, so a straight table swap preserves the test's actual assertions (candidate/resume visibility via recruiter JWT context).
3. insforge/functions/jobs-id/index.ts:78 — added the one-line comment above the company_profiles: key exactly as specified. No logic changed.

Final grep (repo-wide, excluding node_modules, docs/, insforge/migrations/, *.md, and build output .next/):

The two real table references are gone. Remaining hits are all response-shape shim usages, not table reads — insforge/functions/jobs-id/index.ts (comment + key), lib/server/jobs.ts:112 (the other shim builder, serializeJob()), and the frontend readers: app/browse-jobs/page.tsx (5 sites), app/browse-jobs/[id]/page.tsx (7 sites), app/dashboard/candidate/[role_id]/page.tsx (3 sites), app/jobs/[id]/apply/page.tsx, app/jobs/[id]/page.tsx, app/jobs/[id]/share/page.tsx, components/jobs/JobCard.tsx — matching the exact list from _migration_refs.md's "response-shape usages" section.

One thing worth flagging: your message said the only surviving hit should be "the jobs-id shim (response key + your comment)," but lib/server/jobs.ts:112 builds the identical shim server-side and the ~13 frontend files are its readers — all correctly untouched per your decision ("~15 frontend files... zero security value"), just more grep hits than that sentence implied. Scope as executed matches the decision's intent, not its literal hit-count.

tsc: same single baseline error at applications/page.tsx:686 (framer-motion), nothing new.

eslint: app/company/[companyId]/page.tsx clean. scripts/verify_rls_regression.mjs and insforge/functions/jobs-id/index.ts are outside the project's eslint scope (ignored by config, not evaluated) — same as before my edit, not a regression.

No DB touched. Ready for Fable review before T9.