# 01 — Authentication & Authorization Security Audit Report

**Status:** Draft for review — blocks Recruiter Portal launch
**Owner:** Platform / Security
**Version:** 1.2 — L-1 re-verified against the live DB (2026-07-16) and marked **RESOLVED**: the `"Recruiters manage company"` policy is absent from live `public.companies`. It was applied out-of-band; provenance is unverified and no rollback artifact exists (see L-1). L-2..L-4 remain as stated in v1.1 but have **not** been re-verified live — treat their live-state claims as of the v1.1 inspection only.

**Version:** 1.1 — reconciled against current source AND the live InsForge database (schema/RLS inspected via MCP `get-table-schema` on 2026-07-16). C-2 and C-3 are now RESOLVED in the working tree; new live-DB findings L-1..L-3 added.
**Last Updated:** 2026-07-16

> **Method (per project CLAUDE.md):** Documentation is treated as *architectural intent only*. Every finding below was re-verified against current source in this pass. A prior audit exists at `docs/auditReportDoc/authentication-architecture-audit.md` (2026-07-16, score 4/10); this report **independently re-confirms, downgrades, or marks unverified** each of its findings rather than trusting it. Where I could not verify against the live database (no DB access in this pass), the finding is marked `UNVERIFIED` with the exact verification procedure.

---

# Purpose

Determine whether the TalentMesh authentication/authorization system is production-ready **specifically as the gate in front of the new Recruiter Portal and Company Management modules**. The recruiter portal exposes company-scoped candidate PII (resumes, contact details) and billing; a weak auth boundary here is a data-breach and privilege-escalation surface, not just a UX issue.

This document produces the **P0 fix list that must ship before the recruiter portal is enabled** (it is currently disabled behind a `coming-soon` rewrite in `proxy.ts`).

---

# Background — Session Lifecycle As Actually Coded

Verified end-to-end from source. This is *what the code does*, not what `docs/auth.md` claims (discrepancies in the table at the end).

```mermaid
sequenceDiagram
    participant U as Browser
    participant N as Next.js (route handlers + RSC layouts)
    participant P as proxy.ts (stateless)
    participant IF as InsForge

    U->>N: POST /api/auth/signup or signInWithPassword (SDK)
    N->>IF: auth-signup edge fn / signInWithPassword
    IF-->>N: access JWT + refresh JWT + user
    N-->>U: Set-Cookie tm_access_token(HttpOnly), tm_refresh_token(HttpOnly),<br/>tm_session=1 + tm_role/tm_onboarding/tm_mfa/tm_company (routing, non-sensitive)
    U->>U: mirror access token into sessionStorage['tm_token'] + document.cookie (non-HttpOnly)
    U->>P: navigate to /dashboard/*
    P->>P: read tm_access_token presence + base64-decode sub (NO signature check),<br/>read tm_role/tm_mfa cookies → route to subdomain/path
    P->>N: forward to RSC layout
    N->>IF: getServerUser() → getCurrentUser() + load profiles row  (REAL security boundary)
    N-->>U: render, or redirect (login / suspended / onboarding / mfa)
    U->>N: all SDK data calls tunnel through /api/v1/remote (anon key upgraded to cookie JWT)
    Note over U,N: useSessionRefresh rotates token every 5/10/15m; 401 → one-shot refresh+retry
```

**Authoritative boundary:** `getServerUser()` in `lib/server-auth.ts`, called by RSC layouts (`app/dashboard/layout.tsx`, `app/dashboard/admin/layout.tsx`, `app/dashboard/candidate/layout.tsx`). `proxy.ts` is **stateless routing metadata only** — it decodes the JWT `sub` **without verifying the signature** (`proxy.ts:99-112`) and trusts `tm_role`/`tm_mfa`/`tm_admin_access` cookies for routing decisions. This is acceptable *only if* every sensitive surface re-validates server-side. The findings below are the places where it does not.

---

# Findings

Each finding: **Evidence · File · Function · Why it matters · Risk · Recommended fix · Status vs prior audit.**

Risk scale: **CRITICAL** (privilege escalation / auth bypass / PII exposure, exploitable now) → **HIGH** → **MEDIUM** → **LOW**.

---

