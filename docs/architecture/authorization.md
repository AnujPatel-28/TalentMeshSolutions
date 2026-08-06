# Authorization Architecture — Access Control

> **Last Updated:** 2026-07-11  
> **Migrations:** 037, 038, 039, 042, 043, 044  
> **Status:** Production — All changes verified against live database

---

## Overview

TalentMesh uses a **private-schema authorization helper pattern** to determine admin and recruiter access across the platform. The core functions `authz.is_admin()` and `authz.is_recruiter()` live in the private `authz` schema, are called by RLS policies, and are not exposed as PostgREST RPC endpoints.

Additionally, dangerous SECURITY DEFINER RPCs (`increment_announcement_view`, `increment_announcement_dismiss`) have been replaced by insert-only tables with trigger-maintained counters.

This document describes the current architecture, the security design decisions behind it, and the rules that developers and AI agents **must follow** when making changes.

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                     PostgREST / InsForge API                     │
│         (only exposes the "public" schema as REST/RPC)           │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    public schema                            │ │
│  │                                                             │ │
│  │  ┌─────────────┐   RLS policies call    ┌───────────────┐  │ │
│  │  │  profiles    │──────────────────────► │               │  │ │
│  │  │  jobs        │   authz.is_admin()     │   authz       │  │ │
│  │  │  applications│   authz.is_recruiter() │   schema      │  │ │
│  │  │  ... (10+    │──────────────────────► │   (private)   │  │ │
│  │  │   tables)    │                        │               │  │ │
│  │  └─────────────┘                        │  ┌───────────┐│  │ │
│  │                                         │  │is_admin() ││  │ │
│  │  ┌─────────────────┐    SELECT own row  │  │is_recruiter│  │ │
│  │  │  admin_users     │◄──────────────────│  │SECURITY   ││  │ │
│  │  │  recruiter_users │                   │  │INVOKER    ││  │ │
│  │  │  (lookup tables) │                   │  └───────────┘│  │ │
│  │  │  RLS: self-select│                   └───────────────┘  │ │
│  │  └─────────────────┘                                       │ │
│  │          ▲                                                  │ │
│  │          │ sync triggers                                    │ │
│  │  ┌───────────────────┐    ┌──────────────────────┐          │ │
│  │  │  profiles table    │    │  announcement_views  │         │ │
│  │  │  (role changes)    │    │  (trigger → counters)│         │ │
│  │  └───────────────────┘    └──────────────────────┘          │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. `authz.is_admin()` — The Authorization Helper

```sql
CREATE OR REPLACE FUNCTION authz.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    EXISTS (
      SELECT 1
      FROM public.admin_users
      WHERE user_id = (SELECT auth.uid())
    ),
    false
  );
$$;
```

**Key properties:**

| Property | Value | Why |
|---|---|---|
| Schema | `authz` (private) | Not exposed as PostgREST RPC endpoint |
| Language | `sql` | Simpler than plpgsql, inlineable by query planner |
| Volatility | `STABLE` | Enables optimizer caching within a single statement |
| Security | `SECURITY INVOKER` | Runs as the calling user, no privilege escalation |
| search_path | `public, pg_temp` | Prevents temp-schema object shadowing attacks |
| NULL handling | `COALESCE(..., false)` | Explicit — never returns NULL |
| auth.uid() | `(SELECT auth.uid())` | Subquery wrapper prevents per-row re-evaluation |

**Grants:**

| Role | EXECUTE | Why |
|---|---|---|
| `authenticated` | ✅ Yes | RLS policies evaluate this for logged-in users |
| `project_admin` | ✅ Yes | Service role / trigger context needs access |
| `anon` | ❌ No | Anonymous users should never check admin status |
| `PUBLIC` | ❌ No | Revoked explicitly |

### 2. `authz` Schema — Private Authorization Namespace

