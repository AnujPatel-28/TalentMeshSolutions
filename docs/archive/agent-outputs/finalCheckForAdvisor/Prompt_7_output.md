You are executing tasks T6 and T6b from docs/specs/09_Migration_Execution_Runbook.md in the Talentmesh-demo project. Architect decisions in 09 are LOCKED. Preconditions met: 046–049 exist in insforge/migrations/ (Fable-reviewed); the T1 live baseline is in _migration_refs.md. File-only: apply NOTHING to any database.

T6: copy doc 02 → "Migration 050" (v1.1) into insforge/migrations/050_company_scoped_rls_and_plans.sql, then:
1. Reconcile the jobs DROP POLICY list against _migration_refs.md — ALL 16 live policy names must each appear in a DROP POLICY statement, using the LIVE names exactly. A missed blanket policy leaves the L-2 hole open (policies are OR-ed). If any live name differs from doc 02's list, use the live name and flag the difference.
2. Apply the RECORDED ARCHITECT DECISION in 09 T6 step 3: the recreated jobs_select_approved public-read policy must include the verified-company predicate (EXISTS ... c.status = 'verified') exactly as written in 09.
3. Confirm: plan_limits seeded with ('free',1,0,false); company-scoped jobs/applications policies use authz.company_id_of((SELECT auth.uid())); enforce_active_job_limit trigger present; dedupe of triggers/index included (T1 found idx_jobs_status vs idx_jobs_status_approved duplicated and 3 redundant updated_at triggers).

T6b: copy doc 02 → "Migration 051" verbatim into insforge/migrations/051_verification_and_member_rpcs.sql. No deltas. Must contain: reject_company_verification + request_more_info_for_verification RPCs, the guard_last_company_admin trigger (BEFORE UPDATE OR DELETE ON company_members), and accept_company_invite scoped to user_id = (SELECT auth.uid()) — all three SECURITY DEFINER with SET search_path, REVOKE ALL then GRANT EXECUTE TO authenticated.

Note: doc 02 received review deltas on 2026-07-17 (046 gstin normalize, 048 nullable submitted_by, 049 approve-RPC state guard). Read the CURRENT doc text. The 051 verification RPCs must keep their status IN ('submitted','under_review') guards — they are the reference pattern.

Verify (static, per file): zero bare auth.uid(); every one of the 16 live jobs policy names present in a DROP; verified-company predicate present in jobs_select_approved; all three 051 functions SECURITY DEFINER + search_path + grants; last-admin trigger present.

If doc 02 violates any check, STOP and report the exact line — do not fix it yourself. Output: both file paths, section summaries, the checklist with pass/fail, and any live-name corrections made. Deep Fable review follows before T7.

---

T6b shipped. T6 stopped — doc 02 fails two of the locked checks. Details below.

Files

┌──────┬─────────────────────────────────────────────────────────────────────┬────────────────────────────────────────────────┐
│ Task │                                Path                                 │                     Status                     │
├──────┼─────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────┤
│ T6b  │ insforge/migrations/051_verification_and_member_rpcs.sql (85 lines) │ ✅ written, verbatim from doc 02 lines 588–672 │
├──────┼─────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────┤
│ T6   │ insforge/migrations/050_company_scoped_rls_and_plans.sql            │ ❌ not written — blocked                       │
└──────┴─────────────────────────────────────────────────────────────────────┴────────────────────────────────────────────────┘

T6 — why I stopped

Blocker 1 — the DROP list is 14 names, not 16 (doc 02 lines 494–508).