## C-1 — Self privilege escalation via direct `profiles.role` PATCH  ·  Risk: CRITICAL  ·  Status: UNVERIFIED (verify before launch)

- **Evidence:** `profiles` RLS policy `profiles_self` is `FOR ALL USING (id = auth.uid()) WITH CHECK (id = auth.uid())` (`insforge/migrations/001_schema_and_rls.sql:215`). This grants the user UPDATE on **every column of their own row, including `role`**, with no column restriction. If this policy is still the effective one on the live DB, any authenticated user can `PATCH /api/database/records/profiles?id=eq.<self>` with `{"role":"super_admin"}` and self-promote.
- **File / Function:** `insforge/migrations/001_schema_and_rls.sql` → `profiles_self`; enforced live via the `/api/v1/remote` proxy which forwards the user JWT.
- **Why it matters:** Full platform takeover from any candidate account. Directly defeats the "Security by Default / Database-Enforced Authorization" principles the recruiter platform depends on.
- **Recommended fix:** Split the policy — allow self-UPDATE only on safe columns and forbid `role`/`is_active`/`company_id` self-mutation. Postgres RLS can't restrict columns in `WITH CHECK` directly, so enforce via a `BEFORE UPDATE` trigger that rejects changes to `role`, `is_active`, `company_id`, `status` unless `authz.is_admin()`; keep column `GRANT`s minimal. (Design in `02_Schema_And_Database_Design.md`, migration 047.)
- **Verification procedure (do before marking resolved):** As a normal candidate JWT, run `PATCH .../profiles?id=eq.<self>` with `role=super_admin`; expect 403/no-op. Or read live policy: `SELECT polname, pg_get_expr(polqual,polrelid), pg_get_expr(polwithcheck,polrelid) FROM pg_policy WHERE polrelid='public.profiles'::regclass;`
- **Prior audit said:** C-1 CRITICAL (live). I could not verify the live policy state in this pass, only that the git migration that created it is column-unrestricted. **Treat as CRITICAL until proven otherwise.**

---

## C-2 — Ungated mock-auth backdoors mint super-admin sessions in production  ·  Risk: CRITICAL  ·  Status: ✅ RESOLVED in working tree (P0-1 implemented)

- **Resolution evidence (verified 2026-07-16):**
  - `lib/server-auth.ts:20-42` — both mock identities are now honored **only when `process.env.ALLOW_MOCK_AUTH === 'true'`** (defaults off); the guard and rationale are documented in the code comment at `:16-19`.
  - `app/api/auth/refresh/route.ts:18-36` — the mock interception branch is behind the same `ALLOW_MOCK_AUTH === 'true'` gate (`:21-22`), and the mock cookies are now set with `{ httpOnly: true, sameSite: 'lax' }` (`:33-34`).
- **Original finding (historical):** `getServerUser()` returned a hard-coded admin for token `'mock-admin-token'` with no env guard, and the refresh route minted `super_admin` sessions with non-HttpOnly cookies on a cookie-substring match.
- **Residual risk / verify before launch:** the fix relies on `ALLOW_MOCK_AUTH` never being set in the production environment. Add a deployment check (env lint / startup assertion) that fails the prod build if `ALLOW_MOCK_AUTH=true` and `NODE_ENV=production`. The sibling resolver `lib/auth/server-auth.ts` still uses a **different** flag name (`ENABLE_MOCK_AUTH`) — consolidate to one flag (see P2 consolidation item) so an operator cannot gate one door and leave the other open.
- **Verify:** prod build without the flag: cookie `tm_access_token=mock-admin-token` → no session.

---

## C-3 — Unauthenticated privileged admin API using the service key  ·  Risk: CRITICAL  ·  Status: ✅ RESOLVED in working tree (P0-3 implemented)

- **Resolution evidence (verified 2026-07-16):**
  - `app/api/admin/send-proposal/route.ts:16-17` — the handler is now `withApi({ schema: { body: proposalSchema }, allowedRoles: ['admin','super_admin'], auditLog: true }, ...)`, enforcing `getServerUser()` + role server-side with Zod body validation and audit logging.
  - `app/api/auth/session/route.ts` — `role`/`adminAccess` are **no longer read from the request body**; the code comments at `:19` and `:59` document that claimed role/adminAccess is never trusted and `tm_role`/`tm_admin_access` derive only from the verified profile fetch.