```sql
CREATE SCHEMA IF NOT EXISTS authz;
REVOKE ALL ON SCHEMA authz FROM PUBLIC;
GRANT USAGE ON SCHEMA authz TO authenticated;
GRANT USAGE ON SCHEMA authz TO project_admin;
```

**Why a private schema?**
- PostgREST only exposes the `public` schema as REST endpoints
- Functions in `authz` are **not** callable via `POST /rest/v1/rpc/...`
- This eliminates the RPC information leak where any authenticated user could call `is_admin()` to probe their admin status

### 3. `public.admin_users` — Admin Lookup Table

A single-column table (`user_id UUID PRIMARY KEY`) that stores the UUIDs of users who are admins.

**RLS configuration:**

| Policy | Role | Expression | Purpose |
|---|---|---|---|
| `admin_users_self_select` | `authenticated` | `user_id = (SELECT auth.uid())` | Each user can only see their own row |
| `project_admin_policy` | `project_admin` | `true` | Service role full access (for sync trigger) |

**Table grants:**

| Role | SELECT | INSERT/UPDATE/DELETE |
|---|---|---|
| `authenticated` | ✅ | ❌ Revoked |
| `anon` | ❌ Revoked | ❌ Revoked |

**RLS flags:** `ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY`

**Why FORCE RLS?** Even the table owner (`postgres`) is subject to RLS. This means the self-select policy is enforced regardless of who calls the function.

### 4. `public.sync_admin_users()` — Sync Trigger

Automatically keeps `admin_users` in sync with `profiles.role`:
- When a profile's role changes to `admin` or `super_admin` (and `is_active = true`), the user is added
- When the role changes away from admin or user is deactivated/deleted, the row is removed

```
profiles table → trg_sync_admin_users trigger → sync_admin_users() → admin_users table
```

**Security:**
- `SECURITY DEFINER` (runs as `postgres`) — required because the trigger must write to `admin_users` which has no write policies for `authenticated`
- `search_path = public, pg_temp` — pinned
- `EXECUTE` revoked from `PUBLIC`, `anon`, and `authenticated` — users cannot call this directly; only the trigger can invoke it

### 5. `authz.is_recruiter()` — Recruiter Authorization Helper

```sql
CREATE OR REPLACE FUNCTION authz.is_recruiter()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    EXISTS (
      SELECT 1
      FROM public.recruiter_users
      WHERE user_id = (SELECT auth.uid())
    ),
    false
  );
$$;
```

Identical pattern to `authz.is_admin()`. Properties and grants are the same.

**Lookup table:** `public.recruiter_users` (same pattern as `admin_users`)
- RLS: `recruiter_users_self_select` + `admin_bypass_recruiter_users`
- `FORCE ROW LEVEL SECURITY` enabled
- `anon` has **no** access, `authenticated` has **SELECT only**

**Sync trigger:** `public.sync_recruiter_users()` — SECURITY DEFINER, EXECUTE revoked from all users. Syncs from `profiles.role = 'recruiter' AND is_active = true`.

### 6. Announcement Counter Pattern (Views + Dismissals)

Old dangerous pattern (REMOVED):
```
authenticated user → RPC increment_announcement_view(uuid) → SECURITY DEFINER → UPDATE announcements
```

New safe pattern:
```
authenticated user → INSERT INTO announcement_views (RLS: own row only)
                      ↓ trigger
              sync_announcement_view_count() → UPDATE announcements.view_count
```

**Tables:**
- `public.announcement_views` — RLS enabled + FORCE, self-INSERT/SELECT only
- `public.announcement_dismissals` — existing table, trigger added

**Trigger functions:** `sync_announcement_view_count()`, `sync_announcement_dismiss_count()`
- SECURITY DEFINER (required to UPDATE announcements)
- EXECUTE revoked from all user roles
- `search_path = public, pg_temp` pinned

---

## Protected Tables (16 Admin Policies)

All admin policies are scoped `TO authenticated` and use `authz.is_admin()`:

| Table | Policy Name | Operation | WITH CHECK |
|---|---|---|---|
| `announcements` | Admins can manage announcements | ALL | — |
| `applications` | Admins can view all applications | SELECT | — |
| `candidate_resumes` | candidate_resumes_select_admin | SELECT | — |
| `jobs` | Admins can view all jobs | SELECT | — |
| `jobs` | admins_all | ALL | `authz.is_admin()` |
| `platform_settings` | Admins can manage platform_settings | ALL | `authz.is_admin()` |
| `profiles` | Admins can manage profiles | ALL | — |
| `profiles` | profiles_select_admin | SELECT | — |
| `recruiter_candidate_notes` | Admins can manage recruiter candidate notes | ALL | — |
| `storage_quarantine` | Admins can manage storage_quarantine | ALL | `authz.is_admin()` |
| `subscriptions` | Admins can manage subscriptions | ALL | — |
| `user_preferences` | Admins can delete all preferences | DELETE | — |
| `user_preferences` | Admins can insert all preferences | INSERT | `authz.is_admin()` |
| `user_preferences` | Admins can update all preferences | UPDATE | — |
| `user_preferences` | Admins can view all preferences | SELECT | — |
| `user_sessions` | Admins can manage user_sessions | ALL | `authz.is_admin()` |

---

## Request Flow

### Admin User Accesses a Protected Table

```
1. Admin user → SELECT * FROM profiles
2. PostgreSQL evaluates RLS policies on profiles
3. Policy "Admins can manage profiles" calls authz.is_admin()
4. authz.is_admin() runs as the authenticated user (SECURITY INVOKER)
5. Function queries admin_users WHERE user_id = auth.uid()
6. admin_users RLS: self-select policy allows reading own row
7. Row exists → is_admin() returns true → policy passes
8. User sees all profiles
```

### Non-Admin User Accesses the Same Table

```
1. Regular user → SELECT * FROM profiles
2. Policy "Admins can manage profiles" calls authz.is_admin()
3. Function queries admin_users WHERE user_id = auth.uid()
4. No row found → is_admin() returns false → admin policy fails
5. Other policies (e.g., profiles_self) evaluated instead
6. User sees only their own profile
```

### Why There Is No Recursion

The `admin_users` self-select policy uses `user_id = (SELECT auth.uid())` — a simple UUID comparison. It does **not** call `is_admin()`. This breaks any recursion chain.

---

## Rules for Future Changes

### ✅ DO

1. **Always scope admin policies `TO authenticated`** — never leave them as `PUBLIC` (which includes `anon`)
2. **Always use `authz.is_admin()`** (fully qualified) — never `is_admin()` or `public.is_admin()`
3. **Use `(SELECT auth.uid())` in RLS policies** — the subquery wrapper prevents per-row function re-evaluation
4. **Add new auth helper functions to the `authz` schema** — not `public`
5. **Pin `search_path = public, pg_temp`** on any SECURITY DEFINER function
6. **Test with admin, non-admin, and anon roles** after any RLS change

### ❌ DO NOT

1. **Do NOT create authorization functions in `public` schema** — they become PostgREST RPC endpoints
2. **Do NOT use `SECURITY DEFINER` on `authz.is_admin()`** — it was intentionally converted to INVOKER to eliminate privilege escalation
3. **Do NOT add policies on `admin_users` that call `is_admin()`** — this would create infinite recursion
4. **Do NOT grant `anon` SELECT on `admin_users`** — anonymous users should never query admin status
5. **Do NOT revoke `USAGE` on `authz` schema from `authenticated`** — this would break all 16 admin RLS policies
6. **Do NOT apply the InsForge Advisor's suggested `REVOKE EXECUTE FROM authenticated` on `authz.is_admin()`** — this would break all admin access. The advisor flags SECURITY DEFINER functions generically; `authz.is_admin()` is now SECURITY INVOKER, so the warning should not appear

