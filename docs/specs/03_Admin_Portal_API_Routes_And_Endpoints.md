# 03 — Admin Portal API Routes & Endpoints

**Status:** Draft for review
**Owner:** Backend
**Version:** 1.0 — 2026-07-18
**Cross-refs:** `14_Admin_Portal_Rebuild_Architecture.md` §7 (contracts repeated here where changed), `01_Admin_Portal_Auth_Security_Audit_Report.md` (findings), `02_Admin_Portal_Schema_And_Database_Design.md` (tables/RPCs), `04_Admin_Portal_State_Machines_And_Business_Logic.md` (transitions each endpoint triggers).

Conventions for **every** endpoint below:

- Next.js routes wrap `withApi({ schema, allowedRoles, requiredPermission, auditLog })` — never hand-rolled (the hand-rolled `/api/impersonate` was where the bugs were).
- Edge functions start with `requireStaff(req, perm)` from `_shared/adminAuth.ts` (R-2) and use `_shared/{cors,query,idempotency,errors}.ts`.
- Error shape everywhere: `{ error: string, code: string, fieldErrors? }`. No stack traces outside development.
- Every mutation writes `audit_log`; staff interventions additionally carry `on_behalf_of` + `reason` (min 10 chars).
- All list endpoints: `page` (0-based), `limit` capped at 100, escaped `search`.

---

## 1. Inventory — what exists → what it becomes

| Current | Disposition |
|---|---|
| `admin-recruiters` (722 LOC, 8 actions) | **Rewritten** — directory + membership actions + reset links; `approve-setup`/`verify-otp`/`update-password`/`send-credentials` **deleted** (AD-5) |
| `admin-recruiter` (access_requests) | **Deleted** (D-22; single intake = verification queue) |
| `admin-settings` | Rewritten: plain `.update()` (AD-8), `audit_log`, OTP invite endpoints replace `add_admin`-with-password |
| `admin-jobs` / `admin-applications` / `admin-candidates` / `admin-companies` / `admin-announcements` / `admin-blogs` / `admin-audit-logs` / `admin-dashboard` / `admin-reports` / `admin-export-audit` | Kept, moved onto the R-2 kit; deltas in §3 |
| `admin-audit` | **Deleted** (read the merged `audit_log` via `admin-audit-logs`) |
| `admin-auth-login` | **Deleted** if the live check (01 §3.5) confirms no caller |
| `admin-forgot-password` | Kept; fronted by the new Next route (§6) |
| `/api/impersonate` | **Deleted** (§5.4 — decision 2) |
| `/api/admin/verification/queue`, `/api/admin/verification/decide` | **Kept as-is** — reference pattern |
| `/api/admin/send-proposal` | Kept; `price: z.number().nonnegative()`, insert failure → 500 (D-23/D-24) |
| New | `admin-plans`, `admin-billing`, `admin-export`, `admin-search`, OTP/invite/email-change endpoints, `/api/admin/forgot-password` |
| Impersonation (route, mock page, banner, 3 cookie readers) | **Deleted** — not rebuilt (decision 2) |

## 2. Permission map (enforced, R-4)

| Endpoint (mutating) | resource.action | Minimum role |
|---|---|---|
| jobs approve/reject/edit/delete | `jobs.approve` / `jobs.edit` / `jobs.delete` | admin |
| applications stage-change | `applications.edit` | admin |
| candidates edit / delete / export | `candidates.edit` / **super_admin: delete** / `candidates.export` | admin / super_admin / admin |
| companies edit / lifecycle / register | `companies.edit` / `companies.approve` | admin |
| verification decide | `verification.approve` | admin |
| recruiters membership actions / reset link | `recruiters.edit` | admin |
| announcements draft / **publish** | `content.edit` / `content.approve` | content / admin |
| blogs, email-templates | `content.edit` | content |
| plans / billing writes | `plans.edit` | super_admin (finance later) |
| settings, team, staff invite, role change | `settings.edit` / `team.edit` | super_admin |
| email change (self) | — (self-service, OTP-gated) | any staff |

## 3. Kept edge functions — required deltas

