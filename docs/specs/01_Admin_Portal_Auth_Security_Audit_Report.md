# 01 — Admin Portal Auth & Security Audit Report (Rebuild Baseline)

**Status:** Source-verified 2026-07-18
**Owner:** Security
**Scope:** The security baseline the rebuild (doc 14, tasks R-1…R-14) must clear. Consolidates the still-open findings from `11_Admin_Portal_Audit_And_Remediation.md`, `12_Admin_Production_Readiness_Execution_Plan.md`, `13_Admin_Portal_System_Documentation.md` (D-numbers), and adds **new findings AD-8…AD-14 verified in this session**.
**Repo root:** `Talentmesh-demo/`

Rule of this report: every finding lists Evidence / File / Function / Why it matters / Risk / Fix. Nothing is asserted from documentation alone. Items that require the live backend are marked and listed in §3.

---

## 1. Findings

### AD-1 — Mock-auth bypass still open (carried: A-1 / W1) — **P0, launch blocker**

- **Evidence:** `const allowMockAuth = process.env.ALLOW_MOCK_AUTH === 'true'; if (allowMockAuth && token === 'mock-admin-token') → synthetic admin`. HttpOnly does not stop an attacker sending `curl -H 'Cookie: tm_access_token=mock-admin-token'`.
- **File / Function:** `lib/server-auth.ts:22-33` → `getServerUser()`
- **Why:** one env-var misconfiguration = unauthenticated full admin over all candidate PII.
- **Risk:** Critical.
- **Fix:** doc 12 W1 — three independent conditions (`ALLOW_MOCK_AUTH` ∧ `VERCEL_ENV !== 'production'` ∧ token === high-entropy `E2E_MOCK_ADMIN_TOKEN`), null when unset. **[SUGGESTION]** preferred end-state: delete mock auth, seed a real e2e admin.

### AD-2 — `admin` ≡ `super_admin` at every API layer (carried: D-4) — **P0**

- **Evidence:** `lib/permissions.ts` has no server importers; edge preambles check only `role ∈ {admin, super_admin}`; the split exists only as sidebar filtering (`OpsDarkSidebarShell.tsx:275,291`).
- **Fix:** doc 14 §4 — enforced matrix (`super_admin`/`admin`/`content`) in `withApi.requiredPermission` + shared edge preamble `requireStaff`. Spec in `03_Admin_Portal_API_Routes_And_Endpoints.md` §4.

### AD-3 — Impersonation escalation primitive (carried: D-8) — **P0**

- **Evidence:** `userRole` read from request body (`app/api/impersonate/route.ts:32`), written to a trusted cookie (`:69`); target's real role never fetched; no block on impersonating staff; no `is_active` check; DELETE clears cookies only — no server session to revoke.
- **Fix (CONFIRMED 2026-07-18): REMOVE for launch** (W4 Option A). Delete `app/api/impersonate/route.ts`, the mock page, `components/admin/ImpersonationBanner.tsx`, and the three `document.cookie` readers (`AuthContext.tsx:327-329`, `DashboardLayoutClient.tsx:345`, `lib/insforge.ts:175`). No impersonation ships; the escalation primitive ceases to exist rather than being re-secured. Rebuild is post-launch backlog only.

### AD-4 — Split audit spine + unaudited destructive ops (carried: D-2/D-3) — **P0**

- **Evidence:** `admin-settings/index.ts:374` inserts into **`audit_logs`** (verified this session); the viewer `admin-audit-logs/index.ts:81` reads **`audit_log`**. `admin-jobs` DELETE/bulk-delete and `admin-candidates`/`admin-recruiters` deletes write no audit row at all.
- **Fix:** doc 14 R-3, migration M-053 (merge to `audit_log`, append-only), audit every destructive path + PII export + search.

### AD-5 — Plaintext-credential recruiter pipeline (carried: D-5/D-6/D-7) — **P0**

