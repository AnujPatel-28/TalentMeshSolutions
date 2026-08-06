# 27 — Pre-Launch Test Script

**For a human tester.** Run in order. Every test has an **expected result** and, where it matters, a
**database check** that must pass. A screen that looks right is not a pass — password reset returned
200 on every page while being broken end to end. Only the DB checks settle it.

**Environment:** production (`https://anujpotfolio.qzz.io` and its `app.` / `jobs.` / `admin.`
subdomains). Use a real mailbox you control for each new account — email verification is **on**.

**Who runs the DB checks:** anyone with InsForge access, via
`npx @insforge/cli db query "<single-line SQL>"` or the dashboard SQL editor.
⚠ SQL must be **one line** — the Windows CLI truncates at the first newline and still prints success.

**Record for each test:** PASS / FAIL, date, and paste the actual DB output. A FAIL is not a
blocker to continue — finish the whole script, then triage. Note the account emails you create;
you'll need them for cleanup.

---

## T-0 · Baseline (run once, before anything)

```sql
SELECT (SELECT count(*) FROM consent_records) AS consent, (SELECT count(*) FROM data_principal_requests) AS dpr, (SELECT count(*) FROM profiles) AS profiles;
```

Record the three numbers. Every later check is relative to these.

---

# A · Consent capture (L-2 / L-11) — the highest-value test

## A1 · Age gate blocks signup
1. Go to `/signup/candidate`.
2. Fill name, email, password. Tick **everything except** the 18+ confirmation.
3. Submit.

**Expected:** signup is **refused**, with a message naming the age confirmation. You are not logged
in and no verification email arrives.

**DB check — must return 0:**
```sql
SELECT count(*) FROM consent_records WHERE email = 'YOUR_TEST_EMAIL';
```
> If this returns rows, consent was written for a signup that was rejected. **FAIL — report it.**

## A2 · Required consent blocks signup
Repeat A1, but this time tick 18+ and leave **"account processing"** unticked.

**Expected:** refused, message names the missing consent. DB check above still returns **0**.

## A3 · Happy path — the one that matters
1. Fresh email. Tick: Terms, account processing, 18+, and profile-visible-to-recruiters.
   **Leave marketing email UNTICKED.**
2. Submit. You should be sent to the email-verification screen.

**DB check — run BEFORE you verify the email:**
```sql
SELECT purpose, status, user_id, notice_version, ip_address IS NOT NULL AS has_ip FROM consent_records WHERE email = 'YOUR_TEST_EMAIL' ORDER BY purpose;
```