- **Original finding (historical):** the POST used `INSFORGE_SERVICE_KEY` with no auth check, and the session route wrote `tm_role`/`tm_admin_access` straight from the client-supplied body — a client could self-issue the admin routing cookie, then call the service-key endpoint.
- **Residual note:** the handler still performs its insert with the service key (`route.ts:23-38`) — acceptable now that role enforcement happens first, but any future `/api/admin/*` route must follow the same `withApi` pattern. Audit remaining `/api/admin/*` routes for the wrapper before GA.
- **Verify:** non-admin call → 403; request body containing `role`/`adminAccess` has no effect on issued cookies.

---

## C-4 — `jobs` edge function bypasses RLS with client-controlled `company_id`/`recruiter_id`  ·  Risk: CRITICAL (for recruiter portal)  ·  Status: CONFIRMED

- **Evidence:** `insforge/functions/jobs/index.ts:55-61,133-156` — both GET and POST build the InsForge client with `anonKey: reqServiceKey` (falls back to `INSFORGE_SERVICE_KEY`), i.e. **RLS-bypassing service role**. The POST create path validates the body with `jobCreateSchema` which takes `company_id` (required) and `recruiter_id` (optional) **from the request body** (`:28-29`) and inserts them directly (`:148-156`) with `status:'active', is_approved:false`. There is an `Authorization` presence check (`:130-131`) but **no verification that the caller belongs to `company_id` or is `recruiter_id`.**
- **Secondary discrepancy — now RESOLVED against the live DB (2026-07-16):** the GET select joins **`companies(...)`** (`:78`). Live inspection confirms a **`companies` table exists in production (6 rows) that no git migration defines** — it was created out-of-band. Live `jobs.company_id` FK (`jobs_company_id_fkey`) points at `companies`, NOT at the committed `company_profiles` (which exists live but is **empty**). So the function works, the committed schema docs are stale, and the migration plan in `02_Schema_And_Database_Design.md` must alter `companies` in place rather than rename `company_profiles`. See also findings L-1..L-3 below for the RLS state of these live tables.
- **File / Function:** `insforge/functions/jobs/index.ts::handler` (POST branch).
- **Why it matters:** With the recruiter portal live, a recruiter (or any authenticated user who can reach the function) can create/attribute jobs under *any* `company_id` — cross-tenant write. Company-First ownership and candidate-privacy RLS both hinge on `jobs.company_id` being trustworthy; this makes it attacker-chosen.
- **Recommended fix (P0):** Derive `company_id` and `recruiter_id` **server-side from the caller's verified membership** (from `company_members`/profile), never from the body. Use a `SECURITY DEFINER` RPC `create_job(...)` that reads `auth.uid()`, resolves the active company, and enforces the plan entitlement (see `02` and `04`). Remove the service-key create path or restrict it to admin. Reconcile the `companies` vs `company_profiles` name.
- **Prior audit said:** C-4 (flagged, source not opened). **CONFIRMED by reading the function.**

---

## H-6 — MFA gate is presence-only in the authoritative layer  ·  Risk: HIGH  ·  Status: CONFIRMED

- **Evidence:** `app/dashboard/layout.tsx:75-86` — when `user.mfa_enabled`, it redirects to `/auth/mfa-verify` only if the cookie `mfa_verified` is **absent**; it never validates the cookie's HMAC signature. The cryptographically sound HMAC check exists **only in `proxy.ts:9-38`**, and runs only on the admin path branch gated by the client-settable `tm_mfa` cookie (`proxy.ts:404-406`). A user can set `mfa_verified=anything` in `document.cookie` and satisfy the RSC gate.
- **File / Function:** `app/dashboard/layout.tsx` (default export layout).
- **Why it matters:** MFA is bypassable for any account that has it enabled, from the layer that is supposed to be authoritative. Recruiter/company-admin accounts (billing, PII access) are exactly the accounts most likely to have MFA on.
- **Recommended fix (P1, P0 if MFA is required for recruiter admins):** Validate the `mfa_verified` cookie signature in `getServerUser()` or in the layout using the same `MFA_SIGNING_SECRET` HMAC + timing-safe compare + 24h window already implemented in `proxy.ts`. Reject on invalid signature, not just absence.
- **Prior audit said:** H-6. **CONFIRMED.**