- **Evidence:** `admin-recruiters/index.ts` — `approve-setup` deletes and recreates the auth user (UUID changes, FKs orphan); `update-password` is a no-op returning `success:true`; `send-credentials` emails the plaintext password and returns it in a `mailto:` URL.
- **Fix:** doc 14 R-7 — pipeline deleted, replaced by company-membership lifecycle + single-use reset links. Spec in `06_Admin_Portal_Recruiter_Portal_Architecture.md`.

### AD-6 — CORS reflects any Origin with credentials (carried: D-10) — **P0**

- **Evidence:** every `insforge/functions/admin-*/index.ts` echoes `req.headers.get('Origin')` with `Access-Control-Allow-Credentials: true`, falling back to `http://localhost:3000`.
- **Fix:** R-2 `_shared/cors.ts` — explicit allowlist (`https://admin.talentmeshsolutions.com` + siblings), no localhost fallback in production.

### AD-7 — PostgREST filter injection in 7 functions (carried: D-13) — **P1**

- **Evidence:** `search` string-interpolated into `.or(\`name.ilike.%${s}%,email.ilike.%${s}%\`)` unescaped — `,` `)` `.` break the predicate. `admin-recruiters` GET + 6 siblings.
- **Fix:** R-2 `_shared/query.ts` `escapeOrFilter()`.

### AD-8 — **NEW: `exec_sql` arbitrary-SQL RPC used for settings writes** — **P0**

- **Evidence (verified this session):**
  ```ts
  // insforge/functions/admin-settings/index.ts:356-360
  const escapedValue = JSON.stringify(value).replace(/'/g, "''");
  const escapedKey   = String(key).replace(/'/g, "''");
  const sql = `UPDATE public.platform_settings SET value = '${escapedValue}'::jsonb, updated_at = now() WHERE key = '${escapedKey}'`;
  const { data: resData, error } = await insforgeAdmin.database.rpc('exec_sql', { query: sql });
  ```
- **File / Function:** `insforge/functions/admin-settings/index.ts` PATCH handler.
- **Why it matters:** two independent problems. (a) A database function **`exec_sql(query text)`** exists that executes arbitrary SQL — a standing privilege-escalation primitive for *anything* that can call RPCs; its mere existence converts any RPC-capable compromise into full DB compromise. (b) The application builds SQL by string concatenation. Quote-escaping happens to cover `'`, but this is one refactor away from injection, and it is entirely unnecessary — the same function already performs normal `.update()` calls elsewhere, and `lib/server/admin.ts:77-85` does this exact write with a plain `.upsert()`.
- **Risk:** Critical (existence of `exec_sql`), High (the call pattern).
- **Fix:** Replace the PATCH body with `insforgeAdmin.database.from('platform_settings').update({ value, updated_at: ... }).eq('key', key)`. Then **`DROP FUNCTION IF EXISTS public.exec_sql(text)`** after confirming no other caller (`grep -r "exec_sql"` — only this file in the repo; **live check required**, §3). Migration M-056.

### AD-9 — **NEW: Settings "governance" controls are decorative** — **P1 (P0 if trusted operationally)**

Answering the product question directly ("are General Configuration, Architectural Flags, Danger Nexus working correctly, are they needed?"): **none of the three works.**

| Card | What it writes | Who reads it | Verdict |
|---|---|---|---|
| **General Configuration** (Platform Name, Support Email, Tagline) | `platform_settings['general']` | **Nothing.** `getPlatformSettings()` (`lib/server/admin.ts:60`) has zero callers; no page or email template renders these values. | Write-only decoration. |
| **Architectural Flags** (candidateRegistration, recruiterRegistration, blogEnabled, messagingEnabled, aiMatching) | `platform_settings['feature_flags']` | **Nothing in app code.** Only e2e specs and test scripts touch the keys. Turning "Candidate Signups" off blocks no signup — `auth-signup` never consults it. | Unenforced; actively misleading (an operator believes registration is closed when it is not). |
| **Danger Nexus** (Maintenance Mode) | `platform_settings['maintenance']` + `document.cookie tm_maintenance` (`settings/page.tsx:206-210`) | **Nothing reads `tm_maintenance`** anywhere (grep: only the writer). And a `document.cookie` written in the *admin's own browser* cannot affect any other user's traffic by definition. | Completely non-functional. The copy claims it will "immediately redirect all non-administrative traffic" — false. |

