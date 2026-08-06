# 28 — Session Handoff #4 · Launch Delivery Lead

**Written:** 2026-07-31 · **Supersedes the "what's next" of** `26_Legal_DPDP_Compliance_Handoff.md`.
**START HERE.** Doc 26 remains the source of truth for the legal workstream itself; this doc is the
current state, the open blockers, and how to run the work.

---

## 0. Your role

You are the **lead engineer, architect, and advisor** for end-to-end delivery of TalentMesh to
production — safely. That means:

- **You own the verdict**, not the typing. Decide what ships, what blocks, and what is a real risk
  versus paperwork. Say "not ready" when it isn't; the user has consistently preferred a blunt no to
  a hedged yes.
- **Delegate execution to Sonnet or Haiku.** Write self-contained prompts (see §7). Spend your own
  budget on deciding, reviewing, and catching what a cheaper model will miss — that is where every
  save in this project has come from.
- **Verify before you believe.** Every single time this project has trusted a document, a comment, or
  an agent's summary, it has been wrong. See §5. This is not caution theatre; it is the load-bearing
  habit.
- **The user is near their usage limits.** Don't re-derive settled facts, don't re-audit what §2
  already records as verified, and don't spawn agents unless asked.

---

## 1. Read order for a cold session

1. This doc.
2. `26_Legal_DPDP_Compliance_Handoff.md` — §9 (InsForge processor position, verified against the
   contracts), §10 (why `compliance_blueprint.md` must never be used), §11 (AI features are coded
   but not running), §6 (traps).
3. `27_Pre_Launch_Test_Script.md` — the test script; §6 below is your job on it.
4. `insforgeSupport_QA.md` — retention answers, needed for any retention claim.
5. `DPDO_refrence.md` — legal reference the user supplied for the L-8 drafting session.

---

## 2. Verified current state — 2026-07-31

Everything here was checked against production, the live database, or `origin/main`. Do not
re-verify; do not accept a doc that contradicts it without new evidence.

### Shipped and live
- **DPDP phases 1–3 merged and deployed.** `origin/main` = `649b96a`. Production `/terms` returns
  200 containing `TALENTMESH SOLUTIONS (OPC)`, CIN `U78100GJ2025OPC162430`,
  `info@talentmeshsolutions.com` and a Grievance Officer section.
- **Migrations 063 (consent_records) and 065 (data_principal_requests) applied.** 065 verified live:
  11 columns, `consent_records.user_id` FK is `ON DELETE SET NULL` (so consent evidence outlives an
  erased account), `authenticated`/`anon` hold **SELECT only**.
- **064 (drop dead tables) written, NOT applied.** P2, post-launch. It drops 13 tables — never run it
  casually.
- **Edge-function deploys work again.** Root cause was ours: InsForge does not support `_shared/` or
  any cross-function relative import, and one function with a raw import fails the *whole* project
  build. All functions must be uploaded **pre-bundled**. See §5.
- Legal entity: **TALENTMESH SOLUTIONS (OPC) PRIVATE LIMITED**, CIN `U78100GJ2025OPC162430`.
  Domain `talentmeshsolutions.com`. Only working mailbox: `info@talentmeshsolutions.com`.
  `talentmesh.com`, `.app`, `.in` are **not owned** — any occurrence is a bug.

### Built but never exercised
- `consent_records` = **0 rows**. `data_principal_requests` = **0 rows**. Nothing has walked L-2,
  L-3 or L-4 in production. Doc 27 exists to fix that and has not been run.

---

## 3. Open blockers — nothing launches until these close

### B-1 · OAuth signup bypasses consent and the age gate · **P0, confirmed**
`consent_records` is written from exactly four places: `app/api/auth/signup/route.ts`,
`app/api/auth/verify/route.ts`, `app/api/consent/withdraw/route.ts`, `app/api/dpdp/requests/route.ts`.
The OAuth path — `app/api/auth/oauth/exchange/route.ts` and `app/auth/callback/page.tsx` — writes
**nothing**. A Google or LinkedIn signup therefore creates an account with **no consent record and no
18+ attestation**. OAuth is the first thing most candidates touch.

