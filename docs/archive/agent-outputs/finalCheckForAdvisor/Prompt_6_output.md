This is the most dangerous file in the set: SECURITY DEFINER RPCs (create_job, approve_company_verification) and the ownership backfill. Prompt for your Opus session:

You are executing task T5 from docs/specs/09_Migration_Execution_Runbook.md in the Talentmesh-demo project. Architect decisions in 09 are LOCKED. Preconditions met: 046/047/048 exist in insforge/migrations/ (Fable-reviewed). File-only: apply NOTHING to any database.

Do: copy doc 02 → "Migration 049" (v1.1) verbatim into insforge/migrations/049_repoint_ownership_and_rpcs.sql. It contains: the created_by backfill (from the earliest job's recruiter — live companies has NO recruiter_id column, do not reference one), the company_members backfill (from created_by, profiles.company_id, and jobs.recruiter_id), FK enforcement, and the approve_company_verification + create_job RPCs with REVOKE/GRANT EXECUTE.

Known review deltas already applied to doc 02 (2026-07-17) — your copy must include them if they intersect: gstin ''→NULL normalization lives in 046; submitted_by is nullable in 048. Neither should appear in 049, but read the current doc 02 text, not a cached version.

Verify (static, all must hold):
- backfills use ON CONFLICT DO NOTHING and are FK-safe (skip dangling profiles.company_id references)
- NO "DROP COLUMN companies.recruiter_id" anywhere (the column never existed live)
- create_job derives company_id via authz.company_id_of((SELECT auth.uid())) — it must NOT read company_id or recruiter_id from its input for authorization
- both RPCs are SECURITY DEFINER with SET search_path; REVOKE ALL then GRANT EXECUTE TO authenticated present for both
- approve_company_verification re-checks authz.is_admin() insi
- zero bare auth.uid() (every occurrence wrapped as (SELECT auth.uid()))

If doc 02's 049 DDL violates any of these checks, STOP and report the exact line — do not fix it yourself; that's the Fable review's call.

Output: file path, section-by-section summary, and the checklist above with pass/fail per item. Deep Fable review follows before T6. 

---

T5 done. insforge/migrations/049_repoint_ownership_and_rpcs.sql (117 lines) is a byte-verbatim copy of doc 02 §"Migration 049" — I verified that programmatically by re-extracting the SQL block from the current doc text and diffing it against the written file, not by eye. Nothing was applied to any database.

Section-by-section

┌─────┬────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  §  │                                                                    Contents                                                                    │
├─────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 0   │ created_by backfill — DISTINCT ON (company_id) … ORDER BY company_id, created_at ASC picks the earliest job's recruiter; only fills where      │
│     │ created_by IS NULL. Zero-job companies stay NULL for the admin console.                                                                        │
├─────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 1   │ Three company_members backfills: creator→admin, profiles.company_id recruiters→recruiter, job-posting recruiters not otherwise                 │
│     │ linked→recruiter.                                                                                                                              │
├─────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 2   │ Explicit no-op comment: no companies.recruiter_id to drop.                                                                                     │
├─────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 3   │ jobs FKs re-asserted — company_id→companies CASCADE, recruiter_id→profiles SET NULL.                                                           │
├─────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 4   │ subscriptions.company_id→companies CASCADE.                                                                                                    │
├─────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 5   │ approve_company_verification + create_job, then REVOKE/GRANT.                                                                                  │
└─────┴────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

Checklist — all pass

┌───────────────────────────────────────────────────┬─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                       Check                       │                                             Result                                              │
├───────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────┤
│ Backfills use ON CONFLICT DO NOTHING              │ PASS — 3 of 3 inserts                                                                           │
├───────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────┤
│ FK-safe (skips dangling profiles.company_id)      │ PASS — EXISTS (SELECT 1 FROM companies …) guard; 047's partial unique index on user_id backs    │
│                                                   │ the conf                                                           │
├───────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────┤
│ No DROP COLUMN companies.recruiter_id             │ PASS — z                                                           │
├───────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────┤
│ create_job derives company via                    │ PASS — vof(v_uid); payload supplies only job fields, never         │
│ authz.company_id_of                               │ company_id or recruiter_id                                                                      │
├───────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────┤
│ Both RPCs SECURITY DEFINER + SET search_path      │ PASS — both SET search_path = public, pg_temp                                                   │
├───────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────┤
│ REVOKE ALL then GRANT EXECUTE TO authenticated    │ PASS — both functions, both statements                                                          │
├───────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────┤
│ approve_company_verification re-checks            │ PASS — first statement, raises before any write                                                 │
│ authz.is_admin()                                  │                                                                    │
├───────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Zero bare auth.uid()                              │ PASS — 4h.uid())                                                   │
└───────────────────────────────────────────────────┴─────────────────────────────────────────────────────────────────────────────────────────────────┘

Both known review deltas were confirmed already landed where they belong (gstin ''→NULL at 046:58, nullable submitted_by at 048:7) and correctly absent from 049. The authz helper signatures in 047 match every call

One thing for the Fable review to rule on, outside the checkliapprove_company_verification, a p_request_id that matches norow leaves v_company NULL — the two follow-up UPDATEs silently no-op and the audit row inserts with company_id/request_id NULL (both nullable per 048, so no error surfaces). The caller gets success for a request thatoc 02's DDL as written, not a copy defect.