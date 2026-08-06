# Recruiter & Company — Architecture & Implementation

Phase 1 design docs for the TalentMesh Recruiter Portal and Company Management modules (Company-First architecture). Verified against source AND the live InsForge database on 2026-07-16 — documentation is treated as intent only; every claim was checked against code and, where noted, against live schema/RLS via MCP.

> **Live-DB reconciliation (2026-07-16):** The production database has **both** a populated `companies` table (6 rows — the real one, and the target of `jobs.company_id`) **and** an empty `company_profiles` table. `companies` was created out-of-band and is in no git migration. This **invalidates the original "rename `company_profiles` → `companies`" migration plan** — migration 046 now **alters `companies` in place**. See `01` findings L-1..L-4 and the revised `02`/`09`.

| Doc | What it covers |
|---|---|
| [01_Auth_Security_Audit_Report.md](01_Auth_Security_Audit_Report.md) | Verified auth audit; P0 blockers. C-2/C-3/L-1 RESOLVED; open: H-9, C-4, C-1, plus live-DB findings L-2 (jobs RLS), L-4 (auth config) |
| [02_Schema_And_Database_Design.md](02_Schema_And_Database_Design.md) | Company-First migrations 046–051 (alter `companies` in place, company_members, verification RPCs, RLS, entitlement, last-admin guard) |
| [03_API_Routes_And_Endpoints.md](03_API_Routes_And_Endpoints.md) | `withApi` endpoint catalog, Zod schemas, error contracts |
| [04_State_Machines_And_Business_Logic.md](04_State_Machines_And_Business_Logic.md) | Company / membership / verification / job lifecycles + edge cases |
| [05_UI_Components_And_Pages.md](05_UI_Components_And_Pages.md) | Page specs mapped to existing scaffold + ops-kit reuse |
| [06_Recruiter_Portal_Architecture.md](06_Recruiter_Portal_Architecture.md) | End-to-end recruiter experience + the server guard fixing H-9 |
| [07_Company_Management_Architecture.md](07_Company_Management_Architecture.md) | Company entity, verification, team, billing, admin tooling |
| [08_Implementation_Execution_Plan.md](08_Implementation_Execution_Plan.md) | Ordered build plan (Phase 0 security → schema → API → UI → tests) |
| [09_Migration_Execution_Runbook.md](09_Migration_Execution_Runbook.md) | **Agent runbook** — exact sequenced tasks (T1–T11) to build & apply migrations 046–051 + P0-4/P0-5, with per-task model assignment and human gates before any live-DB change |
| [10_Auth_Token_Propagation_And_Subdomain_Fix.md](10_Auth_Token_Propagation_And_Subdomain_Fix.md) | **P0 bug fix** — "logged in but no data" on the candidate portal: token fails to reach `/api/v1/remote` → RLS returns anon-empty. Fix = single HttpOnly parent-domain (`.domain`) cookie; also enables the `jobs.`/`app.`/`admin.` subdomain split and closes H-8 |
| [11_Admin_Portal_Audit_And_Remediation.md](11_Admin_Portal_Audit_And_Remediation.md) | **Admin-side audit** — 13 source-verified findings (3× P0): mock-auth header bypass, suspended admins keep access, role falls back to auth metadata, impersonation broken end-to-end, 4 parallel admin route trees, admin mutations bypassing the audit log. Includes removal list + execution order |
| [12_Admin_Production_Readiness_Execution_Plan.md](12_Admin_Production_Readiness_Execution_Plan.md) | **Admin execution plan** — source-verified post-remediation status (A-1 mock-auth bypass reopened as the one residual P0), 10 workstreams W1–W10 with agent + model assignment, isolation, human gates, parallelism, and the launch-gate checklist |

**Start here:** `01` (what must be fixed first) → `08` (the order to build) → `09` (the step-by-step agent runbook for the schema migrations) → the rest as reference.

**Phase 0 status:** P0-1 (mock-auth backdoors) and P0-3 (send-proposal auth + session role derivation) are **implemented in the working tree** (verified in source 2026-07-16). **P0-6 is RESOLVED** — the live `companies` "Recruiters manage company" policy (L-1) is **absent from the live DB** (re-verified 2026-07-16); it was dropped out-of-band, so no hotfix apply is needed. Still OPEN: **P0-2** (recruiter layout server guard, H-9), **P0-4** (job-creation RPC, C-4), **P0-5** (profiles self-update trigger, C-1 — verify live policy first).

> ⚠️ **Live-state claims in these docs are not trustworthy without a re-check.** P0-6 was specified from a live inspection that a later live re-check contradicted, because production DDL reaches the DB without the migration ledger (`system.custom_migrations`) recording it. Re-verify any live DB claim against the live DB before acting on it — L-2 (16 policies on `jobs`) is the next live-state finding and has not been re-checked.

Source spec: `../RecruiterAndCompanyRoughIdea.md`. Standards: project `CLAUDE.md`.
