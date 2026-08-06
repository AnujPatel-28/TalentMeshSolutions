# Implementation Plan: Safely Fix 88 RLS Performance Advisor Warnings

> Purpose: Fix only the 88 InsForge Backend Advisor performance warnings:
>
> - Issues 1-75: `performance/rls-policy-perf` — RLS policies call `auth.uid()` directly instead of `(SELECT auth.uid())`.
> - Issues 76-88: `performance/missing-rls-index` — RLS policy filter columns are missing indexes.
>
> Do not change any unrelated tables, columns, grants, roles, functions, frontend code, auth logic, or business logic.

---

## Safety Rules

1. Do not change RLS policy meaning.
2. Only replace direct `auth.uid()` calls with `(SELECT auth.uid())`.
3. Preserve every existing comparison, `EXISTS`, `AND`, `OR`, `USING`, and `WITH CHECK` expression exactly except for the `auth.uid()` wrapper.
4. Do not drop or recreate policies unless `ALTER POLICY` is impossible.
5. Do not change policy roles, commands, or names.
6. Do not disable RLS.
7. Do not alter `authz.is_admin()`, `authz.is_recruiter()`, `admin_users`, or `recruiter_users` unless one of the affected policies already references them.
8. Add only the indexes listed in this plan.
9. Use `CREATE INDEX CONCURRENTLY IF NOT EXISTS` for index fixes.
10. Do not wrap `CREATE INDEX CONCURRENTLY` statements in `BEGIN ... COMMIT`.
11. After each migration, run the verification queries in this document.
12. If any verification query fails, stop and report the exact failure. Do not continue with extra fixes.

---

## Required Deliverables

Create exactly two new migration files:

1. `insforge/migrations/040_wrap_rls_auth_uid_calls.sql`
2. `insforge/migrations/041_add_missing_rls_policy_indexes.sql`

Do not edit old migration files.

---

## Migration 040: Wrap Direct `auth.uid()` Calls in RLS Policies

### Goal

Fix Advisor issues 1-75 by changing direct calls like:

```sql
auth.uid()
```

to:

```sql
(SELECT auth.uid())
```

inside RLS policy `USING` and `WITH CHECK` expressions.

This is a performance-only change. It should not change access behavior.

### Why This Is Safe

The expression:

```sql
auth.uid() = user_id
```

and:

```sql
(SELECT auth.uid()) = user_id
```

evaluate to the same authenticated user id. The wrapper helps Postgres evaluate the value once for the statement instead of repeatedly while scanning rows.

### Exact Implementation Method

Use a guarded dynamic migration that updates only existing policies where `auth.uid()` appears directly.

This is acceptable here because:

- The transformation is narrow.
- It only replaces exact direct `auth.uid()` tokens.
- It does not change table names, policy names, roles, commands, or non-`auth.uid()` logic.
- It avoids accidentally omitting any live policies from the 75 warnings.

Create `insforge/migrations/040_wrap_rls_auth_uid_calls.sql` with exactly this SQL:

