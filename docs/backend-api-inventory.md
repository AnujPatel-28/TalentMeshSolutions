# TalentMesh — Backend API Inventory

**Audience:** backend / platform engineers taking ownership of this system.
**Method:** every claim below was read out of the source tree at `cleanup/login-page-ponytail`, or
queried live against the production InsForge PostgreSQL catalogue on **2026-08-05**. Where the two
disagree, the live database wins and the discrepancy is called out.
**Scope:** inventory only. No code was modified, refactored, or generated.

> **Why the live database, not the migrations.** Production DDL on this project has been applied
> out-of-band and `insforge/migrations/` is **not** a complete record of live schema. Every table,
> policy, index, trigger and function in this document comes from `pg_catalog` on the running
> database, not from migration files.

**Live totals:** 65 tables · 76 foreign keys · 165 RLS policies · 37 triggers · 7 storage buckets ·
54 edge functions · 42 Next.js API routes. Database ~24 MB, storage ~19 MB — this is a
production-shaped system carrying a small production dataset, not a system under load.

---

## 1. Project Overview

### Request path

```
Browser
  │
  ├─► Next.js App Router (app/)  ── React 19, MUI 7, Zustand, TanStack Query
  │
  ├─► proxy.ts (Next middleware)  ── subdomain routing + portal gates (Host-based)
  │
  ├─► app/api/**  (42 route handlers) ── withApi(): auth, role, Zod validation, audit
  │        │
  │        └─► InsForge SDK (server) ─────────────┐
  │                                               │
  └─► app/api/v1/remote/[...path]  ── CATCH-ALL PROXY to InsForge
                                                  │
                                                  ▼
                                    InsForge Cloud
                                      ├── PostgREST  (/api/database/records/*)
                                      ├── Edge Functions (Deno, 54)
                                      ├── Storage (7 buckets)
                                      └── PostgreSQL 
                                            ├── RLS on all 65 tables
                                            ├── authz.* helper schema
                                            └── pgvector, pgcrypto, http, uuid-ossp
```

### Frontend
Next.js 16 App Router, React 19.2.3, TypeScript. Three portals under one deployment —
candidate (`app/dashboard/candidate`), recruiter (`app/dashboard/recruiter`), admin
(`app/dashboard/admin`), plus a public job board (`app/browse-jobs`, `app/jobs`) and marketing
routes (`app/portals/jobs/*`).

State: **Zustand** (`store/uiStore.ts`) for UI state; **TanStack Query** for server state — but
adoption is thin. Only **5 files** use `useQuery`/`useMutation` and the key registry
(`lib/queries/queryKeys.ts`) has **4 keys**. Everything else uses bare `fetch` inside `useEffect`.
See §8.

### Proxy layer
Two distinct things share the name "proxy":

1. **`proxy.ts`** (repo root) — the Next.js middleware. Subdomain routing (`jobs.` / `app.` /
   `admin.`) and portal gating, keyed off the `Host` header. Localhost cannot exercise these gates.
2. **`app/api/v1/remote/[...path]/route.ts`** — a **catch-all HTTP proxy** to InsForge, and the
   single most important file in the backend. It:
   - forwards any path after `/api/v1/remote` to either the Functions host (if the path starts
     `/functions`) or the InsForge REST host — **with no path allowlist**;
   - resolves caller identity from the **`tm_access_token` HttpOnly cookie**, treating the cookie
     as the source of truth and ignoring caller-supplied `Bearer null`/anon-key headers;
   - injects `x-insforge-url`, `x-insforge-anon-key` and `x-insforge-service-key` headers on
     every upstream request;
   - applies CSRF checks (Origin/Referer same-origin + a required custom header) to mutating
     methods only;
   - enforces a 10 MB payload cap;
   - **substitutes the service-role key for unauthenticated GETs** whose path contains
     `/api/database/records/blog` or `/api/database/records/jobs` (see §9 **SEC-1**).

Because edge functions are reached through this proxy by dynamic slug, static analysis cannot
attribute a caller to most of them — see §4.

### Authentication
InsForge Auth. Email/password plus Google and LinkedIn OAuth (GitHub is enabled on the project but
unused by the app). Session is a JWT in an **HttpOnly, parent-domain cookie** so it survives the
`jobs.`/`app.`/`admin.` subdomain split. Server code reads it via `lib/server-auth.ts`; the SDK's
in-browser `getCurrentUser()` is **not** usable (token manager is in-memory, refresh cookie is
scoped to `/api/auth`). Full detail in §6.

### Database
PostgreSQL, 65 public tables, RLS enabled on **all** of them. Authorization helpers live in a
dedicated **`authz`** schema (`company_id_of`, `admin_company_id_of`, `company_role`,
`is_company_admin`, `is_admin`, `is_recruiter`) — `SECURITY DEFINER` with pinned `search_path`,
which is the correct pattern and avoids the recursive-RLS problem. `anon` has no USAGE on `authz`.

Extensions installed: `pgvector` (halfvec/sparsevec — no vector column is in use yet),
`pgcrypto`, `uuid-ossp`, and **`http`** (see §9 **SEC-2**).

### Edge Functions
54 Deno functions. Roughly: 17 `admin-*`, 6 candidate-facing, 5 recruiter-facing, 4 auth, 3 upload,
2 proxy (resume / recruiter documents), 2 cleanup/cron, plus jobs/blogs/dashboard readers.
Only **3** call an external API — `ai-match` and `resume-parse` (Anthropic) and `auth-signup`
(Resend). Everything else is database work that happens to run in Deno.

### Storage
7 buckets, 4 public and 3 private. Private buckets are never addressed directly by the browser;
they are read through the `resume-proxy` and `recruiter-document-proxy` edge functions, which
perform per-object authorization. See §5.

### PostgREST
Reached at `/api/database/records/<table>` through the catch-all proxy. This is how most list and
detail reads happen — the SDK builds PostgREST queries client-side (`.from().select().eq()`), and
RLS is the enforcement boundary. This makes the RLS policy set in §2 the *primary* access-control
surface for the product, not a backstop.

---

## 2. Database Inventory

### 2.1 Master table

`P` = policies, `T` = triggers, `I` = indexes, `C` = columns. `Rows` is the live record count.
`Forced` = `FORCE ROW LEVEL SECURITY` (policies apply to the table owner too).

