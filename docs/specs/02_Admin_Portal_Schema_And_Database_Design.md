# 02 — Admin Portal Schema & Database Design

**Status:** Draft for review
**Owner:** Platform / Backend
**Version:** 1.0 — 2026-07-18
**Cross-refs:** `02_Schema_And_Database_Design.md` (recruiter/company suite — migrations 046–051, RLS house rules; those rules are mandatory here too), `14_Admin_Portal_Rebuild_Architecture.md` (R-3, R-4, R-10, §4), `01_Admin_Portal_Auth_Security_Audit_Report.md` (AD-4, AD-8, AD-11), `04_Admin_Portal_State_Machines_And_Business_Logic.md`.

**Standing rules (unchanged):** a human applies every migration — never an agent; committed SQL is not evidence of live state (documented out-of-band drift); verify with `mcp__insforge__get-table-schema` before and after each apply. **Because the platform is not live and all jobs/recruiters/candidates are test data, backfills below are deliberately simple — data loss in these backfills is accepted.** (Recorded product decision, 2026-07-18.)

RLS house rules apply to every policy below: `(SELECT auth.uid())` never bare `auth.uid()`; `authz.*` helpers; `admin_bypass` policy for `project_admin` on every new table; index every policy-filter column.

---

## Migration numbering

The recruiter/company suite reserves **046–051**. The admin suite takes **052–056**. Duplicate-numbered legacy files exist (010–014, 027–029, 035) — file names below include a slug so ordering is explicit.

| # | File | Contents |
|---|---|---|
| 052 | `052_admin_staff_roles.sql` | `content` role, `admin_users` sync trigger, registry collapse |
| 053 | `053_audit_unify.sql` | merge `audit_logs` → `audit_log`, append-only, new columns |
| 054 | `054_jobs_approval_status.sql` | `jobs.approval_status` (doc 12 W5) |
| 055 | `055_admin_otp.sql` | `admin_otp_challenges`, `password_setup_tokens` (impersonation removed — decision 2) |
| 056 | `056_settings_cleanup.sql` | drop `exec_sql`, prune `platform_settings`, drop shadow registries |

---

## Migration 052 — Staff roles & single registry

```sql
-- 1. Extend the role set (profiles.role stays THE authority — doc 14 §4.1)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('candidate','recruiter','admin','super_admin','content'));
-- 'finance' is added by the migration that ships billing write APIs, not before.

-- 2. Keep the authz anti-recursion lookup in sync (house rule: flat table, no app writes)
CREATE OR REPLACE FUNCTION authz.sync_admin_users() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.role IN ('admin','super_admin','content') THEN
    INSERT INTO public.admin_users(user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM public.admin_users WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_sync_admin_users ON public.profiles;
CREATE TRIGGER trg_sync_admin_users AFTER INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION authz.sync_admin_users();

-- 3. One-time reconcile of the lookup table against profiles
INSERT INTO public.admin_users(user_id)
  SELECT id FROM public.profiles WHERE role IN ('admin','super_admin','content')
  ON CONFLICT DO NOTHING;
DELETE FROM public.admin_users au
  WHERE NOT EXISTS (SELECT 1 FROM public.profiles p
                    WHERE p.id = au.user_id AND p.role IN ('admin','super_admin','content'));

-- 4. Last-super_admin guard (mirror of guard_last_company_admin, 02/051)
CREATE OR REPLACE FUNCTION authz.guard_last_super_admin() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (TG_OP = 'DELETE' AND OLD.role = 'super_admin')
     OR (TG_OP = 'UPDATE' AND OLD.role = 'super_admin'
         AND (NEW.role <> 'super_admin' OR NEW.is_active IS DISTINCT FROM true)) THEN
    IF (SELECT count(*) FROM public.profiles
        WHERE role = 'super_admin' AND is_active AND id <> OLD.id) = 0 THEN
      RAISE EXCEPTION 'last_super_admin' USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;
DROP TRIGGER IF EXISTS trg_guard_last_super_admin ON public.profiles;
CREATE TRIGGER trg_guard_last_super_admin BEFORE UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION authz.guard_last_super_admin();
```

**Why a DB trigger and not handler code:** same reasoning as `guard_last_company_admin` (doc 04 §2) — it fires on every path (RLS write, service key, RPC); handlers surface it as `422 last_super_admin`.

**Rollback:** drop the two triggers/functions; restore the old CHECK. `admin_members` is dropped in 056, not here (staff screens keep working until the new team page ships).

---

## Migration 053 — One audit spine

