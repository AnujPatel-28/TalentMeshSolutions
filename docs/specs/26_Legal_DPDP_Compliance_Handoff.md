# 26 — Legal / DPDP Compliance — Session Handoff & Work Package

**Written:** 2026-07-28 · **Supersedes the "what's next" of** `25_Session_Handoff_3.md`.
**START HERE for the legal/DPDP workstream.**

**Read order for a cold session:** this doc → `25_Session_Handoff_3.md` §5 (environment + traps,
still fully valid) → `23_Open_Security_Findings_Executor_Handoff.md` (F-23.7 is the legal item).

> ⚠ **This document scopes SYSTEM work, not policy text.** Do not draft privacy/consent/terms
> prose from model knowledge. See §2 and §7.

---

## 0. Status in one paragraph

The security workstream is **done and deployed**; nothing in §1 is speculative — every line was
verified against production or the live database on 2026-07-28. What remains before real users is
the India DPDP compliance work, which the user deferred until the product was feature-complete and
is now starting. That work is **mostly greenfield**: there is currently *no* consent
infrastructure of any kind in the system — not a table, not a column, not a persisted field. The
legal pages are ~58-line placeholders naming a domain the company does not own. Three decisions
(§3) block implementation and only the user can make them.

> **Update 2026-07-28 (second session).** D-3 resolved (18+ → **L-11**). D-1/D-2 still open, so L-1
> and L-8 remain blocked and no policy prose exists yet. Added since: **§9** — the InsForge
> processor position verified against the published ToS/DPA/Privacy Policy (with 7 questions to send
> support), **§10** — a divergence register for `audits/shared/compliance_blueprint.md`, a file that
> calls itself the compliance single source of truth and is **wrong on 13 counts**; do not feed it to
> a drafting session — **§11**, the AI features (résumé parsing, match scoring, interviews) are coded
> but **not actually running**, so the notice must not disclose them yet — and **L-10**, cross-border
> transfer, promoted to its own package because the deployment turns out to be **entirely outside
> India**. One correction to a tempting shortcut: the 90-day backup retention published by InsForge
> **does not cover our data** (§9.1) — that period is still unknown.

---

## 1. Verified current state — evidence, not doc claims

All checks run 2026-07-28 against production (`https://anujpotfolio.qzz.io` + subdomains) and the
live InsForge backend.

### 1.1 Consent infrastructure: none exists

| Claim | Evidence |
|---|---|
| **Zero consent/DPDP tables** | `information_schema.tables` filtered on `%consent%`, `%dpdp%`, `%privacy%`, `%erasure%`, `%grievance%`, `%retention%` → **0 rows** |
| **The one consent checkbox is never persisted** | `app/(auth)/signup/candidate/page.tsx:28` holds `agree: false` in local state and gates the submit button (`:272`). `handleSubmit` (`:45-`) builds the payload from `signupSchema` — `name`, `email`, `password`, `role` only. `agree` is **not** in the request body. `grep -rn "agree" app/api lib insforge` → **no matches.** |
| **Recruiter signup has no consent UI at all** | `grep -rn "consent\|checkbox\|agree" app/(auth)/signup/` matches **only** `signup/candidate/page.tsx` |
| **Consent is bundled, not granular** | `signup/candidate/page.tsx:266-268` — a single checkbox covering Terms **and** Privacy Policy together |

**Consequence:** the platform currently has no record of who consented, to what, or when — so it
cannot answer a Data Principal request, cannot prove consent to the Board, and cannot process a
withdrawal. This is the single biggest gap.

### 1.2 Legal pages: placeholder-grade, wrong legal identity

| File | Lines | Problem |
|---|---|---|
| `app/terms/page.tsx` | 58 | `:51` — `support@talentmesh.com` (**domain not owned**) |
| `app/privacy/page.tsx` | 58 | `:51` — `privacy@talentmesh.com` (**domain not owned**) |
| `app/(auth)/pending-approval/page.tsx` | — | `:180` — `support@talentmesh.app` (**domain not owned**) |
| `app/portals/jobs/careers/page.tsx` | — | `:177-178` — `careers@talentmesh.com` |
| `app/portals/jobs/terms/page.tsx` | 20 | stub |
| `app/portals/jobs/privacy/page.tsx` | 20 | stub |

No grievance officer named anywhere. No retention schedule, no rights section, no breach contact.
This confirms **F-23.7** (doc 23) — that finding is accurate.

### 1.3 Security workstream — CLOSED and live (do not re-verify)

| Item | Commit | Production evidence 2026-07-28 |
|---|---|---|
| S-1 per-portal login variants | `32e551f` | all three variants confirmed live |
| F-23.2(a) staff-created companies enter the verification queue | `ffccaa6` + InsForge deploy `4ps5pggrj7mt` | user-tested: creates → appears in queue → approves |
| Password policy raised to **12 chars + number + special + upper + lower** | set by user in InsForge Auth Settings | dashboard screenshot |
| Client password rules synced to the 12-char policy | `363ccd6` | signup renders `Min. 12 characters` |
| Admin recovery routes reachable logged out | `ea94e15` | `admin./admin/forgot-password` → **200** |
| **P1: password reset was broken on ALL THREE subdomains** | `847cf50` | `{admin,jobs,app}./reset-password` → **200**; `/auth/set-password` → **200** |
| Portal gates still enforce (regression) | — | `{admin,jobs,app}./dashboard` → **307** |

`origin/main` = **`847cf50`** and everything above is **deployed**.

---

## 2. Regulatory anchors — researched 2026-07-28, **re-verify before writing**

The DPDP Rules were notified recently and guidance is still settling. These anchors are for
**scoping only**. The session doing the work must re-confirm each one and cite its own sources.

- **DPDP Rules, 2025 notified 14 November 2025** by MeitY, operationalising the DPDP Act, 2023.
- **Hard compliance deadline: 13 May 2027** (18 months from notification). Applies to every entity
  processing digital personal data of individuals in India — **no exemption for startups, size, or
  funding stage**.
- **Data Protection Board of India is constituted and operational**; the penalty framework is live
  (up to **₹250 crore** per violation).
- **Consent notice** must be a *separate*, clear, standalone notice giving a fair account of
  processing: specific purpose(s), categories of data, retention period, and the mechanism to
  withdraw.
- **Withdrawal must be as easy as giving consent.**
- **Data Principal rights:** access, correction, erasure — plus a dedicated communication channel
  to exercise rights and raise grievances.
- **Breach notification:** notify affected Data Principals *without delay* on becoming aware;
  detailed report to the Board within **72 hours** (extendable on approval). Notice must state, in
  plain language, what happened, what data was exposed, what the individual can do, and a contact.
- **Grievance redressal: within 90 days.**