| Table | Rows | C | PK | P | T | I | RLS | Purpose |
|---|--:|--:|---|--:|--:|--:|---|---|
| access_requests | 0 | 18 | id | 2 | 0 | 1 | forced | Legacy recruiter access-request intake |
| activity | 17 | 10 | id | 3 | 0 | 2 | forced | Per-user activity feed |
| admin_invites | 0 | 5 | id | **0** | 0 | 3 | on | Admin invite tokens |
| admin_permissions | 0 | 5 | id | **0** | 0 | 3 | on | Granular admin permission grants |
| admin_users | 8 | 1 | user_id | 1 | 0 | 1 | forced | Denormalised admin lookup, synced by trigger |
| ai_interviews | 0 | 7 | id | 3 | 0 | 2 | forced | **Unwired** — AI interview records |
| ai_suggestion_cache | 0 | 4 | query_key | **0** | 0 | 1 | forced | **Unwired** — AI suggestion cache |
| announcement_dismissals | 0 | 4 | id | 3 | 1 | 3 | on | Per-user announcement dismissal |
| announcement_views | 0 | 3 | (announcement_id,user_id) | 3 | 1 | 2 | forced | Per-user announcement view |
| announcements | 0 | 14 | id | 4 | 0 | 1 | on | Admin broadcast messages |
| application_events | 0 | 4 | id | 1 | 0 | 2 | on | Application event stream |
| application_status_history | 36 | 9 | id | 3 | 0 | 5 | on | Audit trail of stage moves |
| **applications** | 35 | 16 | id | **13** | **7** | 10 | on | Core ATS join: candidate ↔ job |
| audit_log | 15 | 14 | id | 1 | 0 | 5 | on | Admin action audit spine |
| auth_attempts | 0 | 5 | email | **0** | 0 | 1 | on | Login throttling |
| auth_events | 0 | 6 | id | 2 | 0 | 2 | on | Auth event log |
| authorization_events | 0 | 9 | id | 2 | 0 | 3 | on | Authz decision log |
| blog | 2 | 10 | id | 2 | 0 | 3 | forced | CMS posts |
| **candidate_profiles** | 59 | 27 | id | 5 | 5 | 5 | on | Candidate detail; PK = profiles.id |
| candidate_resumes | 43 | 10 | id | 8 | 3 | 2 | on | Resume metadata (files in `resumes` bucket) |
| cleanup_job_runs | 0 | 4 | job_name | 1 | 0 | 1 | on | Cron lock + telemetry |
| **companies** | 10 | 24 | id | 3 | 1 | 5 | on | Employer entity, verification state |
| company_members | 3 | 9 | id | 4 | 1 | 5 | on | User ↔ company membership + role |
| company_verification_requests | 2 | 11 | id | 3 | 0 | 3 | on | KYC submission queue |
| consent_records | 52 | 11 | id | 2 | 0 | 3 | on | DPDP consent ledger (append-only) |
| custom_proposals | 0 | 7 | id | 2 | 0 | 2 | on | Bespoke pricing proposals |
| data_principal_requests | 0 | 11 | id | 2 | 0 | 3 | on | DPDP access/erasure requests |
| **debug_output** | 3 | 1 | *(none)* | **0** | 0 | **0** | forced | **Debug leftover — see §9 HYG-1** |
| export_candidates | 0 | 4 | id | 2 | 0 | 3 | on | Export job line items |
| export_jobs | 0 | 9 | id | 4 | 0 | 2 | on | Async CSV export jobs |
| idempotency_keys | 0 | 7 | key | 1 | 0 | 1 | on | Mutation idempotency |
| interviews | 0 | 14 | id | 3 | 0 | 5 | on | **Cut to v1.1** — never held a row |
| job_alerts | 0 | 6 | id | 2 | 0 | 2 | on | Candidate saved-search alerts |
| **jobs** | 6 | 24 | id | 7 | 3 | 9 | on | Job postings + approval state |
| live_ai_interviews | 0 | 9 | id | 3 | 0 | 4 | forced | **Unwired** — live AI interview sessions |
| messages | 0 | 7 | id | 1 | 0 | 4 | on | Direct messaging (unused) |
| newsletter_rate_limits | 1 | 3 | ip_hash | **0** | 0 | 1 | forced | Newsletter signup throttle |
| newsletter_subscribers | 3 | 14 | id | **0** | 0 | 8 | forced | Newsletter list |
| notification_events | 0 | 5 | id | 2 | 0 | 2 | on | Notification delivery events |
| notification_jobs | 0 | 22 | id | 2 | 1 | 4 | on | Notification outbox queue |
| notification_preferences | 160 | 6 | user_id | 2 | 0 | 1 | on | Per-user channel prefs |
| notification_receipts | 0 | 7 | id | 2 | 0 | 3 | on | Delivery receipts |
| notification_templates | 5 | 7 | id | 2 | 0 | 2 | on | Message templates |
| notifications | 46 | 8 | id | 4 | 1 | 2 | on | In-app notifications |
| nvites | 0 | 14 | id | 6 | 0 | 4 | on | **Cut to v1.1** — outbound invites |
| offers | 0 | 16 | id | 5 | 0 | 4 | on | **Cut to v1.1** — offer letters |
| plan_limits | 1 | 4 | plan | 2 | 0 | 1 | on | Per-plan entitlement caps |
| platform_settings | 4 | 3 | key | 2 | 0 | 1 | on | Runtime platform config |
| **profiles** | 160 | 27 | id | 8 | **9** | 2 | on | Identity + role. Root of the graph |
| recruiter_candidate_notes | 0 | 6 | id | 2 | 0 | 3 | on | Private recruiter notes |
| **recruiter_profiles** | 5 | 17 | id | 2 | 3 | 2 | on | **Legacy** recruiter detail — see §9 SEC-3 |
| recruiter_users | 27 | 1 | user_id | 2 | 0 | 1 | forced | Denormalised recruiter lookup |
| resume_access_log | 1 | 7 | id | 2 | 0 | 5 | on | Who opened whose resume (DPDP) |
| saved_candidates | 0 | 4 | id | **0** | 0 | 3 | **forced** | **Unreachable — see §9 SEC-5** |
| saved_jobs | 6 | 4 | id | 1 | 0 | 3 | on | Candidate bookmarks |
| storage_quarantine | 0 | 9 | id | 2 | 0 | 2 | on | Flagged uploads |
| subscription_events | 0 | 8 | id | 1 | 0 | 2 | on | Billing event log |
| subscription_plans | 4 | 17 | id | 2 | 0 | 2 | on | Plan catalogue (publicly readable) |
| subscriptions | 0 | 14 | id | 1 | 0 | 2 | on | Active subscriptions |
| **test_rpc_sync** | 0 | 1 | id | **0** | 0 | 1 | forced | **Test artifact in prod — §9 HYG-1** |
| user_auth_state | 162 | 5 | user_id | 2 | 0 | 1 | on | Token/session invalidation state |
| user_preferences | 1 | 4 | user_id | 8 | 1 | 1 | on | User settings |
| user_rate_limits | 0 | 3 | id | 1 | 0 | 2 | on | Per-user rate limiting |
| user_sessions | 125 | 16 | id | 4 | 0 | 4 | on | Session governance / revocation |
| verification_audit_log | 7 | 9 | id | 2 | 0 | 3 | on | Company verification audit |

### 2.2 Relationship graph

`profiles` is the hub — **43 of the 76 foreign keys point at it**. `profiles.id` is also the FK to
InsForge `auth.users`; only `activity.user_id` references `auth.users` directly.

**Core chain**
```
auth.users ──1:1── profiles ──1:1── candidate_profiles ──1:N── candidate_resumes
                      │                      │
                      │                      └──1:N── applications ──N:1── jobs ──N:1── companies
                      │                                    │                              │
                      │                                    ├──1:N── application_status_history
                      │                                    ├──1:N── application_events
                      │                                    └──1:N── resume_access_log
                      │
                      ├──1:N── company_members ──N:1── companies
                      ├──1:1── recruiter_profiles (legacy) ──N:1── companies
                      └──1:N── consent_records / user_sessions / notification_* / saved_jobs
```

**`applications` carries two FKs on the same column** — `candidate_id` references *both*
`candidate_profiles(id)` and `profiles(id)`, both `ON DELETE CASCADE`. Deleting a `profiles` row
therefore destroys applications through two independent paths. This is why the DPDP erasure plan
(`lib/dpdp/erasure.ts`) never deletes an identity row and clears columns instead.

**Referenced-by counts** (inbound FKs): `profiles` 43 · `companies` 7 · `jobs` 7 ·
`applications` 4 · `notification_jobs` 2 · `announcements` 2 · `candidate_resumes` 2 ·
`export_jobs` 1 · `notification_templates` 1 · `company_verification_requests` 1 · `auth.users` 1.

**Delete semantics:** 30 `CASCADE`, 25 `SET NULL`, 21 `NO ACTION`.

### 2.3 Triggers (all 37, all enabled)