Cheapest fix: after a *first-time* OAuth exchange, route to a one-screen consent + 18+ interstitial
before the dashboard, writing the same rows as `signup/route.ts`; returning users skip it. Reuse
`lib/consent/copy.ts`. Detected by test D2 in doc 27.

### B-2 · No rate limiting anywhere · **P0**
`auth_attempts` exists with 0 rows and nothing writes to it. Signup, login and `request-access` are
all unthrottled. This is the one remaining item that is a genuine DPDP "reasonable security
safeguards" gap rather than paperwork.

### B-3 · Terms + Privacy are still placeholders · **P0**
L-8. The user has budgeted a dedicated session for this (§6). Needs counsel review after drafting.

### B-4 · Grievance Officer not appointed · **P0, user action**
The page renders a visible placeholder — correct, not hidden — but a statutory contact cannot ship
blank. Needs name, designation, email, postal address.

### B-5 · Doc 27 has never been run
Until section A passes, the entire legal workstream is theoretical.

---

## 4. Launch gate

Do not agree to launch until **all** are true:

- [ ] Doc 27 sections A, B, C, D, E all pass, with DB output recorded
- [ ] B-1 fixed and retested (D2 returns non-zero)
- [ ] B-2 rate limiting live
- [ ] B-3 Terms + Privacy written and counsel-reviewed
- [ ] B-4 Grievance Officer named and published
- [ ] L-6 breach runbook written
- [ ] Launch wipe done, then empty-state paths re-smoked (nobody has exercised a fresh DB)
- [ ] OAuth walked end to end by a human with a real Google account

Post-launch, not blockers: 064 cleanup · `admin-dashboard`'s live `unwrap()` fix committed back to
the repo · the `_shared/` directory in `insforge/functions/` (now known-unsupported).

---

## 5. Traps — every one of these has already cost time

- **Never trust a document.** `compliance_blueprint.md` calls itself the compliance single source of
  truth and is wrong on 13 counts (doc 26 §10) — including a consent timestamp and a cookie banner
  that do not exist. It is banner-demoted. Never hand it to a drafting session.
- **Never audit from `C:\Users\Anuj\Desktop\tm_web\Talentmesh-demo`.** It sits on
  `fix/n2-job-approval-ssot`, ~39 commits behind, with ~110 dirty files. Two agents once reached
  opposite conclusions about whether a route existed purely because one read that tree and the other
  read `origin/main`. **Always use a clean worktree off `origin/main`.**
- **Deployed edge functions drift from the repo.** `insforge functions code <slug>` is the truth.
  `admin-dashboard`'s live copy had an `unwrap()` guard the repo lacked — deploying from `origin/main`
  would have silently reverted a production fix.
- **Edge functions must be bundled before deploy.**
  `npx esbuild <fn>/index.ts --bundle --format=esm --platform=neutral --external:npm:* --outfile=out.ts`
  then `insforge functions deploy <slug> --file out.ts`. Install esbuild once — `npx` per file costs
  ~10s and will time out. One raw `../_shared/...` import fails every function's build.
- **`deployedAt` advances even on failed builds.** Stored ≠ live. Verify behaviorally, always.
- **`insforge db query` needs SINGLE-LINE SQL.** The Windows shim truncates at the first newline
  **and still prints success**. Re-read state after every write.
- **Push to `main` ≠ deploy.** Vercel builds on the partner's commits (Hobby plan). Never force-push
  over them.
- **A page returning 200 does not mean the journey completes.** Password reset returned 200 on every
  page while being broken end to end for weeks.
- **Migrations are applied by a human**, unless the user explicitly delegates. Write the `.sql`.
- **`insforge diagnose --ai "<question>"` is genuinely good.** It solved the deploy outage in one
  shot after a day of probing. Reach for it early on InsForge-side puzzles.

---

## 6. Work queues

### Queue A — testing (highest value, do first)
Get doc 27 run. Your job is not to run it but to **triage the results**: decide which failures block
launch and which are noise. Expect D2 to fail — B-1 is confirmed. If A3 fails, stop everything else.