### ⚠️ CAUTION

1. **`sync_recruiter_users()`** remains `SECURITY DEFINER` — this is intentional because the trigger must write to `recruiter_users` which has no write policies for `authenticated`
2. **`sync_admin_users()`** remains `SECURITY DEFINER` — same reason as above
3. **`sync_announcement_view_count()` and `sync_announcement_dismiss_count()`** remain `SECURITY DEFINER` — they are trigger-only functions that UPDATE `announcements`. EXECUTE is revoked from all user roles
3. **If you add a new table** that admins should manage, create the policy with:
   ```sql
   CREATE POLICY "Admins can manage <table_name>"
     ON public.<table_name>
     FOR ALL
     TO authenticated
     USING (authz.is_admin());
   ```

---

## Migration History

| Migration | What It Did |
|---|---|
| [025](../insforge/migrations/025_fix_rls_recursion.sql) | Created `admin_users` table + `sync_admin_users` trigger to prevent RLS recursion |
| [029](../insforge/migrations/029_admin_users_rls_write_block.sql) | Enabled RLS on `admin_users`, blocked writes from authenticated |
| [033](../insforge/migrations/033_fix_insforge_advisor_190_issues.sql) | Forced RLS, pinned `search_path` on `is_admin()` |
| [037](../insforge/migrations/037_move_is_admin_to_authz_schema.sql) | Created `authz` schema, moved `is_admin()` there, migrated 16 policies |
| [038](../insforge/migrations/038_drop_public_is_admin.sql) | Dropped `public.is_admin()`, hardened `sync_admin_users` trigger |
| [039](../insforge/migrations/039_convert_is_admin_to_invoker.sql) | Converted to SECURITY INVOKER, added self-select policy on `admin_users` |
| [042](../insforge/migrations/042_harden_is_recruiter_authz.sql) | Moved `is_recruiter()` to `authz` schema, SECURITY INVOKER, self-select RLS |
| [043](../insforge/migrations/043_replace_announcement_counter_rpcs.sql) | Replaced `increment_announcement_view/dismiss` RPCs with trigger-based counters |
| [044](../insforge/migrations/044_vacuum_analyze_health_tables.sql) | Tuned autovacuum for high-churn tables, ran VACUUM ANALYZE |

---

## Verification Queries

Use these to audit the current state:

```sql
-- 1. Confirm authz.is_admin() is SECURITY INVOKER
SELECT prosecdef FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'authz' AND p.proname = 'is_admin';
-- Expected: false

-- 2. Confirm public.is_admin() does NOT exist
SELECT count(*) FROM pg_proc
  WHERE proname = 'is_admin'
    AND pronamespace = 'public'::regnamespace;
-- Expected: 0

-- 3. List all policies using authz.is_admin() and their role scopes
SELECT c.relname, p.polname,
       ARRAY(SELECT r.rolname FROM pg_roles r WHERE r.oid = ANY(p.polroles)) AS roles
FROM pg_policy p
JOIN pg_class c ON c.oid = p.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND (pg_get_expr(p.polqual, p.polrelid) ILIKE '%authz.is_admin%'
    OR pg_get_expr(p.polwithcheck, p.polrelid) ILIKE '%authz.is_admin%')
ORDER BY c.relname;
-- Expected: 16 rows, all with roles = {authenticated}

-- 4. Confirm anon has no access
SELECT has_function_privilege('anon', 'authz.is_admin()', 'EXECUTE') AS fn_exec,
       has_table_privilege('anon', 'public.admin_users', 'SELECT') AS tbl_select;
-- Expected: both false

-- 5. Confirm admin_users RLS policies
SELECT polname, pg_get_expr(polqual, polrelid) AS using_expr
FROM pg_policy
WHERE polrelid = 'public.admin_users'::regclass
ORDER BY polname;
-- Expected: admin_users_self_select (user_id = auth.uid()) + project_admin_policy (true)
```