| Table | Trigger | Function | When | Notes |
|---|---|---|---|---|
| applications | trigger_check_direct_application_status_update | check_direct_application_status_update | BEFORE UPDATE | Forces stage changes through the RPC |
| applications | trigger_log_application_status_change | log_application_status_change | AFTER INS/UPD | Writes `application_status_history` |
| applications | trigger_update_job_applications_count | update_job_applications_count | AFTER INS/DEL/UPD | Denormalised counter on `jobs` |
| applications | trigger_maintain_resume_upload_count | maintain_resume_upload_count | AFTER INS/DEL/UPD | Resume usage counter |
| applications | tr_apps_update / trigger_set_updated_at / update_applications_updated_at | 3 × updated-at | BEFORE UPDATE | **Triplicated — §9 HYG-2** |
| profiles | trg_guard_profile_cols | guard_profile_privileged_cols | BEFORE INS/UPD | **Blocks self-escalation of `role`** |
| profiles | trg_sync_admin_users / trg_sync_recruiter_users | sync_* | AFTER INS/DEL/UPD | Maintain denormalised lookup tables |
| profiles | trg_handle_password_change_invalidation | handle_password_change_invalidation | AFTER UPDATE | Session invalidation on password change |
| profiles | on_profile_created_prefs | handle_new_profile_prefs | AFTER INSERT | Seeds `notification_preferences` |
| profiles | trigger_sync_profile_strength | sync_profile_strength | AFTER INS/UPD | Profile completeness score |
| profiles | tr_profiles_update / trigger_set_updated_at / update_profiles_updated_at | 3 × updated-at | BEFORE UPDATE | **Triplicated — §9 HYG-2** |
| candidate_profiles | trigger_check_primary_resume_ownership | check_primary_resume_ownership | BEFORE INS/UPD | Prevents pointing at another user's resume |
| candidate_profiles | trigger_sync_profile_strength | sync_profile_strength | AFTER INS/UPD | |
| candidate_profiles | tr_candidate_update / trigger_set_updated_at / update_candidate_profiles_updated_at | 3 × updated-at | BEFORE UPDATE | **Triplicated** |
| candidate_resumes | trigger_check_max_resumes_limit | check_max_resumes_limit | BEFORE INSERT | Per-candidate resume cap |
| candidate_resumes | trigger_reassign_resume_references | reassign_resume_references | BEFORE DELETE | Repoints `applications.resume_id` |
| candidate_resumes | trigger_set_updated_at | set_current_timestamp_updated_at | BEFORE UPDATE | |
| jobs | trg_active_job_limit | enforce_active_job_limit | BEFORE INS/UPD | Plan entitlement cap |
| jobs | trg_jobs_sync_is_approved | jobs_sync_is_approved | BEFORE INS/UPD | Keeps `is_approved` ← `approval_status` |
| jobs | trigger_set_updated_at | set_current_timestamp_updated_at | BEFORE UPDATE | |
| companies | trigger_set_updated_at | set_current_timestamp_updated_at | BEFORE UPDATE | |
| company_members | trg_guard_last_company_admin | guard_last_company_admin | BEFORE DEL/UPD | Prevents orphaning a company |
| notification_jobs | notification_jobs_throttle_trigger | check_notification_throttle | BEFORE INSERT | Anti-spam |
| notifications | trigger_set_updated_at | set_current_timestamp_updated_at | BEFORE UPDATE | |
| announcement_views / announcement_dismissals | trg_sync_announcement_*_count | sync_* | AFTER INSERT | Denormalised counters |
| recruiter_profiles | tr_recruiter_update / trigger_set_updated_at / update_recruiter_profiles_updated_at | 3 × updated-at | BEFORE UPDATE | **Triplicated** |
| user_preferences | update_user_preferences_timestamp_trig | update_user_preferences_timestamp | BEFORE UPDATE | |

### 2.4 RLS policy patterns

165 policies across 65 tables. Five recurring shapes:

1. **`admin_bypass`** — `TO project_admin USING (true)`. Present on ~30 tables. `project_admin` is
   the InsForge service role, so this is the service-key escape hatch edge functions rely on.
2. **Self-ownership** — `user_id = (SELECT auth.uid())`. The `(SELECT …)` wrapper is deliberate: it
   makes the call an InitPlan evaluated once per query instead of once per row.
3. **Company scoping** — `authz.company_id_of(auth.uid())` / `authz.is_company_admin(...)`.
   The current, correct multi-tenant pattern.
4. **Legacy recruiter scoping** — joins `recruiter_profiles rp ON rp.company_id = j.company_id`.
   The superseded pattern, still live and still widening access (§9 **SEC-3**).
5. **Admin predicate** — `authz.is_admin()`, or an inline `EXISTS (SELECT 1 FROM profiles …)`.
   Both spellings are in use; the inline form re-queries `profiles` per policy.

**Notable individual policies**

- `jobs_no_direct_insert` — `WITH CHECK (false)`. Direct inserts are impossible; job creation must
  go through the `create_job()` RPC. Good design, and the reason §3 matters.
- `jobs_select_approved` — anon/public read is gated on `status='active' AND is_approved AND
  company.status='verified'`.
- `profiles_self_insert` — `WITH CHECK (id = auth.uid() AND role = 'candidate')`. A user can only
  ever self-insert as a candidate; escalation is additionally blocked by `guard_profile_privileged_cols`.
- `announcements` — the `public` SELECT policy checks only `is_active`, while the `authenticated`
  one also checks `scheduled_at`/`expires_at`. **Anonymous readers therefore see scheduled and
  expired announcements** (§9 SEC-6).

---

## 3. RPC Inventory

`pg_proc` holds 216 functions in `public`, but ~175 are extension-supplied (pgvector, pgcrypto,
uuid-ossp, http). The application-owned surface is below. `EXECUTE` column is the live ACL.

### 3.1 Callable RPCs (business logic)

| Function | Args | Returns | Security | EXECUTE | Purpose / callers |
|---|---|---|---|---|---|
| `create_job` | `p_payload jsonb` | `jobs` | DEFINER, `search_path` pinned | authenticated | **The only way to create a job** (`jobs_no_direct_insert` blocks direct writes). Called by `POST /api/jobs` ← recruiter post-job page. Enforces company scope + plan limit server-side. |
| `update_application_status` | `p_application_id, p_status, p_actor_id, p_actor_type, p_metadata` | `jsonb` | DEFINER, **no `search_path`** | **project_admin only** | Stage transitions. Reached via `update-application` edge fn, not directly from the browser. Paired with the `check_direct_application_status_update` trigger. |
| `accept_company_invite` | `p_company_id uuid` | `void` | DEFINER, pinned | authenticated | `POST /api/company/[companyId]/members/accept`. |
| `approve_company_verification` | `p_request_id, p_notes` | `void` | DEFINER, pinned | authenticated | Admin verification queue. **Relies on an internal admin check — see note below.** |
| `reject_company_verification` | `p_request_id, p_notes` | `void` | DEFINER, pinned | authenticated | Same. |
| `request_more_info_for_verification` | `p_request_id, p_notes` | `void` | DEFINER, pinned | authenticated | Same. |
| `set_default_resume` | `p_resume_id uuid` | `void` | INVOKER, `search_path=public` | authenticated | Candidate resume management. INVOKER + RLS on `candidate_resumes` is the guard. |
| `calculate_profile_strength_score` | `user_uuid uuid` | `integer` | INVOKER | authenticated | Profile completeness; also called by the `sync_profile_strength` trigger. |
| `is_admin` | — | `boolean` | DEFINER, pinned | authenticated | Legacy public-schema admin predicate. `authz.is_admin()` is the current one; both are live. |

> **Verification RPC caveat.** `approve_company_verification`, `reject_company_verification` and
> `request_more_info_for_verification` are all `SECURITY DEFINER` and granted to **`authenticated`**,
> not to admins only. Their safety depends entirely on an admin check *inside* the function body.
> That check was not verified as part of this inventory — **it must be confirmed before launch**
> (§9 **SEC-4**).

### 3.2 Service-role-only RPCs

Granted to `project_admin` exclusively; `anon` and `authenticated` both return false for
`has_function_privilege`. Verified live.

| Function | Purpose |
|---|---|
| `exec_sql(query text)` | Arbitrary SQL. DEFINER. **Correctly locked to `project_admin`.** |
| `query_json(query_text text)` | Arbitrary SELECT → jsonb. DEFINER, **no `search_path` pinned**. Locked to `project_admin`. |
| `claim_notification_job(worker_id, lease_duration)` | Leased dequeue for the notification worker. |
| `claim_export_job(job_id, worker_id)` | Export job claim. |
| `claim_cleanup_lock` / `release_cleanup_lock` | Cron mutex. |
| `log_cleanup_telemetry` | Cron telemetry. |
| `log_admin_action(...)` | Audit spine writer. `search_path=""` — the strictest setting present. |

### 3.3 `authz` schema — the authorization kernel

All `SECURITY DEFINER` with `search_path=public, pg_temp`. `anon` has **no USAGE** on this schema;
`authenticated` does. These are what the RLS policies in §2.4 call.

| Function | Args | Returns | Purpose |
|---|---|---|---|
| `authz.company_id_of` | `p_user uuid` | `uuid` | Active company for a user, from `company_members` |
| `authz.admin_company_id_of` | `p_user uuid` | `uuid` | Company where the user is an *admin* member |
| `authz.company_role` | `p_user, p_company` | `text` | `'admin'` / `'recruiter'` / null |
| `authz.is_company_admin` | `p_user, p_company` | `boolean` | Convenience wrapper |
| `authz.is_admin` | — | `boolean` | Platform admin predicate |
| `authz.is_recruiter` | — | `boolean` | **INVOKER, not DEFINER** — inconsistent with the rest of the schema |

### 3.4 Trigger functions