---

## H-7 — Weak OAuth `state` (`Math.random()`) with soft-fail validation  ·  Risk: HIGH  ·  Status: CONFIRMED

- **Evidence:** `app/(auth)/login/page.tsx:577-580` generates the OAuth `state` with `Math.random().toString(36)` and stores it in `sessionStorage`. The callback `app/auth/callback/page.tsx:54-78` compares `state` but **proceeds anyway when a PKCE verifier is present** (soft-fail), so a mismatch does not hard-block.
- **File / Function:** `login/page.tsx::handleOAuthLogin`; `callback/page.tsx` state check.
- **Why it matters:** `Math.random()` is not cryptographically random and the soft-fail weakens CSRF protection on the OAuth login flow (login-CSRF / account-fixation surface). Recruiters will sign in via Google/LinkedIn.
- **Recommended fix (P1):** Use `crypto.getRandomValues` / `crypto.randomUUID()` for `state`; make the callback **hard-fail** on state mismatch (reject, do not fall through to PKCE-only). PKCE + strict state should both be required.
- **Prior audit said:** H-7. **CONFIRMED.**

---

## H-8 — Access token exposed to JavaScript (sessionStorage + non-HttpOnly cookie + URL)  ·  Risk: HIGH  ·  Status: CONFIRMED

- **Evidence:** The access JWT is written to (a) HttpOnly `tm_access_token` (good), **and** (b) `sessionStorage['tm_token']`, **and** (c) a non-HttpOnly `document.cookie` copy, **and** (d) passed cross-subdomain via a `?token=` URL param later scrubbed with `history.replaceState` (`lib/auth/AuthContext.tsx` token-sync paths; `lib/insforge.ts`). The refresh route also emits non-HttpOnly auth cookies in the mock branch (see C-2).
- **File / Function:** `lib/auth/AuthContext.tsx` (`syncAuthCookies`/token mirroring), `lib/insforge.ts`.
- **Why it matters:** Any XSS becomes full session theft; the URL-param hop can leak tokens to logs/referrers/history. Defeats the point of the HttpOnly cookie.
- **Recommended fix (P1):** Treat the HttpOnly cookie as the single source of truth. Remove the `sessionStorage` and non-HttpOnly `document.cookie` token copies; replace cross-subdomain handoff with a server-set domain-scoped HttpOnly cookie (already partially present via `tm_session` signal cookie). Keep only the non-sensitive `tm_session=1` signal for client "am I logged in" checks.
- **Prior audit said:** H-8. **CONFIRMED.**

---

## H-9 — Recruiter dashboard layout has **no server-side auth guard**  ·  Risk: HIGH (recruiter-portal-specific)  ·  Status: CONFIRMED

- **Evidence:** `app/dashboard/recruiter/[role_id]/layout.tsx:5-17` returns a pass-through `RecruiterLayoutClient` and **never calls `getServerUser()`**. The comment even says "we'll assume the client component handles the auth state." By contrast `app/dashboard/admin/layout.tsx` and `app/dashboard/candidate/layout.tsx` both call `getServerUser()` and enforce role server-side. The parent `app/dashboard/layout.tsx` enforces *authentication* + onboarding/suspension but **not the recruiter role or company membership**. This directly contradicts `proxy.ts:58-64`'s stated design ("all authorization enforced by getServerUser() in layout RSCs").
- **File / Function:** `app/dashboard/recruiter/[role_id]/layout.tsx`.
- **Why it matters:** When the portal is enabled, recruiter routes would be protected only by client code — trivially bypassed by disabling JS or hitting server components directly. Candidate PII and company data would be reachable without a server role/membership check.
- **Recommended fix (P0 — launch blocker):** Add a server guard to the recruiter layout: `const user = await getServerUser(); if (!user) redirect('/login'); if (user.role !== 'recruiter') redirect(...); ` then resolve active company membership from `company_members` and gate on `status='active'` + company `status='verified'`, redirecting pending recruiters to `/pending-approval`. Full design in `06_Recruiter_Portal_Architecture.md`.
- **Prior audit said:** noted as a gap. **CONFIRMED; elevated to P0 because it is the front door of the module this project delivers.**

