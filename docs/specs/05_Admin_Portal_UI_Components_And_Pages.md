# 05 — Admin Portal UI Components & Pages

**Status:** Draft for review
**Owner:** Frontend
**Version:** 1.0 — 2026-07-18
**Cross-refs:** `14_Admin_Portal_Rebuild_Architecture.md` §3.2 (navigation) + §8 (UX system), `03_Admin_Portal_API_Routes_And_Endpoints.md` (every page's backend), `04_Admin_Portal_State_Machines_And_Business_Logic.md` (states each screen renders), `UI Skill/DESIGN_SKILL_ROUTER.md`.

Design source: **`UI Skill/`** — `family-values-design` for direction (operator trust and speed; dense but calm; no decorative motion; numbers are real or visibly errored), one implementation skill (`apple-hig` **or** `material-design-3`, router's rule: don't mix) for component behavior. All styling **CSS Modules**; the inline-style pages (settings tabs, layout 403) are converted on rebuild (D-35); the inline-style `impersonate` page is deleted outright (decision 2).

---

## 1. Page inventory (Tree A after R-1 — the only tree)

| Route | Page | Status | Notes |
|---|---|---|---|
| `/dashboard/admin` | Overview | rework (R-9) | error-not-zero stats; verification-queue alert card |
| `/dashboard/admin/jobs` | Jobs directory | keep + decompose | rows link to detail |
| `/dashboard/admin/jobs/[id]` | **Job detail** | **new** (R-5) | Details / Applicants / History tabs; on-behalf editing |
| `/dashboard/admin/job-approvals` | Approvals queue | rework | filters on `approval_status` (054); reject requires reason |
| `/dashboard/admin/applications` | Applications | keep + delta | stage-change drawer gains reason field |
| `/dashboard/admin/candidates` | Candidates | decompose (R-8) | export via `admin-export` start/poll |
| `/dashboard/admin/recruiters` | Recruiters | **rebuild** (R-7) | 3,062 LOC → list + drawer; membership-centric (06) |
| `/dashboard/admin/companies` | Companies directory | keep + delta | search by name **+ GSTIN**; rows link to detail |
| `/dashboard/admin/companies/[id]` | **Company detail** | **new** (R-6) | 6 tabs (07 §4) |
| `/dashboard/admin/companies/register` | Register company | rework | GSTIN-first field set (doc 14 §7); 409 → attach dialog |
| `/dashboard/admin/verification` | KYC queue | keep, **add to nav** | decision modal unchanged (reference pattern) |
| `/dashboard/admin/announcements` | Announcements | delta (R-11) | draft vs published; fan-out job progress |
| `/dashboard/admin/blogs` | Blogs | keep | — |
| `/dashboard/admin/email-templates` | Templates editor | **ported** (Tree C → A) | replaces stub |
| `/dashboard/admin/plans` | Plans editor | **ported** (Tree B → A) | via `admin-plans`; super_admin |
| `/dashboard/admin/billing` | Billing dashboard | **ported** (Tree B → A) | via `admin-billing`, read-only |
| `/dashboard/admin/reports` | Reports | keep, add to nav | shared metrics module |
| `/dashboard/admin/audit-logs` | Audit viewer | delta | merged table; new filters (action/target/actor/on_behalf_of/date) |
| `/dashboard/admin/team` | **Admin team** | **ported + rebuilt** | staff list, OTP invite, role change, suspend (04 §1) |
| `/dashboard/admin/settings` | Settings | **rebuilt** (§5) | see below |
| `/dashboard/admin/impersonate` | — | **deleted** (decision 2) | mock page removed; Tree-B console **not** ported; no impersonation ships |
| `/dashboard/admin/search` | Universal search | rework | thin shell over `admin-search`; palette is primary UI |
| `/dashboard/admin/notifications` | Notification ops | keep, **not in nav** | FR-12 |
| `/dashboard/admin/[role_id]/messages` | Messages | keep | verify `'me'` fallback (13 §11.6) |
| `/admin/accept-invite` | **Invite acceptance** | **new** | public shell: OTP entry + set-password (03 §5.1) |
| `/admin/forgot-password`, `/admin/reset-password` | Recovery | fixed (R-13) | now POST a real route |
| `/maintenance` | Maintenance page | **new** | renders `maintenance.message`; 503 + Retry-After |

Deleted: `app/portals/admin/**`, `app/(dashboard)/admin/**`, the impersonate page + `ImpersonationBanner` + the 3 cookie readers (decision 2), `/admin/recruiter-requests` (single intake = verification queue).

## 2. Layout & navigation

- Guard: `app/dashboard/admin/layout.tsx` unchanged in authority (getServerUser → staff role → `is_active`); loop mechanism per W6 (`?rd` param, shared 403 component).
- Sidebar: doc 14 §3.2 tree; visibility via `canPerform(role, resource, 'view')` — for `content` staff this collapses to Overview / Content / Reports. **Filtering is UX; the server enforces.**
- `CommandPalette` (⌘K) re-pointed at `admin-search`; grouped results; it is the intended fast path ("easy to find things") — every directory teaches it (placeholder: "Search or press ⌘K").
- Breadcrumbs via `AdminHeader` on every page (exists).

## 3. Shared component library (`app/dashboard/admin/_components/`)

Kept: `AdminHeader`, `AdminStatCard`, `BulkConfirmModal`, `RefreshButton`, `WidgetSkeletons`, `DashboardErrorState`, `CompanyRegisterForm` (reworked fields), `VerificationDecisionModal`.

New / consolidated:

| Component | Contract | Used by |
|---|---|---|
| `StatusBadge` | `{ kind: 'company'\|'member'\|'job'\|'approval'\|'application'\|'staff', value: string }` — one fixed color map for the whole portal | every list/detail |
| `InterventionModal` | `{ title, description, onConfirm(reason) }` — required 10–500 char reason; states "the company's admins will be notified" | R-5/R-6/R-7 on-behalf actions |
| `OtpDialog` | `{ cid, onVerified }` — 6 one-digit inputs, paste-friendly; countdown from `expires_at`; resend button with 60 s cooldown; 3 error states (`otp_invalid` + attempts left, `otp_expired`, `otp_locked`) | accept-invite, email change |
| `EntityLink` | `{ type, id, children }` — canonical cross-links (company→detail, job→detail, user→drawer) | everywhere (doc 14 §8 rule 2) |
| `DetailTabs` | thin wrapper enforcing the Directory→Detail(tab) pattern + per-tab lazy fetch | job/company detail |
| `ExportButton` | start → progress → download, backed by `admin-export`; disabled without `*.export` perm | candidates, recruiters |
| `ConfirmTyped` | destructive-bulk gate: type the count to proceed (extends `BulkConfirmModal`) | bulk deletes |

Decomposition rule (W10): a page file > ~400 lines splits into `_components/` + a `lib/hooks/useAdminX.ts` data hook; no page mixes fetching, mutation, and modal JSX in one file. R-7/R-8 do the two worst pages as part of their rebuild.

## 4. Page specs — the two new detail pages

### 4.1 `/dashboard/admin/jobs/[id]` (R-5)

- **Header:** title · `StatusBadge(job.status)` + `StatusBadge(approval_status)` · company (`EntityLink`) · posting recruiter · created/published dates · plan-slot note ("Company is using 1/1 active slots").
- **Details tab:** all posting fields, read-only by default; "Edit on behalf" → `InterventionModal` → allowlisted PATCH; approve/reject actions (reject → reason).
- **Applicants tab:** applications for this job (stage, candidate, applied date); row → existing application drawer with stage-change (+ reason when staff); per-stage counts strip.
- **History tab:** merged timeline — `audit_log` rows for this job + `application_status_history`.

### 4.2 `/dashboard/admin/companies/[id]` (R-6; full spec in 07 §4)

Tabs: Overview / Members / Jobs / Applications / Verification / Audit. Members tab actions all through `InterventionModal`; `422 last_admin` renders "Promote another member to admin first."

## 5. Settings page rebuild (answers AD-9; replaces the current page)

Tabs and their fate:

| Current | Becomes |
|---|---|
| Hero "Network Governance" | Plain "System Settings" — the theatrical copy goes; every control on this page **does what it says or doesn't exist** |
| Personal Profile (name; email disabled "cannot be changed here") | **Profile & Security**: name edit; **email change via `OtpDialog`** (03 §5.2) — replaces the dead disabled field |
| General Configuration (platformName/supportEmail/tagline) | **Deleted** (no consumer — AD-9). If product later wants `supportEmail`, it ships together with the email-template consumer |
| Administrators List + "Grant Admin Authority" (email+password) | **Moved to `/dashboard/admin/team`** — staff table (name, email, role incl. `content`, status, last active), OTP invite flow (no password field — AD-11), role select, suspend/remove with last-super_admin errors surfaced |
| Architectural Flags (5 toggles) | **Feature Flags (3):** candidate signups, employer signups, public blog — each labeled with its real effect ("blocks new account creation at signup") and only after 03 §8 enforcement lands |
| Danger Nexus (fake maintenance) | **Maintenance Mode (real):** toggle + message field; copy: "Non-staff traffic sees the maintenance page within 30 seconds"; confirm dialog; audit note shown |
| Active Sessions & Devices | Kept; mutations via edge fn (W7); revoke stale/compromised sessions (no impersonation rows exist to manage) |
| Quarantine Manager | Kept; purge/restore via `invokeFunction` (kills the `sessionStorage` token read — AD-10) |

## 6. UX conventions (binding)

1. Directory→Detail everywhere; every entity name is an `EntityLink` (one click to any related record).
2. Mutations: optimistic only for single-row toggles; everything else spinner-in-button + toast; errors render the server's `code` mapped to human text — never raw messages.
3. Empty states name the action ("No pending verifications — new KYC requests appear here").
4. All tables: sticky header, keyboard row focus, 25/page default, server pagination.
5. Loading = existing skeletons; errors = `DashboardErrorState` with retry. Every route keeps `loading.tsx`/`error.tsx`.
6. Dark ops theme (`OpsDarkSidebarShell`) stays; contrast per the chosen implementation skill's accessibility baseline (WCAG AA).
7. Toasts confirm audit-worthy acts with their consequence ("Job rejected — recruiter notified").

## Implementation checklist

- [ ] All ports (plans/billing/team/templates) render inside Tree A guard with CSS Modules; impersonate page deleted, not ported
- [ ] `StatusBadge`/`InterventionModal`/`OtpDialog`/`EntityLink` built once, adopted by every rebuilt page
- [ ] Settings rebuild ships in the same release as migration 056 + proxy maintenance check
- [ ] `content`-role walkthrough: sidebar shows only permitted sections AND direct URLs to others 403
- [ ] Keyboard pass: palette, table focus, modal traps