Not directly callable. `check_direct_application_status_update`, `check_max_resumes_limit`,
`check_notification_throttle`, `check_primary_resume_ownership`, `enforce_active_job_limit`,
`guard_last_company_admin`, `guard_profile_privileged_cols`, `handle_new_profile_prefs`,
`handle_new_user`, `handle_password_change_invalidation`, `jobs_sync_is_approved`,
`log_application_status_change`, `maintain_resume_upload_count`, `reassign_resume_references`,
`set_current_timestamp_updated_at`, `sync_admin_users`, `sync_announcement_dismiss_count`,
`sync_announcement_view_count`, `sync_profile_strength`, `sync_recruiter_users`,
`update_application_status`(also RPC), `update_job_applications_count`, `update_updated_at_column`,
`update_user_preferences_timestamp`.

**14 of these have no `search_path` pinned**, including the `SECURITY DEFINER` ones:
`handle_new_user`, `handle_password_change_invalidation`, `log_application_status_change`,
`maintain_resume_upload_count`, `reassign_resume_references`, `sync_profile_strength`,
`update_job_applications_count`, `update_application_status`, `query_json`. See §9 **SEC-7**.

---

## 4. Edge Function Inventory

All 54 are `active` on InsForge. **Invocation is by dynamic slug through
`/api/v1/remote/functions/<slug>`**, so the app contains no literal reference to most slugs and
static caller attribution is not possible — absence of a reference is *not* evidence a function is
dead. The exception is `activate-recruiter`, whose callers were deliberately removed (documented in
`app/(auth)/verify-recruiter/page.tsx`).

**Authentication pattern.** Every function creates the SDK with `isServerMode: true` and calls
`setAccessToken(token)` from the `Authorization` header. Omitting `isServerMode` makes
`getCurrentUser()` return null in ~0 ms — a known failure mode on this codebase.

### 4.1 Classification summary

| Verdict | Count | Which |
|---|--:|---|
| **Stays an Edge Function** | 49 | All DB-only functions below |
| **→ AI Microservice** | 3 | `ai-match`, `resume-parse`, `interview-generator` |
| **Delete** | 1 | `test-auth-pattern` |
| **Orphaned, decide** | 1 | `activate-recruiter` |

### 4.2 AI / external-API functions

| Function | Request | Response | Auth | DB? | External API | Verdict |
|---|---|---|---|---|---|---|
| `ai-match` | `{ jobId, candidateIds? }` | match scores | Bearer JWT | yes | **Anthropic** — `claude-sonnet-4-20250514` | **→ AI Microservice.** Latency and cost are unbounded per call; belongs behind a queue with its own scaling and retry policy. |
| `resume-parse` | resume ref / file | parsed structured resume | Bearer JWT | yes (writes `candidate_resumes`) | **Anthropic** — `claude-3.5-haiku` | **→ AI Microservice.** Long-running, retry-prone, and the natural owner of the parse pipeline. |
| `interview-generator` | `{ jobId }` | generated question set | Bearer JWT | yes (reads `jobs`) | **none today** | **→ AI Microservice** when wired. Currently only reads job details — the generation step is not implemented. Feature is paused pending the microservice decision. |
| `auth-signup` | signup payload | session/user | anon | yes | **Resend** (email) | Stays. Transactional email, not AI. |

### 4.3 Auth functions

| Function | Purpose | Auth | Notes |
|---|---|---|---|
| `auth-signup` | Create account, seed profile/consents | anon | Sends verification via Resend. **Role is always `candidate`** — the recruiter intent is not persisted here. |
| `auth-session` | Exchange/refresh session | Bearer | |
| `auth-verify` | Verify email code | anon | Email verification is **on**, method `code`. |
| `admin-auth-login` | Admin portal login | anon | Requires the service key; misconfiguration here 500s every call. |
| `admin-forgot-password` | Admin password reset | anon | Gated by `ADMIN_EMAILS`. |
| `mfa-status` | Read admin MFA state | Bearer | TOTP via `otpauth`. |
| `mfa-backup-codes` | Issue/consume backup codes | Bearer | |
| `profile-complete-onboarding` | Finalise onboarding | Bearer | |

### 4.4 Candidate functions
`candidate-dashboard`, `candidate-profile`, `candidate-applications`, `candidate-applications-id`,
`recommendations`, `upload-resume`, `resume-proxy`. All DB-only → **stay Edge Functions**.
`recommendations` is rule-based today, *not* AI — if it becomes embedding-based it moves.

### 4.5 Recruiter functions
`recruiter-dashboard`, `recruiter-profile`, `recruiter-request`, `recruiter-document-proxy`,
`activate-recruiter` (orphaned), `candidates`, `company-profile`, `jobs`, `jobs-id`,
`update-application`, `upload-logo`. All DB-only → **stay**.

### 4.6 Admin functions (17)
`admin-dashboard`, `admin-candidates`, `admin-recruiters`, `admin-recruiter`, `admin-companies`,
`admin-jobs`, `admin-applications`, `admin-audit`, `admin-audit-logs`, `admin-export`,
`admin-export-audit`, `admin-reports`, `admin-settings`, `admin-announcements`, `admin-billing`,
`admin-plans`, `admin-blogs`. All DB-only → **stay**.

### 4.7 Platform / content / cron
`dashboard`, `blogs`, `blogs-slug`, `upload-blog-image`, `notification-worker`,
`cleanup-stale-resources`, `cleanup-idempotency-keys`, `test-auth-pattern`.

- `notification-worker` — leased queue consumer via `claim_notification_job`. Stays.
- `cleanup-*` — cron, mutexed with `claim_cleanup_lock`. Stays.
- **`test-auth-pattern` — a test scaffold deployed to production. Delete.**

---

## 5. Storage Inventory

| Bucket | Public | Objects | Purpose | File types | Access path | Lifecycle |
|---|---|--:|---|---|---|---|
| `resumes` | **private** | 80 | Candidate CVs | PDF, DOC/DOCX | `resume-proxy` edge fn; access recorded in `resume_access_log` | Per-candidate cap enforced by `check_max_resumes_limit`; delete repoints refs via `reassign_resume_references` |
| `recruiter_documents` | **private** | 0 | Recruiter/company KYC docs | PDF, images | `recruiter-document-proxy` edge fn | Unused — manual verification happens over email instead |
| `application-snapshots` | **private** | 34 | Immutable point-in-time application copies | JSON/PDF | Server-side only | No expiry policy found |
| `avatars` | public | 25 | Profile pictures | PNG/JPG/WebP | Direct URL | No cleanup on user deletion |
| `company-logos` | public | 6 | Employer logos | PNG/JPG/SVG | `upload-logo` writes; direct URL reads | — |
| `blog_images_final` | public | 4 | CMS media | PNG/JPG/WebP | `upload-blog-image` | — |
| `announcement_images` | public | 2 | Admin announcement media | PNG/JPG | — | — |

Total ~19 MB. `storage_quarantine` exists for flagged uploads but holds 0 rows — the quarantine
path appears to be defined but not exercised.

> **Not verified in this pass:** per-object storage ACLs inside InsForge. The private buckets are
> mediated by proxy functions in the code path, but whether an object URL is *independently*
> authorized at the storage layer was not confirmed. This is flagged as **SEC-8** rather than
> asserted either way.

---

## 6. Authentication Inventory

### Live auth configuration (from InsForge)
- OAuth providers enabled: **google, linkedin, github** (github unused by the app)
- **Email verification required: yes**, method `code`
- **Password policy: min 12**, requires number + lowercase + uppercase + special
- Password reset: `code`
- SMTP: Resend, `noreply@mail.talentmeshsolutions.com`, 60 s minimum interval
- Signup disabled: no · Allowed redirect URLs: **empty**

`lib/validation/auth.ts` mirrors the 12-character policy exactly, and
`lib/validation/auth.password.test.ts` pins it — if the server policy changes, that test fails.

### Flows

