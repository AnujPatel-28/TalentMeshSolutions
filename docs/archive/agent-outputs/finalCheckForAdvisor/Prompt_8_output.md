Done. insforge/migrations/050_company_scoped_rls_and_plans.sql written (118 lines), all checks pass, nothing applied to any database.

Sections

┌───────────────┬─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│    Section    │                                                               Content                                                               │
├───────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ plan_limits   │ Table + seed ('free',1,0,false) ON CONFLICT DO NOTHING, RLS on, plan_limits_read (authenticated) + admin_bypass (project_admin)     │
├───────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ jobs DROP     │ The 14 recruiter/user-reachable live policies, per the 2026-07-17 decision                                                          │
│ list          │                                                                                                                                     │
├───────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ DDL dedupe    │ Drops tr_jobs_update + update_jobs_updated_at (keeps trigger_set_updated_at); drops idx_jobs_status (keeps                          │
│               │ idx_jobs_status_approved)                                                                                                           │
├───────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ jobs policies │ jobs_admin_all, jobs_select_approved (+ verified-company predicate), jobs_select_company, jobs_no_direct_insert (WITH CHECK         │
│               │ (false)), jobs_update_company, jobs_delete_company + 3 covering indexes                                                             │
├───────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ applications  │ Drops apps_recruiter_view/apps_recruiter_update; creates apps_company_view + apps_company_update (admin/recruiter roles only) +     │
│               │ applications_job_idx                                                                                                                │
├───────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Entitlement   │ enforce_active_job_limit() + trg_active_job_limit BEFORE INSERT OR UPDATE OF status                                                 │
└───────────────┴─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

Checklist

┌──────────────────────────────────────────────────────────────┬───────────────────────────────────────────────────────────────┐
│                            Check                             │                            Result                             │
├──────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤
│ 14 DROPs byte-exact to live names (_migration_refs.md §2.4)  │ ✅ set-diff: 14/16 matched, zero invented or misspelled names │
├──────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤
│ admin_bypass + project_admin_policy on jobs retained         │ ✅ the only two live names absent from the DROP list          │
├──────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤
│ Every CREATE POLICY preceded by DROP POLICY IF EXISTS        │ ✅ 10/10 guarded                                              │
├──────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤
│ Verified-company predicate in jobs_select_approved           │ ✅ line 56, verbatim from 09 T6 step 3                        │
├──────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤
│ plan_limits seeded ('free',1,0,false)                                                           │
├──────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤           │ Company scoping via authz.company_id_of((SELECT auth.uid()))cations)                            │
├──────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤           │ enforce_active_job_limit trigger present                                                        │
├──────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤           │ Trigger/index dedupe                                         findings                           │
├──────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤           │ Zero bare auth.uid()                                        te returns empty                    │
└──────────────────────────────────────────────────────────────┴───────────────────────────────────────────────────────────────┘           
I verified the DROP list by set comparison against the _migration_refs.md §2.4 table rather than reading it, which is what caught that the retained/dropped partition is exactly right and that no name dcommented in-file with their decision dates so the provenancesurvives review.

Two notes for the Fable pass. The DROP POLICY IF EXISTS guards I added for the five new policies (jobs_admin_all, jobs_select_company, jobs_no_direct_insert, jobs_update_company, jobs_delete_compan— they exist only so a re-run doesn't hit 42710, per lockeddecision #2. And the parse check is structural only (balanced parens, even dollar-quotes, 53 statements) — there's no psql on this machine, so genuine syntax validation happens at the T10 apply, which is by designs a parser.