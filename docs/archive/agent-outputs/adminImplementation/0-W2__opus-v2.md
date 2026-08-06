# W2 — Live-backend verification (v2, executed)   ·   model: Opus 4.8 (advisor)   ·   phase: 0   ·   date: 2026-07-19

Supersedes `P0__gemini31pro.md`, which authored the queries but never ran them.

## Prompt given

Advisor-executed. Run W2 (a) live RLS state, (b) `exec_sql` callers, (c) live-schema vs doc-02 drift, (d) email-update flow — against the live backend, read-only, no DDL.

## What changed

No code, no schema. Read-only queries via `npx insforge db query` against project
`Talentmesh Solution | AI Recruiting Platform` (`da785b2b-…`, appkey `sytk3jgv`, region ap-southeast),
authenticated as anuj2812004@gmail.com. This report only.

## Verification run

58 tables in `public`. Queries run via the InsForge CLI; every finding below is a live query result, not inference.

### (a) RLS state — better than the docs assumed, with four exceptions

- **56 of 58 tables have RLS enabled.** Only `newsletter_rate_limits` and `newsletter_subscribers` have it off.
- **Zero tables are RLS-on-with-no-policies.** Policies are real per-role expressions (`auth.uid()` ownership, `is_admin()`, recruiter-join checks) — not placeholders.
- The `admin_bypass` / `project_admin_policy` `USING true WITH CHECK true` pairs present on ~56 tables are granted to the **`project_admin` role only** (service key). That is the expected service-role bypass, **not** an anon-reachable hole. (Stated explicitly because it looks alarming in a raw policy dump and is easy to misreport.)

**Policies granted to PUBLIC with `USING true` / `WITH CHECK true` — the actual exposure (4):**

| Table | Policy | Cmd | Assessment |
|---|---|---|---|
| `auth_attempts` | "Service role can manage auth attempts" | **ALL** | **P0.** Named for the service role but granted to PUBLIC. Any anon-key holder can read every login attempt (email enumeration) and `DELETE` their own failed attempts to defeat lockout/rate-limiting. |
| `platform_settings` | "Anyone can read platform_settings" | SELECT | **P2.** All settings incl. feature flags world-readable. Confirm nothing secret is stored in `value`. |
| `announcements` | "Anyone can read active announcements" | SELECT | **P3.** Expression is `true`, not `is_active = true` — unpublished announcements are readable. Policy name misstates behavior. |
| `notification_templates` | `templates_select_all` | SELECT | **P3.** Template bodies world-readable. |

### (a-bis) Two divergent sources of admin truth — P0

`is_admin()` (SECURITY DEFINER, so the bypass mechanism itself is sound) resolves admin status from
**`public.admin_users` membership**. Every RLS admin policy on `profiles`, `jobs`, `applications`,
`platform_settings` etc. routes through it.

The application layer does **not**. The R-2 kit's `requireStaff` (`insforge/functions/_shared/adminAuth.ts`)
reads `profiles.role`, and R-4 plans to standardize on `profiles.role` + `content`.

Live counts:

| | |
|---|---|
| `profiles` with role `admin`/`super_admin` | **14** (13 admin + 1 super_admin) |
| rows in `admin_users` | **7** |
| staff in `profiles` **missing** from `admin_users` | **7** |

**Half the staff accounts already pass the app-layer check and fail every RLS admin policy.** They authenticate,
reach admin pages, and get empty result sets on any query not routed through a service-key edge function.
This is the same failure shape as the recorded candidate "logged in but no data" bug.

Also note `is_admin()`'s inline comment claims "RLS is disabled on admin_users" — RLS **is** enabled on it
today. The function survives only because it is SECURITY DEFINER; the comment is stale and misleading.

### (b) `exec_sql` callers — confirmed, one production caller

`insforge/functions/admin-settings/index.ts:356-360`. **Not parameterized** (Gemini's v1 report claimed it was;
that is false). It is string interpolation with hand-rolled escaping:

```ts
const escapedValue = JSON.stringify(value).replace(/'/g, "''");
const escapedKey = String(key).replace(/'/g, "''");
const sql = `UPDATE public.platform_settings SET value = '${escapedValue}'::jsonb, updated_at = now() WHERE key = '${escapedKey}'`;
await insforgeAdmin.database.rpc('exec_sql', { query: sql });
```

Single-quote doubling is the correct Postgres literal escape and `standard_conforming_strings` defaults on,
so this is *probably* not injectable — but it is unreviewed by anyone who has not already asserted an answer.
All other `exec_sql` uses are test scripts / migration utilities. Disposition unchanged: ships with Phase 3 + 056.

### (c) Schema drift vs doc 02 — three tables the UI queries do not exist

| Table queried by | Table | Live? |
|---|---|---|
| `app/dashboard/admin/plans/page.tsx:36` | `subscription_plans` | **MISSING** |
| `app/dashboard/admin/team/page.tsx:74` | `admin_members` | **MISSING** |
| `app/dashboard/admin/email-templates/page.tsx:31` | `email_templates` | **MISSING** |
| `insforge/functions/admin-settings`, `admin-jobs`, `admin-audit` | `audit_logs` (plural) | **MISSING from `public`** — exists only in the `system` schema (InsForge internal), which PostgREST will not resolve. The live audit table is `public.audit_log` (singular). |

Consequences:

1. **All three R-1-ported pages are non-functional against live data.** Sonnet's report flagged that it could
   not smoke-test; this is the confirmation. The port itself is correct — the tables were simply never created.
   The orphaned trees they came from were written against a schema that does not exist here.
2. **Audit writes from three edge functions are silently failing.** In `admin-settings` the insert is inside a
   `try { } catch { console.warn }`, so settings changes appear to succeed while producing no audit row.
   Compliance-relevant, and it directly undercuts R-3's premise.

Full column-level dump for all 58 tables is available on request; the blocking drift is the four rows above.

### (d) Email-update flow — confirmed absent

`app/dashboard/admin/settings/page.tsx:531-538` hardcodes the email input `disabled` with
"Email cannot be changed here." No edge function exposes an email-update endpoint. Matches the plan:
this is Phase 1 scope (055 OTP infra), and Phase 5a depends on it. No action.

## SQL authored

None. No DDL was written or applied. Remediation SQL belongs in the Phase 1 migration batch (052).

## Deviations / assumptions

- Widened (a) from Gemini's 7-table list to all 58 tables in `public`. The omitted tables — `companies`,
  `company_profiles`, `platform_settings`, `auth_attempts` — are where the findings actually were.
- Did not diff all 58 tables column-by-column against doc 02. Scoped (c) to tables the admin code actually
  queries, which is what gates Phase 1.
- Did not test whether an anon key can in fact reach `auth_attempts` over PostgREST. The policy grant is
  unambiguous, but the end-to-end exploit is unverified — stated as policy state, not a demonstrated breach.

## Open questions for the advisor

1. **Which is the source of admin truth — `admin_users` or `profiles.role`?** R-4 cannot be written until this
   is decided; it changes both the 052 migration and every RLS admin policy. Recommendation: `profiles.role`
   (already the app-layer and kit convention), with 052 rewriting `is_admin()` to read it and `admin_users`
   dropped afterward. The 7 orphaned staff are then fixed by definition rather than by backfill.
2. **Do `subscription_plans` / `admin_members` / `email_templates` get created, or do those three pages get
   reverted to stubs until Phase 1?** They are dead UI either way today.
3. `audit_log` (singular) vs `audit_logs` (plural) — confirm 053's audit merge targets the singular live table,
   and fix the three edge-function references as part of it.