| Flow | Route / function | Notes |
|---|---|---|
| **Login (user)** | `POST /api/auth/session` → `auth-session` | Sets the `tm_access_token` HttpOnly cookie |
| **Login (admin)** | `admin-auth-login` | Separate path; MFA-aware |
| **Signup** | `POST /api/auth/signup` → `auth-signup` | Writes `profiles` + `consent_records`; role always `candidate` |
| **Email verify** | `POST /api/auth/verify` → `auth-verify` | 6-digit code |
| **OAuth** | `POST /api/auth/oauth/exchange` | Google / LinkedIn code exchange |
| **MFA** | `POST /api/auth/mfa-complete`, `mfa-status`, `mfa-backup-codes` | TOTP (`otpauth`), admin-facing |
| **Refresh** | `POST /api/auth/refresh` | Refresh cookie scoped to `/api/auth` |
| **Logout** | `POST /api/auth/logout` | Clears cookie |
| **Sessions** | `GET/DELETE /api/auth/sessions`, `/sessions/current` | Backed by `user_sessions` (125 rows) |

### Cookies
| Cookie | Flags | Purpose |
|---|---|---|
| `tm_access_token` | HttpOnly, **parent-domain**, Secure | The session JWT. Parent-domain scope is what makes `jobs.`/`app.`/`admin.` share a login. |
| `tm_role` | readable | Portal routing hint for `proxy.ts` |
| refresh cookie | HttpOnly, path `/api/auth` | Rotation only |

> The SDK's browser-side `getCurrentUser()` **does not work** here — its token manager is in-memory
> and the refresh cookie is path-scoped. Client components must use `useAuth().user.id`.

### Role model
Two overlapping sources, which is the known ambiguity in this system:
- **`profiles.role`** — the decided source of truth: `candidate` | `recruiter` | `admin` | `super_admin`.
- **`admin_users` (8 rows) / `recruiter_users` (27 rows)** — denormalised lookup tables kept in sync
  by the `sync_admin_users` / `sync_recruiter_users` triggers on `profiles`.
- **`company_members.role`** — the *company-scoped* role (`admin` | `recruiter`), independent of the
  platform role and the one `authz.company_role()` reads.

Self-escalation is blocked at two layers: `profiles_self_insert` forces `role='candidate'`, and
`guard_profile_privileged_cols` (BEFORE INSERT/UPDATE) rejects privileged column changes.

### Permission model
`lib/permissions.ts` defines a `canPerform(role, resource, action)` matrix, enforced by
`withApi({ requiredPermission })` on **5** operations, with `allowedRoles` on **22**. The same
matrix is consulted by the edge-function preamble. Only 22 of 57 documented operations declare
roles — see §9 **GAP-1**.

### Company verification
`companies.status` (`pending` → `verified` / `rejected` / `deactivated`) drives job visibility:
`jobs_select_approved` requires `company.status='verified'`. Submissions land in
`company_verification_requests` (2 rows), decisions are made through the three verification RPCs
(§3.1), and every transition is written to `verification_audit_log` (7 rows).
Job approval is separately gated by `jobs.approval_status`, synced to `is_approved` by
`jobs_sync_is_approved`.

---

## 7. REST API Inventory

42 route handlers. The machine-generated contract lives at
[`docs/api/openapi.json`](api/openapi.json) — 42 paths / 57 operations — regenerate with
`npm run docs:openapi`. Roles below are read from the `withApi()` options that actually enforce them.

### Auth (10)
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/auth/signup` | anon | |
| POST | `/api/auth/verify` | anon | |
| POST | `/api/auth/session` | anon | Sets session cookie |
| POST | `/api/auth/refresh` | cookie | |
| POST | `/api/auth/logout` | cookie | |
| POST | `/api/auth/oauth/exchange` | anon | Google / LinkedIn |
| POST | `/api/auth/mfa-complete` | cookie | |
| GET/DELETE | `/api/auth/sessions` | cookie | |
| GET/DELETE | `/api/auth/sessions/current` | cookie | |
| ALL | `/api/auth/email/[...slug]` | anon | Email action catch-all |

### Jobs (5)
| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/api/jobs` | recruiter | `?scope=company` **required**; company scope applied explicitly *in addition to* RLS, because OR'd SELECT policies would otherwise leak other companies' approved jobs |
| POST | `/api/jobs` | recruiter | → `create_job()` RPC |
| GET/PATCH/DELETE | `/api/jobs/[jobId]` | recruiter | |
| POST | `/api/jobs/[jobId]/publish` | recruiter | |
| POST | `/api/jobs/[jobId]/close` | recruiter | |

### Applications (2)
| Method | Path | Roles |
|---|---|---|
| GET/POST | `/api/applications` | candidate / recruiter |
| PATCH | `/api/applications/[id]/status` | recruiter |

### Companies (6)
`GET/PATCH /api/company/[companyId]` · `GET /api/company/[companyId]/members` ·
`POST /api/company/[companyId]/members/invite` · `POST …/members/accept` ·
`PATCH/DELETE …/members/[userId]` · `POST /api/company/verification/submit`

### Recruiters (2)
`POST /api/recruiter/request-access` · `GET /api/recruiter/status`

### Admin (6)
`GET /api/admin/verification/queue` · `POST /api/admin/verification/decide` ·
`GET /api/admin/dpdp/queue` · `POST /api/admin/dpdp/decide` ·
`POST /api/admin/forgot-password` · `POST /api/admin/send-proposal`

### Consent & DPDP (4)
`GET/POST /api/consent` · `POST /api/consent/withdraw` · `GET /api/dpdp/export` ·
`GET/POST /api/dpdp/requests`

### Newsletter (4)
`POST /api/newsletter/subscribe` · `GET /api/newsletter/confirm` ·
`POST /api/newsletter/resend-confirmation` · `GET /api/newsletter/unsubscribe`

### Interviews (1)
`POST /api/interview/room` — creates a **Daily.co** room + meeting token
(`api.daily.co/v1/rooms`, `/v1/meeting-tokens`). Contains a `talentmesh.daily.co/mock-room-`
fallback. **No frontend caller** — consistent with interviews being paused.

### Platform (2)
`POST /api/email/send` · `ALL /api/storage/[...path]`

### Catch-all proxy (1)
`ALL /api/v1/remote/[...path]` — §1 and §9 **SEC-1**.

**Notes.** 25 of 57 operations use `withApi()` (roles + Zod schemas derived). The other 32 are raw
handlers whose request bodies are not declared anywhere machine-readable; they are marked
`x-undocumented-body` in the OpenAPI file rather than guessed at.

---

## 8. Frontend Usage

### React Query adoption is minimal
The entire registry (`lib/queries/queryKeys.ts`):

```ts
export const queryKeys = {
  dashboard:        (roleId: string) => ['candidate-dashboard', roleId],
  applications:     (roleId: string) => ['candidate-applications', roleId],
  recommendations:  (roleId: string) => ['candidate-recommendations', roleId],
  adminDashboardSummary: ['admin-dashboard-summary'] as const,
};
```

**Four keys. Five files** use `useQuery`/`useMutation`. Everything else in the app fetches with bare
`fetch` inside `useEffect` — no caching, no dedupe, no invalidation.

| Query key | Hook | Endpoint | Consumed by |
|---|---|---|---|
| `['candidate-dashboard', roleId]` | `lib/queries/dashboard.ts` | `candidate-dashboard` edge fn | `app/dashboard/candidate/[role_id]/page.tsx` |
| `['candidate-applications', roleId]` | `lib/queries/applications.ts` | `candidate-applications` edge fn | `app/dashboard/candidate/[role_id]/applications/page.tsx` |
| `['candidate-recommendations', roleId]` | `lib/queries/recommendations.ts` | `recommendations` edge fn | candidate dashboard |
| `['admin-dashboard-summary']` | `lib/queries/useAdminDashboardSummary.ts` | `admin-dashboard` edge fn | `app/dashboard/admin/page.tsx` |

The applications hook invalidates both `applications(roleId)` and `dashboard(roleId)` on mutation —
the only cache-coherence logic in the app. The admin key is deliberately **not** user-scoped, with a
comment noting a user-agnostic key would survive into the next login; it is invalidated explicitly
instead.

### Other hooks (not React Query)
`lib/hooks/`: `useAdminAnnouncements`, `useAdminApplicationStage`, `useAdminSettings`,
`useAutocomplete`, `useMessages`, `useRealTimeNotifications`, `useRequireAuth`, `useClickOutside`.
`hooks/`: `useNetworkState`, `useProgressiveLoader`, `useSavedJobs`, `useSelection`,
`useSessionRefresh`.

### Endpoint → caller map (REST)

