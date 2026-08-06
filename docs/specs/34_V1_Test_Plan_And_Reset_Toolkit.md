# 34 — V1 Test Plan & Reset Toolkit

**Written:** 2026-08-01 · **For:** the human tester + a Haiku assistant working together.
**Supersedes nothing** — this is the operational companion to `27_Pre_Launch_Test_Script.md`, built
around the real constraint: **only two real mailboxes exist.**

| Role | Mailbox | Used for |
|---|---|---|
| Recruiter | `info@talentmeshsolutions.com` | every recruiter and company scenario |
| Candidate | `testingmesh123@gmail.com` | every candidate and DPDP scenario |
| Admin | existing staff account | approvals, queues, moderation |

Because accounts cannot be created freely, **every scenario ends by resetting state rather than
abandoning an account.** Part 1 is the reset toolkit; run the relevant reset *before* each scenario
so you always start from a known state.

---

## Part 0 — How the two of you work

**The human does:** anything in a browser. Clicking, filling forms, reading email, judging UI.

**The assistant (Haiku) does:** SQL only. Reads state, verifies expectations, runs resets. It must
never tell you a test passed based on the screen — only on rows.

**Standing prompt — paste once at the start of an assistant session:**

```
You are the QA data assistant for TalentMesh. Your ONLY job is running SQL against the InsForge
production database to verify test outcomes and reset test accounts between scenarios.

## Absolute prohibitions
- NEVER delete or modify a row belonging to any email other than the two test accounts:
  info@talentmeshsolutions.com and testingmesh123@gmail.com. Every DELETE and UPDATE you run must
  be scoped by one of those emails or by an id you derived from one of them in the same session.
- NEVER run a DELETE without a WHERE clause. NEVER TRUNCATE.
- NEVER apply a migration. NEVER run insforge/migrations/064_drop_dead_tables.sql (drops 13 tables).
- NEVER delete rows from `consent_records` except via the explicit reset in Part 1.4 — that table is
  legal evidence, and outside a reset it must be treated as append-only.
- Do NOT modify application code. You are a data assistant, not a developer.

## How to run SQL
npx @insforge/cli db query "<SQL>"
SQL MUST be a single line. The Windows shim truncates at the first newline AND STILL PRINTS
SUCCESS. After every write, re-read the affected rows to confirm the write actually happened.

## How to report
Paste the raw rows returned. Never summarise a result as "looks correct". State the expected value,
the actual value, and PASS or FAIL. If a query returns zero rows where rows were expected, that is a
FAIL, not an absence of information.

## Before any destructive reset
Print the rows you are about to delete, state the count, and wait for the human to confirm.
```

---

## Part 1 — Reset toolkit

Run the relevant reset **before** a scenario, not after — a crashed scenario leaves junk, and you
want a clean start regardless of how the previous one ended.

> Every statement is single-line, ready to paste. Always re-read after writing.

### 1.0 Get the two user ids (do this first each session)

```sql
SELECT id, email, role, completed_onboarding FROM profiles WHERE email IN ('info@talentmeshsolutions.com','testingmesh123@gmail.com');
```

### 1.1 Reset the RECRUITER to "just verified email, no company yet"

Puts the account back to the state right after email verification — the start of the company form.
Run in this order; FKs matter.

```sql
DELETE FROM company_verification_requests WHERE company_id IN (SELECT company_id FROM company_members WHERE user_id = (SELECT id FROM profiles WHERE email = 'info@talentmeshsolutions.com'));
```
```sql
DELETE FROM jobs WHERE company_id IN (SELECT company_id FROM company_members WHERE user_id = (SELECT id FROM profiles WHERE email = 'info@talentmeshsolutions.com'));
```
```sql
DELETE FROM companies WHERE id IN (SELECT company_id FROM company_members WHERE user_id = (SELECT id FROM profiles WHERE email = 'info@talentmeshsolutions.com'));
```
```sql
DELETE FROM company_members WHERE user_id = (SELECT id FROM profiles WHERE email = 'info@talentmeshsolutions.com');
```
```sql
UPDATE profiles SET role = 'candidate', completed_onboarding = false WHERE email = 'info@talentmeshsolutions.com';
```