**Expected:**
- **4 rows**: `terms_of_service`, `account_processing`, `age_18_plus`, `profile_visible_to_recruiters`
- **NO `marketing_email` row** — unticked must mean absent, not `granted`
- every `status` = `granted`
- every `user_id` = **NULL** at this stage (correct — the account isn't verified yet)
- `notice_version` populated, `has_ip` = true

3. Now open the verification email and complete verification.

**DB check — run AFTER verifying:**
```sql
SELECT purpose, user_id FROM consent_records WHERE email = 'YOUR_TEST_EMAIL' ORDER BY purpose;
```

**Expected:** all 4 rows now have a **non-NULL `user_id`**, all the same value.
> This is the backfill. If `user_id` stays NULL, the consent records are orphaned from the account
> and cannot answer a Data Principal request. **FAIL — report immediately.**

## A4 · No consent UI for AI features
On the signup form, confirm there is **no** checkbox mentioning résumé parsing, AI, or analytics
cookies. Those features do not run; a consent box for them would be a misstatement.

**Expected:** absent.

## A5 · Recruiter signup collects consent
Repeat A3 on the recruiter signup (`/signup/recruiter`). It had **no consent UI at all** before this
work.

**Expected:** the same consent block appears; the same DB checks pass for the recruiter's email.

---

# B · Consent withdrawal (L-3)

Use the verified candidate from A3. Log in.

## B1 · Withdraw is available and honest
Open candidate **Settings → consent/privacy panel**.

**Expected:** current consents listed. `marketing_email` and `profile_visible_to_recruiters` are
withdrawable. `account_processing`, `terms_of_service`, `age_18_plus` are shown but **disabled**,
with a reason (withdrawing them = account deletion).

## B2 · Withdrawal is append-only
Withdraw **profile visible to recruiters**.

```sql
SELECT purpose, status, created_at FROM consent_records WHERE email = 'YOUR_TEST_EMAIL' AND purpose = 'profile_visible_to_recruiters' ORDER BY created_at;
```

**Expected:** **2 rows** — the original `granted`, plus a **new** `withdrawn` row.
> If there is still only 1 row, the code did an UPDATE. The consent history is the legal evidence and
> must never be overwritten. **FAIL.**

## B3 · Withdrawal actually does something ← the test people skip
1. Log in as a **recruiter** (separate browser/incognito).
2. Search the candidate database for the A3 candidate.

**Expected:** the candidate **does not appear**. Before B2 they would have.
> A withdrawal that changes nothing is worse than no withdrawal — it's a promise the system breaks.
> **This is the single most important assertion in section B.**

## B4 · Re-grant works
Back as the candidate, re-enable the same consent. Recruiter search should find them again, and the
SQL in B2 should now show **3 rows** ending in `granted`.

---

# C · Data Principal rights (L-4)

As the verified candidate:

## C1 · Raise each request type
Settings → "Your data". Raise an **access** request.

```sql
SELECT kind, status, due_at, user_id IS NOT NULL AS linked FROM data_principal_requests WHERE email = 'YOUR_TEST_EMAIL';
```
**Expected:** one row, `kind='access'`, `status='open'`, `due_at` in the future, `linked` = true.

Repeat for **correction**. (Hold erasure for C3.)

## C2 · Admin queue
Log into the admin portal. Find the request queue.

**Expected:** both requests visible, actionable, and closing one sets `status` and `completed_at`.

## C3 · Erasure — run this LAST, on a throwaway account
Create a **separate** throwaway candidate, have it **apply to one job**, then raise an erasure
request and have an admin action it.

```sql
SELECT count(*) AS apps_remaining FROM applications WHERE candidate_id = 'THROWAWAY_USER_ID';
SELECT count(*) AS consent_rows, count(user_id) AS still_linked FROM consent_records WHERE email = 'THROWAWAY_EMAIL';
```

**Expected:**
- the profile is gone or anonymised per the documented decision table
- **the application is not silently destroyed** — recruiter-owned columns must survive per migration 062
- **consent rows still exist**, with `user_id` now NULL (FK is `ON DELETE SET NULL` — this is the
  evidence that you had lawful basis, and it must outlive the account)

## C4 · Resume actually gone
If the throwaway uploaded a résumé, confirm the file 404s afterwards.
> InsForge hard-deletes objects immediately and never puts object bytes in DB backups. A CDN copy may
> persist ≤1 h (private) — retest after an hour if it still resolves.

---

# D · OAuth — never walked end to end, do not skip

## D1 · Google, brand-new account
Use a Google account that has **never** signed into TalentMesh. Click "Sign in with Google" and
complete the flow.

**Expected:** you land logged in, on the candidate dashboard, with data visible — not a blank
dashboard, not a redirect loop, not a 401.

```sql
SELECT id, email, role, created_at FROM profiles WHERE email = 'YOUR_GOOGLE_EMAIL';
```
**Expected:** a profile row exists with `role='candidate'`.

## D2 · The OAuth consent gap ← expect this to fail
```sql
SELECT count(*) FROM consent_records WHERE email = 'YOUR_GOOGLE_EMAIL';
```

**If this returns 0**, OAuth signup bypasses consent capture entirely. The consent work covers the
email/password forms; the OAuth path may never touch them.
> **This is a launch blocker if it fails** — it means a whole class of users is onboarded with no
> consent record and no age gate. Report the number either way.

## D3 · Google returning user
Sign out, sign in with the same Google account again. Should log straight in. No duplicate profile
row (re-run the D1 query; still one row).

## D4 · LinkedIn
Repeat D1 with LinkedIn.

---

# E · Regressions (fast, but they have bitten before)

| # | Test | Expected |
|---|---|---|
| E1 | `/reset-password` on **each** of `app.`, `jobs.`, `admin.` | loads, 200, not a redirect |
| E2 | Complete a full password reset end to end — request → email → set new password → log in | works. *A page returning 200 does not mean the journey completes.* |
| E3 | Log out, hit `app./dashboard`, `jobs./dashboard`, `admin./dashboard` | each redirects, none renders |
| E4 | Candidate logs in and opens their dashboard | data visible, not an empty state |
| E5 | Post a job as recruiter → approve as admin → confirm it appears on the public board | works |
| E6 | Open a public job detail page | company **name and logo render** — not blank |
| E7 | Legal pages: `/terms`, `/privacy`, `jobs./terms`, `jobs./privacy` | all load; all show the CIN and `info@talentmeshsolutions.com`; **no** `talentmesh.com`, `.app` or `.in` anywhere |

---

# G · Recruiter re-entry and approval routing (added 2026-07-31)

Covers the abandoned-signup fixes and the login-routing deletion. See
`docs/abandoned-recruiter-signup-fix.md` for why each exists. **G3 and G4 are regression tests for
every existing recruiter, not just new signups** — post-login routing changed for all of them.

Recruiter intent is not persisted before `bumpToRecruiter`, so a recruiter mid-signup has
`profiles.role = 'candidate'`. Landing in the candidate funnel is the failure these tests hunt.

## G1 · Abandoned before the OTP
1. Fresh work email at `/signup/recruiter` (a free-provider address is rejected by design).
2. When the verify screen appears, **do not enter the code.** Navigate back to `/signup/recruiter`.
3. Click **"Already started signing up? Log in to finish"**.
4. Sign in with the same email and password.

**Expected:** an "email not confirmed" message with a **Resend verification code** button, then an
inline OTP box. Enter the code.

**Expected after verifying:** you land on **`app.<host>/onboarding/recruiter/setup`** — the company
form. **FAIL if you land on `/onboarding/candidate`**, and FAIL if you land on `jobs.`

> If step 4 shows no resend button, the live backend isn't returning the `Email not confirmed`
> string that `AuthContext.signIn` matches on. Report the exact error text shown.

## G2 · Abandoned after verifying, before company details
1. Fresh email. Complete signup **and** the OTP, landing on the company form.
2. Close the tab **without submitting**. Reopen `/signup/recruiter` → "Log in to finish" → sign in.

**Expected:** straight back to `app.<host>/onboarding/recruiter/setup`. Not candidate onboarding,
not the dashboard.

**DB check — the company form was never submitted, so there must be nothing to approve:**
```sql
SELECT (SELECT count(*) FROM company_members m JOIN profiles p ON p.id = m.user_id WHERE p.email = 'YOUR_TEST_EMAIL') AS memberships, (SELECT role FROM profiles WHERE email = 'YOUR_TEST_EMAIL') AS role;
```
> Expect `memberships = 0` and `role = candidate`. A membership here means a company was created
> without the form being submitted. **FAIL.**

## G3 · Pending recruiter goes to pending-approval, not the form ← the routing regression
Use the G2 account: submit the company form, land on `/pending-approval`. Log out. Log back in.

**Expected:** you arrive at **`/pending-approval` directly.** **FAIL if you are shown the company
form again** — that was the old behaviour and it means the login page is still guessing the
destination instead of letting the recruiter dashboard layout decide.

**DB check — approval must still be pending:**
```sql
SELECT c.status AS company, m.status AS membership, r.status AS request FROM companies c JOIN company_members m ON m.company_id = c.id JOIN profiles p ON p.id = m.user_id LEFT JOIN company_verification_requests r ON r.company_id = c.id WHERE p.email = 'YOUR_TEST_EMAIL';
```
> Expect `pending` / `invited` / `submitted`. Anything `verified` or `active` before an admin acted
> is an approval-gate bypass. **Blocker.**

## G4 · Approved recruiter still reaches the dashboard
Approve the G3 company from the admin portal, then log in as that recruiter.

**Expected:** `app.<host>/recruiter/dashboard` renders. Re-run the G3 SQL: `verified` / `active` /
`approved`.

> This is the other half of the deletion. G3 proves an unapproved recruiter is held back; G4 proves
> an approved one isn't accidentally held back too.

## G5 · No orphaned companies in the approval queue
A company must never reach the admin queue without a member to activate —
`approve_company_verification()` flips "all invited members", so with none an admin approves a
company nobody can enter **and it reports success.**

**DB check — must return 0 rows:**
```sql
SELECT c.id, c.name, c.status, m.id IS NULL AS no_member, r.id IS NULL AS no_request FROM companies c LEFT JOIN company_members m ON m.company_id = c.id LEFT JOIN company_verification_requests r ON r.company_id = c.id WHERE m.id IS NULL OR r.id IS NULL;
```
> Rows here are half-built companies. Any dated **before** this fix are pre-existing damage and need
> manual cleanup — record them, don't assume the fix failed. Any created **after** it mean the
> rollback in `request-access` didn't fire. **Report either way.**

There is no automated test for the rollback: it only triggers when an insert fails mid-request
(most plausibly a double-submit race against the `company_members_one_active_per_user` unique
index). This query is the standing detector.

---

# F · Cleanup

List every account you created, then have them deleted before launch — or confirm they're removed by
the launch wipe.

```sql
SELECT email, role, created_at FROM profiles WHERE created_at > 'YYYY-MM-DD' ORDER BY created_at;
```

---

## Triage guide

| Result | Meaning |
|---|---|
| **A3 fails** | Consent is not being captured. Everything legal rests on this. Stop and fix. |
| **B3 fails** | Withdrawal is cosmetic — the platform promises a control it doesn't honour. Blocker. |
| **D2 returns 0** | OAuth users bypass consent and the age gate. Blocker. |
| **C3 destroys applications** | Erasure is destroying recruiter-owned data. Blocker; do not launch. |
| **G1 or G2 lands on candidate onboarding** | The recruiter re-entry fix didn't take. Recruiters who pause mid-signup are silently converted to candidates. |
| **G3 shows the company form** | The login-routing deletion didn't take. Not a security hole — the 403 still bounces them — but every pending recruiter re-fills a form for nothing. |
| **G3 or G4 shows `verified`/`active` before an admin acted** | The approval gate is bypassed. Blocker; do not launch. |
| **G5 returns rows dated after the fix** | The `request-access` rollback isn't firing; memberless companies are reaching the approval queue and approving as no-ops. |
| **E2 fails** | Password reset broken again. Blocker. |
| Everything else | Triage by judgement; record and decide. |