- **`admin-jobs`**: `capLimit` (D-17); PATCH/bulk-update allowlist `['title','description','requirements','location','salary_min','salary_max','experience','department','skills','status']` (D-16); writes `approval_status` not `is_approved` (054); DELETE + `bulk-delete` write `audit_log` (D-3); new `get-detail` (doc 14 §7 `CompanyDetail`-style job payload).
- **`admin-applications`**: staff stage-change requires `reason`; emits company notification (`notification_jobs` insert); single id source (body), not three (doc 13 §5.8).
- **`admin-candidates`**: onto kit; deletes audited; export actions move to `admin-export`.
- **`admin-companies`**: v2 per doc 14 R-6 — `get-detail`, GSTIN-keyed create (`companyCreateSchema`, doc 14 §7) with `409 gstin_conflict`, PATCH allowlist (never `gstin`/`cin`/`status`), lifecycle actions `suspend`/`reinstate`/`deactivate` each writing its doc-04 audit action.
- **`admin-announcements`**: fan-out → one `notification_jobs` row (D-14); publish gated `content.approve`.
- **`admin-dashboard` / `admin-reports`**: shared `_shared/metrics.ts`; per-metric `{value}|{error:true}` (D-15/D-21).
- **`admin-settings`**: PATCH → plain `.from('platform_settings').update(...)` (AD-8); only keys `feature_flags`, `maintenance` accepted (`z.enum`); role ops per §5; all audit → `audit_log`.

## 4. New edge functions

### `admin-plans` (super_admin)
`GET` list · `POST`/`PATCH ?id=` with `planSchema` (doc 14 §7 — INR paise integers, quota mins, popular-flag exclusivity enforced server-side) · `DELETE ?id=` → 409 `plan_in_use` if any active subscription references it.

### `admin-billing` (view: admin; export: super_admin)
`GET summary` (MRR by plan, INR paise), `GET subscriptions` (paginated). Read-only.

### `admin-export` (candidates + recruiters — replaces both browser blocks, D-19)
```ts
POST { action: 'start', entity: 'candidates'|'recruiters', filters: {...same as directory GET} }
  → 202 { jobId }        // claims via claim_export_job RPC; audit export_started {filters, actor}
POST { action: 'status', jobId }
  → { state: 'running'|'done'|'failed', progress: 0..1, downloadUrl? }  // audit export_completed {rows}
```

### `admin-search` (server-audited universal search, D-27)
`GET ?q=` → grouped `{candidates[], recruiters[], jobs[], companies[], applications[]}` (5 results/group); every call audits `admin_search {q}`. Client palette re-points here; the client-side 5-query page is deleted.

## 5. Staff lifecycle & OTP endpoints

Product requirements implemented here: staff addition and **email change are OTP-verified only**; the platform admin mailbox becomes `admin@talentmeshsolutions.com` (cutover runbook: doc 08 Phase 5). State machines: doc 04 §3.

### 5.1 Staff invite (replaces `add_admin`-with-password — AD-11)

```ts
// admin-settings POST { action: 'invite_staff' }   perm: team.edit (super_admin)
const staffInviteSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(80),
  role: z.enum(['admin','content','super_admin']),
});
// 409 email_in_use | 409 challenge_exists (resend to replace)
// Effect: creates admin_otp_challenges{purpose:'staff_invite', payload:{name,role}},
//         sends OTP (6-digit) + link https://admin.<domain>/admin/accept-invite?cid=<challenge id>
//         via send-email fn. NO auth user exists yet. Audit: admin_invited.
```

```ts
// NEW edge fn admin-staff-accept  (UNAUTHENTICATED by design — the OTP is the credential)
POST { cid: uuid, otp: string(6), password: string.min(12), name?: string }
// Verifies: challenge live, purpose match, attempts<5, sha256(otp+pepper)===otp_hash.
// On success (single transaction-ish sequence, compensating on failure):
//   1. auth signup {email: target_email, password}   ← invitee's own password, never the inviter's
//   2. profiles upsert { role: payload.role, is_active: true, completed_onboarding: true }
//   3. challenge.consumed_at = now()
//   4. audit admin_activated
// Failure: 401 otp_invalid (attempts++), 410 otp_expired, 429 otp_locked (5 attempts).
```

Resend: `admin-settings POST { action:'resend_invite', cid }` — 60 s cooldown (compare `created_at`), replaces the challenge (delete+insert under `aoc_live_uidx`).

### 5.2 Email change (self-service, OTP to the NEW address)

```ts
// NEW edge fn admin-email-change   perm: none beyond staff (self-service)
POST { action: 'request', newEmail: z.string().email() }
// 409 email_in_use; creates challenge{purpose:'email_change', subject_id: caller, target_email: newEmail};
// OTP sent to the NEW address (proves control of it). Audit: admin_email_change_requested.

POST { action: 'verify', cid: uuid, otp: string(6) }
// On success: InsForge Admin API user email update (UUID unchanged — live check 01 §3.6),
// profiles.email update, challenge consumed, ALL sessions of the subject invalidated
// (user_sessions delete → forces re-login with the new address). Audit: admin_email_changed.
```