**Verify the reset — must return `candidate`, `false`, `0`, `0`:**
```sql
SELECT p.role, p.completed_onboarding, (SELECT count(*) FROM company_members m WHERE m.user_id = p.id) AS memberships, (SELECT count(*) FROM companies c JOIN company_members m2 ON m2.company_id = c.id WHERE m2.user_id = p.id) AS companies FROM profiles p WHERE p.email = 'info@talentmeshsolutions.com';
```

> **Why role goes back to `candidate`:** that is the real post-signup state. `bumpToRecruiter()`
> promotes at company-form submission. Resetting to `recruiter` would skip the exact transition
> most of these tests exist to exercise.

### 1.2 Reset the CANDIDATE to "verified, no profile, no applications"

```sql
DELETE FROM application_status_history WHERE application_id IN (SELECT id FROM applications WHERE candidate_id = (SELECT id FROM profiles WHERE email = 'testingmesh123@gmail.com'));
```
```sql
DELETE FROM applications WHERE candidate_id = (SELECT id FROM profiles WHERE email = 'testingmesh123@gmail.com');
```
```sql
DELETE FROM saved_jobs WHERE user_id = (SELECT id FROM profiles WHERE email = 'testingmesh123@gmail.com');
```
```sql
DELETE FROM candidate_resumes WHERE user_id = (SELECT id FROM profiles WHERE email = 'testingmesh123@gmail.com');
```
```sql
DELETE FROM candidate_profiles WHERE id = (SELECT id FROM profiles WHERE email = 'testingmesh123@gmail.com');
```
```sql
UPDATE profiles SET completed_onboarding = false WHERE email = 'testingmesh123@gmail.com';
```

**Verify — all counts 0, `completed_onboarding` false:**
```sql
SELECT p.completed_onboarding, (SELECT count(*) FROM applications a WHERE a.candidate_id = p.id) AS apps, (SELECT count(*) FROM candidate_profiles cp WHERE cp.id = p.id) AS cprofile, (SELECT count(*) FROM candidate_resumes r WHERE r.user_id = p.id) AS resumes FROM profiles p WHERE p.email = 'testingmesh123@gmail.com';
```

> Résumé **files** in storage are not deleted by this. Delete them from the InsForge dashboard
> Storage browser when a scenario depends on "no résumé present".

### 1.3 Clear the outage-era orphaned consent rows (run once)

The dead-function window left consent rows with no account attached. They will confuse every DPDP
count until cleared.

```sql
SELECT email, count(*) AS orphans FROM consent_records WHERE user_id IS NULL GROUP BY email ORDER BY orphans DESC;
```
Review that list with the human, then, for the two test emails only:
```sql
DELETE FROM consent_records WHERE user_id IS NULL AND email IN ('info@talentmeshsolutions.com','testingmesh123@gmail.com');
```

### 1.4 Reset consent for a fresh DPDP run

Only between DPDP scenarios. Outside these tests, `consent_records` is append-only evidence.

```sql
DELETE FROM consent_records WHERE email = 'REPLACE_WITH_TEST_EMAIL';
```
```sql
DELETE FROM data_principal_requests WHERE email = 'REPLACE_WITH_TEST_EMAIL';
```

### 1.5 Full baseline snapshot (run at the start and end of every session)

```sql
SELECT (SELECT count(*) FROM profiles) AS profiles, (SELECT count(*) FROM consent_records) AS consent, (SELECT count(*) FROM data_principal_requests) AS dpr, (SELECT count(*) FROM companies) AS companies, (SELECT count(*) FROM jobs) AS jobs, (SELECT count(*) FROM applications) AS apps;
```

