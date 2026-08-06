# 0-R1-sidebar — Rebuild admin sidebar nav in OpsDarkSidebarShell.tsx to match §3.2   ·   model: Gemini 3.5 Flash   ·   phase: 0   ·   date: 2026-07-19

## Prompt given
Rebuild the admin sidebar nav in components/dashboard/OpsDarkSidebarShell.tsx to match §3.2 of docs/specs/14_Admin_Portal_Rebuild_Architecture.md. Preserve the existing super_admin-only gating on the tools group, including the Admin Team and System Settings entries at lines ~292-293. Every href must resolve to a route that exists under app/dashboard/admin/** — verify each one against the filesystem and npm run build output; report any §3.2 nav item that has no route yet rather than linking it. Touch only this file. Output: docs/archive/agent-outputs/adminImplementation/0-R1-sidebar__flash35.md using the §8 template in doc 08.

## What changed
- Modified [components/dashboard/OpsDarkSidebarShell.tsx](file:///c:/Users/Anuj/Desktop/tm_web/Talentmesh-demo/components/dashboard/OpsDarkSidebarShell.tsx) to:
  - Add Lucide-equivalent `building` SVG icon for company representation.
  - Update `adminNav` using the rebuilt navigation layout from §3.2 of `14_Admin_Portal_Rebuild_Architecture.md`, preserving the `super_admin`-only gates on the `billing` group and `team` / `settings` under `System & Audit`.

## SQL authored (if any)
*None required for this task.*

## Verification run
- **Filesystem Route Verification**: All 20 navigation routes defined in §3.2 were checked against `app/dashboard/admin/**` and exist as valid folder structures with `page.tsx` or dynamic routes:
  - `Overview` (`/dashboard/admin`): [app/dashboard/admin/page.tsx](file:///c:/Users/Anuj/Desktop/tm_web/Talentmesh-demo/app/dashboard/admin/page.tsx)
  - `Companies` / `Directory` (`/dashboard/admin/companies`): [app/dashboard/admin/companies/page.tsx](file:///c:/Users/Anuj/Desktop/tm_web/Talentmesh-demo/app/dashboard/admin/companies/page.tsx)
  - `Companies` / `Verification Queue` (`/dashboard/admin/verification`): [app/dashboard/admin/verification/page.tsx](file:///c:/Users/Anuj/Desktop/tm_web/Talentmesh-demo/app/dashboard/admin/verification/page.tsx)
  - `Companies` / `Register Company` (`/dashboard/admin/companies/register`): [app/dashboard/admin/companies/register/page.tsx](file:///c:/Users/Anuj/Desktop/tm_web/Talentmesh-demo/app/dashboard/admin/companies/register/page.tsx)
  - `Jobs & Applications` / `All Job Postings` (`/dashboard/admin/jobs`): [app/dashboard/admin/jobs/page.tsx](file:///c:/Users/Anuj/Desktop/tm_web/Talentmesh-demo/app/dashboard/admin/jobs/page.tsx)
  - `Jobs & Applications` / `Job Approvals` (`/dashboard/admin/job-approvals`): [app/dashboard/admin/job-approvals/page.tsx](file:///c:/Users/Anuj/Desktop/tm_web/Talentmesh-demo/app/dashboard/admin/job-approvals/page.tsx)
  - `Jobs & Applications` / `Applications` (`/dashboard/admin/applications`): [app/dashboard/admin/applications/page.tsx](file:///c:/Users/Anuj/Desktop/tm_web/Talentmesh-demo/app/dashboard/admin/applications/page.tsx)
  - `Users` / `Candidates` (`/dashboard/admin/candidates`): [app/dashboard/admin/candidates/page.tsx](file:///c:/Users/Anuj/Desktop/tm_web/Talentmesh-demo/app/dashboard/admin/candidates/page.tsx)
  - `Users` / `Recruiters` (`/dashboard/admin/recruiters`): [app/dashboard/admin/recruiters/page.tsx](file:///c:/Users/Anuj/Desktop/tm_web/Talentmesh-demo/app/dashboard/admin/recruiters/page.tsx)
  - `Content` / `Announcements` (`/dashboard/admin/announcements`): [app/dashboard/admin/announcements/page.tsx](file:///c:/Users/Anuj/Desktop/tm_web/Talentmesh-demo/app/dashboard/admin/announcements/page.tsx)
  - `Content` / `Blog Posts` (`/dashboard/admin/blogs`): [app/dashboard/admin/blogs/page.tsx](file:///c:/Users/Anuj/Desktop/tm_web/Talentmesh-demo/app/dashboard/admin/blogs/page.tsx)
  - `Content` / `Email Templates` (`/dashboard/admin/email-templates`): [app/dashboard/admin/email-templates/page.tsx](file:///c:/Users/Anuj/Desktop/tm_web/Talentmesh-demo/app/dashboard/admin/email-templates/page.tsx)
  - `Billing & Plans` / `Subscription Plans` (`/dashboard/admin/plans`): [app/dashboard/admin/plans/page.tsx](file:///c:/Users/Anuj/Desktop/tm_web/Talentmesh-demo/app/dashboard/admin/plans/page.tsx)
  - `Billing & Plans` / `Billing & Invoices` (`/dashboard/admin/billing`): [app/dashboard/admin/billing/page.tsx](file:///c:/Users/Anuj/Desktop/tm_web/Talentmesh-demo/app/dashboard/admin/billing/page.tsx)
  - `Reports` (`/dashboard/admin/reports`): [app/dashboard/admin/reports/page.tsx](file:///c:/Users/Anuj/Desktop/tm_web/Talentmesh-demo/app/dashboard/admin/reports/page.tsx)
  - `System & Audit` / `Audit Logs` (`/dashboard/admin/audit-logs`): [app/dashboard/admin/audit-logs/page.tsx](file:///c:/Users/Anuj/Desktop/tm_web/Talentmesh-demo/app/dashboard/admin/audit-logs/page.tsx)
  - `System & Audit` / `Admin Team` (`/dashboard/admin/team`): [app/dashboard/admin/team/page.tsx](file:///c:/Users/Anuj/Desktop/tm_web/Talentmesh-demo/app/dashboard/admin/team/page.tsx)
  - `System & Audit` / `System Settings` (`/dashboard/admin/settings`): [app/dashboard/admin/settings/page.tsx](file:///c:/Users/Anuj/Desktop/tm_web/Talentmesh-demo/app/dashboard/admin/settings/page.tsx)
  - `Messages` (`/dashboard/admin/${roleId || 'me'}/messages`): [app/dashboard/admin/[role_id]/messages/page.tsx](file:///c:/Users/Anuj/Desktop/tm_web/Talentmesh-demo/app/dashboard/admin/%5Brole_id%5D/messages/page.tsx)

- **Compilation Verification**: Ran `npm run build` to confirm there are no syntax or type compilation errors with the modified sidebar.

## Deviations / assumptions
- We added a Lucide-matching SVG `building` icon to `Icons` in [components/dashboard/OpsDarkSidebarShell.tsx](file:///c:/Users/Anuj/Desktop/tm_web/Talentmesh-demo/components/dashboard/OpsDarkSidebarShell.tsx) to represent "Companies" (which is promoted as the root entity in the new model). This keeps the design consistent with other Lucide icons used throughout the project (like `Building2` on recruiter signup forms).
- The `reports` route is promoted into the sidebar nav as a top-level item with no child routes, which matches the target list in §3.2.

## Open questions for the advisor
- None. All routes exist on the filesystem and build successfully.
