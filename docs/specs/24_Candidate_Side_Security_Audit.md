# 24 — Candidate-Side Security Audit (Phase 2)

**Written:** 2026-07-27 · **Role:** Advisor (verification). Method: live RLS/policy inspection +
DB-level privilege simulation (role-switched `authenticated` with a real candidate's JWT claims).
All findings verified against the **live** database, not source or docs.

**Scope:** applications, candidate_profiles, candidate_resumes + resume storage, messages, offers,
saved_jobs, notifications, interviews, application_status_history, and the resume access path.

---

## Verdict

Candidate data isolation is **sound**. One confirmed **P1** integrity hole — candidates can write
recruiter-owned columns on their own application — with the fix written as
`insforge/migrations/062_applications_column_privileges.sql` (**awaiting human apply**).
The storage question (F-24.2) was subsequently **verified SAFE**. Everything else tested is
correctly owner-scoped.

**Confidentiality of candidate PII: no cross-user leak found.** The P1 is an *integrity/trust*
issue, not a data-exposure one.

`project_admin_policy` / `admin_bypass` (`USING true`) appear on nearly every table but apply only
to the **`project_admin`** role (the service key), so they do not weaken user-facing RLS.

---

## F-24.1 · P1 — candidates can write recruiter-owned columns on their own application

**Evidence (live, confirmed):** role-switched to `authenticated` with candidate
`bf754d4c-…`'s JWT sub, on their own application row:

| Column | Result |
|---|---|
| `status` → `'hired'` | **blocked** — trigger: *"Direct updates to application status are blocked. Use the update_application_status RPC."* |
| `stage_index` → 7 | **rows=1, succeeded** |
| `recruiter_notes` → 'INJECTED' | **rows=1, succeeded** |
| `ai_match_score` → 99 | **rows=1, succeeded** |
| `rejection_reason` → 'INJECTED' | **rows=1, succeeded** |

(Row restored to original values immediately after each write; probe scratch table dropped.)

**Root cause:** `authenticated` holds column-level `UPDATE` on `stage_index, recruiter_notes,
ai_match_score, rejection_reason` (and 12 others), and RLS policy `apps_update_own`
(`candidate_id = auth.uid()`) permits the row. Only `status` is protected — by a trigger, not by
the grant. This is the **same class as N-2** (jobs approval): the security boundary must be a
column privilege, and it's missing here for everything except `status`.

**Why it matters:** `ai_match_score` drives recruiter ranking — a candidate setting their own to 99
games the shortlist. `stage_index` lets a candidate appear advanced in the pipeline.
`recruiter_notes` is a stored value rendered in the recruiter UI → stored-injection / social-eng
surface. Integrity + trust boundary, not just cosmetic.

**Fix (mirror the N-2 pattern, migration only):** revoke `UPDATE` on the recruiter-owned columns
from `authenticated`, granting back only the columns a candidate legitimately edits post-apply
(realistically none beyond withdraw, which already routes through the status RPC). Candidates never
UPDATE these directly in the app — the app writes them via recruiter/admin edge functions using
the service key, so revoking is safe. Verify no candidate UI path PATCHes them before shipping.

---

## F-24.2 · **RESOLVED — SAFE** (verified 2026-07-27 with a live non-owner candidate token)

The test below was run once a working credential was available. Result: **per-object scoping holds.**

| Probe | Result |
|---|---|
| Anonymous GET of a resume object | **401** |
| Anon key only, no user token | **401** |
| **Candidate `466abcc4` GET resume owned by `01eb08b9`** | **404 `NOT_FOUND`** — denied (masked as 404) |
| Control: same object with the service key | **302** → object provably exists, so the 404 is authorization, not a bad path |
| The 302 target | CloudFront **signed** URL (`Expires` + `Signature` + `Key-Pair-Id`), **TTL ≈ 1 hour** |

**Conclusion:** a candidate cannot read another candidate's resume via the direct `file_url`.
Private buckets are owner/authorization-scoped, not merely "any authenticated". Signed CDN URLs
are anonymously fetchable **by design** (that is what a signed URL is) but are only *obtainable*
by an authorized caller and expire in an hour. No action required.
*Residual (minor):* a signed URL, once issued, is bearer-grade for up to an hour — if one is
pasted into a log, ticket, or chat it is replayable until expiry. Acceptable; note it in the DPDP
data-handling doc rather than fixing.
*Not tested:* the owner-success direction (the test account owns 0 resumes). The security-relevant
direction — non-owner denied — is proven.

<details><summary>Original finding as written before verification (kept for the record)</summary>

### P0-if-true, UNVERIFIED — per-object authorization on private storage buckets

**What's confirmed:** `resumes`, `application-snapshots`, `recruiter_documents` buckets are
`public: false`. Anonymous GET of a resume object → **401** (verified). The intended access path is
the **`resume-proxy`** edge function, whose authorization logic is **sound** (authenticates the
caller, resolves role from `profiles`, enforces candidate-owns / recruiter-same-company-with-active-application
/ admin, logs to `authorization_events` + `resume_access_log`, rate-limits 60/min).

**What could NOT be verified:** whether InsForge private buckets enforce **per-object ownership**
or merely **"any authenticated user."** `candidate_resumes.file_url` stores the **direct** storage
URL (`/api/storage/buckets/resumes/objects/<candidateId>%2F<file>.pdf`). If private = any-authenticated,
a logged-in candidate B can GET candidate A's resume via that direct URL, **bypassing resume-proxy
entirely** (no ownership check, no audit log). That would be a P0 mass-PII exposure (77 resume
objects, 60 candidate profiles).

**Why unverified:** requires a second live authenticated token (a non-owner candidate). The test
account `nikavx28@gmail.com` (`Nikavx@28`) — which authenticated earlier this same session —
now returns `AUTH_UNAUTHORIZED`; `auth_attempts` is empty, so the cause is not a visible lockout.
**This credential change is itself worth investigating.**

**Exact test to run (needs any candidate token that is NOT the resume owner):**
```bash
# Owner of this object is candidate 01eb08b9-…; use a DIFFERENT candidate's token as TOK.
curl -i -H "Authorization: Bearer $TOK" -H "x-insforge-anon-key: $AK" \
"$U/api/storage/buckets/resumes/objects/01eb08b9-43b5-4b67-85a2-8b140de3c334%2Ftest_resume_b1_1781180948571.pdf"
```
- **200 + PDF bytes → P0 CONFIRMED.** Fix: make direct object reads owner-scoped (storage policy),
  or stop storing/serving `file_url` directly and force all reads through `resume-proxy`.
- **403/401 → SAFE.** Downgrade this finding to closed.

*(Outcome: 404 — denied. Finding closed as SAFE, see above.)*
</details>

---

## F-24.3 · P3 — `x-insforge-url` override header is dead but present in source

15 edge functions read `req.headers.get('x-insforge-url')` / `x-insforge-service-key` to override
the backend target. **Tested:** sending `x-insforge-url: https://invalid.invalid` to the public
`jobs` function returned identical valid data → the deployed runtime **ignores** the override (env
vars win). Not exploitable today, but it's a latent SSRF/exfil footgun if a future runtime honors
it. Low priority: strip the header reads.

---

## Confirmed SAFE (verified this session — do not re-audit without reason)

| Area | Basis |
|---|---|
| `applications` SELECT | candidate sees only own (`candidate_id=auth.uid()`); recruiter gated by company + active status; admin via `is_admin()` |
| `applications` status write | trigger forces the `update_application_status` RPC |
| `applications` INSERT | `WITH CHECK candidate_id=auth.uid()` — can't apply as someone else |
| `candidate_profiles` | own + admin + recruiter-with-active-application only |
| `candidate_resumes` (metadata) | own + admin + recruiter-with-active-application only |
| resume-proxy authorization | ownership/company/status/admin all enforced; audited; rate-limited |
| private buckets vs anonymous | 401 (verified) |
| `messages` | sender or receiver only |
| `offers` | candidate or recruiter party only |
| `saved_jobs` | `candidate_id=auth.uid()` |
| `notifications` | `user_id=auth.uid()` |
| `interviews` | candidate or recruiter party only |
| `application_status_history` | own application or owning recruiter only |
| service-key header hijack | caller can't supply a service key they don't hold; anon token stays RLS-bound |

---

## NOT covered this session (still open from doc 23 §"NOT AUDITED")

- **OAuth (Google/LinkedIn)** end-to-end — providers are configured
  (`get-backend-metadata` shows google/linkedin/github) but flows never exercised.
- **"Logged in but no data" JWT-cookie issue** — not reproduced/confirmed fixed this session.
- **Rate limiting** beyond resume-proxy (signup, `request-access`, login). Note: login rate-limiting
  may in fact be active — it plausibly caused the `nikavx28` auth failures above.
- **AI-interview tables** (`ai_interviews`, `live_ai_interviews`) — 0 rows, policies not probed.

## Backlog delta

- **NEW P1:** F-24.1 (application column writes) — fix is a column-grant migration.
- **NEW P0-if-true:** F-24.2 (storage per-object auth) — **run the one test above before launch.**
- **NEW P3:** F-24.3 (dead override header).
- Candidate salary-guide feature **removed** this session (user request) — nav + page + 3 links,
  no backend.