| Endpoint | Called from |
|---|---|
| `/api/jobs`, `/api/jobs/[jobId]` | `app/dashboard/recruiter/[role_id]/jobs/page.tsx`, `.../jobs/new`, `.../jobs/[job_id]` |
| `/api/jobs/[jobId]/publish`, `/close` | `app/dashboard/recruiter/[role_id]/jobs/page.tsx:110`, `:95` |
| `/api/applications/[id]/status` | `app/dashboard/recruiter/[role_id]/jobs/[job_id]/page.tsx:87` |
| `/api/applications` | candidate applications page; recruiter pipeline |
| `/api/company/[companyId]/members/*` | `app/dashboard/admin/companies/[id]/page.tsx:180,208,239` |
| `/api/auth/*` | `lib/auth/AuthContext.tsx`, `app/(auth)/*` |
| `/api/consent`, `/api/consent/withdraw` | candidate settings / privacy pages |
| `/api/dpdp/*` | candidate privacy page; `app/dashboard/admin/dpdp` |
| `/api/recruiter/request-access`, `/status` | `app/signup/recruiter`, onboarding |
| `/api/newsletter/subscribe`, `/resend-confirmation` | marketing footer |
| `/api/v1/remote/[...path]` | **everything** — all SDK/PostgREST traffic |

**Six routes have no frontend caller:** `/api/auth/sessions`, `/api/auth/sessions/current`,
`/api/company/verification/submit`, `/api/interview/room`, `/api/newsletter/confirm`,
`/api/newsletter/unsubscribe`. The last two are email-link landings (expected). The session routes
imply a session-management UI that was specced but never built. `/api/interview/room` is the paused
interview feature.

> **Method note.** Edge functions are invoked by *dynamic slug* through the catch-all proxy, so a
> per-function caller map cannot be produced by static analysis. Any table claiming otherwise would
> be fabricated. The REST map above is regex-derived from route shape and hand-verified.

---

## 9. Security Audit

Ordered by severity. Every item cites the evidence it rests on.

### SEC-1 — Catch-all proxy substitutes the service-role key for anonymous GETs · **CRITICAL**

`app/api/v1/remote/[...path]/route.ts:129-146`

```ts
const isPublicGet = request.method === 'GET' && (
  rawPath.includes('/api/database/records/blog') ||
  rawPath.includes('/api/database/records/jobs')
);
...
if (token === ANON_KEY && isPublicGet && process.env.INSFORGE_SERVICE_KEY) {
  headers.set('authorization', `Bearer ${process.env.INSFORGE_SERVICE_KEY}`);
}
```

An **unauthenticated** GET whose path merely *contains* that substring is upgraded to the
service-role key. `project_admin` has `admin_bypass USING (true)` on ~30 tables, so **RLS is not
applied to that request**. Concretely, `jobs` is meant to be anon-visible only when
`status='active' AND is_approved AND company.status='verified'` (`jobs_select_approved`); under the
service key, drafts, unapproved and unverified-company jobs are all readable.

Compounding factors:
- `includes()` is a substring test, not a prefix or equality test.
- The proxy has **no path allowlist** — `targetUrl` is `${INSFORGE_URL}${rawPath}` for anything.
- If PostgREST resource embedding is enabled upstream, `?select=*,applications(*)` on an embedded
  path would traverse into candidate data under the same service-role privilege.

**Not verified:** whether the upstream honours embedding, and whether `x-insforge-service-key`
(set on *every* proxied request, line 105) independently elevates. Both must be tested — I did not
probe production.

**Fix direction:** exact-match the two intended read paths, drop the service-key substitution in
favour of an RLS policy that already expresses the intent, and add a path allowlist to the proxy.

### SEC-2 — `http` extension is executable by `anon` · **HIGH**

Verified live: `has_function_privilege('anon','http_get(character varying)','EXECUTE')` → **true**,
and `anon` has USAGE on `public`. The whole `http_*` family carries `=X/postgres` (PUBLIC EXECUTE).

If PostgREST exposes `public` for RPC, `POST /rpc/http_get` is **server-side request forgery from
inside the database**, available unauthenticated — reachable through the SEC-1 proxy, which forwards
arbitrary paths. Cloud metadata endpoints and internal services are the usual targets.

**Fix direction:** `REVOKE ALL ON FUNCTION http_get(...) FROM PUBLIC;` across the family, or move
the extension to a schema PostgREST does not expose. If nothing uses `http`, drop the extension.

### SEC-3 — Legacy recruiter RLS policies widen access · **HIGH**

`applications` carries both generations of policy simultaneously. SELECT policies are **OR'd**:

- new: `apps_company_view` — `j.company_id = authz.company_id_of(auth.uid())`
- legacy: `Recruiters can view job applications` — `JOIN recruiter_profiles rp ON rp.company_id = j.company_id`

The legacy policy grants on the strength of a `recruiter_profiles` row, a table that is superseded
and only partially populated (5 rows vs 27 in `recruiter_users`). Worse on UPDATE:

- new: `apps_company_update` — additionally requires `authz.company_role(...) IN ('admin','recruiter')`
- legacy: `Recruiters can update application status` — **no role check at all**

Anyone with a `recruiter_profiles` row whose `company_id` matches can update applications
regardless of company role. The same legacy shape appears on `candidate_profiles`,
`candidate_resumes` and `profiles` (`*_recruiter_select`, keyed on `j.recruiter_id`).

**Fix direction:** drop the legacy policies once `recruiter_profiles` is confirmed unused.

### SEC-4 — Verification RPCs are granted to `authenticated` · **LOW — likely mitigated**

> **Downgraded from HIGH after reading the function sources.** Recorded in full because the
> reasoning matters more than the verdict.

`approve_company_verification`, `reject_company_verification` and
`request_more_info_for_verification` are `SECURITY DEFINER` and executable by **any authenticated
user** (live ACL: `authenticated=X/project_admin`). That grant on its own would let any logged-in
user verify their own company, which unlocks public job visibility via `jobs_select_approved`.

**They are guarded in the body.** All three open with the same first statement, in
`insforge/migrations/049_repoint_ownership_and_rpcs.sql` and `051_verification_and_member_rpcs.sql`:

```sql
IF NOT authz.is_admin() THEN RAISE EXCEPTION 'admin only'; END IF;
```

`authz.is_admin()` is itself `SECURITY DEFINER` with `search_path=public, pg_temp`, so the check is
sound. Migration `052` references these functions but does not redefine them. This is the legitimate
"grant broadly, authorize inside" pattern, not a hole.

**Residual risk, and why this is not closed outright:** the bodies were read from **migration
source, not from the live database**, and this project has known live-vs-migration drift. The *grant*
was confirmed live; the *body* was not.

**Remaining action (one query, not a redesign):** confirm the live body still contains the guard —
`SELECT prosrc FROM pg_proc WHERE proname = 'approve_company_verification'`. Preferring
`GRANT ... TO project_admin` over an in-body check would remove the need to trust drift, but that is
hardening, not a fix.

### SEC-5 — `saved_candidates` is unreachable · **MEDIUM**

RLS **enabled and FORCED**, **zero policies**, 0 rows. That is deny-all for every role except the
service role. "Saved candidates" is listed as a working V1 capability. Either the feature only ever
worked through a service-role edge function, or it has never worked. The 0 row count suggests the
latter.

Same pattern (RLS on, zero policies) on `admin_invites`, `admin_permissions`, `ai_suggestion_cache`,
`auth_attempts`, `newsletter_rate_limits`, `newsletter_subscribers`, `test_rpc_sync`, `debug_output`.
For the queue/throttle tables this is intentional and correct; for `saved_candidates` it is not.

### SEC-6 — Anonymous users see unpublished announcements · **LOW**

`announcements` has two SELECT policies. The `authenticated` one checks
`scheduled_at <= now() AND expires_at > now()`; the `public` one checks only `is_active = true`.
Anonymous readers therefore see scheduled-but-unpublished and expired announcements.

### SEC-7 — `SECURITY DEFINER` functions without a pinned `search_path` · **MEDIUM**

14 functions lack `search_path`, including these `DEFINER` ones: `handle_new_user`,
`handle_password_change_invalidation`, `log_application_status_change`,
`maintain_resume_upload_count`, `reassign_resume_references`, `sync_profile_strength`,
`update_job_applications_count`, `update_application_status`, `query_json`.

A `DEFINER` function without a pinned `search_path` is the classic privilege-escalation vector: a
caller who can create objects in a schema earlier on the path can shadow a referenced function or
table. The rest of the codebase does this correctly (`search_path=public, pg_temp`, and
`log_admin_action` uses `search_path=""`), so this is an inconsistency, not a house style.