### 1.6 Delete the probe accounts left from the migration (run once)

```sql
SELECT id, email FROM profiles WHERE email LIKE 'tm-probe%' OR email LIKE 'ponytail_repro%';
```
Confirm the list, then delete those profiles from the InsForge dashboard (Auth section) so the auth
user is removed too, not just the profile row.

---

## Part 2 — Test scenarios

Record for each: **PASS / FAIL**, date, and the raw SQL output. A screen that looks right is not a
pass — password reset returned 200 on every page while broken end to end for weeks.

### Suite A — Recruiter signup and onboarding

*Reset 1.1 first.*

| # | Step (human) | Expected | Assistant verifies |
|---|---|---|---|
| A1 | `/signup/recruiter`, tick everything except 18+ | Refused, message names the age confirmation | `SELECT count(*) FROM consent_records WHERE email='info@talentmeshsolutions.com';` → unchanged |
| A2 | Same, but leave "account processing" unticked | Refused, names the missing consent | same → unchanged |
| A3 | Tick Terms + processing + 18+, leave marketing unticked. Submit | Lands on verify-email screen | **3 rows** — `terms_of_service`, `account_processing`, `age_18_plus`; all `granted`; `user_id` NULL; `notice_version` set; **no `marketing_email` row** |
| A4 | Confirm the email code | Proceeds to company form | Same 3 rows now all have **non-NULL, identical `user_id`** |
| A5 | Check the signup form | **No** checkbox mentioning résumé parsing, AI, or analytics | — |
| A6 | Submit the company form | Lands on `/pending-approval` | `role='recruiter'`, `completed_onboarding=true`, membership `invited`/`active`, company `pending`, request `submitted` |
| A7 | Log out, log back in | **`/pending-approval` directly — NOT the company form** | Same as A6, still pending |

> **A7 is the regression that has already bitten once.** If you see the company form again, the
> `completed_onboarding` fix did not take.

**A6 / A7 verification query:**
```sql
SELECT p.email, p.role, p.completed_onboarding, m.status AS member, c.status AS company, r.status AS request FROM profiles p LEFT JOIN company_members m ON m.user_id = p.id LEFT JOIN companies c ON c.id = m.company_id LEFT JOIN company_verification_requests r ON r.company_id = c.id WHERE p.email = 'info@talentmeshsolutions.com';
```

### Suite B — The approval gate (the security half)

| # | Step | Expected |
|---|---|---|
| B1 | While still pending, type `app.<host>/dashboard/recruiter/<id>` directly into the address bar | **Bounced to `/pending-approval`.** Any recruiter page rendering is a **blocker** |
| B2 | While still pending, try to reach the job-posting page directly | Bounced |
| B3 | Admin approves the company | — |
| B4 | Recruiter logs in | **`/recruiter/dashboard` renders** |
| B5 | Re-run the A6 query | `verified` / `active` / `approved` |

> B1 and B4 must **both** pass. B4 alone proves nothing — a gate that lets everyone through also
> lets approved users through.

**Orphaned-company detector — must return 0 rows:**
```sql
SELECT c.id, c.name, c.status, m.id IS NULL AS no_member, r.id IS NULL AS no_request FROM companies c LEFT JOIN company_members m ON m.company_id = c.id LEFT JOIN company_verification_requests r ON r.company_id = c.id WHERE m.id IS NULL OR r.id IS NULL;
```
Rows dated before 2026-07-31 are known pre-existing damage. Rows dated after mean the
`request-access` rollback is not firing — **report immediately**.

### Suite C — DPDP: consent, withdrawal, rights

*Candidate account. Reset 1.2, then 1.4 for the candidate email.*

