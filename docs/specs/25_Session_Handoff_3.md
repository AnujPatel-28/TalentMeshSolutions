# 25 — Session Handoff #3

**Written:** 2026-07-27 (end of session) · **Role:** Advisor
**START HERE.** This supersedes the "what's next" of `21_Advisor_Session_Handoff_2.md` and
`22_Gate_E_Closure_And_Async_Params_Fix.md`. Those remain valid as *evidence records* — don't
re-verify what they mark proven.

**Read order for a cold session:** this doc → `23_Open_Security_Findings_Executor_Handoff.md`
(open findings, full detail) → `24_Candidate_Side_Security_Audit.md` (candidate side) → §5 traps
below before touching anything.

---

## 0. Status in one paragraph

**No known unfixed vulnerabilities.** Admin, recruiter and candidate sides have all been audited
against the live system, and every P0/P1 found has been closed and verified. The recruiter flow
has completed end-to-end (signup → onboarding → verification → admin approval → job lifecycle),
cross-company isolation is proven, and candidate data isolation is proven. What remains before
real users is **not investigation** — it is a short list of specified fixes (§2), one product
decision (F-23.2), and the deferred India compliance work (§3). `origin/main` is **`8a6574c`**.

---

## 1. Closed — do NOT re-verify

| Item | Evidence |
|---|---|
| Admin-portal P0/P1s (AE-1, A, B, C, A2, R3-7) | doc 22 §3, live-verified |
| **Gate E incl. cross-company row scoping** | doc 22 §3 — first proof ever |
| `approve_company_verification()` atomic | doc 22 §1 — first real execution |
| **`withApi` async-params P0** (all 9 dynamic routes 404'd) | `f9f6a86`, prod-verified |
| Legacy `/verify-recruiter` retired (F-23.3) | `5b3f1ad`, prod 307 → signup |
| Job list company-scoped (F-23.5) | `5b3f1ad`, prod: 4 jobs, 1 company |
| Illegal status transitions rejected (F-23.6) | `5b3f1ad`, prod 400 |
| Team/Email-Templates stubbed (F-23.4) | `5b3f1ad` |
| **PATCH data-loss bug** (Zod `.default()` under `.partial()` wiped `requirements`/`skills_required`, reset currency to INR) | `5b3f1ad`, prod-verified |
| R3-5 "24 orphaned recruiters" | **dismissed** — 22 are `@example.com` test artifacts, 2 are the owner's own accounts. Doc 23 F-23.1 |
| **F-24.1** candidate writing recruiter-owned application columns | migration **062 APPLIED** + verified (`8a6574c`) |
| **F-24.2** cross-candidate resume access | **SAFE** — non-owner 404, service key 302, signed CDN URLs ~1h TTL |
| Salary Guide removed from candidate dashboard | `d367ec7` |

---

## 2. Open work, ranked

### P1 — F-23.2 · staff-created companies can never be verified ⚠ NEEDS A DECISION
**Confirmed:** all 8 companies have **zero** `company_verification_requests` rows; 5 sit at
`pending` and can never appear in the Verification Queue (the queue reads that table).
6 code paths insert companies; only `request-access` creates a request row.
**Decide one, then implement:**
- **(a) recommended** — admin company-create also inserts a `submitted` verification request →
  one audited approval path for everything.
- (b) admin-created companies start `verified` as an explicit, audit-logged staff action.

Either needs an **edge-function deploy** (`admin-companies`) — batch it with other backend work.
Also fix the 5 existing stranded `pending` companies (only `Talentmesh Solutions`, `chatgpt`,
`google` are `verified`).

### P2 — pre-launch hardening
| # | Item | Notes |
|---|---|---|
| 1 | **Password policy** — `passwordMinLength: 8`, all complexity flags **false** | Weakest thing left. `PATCH /api/auth/config` with the project API key. **User runs this** (it's an auth-weakening-adjacent call; precedent doc 17 §3.1). Keep `requireEmailVerification: true`. |
| 2 | **Legal pages / DPDP** (S-3, F-23.7) | `terms`/`privacy`/`pending-approval` name unowned `talentmesh.com`/`.app`; grievance-officer contact wrong/missing. Compliance blocker for India. |
| 3 | **Rate limiting** | None verified on signup / `request-access` / login. `resume-proxy` has 60/min. `auth_attempts` + `user_rate_limits` tables exist but `auth_attempts` has **0 rows** — appears unused/dead. |
| 4 | F-24.3 dead `x-insforge-url` / `x-insforge-service-key` override headers in 15 edge fns | Deployed runtime **ignores** them (tested). Latent footgun; strip. |

### P3
N-1 (`jobs` returns 500 where 401 is correct) · `is_active` NULL semantics · `audit_log.reason`
dead column · dead-code sweep (doc 18 PROMPT E) · recruiter job state machine hardening.

### NOT AUDITED — do not claim readiness for these
1. **OAuth (Google / LinkedIn)** — configured (`get-backend-metadata` lists google, linkedin,
   github) but **never exercised end-to-end**. In the original audit scope.
2. **"Logged in but no data" JWT-cookie issue** — not reproduced or confirmed fixed.
3. **AI-interview tables** (`ai_interviews`, `live_ai_interviews`) — 0 rows, policies unprobed.
4. **Billing/subscriptions** entitlement enforcement beyond the active-job-limit trigger.

---

## 3. Deferred by the user until the system is feature-complete

**India DPDP / IT Act compliance**: consent checkboxes (granular, unticked by default, withdrawal
path), Data Principal rights flows (access / correction / erasure — each needs a real code path,
not just policy prose), grievance officer, breach-notification readiness, retention policy, and
the permission matrix mapped to those obligations. Structure it so GDPR overlaps cleanly for the
planned international expansion.

⚠ **Do not write consent/compliance text from model knowledge.** DPDP rules have been moving —
**research the current operative rules and cite sources** at the time the work is done. Recommend
counsel review of final policy text; the agent's job is making the *system* do what the policy
promises.

---

## 4. Launch plan (user's stated intent)

At launch, **all accounts will be deleted except the two staff accounts** (`super_admin` +
`admin`) — a totally fresh start. Consequences:
- Don't invest in migrating/backfilling existing user data; it's all disposable.
- The 5 probe accounts (doc 23 F-23.9) and remaining test data get wiped by that reset anyway.
- **Re-run a smoke test after the wipe** — a fresh DB with 0 companies/jobs exercises empty-state
  paths nobody has tested.

---

## 5. Environment + traps — read before touching anything

- **Backend** `https://sytk3jgv.ap-southeast.insforge.app` · functions
  `https://sytk3jgv.functions.insforge.app` · **frontend** `https://anujpotfolio.qzz.io`
  (Vercel behind Cloudflare), subdomains `app.` / `admin.` / `jobs.`.
- **Push to `main` ≠ deploy.** Vercel is on the **work partner's Hobby plan**; only the account
  owner's commits build. The partner pushes a trivial `README.md` edit to trigger a build, which
  then ships whatever is at the tip of `main`. Expect README-only commits — rebase onto them,
  never force-push over them. **Always verify deploys behaviorally.**
- **`insforge db query` needs SINGLE-LINE SQL.** The Windows `.cmd` shim truncates at the first
  newline **and still prints "Query executed successfully."** Never trust that message — always
  re-read state. The backend also intermittently returns **504**; a 504 is not a result, retry.
- **Migrations: human applies — never an agent.** (Migration 062 was a one-time explicit override
  by the user; the rule stands.)
- **Localhost cannot test routing.** `proxy.ts` branches on the `Host` header and short-circuits
  on localhost, so every portal gate is skipped. Vercel preview URLs are equally useless
  (`app.<preview>.vercel.app` doesn't exist). It *is* fine for reproducing pure API/handler bugs —
  that's how the async-params P0 was found.
- **Git hygiene:** the working tree carries **~88 dirty files** (an unrelated public-route
  restructure) and the local `main` ref is **stale**. Ship every change from a **clean worktree off
  `origin/main`** with explicit paths. **Never `git add -A` / `git commit -a`.**
- **Edge functions:** InsForge rebuilds *every* function on *every* deploy; never deploy a
  `_shared`-importing function unbundled; a failed build still persists the upload, so re-fetch
  `/api/functions/<slug>` to confirm. Deployed source has drifted from local `.ts` before —
  **read live before editing.**
- **Quote contracts from the implementation, never from these docs.** Doc contract claims have
  been wrong at least three times (doc 14 audit rows, doc 17 `recruiter_profiles.is_approved`,
  doc 04 `{items,total}`).
- **A 200 that renders empty is invisible to error-hunting.** When the API is provably correct and
  the screen is blank, read the *parsing* next.
- **`401` ≠ `403`.** 403 = authenticated then role-rejected; 401 = no/expired `tm_access_token`.

### Credentials
- Staff: `anujpatel30106@gmail.com` (`super_admin`), `vishalsuthar2711@gmail.com` (`admin`).
  **The user holds all passwords — ask, don't search the repo.**
- Candidate test account: `nikavx28@gmail.com` (role `candidate`, owns 0 resumes / 0 applications).
  Its password was changed mid-session; **ask the user for the current one.**
- ⚠ **Hygiene debt:** doc 21 §2 contains a *plaintext* (now-stale) password for that account,
  committed to the repo. **Recommend: purge it from the doc and rotate anything that ever appeared
  in git.** Do not add new secrets to docs.

---

## 6. Useful verified techniques from this session

- **Simulating a user at the DB level** (when no live token is available) — a single-line `DO`
  block that `SET LOCAL ROLE authenticated` + `set_config('request.jwt.claims', …)`, performs the
  write, captures `GET DIAGNOSTICS ROW_COUNT` into a scratch table, then restores the row and
  `RESET ROLE`. This is how F-24.1 was both proven and re-verified after the fix. `auth.uid()`
  reads `request.jwt.claim.sub` / `request.jwt.claims->>'sub'`. Drop the scratch table afterwards.
- **Distinguishing "denied" from "not found"** — re-fetch the same object with the service key. A
  404 for the user + 302/200 for the service key proves the resource exists and the 404 is
  authorization. That's what closed F-24.2.
- **Safe test for a suspected SSRF/override header** — point it at a guaranteed-unresolvable host
  (`https://invalid.invalid`). If behaviour is unchanged the header is ignored, and **nothing is
  transmitted to any third party**.

---

## 7. Is it production ready?

**Security: yes, on current evidence.** Every audited surface has been verified live, and no known
vulnerability is open.

**Product: nearly.** Ship-blockers are the F-23.2 decision, the password policy, and the legal /
DPDP pages. OAuth remains the largest untested surface — a real user signing in with Google is a
path nobody has walked end to end, and it's the *first* thing most users will touch.

**Recommended order:** F-23.2 decision → password policy → OAuth smoke test → legal/DPDP pages →
fresh-DB smoke test after the launch wipe.
