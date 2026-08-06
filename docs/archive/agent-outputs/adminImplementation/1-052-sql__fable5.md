# 052 — Migration SQL: profiles.role admin truth   ·   model: Fable 5   ·   phase: 1   ·   date: 2026-07-19

## Prompt given

Author migration 052 (SQL only, human-applied): rewrite `is_admin()` onto `profiles.role` (decide the role set), do NOT drop `admin_users`, fix the `auth_attempts` PUBLIC-ALL policy, assess three PUBLIC SELECT policies individually, add `idempotency_keys.response_body`, decide 052-vs-053 ownership of the `audit_logs`→`audit_log` naming defect. Evidence base: `0-W2__opus-v2.md` (live-verified 2026-07-19), trusted over doc 02.

## What changed

**One file: `insforge/migrations/052_profiles_role_admin_truth.sql`** (authoritative — the excerpts below are for review convenience). Idempotent, single transaction, safe to re-run. **Nothing was applied; no DDL was run by me.**

> **v2 (2026-07-19, after advisor live re-verification):**
> 1. **`public.is_admin()` throughout, not `authz.`** — pg_proc confirms the only live function is `public.is_admin()`; migrations 037/038 (the authz-schema move) were authored in-repo but never applied to the live backend (new drift datapoint). v1 would have replaced a function no policy calls — a silent no-op flip.
> 2. **Seven-value role CHECK** — live pg_constraint permits six values (`candidate, recruiter, admin, super_admin, company_admin, hr`; the last two have zero rows, which is why the P1 data census showed four). New CHECK = those six + `content`. `company_admin`/`hr` carried forward because revoking permitted values is an unrelated change; `finance` still deferred to the billing migration per doc 14.
> 3. Advisor sign-offs recorded: Section 0 stays in; audit-naming ownership as proposed (code fix with the R-2 set review, 053 = hardening only).

### Decisions the advisor asked for

**1. `is_admin()` role set → `('admin', 'super_admin')` — `content` excluded.** `is_admin()` gates ~30 RLS policies including FOR ALL on `profiles`, `subscriptions`, `user_sessions`, `platform_settings`. The §4.2 matrix gives content staff *dashboard-view, content-edit, reports-view* — nothing close to table-level ALL on PII. Including `content` would make RLS grant what the permission matrix denies. Content staff operate exclusively through edge functions (`requireStaff` + matrix, service key), which is the doc-14 architecture anyway. New body (follows the hardened 037 pattern — authored in-repo, never applied live — `LANGUAGE sql STABLE SECURITY DEFINER`, explicit `search_path`, `(SELECT auth.uid())` wrapper, explicit NULL-uid guard; stale "RLS is disabled on admin_users" comment not carried forward; grants also end anon PostgREST RPC access):

```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    (SELECT auth.uid()) IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
        AND role IN ('admin', 'super_admin')
    ),
    false
  );
$$;
```

Recursion note (why 025 originally moved this off `profiles`): the function is SECURITY DEFINER, so its `profiles` read runs as the function owner — owner bypasses RLS (no FORCE RLS on `profiles`; post-apply check 6 confirms), and even under FORCE the owner/project_admin path hits only the plain-`true` bypass policy. No recursion either way.

**2. `admin_users` untouched** — table, RLS, and `sync_admin_users` trigger all stay as the rollback path (rollback snippet restoring the 037 body is at the bottom of the migration file). The drop ships in a later migration after live verification of the flip. The 7 orphaned staff are fixed by definition, not backfill.

**3. `auth_attempts` P0** — the PUBLIC `FOR ALL USING(true)` policy is dropped; a `project_admin` FOR ALL policy is created only if the standard service-role pair is missing (DO-block guard). Grep found **zero app-layer readers/writers** of `auth_attempts` in this repo, so nothing app-side loses access.

**4. Three PUBLIC SELECT policies — individually assessed against actual consumers:**

| Policy | Verdict | Why |
|---|---|---|
| `platform_settings` "Anyone can read platform_settings" | **Restrict (drop)** | Every reader in the codebase is service-key (`lib/server/admin.ts`, `admin-settings` fn); no anon/browser consumer. Staff keep read via the existing `FOR ALL USING (public.is_admin())` policy. Zero blast radius. |
| `announcements` "Anyone can read active announcements" | **Keep PUBLIC, fix expression → `is_active = true`** | `AnnouncementBanner.tsx` reads this table with the browser client — a real anon-facing surface, so PUBLIC must stay. But the current `true` expression leaks drafts; with content-role drafting coming (doc 14), unpublished announcements must not be world-readable. Accepted residual (P3): `target_roles` filtering stays client-side. |
| `notification_templates` `templates_select_all` | **Restrict to staff (`TO authenticated USING (public.is_admin())`)** | Two consumers: `notification-worker` (service key — unaffected) and `app/dashboard/admin/notifications/page.tsx`, which reads **browser-side with a staff JWT** — so the policy must admit staff, not disappear (dropping it outright would break that ops page). Template bodies are phishing raw material; non-staff have no use for them. |

**5. `idempotency_keys.response_body JSONB`** — included (`ADD COLUMN IF NOT EXISTS`), per the advisor's ride-in-052 decision.