- **Why it matters:** controls that look live but do nothing are worse than no controls — an operator in an incident will flip "Maintenance Mode" and believe the platform is closed.
- **Fix (decision codified in doc 14-aligned specs):** keep the flags that have a real job and **enforce them server-side**; delete the rest.
  - Keep `feature_flags.candidateRegistration` / `recruiterRegistration` → enforced in the signup edge function (checks `platform_settings` before creating the user; 403 `registration_closed`). Keep `blogEnabled` → public blog routes 404 when off. Drop `messagingEnabled`/`aiMatching` until a consumer exists.
  - Keep Maintenance Mode → enforced in `proxy.ts` (server-side read of `platform_settings['maintenance']` with a 30s in-memory cache; non-staff traffic → maintenance page; staff + `/api/auth/*` exempt). Delete the `tm_maintenance` cookie write.
  - Delete the General Configuration card (or wire `supportEmail` into the email templates if product wants it — one consumer, then it earns its field).
  - Full spec: `05_Admin_Portal_UI_Components_And_Pages.md` §5 and `04_Admin_Portal_State_Machines_And_Business_Logic.md` §6.

### AD-10 — **NEW: settings page still sources the token from `sessionStorage`** — **P1**

- **Evidence:** `app/dashboard/admin/settings/page.tsx:442` — `'Authorization': Bearer ${window.sessionStorage.getItem('tm_token') || ''}` for the quarantine purge call.
- **Why:** doc 10's fix (single HttpOnly parent-domain cookie, C1/C2 delete all `sessionStorage['tm_token']` usage) will make this header silently empty → purge calls fail with 401 after the subdomain cutover.
- **Fix:** route the call through `invokeFunction` (which rides the cookie via `/api/v1/remote`) during R-2/W7. Sweep: `grep -rn "sessionStorage.getItem('tm_token')" app/ lib/ components/` and convert every hit.

### AD-11 — **NEW: staff creation takes a password typed by another person** — **P1**

- **Evidence:** the "Grant Admin Authority" form (`settings/page.tsx:642-662`) takes the new admin's email **and password** from the acting super_admin; `admin-settings add_admin` creates the account with it.
- **Why:** credential custody — the inviter knows the invitee's password; no forced rotation; violates the product's own requirement that staff onboarding be OTP-verified.
- **Fix:** replace with the OTP invite flow (product requirement): invite → OTP + set-password link to the invitee's mailbox → invitee sets their own password. Machine in `04` §3, endpoints in `03` §5, DDL M-055.
- Also: the role dropdown offers only admin/super_admin — must gain `content` per the R-4 matrix.

### AD-12 — Admin bootstrap & recovery broken (carried: D-1/D-25/D-26) — **P0**

- **Evidence:** `/api/admin/forgot-password` does not exist (both pages 404 on submit); `validateAdminToken` uses non-constant-time `===`; `NEXT_PUBLIC_ADMIN_EMAILS` / `NEXT_PUBLIC_ADMIN_SECRET_PATH` ship to the browser bundle.
- **Fix:** doc 14 R-13. Endpoints in `03` §6.

### AD-13 — **NEW: subdomain cutover risks (admin.talentmeshsolutions.com)** — **P0 gate on the cutover**

The product decision is that the admin portal lives on **`admin.<domain>`**. `proxy.ts` already recognizes the host (`proxy.ts:140` `isAdminPortal`) and rewrites admin-portal traffic to `/dashboard/admin/**` (`proxy.ts:393-415`) behind `isAuthenticated` + role/MFA gates. Three facts must be understood before cutover:

1. **The parent-domain cookie (doc 10, `Domain=.talentmeshsolutions.com`) is deliberately valid on `admin.` too** — a logged-in *candidate's* cookie reaches the admin origin. That is by design; the proxy role gate plus the Tree-A layout guard (`role ∈ staff set`, DB-read) remain the authorization boundary. **Consequence:** the layout guard is load-bearing on the subdomain; it must never be weakened to "any authenticated user".
2. **`hasAdminAccessCookie` (proxy.ts:400) lets a `tm_admin_access` cookie substitute for the role check at the proxy layer.** The proxy is only advisory (the RSC layout re-checks from DB), but a forged `tm_admin_access` cookie gets an attacker *past the proxy* to probe the app shell. Verify `tm_admin_access` is HttpOnly and set only by `/api/auth/session` server-side; **[SUGGESTION]** drop the cookie OR-branch entirely and let the proxy read the same profile-derived claim the layout uses.
3. **The canonical direct path `/dashboard/admin/**` must stop resolving on non-admin hosts** after cutover (today the rewrites/redirects still expose it). Doc 13 §2.3's "secret path" obfuscation (`NEXT_PUBLIC_ADMIN_SECRET_PATH`) becomes obsolete — delete it with AD-12's env cleanup.
- **Fix + cutover sequence:** `08_Admin_portal_Implementation_Execution_Plan.md` Phase 4. Hard dependency: doc 10's cookie fix **must land first**, or every admin session on the new origin hits the "logged in but no data" failure (sessionStorage is per-origin).

### AD-14 — Edge-function `limit`/PATCH-body hygiene (carried: D-16/D-17) — **P1**

Uncapped `limit` in `admin-jobs`; PATCH spreads raw bodies into `jobs`/`recruiter_profiles` (`is_approved`, `company_id` freely writable). Fixed once in R-2 kit + per-function allowlists (`03` §3).

---

## 2. What is sound and must be preserved

Verified good (doc 13 §12): the double gate (RSC layout + per-function re-authorization with split clients); `withApi`'s fail-closed pipeline; `/api/admin/verification/decide` as the reference endpoint (zod → caller-token → SECURITY DEFINER RPC gating on `authz.is_admin()` → 409 semantics); `loading.tsx`/`error.tsx` coverage; `claim_export_job` advisory-lock RPC. The rebuild extends these; it does not replace them.

---

## 3. Requires the live backend (do not close from source)

1. `exec_sql` — confirm existence, signature, owner, and **no other callers** live; then drop (AD-8). Use `mcp__insforge__run-raw-sql` read-only enumeration; a human applies the DROP.
2. RLS on tables admin pages read directly (`profiles`, `export_jobs`, `user_sessions`, `subscription_plans`, `notifications`) — doc 12 W2.
3. PAN/Aadhaar column protection on `recruiter_profiles` (D-12) — and the product decision whether intake keeps collecting them at all (R-7 currently drops them).
4. `tm_admin_access` cookie: confirm write sites are exclusively server-side HttpOnly (`/api/auth/session`).
5. Deployed `admin-*` functions vs repo source (deployment drift).
6. InsForge Admin-API email-update semantics (needed by the OTP email-change flow, `03` §5) — confirm the endpoint used by the delete/recreate pipeline also supports in-place email update, so the UUID is preserved.

---

## 4. Exit criteria for this report

This report is "closed" when `e2e/admin-authz.spec.ts` (doc 12 W9, extended per doc 14 R-14) passes green covering: forged mock cookie denied in production mode; `content` role denied outside content resources; `admin` denied super_admin actions; suspended staff denied on every function; the `/api/impersonate` route absent (removed — decision 2); settings write with a non-super_admin token denied; and `exec_sql` absent from the live schema.

**Cross-refs:** fixes are specified in docs `02`–`08` of this Admin_Portal suite; architecture in `14_Admin_Portal_Rebuild_Architecture.md`.