- super_admin may **initiate** for another staff member (`subjectId` param, perm `team.edit`) — the OTP still goes to the *new* address and only the subject's sessions are invalidated. The mailbox owner, not the super_admin, completes verification.
- This flow is how the primary account moves to `admin@talentmeshsolutions.com` (doc 08 Phase 5 runbook).

### 5.3 Recruiter reset link (replaces `send-credentials` — AD-5)

```ts
// admin-recruiters POST { action: 'send-reset-link', userId: uuid }   perm: recruiters.edit
// Creates password_setup_tokens{purpose:'password_reset', expires 1h},
// emails https://app.<domain>/reset-password?token=<raw>; 200 {success:true} — never the link/credential in the response.
// Consumed by the existing public reset page; token verified by hash, single-use.
```

### 5.4 Impersonation — REMOVED (decision 2, AD-3)

No impersonation endpoint ships. **Delete** `app/api/impersonate/route.ts`, the mock page `app/dashboard/admin/impersonate/`, `components/admin/ImpersonationBanner.tsx`, and the three `document.cookie` readers (`AuthContext.tsx:327-329`, `DashboardLayoutClient.tsx:345`, `lib/insforge.ts:175`). The escalation primitive is eliminated by removal rather than re-secured. If support later needs impersonation, it returns as a post-launch backlog item built on the `withApi` + server-derived-role + server-session pattern (the design is preserved in doc 14 R-10's Option B notes for that day) — not before.

## 6. Admin bootstrap & recovery (AD-12)

```ts
// NEW app/api/admin/forgot-password/route.ts
withApi({ requireAuth: false, schema: { body: z.object({ email: z.string().email() }) } })
// Delegates to the admin-forgot-password edge fn. ALWAYS 200 {success:true} (no enumeration).
// Rate limit: 5/hour per IP + per email (counter table or the otp_challenges pattern).
```

`validateAdminToken` → `crypto.timingSafeEqual` (D-25). `NEXT_PUBLIC_ADMIN_EMAILS`, `NEXT_PUBLIC_ADMIN_SECRET_PATH` deleted; server-only `ADMIN_EMAILS` remains for `/admin/setup` bootstrap only (D-26). The `?reason=suspended` login state ships with this (W6 leftover).

## 7. Read endpoints summary

| Endpoint | Notes |
|---|---|
| `admin-dashboard` `get-summary` | + pending-verifications count; error-not-zero |
| `admin-audit-logs` GET | merged table; filters `action`, `target_type`, `actor`, `on_behalf_of`, date range |
| `/api/admin/verification/queue` | unchanged |
| `admin-companies get-detail` | doc 14 §7 `CompanyDetail` |
| `admin-jobs get-detail` | job + company + recruiter + per-stage application counts |
| `admin-recruiters` GET | joined `company_members` + `companies` (06 §3) |

## 8. Maintenance & feature flags (AD-9 — made real)

- `proxy.ts`: on non-staff, non-`/api/auth/*` traffic, read `platform_settings['maintenance']` (30 s in-memory cache) → rewrite to `/maintenance` when enabled. Staff (per `tm_admin_access`-independent role resolution) exempt.
- `auth-signup` edge fn: check `feature_flags.candidateRegistration` / `recruiterRegistration` → `403 registration_closed`.
- Public blog routes: 404 when `blogEnabled` false.
- `admin-settings` PATCH accepts **only** these two keys with these exact sub-schemas:
```ts
const settingsPatchSchema = z.discriminatedUnion('key', [
  z.object({ key: z.literal('feature_flags'),
             value: z.object({ candidateRegistration: z.boolean(),
                               recruiterRegistration: z.boolean(),
                               blogEnabled: z.boolean() }) }),
  z.object({ key: z.literal('maintenance'),
             value: z.object({ enabled: z.boolean(),
                               message: z.string().max(300).default('') }) }),
]);
```

## Implementation checklist

- [ ] R-2 kit in place; all kept functions migrated onto it (one PR per function, W9 tests green after each)
- [ ] §5 endpoints live against migration 055; OTP invariants tested (expiry, 5-attempt lock, resend cooldown, single live challenge)
- [ ] `/api/impersonate` + mock page + banner + 3 cookie readers deleted; grep confirms none remain
- [ ] `admin-recruiter`, `admin-audit`, (pending live check) `admin-auth-login` deleted
- [ ] `exec_sql` caller removed **before** migration 056 drops the function
- [ ] Permission map §2 mirrored in W9 regression specs