---

## L-1 — Live `companies` RLS: any recruiter can modify ANY company  ·  Risk: CRITICAL  ·  Status: ✅ RESOLVED (re-verified live 2026-07-16)

> **RESOLVED — the policy is no longer present on the live DB.** A re-inspection of `pg_policy` on 2026-07-16 (after the original v1.1 finding below) returned exactly three policies on `public.companies`: `"Public view active companies"` (SELECT, `is_active = true`), `admin_bypass` (ALL, `{project_admin}`), and `project_admin_policy` (ALL, `{project_admin}`). `"Recruiters manage company"` is **absent**, RLS is **enabled**, and no permissive policy grants INSERT/UPDATE/DELETE to `public` or any authenticated non-admin role — so recruiter writes to `companies` are already denied. This is the exact end state P0-6 specified.
>
> **How it was closed:** a working session on 2026-07-16 dropped the policy directly via `run-raw-sql` and wrote the standalone migration `insforge/migrations/045b_fix_companies_rls_L1.sql` (committed here for provenance). That account comes from the session's own working notes, not from the database — it is corroborated by the verified end state above, but **the database itself holds no record of the change**: `system.custom_migrations` is **empty** and 045b was **untracked in git** until this commit. Treat the mechanism as well-attested, the audit trail as absent.
>
> **No rollback artifact exists.** The original `CREATE POLICY` could not be captured from the live DB because the policy is already gone. The definition quoted in the original finding below came from this document's prose, not from a live capture, and must **not** be treated as a verified restore statement.
>
> **Systemic issue this exposes (tracked separately):** a P0 security change was applied to production by hand via `run-raw-sql`, with the migration file left uncommitted and the ledger left empty — so the only record of a critical prod DDL change lived in a working session's notes. The fix landed, but nothing in the repo or database would have told the next person that, and this document went on asserting the hole was open. No claim in these docs about live DB state should be trusted without a live re-check — `09_Migration_Execution_Runbook.md` T1 is the control that catches this, and it had not been run.

**Original finding (v1.1, retained for history — the state below is no longer live):**

- **Evidence (live `pg_policy` via MCP `get-table-schema`):** table `companies` has policy `"Recruiters manage company"` — `cmd: ALL`, `roles: {public}`, `USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'recruiter'))`, `WITH CHECK: null`. The qual only checks the caller **is a recruiter** — there is no ownership/membership link to the company row.
- **File / Function:** live database policy only — it exists in **no git migration** (the table itself is out-of-band, see C-4).
- **Why it matters:** Any authenticated recruiter can `UPDATE` or `DELETE` **every** company row (names, logos, `is_verified`, `is_active`) via the standard `/api/v1/remote` data path. This is a live cross-tenant write hole today, independent of the recruiter portal launch.
- **Recommended fix (P0 — hotfix, can ship before Phase 1):** `DROP POLICY "Recruiters manage company" ON public.companies;` and replace with membership-scoped policies per the house rules in `02_Schema_And_Database_Design.md` (post-046, ownership comes from `company_members`). Until 048 lands, an interim policy scoping writes to `created_by`/membership is required; public SELECT of active companies can remain.
- **Verify:** as recruiter A, `PATCH .../companies?id=eq.<company-of-B>` → 403/no-op.
- **Legit-writer analysis (2026-07-16):** no legitimate recruiter write path to `companies` exists, so the bare drop was always safe. Every write goes through service-key edge functions that bypass RLS (`insforge/functions/company-profile/index.ts:101,117` via `insforgeAdmin`, built at `:42` with `isServerMode: true`; same pattern in `admin-companies`, `recruiter-request`, `recruiter-profile`, `admin-recruiters`). All client-side `.from('companies')` calls are read-only `.select()`. The only client-shaped write, `scripts/create-test-recruiter.ts:78`, is a dev script also using `INSFORGE_SERVICE_KEY` (`:15`). The recruiter portal remains behind the coming-soon rewrite at `proxy.ts:269`.

---