| # | Step | Expected | Verify |
|---|---|---|---|
| C1 | Candidate signup with all consents incl. profile-visible; leave marketing unticked | 4 rows granted, no marketing row | as A3 but 4 purposes |
| C2 | Settings → privacy panel | Consents listed; `marketing_email` and `profile_visible_to_recruiters` withdrawable; the three required ones shown but **disabled with a reason** | — |
| C3 | Withdraw profile-visible | — | **2 rows** for that purpose: original `granted` + new `withdrawn`. **Only 1 row = the code did an UPDATE = FAIL** |
| C4 | Recruiter (other browser) searches candidates | **Candidate does not appear.** Before C3 they did | — |
| C5 | Re-grant | Recruiter search finds them again | **3 rows**, ending `granted` |
| C6 | Raise an access request, then a correction request | — | `data_principal_requests`: `kind`, `status='open'`, `due_at` future, `user_id` non-NULL |
| C7 | Admin opens the request queue | Both visible and actionable; closing one sets `status` + `completed_at` | — |

**C3 / C5 query:**
```sql
SELECT purpose, status, created_at FROM consent_records WHERE email = 'testingmesh123@gmail.com' AND purpose = 'profile_visible_to_recruiters' ORDER BY created_at;
```

> **C4 is the one people skip and the one that matters.** A withdrawal that changes nothing is a
> promise the platform breaks.

### Suite D — Erasure (run LAST in any session)

Erasure destroys the candidate account, so schedule it at the end.

| # | Step | Expected |
|---|---|---|
| D1 | Candidate applies to one live job, uploads a résumé | Application exists |
| D2 | Raise an erasure request; admin actions it | — |
| D3 | Verify | Profile gone/anonymised; **the application is NOT silently destroyed** (recruiter-owned columns survive per migration 062); **consent rows still exist with `user_id` now NULL** |
| D4 | Try the résumé URL | 404s. A CDN copy may persist ≤1 h — retest after an hour |

```sql
SELECT count(*) AS apps_remaining FROM applications WHERE candidate_id = 'THROWAWAY_USER_ID';
```
```sql
SELECT count(*) AS consent_rows, count(user_id) AS still_linked FROM consent_records WHERE email = 'testingmesh123@gmail.com';
```

### Suite E — ATS: the three roles working together

The end-to-end proof. Reset 1.1 and 1.2 first; recruiter must be approved.

| # | Actor | Step | Expected |
|---|---|---|---|
| E1 | Recruiter | Post a job | Created, **not publicly visible yet** |
| E2 | Candidate | Browse public jobs | The job does **not** appear |
| E3 | Admin | Approve the job | — |
| E4 | Candidate | Browse public jobs | Job appears; **company name and logo render, not blank** |
| E5 | Candidate | Apply, attaching a résumé | Application created |
| E6 | Recruiter | Open the applicant list | Candidate appears with their résumé |
| E7 | Recruiter | Move the application through each pipeline stage | Status changes persist and appear to the candidate |
| E8 | Recruiter | Open the résumé | Opens. **Check `resume_access_log` gets a row** |
| E9 | Candidate | View own application | Sees the current stage |
| E10 | Recruiter | Edit the job after approval | **Approval is NOT reset** — job stays public |

```sql
SELECT j.title, j.approval_status, a.status AS application_status, a.created_at FROM jobs j LEFT JOIN applications a ON a.job_id = j.id WHERE j.company_id IN (SELECT company_id FROM company_members WHERE user_id = (SELECT id FROM profiles WHERE email='info@talentmeshsolutions.com'));
```

> **E10 matters:** an edit that silently unpublishes a live job is how recruiters lose applicants
> without knowing.

### Suite F — Cross-role isolation (security)

| # | Test | Expected |
|---|---|---|
| F1 | Recruiter A tries to open a job/applicant belonging to another company (edit the URL id) | Denied |
| F2 | Candidate tries to open a recruiter URL | Denied |
| F3 | Candidate tries to open an admin URL | Denied |
| F4 | Logged out: hit `app./dashboard`, `jobs./dashboard`, `admin./dashboard` | Each redirects; none renders |
| F5 | Recruiter tries to approve their own job (edit URL / devtools) | Denied — `approval_status` unchanged |