```sql
-- 1. New columns the rebuild writes (doc 14 R-3)
ALTER TABLE public.audit_log
  ADD COLUMN IF NOT EXISTS on_behalf_of uuid,          -- company_id when staff intervenes
  ADD COLUMN IF NOT EXISTS reason text;                 -- mandatory for interventions

-- 2. Merge the shadow table (columns mapped; test data ⇒ straight copy)
INSERT INTO public.audit_log (actor_id, action, target_type, target_id, metadata, created_at)
SELECT actor_id, action, COALESCE(table_name,'unknown'), record_id::text,
       jsonb_build_object('old_data', old_data, 'new_data', new_data, 'ip_address', ip_address),
       created_at
FROM public.audit_logs;
DROP TABLE public.audit_logs;

-- 3. Append-only at the DB level
REVOKE UPDATE, DELETE ON public.audit_log FROM authenticated, anon, project_admin;
-- service role keeps INSERT/SELECT; no role keeps UPDATE/DELETE.

-- 4. Indexes for the viewer's filters (03 §7)
CREATE INDEX IF NOT EXISTS audit_log_actor_idx   ON public.audit_log (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_target_idx  ON public.audit_log (target_type, target_id);
CREATE INDEX IF NOT EXISTS audit_log_behalf_idx  ON public.audit_log (on_behalf_of) WHERE on_behalf_of IS NOT NULL;
```

`verification_audit_log` (048) is **not** merged — it is the company-lifecycle ledger, written by the 049/051 RPCs, surfaced per-company in admin (doc 07 of this suite). Two ledgers, two jobs, both visible.

**Code changes gated on this migration:** `admin-settings`, `admin-audit` → write/read `audit_log`; every destructive path gains a write (R-3 list).

---

## Migration 054 — Job approval status (doc 12 W5)

```sql
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending'
  CHECK (approval_status IN ('pending','approved','rejected'));

-- Test data ⇒ simple backfill; the historical rejected-vs-closed ambiguity is moot (recorded decision)
UPDATE public.jobs SET approval_status = 'approved' WHERE is_approved = true;
-- everything else stays 'pending'

CREATE INDEX IF NOT EXISTS jobs_approval_status_idx ON public.jobs (approval_status);
-- is_approved is kept until admin-jobs + public read policies are migrated, then dropped in a later cleanup.
```

---

## Migration 055 — OTP challenges & password-setup tokens

> **Impersonation is removed for launch (decision 2)** — no `impersonation_sessions` table. If impersonation is ever rebuilt post-launch, add it in a later migration.

```sql
-- 1. OTP challenges — staff invites and email changes (AD-11; product requirement: OTP only)
CREATE TABLE IF NOT EXISTS public.admin_otp_challenges (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purpose       text NOT NULL CHECK (purpose IN ('staff_invite','email_change')),
  initiated_by  uuid NOT NULL REFERENCES public.profiles(id),   -- the super_admin (invite) or self (email change)
  subject_id    uuid REFERENCES public.profiles(id),            -- account being changed; NULL until invite acceptance creates it
  target_email  text NOT NULL,                                  -- where the OTP was sent (always the NEW address)
  otp_hash      text NOT NULL,                                  -- sha256(otp || server pepper), never the OTP
  payload       jsonb NOT NULL DEFAULT '{}'::jsonb,             -- invite: {name, role}; email_change: {}
  attempts      int  NOT NULL DEFAULT 0,
  expires_at    timestamptz NOT NULL,                           -- created_at + 10 minutes
  consumed_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);
-- one live challenge per purpose+email (resend replaces, no parallel codes)
CREATE UNIQUE INDEX IF NOT EXISTS aoc_live_uidx
  ON public.admin_otp_challenges (purpose, target_email) WHERE consumed_at IS NULL;

-- 2. Single-use set-password tokens (staff invites AND recruiter reset links — doc 14 R-7d)
CREATE TABLE IF NOT EXISTS public.password_setup_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token_hash  text NOT NULL,                                    -- sha256(token); raw token only in the email link
  purpose     text NOT NULL CHECK (purpose IN ('staff_invite','password_reset')),
  expires_at  timestamptz NOT NULL,                             -- invite: +24h; reset: +1h
  used_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS pst_live_uidx
  ON public.password_setup_tokens (user_id, purpose) WHERE used_at IS NULL;

-- RLS: neither table is client-readable. Service role only.
ALTER TABLE public.admin_otp_challenges   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_setup_tokens  ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS admin_bypass ON public.admin_otp_challenges;
CREATE POLICY admin_bypass ON public.admin_otp_challenges   TO project_admin USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS admin_bypass ON public.password_setup_tokens;
CREATE POLICY admin_bypass ON public.password_setup_tokens  TO project_admin USING (true) WITH CHECK (true);
-- (no authenticated/anon policies on purpose: all access is via edge functions with the service key)
```