```sql
-- Migration 040: Wrap direct auth.uid() calls in RLS policies
-- Advisor fixes: performance/rls-policy-perf
-- Scope: Only replace direct auth.uid() with (SELECT auth.uid()) in public RLS policies.

DO $$
DECLARE
  policy_row record;
  new_using_expr text;
  new_check_expr text;
  alter_sql text;
BEGIN
  FOR policy_row IN
    SELECT
      p.polname,
      n.nspname,
      c.relname,
      pg_get_expr(p.polqual, p.polrelid) AS using_expr,
      pg_get_expr(p.polwithcheck, p.polrelid) AS check_expr
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND (
        coalesce(pg_get_expr(p.polqual, p.polrelid), '') ~* '(^|[^A-Za-z0-9_])auth[.]uid[(][)]'
        OR coalesce(pg_get_expr(p.polwithcheck, p.polrelid), '') ~* '(^|[^A-Za-z0-9_])auth[.]uid[(][)]'
      )
  LOOP
    new_using_expr := CASE
      WHEN policy_row.using_expr IS NULL THEN NULL
      ELSE regexp_replace(
        policy_row.using_expr,
        '(^|[^A-Za-z0-9_])auth[.]uid[(][)]',
        '\1(SELECT auth.uid())',
        'gi'
      )
    END;

    new_check_expr := CASE
      WHEN policy_row.check_expr IS NULL THEN NULL
      ELSE regexp_replace(
        policy_row.check_expr,
        '(^|[^A-Za-z0-9_])auth[.]uid[(][)]',
        '\1(SELECT auth.uid())',
        'gi'
      )
    END;

    alter_sql := format(
      'ALTER POLICY %I ON %I.%I',
      policy_row.polname,
      policy_row.nspname,
      policy_row.relname
    );

    IF new_using_expr IS NOT NULL THEN
      alter_sql := alter_sql || format(' USING (%s)', new_using_expr);
    END IF;

    IF new_check_expr IS NOT NULL THEN
      alter_sql := alter_sql || format(' WITH CHECK (%s)', new_check_expr);
    END IF;

    EXECUTE alter_sql;
  END LOOP;
END $$;
```

### Important Notes for Migration 040

- This migration intentionally does not target already-wrapped calls such as `(SELECT auth.uid())`.
- This migration intentionally does not target `authz.is_admin()` or other helper functions.
- If the migration produces nested wrappers like `(SELECT (SELECT auth.uid()))`, stop and do not continue. That means the live expressions were different than expected.

### Verification After Migration 040

Run this query:

```sql
SELECT
  n.nspname AS schema_name,
  c.relname AS table_name,
  p.polname AS policy_name,
  pg_get_expr(p.polqual, p.polrelid) AS using_expr,
  pg_get_expr(p.polwithcheck, p.polrelid) AS check_expr
FROM pg_policy p
JOIN pg_class c ON c.oid = p.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND (
    coalesce(pg_get_expr(p.polqual, p.polrelid), '') ~* '(^|[^A-Za-z0-9_])auth[.]uid[(][)]'
    OR coalesce(pg_get_expr(p.polwithcheck, p.polrelid), '') ~* '(^|[^A-Za-z0-9_])auth[.]uid[(][)]'
  )
ORDER BY c.relname, p.polname;
```

Expected result:

```text
0 rows
```

Also run this query to inspect all remaining references:

```sql
SELECT
  n.nspname AS schema_name,
  c.relname AS table_name,
  p.polname AS policy_name,
  pg_get_expr(p.polqual, p.polrelid) AS using_expr,
  pg_get_expr(p.polwithcheck, p.polrelid) AS check_expr
FROM pg_policy p
JOIN pg_class c ON c.oid = p.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND (
    coalesce(pg_get_expr(p.polqual, p.polrelid), '') ILIKE '%auth.uid%'
    OR coalesce(pg_get_expr(p.polwithcheck, p.polrelid), '') ILIKE '%auth.uid%'
  )
ORDER BY c.relname, p.polname;
```

Expected result:

- Rows may still appear.
- Every `auth.uid` reference must appear as `( SELECT auth.uid() AS uid)` or `(SELECT auth.uid())` depending on Postgres formatting.
- No direct bare `auth.uid()` call should remain.

---

## Migration 041: Add Missing RLS Policy Indexes

### Goal

Fix Advisor issues 76-88 by adding indexes for columns used in RLS policy filters.

### Why This Is Safe

Adding indexes does not change RLS behavior or application data. It only gives Postgres a faster way to find rows matching policy conditions.

### Important Transaction Rule

`CREATE INDEX CONCURRENTLY` cannot run inside a transaction block.

Therefore:

- Do not wrap this migration in `BEGIN ... COMMIT`.
- Run each statement independently as normal migration SQL.

### Duplicate Advisor Findings

Issues 79 and 80 both request the same index:

```sql
public.applications(recruiter_id)
```

Create it only once.

### Exact Indexes to Add

Create `insforge/migrations/041_add_missing_rls_policy_indexes.sql` with exactly this SQL:

```sql
-- Migration 041: Add missing indexes for RLS policy filter columns
-- Advisor fixes: performance/missing-rls-index
-- Important: CREATE INDEX CONCURRENTLY must not run inside BEGIN/COMMIT.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_announcement_dismissals_user_id
  ON public.announcement_dismissals(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_application_status_history_candidate_id
  ON public.application_status_history(candidate_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_application_status_history_recruiter_id
  ON public.application_status_history(recruiter_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_recruiter_id
  ON public.applications(recruiter_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_auth_events_user_id
  ON public.auth_events(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_candidate_profiles_recruiter_id
  ON public.candidate_profiles(recruiter_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_candidate_resumes_recruiter_id
  ON public.candidate_resumes(recruiter_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_export_candidates_user_id
  ON public.export_candidates(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notification_events_user_id
  ON public.notification_events(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notification_preferences_id
  ON public.notification_preferences(id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notification_templates_user_id
  ON public.notification_templates(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_recruiter_id
  ON public.profiles(recruiter_id);
```

### Verification After Migration 041

Run this query:

```sql
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_announcement_dismissals_user_id',
    'idx_application_status_history_candidate_id',
    'idx_application_status_history_recruiter_id',
    'idx_applications_recruiter_id',
    'idx_auth_events_user_id',
    'idx_candidate_profiles_recruiter_id',
    'idx_candidate_resumes_recruiter_id',
    'idx_export_candidates_user_id',
    'idx_notification_events_user_id',
    'idx_notification_preferences_id',
    'idx_notification_templates_user_id',
    'idx_profiles_recruiter_id'
  )
ORDER BY tablename, indexname;
```

Expected result:

```text
12 rows
```

If fewer than 12 rows appear:

1. Identify the missing index name.
2. Check whether the corresponding table and column exist.
3. If the table or column does not exist in the live database, document it and do not invent a replacement.
4. If the table and column exist, create only the missing index.

---

## Final Advisor Verification

After both migrations are applied, re-run InsForge Backend Advisor.

Expected result:

- No remaining `performance/rls-policy-perf` warnings for direct `auth.uid()` calls.
- No remaining `performance/missing-rls-index` warnings for the 12 listed indexes.

If Advisor still reports issues:

1. Do not make broad changes.
2. Compare the remaining issue list against the exact policy/table/index names in this plan.
3. Fix only the remaining exact affected policy or index.
4. Re-run the specific verification query.

---

## Manual Functional Testing

After the migrations and Advisor verification, test these app flows:

| Flow | Expected Result |
|---|---|
| Admin dashboard | Data loads normally |
| Admin manages profiles/settings/jobs | CRUD still works |
| Candidate views own profile/applications/resumes | Own data still visible |
| Candidate cannot view another candidate's private data | Access denied or empty result |
| Recruiter views own jobs/applications/candidates | Allowed rows still visible |
| Recruiter cannot view unrelated private candidate data | Access denied or empty result |
| Public job listings | Still load |
| Announcements/public pages | Still load |
| User preferences/session pages | Own rows still load |

---

## Rollback Plan

### For Migration 040

Do not automatically roll back unless functional testing fails.

If a policy was accidentally changed incorrectly:

1. Identify the exact table and policy from `pg_policies`.
2. Restore only that policy expression from the previous migration history or database backup.
3. Do not revert all RLS policies blindly.

### For Migration 041

Indexes can be removed if they cause unexpected operational problems, but this is unlikely.

Use this pattern only for the specific problematic index:

```sql
DROP INDEX CONCURRENTLY IF EXISTS public.index_name;
```

Do not drop unrelated indexes.

---

## Final Completion Criteria

The task is complete only when all are true:

1. Migration `040_wrap_rls_auth_uid_calls.sql` exists.
2. Migration `041_add_missing_rls_policy_indexes.sql` exists.
3. Direct `auth.uid()` verification returns 0 rows.
4. Index verification returns 12 rows.
5. InsForge Advisor no longer reports the 88 listed warnings.
6. Manual app smoke tests pass for admin, candidate, recruiter, and anon/public flows.

