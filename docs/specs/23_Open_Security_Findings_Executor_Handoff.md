# 23 — Open Security & Readiness Findings — Executor Handoff

**Written:** 2026-07-27 · **Audience:** any executor session (model-agnostic) implementing fixes
without this session's context. Every item is self-contained: evidence, file, why, risk, fix.
**Read first:** `22_Gate_E_Closure_And_Async_Params_Fix.md` (what is already proven — do not
re-verify §3 of that doc), then doc 21 §7 (traps: single-line SQL, localhost useless for portal
gates, full cookie set for proxy probes, 401≠403, quote contracts from implementation only).

**Ground rules for the executor (non-negotiable, from docs 14/17/20/21):**
- `profiles.role` is the ONLY authorization source. Never `user.metadata`.
- `approval_status` is the jobs SSoT; edits must never touch approval state.
- Never auto-approve anything (verifications, backfills). Admin approval is always human.
- Working tree carries ~72 unrelated dirty files; local `main` ref is stale. Ship from a clean
  worktree off **origin/main**, explicit paths only, never `git add -A`.
- Push to `main` ≠ deployed: Vercel may hold deployments for manual authorization. Verify
  behaviorally after every deploy.
- InsForge rebuilds every edge function on every deploy; never deploy a `_shared`-importing
  function unbundled; re-fetch `/api/functions/<slug>` after deploying.

---

## CLOSED — do not reopen (verified live 2026-07-25 → 27)

AE-1 (self-escalation, mig 059) · A (`@talentmesh.com` suffix) · B (pre-approved job minting) ·
C (unverified-company board leak) · A2 (`handle_new_user` metadata — **the
`EXCEPTION WHEN undefined_column` handler must STAY**, removing it breaks all signup) ·
R3-7 (PAN/Aadhaar purge) · N-2 (approval SSoT, mig 058) · **withApi async-params 404s
(`f9f6a86`)** · Gate E incl. cross-company row scoping · `approve_company_verification()` atomicity.

---

## OPEN FINDINGS, ranked

### F-23.1 · ~~P1 backfill~~ — **CLOSED 2026-07-27: no action needed (dry-run disproved the premise)**
- **Dry-run finding (live query, 2026-07-27):** of the 24 orphaned `role='recruiter'` profiles,
  **22 are `@example.com` automated-test artifacts** (`recruiter_test_*`, `Sprint B`,
  `debug_recruiter_*`, `recr_*`, created 2026-05-31 / 06-12). The remaining 2 are the owner's own
  accounts: `talentmeshdb@gmail.com` (no legacy data) and `manyapatel0812@gmail.com` (legacy
  `recruiter_profiles` row, company "ABCe", legacy `is_approved=true`, but no `company_members`
  row — still locked out of the new RLS path).
- **Decision:** no backfill. There are zero real locked-out users; backfilling would have dumped
  22 junk companies into the Verification Queue. The user plans a fresh launch that wipes all
  non-staff accounts anyway. If `manyapatel0812` is wanted as a working recruiter pre-wipe, run
  it through the real flow (`/onboarding/recruiter/setup` → admin approve — proven 2026-07-27),
  **not** hand-seeded rows.
- **Lesson for the executor:** doc 21 §4 item 3's "24 locked out" was a row count, not a user
  count. Look at the actual rows before building a migration.

### F-23.2 · P1 — **CONFIRMED 2026-07-27** — staff-created companies are permanently bricked at `pending`
- **Evidence (live):** all 8 companies in the database have **0** `company_verification_requests`
  rows; **5 sit at `status='pending'`** (`Test Acme Corp…`, `Test Tech Company`,
  `TalentMesh Solutions` dup, `ABC`, `ABCe`). The Verification Queue reads
  `company_verification_requests`, so none of them are visible to staff anywhere in the UI.
- **File/function:** `insforge/functions/admin-companies/index.ts`, POST create branch —
  inserts into `companies` only (`{...parsed.data, created_by: userId}`), never a request row.
  **Deployed source re-fetched via `get-function` and confirmed identical to local.**
- **Why it's a dead end — both exits are closed:**
  - `LIFECYCLE_TRANSITIONS` (same file) = `suspend: verified→suspended`,
    `reinstate: suspended→verified`, `deactivate: verified|suspended→deactivated`.
    **There is no `pending→verified` transition.**
  - `approve_company_verification()` requires a `company_verification_requests` row, which this
    path never creates.
  - Net: a staff-created company can never become `verified`, so its jobs can never reach the
    public board (`jobs_select_approved` requires `companies.status='verified'`). Only manual
    SQL can rescue it.
- **Risk:** P1 functional. Not a security hole (fails closed), but any client onboarded by staff
  through the admin portal is silently non-functional.
- **Fix — requires an `admin-companies` deploy; pick ONE and document it:**
  - **(a) Recommended — keep one audited approval path.** In the POST create branch, after the
    company insert, also insert `company_verification_requests { company_id, submitted_by:
    userId, channel: <allowed value>, status: 'submitted' }` (`submitted_by` is **nullable**, so
    a staff submitter is representable). The company then appears in the normal queue and is
    approved by the same proven RPC. Verify the `channel` CHECK constraint's allowed values
    before coding.
  - **(b)** Add a `verify: pending→verified` lifecycle action gated on
    `companies:approve`. Simpler, but creates a second approval path that bypasses
    `approve_company_verification()` — it would **not** flip `invited` members to `active`,
    so members would need separate handling. Only choose this if staff-created companies are
    never expected to have pending members.