## L-2 — Live `jobs` RLS: blanket owner-UPDATE policies defeat the approved/unapproved split  ·  Risk: HIGH  ·  Status: CONFIRMED (live DB, 2026-07-16)

- **Evidence (live):** `jobs` carries **16 policies**, including BOTH the strict pair `jobs_update_unapproved` / `jobs_update_approved` (which constrain what an owner may do around `is_approved`) AND blanket policies `"Recruiters can update own jobs"` and `jobs_update_own` (`UPDATE USING (auth.uid() = recruiter_id)` with **no `is_approved` condition and no WITH CHECK beyond ownership**). RLS policies are OR-ed, so the blanket policies make the strict pair dead letter — an owner can freely edit an approved job — and since no column-guard trigger exists on `jobs`, that includes flipping `is_approved` itself.
- Also live: **3 duplicate `updated_at` triggers** (`tr_jobs_update`, `trigger_set_updated_at`, `update_jobs_updated_at`) and a **duplicate index** (`idx_jobs_status` ≡ `idx_jobs_status_approved`) — evidence of repeated out-of-band DDL; harmless individually but each write pays 3 trigger executions and 2 identical index maintenances.
- **Why it matters:** approved-job content is the public storefront; a recruiter editing post-approval bypasses the moderation flow the platform depends on. The duplicate policies also add per-query evaluation overhead.
- **Recommended fix (P1, fold into migration 048):** drop the redundant/blanket policies so exactly one policy per (cmd, audience) remains; keep the strict pair; drop 2 of the 3 triggers and the duplicate index. List the exact live policy names in the migration (they are enumerated above) — do not assume git migrations describe the live state.

---

## L-3 — Live `company_profiles` is an empty vestige with admin-only RLS  ·  Risk: LOW (confusion/drift, not exposure)  ·  Status: CONFIRMED (live DB, 2026-07-16)

- **Evidence (live):** `company_profiles` exists with **0 rows**; its only policies are `project_admin_policy` and `admin_bypass` (both `project_admin`) — no recruiter/user access at all. Meanwhile git (`001_schema_and_rls.sql`) treats it as the primary company table.
- **Why it matters:** every code path or doc that still targets `company_profiles` silently reads/writes a dead table; the FK in git (`jobs.company_id → company_profiles`) does not match the live FK (`→ companies`). This drift is what invalidated the original 046 rename plan.
- **Recommended fix:** after 046 (in-place alter of `companies`), archive-then-drop `company_profiles` once confirmed empty; see `09_Migration_Execution_Runbook.md` T2 preconditions.

---

## L-4 — Live auth config gaps (informational → fix before GA)  ·  Risk: MEDIUM  ·  Status: CONFIRMED (live config, 2026-07-16)

