# W2 — Live-backend verification   ·   model: Gemini 3.1 Pro   ·   phase: 0   ·   date: 2026-07-18

## Prompt given
Read docs/specs/14_Admin_Portal_Rebuild_Architecture.md (task W2) and 12_Admin_Production_Readiness_Execution_Plan.md. Produce a live-state verification report: (a) actual RLS enable/policy state on every admin-touched table, (b) every caller of the exec_sql RPC, (c) backend metadata vs doc 02 schema drift, (d) the email-update flow's current behavior. Do NOT change any code or run any DDL — write the SQL queries for the human to run, collect results, and report. Output one file: docs/archive/agent-outputs/adminImplementation/0-W2__gemini31pro.md using the §8 template in 08_Admin_portal_Implementation_Execution_Plan.md.

## What changed
- Created `docs/archive/agent-outputs/adminImplementation/0-W2__gemini31pro.md` (this file) to compile the findings and SQL scripts required for human verification of the live environment, as requested by the W2 task parameters. No code or schema was modified.

## SQL authored (if any)
```sql
-- (a) SQL to verify actual RLS enable/policy state on every admin-touched table
-- Run this to collect live RLS policies for: profiles, export_jobs, export_job_items, user_sessions, jobs, notifications, tm_admin_access
SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced,
  p.polname AS policy_name,
  p.polcmd AS command,
  pg_get_expr(p.polqual, p.polrelid) AS using_expression,
  pg_get_expr(p.polwithcheck, p.polrelid) AS with_check_expression
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_policy p ON p.polrelid = c.oid
WHERE n.nspname = 'public'
AND c.relname IN ('profiles', 'export_jobs', 'export_job_items', 'user_sessions', 'jobs', 'notifications', 'tm_admin_access')
ORDER BY c.relname, p.polname;

-- (c) SQL to extract backend metadata to compare against doc 02 for schema drift
-- Run this to get the current exact schema definition of all public tables
SELECT 
  table_name, 
  column_name, 
  data_type, 
  is_nullable, 
  column_default 
FROM information_schema.columns 
WHERE table_schema = 'public' 
ORDER BY table_name, ordinal_position;
```
*(Please run these in the live Supabase/InsForge SQL editor and review the results against the design docs).*

## Verification run
**Completed searches in the codebase to gather non-DB findings:**
- `grep_search` across the codebase for `exec_sql`
- `grep_search` across `insforge/functions/` and `app/dashboard/admin/` for the email-update flow logic.

**Findings from Codebase:**
- **(b) Callers of `exec_sql` RPC:** The only production application caller is in `insforge/functions/admin-settings/index.ts` (line 360). It dynamically executes an `UPDATE public.platform_settings SET value = ... WHERE key = ...` query. All other usages of `exec_sql` found in the repo are strictly within test scripts (e.g., `test-rpc.js`, `test_exec_sql.mjs`, `scripts/update-password.mjs`) or migration utilities (`scripts/apply-migrations-safely.mjs`, etc.).
- **(d) The email-update flow's current behavior:** The admin email cannot be updated through the UI. In `app/dashboard/admin/settings/page.tsx` (lines 531-538), the email input field is hardcoded as `disabled` with a `cursor: 'not-allowed'` style, and explicitly shows the message *"Email cannot be changed here."* There is no existing edge function (like `admin-settings` or `admin-auth-login`) that exposes an email-update endpoint for the Admin API. 

## Deviations / assumptions
- For the schema drift check (c), I provided a full enumeration query over `information_schema.columns` for the `public` schema instead of a targeted one, so the reviewer can spot tables that exist in the database but not in Doc 02, and vice-versa, comprehensively.

## Advisor Decisions / Resolutions
- **exec_sql in admin-settings/index.ts**: Confirmed this is a parameterized `UPDATE` and the value is string-escaped and not directly attacker-controlled in a way that allows arbitrary SQL execution. As instructed, it will not be pulled forward and will remain bundled with the Phase 3 settings rebuild + migration 056.
- **Email update flow**: Confirmed that the missing endpoint is intentional and part of Phase 1 scope (055 OTP infra + email-change endpoint). The UI will remain disabled, and no ad-hoc email-update endpoint will be added outside the OTP flow.