**OTP invariants enforced here + in the handler (04 §3):** 6-digit numeric; TTL 10 min; max 5 verify attempts (handler increments `attempts`, voids at 5); resend = delete-and-reinsert (the unique partial index guarantees one live code); hash-only at rest.

---

## Migration 056 — Kill the hazards, prune the decoration

```sql
-- 1. exec_sql: an arbitrary-SQL executor must not exist (AD-8).
--    PRECONDITION (live check, human-verified): no caller besides admin-settings PATCH,
--    which is rewritten to a plain .update() in the same deploy.
DROP FUNCTION IF EXISTS public.exec_sql(text);

-- 2. Shadow admin registries (doc 13 D-18). admin_members is dropped; admin_users SURVIVES
--    as the authz lookup (trigger-maintained since 052) — but app code never writes it.
DROP TABLE IF EXISTS public.admin_members;

-- 3. platform_settings: keep only keys with a real consumer (AD-9 decision):
--    'feature_flags' → {candidateRegistration, recruiterRegistration, blogEnabled}
--    'maintenance'   → {enabled, message}
DELETE FROM public.platform_settings WHERE key = 'general';
UPDATE public.platform_settings
SET value = value - 'messagingEnabled' - 'aiMatching'
WHERE key = 'feature_flags';
```

**Gated on:** the settings-page rebuild (05 §5) and the proxy maintenance check (04 §6) shipping in the same release, so nothing references the removed keys.

---

## Admin data-access map after the rebuild

| Table | Admin access path | Direct client read allowed? |
|---|---|---|
| `profiles` | edge fns + `withApi` routes | ❌ (W2 must confirm before any exception) |
| `companies`, `company_members`, `company_verification_requests` | 049/051 RPCs + `admin-companies` v2 | ❌ |
| `jobs`, `applications`, `application_status_history` | `admin-jobs` / `admin-applications` | ❌ writes; reads pending W2 |
| `audit_log` (single) | `admin-audit-logs` read; all writers server-side | ❌ |
| `verification_audit_log` | surfaced via `admin-companies` get-detail | ❌ |
| `admin_otp_challenges`, `password_setup_tokens` | dedicated endpoints only (03 §5) | ❌ ever |
| `platform_settings` | `admin-settings` (plain `.update()`) + proxy read (maintenance) | ❌ |
| `subscription_plans`, `subscriptions`, `plan_limits` | `admin-plans` / `admin-billing` edge fns | ❌ (closes D-11) |
| `export_jobs`, `export_job_items` | `admin-export` edge fn | ❌ |
| `notification_jobs`, `notification_receipts`, `notification_templates` | ops console reads (W2-verified) + worker | read-only |

---

## Index summary (new)

| Table | Column(s) | Index |
|---|---|---|
| audit_log | (actor_id, created_at), (target_type, target_id), on_behalf_of | 053 |
| jobs | approval_status | 054 |
| admin_otp_challenges | (purpose, target_email) WHERE live | 055 |
| password_setup_tokens | (user_id, purpose) WHERE live | 055 |

## Edge cases

- **Sole super_admin suspends themself** → blocked by `trg_guard_last_super_admin` (`422 last_super_admin`).
- **Invite OTP for an email that already has an account** → handler returns `409 email_in_use` before creating a challenge (no orphan challenges).
- **Email change to an address with a pending invite** → the `aoc_live_uidx` conflict surfaces as `409 challenge_exists`; resend endpoint is the only way to replace it.

## Rollback

052: drop triggers, restore CHECK. 053: irreversible after `DROP TABLE audit_logs` — snapshot first (`_db_snapshots/` pattern exists). 054: drop column. 055: drop both tables. 056: irreversible (accepted: hazards should not be restorable).

## Implementation checklist

- [ ] 052 applied; last-super_admin guard verified by attempting self-demotion of the only super_admin
- [ ] 053 applied; viewer shows pre-merge settings actions; UPDATE/DELETE on audit_log rejected as service role
- [ ] 054 applied; job-approvals tabs filter on `approval_status`
- [ ] 055 applied; OTP + invite + email-change endpoints (03 §5) green against it
- [ ] 056 applied **last**, same release as settings-page rebuild + proxy maintenance check
- [ ] Live schema re-verified with `get-table-schema` after each apply
