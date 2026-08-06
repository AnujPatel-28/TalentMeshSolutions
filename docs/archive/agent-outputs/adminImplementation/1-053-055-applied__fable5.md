# 1-053-055-applied — migrations 053/054/055 pre-flight + apply + post-checks

**Model:** Fable 5 · **Date:** 2026-07-20 · **Authorized by:** user command ("apply" for admin-side build)
**Backend:** sytk3jgv.ap-southeast.insforge.app (companies=8 rows at apply time)

## Prompt
Do the 053/054/055 pre-flight + apply + post-checks for admin side building.

## Pre-flight (live, before apply)
- `authz.admin_company_id_of` present ✓ (prereq for 053)
- **053 already live** (drift): `companies_admin_write` existed with definition byte-identical to the file (UPDATE, USING/CHECK `id = authz.admin_company_id_of((SELECT auth.uid()))`); `companies_owner_write` already gone. → **053 skipped as no-op, nothing re-applied.**
- 054: `jobs.is_approved` present, `approval_status` absent; jobs_total=2, is_approved=true=2.
- 055: `audit_log` columns matched the file's pre-check exactly (no `on_behalf_of`/`reason`); `audit_logs` plural does NOT exist (as the file predicted); roles anon/authenticated/project_admin all present; `authenticated` HAD UPDATE+DELETE on audit_log (confirming the hole 055 closes).

## Applied (each in BEGIN/COMMIT via run-raw-sql)
- **054** verbatim: add `approval_status` (NOT NULL DEFAULT 'pending', CHECK pending/approved/rejected) + backfill is_approved=true→approved + `jobs_approval_status_idx`. First attempt hit ECONNRESET; verified nothing landed (column absent), retried, succeeded. `is_approved` retained per the file's note.
- **055** verbatim minus comments: add `on_behalf_of uuid`, `reason text`; REVOKE UPDATE, DELETE from authenticated/anon/project_admin; indexes `audit_log_actor_idx`, `audit_log_target_idx`, `audit_log_behalf_idx` (partial).

## Post-checks (live, after apply)
| Check | Result |
|---|---|
| jobs.approval_status column + CHECK constraint | ✓ (1/1) |
| Backfill: approved=2, pending=0 (matches pre-flight is_approved counts) | ✓ |
| jobs_approval_status_idx | ✓ |
| audit_log has on_behalf_of, reason | ✓ |
| has_table_privilege UPDATE/DELETE → authenticated, anon, project_admin | all **false** ✓ |
| 3 audit_log indexes | ✓ |
| companies_owner_write gone (053 state) | ✓ |

## Deviations
- 053 not executed — live already matched the file exactly. No divergence to reconcile.
- `system.custom_migrations` ledger still unused (project-wide gap, not touched here).

## Open questions
- Who applied 053 out-of-band? No record found; consistent with known drift pattern.
- `is_approved` drop + repointing public-read RLS (`jobs_select_approved` etc.) to `approval_status` remains the deferred cleanup migration per doc 02.