Live baseline §2.4 records 16 policies on jobs. Doc 02 drops 14. Missing: project_admin_policy (live #3) and admin_bypass (live #5) — both ALL / TO project_admin / USING true / WITH CHECK true.

I did not add them, because this is not a name correction — it's an architectural decision, and both directions are wrong without your call:

- Add the DROPs as-written → jobs loses its admin bypass entirely. Doc 02's 050 recreates admin_bypass on plan_limits (line 489) but never recreates it on jobs. That violates RLS house rule #2 ("every table: … CREATE POLICY admin_bypass … TO project_admin") and would strand platform-admin access to jobs.
- Leave doc 02's 14 → fails the T6 verify literally ("all live jobs policy names from T1 appear in a DROP POLICY").

The good news: these two are not the L-2 hole. L-2 is the recruiter-blanket set (jobs_update_own, "Recruiters can update own jobs", etc.), and all 14 of those are dropped. project_admin_policy/admin_bypass are project_admin-role-only, not reachable by a user JWT, so leaving them live does not reopen L-2. My read is that the 14-name list is substantively correct and the T6 verify wording is what's over-broad — but per runbook ("Do not make architectural choices… if a task seems to require a new decision, STOP and report, do not improvise") that's yours to record, not mine.

Blocker 2 — 050 is not re-runnable, violating locked decision #2 ("All SQL files are idempotent… Never assume a clean DB").

Seven policies are CREATE POLICY with no preceding DROP POLICY IF EXISTS: jobs_admin_all (line 514), jobs_select_company (519), jobs_no_direct_insert (522), jobs_update_company (525), jobs_delete_company (531), apps_company_view (540), apps_company_update (546). Only jobs_select_approved is guarded (dropped at 506). A second run of 050 aborts with 42710 policy already exists — which matters at T10, where the runbook explicitly tells the operator to stop on first ❌ and possibly re-run.

Everything else in 050 checks out, for when you unblock it: plan_limits seeded ('free',1,0,false) (line 483); company-scoped jobs/applications policies use authz.company_id_of((SELECT auth.uid())); enforce_active_job_limit + trg_active_job_limit present; dedupe matches T1 exactly (drops tr_jobs_update + update_jobs_updated_at, keeps trigger_set_updated_at; drops idx_jobs_status, keeps idx_jobs_status_approved); zero bare auth.uid(). The T6-step-3 verified-company predicate is a legitimate delta (09 overrides doc 02) and I had it staged — doc 02 currently carries it only as a [SUGGESTION] in Edge cases, which is expected, not a violation.

Checklist

┌───────────────────────────────────────────────────────────────┬──────┬──────────────────────────────────────────────┐
│                             Check                             │ File │                    Result                    │
├───────────────────────────────────────────────────────────────┼──────┼──────────────────────────────────────────────┤
│ All 16 live jobs policy names in a DROP                       │ 050  │ ❌ 14/16 — see Blocker 1                     │
├───────────────────────────────────────────────────────────────┼──────┼──────────────────────────────────────────────┤
│ Idempotent (locked decision #2)                               │ 050  │ ❌ 7 unguarded CREATE POLICY — see Blocker 2 │
├───────────────────────────────────────────────────────────────┼──────┼──────────────────────────────────────────────┤
│ Verified-company predicate in jobs_select_approved            │ 050  │ ⏸ not applied (file blocked)                 │
├───────────────────────────────────────────────────────────────┼──────┼──────────────────────────────────────────────┤
│ Zero bare auth.uid()                                          │ 051  │ ✅ 5/5 occurrences are (SELECT auth.uid())   │
├───────────────────────────────────────────────────────────────┼──────┼──────────────────────────────────────────────┤
│ All three RPCs SECURITY DEFINER + SET search_path             │ 051  │ ✅ lines 5, 20, 66 (public, pg_temp)         │
├───────────────────────────────────────────────────────────────┼──────┼──────────────────────────────────────────────┤
│ REVOKE ALL then GRANT EXECUTE TO authenticated ×3             │ 051  │ ✅ lines 80–85                               │
├───────────────────────────────────────────────────────────────┼──────┼──────────────────────────────────────────────┤
│ Last-admin trigger BEFORE UPDATE OR DELETE ON company_members │ 051  │ ✅ line 59                                   │
├───────────────────────────────────────────────────────────────┼──────┼──────────────────────────────────────────────┤
│ Verification RPCs keep status IN ('submitted','under_review') │ 051  │ ✅ lines 11, 26                              │
├───────────────────────────────────────────────────────────────┼──────┼──────────────────────────────────────────────┤
│ accept_company_invite scoped to caller                        │ 051  │ ✅ line 74 via v_uid := (SELECT auth.uid())  │
└───────────────────────────────────────────────────────────────┴──────┴──────────────────────────────────────────────┘

Live-name corrections made: none. All 14 names doc 02 drops match live §2.4 byte-for-byte, including the quoted mixed-case ones. The public_select / jobs_select_approved duplicate-predicate pair that _migration_refs.md flagged is handled — both are dropped (505, 506).

Two notes for the Fable review, neither a blocker: your T6b brief said "all three SECURITY DEFINER" while listing four objects — the runbook's verify pairs "all three" with GRANT EXECUTE, so it means the three RPCs; guard_last_company_admin is correctly a plain invoker trigger function. That said, it carries no SET search_path (doc 02 line 39), which is a mild hardening gap on a security-invariant trigger — out of scope for a verbatim copy, worth a look.