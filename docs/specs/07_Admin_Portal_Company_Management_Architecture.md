# 07 — Admin Portal Company Management Architecture

**Status:** Draft for review
**Owner:** Backend + Admin tooling
**Version:** 1.0 — 2026-07-18
**Cross-refs:** `07_Company_Management_Architecture.md` (company as root entity — this doc is its admin-console face), `04_State_Machines_And_Business_Logic.md` §§1,3 (company + verification machines), `02_Schema_And_Database_Design.md` migrations 046–051, `14_Admin_Portal_Rebuild_Architecture.md` R-6, `05_Admin_Portal_UI_Components_And_Pages.md` §4.2.

# Purpose

The company is the root business entity; this doc defines the admin console over it: directory, the full-profile company page, KYC decisioning, lifecycle operations, membership oversight ("help the company manage itself when they can't"), and the billing view. Admin drives the **same RPCs and endpoints** the company side uses — plus `on_behalf_of` + `reason` audit annotations. No parallel write paths.

# 1. Directory — `/dashboard/admin/companies`

**Backend:** `admin-companies` GET (kit-based): `search` matches `name` **and `gstin`** (escaped); filters `status ∈ {pending, verified, suspended, deactivated}`, `has_active_jobs`; sort newest/name. Row: name+logo · GSTIN · `StatusBadge` · members count · active jobs · plan · created. Row → detail page.

**[SUGGESTION]** Health-at-a-glance column (verification age / zero-member / zero-job flags) — after the R-9 metrics module exists; helps the "admin proactively helps companies" workflow.

# 2. Registration — `/dashboard/admin/companies/register`

`CompanyRegisterForm` reworked to the GSTIN-first contract (schema in doc 14 §7 — GSTIN required + checksum-format regex, CIN optional, `country_code` default `'IN'`):

- On `409 gstin_conflict` → **Attach dialog**: shows the existing company; offers "open its page" or "invite a recruiter to it" (member `invited` against the existing company). A typo can no longer mint a duplicate tenant.
- Created company: `status='pending'`, `created_by = acting admin`, audit `company_created` (+`on_behalf_of` when done for a requesting recruiter).
- Admin-created companies still require verification to become `verified` — creation grants existence, not trust (the doc-04 §1 machine applies unchanged; the admin can immediately decide the request in the queue if KYC is already in hand).

# 3. Verification (KYC) — `/dashboard/admin/verification`

Kept exactly as built (reference pattern) and finally **navigable** (fixes D-9): queue over `company_verification_requests` (4 status tabs + counts), `VerificationDecisionModal` → `POST /api/admin/verification/decide` → `approve_company_verification` / `reject_company_verification` / `request_more_info_for_verification` RPCs (atomic cascades, `verification_audit_log`, `409 request_not_pending`).

Additions:
- Queue rows link to the company detail page (context before deciding: website, GSTIN, members, prior requests).
- Manual-Gmail Phase-1 flow stands (docs sent to the verification mailbox); **[SUGGESTION]** the Phase-2 assists (GST API validation, domain match) remain assists — the RPC decision stays human, per the company-suite doc 07.

# 4. The company profile page — `/dashboard/admin/companies/[id]`

Backend: `admin-companies get-detail` (payload: doc 14 §7 `CompanyDetail`). Six tabs:

| Tab | Contents | Actions |
|---|---|---|
| **Overview** | status, GSTIN/CIN, website/industry/size/location, created/verified (+by whom), plan + **active-job slots used vs `plan_limits.max_active_jobs`** | Edit (allowlist — `gstin`/`cin`/`status` never editable here); lifecycle buttons per §5 |
| **Members** | roster: name, email, `member_role`, membership `StatusBadge`, joined | invite / change role / suspend / reinstate / remove — all via `InterventionModal` (reason) through the shared member endpoints; `422 last_admin` → "Promote another member to admin first" |
| **Jobs** | company's postings: title, `status` + `approval_status` badges, applications count | row → job detail (R-5); approve/reject inline |
| **Applications** | per-company funnel (8 stages) + recent applications | row → application drawer |
| **Verification** | full request history + current state | decision modal (same as queue) |
| **Audit** | `verification_audit_log` (company lifecycle) merged-view with `audit_log WHERE on_behalf_of = company_id` (admin interventions) | read-only, exportable (super_admin) |

This page is the product answer to "company management can be seen and admin can help them manage it": the **Members tab is the company-admin's own team screen with admin privileges** — same endpoints, same guards, extra audit.

# 5. Lifecycle operations (doc-04 §1 machine — admin console face)

| Action | Precondition | Effect (via existing machine) | Audit |
|---|---|---|---|
| Approve verification | request pending | `approve_company_verification`: company `verified`, invited members `active` | `approved` (RPC-written) |
| Suspend | `verified` | portal guard denies members; jobs hidden from public (company-`verified` visibility rule) | `company_suspended` |
| Reinstate | `suspended` | restore | `company_reinstated` |
| Deactivate | any; **confirm-typed** (company name) | soft-close: jobs `closed`, members `removed` | `company_deactivated` |

No hard-delete of companies (existing deliberate gap stands — doc 13 §5.5). **[SUGGESTION]** company **merge** tooling (survivor keeps GSTIN; members/jobs repointed; loser `deactivated` with `merged_into` metadata) — P3, needed only if pre-GSTIN duplicates exist in real data; with test data wiped, likely never. Skip until proven needed.

# 6. Billing scope (admin view)

Per company-suite doc 07: `subscriptions.company_id → companies`, free plan = 1 active job (`plan_limits`, DB-enforced). Admin surface:

- Company Overview tab shows plan + slot usage (read).
- Plan changes for a company: **Phase 2+** — no admin "set company plan" write ships until the Razorpay subscription lifecycle lands; until then a plan change is a `custom_proposals` conversation (existing, secured flow).
- Platform-wide plan editing: `/dashboard/admin/plans` via `admin-plans` (03 §4), super_admin.
- India compliance: invoices (when built) carry company GSTIN, INR amounts, GST line; `country_code` is the future international branch point.

# 7. Notifications wired to admin actions

Reuse the notification stack (recruiter-suite doc 06): `verification_approved` / `verification_rejected` / `needs_more_info` (from the RPC endpoints — already specified), plus new `admin_intervention` (member/job/application changed on behalf) targeted at the company's active admins. Fired from the endpoints, queued via `notification_jobs`.

# Edge cases

| Case | Resolution |
|---|---|
| Duplicate GSTIN at registration | 409 + attach dialog (§2); DB unique is the backstop |
| Company admin locked out (sole admin, lost email) | admin: Members tab → promote another member to `admin` (guard satisfied) → or reset-link to the sole admin (06 §"actions") |
| Suspend a member with an active session | member traffic denied on next request (portal guard re-checks per render; removal also deletes `user_sessions`) |
| Deactivate with open verification request | request auto-`rejected` with note `company_deactivated` (add to the deactivate action) |
| GSTIN entered wrong at creation | `gstin` immutable via PATCH; correction = super_admin-only dedicated `correct-gstin` action (409 on conflict) with audit — prevents casual identity rewrites |

# Implementation checklist

- [ ] Verification queue in nav; queue rows link to company pages
- [ ] `get-detail` payload complete incl. slot usage; page renders all six tabs
- [ ] Members interventions round-trip the shared endpoints; last-admin guard surfaced correctly
- [ ] GSTIN-first registration + attach dialog; duplicate test (same GSTIN twice) yields 409 not a second row
- [ ] Lifecycle actions write the doc-04 audit actions; deactivate cascades verified on test data
- [ ] `admin_intervention` notifications received by company admins in e2e