**6. Audit naming → no DDL in 052, and none needed anywhere.** Live truth: `public.audit_log` (singular) exists, `public.audit_logs` (plural) does not — there is nothing to merge or rename in SQL. The actual defect is three edge functions (`admin-settings`, `admin-jobs`, `admin-audit`) writing to the nonexistent plural (with `admin-settings` swallowing the failure → settings changes report success, write no audit row). **Ownership: the code fix belongs to the R-2 migrated-set review (already owed to Fable), so it lands before the post-R-4 bulk deploy; 053 then reduces to audit hardening + writer coverage (R-3) with no merge step.** Doc 14's 053 spec should be amended accordingly.

### One inclusion beyond the six items — flagged for review

**Section 0: `profiles_role_check` becomes the seven-value set** (`candidate, recruiter, admin, super_admin, company_admin, hr, content`) — the six the live constraint already permits plus `content` (doc 14 §4.1 assigned this to 052; item 1's role set presumes `content` is legal). **Advisor: stays in (signed off).** The ADD CONSTRAINT validates existing rows and aborts the transaction on any unexpected value — the safe failure mode.

## SQL authored (if any)

`insforge/migrations/052_profiles_role_admin_truth.sql` — full migration, plus the rollback snippet for the `is_admin` flip. Reproduced decisions above; file is authoritative.

## Verification run

Static only (nothing applied): SQL reviewed against live-verified facts from W2; policy consumers grepped across `app/`, `lib/`, `components/`, `insforge/functions/` (evidence in §4 table). **The queries below are for the human to run.**

### PRE-APPLY (run first; abort on surprises)

```sql
-- P1. Role values must be within the new CHECK set (else section 0 aborts the txn)
SELECT role, count(*) FROM public.profiles GROUP BY role ORDER BY 2 DESC;
-- expect only: candidate / recruiter / admin / super_admin (NULL ok — passes CHECK)

-- P2. Confirm the role-check constraint name before the drop/re-add
SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
WHERE conrelid = 'public.profiles'::regclass AND contype = 'c';
-- expected (advisor-verified 2026-07-19): a six-value CHECK —
--   role = ANY (ARRAY['candidate','recruiter','admin','super_admin','company_admin','hr'])
-- if it exists under a name other than profiles_role_check, edit section 0 to drop THAT name

-- P3. Staff census going in (this is the set is_admin() will cover after the flip)
SELECT id, email, role FROM public.profiles
WHERE role IN ('admin','super_admin') ORDER BY role, email;  -- expect 14 rows
```

### POST-APPLY

```sql
-- V1. is_admin() now covers all 14 staff (definition + census)
SELECT pg_get_functiondef('public.is_admin()'::regprocedure);
-- must reference public.profiles + role IN ('admin','super_admin'); no admin_users
SELECT count(*) FROM public.profiles WHERE role IN ('admin','super_admin');
-- expect 14 — the 7 previously missing from admin_users are now covered by definition

-- V2. auth_attempts no longer PUBLIC; service role covered
SELECT policyname, roles, cmd, qual, with_check
FROM pg_policies WHERE schemaname='public' AND tablename='auth_attempts';
-- expect: NO row with roles {public}; at least one FOR ALL row for {project_admin}

-- V3. response_body exists
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema='public' AND table_name='idempotency_keys'
  AND column_name='response_body';                     -- expect 1 row, jsonb

-- V4. announcements expression now matches its name
SELECT policyname, roles, qual FROM pg_policies
WHERE schemaname='public' AND tablename='announcements'
  AND policyname='Anyone can read active announcements';
-- expect qual: (is_active = true)

-- V5. platform_settings / notification_templates PUBLIC reads gone, staff path intact
SELECT tablename, policyname, roles, cmd, qual FROM pg_policies
WHERE schemaname='public' AND tablename IN ('platform_settings','notification_templates');
-- expect: no {public} SELECT-true rows; templates_select_admin TO {authenticated}
-- USING public.is_admin(); "Admins can manage platform_settings" still present

-- V6. Recursion-safety preconditions hold
SELECT relrowsecurity, relforcerowsecurity FROM pg_class
WHERE oid = 'public.profiles'::regclass;               -- expect: t, f
```

Functional smoke (after V-set passes): log in as one of the 7 previously-orphaned staff and load an admin list page that reads directly (e.g. candidates) — rows must now appear ("logged in but no data" shape gone). The banner on a logged-out page must still show active announcements.

## Deviations / assumptions

- **Section 0 (role CHECK + `content`) exceeds the advisor's six-item list** — reasoning and separability flagged above.
- `is_admin()` does **not** check `profiles.is_active` — kept a pure widening per the instruction (no silent narrowing in the same migration). **[SUGGESTION]** add `AND is_active IS NOT FALSE` in the admin_users-drop migration so suspension also bites at the RLS layer; needs the NULL-semantics decision first (the R-2 kit treats NULL is_active as suspended, `lib/server-auth.ts` treats it as active — that inconsistency should be settled then too).
- `auth_attempts`: "no writers" is asserted for this repo only. If anything outside the repo writes it with the anon key, the restriction removes that path — post-apply, watch that new rows still accrue during logins.
- Assumed the live service role is `project_admin` (W2 §a) and that `CREATE OR REPLACE` preserves the 037 grants (they are re-asserted anyway).
- `announcements.is_active` column existence is inferred from the live app query (`AnnouncementBanner.tsx` filters `.eq('is_active', true)`), not from a live schema dump — P2's constraint query run will confirm the apply doesn't error.

## Open questions for the advisor

1. Section 0 in or out of 052? (In as authored; separable.)
2. Sign off on the audit-naming ownership call in decision 6 (code fix with the R-2 set review; 053 amended to hardening-only)? If yes I'll fold the three edge-fn reference fixes into the migrated-set review I already owe.