Sources (re-check for newer guidance):
[PIB — DPDP Rules 2025 Notified](https://static.pib.gov.in/WriteReadData/specificdocs/documents/2025/nov/doc20251117695301.pdf) ·
[EY India — DPDP Act & Rules](https://www.ey.com/en_in/insights/cybersecurity/decoding-the-digital-personal-data-protection-act-2023) ·
[India Briefing](https://www.india-briefing.com/news/dpdp-rules-2025-india-data-protection-law-compliance-40769.html/) ·
[Scrut — implementation checklist](https://www.scrut.io/post/dpdp-rules) ·
[Fisher Phillips — 8 steps](https://www.fisherphillips.com/en/insights/insights/indias-new-data-privacy-rules-are-here)

---

## 3. BLOCKING — three decisions only the user can make

Implementation of L-1, L-5 and L-8 cannot start without these.

> **Status 2026-07-28 (this session):** **D-3 is RESOLVED — option (a), 18+ only.** See L-11 for the
> resulting work package. **D-1 and D-2 remain open**; the user chose to have the workstream scoped
> around them rather than answer now, so L-1 and L-8 stay blocked and nothing in this document
> drafts policy prose. Everything that does *not* depend on them (§9, §10, L-10, L-11) is done.

### D-1 · What is the real legal identity and domain?
Every legal page must name the actual legal entity and a domain the company controls. Current
pages use `talentmesh.com` / `talentmesh.app`, **neither of which is owned**; production runs on
`anujpotfolio.qzz.io`. Needed: **registered company name, CIN, registered address, and the
production domain that will be live at launch**.

> **PARTIALLY RESOLVED 2026-07-28 — the domain is `talentmeshsolutions.com`.** Confirmed by the user
> and corroborated by the code, which already treats it as canonical: `app/layout.tsx:75`,
> `app/robots.ts:10`, `app/sitemap.ts:4`, `info@talentmeshsolutions.com` at
> `app/portals/jobs/contact/page.tsx:105`, and the session cookie domain `.talentmeshsolutions.com`.
> **`talentmesh.in` is not a company domain and never was** — it exists only because
> `audits/shared/compliance_blueprint.md` §1 invented it (§10 B-11). Treat any `.in` address in any
> document as wrong.
>
> **Still open in D-1:** registered company name, CIN, registered address.
> **Also needed before L-1 can ship:** confirmation that the mailboxes actually exist and are
> monitored. Publishing `privacy@talentmeshsolutions.com` on a statutory notice when nobody receives
> it reproduces the exact defect L-1 exists to fix — a Data Principal who cannot reach the fiduciary.
> The only address currently evidenced in the code is `info@talentmeshsolutions.com`.

### D-2 · Who is the Grievance Officer?
DPDP requires a named contact reachable by Data Principals, with a 90-day redressal clock. Needed:
**name, designation, email, and postal address** for publication.

### D-3 · Minimum age / children's data — a real question for a job board
DPDP treats **anyone under 18 as a child**, requiring *verifiable parental consent* and barring
behavioural tracking and targeted advertising at children. A recruitment platform can plausibly
attract 16–17-year-olds (apprenticeships, internships, first jobs). Options:
- **(a) recommended — 18+ only.** Add an age gate at signup and state it in the Terms. Avoids the
  entire verifiable-parental-consent regime, which is heavy to build.
- **(b)** allow under-18s and build verifiable parental consent + tracking suppression.
**(a) is far cheaper; (b) is a product decision with significant engineering cost.**

---

## 4. Work packages

Ordered. Each follows the project documentation standard. **L-1 gates the rest** — do not publish
policy text naming an unowned domain.

### L-1 · Correct legal identity across all public surfaces · **P0**
| Field | Detail |
|---|---|
| **Server-side changes** | None. |
| **Client-side changes** | **Target domain is settled: `talentmeshsolutions.com`** (D-1). Replace `support@talentmesh.com` (`app/terms/page.tsx:51`), `privacy@talentmesh.com` (`app/privacy/page.tsx:51`), `support@talentmesh.app` (`app/(auth)/pending-approval/page.tsx:180`), `careers@talentmesh.com` (`app/portals/jobs/careers/page.tsx:177-178`) — **plus three `talentmesh.in` addresses missed by the original §1.2 sweep, which only grepped for `.com`/`.app`:** `support@talentmesh.in` (`app/dashboard/admin/_components/AdminComingSoonPage.tsx:126`) and `hello@talentmesh.in` (`app/portals/coming-soon/page.tsx:124` and `:153`). That is **7 addresses across 6 files, spanning 3 unowned domains.** Fill the `portals/jobs/{terms,privacy}` stubs or redirect them to the canonical pages. |
| **Impact if changed** | Legal pages name a contactable, owned identity — the precondition for every other item. |
| **Impact if not changed** | Notices are legally defective and point users at mailboxes nobody receives; a Data Principal cannot reach the fiduciary. |
| **Reason** | F-23.7; DPDP requires a reachable fiduciary contact. |
| **Deploy priority** | **P0** — blocks L-8. |

### L-2 · Consent capture — schema + granular UI · **P0**
| Field | Detail |
|---|---|
| **Server-side changes** | New table `consent_records` (§5). New route `POST /api/consent` to record grants; signup routes (`/api/auth/signup`, recruiter `request-access`) must write consent rows **in the same transaction as account creation**. RLS: user may `SELECT` own rows; **no client `UPDATE`/`DELETE`** (consent history is append-only — withdrawal writes a *new* row, see L-3). |
| **Client-side changes** | Replace the single bundled checkbox (`app/(auth)/signup/candidate/page.tsx:266-268`) with **granular, individually unticked** checkboxes, one per purpose (§5 `purpose` enum). Terms acceptance stays separate from data-processing consent. Add the equivalent block to the recruiter signup, which currently has **none**. Persist the result — today `agree` never leaves the browser. |
| **Impact if changed** | The platform can prove who consented to what and when; enables withdrawal, rights requests and Board evidence. |
| **Impact if not changed** | No consent record exists at all. Every downstream DPDP obligation is unimplementable, and processing has no lawful basis on record. |
| **Reason** | DPDP consent must be free, specific, informed, unconditional, unambiguous, and **per purpose**. Bundled consent does not qualify. |
| **Deploy priority** | **P0**. |

### L-3 · Consent withdrawal · **P0**
| Field | Detail |
|---|---|
| **Server-side changes** | `POST /api/consent/withdraw` appending a `withdrawn` row. Define and implement the **downstream effect** per purpose (e.g. withdrawing `marketing_email` suppresses sends; withdrawing `profile_visible_to_recruiters` removes the profile from recruiter search). |
| **Client-side changes** | Consent management panel in candidate settings (`app/dashboard/candidate/[role_id]/settings/page.tsx`) and the recruiter equivalent, listing current consents with a one-click withdraw. |
| **Impact if changed** | Withdrawal becomes as easy as granting, as required. |
| **Impact if not changed** | Non-compliant, and users have no way to revoke. |
| **Reason** | Withdrawal must be as easy as giving consent. |
| **Deploy priority** | **P0**. |

### L-4 · Data Principal rights: access / correction / erasure · **P0**
| Field | Detail |
|---|---|
| **Server-side changes** | Table `data_principal_requests` (§5). `POST /api/dpdp/requests` (raise), `GET` (status). **Access** = machine-readable export of the requester's data across `profiles`, `candidate_profiles`, `applications`, `resumes`, storage objects. **Erasure** must define, per table, delete-vs-anonymise — note applications carry recruiter-owned columns (see F-24.1, migration 062) and cannot simply be dropped. Staff queue in the admin portal to action and close requests. |
| **Client-side changes** | "Your data" section in candidate + recruiter settings with the three request types and visible status. Admin queue UI. |
| **Impact if changed** | Rights are exercisable through a real code path, not a promise in prose. |
| **Impact if not changed** | The policy promises rights the system cannot deliver — the most common enforcement finding. |
| **Reason** | Access, correction and erasure are statutory rights. |
| **Deploy priority** | **P0**. |
| ⚠ | Erasure interacts with the **launch wipe** (doc 25 §4) and with retention (L-7). Design them together. |

### L-5 · Grievance officer + 90-day SLA · **P1**
| Field | Detail |
|---|---|
| **Server-side changes** | Reuse `data_principal_requests` with `kind='grievance'`; store `due_at = created_at + 90 days`; surface overdue items in the admin queue. |
| **Client-side changes** | Publish the D-2 officer details on Privacy + Terms + a contact route; grievance form. |
| **Impact if changed** | A statutory contact exists and the clock is tracked rather than hoped for. |
| **Impact if not changed** | Missing mandatory disclosure; no evidence of timely redressal. |
| **Reason** | Named officer + 90-day redressal. |
| **Deploy priority** | **P1** (needs D-2). |

### L-6 · Breach notification readiness · **P1**
| Field | Detail |
|---|---|
| **Server-side changes** | Table `data_breach_log` (§5). Not an automated detector — a **runbook plus a record**: who declares a breach, the notify-Data-Principals-without-delay step, and the **72-hour** Board report with its fields. |
| **Client-side changes** | None at launch. |
| **Impact if changed** | The 72-hour clock is met with a prepared template instead of improvised under pressure. |
| **Impact if not changed** | A breach becomes a second, separate violation on top of the incident. |
| **Reason** | Mandatory breach reporting. |
| **Deploy priority** | **P1** — a documented runbook is acceptable for launch; automation is not required. |

### L-7 · Retention policy + enforcement · **P2**
| Field | Detail |
|---|---|
| **Server-side changes** | Per-category retention periods (candidate profiles, resumes, applications, audit logs, `auth_attempts`) and a scheduled job to purge/anonymise past term. Retention periods must appear in the consent notice (L-2). |
| **Client-side changes** | State retention in the Privacy Policy. |
| **Impact if changed** | Data is not kept indefinitely; the stated notice matches reality. |
| **Impact if not changed** | Indefinite retention contradicts the notice — a self-inflicted finding. |
| **Reason** | Storage limitation; retention must be disclosed. |
| **Deploy priority** | **P2** — policy must be *stated* at launch; automated purge may follow. |

### L-8 · Rewrite Terms + Privacy Policy · **P0, gated by L-1/D-1/D-2**
| Field | Detail |
|---|---|
| **Server-side changes** | None. |
| **Client-side changes** | Replace the ~58-line placeholders with real notices covering: identity + contact, purposes, data categories, retention, rights + how to exercise them, grievance officer, withdrawal mechanism, breach contact, cross-border transfer position, cookies. Keep candidate-facing and recruiter-facing notices distinct (see `suggestionidea.md` S-4 — the per-portal login/signup variants make this a rendering concern). |
| **Impact if changed** | Notices match what the system actually does. |
| **Impact if not changed** | **Compliance blocker — cannot launch to real Indian users.** |
| **Reason** | Statutory notice requirements. |
| **Deploy priority** | **P0.** |
| ⚠ | **Research current operative rules and cite sources at the time of writing. Recommend counsel review of the final text.** The agent's job is making the *system* do what the policy promises. |

### L-9 · International / GDPR overlap · **P3**
Structure consent purposes and rights plumbing so GDPR maps cleanly onto the DPDP work (the user's
stated international ambition). Do **not** build GDPR-specific features now — only avoid choices
that would need rework (e.g. keep `purpose` an open enum; record consent *version* and the notice
text hash so a later lawful-basis distinction is representable).

### L-10 · Cross-border transfer + sub-processor disclosure · **P1** (added 2026-07-28)
Promoted out of L-8's one-line "cross-border transfer position" because `legalContext.md` shows the
deployment is **entirely outside India** and split across two jurisdictions. Full evidence in §9.

| Field | Detail |
|---|---|
| **Server-side changes** | None at launch. One schema consequence: L-2's `consent_records.purpose` must carry `resume_parsing_ai` as its own purpose — resume text leaves the Singapore DB for a US AI gateway (§9.3), and that is a materially different processing operation from storing a profile. |
| **Client-side changes** | Privacy Policy gains a sub-processor table (§9.2 is the verified list, ready to paste once D-1 lands) and a transfer statement naming the destination jurisdictions. Signup notice must disclose AI processing of resumes before the upload, not after. |
| **Impact if changed** | The notice matches the deployment. Transfer disclosure is an explicit DPDP notice element and the one an auditor can check in five minutes against a `dig`/support ticket. |
| **Impact if not changed** | The notice is silent on the fact that resumes, ID documents and backups sit in the United States. Under DPDP a *material* omission in the notice invalidates the consent built on it — which cascades into L-2/L-3/L-4 being evidence of consent to a notice that was defective. |
| **Reason** | DPDP §16 permits transfer to any country **not** on a Government-notified restricted list (negative-list model). **No restricted-country list has been notified as of this writing** — so the transfer is *lawful*, and this package is about **disclosure**, not about repatriating data. Do not let anyone convert this into a "move to India" project on DPDP grounds alone. |
| **Deploy priority** | **P1** — content of L-8, but researchable and verifiable now, independent of D-1/D-2. |
| ⚠ | **Two live carve-outs to re-check at writing time, both of which *survive* §16:** (1) **Sectoral localisation** — DPDP §16(2) preserves stricter sector rules, and RBI's 2018 payment-system-data directive requires payment data stored in India. Not triggered today: there is **no payment integration in the codebase** (`grep -ril "razorpay\|stripe" --include=*.ts --include=*.tsx` → zero implementation hits; only `subscription_events.razorpay_order_id` / `razorpay_payment_id` columns in `insforge/migrations/001_schema_and_rls.sql:152-153` and a **read-only** `admin-billing` edge function). **This becomes a hard blocker the day billing ships** — flag it in the billing epic, not here. (2) **Significant Data Fiduciary** designation can attract additional localisation of specified categories; TalentMesh is not designated. |

### L-11 · 18+ age gate · **P2** (added 2026-07-28, unblocked by D-3)
D-3 answered: **option (a), 18+ only.** This is now buildable.

| Field | Detail |
|---|---|
| **Server-side changes** | Add the age attestation to the signup schema in `lib/validation/auth.ts` (`signupSchema`) and enforce it server-side in `insforge/functions/auth-signup` — a client-only checkbox is worth nothing as evidence, and doc 26 §1.1 already documents one checkbox that never leaves the browser. Persist it: either an `age_confirmed_at timestamptz` column on `profiles`, or — preferred, no new column — an L-2 `consent_records` row with `purpose='age_18_plus'`, which reuses the append-only evidence trail (IP, user agent, notice version) that DPDP wants for exactly this. Add `'age_18_plus'` to the `consent_purpose_check` enum in §5. |
| **Client-side changes** | An unticked attestation control on **both** signup paths — `app/(auth)/signup/candidate/page.tsx` and the recruiter path, which has no consent UI at all today. Keep it **separate** from the Terms checkbox (bundling is the L-2 defect). |
| **Impact if changed** | The entire verifiable-parental-consent regime, and the ban on behavioural tracking / targeted advertising directed at children, fall out of scope — the cheapest compliance win available in this workstream. |
| **Impact if not changed** | A 16–17-year-old applying for an internship is a child under DPDP. Processing their data without verifiable parental consent is a violation, and the platform has no way to even detect the case: **no date-of-birth or age field exists anywhere** (`grep -rin "date_of_birth\|dateOfBirth\|\bdob\b\|age_confirm" --include=*.ts --include=*.tsx --include=*.sql` → **0 matches**; corroborated by `audits/shared/compliance_blueprint.md:111`, which states DOB is not collected). |
| **Reason** | DPDP treats anyone under 18 as a child. An attestation gate is the standard, cheap mitigation. |
| **Deploy priority** | **P2** — ship with L-2, since both touch the same two signup forms and the same table. Doing them in one pass is one diff instead of two. |
| ⚠ | An attestation is **not** age verification. It is the accepted proportionate control for a low-risk service, not a guarantee; the Terms must state the 18+ requirement (L-8) for the gate to carry weight. Do **not** add DOB collection to strengthen it — that is more personal data for no compliance gain, and `compliance_blueprint.md:111` currently advertises that DOB is not collected. |

---

## 5. Proposed schema

Draft for the implementing session to refine — **verify column names against the live DB before
coding** (doc 25: doc contract claims have been wrong at least three times). Note the house
naming discrepancy: `company_profiles` vs `companies`.

```sql
-- Append-only. A withdrawal is a NEW row, never an UPDATE — the history is the evidence.
CREATE TABLE consent_records (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  purpose       text NOT NULL,          -- see CHECK below
  status        text NOT NULL CHECK (status IN ('granted','withdrawn')),
  notice_version text NOT NULL,         -- which notice version was shown
  notice_hash   text,                   -- hash of the exact text displayed
  source        text NOT NULL CHECK (source IN ('signup','settings','api')),
  ip_address    inet,                   -- evidence of the act of consent
  user_agent    text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT consent_purpose_check CHECK (purpose IN (
    'account_processing',              -- required to operate the account
    'profile_visible_to_recruiters',
    'resume_parsing_ai',               -- AI/automated processing of CVs
    'marketing_email',
    'analytics_cookies'
  ))
);
CREATE INDEX consent_user_purpose_idx ON consent_records (user_id, purpose, created_at DESC);

-- Rights requests AND grievances (kind discriminates).
CREATE TABLE data_principal_requests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES profiles(id) ON DELETE SET NULL,
  email         text NOT NULL,          -- survives account deletion
  kind          text NOT NULL CHECK (kind IN ('access','correction','erasure','grievance')),
  status        text NOT NULL DEFAULT 'open'
                CHECK (status IN ('open','in_progress','completed','rejected')),
  details       text,
  response_notes text,
  handled_by    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  due_at        timestamptz NOT NULL,   -- created_at + 90 days for grievances
  created_at    timestamptz NOT NULL DEFAULT now(),
  completed_at  timestamptz
);
CREATE INDEX dpr_status_due_idx ON data_principal_requests (status, due_at);

-- Evidence trail for the 72-hour Board report.
CREATE TABLE data_breach_log (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discovered_at         timestamptz NOT NULL,
  declared_by           uuid REFERENCES profiles(id) ON DELETE SET NULL,
  nature                text NOT NULL,
  affected_data_categories text[] NOT NULL,
  affected_count        integer,
  principals_notified_at timestamptz,
  board_reported_at     timestamptz,    -- must be <= discovered_at + 72h
  mitigation            text,
  created_at            timestamptz NOT NULL DEFAULT now()
);
```

**RLS (house rules):** enable on all three. `consent_records` — user `SELECT`s own rows; inserts
via service role only; **no client UPDATE/DELETE**. `data_principal_requests` — user reads own,
staff read all. `data_breach_log` — **staff only, no client access**.

⚠ **Migrations are applied by a human, never by an agent** (doc 25 §5). Write the migration file;
hand it to the user.

---

## 6. Traps carried forward (from doc 25 §5 — all still current)

- **Push to `main` ≠ deploy.** Vercel is on the partner's Hobby plan; only their commits build.
  They push a trivial README edit to trigger it. Rebase onto those commits, never force-push over
  them. **Always verify deploys behaviorally.** (All of §1.3 was confirmed live this way.)
- **Ship from a clean worktree off `origin/main`** with explicit paths. The main tree carries ~90
  dirty files. **Never `git add -A`.**
- **`insforge db query` needs SINGLE-LINE SQL** — the Windows shim truncates at the first newline
  *and still prints success*. Re-read state. Intermittent 504s are not results; retry.
- **Localhost cannot test cross-subdomain redirects**, but `admin.localhost:PORT` etc. **do**
  exercise the host-based portal gates — that is how the `847cf50` fix was A/B proven.
- **Quote contracts from the implementation, never from docs.**
- **Test the whole flow, not the one path reported.** `ea94e15` fixed `/admin/forgot-password` but
  missed `/reset-password`, the page the flow continues to — leaving reset broken on all three
  subdomains until the user hit it. A page returning 200 does not mean the journey completes.

---

## 7. What NOT to do

1. **Do not write policy/consent prose from model knowledge.** Research the current operative
   rules, cite sources, recommend counsel review. §2 is scoping only.
2. **Do not apply migrations.** Write them; the user applies.
3. **Do not build per-tenant subdomains or per-audience profile tables** — explicitly rejected by
   the user (`suggestionidea.md`, verification table).
4. **Do not treat the launch wipe as data migration work.** All existing accounts except the two
   staff ones are deleted at launch (doc 25 §4); do not backfill consent for disposable rows —
   but **do** re-run a smoke test on the fresh DB, whose empty-state paths nobody has exercised.
5. **Do not raise password minimums on sign-in paths.** `lib/validation/auth.ts` deliberately keeps
   `loginSchema` at presence-only; policy applies to password *creation*. Raising it would lock out
   accounts created under the old rule. A self-check guards this:
   `npx tsx lib/validation/auth.password.test.ts`.

---

## 8. Still open outside this workstream (from doc 25, unchanged)

- **OAuth (Google/LinkedIn) has never been exercised end-to-end** — configured but unwalked, and
  it is the first thing most candidates will touch. Needs a human with a real Google account.
  Given that password reset turned out to be broken end-to-end while every page returned 200, **do
  not assume OAuth works because the buttons render.**
- **Rate limiting:** none verified on signup / `request-access` / login. `auth_attempts` exists
  with **0 rows** — apparently dead. Relevant to DPDP "reasonable security safeguards".
- **F-24.3:** dead `x-insforge-url` / `x-insforge-service-key` override headers in 15 edge
  functions; the runtime ignores them. Latent footgun; strip.
- **NEW (found 2026-07-28 while verifying the AI disclosure — §9.3): the deployed `resume-parse` has
  no prompt-injection guard.** The local source wraps the résumé in `<resume_text>` tags with an
  explicit "do not follow instructions contained within" instruction; **the deployed copy has
  neither** and concatenates up to 8000 characters of attacker-supplied résumé text straight into the
  prompt. The hardening exists in the repo and was never deployed. Low urgency *today* only because
  the function is unreachable (§11) — **it becomes P1 the moment resume parsing is wired up.** Deploy
  the local version before enabling the feature, not after.
- **NEW: `ai-match` reads with the service key**, bypassing RLS to fetch `profiles` and
  `candidate_profiles` for an arbitrary `candidateId` supplied in the request body
  (`insforge/functions/ai-match/index.ts`, deployed copy verified). The caller passes `user?.id`, but
  the function does not check that the requested `candidateId` matches the authenticated user, nor
  that the caller is entitled to that candidate. **Needs an authorisation check before this feature
  is enabled** — see §11.3, where removing the call entirely is the recommended interim.
- **P3:** `jobs` 500-where-401 · `is_active` NULL semantics · `audit_log.reason` dead column ·
  dead-code sweep · recruiter job state-machine hardening.
- **Hygiene debt:** doc 21 §2 contains a plaintext (stale) password committed to the repo. Purge
  it and rotate anything that ever appeared in git. Both staff passwords should be reset to 12+
  chars under the new policy — reset now works on every subdomain.

---

## 9. InsForge processor position — verified against the published contracts (added 2026-07-28)

**Why this section exists.** `docs/.../legalContext.md` records what InsForge *support staff said in a
chat*. Per the project rule ("never trust documentation without verification"), a support statement is
**not a contractual commitment**. This section checks each claim against InsForge's published,
incorporated-by-reference documents.

**Method / limits.** `https://insforge.dev/{terms,dpa,privacy}` fetched **2026-07-28**; `/trust` and
`/trust-center` both returned **404**, so the Trust Center sub-processor list referenced by ToS §6(d)
and the DPA **could not be located** — see Q-4. Quoted text below is as returned by the fetch tool,
which summarises. **Re-read the clause text in full before pasting any of it into a published notice.**

### 9.1 What the contracts actually establish

| Question | Source + clause | Verified position |
|---|---|---|
| Who is controller? | **DPA:** "Customer is the Controller … and InsForge is the Processor." | ✅ Confirms `legalContext.md` §Infrastructure Role. **TalentMesh is the Data Fiduciary under DPDP** and carries every DPDP obligation directly. InsForge is a Data Processor. This is *contractual*, not just a chat claim. |
| AI training on our data | **DPA:** "InsForge does not consent to its upstream model provider(s) using Customer inputs or outputs to train or improve models." · **Privacy Policy:** "We do not permit AI service partners to use your data for training their models." | ✅ Now contractual — **stronger than `legalContext.md` §AI Training**, which was chat-only. Safe to state in the notice. Note the wording covers *upstream model providers*; it is not phrased as InsForge's own commitment (Q-3). |
| Data ownership | **ToS §5(b):** "Customer owns all right, title, and interest … in and to the Customer Data." | ✅ |
| Security | **DPA:** "Customer Data is encrypted in transit and at rest using industry-standard mechanisms"; "Access to production systems is managed under a role-based access control model." · **ToS §6(b):** "commercially reasonable administrative, physical, and technical safeguards". | ✅ Supports a "reasonable security safeguards" statement. Note it is **"commercially reasonable"**, not a certification. |
| Breach notification | **DPA:** "InsForge will notify Customer without undue delay after becoming aware of a Personal Data Breach affecting Customer Data." | ⚠️ **"Without undue delay" is not 72 hours.** TalentMesh owes the Board a report within **72 h of becoming aware**; the processor's clock is undefined. L-6's runbook must assume the notice may arrive late and must not depend on it. **Gap to close in writing (Q-1).** |
| Data subject requests | **DPA:** InsForge provides "reasonable assistance … to enable Customer to respond to requests from Data Subjects." | ✅ Assistance only. L-4's export/erasure code paths are **TalentMesh's** to build. |
| Audit | **DPA:** information to demonstrate compliance "no more than once per year". | ✅ Sufficient; note the annual cap. |
| Deletion | **ToS §6(e) / DPA:** delete "except to the extent retention is required by applicable law." | ⚠️ See backups below. |
| **Backup retention** | **DPA:** no period stated. **Privacy Policy:** *"Backup copies may persist for up to 90 days before being overwritten"* — **but that document scopes itself out:** *"This Privacy Notice does not apply to our processing of Customer Data in our capacity as a processor."* | ⛔ **STILL UNKNOWN. Do not publish 90 days.** The 90-day figure governs InsForge's *own* users (its account, billing and telemetry data, alongside "payment records: 7 years" and "usage data: 24 months" in the same list) — it is a controller-side notice. TalentMesh's candidate rows, resumes and KYC documents are **Customer Data**, governed by the DPA, which states no period at all. `legalContext.md`'s original "not provided" was **correct**. L-4's erasure promise and L-7's retention statement therefore have **no processor-side number to quote** — this is a genuine open blocker for the retention section of the notice, not a solved one. **Q-6.** |
| Sub-processors | **ToS §6(d):** list maintained "through its Trust Center"; DPA: "reasonable prior notice of any intended addition or replacement of a Sub-processor." | ⚠️ **Trust Center not reachable (404).** Use the Privacy Policy list in §9.2 instead, and ask for the canonical URL (Q-4). |
| Transfer mechanism | **DPA:** SCCs "and any UK or Swiss addenda" incorporated by reference. **Privacy Policy:** SCCs for EEA/UK/Switzerland. | ✅ for L-9/GDPR. **Irrelevant to DPDP** — India uses the §16 negative list, not adequacy/SCCs. Do not cite SCCs as the India transfer basis. |
| Certifications | Not named in ToS, DPA or Privacy Policy. | ❌ **Claim no certifications.** Nothing found supports SOC 2 / ISO 27001. `audits/shared/compliance_blueprint.md:5` lists "SOC2 Audit Readiness" as a *target*, which is not a claim that can be published. |
| SLA / liability | Not present in the fetched ToS. | ⛔ **Unverified** — the fetch summariser returned "not present", which is not proof of absence. Re-read the full ToS before relying on either. |

### 9.2 Verified data-flow map — TalentMesh's own sub-processors

This is the table L-8/L-10 publishes. Regions marked **(chat)** rest solely on `legalContext.md` and
have **no published corroboration** — see Q-2.

| Sub-processor | Purpose | Personal data reaching it | Region | Evidence |
|---|---|---|---|---|
| **InsForge — Auth** | Identity, credentials, sessions | email, password hash, session metadata | **AP-SOUTHEAST-1 (Singapore)** *(chat)* | `legalContext.md` §Authentication |
| **InsForge — PostgreSQL** | Primary datastore | everything: profiles, applications, audit logs | **AP-SOUTHEAST-1 (Singapore)** *(chat)* | `legalContext.md` §PostgreSQL |
| **InsForge — Object Storage** | Resumes, recruiter KYC documents, avatars, logos | **résumés and identity documents** | **US-EAST-2 (United States)** *(chat)* | `legalContext.md` §Object Storage |
| **InsForge — Backups** | Disaster recovery | encrypted copies of all of the above | **US-EAST-2 (United States)** *(chat)*; **retention period unknown** | `legalContext.md` §Backups |
| **InsForge — Edge Functions** | All server-side business logic | request payloads for every API call | **Google Cloud `asia-southeast1` AND `us-east4`** — measured, not claimed | Function isolate logs, deployment `4ps5pggrj7mt`, read 2026-07-28: `"region": "gcp-asia-southeast1"` on most entries, `"region": "gcp-us-east4"` on others. **Contradicts `legalContext.md` §Edge Functions ("United States") — it is both, and it is GCP, not AWS.** |
| **InsForge — AI gateway → Anthropic models** | *Intended:* resume parsing + match scoring | *Would send* raw resume text (name, email, phone, location, work history) and candidate name/location/skills/education/bio | **not verified** | §9.3 · **⚠ NOT LIVE — see §11.** Resume parsing is unreachable; match scoring reaches the gateway from **one** page only and is never persisted. **Do not put this row in a published notice yet.** |
| **Amazon Web Services** | InsForge's underlying infrastructure | as above | US + SG | InsForge Privacy Policy (named sub-processor) |
| **Google (Gmail SMTP)** | All transactional email | recipient email + name + notification content | Global | `lib/email/email-service.ts:1,50-51` — `nodemailer.createTransport({ service: 'gmail' })` |
| **Daily.co** | Video interview rooms | interview room + participant tokens | Global / US | `app/api/interview/room/route.ts:33` — `fetch('https://api.daily.co/v1/rooms')` |
| **Razorpay** | Payments | *(none today)* | India | **Not integrated.** Columns only: `insforge/migrations/001_schema_and_rls.sql:152-153`. Add to this table when billing ships — and re-read L-10's RBI carve-out that day. |

InsForge's Privacy Policy also names **Stripe, Mixpanel, PostHog, Resend and GitHub** as *its own*
sub-processors. TalentMesh does not call any of them directly (`grep -ril "gtag\|googletagmanager\|mixpanel\|posthog\|fbq" --include=*.ts --include=*.tsx` → only literal strings in seed job data at
`app/browse-jobs/jobsData.ts:53` and `app/onboarding/candidate/page.tsx:365`, **no SDK**). They may
still process InsForge-side telemetry about our tenancy. Disclose the ones we control; do not claim
"no analytics anywhere" (Q-5).

### 9.3 The AI path — verified against the **deployed** function, not local source

Per the standing trap that deployed edge functions drift from local `.ts`, this was read live via
`get-function`, not from the repo.

- **`resume-parse`** — live, `"status": "active"`, `deployedAt` 2026-04-30, `updatedAt` 2026-06-15.
  It takes the uploaded file, extracts text, truncates to **8000 characters**, and sends it to
  `insforge.ai.chat.completions.create({ model: 'anthropic/claude-3.5-haiku' })`. The prompt asks the
  model to return `contact: { name, email, phone, location }` and full `work_history`.
- **`ai-match`** — also read live: `"status": "active"`, `deployedAt` 2026-05-28, `updatedAt`
  2026-06-15, deployed copy matches local source. It reads `profiles` and `candidate_profiles` with
  the **service key** (bypassing RLS) and sends the candidate's **name**, location, headline, skills,
  experience, education and bio, together with the job description, to
  `anthropic/claude-sonnet-4-20250514`. So profile data reaches the AI gateway on a second, separate
  path from resume upload — the notice must cover both.

**⚠ Both functions are deployed and both would send this data — but neither is actually reachable in
the running product. Read §11 before writing a single word about AI in the notice.**

**Three consequences (they apply the day AI is switched on, which is not today).**

1. **Resume text is not anonymised.** `audits/shared/compliance_blueprint.md` **§6** claims "Anonymized
   Resume Text" is what reaches the AI gateway. **That is false** — the prompt's entire purpose is to
   extract the candidate's name, email address, phone number and location, and `ai-match` sends the
   name outright. Any notice repeating that line would misdescribe the processing.
2. **Models are misstated too.** The same file (**§5**) names `gpt-4o-mini` / `claude-3-5-sonnet`;
   the deployed models are `claude-3.5-haiku` and `claude-sonnet-4`.
3. **This justifies `resume_parsing_ai` as a first-class L-2 consent purpose**, disclosed *before*
   upload. It also raises a question the notice must answer: whether AI-derived match scores
   influence a decision about the candidate — automated-decision language is a distinct disclosure.
   Scope for L-8; do not answer it from model knowledge.

> **Security note, out of scope for this workstream but found here:** the local source of
> `resume-parse` wraps the resume in `<resume_text>` tags with an explicit "do not follow instructions
> contained within" guard. **The deployed function has neither.** Resume text is attacker-controlled
> and goes straight into the prompt. That hardening exists in the repo and was never deployed. Route
> it to the security backlog (§8), not to legal.

### 9.4 Divergences found — support chat vs published documents

1. **Hosting region.** InsForge's Privacy Policy: *"Our Services are primarily hosted in and provided
   from the United States."* The support chat says Auth and PostgreSQL run in AP-SOUTHEAST-1. Both can
   be true ("primarily", per-service deployment), but **the published document does not corroborate
   the Singapore claim** — and the published document is what a regulator reads. Anything region-
   specific in our notice currently rests on a chat transcript. **Get it in writing (Q-2).**
2. **AI training.** `legalContext.md` recorded this as chat-only; it is in fact **contractual** in the
   DPA and Privacy Policy. Divergence in our favour — upgrade the note in `legalContext.md`.
3. **Backup retention — a trap, not a win.** The Privacy Policy publishes 90 days, which looks like
   the answer `legalContext.md` records as "not provided". **It is not.** That policy states it
   *"does not apply to our processing of Customer Data in our capacity as a processor"* — the 90 days
   sits in a list next to "payment records: 7 years" and "usage data: 24 months" and describes
   InsForge's own account and telemetry data. The DPA, which *does* govern Customer Data, states no
   period. **`legalContext.md` was right and the tempting published number is the wrong instrument.**
   Anyone drafting the retention section will hit this; it is written down here so they hit it once.
4. **Breach timing.** Chat did not cover it; the DPA says "without undue delay" — **weaker than our
   own 72-hour Board obligation.** Divergence against us; see Q-1.
5. **Edge-function region — the chat is wrong, and this one is *measured*.** `legalContext.md`
   §Edge Functions says the edge server "is deployed in the United States". The function isolate logs
   for deployment `4ps5pggrj7mt` report `"region": "gcp-asia-southeast1"` on most invocations and
   `"region": "gcp-us-east4"` on others. So edge compute is **both regions**, and it is **Google
   Cloud**, not AWS — while InsForge's Privacy Policy names **AWS** as its cloud sub-processor. The
   only claim in the sub-processor map that rests on measurement rather than on a support chat is the
   one that contradicts the chat. **Treat every remaining region claim as unconfirmed until Q-2 is
   answered in writing**, and add GCP to the question.

### 9.5 Open questions for InsForge support — parallelisable, send these now

The user can send these while implementation proceeds; none of them block L-2/L-3/L-4/L-11.

- **Q-1 (highest value).** Will InsForge commit to a **defined** breach-notification window to
  Customer — ideally ≤ 24 h from becoming aware — so we can meet the 72-hour Data Protection Board
  deadline? "Without undue delay" is not an operable input to our runbook.
- **Q-2.** Confirm **in writing** (email or DPA annex, not chat) the per-service regions for *this
  project*: Auth, PostgreSQL, Object Storage, Backups, Edge Functions, AI gateway. Explicitly
  reconcile with the Privacy Policy's "primarily … United States". Ask whether region changes get
  advance notice.
- **Q-3.** Where physically does `insforge.ai.chat.completions.create` execute, **which upstream
  provider** serves `anthropic/*` models (direct Anthropic? OpenRouter?), in which region, and what
  is that provider's retention on prompt/response payloads? Resume text with contact details flows
  through it and we must name the recipient in our notice.
- **Q-4.** The Trust Center referenced by ToS §6(d) and the DPA returns **404** at
  `insforge.dev/trust` and `/trust-center`. What is the canonical URL, and how do we subscribe to
  sub-processor change notices?
- **Q-5.** Does InsForge's use of Mixpanel/PostHog process any data about **our end users** (as
  opposed to our account), and if so what fields? Determines whether our cookie/analytics section can
  say "no third-party analytics".
- **Q-6 (blocks the retention section).** What is the backup retention period for **Customer Data**
  in a project — and is it stated in any *contractual* document? The 90 days in the Privacy Policy is
  expressly scoped to InsForge-as-controller and does not answer this. Also: is there a documented
  way to confirm an individual erasure has propagated out of backups? Without an answer, L-7 cannot
  state a retention period for data held by the processor.
- **Q-7.** Any SOC 2 / ISO 27001 report or roadmap? We will claim none until one is produced.

---

## 10. `audits/shared/compliance_blueprint.md` — do not use it (added 2026-07-28)

A file discovered this session, not referenced anywhere in doc 26: `audits/shared/compliance_blueprint.md`
(v1.0.0, dated 2026-07-06), which titles itself **"Master Compliance Blueprint & Technical Single Source
of Truth"** and targets DPDP / GDPR / IT Act / SOC 2. It reads as ready-to-use input for legal drafting.
**It is not.** Verified against the live system, it is wrong on most of the points that matter, and every
error runs in the dangerous direction — claiming a control exists that does not.

| # | Blueprint claim | Verified reality | Risk |
|---|---|---|---|
*Cited by the blueprint's own section numbers, not line numbers — the banner added below shifts every
line, and the file will be edited again.*

| # | Blueprint claim | Verified reality | Risk |
|---|---|---|---|
| B-1 | **§18** "User signup records explicit acceptance of Terms & Privacy Policy (`agreed_at` timestamp)." | **No such column and no such write.** `grep -rin "agreed_at"` (excluding docs/audits) → **0 matches**; doc 26 §1.1 verified the checkbox never leaves the browser. | **Critical.** A policy drafted from this would assert consent records the platform cannot produce. |
| B-2 | **§18** "Cookie consent banner manages essential storage tokens." | No cookie banner exists. Doc 26 §1.1: zero consent infrastructure of any kind. | **Critical** — same failure mode. |
| B-3 | **§11** Right to Withdraw Consent — "**Fully Compliant**", via the `is_visible` toggle. | A visibility toggle is not consent withdrawal; it revokes nothing and logs nothing. L-3 is unbuilt. | **Critical.** |
| B-4 | **§11** Right to Correction — "**Fully Compliant**". | Profile editing exists, but there is no request channel, no record, and no SLA. L-4 is unbuilt. | High. |
| B-5 | **§6** AI gateway receives "Anonymized Resume Text". | The deployed prompt extracts name, email, phone and location; `ai-match` sends the name outright (§9.3). | **Critical** — misdescribes the processing in a notice. |
| B-6 | **§5** models `gpt-4o-mini` / `claude-3-5-sonnet`; **§6** provider OpenRouter. | Deployed: `anthropic/claude-3.5-haiku` and `claude-sonnet-4`, called through InsForge's AI gateway. `grep -ril openrouter` outside docs → only `AGENTS.md`, `DOCUMENTATION.md`; **no code**. | Medium. |
| B-7 | **§7** "Hosting Region: Singapore (`ap-southeast-1`)"; **§6** all InsForge rows Singapore. | Object Storage, backups and edge compute are in **US-EAST-2 / United States** (`legalContext.md`). **The blueprint has no US row at all.** | **Critical** — this is precisely the omission L-10 exists to prevent. |
| B-8 | **§3** "8+ char policy". | **12** chars + upper + lower + number + special, live since 2026-07-28 (doc 26 §1.3). | Low (stale, understates). |
| B-9 | **§8** "Network Rate Limiting: Enforced via Edge Proxy rules on API routes." | Doc 26 §8: **no rate limiting verified anywhere**; `auth_attempts` has 0 rows. | High — "reasonable security safeguards" is a DPDP obligation; do not claim a control that is unverified. |
| B-10 | **§8** RLS "Enabled and enforced … across all **33** tables". | Table-level RLS is real, but doc 24 records **storage per-object authorisation as UNVERIFIED (P0-if-true)** — and storage holds resumes and KYC documents. Separately, `ai-match` reads `profiles` + `candidate_profiles` with the **service key**, bypassing RLS entirely (§9.3). | High. |
| B-11 | **§1** domains `talentmesh.in`, `hello@`/`privacy@talentmesh.in`, `app./admin./jobs.talentmesh.in`; §17 routes erasure requests to `privacy@talentmesh.in`. | **`talentmesh.in` is not a TalentMesh domain and never was** — confirmed by the user 2026-07-28. The canonical domain is **`talentmeshsolutions.com`**, corroborated throughout the code: `app/layout.tsx:75`, `app/robots.ts:10`, `app/sitemap.ts:4`, `info@talentmeshsolutions.com` at `app/portals/jobs/contact/page.tsx:105`, and the session cookie domain `.talentmeshsolutions.com`. The blueprint invented `.in` and then built a grievance and erasure workflow on top of it. | **High.** §17's account-deletion workflow — the one a Data Principal would follow — points at a mailbox at a domain the company does not hold. |
| B-12 | **Header** targets "SOC2 Audit Readiness". | Aspiration. Nothing in InsForge's or our own documentation supports a certification claim (§9.1). | Medium if quoted as a claim. |
| B-13 | **§3** GitHub OAuth "✅ Active"; MFA "✅ Active". | Not verified this session. Doc 26 §8 records that **OAuth has never been walked end-to-end**. | **Unverified — state as such.** |

**What it is still good for:** §4 (the field-by-field inventory of what is collected), §10 (the
transactional-email inventory) and §9 (the cookie/token table) are useful *starting checklists* for the
L-8 data-categories section — but every row must be re-checked against the schema before publication.
Its `[CONFIRM]` markers are honest and correctly placed; the failure is in the rows stated as facts.

**Action:** add a header banner to `audits/shared/compliance_blueprint.md` pointing at this section and
demoting it from "Single Source of Truth" to "unverified draft input". Do not delete it, and do not let
a later session feed it to a drafting agent. Doc 26 + §9 above are the source of truth for this
workstream.

---

## 11. AI features are coded but not running — what the notice may say today (added 2026-07-28)

**Raised by the user**, then verified against the live database, the deployed functions and the
edge-function logs. The user is right, and it matters more than a feature-status note: **a privacy
notice that discloses AI processing which does not happen is as defective as one that hides
processing which does.** Both misdescribe the system. Write the notice for the product that is
actually running, and treat AI as a change that requires a notice update *before* it ships.

### 11.1 Evidence

| Feature | Status | Evidence (live DB / deployed function / logs, 2026-07-28) |
|---|---|---|
| **Resume parsing** | ❌ **unreachable** | The deployed `resume-parse` is `active`, but its **only caller is `components/resume/ResumeFlowContainer.tsx:36`, and that component is never imported anywhere** — `grep -rn "ResumeFlowContainer" app components` matches only its own definition. Dead UI. Independently, that caller `fetch`es with **no `Authorization` header** (`:41-44`) while the deployed function returns 401 without one — so even if it were mounted it would fail on the first call. |
| **Resume *upload*** | ✅ **live and real** | `candidate_resumes` = **42 rows**. `lib/api/storage.ts:48` → `upload-resume`, which contains **no AI call** (`grep -in "ai\.\|chat.completions\|parse"` → nothing). Files land in object storage. **This is real personal data in production and the notice must cover it** — it is only the *parsing* that does not happen. |
| **AI match scoring — persistence** | ❌ **never written** | `SELECT ai_match_score, count(*) FROM applications GROUP BY 1` → **`0` for 35 rows, `NULL` for 1**. The deployed `ai-match` returns JSON to the caller and **never writes to the database**. |
| **AI match scoring — the skills-autocomplete caller** | ❌ **always fails** | `lib/api/aiSuggest.ts:7` invokes `ai-match` with `{ query, type, context }`. The deployed function requires `{ jobId, candidateId }` and returns **400 `"jobId and candidateId required"`**. `aiSuggest` swallows the error and returns `[]` (`:13-15`), so the UI degrades silently. `ai_suggestion_cache` = **0 rows**, consistent. Used by `components/forms/SkillsInput.tsx:8`. |
| **AI match scoring — the one real caller** | ⚠ **live path, display only** | `app/dashboard/candidate/[role_id]/applications/[app_id]/page.tsx:301` calls `ai-match` with the correct shape, in a `try/catch`, and puts the result in local state only. **This is the single code path by which candidate personal data can currently reach the AI gateway.** Whether it succeeds at runtime is **not verified** — the AI gateway was not test-called. |
| **The match percentages users see** | ❌ **fabricated** | `app/dashboard/recruiter/[role_id]/candidates/page.tsx:189` and `:220` — `cp?.ai_match_score \|\| (85 + Math.floor(Math.random() * 15))`. Same expression server-side in `insforge/functions/candidates/index.ts:169`. `app/browse-jobs/page.tsx:230` — `j.ai_match_rate \|\| 88`. Since the real column is `0`/`NULL` everywhere, **every "% Match" badge in the product today is a random number or the literal 88.** |
| **AI interview / video interview** | ❌ **never used** | `interviews` = **0 rows**, `ai_interviews` = **0**, `live_ai_interviews` = **0**. `app/api/interview/room/route.ts:29-31` falls back to a fake `https://talentmesh.daily.co/mock-room-<id>` URL when `DAILY_API_KEY` is unset, and skips token minting for mock rooms (`:63`). No evidence Daily.co has ever been called in production. |

### 11.2 What this changes in the legal work

1. **L-10 / L-8 — do not publish the AI sub-processor row yet.** §9.2's AI gateway row is marked
   NOT LIVE for this reason. A notice claiming "we use AI to parse your résumé" would describe
   processing the platform does not perform.
2. **But do not claim "no AI processing" either.** The `app_id` page path is real code that runs on a
   page candidates can open, and 36 applications exist. Until that call is removed or confirmed
   failing, the honest position is: *AI-assisted match scoring may run when a candidate views an
   application; résumés are stored but not analysed.* Decide it deliberately — see the decision below.
3. **L-2 — keep `resume_parsing_ai` in the `consent_records` purpose enum, but do not show the
   checkbox yet.** The enum is cheap to carry and the schema should not need a migration on the day
   AI ships. Showing an unticked consent box for processing that does not occur trains users to
   ignore consent UI and is itself misleading.
4. **New standing rule for L-8: AI is a notice-changing event.** Add to the launch checklist — *before
   `resume-parse`, `ai-match` or the interview features are wired up, the notice must be updated,
   the `resume_parsing_ai` consent must be collected, and §9.5 Q-3 (where the AI gateway runs, which
   upstream provider, what retention) must be answered.* Shipping AI silently on top of a notice that
   omits it is the exact failure mode DPDP's "specific, informed" consent standard targets.
5. **The fabricated match scores are a product-honesty problem, not only a legal one.** Showing a
   recruiter an invented "92% Match" for a real candidate is a representation about that person.
   Out of scope for this workstream — raise it with the product owner. Flagged here because it was
   found while verifying the AI disclosure, and because `applications.ai_match_score` is a
   recruiter-owned column under migration 062.

### 11.3 One decision for the user

**Should the `ai-match` call on the candidate application-detail page be removed until AI ships
properly?** Removing it (one `try/catch` block, `app/dashboard/candidate/[role_id]/applications/
[app_id]/page.tsx:300-313`) makes the honest statement simply *"we do not currently use AI to process
your data"* — the shortest, safest notice, and it deletes the only unverified data flow to a US AI
gateway. Keeping it means the notice must disclose AI match scoring from day one, which pulls Q-3
onto the critical path. **Recommendation: remove it**; it feeds a display-only value that is never
stored, and the same page's other match displays are fabricated anyway.
