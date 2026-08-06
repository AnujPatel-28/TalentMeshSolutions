# TalentMesh — Live Backend Security Audit
**Date**: 2026-06-19 | **Verified Against**: Live InsForge Backend  
**Scope**: Admin & Candidate Side Launch Readiness  
**Method**: Direct SQL queries to live PostgreSQL (`pg_tables`, `pg_policies`, `pg_proc`, `information_schema`, `has_table_privilege`, `has_function_privilege`)

---

## ⚠️ Verdict: NOT SAFE TO LAUNCH

The live database has **3 critical, confirmed, exploitable vulnerabilities** that any unauthenticated user (with only an anon key) can abuse right now. Two additional high-severity issues also need fixing.

---

## 🔴 CRITICAL BLOCKER #1 — `public.profiles` Table: RLS Disabled, Full Anon Write Access

**Live Proof:**
```
profiles → rowsecurity = FALSE (confirmed live)
anon role → SELECT: ✅ | INSERT: ✅ | UPDATE: ✅ | DELETE: ✅ (confirmed live)
```

**What this means:**
- The `profiles` table stores **every user's name, email, role, phone, bio, company_id, is_active, mfa_enabled** for all 20 users in the database.
- RLS is **disabled** — the two policies that exist (`profiles_self`, `profiles_select_self`) are **completely bypassed** because `rowsecurity = false`.
- Any anonymous visitor with the anon key can call `GET /rest/v1/profiles` and receive **all 20 user profiles** — including admin emails, phone numbers, roles.
- They can `PATCH /rest/v1/profiles?id=eq.<any-uuid>` to **change any user's role to `super_admin`**, flip `is_active = true`, etc.
- They can `DELETE /rest/v1/profiles?id=eq.<uuid>` to permanently destroy user accounts.

**Severity**: 🔴 Total compromise of all user data and roles. Hard blocker.

**Fix Required:**
```sql
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- Optionally also:
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
```

---

## 🔴 CRITICAL BLOCKER #2 — `public.admin_users` Table: RLS Disabled, Full Anon Write Access

**Live Proof:**
```
admin_users → rowsecurity = FALSE (confirmed live)
anon role → SELECT: ✅ | INSERT: ✅ | UPDATE: ✅ | DELETE: ✅ (confirmed live)
```

**What this means:**
- `admin_users` is the lookup table used by `is_admin()` to determine if a user has admin privileges.
- Any unauthenticated user can `POST /rest/v1/admin_users` with their own UUID and immediately gain admin recognition.
- Combined with Blocker #1 (profiles writable), an attacker can in two steps: (1) insert any UUID into `admin_users`, (2) change any profile's `role` to `super_admin`. **Full platform takeover in 2 API calls.**

**Severity**: 🔴 Privilege escalation to super_admin for any anonymous user.

**Fix Required:**
```sql
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
-- Allow reads (needed for is_admin() function), block all writes from clients:
CREATE POLICY "public_can_read_admin_users" ON public.admin_users FOR SELECT USING (true);
-- No INSERT/UPDATE/DELETE policies = only SECURITY DEFINER triggers can write
```

---

## 🔴 CRITICAL BLOCKER #3 — `public.exec_sql(text)` & `public.query_json(text)`: Callable by Anonymous Users

**Live Proof:**
```
has_function_privilege('anon', 'public.exec_sql(text)', 'execute') = TRUE (confirmed live)
has_function_privilege('anon', 'public.query_json(text)', 'execute') = TRUE (confirmed live)
```

**What this means:**
- `exec_sql` is `SECURITY DEFINER` and runs `EXECUTE query` — arbitrary SQL with owner privileges.
- `query_json` similarly runs arbitrary SQL and returns results as JSON.
- Any unauthenticated user can call `POST /rest/v1/rpc/exec_sql` with `{"query": "DROP TABLE profiles"}` or `{"query": "SELECT * FROM auth.users"}` and execute it with full superuser-level access.
- **This is remote code execution on the database.**

**Severity**: 🔴 Full database takeover. Total data breach. Hard blocker.

**Fix Required:**
```sql
REVOKE EXECUTE ON FUNCTION public.exec_sql(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.query_json(text) FROM PUBLIC;
-- Keep project_admin access only — migration scripts use service_role and bypass grants.
```

---

## 🟠 HIGH RISK #4 — `public.ai_suggestion_cache`: RLS Disabled, Full Anon Write Access

**Live Proof:**
```
ai_suggestion_cache → rowsecurity = FALSE (confirmed live)
anon role → SELECT: ✅ | INSERT: ✅ | UPDATE: ✅ | DELETE: ✅ (confirmed live)
```

**What this means:**
- Cache poisoning: Any anonymous user can insert or overwrite cached AI suggestions.
- If cached suggestions include job recommendations or candidate scores shown on the UI, attackers can inject malicious content or bias candidate results.
- Not an immediate data breach, but a persistent integrity attack vector.

**Fix Required:**
```sql
ALTER TABLE public.ai_suggestion_cache ENABLE ROW LEVEL SECURITY;
-- Allow reads for authenticated users, restrict writes to project_admin:
CREATE POLICY "authenticated_can_read_cache" ON public.ai_suggestion_cache FOR SELECT TO authenticated USING (true);
```

---

## 🟡 MEDIUM RISK #5 — `public.is_admin()` & announcement functions callable by `anon`

**Live Proof:**
```
has_function_privilege('anon', 'public.is_admin()', 'execute') = TRUE (confirmed live)
has_function_privilege('anon', 'public.increment_announcement_view(uuid)', 'execute') = TRUE
has_function_privilege('anon', 'public.increment_announcement_dismiss(uuid)', 'execute') = TRUE
has_function_privilege('anon', 'public.log_application_status_change()', 'execute') = TRUE
```