- **Evidence (live auth config):** `passwordMinLength: 6` with all complexity flags off; `allowedRedirectUrls: []` (empty). Email verification is ON (code method) and SMTP (Resend) is configured — good.
- **Why it matters:** 6-char passwords are below OWASP/NIST guidance (≥8) for a platform holding candidate PII; an empty OAuth redirect allow-list means redirect targets are not pinned (verify InsForge's default behavior — if it falls back to permissive, this enables token-redirect abuse in the OAuth flow, compounding H-7).
- **Recommended fix (P1):** set `passwordMinLength: 8`; populate `allowedRedirectUrls` with the exact production callback origins (apex + `app.` + `admin.` subdomains).

---

## M-9 — Email-domain → super_admin auto-promotion  ·  Risk: MEDIUM  ·  Status: CONFIRMED

- **Evidence:** `insforge/functions/admin-auth-login/index.ts:9-15` `normalizeRole()` returns `super_admin` when the email ends with `@talentmesh.com` (or equals `admin@talentmesh.com`) **and no role is otherwise set**. Domain ownership/verification is not proof of authorization.
- **File / Function:** `insforge/functions/admin-auth-login/index.ts::normalizeRole`.
- **Why it matters:** If a `@talentmesh.com` mailbox is ever created via any self-serve path (or the domain trust is spoofed upstream), it yields super-admin. Trust should come from an explicit `admin_users` grant, not string matching.
- **Recommended fix (P2):** Remove domain-based promotion; grant admin/super_admin only via the `admin_users` table (already the anti-recursion source of truth). `normalizeRole` should default to `candidate` and never elevate.
- **Prior audit said:** M-9. **CONFIRMED.**

---

## M-10 — `auth-signup` role downgrade is correct but recruiter onboarding functions are not deployed  ·  Risk: MEDIUM (blocks the module) · Status: CONFIRMED

- **Evidence:** `insforge/functions/auth-signup/index.ts:37-50` correctly downgrades `admin`/`super_admin`→`candidate` and 403s recruiter self-signup — good. But `activate-recruiter` and `recruiter-request` functions are referenced in `docs/auth.md:591-592` as **not deployed**, and the recruiter approval path is manual. Without them, the recruiter lifecycle (request → approve → activate) has no server implementation yet.
- **Why it matters:** The recruiter onboarding state machine (`04_State_Machines_And_Business_Logic.md`) needs a trusted server actor to flip membership/company status. Doing it client-side or by direct table writes reintroduces C-1-class risks.
- **Recommended fix (P1):** Implement approval/activation as admin-gated `withApi` routes or `SECURITY DEFINER` RPCs. Specified in `03_API_Routes_And_Endpoints.md` and `07_Company_Management_Architecture.md`.

---

## Additional observations (LOW / informational)

- **CSRF, rate-limiting, payload cap** on the `/api/v1/remote` proxy are present and reasonable (`app/api/v1/remote/[...path]/route.ts:130-264`) — rate limiting is in-memory per-instance (won't hold across serverless instances). **[SUGGESTION]** move to a shared store (InsForge table / Redis) before scale. Not a launch blocker.
- **Impersonation** (`app/api/impersonate/route.ts`) is admin-gated, `SameSite=Strict`, audit-logged, and blocks mutations while impersonating — sound.
- **Dual server-auth resolvers** (`lib/server-auth.ts` vs `lib/auth/server-auth.ts`) diverge (only one gates mocks). **[SUGGESTION]** consolidate to a single resolver to prevent this class of drift.
- **Service key injected on every proxied request** (`app/api/v1/remote/[...path]/route.ts:93-95` sets `x-insforge-service-key`) and swapped into the bearer for some public GETs (`:113-126`). Verify the downstream never lets a user JWT ride alongside the service key in a way that escalates; the recruiter portal's cross-tenant reads make this higher-stakes. `UNVERIFIED` — audit the proxy's key-selection logic before launch.

---

# Documentation vs Implementation Discrepancies

Per CLAUDE.md, docs are intent only. These are stale/wrong vs current code and should be corrected or deprecated:

| Doc claim | Location | Reality in code | Action |
|---|---|---|---|
| Proxy resolves token via `createServerSessionClient` and queries `profiles` | `docs/auth.md:119-136` | `proxy.ts:58-64` is stateless, no DB calls | Fix `auth.md` |
| Idle timeouts admin 10m / recruiter 20m / candidate 30m | `docs/auth.md:223-227` | `AuthContext.tsx:692-699`: admin 2h / recruiter 4h / candidate 7d | Fix `auth.md` |
| LinkedIn is unconfigured "UI bug" | `docs/auth.md:69-71` | Fully wired identically to Google (`login/page.tsx:696-701`) | Fix `auth.md`; separately verify LinkedIn provider is configured in InsForge |
| Login route `/api/auth/sessions` (plural) | `docs/auth.md:143-149` | Code calls `/api/auth/session` (singular) | Fix `auth.md` |
| 3 live criticals: RLS disabled on profiles/admin_users, anon `exec_sql`/`query_json` | `docs/live_backend_security_audit.md` | Reported remediated by newer audit | Mark doc STALE; re-verify RLS-enabled state live |
| "companies" table used by jobs fn | `insforge/functions/jobs/index.ts:78` | **Live DB has both**: `companies` (6 rows, FK target) is real but undocumented; `company_profiles` exists but is empty. Git schema is stale. | Reconcile in `02` — **alter `companies` in place**, do NOT rename `company_profiles` (see L-1..L-3) |
| Findings 1/2/4 (no OAuth state / mfa never set / no rate limit) | `docs/auth-audit-response.md` | Partially fixed since (state now exists but weak — H-7; MFA HMAC exists but presence-only in layout — H-6; rate limit now present) | Mark doc PARTIALLY-STALE |

---

# P0 Fix List — Recruiter Portal Launch Blockers

These **must** ship (and be verified) before `proxy.ts` un-gates the `app.*` recruiter routes:

| # | Fix | Finding | Status | Verify |
|---|---|---|---|---|
| P0-1 | Remove/env-gate mock-auth in `lib/server-auth.ts` and `app/api/auth/refresh/route.ts`; never emit non-HttpOnly auth cookies | C-2 | ✅ **DONE in working tree** (add prod env-lint for `ALLOW_MOCK_AUTH`; unify flag with `ENABLE_MOCK_AUTH`) | Prod build: cookie `tm_access_token=mock-admin-token` yields no admin session |
| P0-2 | Add server guard to `app/dashboard/recruiter/[role_id]/layout.tsx` (getServerUser + role + verified company membership) | H-9 | ❌ **OPEN** | Direct RSC hit without recruiter role → redirect; JS-disabled access blocked |
| P0-3 | Wrap `send-proposal` (and audit all `/api/admin/*`) in `withApi({allowedRoles:['admin','super_admin']})`; stop deriving `tm_role`/`tm_admin_access` from request body in `auth/session` | C-3 | ✅ **DONE in working tree** (audit remaining `/api/admin/*` routes) | Non-admin call → 403; self-set admin cookie ineffective |
| P0-4 | Move job creation to a `SECURITY DEFINER` RPC that derives `company_id`/`recruiter_id` from `auth.uid()`; remove client-supplied ownership in `jobs` edge fn | C-4 | ❌ **OPEN** | Recruiter cannot create a job under another company_id |
| P0-5 | Fix `profiles` self-update to forbid `role`/`is_active`/`company_id`/`status` mutation (trigger) | C-1 | ❌ **OPEN** (also verify live policy first) | Candidate PATCH `role=super_admin` → rejected |
| P0-6 | **Drop live `companies` policy `"Recruiters manage company"`** and replace with ownership/membership-scoped policy | L-1 | ✅ **RESOLVED** — policy absent from live DB (re-verified 2026-07-16); dropped out-of-band via `run-raw-sql`, no ledger record. Scoped write policies still arrive in 046/048. | Recruiter A cannot UPDATE company of B |

P1 (harden before GA, not strictly blocking the gated preview): L-2 dedupe `jobs` blanket-UPDATE policies/triggers/index, L-4 password length + redirect allow-list, H-6 MFA signature check, H-7 crypto state + hard-fail, H-8 remove JS-readable token, M-10 recruiter approval RPCs.
P2: M-9 remove domain promotion; consolidate dual resolvers **and unify the two mock-auth env flags** (`ALLOW_MOCK_AUTH` vs `ENABLE_MOCK_AUTH`); shared-store rate limiting.

Implementation ordering and per-fix change tables are in `08_Implementation_Execution_Plan.md` (Phase 0).

---

# References

- Prior audit: `docs/auditReportDoc/authentication-architecture-audit.md`
- Code: `lib/server-auth.ts`, `lib/auth/server-auth.ts`, `proxy.ts`, `lib/insforge.ts`, `lib/auth/AuthContext.tsx`, `app/api/auth/{session,refresh,oauth/exchange,signup,logout,mfa-complete}/route.ts`, `app/api/v1/remote/[...path]/route.ts`, `app/api/admin/send-proposal/route.ts`, `app/dashboard/layout.tsx`, `app/dashboard/recruiter/[role_id]/layout.tsx`, `app/(auth)/login/page.tsx`, `app/auth/callback/page.tsx`, `insforge/functions/{auth-signup,admin-auth-login,jobs}/index.ts`
- Schema: `insforge/migrations/001_schema_and_rls.sql`, `028_recruiter_team_rbac.sql`, `docs/database_schema.md`
- Related docs: `02_Schema_And_Database_Design.md`, `03_API_Routes_And_Endpoints.md`, `04_State_Machines_And_Business_Logic.md`, `06_Recruiter_Portal_Architecture.md`, `07_Company_Management_Architecture.md`, `08_Implementation_Execution_Plan.md`