### SEC-8 — Storage per-object authorization unverified · **MEDIUM (unverified)**

Private buckets (`resumes`, `recruiter_documents`, `application-snapshots`) are mediated by
`resume-proxy` / `recruiter-document-proxy` in the code path. Whether an object URL obtained by
other means is *independently* authorized at the InsForge storage layer was **not confirmed**. If it
is not, resume URL disclosure equals resume access. Worth a direct test.

### Race conditions

| # | Where | Risk |
|---|---|---|
| RACE-1 | `enforce_active_job_limit` (BEFORE INSERT/UPDATE on `jobs`) | Check-then-insert against `plan_limits`. Two concurrent publishes can both pass. Needs a unique/exclusion constraint or `SELECT … FOR UPDATE` on the company row. |
| RACE-2 | `check_max_resumes_limit` (BEFORE INSERT on `candidate_resumes`) | Same shape — concurrent uploads can exceed the cap. |
| RACE-3 | `/api/v1/remote` rate limiter | `Map` in module scope with a `setInterval` sweep. **Per-instance, in-memory** — resets on cold start and does not hold across Vercel lambdas. Effectively no rate limiting in production. |
| RACE-4 | `guard_last_company_admin` | Two concurrent demotions of the last two admins could both see a sibling and both succeed. |
| RACE-5 | Denormalised counters (`update_job_applications_count`, `maintain_resume_upload_count`, announcement counters) | AFTER-trigger read-modify-write; concurrent writes can drift. Non-security. |

`claim_notification_job`, `claim_export_job` and `claim_cleanup_lock` are the correctly-implemented
counter-examples — leased claims, not check-then-act.

### Missing indexes

Six unindexed foreign keys (every FK is otherwise covered):

| Table | Column | References | Impact |
|---|---|---|---|
| `companies` | `verified_by` | profiles | Low — small table |
| `company_members` | `invited_by` | profiles | Low |
| `company_verification_requests` | `submitted_by` | profiles | Low |
| `company_verification_requests` | `reviewer_id` | profiles | Low |
| `data_principal_requests` | `handled_by` | profiles | **Will matter** — DPDP queue filters by handler |
| `verification_audit_log` | `request_id` | company_verification_requests | **Will matter** — audit lookups by request |

All are currently tiny tables, so nothing is slow *today*. Note also that an unindexed FK makes
`ON DELETE`/`SET NULL` cascades from `profiles` do a sequential scan per deleted row.

### Missing validation

- **32 of 57 API operations do not use `withApi()`** and therefore have no declared Zod schema:
  all of `auth/*`, `consent/*`, `newsletter/*`, `email/send`, `interview/room`, `storage/[...path]`,
  `v1/remote/[...path]`. Bodies are parsed ad hoc.
- No `CHECK` constraint on `salary_min <= salary_max` in `jobs` (Zod enforces it only on the
  `withApi` path; `create_job` takes raw `jsonb`).
- `create_job(p_payload jsonb)` takes an untyped payload — validation lives inside the function body
  and is not expressed in the signature.

### Permission gaps

- **GAP-1** — only 22 of 57 operations declare `allowedRoles`, and only 5 declare
  `requiredPermission`. The `canPerform()` matrix in `lib/permissions.ts` is far more expressive
  than its actual deployment.
- **GAP-2** — two live admin predicates, `public.is_admin()` and `authz.is_admin()`, plus a third
  inline spelling `EXISTS (SELECT 1 FROM profiles WHERE role IN ('admin','super_admin'))` used by
  the `notification_*` policies. Three sources of one truth.
- **GAP-3** — `authz.is_recruiter()` is `SECURITY INVOKER` while every sibling in `authz` is
  `DEFINER`. Under RLS it will see only rows the caller can already see, so it can return a
  different answer than its siblings.
- **GAP-4** — `admin_permissions` (granular grants) has 0 rows and no RLS policies; the
  fine-grained admin permission model is designed but not in service.

### Hygiene

- **HYG-1** — `debug_output` (3 rows, 1 column, **no primary key, no indexes**) and `test_rpc_sync`
  (test artifact) are both live in production. `test-auth-pattern` is a deployed test edge function.
- **HYG-2** — redundant `updated_at` triggers: `applications`, `profiles`, `candidate_profiles` and
  `recruiter_profiles` each fire **three** functionally identical BEFORE UPDATE triggers
  (`tr_*_update`, `trigger_set_updated_at`, `update_*_updated_at`). Three times the trigger overhead
  on every write to the hottest tables.
- **HYG-3** — duplicate policies on `applications`: three identical INSERT policies
  (`Candidates can insert applications`, `applications_insert_candidate`, `apps_insert_own`) and
  three identical self-SELECT policies. 13 policies where ~6 would do; every one is evaluated per query.

---

## 10. Missing APIs

Listed, not implemented.

### Blocking a documented capability
1. **`GET /api/candidates/saved` + `POST`/`DELETE`** — `saved_candidates` has no reachable API and no
   RLS policies (SEC-5).
2. **`GET /api/company/[id]/verification/status`** — recruiters can submit verification but cannot
   poll their own decision state.
3. **Session-management UI endpoints** — `/api/auth/sessions` exists with no caller; the revoke-
   other-devices flow is unbuilt.

### Operational gaps
4. **`GET /api/health` / readiness probe** — none exists anywhere.
5. **Notification worker trigger/status endpoint** — the queue is only drained by cron; no way to
   observe depth or force a drain.
6. **`GET /api/admin/audit/export`** — `admin-export-audit` exists as an edge function with no REST
   surface.
7. **Storage quarantine review API** — `storage_quarantine` has policies and no endpoints.

### Product gaps
8. **`GET /api/jobs/public`** — public job board reads currently go through the catch-all proxy
   straight to PostgREST, which is exactly what makes SEC-1 dangerous. A first-class, RLS-respecting
   public endpoint would let the service-key substitution be deleted.
9. **`POST /api/applications/[id]/notes`** — `recruiter_candidate_notes` has RLS and no API.
10. **`GET /api/candidates/[id]/resume`** — resume access goes through the edge proxy only; no REST
    equivalent, so `resume_access_log` is only written on one path.
11. **Job alerts CRUD** — `job_alerts` table exists, no endpoints.
12. **Company member self-service leave** — only admins can remove members.

### AI (deferred to microservices — listed for completeness, not to build now)
13. `POST /ai/match` — currently `ai-match` edge function
14. `POST /ai/resume/parse` — currently `resume-parse` edge function
15. `POST /ai/interview/generate` — currently `interview-generator`, generation step unimplemented
16. `GET /ai/jobs/{id}` — no async job-status endpoint exists for any AI workload, which is the
    prerequisite for moving them off the request path

---

## 11. API Classification

| Class | Count | Members |
|---|--:|---|
| **Database CRUD** (PostgREST via proxy) | — | All `/api/database/records/*` traffic: `jobs`, `applications`, `candidate_profiles`, `candidate_resumes`, `companies`, `company_members`, `notifications`, `saved_jobs`, `consent_records`, `blog`, `subscription_plans`, `plan_limits`, `user_preferences`, `user_sessions`, `announcements` |
| **RPC** | 9 callable + 7 service-only + 6 `authz` | §3 |
| **Edge Function** | 49 | §4.3–4.7 |
| **Future AI Microservice** | 3 | `ai-match`, `resume-parse`, `interview-generator` |
| **Delete** | 1 | `test-auth-pattern` |

### Where AI currently lives
| Component | Today | External dep | Move? |
|---|---|---|---|
| `ai-match` edge fn | Deno, synchronous | Anthropic `claude-sonnet-4-20250514` | **Yes** |
| `resume-parse` edge fn | Deno, synchronous | Anthropic `claude-3.5-haiku` | **Yes** |
| `interview-generator` edge fn | Deno, DB-read only | none yet | **Yes**, when implemented |
| `ai_interviews`, `live_ai_interviews` tables | 0 rows, RLS forced | — | Schema stays; owner becomes the microservice |
| `ai_suggestion_cache` table | 0 rows, no policies | — | Unwired; `lib/api/aiSuggest.ts` has no consumer |
| `applications.ai_match_rate` | Populated with a constant | — | Not a real score. **Do not surface as one.** |
| `recommendations` edge fn | Rule-based, not AI | — | Stays, unless it becomes embedding-based |
| `pgvector` extension | Installed | — | No vector column exists yet |