- **Deploy caution:** this backend rebuilds **every** edge function on **every** deploy, and
  `admin-companies` imports `_shared` (must ship bundled — the deployed copy has `_shared`
  inlined). Re-fetch `/api/functions/admin-companies` after deploying to confirm.
- **Launch note:** the 5 stranded companies are all test/legacy rows and are covered by the
  planned fresh-launch wipe, so no data repair is needed if the wipe happens first.

### F-23.3 · P1 — legacy auth-adjacent callers still reachable (R3-4)
- **Evidence:** `app/(auth)/verify-recruiter/page.tsx:89` still calls the deployed
  `activate-recruiter` edge function; `components/auth/RequestAccessForm.tsx` (imported nowhere)
  still targets `recruiter-request`.
- **Why:** `activate-recruiter` predates the rewire and can produce recruiter state outside the
  new pipeline — the exact legacy design that created the 26 orphans.
- **Fix:** delete/redirect the `verify-recruiter` page to the new two-step flow
  (`/signup/recruiter` → `/onboarding/recruiter/setup`); delete the orphaned form component.
  **Leave the edge functions deployed** (doc 21 §4 decision) — remove callers only.

### F-23.4 · P1 — Team + Email-Templates admin pages error for staff (F)
- **Evidence:** backing tables do not exist live; pages throw for staff users (doc 18 F-5).
- **Fix:** stub the pages ("coming soon", no fetch). **Do not create the tables.**

### F-23.5 · P2 — `GET /api/jobs?scope=company` leaks other tenants' public jobs into the list
- **Evidence (2026-07-27):** recruiter list returned `total=3` — own job + `11111111` +
  `33333333` (other companies' board-public jobs).
- **File/function:** `app/api/jobs/route.ts` GET. Comment claims RLS scopes to own company;
  actually SELECT policies union `jobs_select_company` ∪ `jobs_select_approved`.
- **Risk:** functional, not security (rows are public data), but tenant dashboards show foreign
  jobs and wrong counts.
- **Fix:** resolve the caller's company (their `company_members` row) and add
  `.eq('company_id', …)` explicitly. Never rely on the policy union for scoping semantics.

### F-23.6 · P2 — recruiter PATCH accepts illegal `status` transitions
- **Evidence:** doc 21 §4 item 9 — `draft→closed` etc. accepted on the recruiter path
  (`jobUpdateSchema` allows any `status` enum value); the state machine is enforced only on the
  admin path.
- **File:** `app/api/jobs/[jobId]/route.ts` + `lib/validation/jobs.ts`.
- **Fix:** either strip `status` from `jobUpdateSchema` (recruiters use publish/close routes
  only — simplest) or validate transitions server-side against doc 04's state machine.

### F-23.7 · P2 — legal pages name unowned domains; DPDP grievance-officer defect (S-3)
- **Evidence:** `terms`/`privacy`/`pending-approval` pages reference `talentmesh.com` /
  `talentmesh.app` — domains the project does not own; grievance-officer contact required under
  DPDP/IT Act is wrong or missing.
- **Fix:** replace with owned domain + real contact (`info@talentmeshsolutions.com` unless the
  user says otherwise). Indian-market compliance item — do not ship real users without it.

### F-23.8 · P2 — auth config is weak for production
- **Evidence (captured 2026-07-25, re-verify live):** `passwordMinLength: 8`, all of
  requireNumber/Lowercase/Uppercase/SpecialChar **false**; `disableSignup: false`.
- **Why:** 8-char unclassed passwords on a system holding recruitment PII.
- **Fix:** raise complexity requirements via `PATCH /api/auth/config` (project API key —
  **user runs this**, see doc 17 §3.1 precedent). Keep `requireEmailVerification: true`.

### F-23.9 · P3 — misc verified-open items
- **N-1:** public `jobs` function returns 500 where 401 is correct (doc 17).
- **`is_active` NULL semantics** ambiguous in `profiles` (doc 17 §4).
- **`audit_log.reason`** dead column (doc 17 §4).
- **Dead code deletion** (doc 18 PROMPT E) — sweep only, no behavior change.
- **Probe accounts** still to delete via InsForge dashboard (no API):
  `advisor-probe-recruiter-1785056309@example.com`, `gate-e-probe@example.com`,
  `ae1-regression-test-1785002114@example.com`, `a2-probe-1785003036_base@example.com`,
  `a2-probe-060-1785055030@example.com`.

---

## NOT AUDITED — do not claim readiness for these

The advisor track covered **admin portal + recruiter pipeline + jobs approval** only. No
equivalent audit exists for:

1. **Candidate portal** (applications, saved jobs, messages, offers, interviews tables and their
   RLS; profile/resume storage policies). Known open thread: the "logged in but no data" JWT
   cookie issue — verify whether the HttpOnly parent-domain cookie fix shipped.
2. **OAuth flows** (Google/LinkedIn) — cited in the original audit scope; never exercised in
   these sessions.
3. **Rate limiting / abuse controls** on public endpoints (`request-access` creates companies +
   role bumps: currently only authenticated-session-gated — check for per-user throttles).
4. **Subscriptions/billing** tables and entitlement enforcement beyond the active-job-limit
   trigger.

An executor claiming "production ready" for the candidate side without auditing item 1's RLS
surface is repeating the exact mistake docs 17–21 exist to prevent.
