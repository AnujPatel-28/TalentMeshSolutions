# 05 — UI Components & Pages

**Status:** Draft for review
**Owner:** Frontend
**Version:** 1.0
**Last Updated:** 2026-07-16

Cross-refs: `03_API_Routes_And_Endpoints.md` (data), `04_State_Machines_And_Business_Logic.md` (states each screen reflects), `06_Recruiter_Portal_Architecture.md`.

---

# Purpose

Map every Recruiter Portal and Company Management screen to **existing scaffold routes** and **reusable components**, specifying which components to reuse vs build, exact form validation, and the empty/loading/error/permission-gated states — so the UI is built consistently with the rest of the app (per CLAUDE.md §3 Surgical Changes: reuse, don't reinvent).

---

# Reuse inventory (verified — do NOT rebuild these)

**Ops-UI kit** `components/dashboard/`: `OpsDarkSidebarShell`, `DataTable`, `FilterBar`, `StatCard`, `StatusPill`, `DetailDrawer`, `EmptyState`, `CandidateTopNavShell` (each with co-located `.module.css`). These are the building blocks for every recruiter list/table/detail screen.

**Admin forms** `app/dashboard/admin/_components/`: `CompanyRegisterForm`, `RecruiterRegisterForm`, `AdminForm`, `AdminHeader`, `AdminStatCard`, `BulkConfirmModal`, `DashboardErrorState`, `WidgetSkeletons`, `AdminComingSoonPage`.

**shadcn primitives** `components/ui/` (+ composites `PageHeader`, `ContentCard`, `SectionHeader`, `LoadingScreen`). **Recruiter domain** `components/recruiter/`: `CandidateProfileDrawer`, `CreateOfferModal`, `InterviewGuidePanel`.

**Validation** `lib/validation/recruiter.ts` (has `companySchema`, `recruiterProfileSchema`, `validateCompany`) — extend, don't duplicate. New schemas go in `lib/validation/company.ts` (`03`).

**State/data:** Zustand `store/uiStore.ts`; TanStack Query keys in `lib/queries/queryKeys.ts`; auth via `lib/auth/AuthContext.tsx` `useAuth()`.

> **Deprecate, do not build on:** the legacy tree `app/company/[companyId]/recruiter/[recruiterId]/*` is superseded by `app/dashboard/recruiter/[role_id]/*`. Mark it dead; new work targets the `dashboard/recruiter` scaffold.

---

# Existing recruiter scaffold routes (verified)

`app/dashboard/recruiter/[role_id]/`: `page.tsx` (overview), `jobs/`, `candidates/`, `pipeline/`, `interviews/`, `offers/`, `nvite/`, `messages/`, `notifications/`, `reports/`, `integrations/`, `settings/`, `pending-approval/`. These pages exist — the work is wiring them to the `03` endpoints + `04` states, plus adding the server guard (`06`).

---

# Page specifications

Format per page: purpose · reuse · new components · states.

## Recruiter overview — `.../[role_id]/page.tsx`
- **Reuse:** `OpsDarkSidebarShell`, `StatCard` row (active jobs / applicants / interviews), `DataTable` (recent applications).
- **New:** `<PlanUsageCard>` — shows "1 / 1 active jobs used" with the free-plan limit from `plan_limits`; CTA "Close a job to post another" when at limit (drives `04` §4 flow).
- **States:** loading → `WidgetSkeletons`; empty (no jobs) → `EmptyState` "Post your first job"; error → `DashboardErrorState`.

## Jobs list — `.../jobs/page.tsx`
- **Reuse:** `FilterBar` (status/type), `DataTable` (title, status `StatusPill`, applicants, created), `DetailDrawer`.
- **New:** `<PostJobButton>` disabled with tooltip when active-limit reached (mirror server rule; server is authority). `<JobStatusActions>` (publish/pause/close) calling `/api/jobs/[id]/{publish,close}`.
- **States:** publish returns `409 ACTIVE_JOB_LIMIT` → toast + open "close an active job" modal.

## Post/edit job — `.../jobs/post-job` (exists) & edit
- **Reuse:** shadcn form primitives, `SkillsInput` (`components/forms/SkillsInput.tsx`), TipTap for description.
- **Validation (`jobCreateSchema`, `03`):** title 3–150; description ≥30; type enum; salary ints ≥0; **no company_id/recruiter_id field** (server-derived — reflects finding C-4). Submit → `insforge.database.rpc('create_job', {...})` via `/api/jobs`.
- **States:** coordinator role → form hidden, `EmptyState` "Coordinators cannot post jobs" (matches `create_job` RPC guard).

## Candidates & pipeline — `.../candidates`, `.../pipeline`
- **Reuse:** `DataTable`, `CandidateProfileDrawer`, `StatusPill`, drag pipeline uses existing application-status transitions (`lib/constants/application-transitions.ts`).
- **Authorization:** list is already company-scoped by RLS (`04` §5) — no client filtering needed; PII only renders for allowed application statuses. Resume view triggers `resume_access_log`.

## Team management — NEW under `.../settings/team` (or `.../team`)
- **Reuse:** `DataTable` (member, role, status), `BulkConfirmModal` (remove), `AdminForm` pattern for invite.
- **New:** `<InviteMemberForm>` (`inviteMemberSchema`: email + role enum) → `/api/company/[id]/members/invite`; `<MemberRoleSelect>` → PATCH. **Visible only to company-admins** (`canPerform` gate + server RLS).
- **States:** last-admin removal → server `422 last_admin` → inline error "Transfer admin before leaving."

## Company profile / branding — NEW `.../settings/company`
- **Reuse:** `CompanyRegisterForm` (extend), image upload via existing `lib/api/storage.ts`.
- **Validation (`createCompanySchema.partial()`):** name, industry, website URL, GSTIN/CIN regex (`03`). Company-admin only.

## Pending-approval — `.../pending-approval/page.tsx` (exists) & `app/(auth)/pending-approval`
- **Reuse:** existing screen. **Wire to `/api/recruiter/status`** to show live state: `invited`→"emails KYC instructions", `rejected`→reason from `review_notes`, `needs_more_info`→re-upload CTA (`04` §3).

## Admin verification queue — `app/dashboard/admin/` (extend existing recruiter-requests)
- **Reuse:** admin `DataTable`, `CompanyRegisterForm`/`RecruiterRegisterForm`, `AdminHeader`.
- **New:** `<VerificationDecisionModal>` (approve / reject+notes / needs-more-info) → `/api/admin/verification/decide`. Shows GSTIN, website, submitted docs, LinkedIn.

---

# Permission-gated UI matrix (rough-idea §7)

Drive visibility with `lib/permissions.ts` helpers (client UX only; RLS is authority). Company-level role (`company_members.member_role`) gates the finer actions:

| UI element | Company Admin | Recruiter | Coordinator |
|---|---|---|---|
| Post/Edit job | ✅ | ✅ (own) | ❌ (hidden) |
| Delete job | ✅ | ❌ | ❌ |
| View applicants | ✅ | ✅ (company) | ✅ (assigned) |
| Invite/Remove member | ✅ | ❌ | ❌ |
| Company settings/branding | ✅ | ❌ | ❌ |
| Billing | ✅ | ❌ | ❌ |

**[SUGGESTION]** extend `PERMISSION_MATRIX` (`lib/permissions.ts`) with company-level actions, or add a parallel `companyPermissions(memberRole)` helper, since the current matrix keys on platform role only and can't distinguish company admin vs recruiter vs coordinator. Trade-off: small helper now vs full Phase-2 RBAC later.

---

# Standard states (every list/detail screen)

- **Loading:** `WidgetSkeletons` / `LoadingScreen`.
- **Empty:** `EmptyState` with a role-appropriate CTA.
- **Error:** `DashboardErrorState` (retry).
- **Forbidden (client):** redirect handled by the server guard (`06`); client shows nothing sensitive.

# Implementation checklist
- [ ] Reuse ops kit + admin forms; zero new table/drawer components where one exists
- [ ] `PlanUsageCard`, `PostJobButton` disable logic mirrors server entitlement
- [ ] Team/company/branding screens gated to company-admin
- [ ] `pending-approval` wired to `/api/recruiter/status`
- [ ] Legacy `app/company/[companyId]/recruiter/*` marked deprecated

# References
`components/dashboard/*`, `app/dashboard/admin/_components/*`, `components/recruiter/*`, `lib/validation/recruiter.ts`, `lib/permissions.ts`, `lib/constants/application-transitions.ts`; `03`, `04`, `06`.

# For UI and UX you can refer this UI SKILL folder if you want
C:\Users\Anuj\Desktop\tm_web\Talentmesh-demo\UI Skill , in this file use the DESIGN_SKILL_ROUTER.md for the routing and all the skill file for the UI and UX implementation.