**What this means:**
- `is_admin()` itself is harmless to expose (it just returns a boolean). No direct risk.
- `increment_announcement_view/dismiss`: Any anonymous user can artificially inflate view/dismiss counters on any announcement. Cosmetic integrity issue.
- `log_application_status_change()` is a trigger function (returns `TRIGGER` type) — **cannot be directly called via PostgREST RPC** even though `anon` has the grant. Low effective risk.

**Fix (recommended, not blocker):**
```sql
REVOKE EXECUTE ON FUNCTION public.increment_announcement_view(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_announcement_dismiss(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_announcement_view(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_announcement_dismiss(uuid) TO authenticated;
```

---

## ✅ CONFIRMED SAFE — Issues from Advisory That Are NOT Risks on Live Backend

The following flagged issues have been verified as safe against the live backend:

| Issue | Advisory Claim | Live Reality | Verdict |
| :--- | :--- | :--- | :--- |
| `exec_sql` callable by public | 🔴 Dangerous | **CONFIRMED DANGEROUS** (see Blocker #3) | Fix required |
| `query_json` callable by public | 🔴 Dangerous | **CONFIRMED DANGEROUS** (see Blocker #3) | Fix required |
| `set_default_resume` callable by `authenticated` | Flagged | **NOT DEPLOYED** — not in live DB | ✅ Non-issue |
| `claim_export_job` callable by public | Flagged | **NOT DEPLOYED** — not in live DB | ✅ Non-issue |
| `claim_notification_job` callable by public | Flagged | **NOT DEPLOYED** — not in live DB | ✅ Non-issue |
| `claim_cleanup_lock` callable by public | Flagged | **NOT DEPLOYED** — not in live DB | ✅ Non-issue |
| `release_cleanup_lock` callable by public | Flagged | **NOT DEPLOYED** — not in live DB | ✅ Non-issue |
| `log_cleanup_telemetry` callable by public | Flagged | **NOT DEPLOYED** — not in live DB | ✅ Non-issue |
| `calculate_profile_strength_score` | Flagged | **NOT DEPLOYED** — not in live DB | ✅ Non-issue |
| `sync_profile_strength` | Flagged | **NOT DEPLOYED** — not in live DB | ✅ Non-issue |
| `reassign_resume_references` | Flagged | **NOT DEPLOYED** — not in live DB | ✅ Non-issue |
| `update_job_applications_count` | Flagged | **NOT DEPLOYED** — not in live DB | ✅ Non-issue |
| `maintain_resume_upload_count` | Flagged | **NOT DEPLOYED** — not in live DB | ✅ Non-issue |
| `is_recruiter` callable by authenticated | Flagged | **NOT DEPLOYED** — not in live DB | ✅ Non-issue |
| `announcements` SELECT USING (true) | Policy too permissive | Intentional public read, admin-only write ✅ | ✅ By design |
| `notification_templates` SELECT USING (true) | Policy too permissive | Server-internal table, admin write protected ✅ | ✅ By design |
| `platform_settings` SELECT USING (true) | Policy too permissive | Needed for maintenance mode/feature flag reads ✅ | ✅ By design |
| `saved_candidates` | No RLS | **Table does NOT exist** in live DB | ✅ Non-issue |
| `test_rpc_sync` | No RLS | **Table does NOT exist** in live DB | ✅ Non-issue |
| `debug_output` | No RLS | **Table does NOT exist** in live DB | ✅ Non-issue |
| `recruiter_users` | No RLS | **Table does NOT exist** in live DB | ✅ Non-issue |

---

## Additional Finding — `candidate_profiles` SELECT Queries Profiles Without RLS

**Live Proof:**
- `candidate_profiles_self_and_admin_select` policy: `(id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND (p.role = 'admin' OR p.role = 'super_admin'))`
- This policy queries the `profiles` table — but **profiles has RLS disabled**.
- This means ANY call to `candidate_profiles` for admin check hits `profiles` table unfiltered.
- Once profiles RLS is re-enabled (Blocker #1 fix), this query will correctly enforce access.
- **No additional fix needed here once Blocker #1 is resolved.**

---

## Summary — Minimum SQL Required Before Launch

```sql
-- FIX 1: Enable RLS on profiles (CRITICAL — full user data exposed)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- FIX 2: Enable RLS on admin_users + read-only policy (CRITICAL — privilege escalation)
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_can_read_admin_users"
  ON public.admin_users FOR SELECT USING (true);

-- FIX 3: Revoke anon execute on exec_sql and query_json (CRITICAL — arbitrary SQL execution)
REVOKE EXECUTE ON FUNCTION public.exec_sql(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.query_json(text) FROM PUBLIC;

-- FIX 4: Enable RLS on ai_suggestion_cache (HIGH — cache poisoning)
ALTER TABLE public.ai_suggestion_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_read_cache"
  ON public.ai_suggestion_cache FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_bypass_cache"
  ON public.ai_suggestion_cache TO project_admin USING (true) WITH CHECK (true);

-- FIX 5: Restrict announcement counter functions to authenticated only (MEDIUM)
REVOKE EXECUTE ON FUNCTION public.increment_announcement_view(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_announcement_dismiss(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_announcement_view(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_announcement_dismiss(uuid) TO authenticated;
```

> [!CAUTION]
> Fixes 1–3 are hard blockers. Do NOT launch with these unfixed. A single API call from anyone on the internet can escalate privileges or read/delete all user data.