### Suite G — Regressions

| # | Test | Expected |
|---|---|---|
| G1 | `/reset-password` on **each** of `app.`, `jobs.`, `admin.` | Loads, 200, not a redirect |
| G2 | Full password reset: request → email → set new → log in | Works end to end |
| G3 | Candidate logs in and opens dashboard | Data visible, not an empty state |
| G4 | Legal pages `/terms`, `/privacy`, `jobs./terms`, `jobs./privacy` | Load; show CIN + `info@talentmeshsolutions.com`; **no `talentmesh.com`, `.app` or `.in`** |
| G5 | Log in, leave the tab **one hour**, reload | Still logged in. If bounced to login, session refresh is broken — **P1** |

---

## Part 3 — Triage

| Result | Meaning |
|---|---|
| A3/A4 fail | Consent not captured. Everything legal rests on this. Stop and fix |
| A7 shows the company form | The `completed_onboarding` fix did not take |
| **B1 renders a recruiter page** | **Approval gate bypassed. Blocker — do not launch** |
| C3 shows 1 row | Consent history is being overwritten. Legal evidence destroyed. Blocker |
| C4 still shows the candidate | Withdrawal is cosmetic. Blocker |
| D3 destroys the application | Erasure is eating recruiter-owned data. Blocker |
| E10 resets approval | Edits silently unpublish live jobs |
| Any F test passes through | Cross-role isolation broken. Blocker |
| G2 or G5 fails | Auth broken. Blocker |

---

## Part 4 — What "V1" means

**V1 = recruiter portal + standard ATS + DPDP compliance.** Explicitly **not** in V1: AI matching,
résumé parsing, AI interviews, payments.

**Launch gate for V1 — all must be true:**

- [ ] Suites A–G pass, with SQL output recorded
- [ ] B-1 (OAuth consent gate) and B-2 (rate limiting) merged; migrations 066, 067 applied
- [ ] Terms + Privacy counsel-reviewed
- [ ] Grievance Officer named and published · **last task, and the only one that can slip**
- [ ] Registered address filled
- [ ] Breach runbook names filled + one tabletop run
- [ ] Launch wipe done, then empty-state paths re-smoked
- [ ] Dead code removed (see below)

**If the Grievance Officer is delayed**, V1 still ships as a recruiter portal with a standard ATS —
but the statutory contact cannot be blank on a live service collecting personal data. That is the
one item where "ship anyway" is not available.

### Cleanup candidates — confirmed unused, remove before V1

| Item | Evidence |
|---|---|
| `lib/api/storage.ts` upload helpers | Zero callers; hardcode a dead hostname |
| `app/portals/**` recruiter tree | `proxy.ts` has zero references |
| `recruiter_profiles` legacy approval path | Replaced by company-based gate; 9 of 10 recruiters have no row |
| `admin-recruiter` (singular) edge function | Zero callers; live one is `admin-recruiters` |
| `app/dashboard/recruiter/[role_id]/pending-approval` | Orphaned once the gate redirects to `/pending-approval` |
| `DashboardLayoutClient.tsx:595-616` | Same fail-open pattern, client-side |
| Migration 064 | Drops 13 dead tables — **post-launch, never casually** |
| The 4 tsx-script "tests" | Assertions never execute under `npm test` |

### Versioning from here

- `main` is always releasable. Never commit directly to it.
- Branches: `feat/…`, `fix/…`, `docs/…`, `chore/…` — one concern each.
- Tag releases `v1.0.0`; patches `v1.0.x`; features `v1.x.0`.
- Milestones: **v1.0 Launch** · **v1.1 Payments** · **v2.0 AI ATS**.
- Labels: `P0-blocker`, `P1`, `P2`, `dpdp`, `security`, `cleanup`.
- Every P0 needs a test in this document before it is closed.
- No PR merges to `main` without the relevant suite re-run.