The migration prerequisite is #16 above: none of the three AI paths is asynchronous today, so
moving them without an async job-status contract just relocates the latency.

---

## 12. Method, and what was not verified

**Verified live against production PostgreSQL** (read-only catalogue queries, 2026-08-05): table
list, row counts, columns, primary keys, all 76 foreign keys with delete rules, all 165 RLS policies
with predicates, all 37 triggers, function signatures with `SECURITY`/`search_path`/ACLs, schema and
function-level privileges for `anon` and `authenticated`, unindexed foreign keys, storage buckets.

**Verified by reading source:** the proxy, `withApi()`, route handlers, validation schemas, React
Query registry, edge-function auth pattern, external API usage.

**Explicitly NOT verified — do not treat these as cleared:**
1. **Bodies of the three verification RPCs** (SEC-4). Highest-value follow-up in this document.
2. **Whether PostgREST resource embedding is enabled** upstream, which sets the blast radius of SEC-1.
3. **Whether `x-insforge-service-key` independently elevates** at the InsForge gateway.
4. **Per-object storage authorization** on private buckets (SEC-8).
5. **Edge function source drift** — deployed functions are known to diverge from local `.ts`. This
   inventory used local sources plus the live function list; individual bodies were not diffed.
6. **Runtime behaviour of any endpoint.** No request was made against production beyond read-only
   SQL catalogue queries. Nothing in §9 was exploited to confirm it.

---

## Appendix A — Complete foreign-key map (76)

Read as: `table.column → referenced_table.column [ON DELETE]`. This is the full relationship set
backing §2.2; every row was read from `pg_constraint` on the live database.

| Table | Column(s) | → References | ON DELETE |
|---|---|---|---|
| activity | user_id | auth.users.id | CASCADE |
| admin_invites | used_by | profiles.id | NO ACTION |
| admin_permissions | admin_id | profiles.id | CASCADE |
| admin_permissions | granted_by | profiles.id | NO ACTION |
| ai_interviews | candidate_id | profiles.id | NO ACTION |
| announcement_dismissals | announcement_id | announcements.id | CASCADE |
| announcement_views | announcement_id | announcements.id | CASCADE |
| application_events | application_id | applications.id | NO ACTION |
| application_status_history | application_id | applications.id | CASCADE |
| application_status_history | changed_by | profiles.id | SET NULL |
| **applications** | **candidate_id** | **candidate_profiles.id** | **CASCADE** |
| **applications** | **candidate_id** | **profiles.id** | **CASCADE** |
| applications | job_id | jobs.id | NO ACTION |
| applications | resume_id | candidate_resumes.id | SET NULL |
| audit_log | actor_id | profiles.id | SET NULL |
| authorization_events | company_id | companies.id | SET NULL |
| authorization_events | user_id | profiles.id | SET NULL |
| blog | author_id | profiles.id | SET NULL |
| candidate_profiles | id | profiles.id | CASCADE |
| candidate_profiles | primary_resume_id | candidate_resumes.id | SET NULL |
| candidate_resumes | candidate_id | profiles.id | CASCADE |
| companies | created_by | profiles.id | SET NULL |
| companies | verified_by | profiles.id | SET NULL |
| company_members | company_id | companies.id | CASCADE |
| company_members | invited_by | profiles.id | SET NULL |
| company_members | user_id | profiles.id | CASCADE |
| company_verification_requests | company_id | companies.id | CASCADE |
| company_verification_requests | reviewer_id | profiles.id | SET NULL |
| company_verification_requests | submitted_by | profiles.id | SET NULL |
| consent_records | user_id | profiles.id | SET NULL |
| custom_proposals | recruiter_id | profiles.id | NO ACTION |
| data_principal_requests | handled_by | profiles.id | SET NULL |
| data_principal_requests | user_id | profiles.id | SET NULL |
| export_candidates | candidate_id | profiles.id | CASCADE |
| export_candidates | job_id | export_jobs.id | CASCADE |
| export_jobs | user_id | profiles.id | CASCADE |
| interviews | application_id | applications.id | NO ACTION |
| interviews | candidate_id | profiles.id | CASCADE |
| interviews | job_id | jobs.id | SET NULL |
| interviews | recruiter_id | profiles.id | CASCADE |
| job_alerts | candidate_id | profiles.id | NO ACTION |
| jobs | company_id | companies.id | CASCADE |
| jobs | recruiter_id | profiles.id | SET NULL |
| live_ai_interviews | candidate_id | profiles.id | NO ACTION |
| messages | job_id | jobs.id | NO ACTION |
| notification_events | job_id | notification_jobs.id | CASCADE |
| notification_jobs | template_id | notification_templates.id | SET NULL |
| notification_jobs | user_id | profiles.id | CASCADE |
| notification_preferences | user_id | profiles.id | CASCADE |
| notification_receipts | notification_job_id | notification_jobs.id | CASCADE |
| notification_receipts | user_id | profiles.id | CASCADE |
| nvites | candidate_id | profiles.id | CASCADE |
| nvites | job_id | jobs.id | SET NULL |
| nvites | recruiter_id | profiles.id | CASCADE |
| offers | candidate_id | profiles.id | CASCADE |
| offers | job_id | jobs.id | SET NULL |
| offers | recruiter_id | profiles.id | CASCADE |
| profiles | invited_by | profiles.id (self) | NO ACTION |
| recruiter_candidate_notes | candidate_id | profiles.id | CASCADE |
| recruiter_candidate_notes | recruiter_id | profiles.id | CASCADE |
| recruiter_profiles | company_id | companies.id | NO ACTION |
| resume_access_log | application_id | applications.id | SET NULL |
| resume_access_log | candidate_id | profiles.id | CASCADE |
| resume_access_log | recruiter_id | profiles.id | SET NULL |
| saved_candidates | candidate_id | profiles.id | CASCADE |
| saved_candidates | recruiter_id | profiles.id | CASCADE |
| saved_jobs | job_id | jobs.id | NO ACTION |
| subscription_events | recruiter_id | profiles.id | NO ACTION |
| subscriptions | company_id | companies.id | CASCADE |
| user_preferences | user_id | profiles.id | CASCADE |
| user_rate_limits | user_id | profiles.id | CASCADE |
| user_sessions | impersonated_by | profiles.id | SET NULL |
| user_sessions | user_id | profiles.id | CASCADE |
| verification_audit_log | actor_id | profiles.id | SET NULL |
| verification_audit_log | company_id | companies.id | SET NULL |
| verification_audit_log | request_id | company_verification_requests.id | SET NULL |

### Tables with no FK in either direction
`auth_attempts`, `cleanup_job_runs`, `debug_output`, `idempotency_keys`, `newsletter_rate_limits`,
`newsletter_subscribers`, `plan_limits`, `platform_settings`, `storage_quarantine`,
`subscription_plans`, `test_rpc_sync`, `user_auth_state`, `admin_users`, `recruiter_users`.

Most are standalone config, throttle or queue tables — expected. `admin_users`, `recruiter_users`
and `user_auth_state` are keyed by `user_id` **without** a declared FK to `profiles`, so nothing at
the database level prevents an orphaned row if a profile is deleted; they rely on the
`sync_admin_users` / `sync_recruiter_users` triggers staying correct.

---

## Appendix B — Tables with RLS enabled and zero policies

RLS on with no policy means **deny-all** for every role except the service role
(`project_admin`), which reaches them through `admin_bypass` policies elsewhere or by bypassing RLS.

| Table | Rows | Forced | Intentional? |
|---|--:|---|---|
| `auth_attempts` | 0 | no | **Yes** — service-role throttle store |
| `newsletter_rate_limits` | 1 | yes | **Yes** — service-role throttle store |
| `newsletter_subscribers` | 3 | yes | **Yes** — written only by the newsletter endpoints |
| `admin_invites` | 0 | no | **Yes** — admin bootstrap, service-role only |
| `admin_permissions` | 0 | no | Probably — but the granular permission model is unbuilt (GAP-4) |
| `ai_suggestion_cache` | 0 | yes | Moot — feature unwired |
| `saved_candidates` | 0 | **yes** | **No — SEC-5.** A V1 capability with no reachable API |
| `debug_output` | 3 | yes | **No — HYG-1.** Should not exist in production |
| `test_rpc_sync` | 0 | yes | **No — HYG-1.** Test artifact |
