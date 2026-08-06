# 052 — APPLIED to live backend   ·   model: Fable 5 (human-delegated)   ·   date: 2026-07-19

The user delegated the human-apply role for migration 052 this session. Everything below was run against the live backend via `run-raw-sql`; verbatim results summarized, no asserted-but-not-run checks.

## Pre-flight (1-052-sql__fable5.md P1–P3)

| Check | Result |
|---|---|
| P1 role census | candidate 111 / recruiter 26 / admin 14 / super_admin 1 — all inside the new CHECK set. **PASS** |
| P2 constraint (hard gate) | exactly `profiles_role_check`, exactly the six-value CHECK the advisor verified. **PASS** |
| P3 staff census | **15 rows, not 14** — `vishalsuthar2711@gmail.com` promoted to admin since the W2 census. Benign drift; V1 expectation moved to 15. |

## Apply

`052_profiles_role_admin_truth.sql` applied in full, single transaction, no errors.

## Post-apply V1–V6

All pass: V1 function body correct + count 15 · V2 `auth_attempts` has only `project_admin_policy`, no PUBLIC row · V3 `idempotency_keys.response_body` jsonb exists · V4 announcements qual `(is_active = true)` · V5 templates `templates_select_admin TO authenticated USING is_admin()` · V6 profiles `relrowsecurity=t, relforcerowsecurity=f`.

## 🔴 Drift discovery — 052's premise was stale at apply time

V5 showed `platform_settings` staff policy calling **`authz.is_admin()`**. Investigation:

- `authz.is_admin()` **exists live** (so 037/038 DID get applied out-of-band, after the advisor's 2026-07-19 pg_proc check — new drift datapoint), body = admin_users membership, **INVOKER** (not DEFINER).
- **15 of 16** is_admin-gated policies call the `authz.` variant (profiles ×2, jobs, applications, subscriptions, user_sessions, platform_settings, announcements, candidate_resumes, recruiter_candidate_notes, storage_quarantine, user_preferences ×4). Only 052's own `templates_select_admin` calls `public.is_admin()`.
- Net: the 052 flip alone replaced a function almost nothing calls — the orphaned-staff defect would have survived.

**Follow-up applied (`052b_authz_is_admin_followup.sql`, now in repo):** `authz.is_admin()` replaced with the identical profiles-role body, SECURITY DEFINER (mandatory — two calling policies are ON profiles; owner-bypass prevents recursion). Grants/owner preserved by CREATE OR REPLACE.

Also learned: the "7 orphaned staff" are all `susp_admin_*` E2E test accounts; every real staff account was in `admin_users`. The source-of-truth defect was real but its live blast radius was test-only.

## Functional smoke (SQL-layer impersonation)

⚠️ Method note for future verifiers: `WITH s AS (SELECT set_config('role',…)) SELECT (SELECT count(*) …)` is **invalid for RLS testing** — RLS quals are injected at plan time under the *planning* user (here `postgres`, BYPASSRLS), so counts come back unfiltered. First run produced a false alarm (candidate "seeing" 5 templates). Correct method: dynamic SQL planned after the role switch (temp helper fn, created → run → dropped).

| Caller | is_admin() | profiles | applications | templates |
|---|---|---|---|---|
| Orphaned staff `susp_admin_1781285056042` (authenticated) | **true** | **152** | **38** | 5 |
| Candidate (authenticated) | false | 1 (own) | 1 (own) | **0** |
| anon | not executable (revoke works) | 0 | 0 | 0 |

"Logged in but no data" shape is gone at the RLS layer. Browser-login smoke not run (susp_* are synthetic accounts without known passwords); the RLS-layer result is the substance of that check. Announcements banner check vacuous — table has 0 rows.

## State after this session

- 052 + 052b live. `admin_users` + sync trigger untouched (rollback path, per plan).
- The admin_users **drop** migration must now also drop/redirect `authz.is_admin()` — both functions read profiles.role, but the authz one is the one policies actually call. Doc 14 / 053 planning should treat `authz.` as the live call target, not `public.`.
- Ledger still unused; both migration files exist in-repo but nothing records applies except this doc.