### Queue B — the user's dedicated drafting session
The user has budgeted a session specifically for **L-8 Terms + Privacy** and **L-6 breach runbook**.
Inputs are all ready and verified — do not re-derive them:
- `DPDO_refrence.md` (legal reference)
- doc 26 §9.2 (verified sub-processor + data-flow table), §9.4 (divergences), §10, §11
- `insforgeSupport_QA.md` — retention: automated DB backups **7 days**, no PITR, object deletion is a
  synchronous hard delete with bytes never in DB backups, CDN ≤1 h private / ≤7 days public.
  ⚠ **Manual backups are retained indefinitely** — erasure is incomplete while one exists.
- Cross-border: deployment is **entirely outside India**. Lawful under DPDP §16's negative list (no
  restricted-country list notified), so this is a **disclosure** obligation, not a localisation one.
  Do not let anyone turn it into a "move to India" project.
- **The notice must not claim AI processing** — doc 26 §11: résumé parsing and match scoring do not
  run. Equally, do not claim "no AI"; one live path remains. Describe what the system actually does.
- Research current operative rules and cite sources at drafting time. Recommend counsel review.

### Queue C — engineering, delegate to Sonnet
B-1 (OAuth consent interstitial) and B-2 (rate limiting), then whatever doc 27 turns up.

### Queue D — the doc review the user asked for
Review the **recruiter, company, and admin rebuild** documentation for coherence under the
**company-first** approach (a company exists and is verified before recruiters attach to it). Docs
06/07 (recruiter portal, company management), 11–15 (admin portal audit, rebuild, verification),
and 20 (Phase 3 recruiter onboarding).

Judge them as an architect, and apply §5: **these documents have been wrong before.** For each
claimed behaviour, check the implementation before accepting it. Expect to find (a) contract claims
that no longer match the schema — `company_profiles` does not exist, the table is `companies`, dropped
in migration 046; `resumes` does not exist, it is `candidate_resumes`; (b) features described as
shipped that are not; (c) ordering assumptions that company-first breaks. Report divergences the way
doc 26 §10 does — a table of claim, verified reality, risk.

---

## 7. How to delegate

Sonnet and Haiku are the execution employees. What has worked:

- **One self-contained prompt per phase.** Include the hard rules from §5 — they do not know them.
- **Name the exact files and line numbers**, and tell them line numbers may have moved and to re-grep.
- **State what NOT to do**, explicitly and by name. The 064 migration drops 13 tables; a prompt that
  merely says "apply the migration" is a loaded gun.
- **Demand a verification step with expected values**, and a canary where something destructive is
  nearby. Do not accept "CLI reported success".
- **Make them report what they could not verify.** The best output from these sessions has been the
  honest "this is not atomic and here is the gap" note.
- **Review what comes back against the live system**, not against their summary. A Sonnet session
  correctly implemented consent capture but wrote it *after* account creation and swallowed the
  failure — inverting that ordering was the whole value of the review.

---

## 8. What NOT to do

1. Do not draft policy prose from model knowledge — research and cite, recommend counsel review.
2. Do not apply migrations unless the user delegates it explicitly; never 064 by accident.
3. Do not build per-tenant subdomains or per-audience profile tables — rejected by the user
   (`suggestionidea.md`).
4. Do not raise password minimums on sign-in paths. `loginSchema` is deliberately presence-only;
   raising it locks out accounts created under the old rule. Guarded by
   `npx tsx lib/validation/auth.password.test.ts`.
5. Do not treat the launch wipe as data migration. All accounts except the two staff ones are deleted
   at launch — but **do** re-smoke the empty-state paths afterwards.
6. Do not add DOB collection to strengthen the age gate. The attestation is the proportionate control;
   DOB is more personal data for no compliance gain.
7. Do not surface consent UI for `resume_parsing_ai` or `analytics_cookies` — those features do not
   run, and consent for processing that does not happen is its own misstatement.

---

## 9. Repo hygiene as of 2026-07-31

Cleaned this session: merged branches deleted, stale worktrees pruned, two stranded test fixes
rescued onto `origin/main`, and this doc set committed.

**Left alone deliberately:** the main working tree at `Talentmesh-demo` — ~110 dirty files including
in-flight `app/api/recruiter/request-access/route.ts` work. Only the user knows what is still wanted
there. Do not reset it, do not `git add -A` in it, and do not read "current state" from it.
