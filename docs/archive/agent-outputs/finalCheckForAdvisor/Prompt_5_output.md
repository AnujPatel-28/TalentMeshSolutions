What's next: T3 + T4 (migrations 047, 048)

Both are pure verbatim transcription from doc 02 — T-Mid work, and safe to do as one prompt in your Sonnet/Gemini Flash session:

You are executing tasks T3 and T4 from docs/specs/09_Migration_Execution_Runbook.md in the Talentmesh-demo project. Architect decisions in 09 are LOCKED. Both tasks are pure verbatim transcription from 02_Schema_And_Database_Design.md — no deltas, no improvements, no reformatting. File-only: apply NOTHING to any database.

T3: copy doc 02 → "Migration 047" verbatim into insforge/migrations/047_company_members_and_authz.sql. Must contain: the company_members table, the three authz helpers (company_id_of, company_role, is_company_admin), the P0-5 guard_profile_privileged_cols trigger, and GRANT USAGE ON SCHEMA authz.

T4: copy doc 02 → "Migration 048" verbatim into insforge/migrations/048_verification_workflow.sql. Must contain: company_verification_requests and verification_audit_log tables, RLS enabled on both, and an admin_bypass policy.

Verify each file (static): grep for auth.uid() → every occurrence must be wrapped as (SELECT auth.uid()), zero bare; T3 has all three authz helpers + the profile guard trigger + the GRANT; T4 has both tables + RLS + admin_bypass. If doc 02's DDL is missing any required element, STOP and report — do not write it yourself.

Output: both file paths and, per file, a checklist of the required elements with present/absent. This goes to a Fable review before T5.

After T3/T4 comes T5 (049 — the SECURITY DEFINER RPCs + backfill), which is T-High again → back to Opus, and I'll review it deeply. Bring me the T3/T4 output when done — that review will be light, per the plan.

---

Both files are byte-for-byte verbatim from doc 02. Static verification complete.

Files written:
- Talentmesh-demo/insforge/migrations/047_company_members_and_authz.sql
- Talentmesh-demo/insforge/migrations/048_verification_workflow.sql

T3 (047) checklist:

┌────────────────────────────────────────────┬───────────────┐
│                  Element                   │    Present    │
├────────────────────────────────────────────┼───────────────┤
│ company_members table                      │ ✅            │
├────────────────────────────────────────────┼───────────────┤
│ authz.company_id_of                        │ ✅            │
├────────────────────────────────────────────┼───────────────┤
│ authz.company_role                         │ ✅            │
├────────────────────────────────────────────┼───────────────┤
│ authz.is_company_admin                     │ ✅            │
├────────────────────────────────────────────┼───────────────┤
│ P0-5 guard_profile_privileged_cols trigger │ ✅            │
├────────────────────────────────────────────┼───────────────┤
│ GRANT USAGE ON SCHEMA authz                │ ✅            │
├────────────────────────────────────────────┼───────────────┤
│ Bare auth.uid() (must be zero)             │ ✅ zero found │
└────────────────────────────────────────────┴───────────────┘

T4 (048) checklist:

┌─────────────────────────────────────┬───────────────────────
│               Element               │              Present              │
├─────────────────────────────────────┼───────────────────────
│ company_verification_requests table │ ✅                                │
├─────────────────────────────────────┼───────────────────────
│ verification_audit_log table        │ ✅                                │
├─────────────────────────────────────┼───────────────────────
│ RLS enabled on both                 │ ✅ (2× ENABLE ROW LEVEL SECURITY) │
├─────────────────────────────────────┼───────────────────────
│ admin_bypass policy                 │ ✅ (both tables)                  │
├─────────────────────────────────────┼───────────────────────
│ Bare auth.uid() (must be zero)      │ ✅ zero found                     │
└─────────────────────────────────────┴───────────────────────

Diffed both against doc 02's exact line ranges (182–261 for 04atch, no deltas. Ready for Fable review before T5.