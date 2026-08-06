# R-1 (scoped) — Port plans/billing/team/email-templates into Tree A   ·   model: sonnet   ·   phase: 0   ·   date: 2026-07-19

## Prompt given

> Read doc 14 task R-1 in docs/specs/14_Admin_Portal_Rebuild_Architecture.md. Port the plans, billing, team, and templates pages from the orphaned admin trees into Tree A (the live /dashboard/admin tree), matching Tree A's existing conventions. Port only — do not delete the old trees, do not redesign UI, do not touch auth. Verify with a clean npm run build. Output: docs/archive/agent-outputs/adminImplementation/0-R1-port__sonnet.md per the §8 template in doc 08.

Note: this is a **narrower slice of R-1** than doc 14 specifies. Doc 14's R-1 also calls for deleting `app/portals/admin/**` and `app/(dashboard)/admin/**` and rebuilding the full §3.2 sidebar (adding Verification/Reports nav groups). The dispatch prompt explicitly excluded both — "do not delete the old trees" and implicitly, no nav rebuild beyond what's needed for reachability. Both trees are untouched; sidebar got only the one addition described below.

## What changed

Four Tree-A stub pages (previously `AdminComingSoonPage` placeholders) were replaced with the real, working implementations that already existed in the orphaned trees. Each source page was copied as close to verbatim as possible; the only substantive edit was swapping each page's own ad-hoc `createClient({ baseUrl: process.env.NEXT_PUBLIC_BACKEND_URL, anonKey: process.env.NEXT_PUBLIC_ANON_KEY })` instance for Tree A's shared `insforge` client from `@/lib/insforge` — those two env vars don't exist in this codebase (Tree A uses `NEXT_PUBLIC_INSFORGE_URL` / `NEXT_PUBLIC_INSFORGE_ANON_KEY`), so the orphaned pages would have failed to connect at runtime even though they'd compile. This is a connectivity fix, not a behavior or UI change — same queries, same tables, same handlers.

- `app/dashboard/admin/plans/page.tsx` (M) — ported from `app/portals/admin/dashboard/plans/page.tsx`. Client-instantiation fix only; UI/logic unchanged (plan CRUD over `subscription_plans`, live pricing preview, danger-zone deactivate).
- `app/dashboard/admin/plans/plans.module.css` (new) — copied verbatim from the source folder.
- `app/dashboard/admin/billing/page.tsx` (M) — ported from `app/portals/admin/dashboard/billing/page.tsx`. **No edits needed** — this source already imported `{ insforge } from '@/lib/insforge'` and `logAction` from `@/lib/admin/audit`, i.e. it already matched Tree A conventions. Copied verbatim.
- `app/dashboard/admin/billing/billing.module.css` (new) — copied verbatim.
- `app/dashboard/admin/team/page.tsx` (M) — ported from `app/portals/admin/dashboard/team/page.tsx`. Client-instantiation fix only; `invokeFunction` import consolidated onto the same `@/lib/insforge` import as `insforge` (source imported it separately from the same module already). UI/logic unchanged (role/status changes, invite modal, permissions grid over `admin_members`).
- `app/dashboard/admin/team/team.module.css` (new) — copied verbatim.
- `app/dashboard/admin/email-templates/page.tsx` (M) — ported from `app/(dashboard)/admin/email-templates/page.tsx`. Client-instantiation fix only.
- `app/dashboard/admin/email-templates/email-templates.module.css` (new) — copied verbatim.
- `app/dashboard/admin/email-templates/[template_key]/page.tsx` (new — route didn't exist in Tree A) — ported from `app/(dashboard)/admin/email-templates/[template_key]/page.tsx`. Client-instantiation fix only.
- `app/dashboard/admin/email-templates/[template_key]/editor.module.css` (new) — copied verbatim.
- `app/dashboard/admin/email-templates/[template_key]/loading.tsx` (new) — added to match Tree A's per-route `loading.tsx` convention; this route didn't exist before so had no stub loading state. Uses the existing `FormSkeleton` from `@/components/ui/LoadingSkeletons` (same primitive `plans`/`billing` loading stubs use), `fields={6}` to roughly match the editor's field count. No new skeleton component created.
- `components/dashboard/OpsDarkSidebarShell.tsx` (M) — added one nav entry, `{ label: 'Admin Team', href: '/dashboard/admin/team' }`, to the existing super-admin-only `toolsChildren` array (same array/gate that already conditionally adds "System Settings"). Without this, the ported team page would be unreachable from the UI — Plans/Billing/Email Templates already had nav entries pointing at Tree A; Team did not. One line, no restructuring of the nav.

**Not touched, on purpose:**
- `app/portals/admin/**` and `app/(dashboard)/admin/**` — left in place, untouched (instruction: don't delete).
- `app/dashboard/admin/layout.tsx` (the RBAC/redirect guard) — not touched.
- `lib/permissions.ts` — not touched. It already defines `billing`/`team` resources (used by other Tree A pages like `candidates`/`recruiters`) but has no `plans` resource yet (that's an R-4 concern per doc 14 §4.2). None of the four ported pages were retrofitted with `canPerform` gating, since the orphaned sources didn't have it either — adding it now would be scope creep into R-4, not a port.
- `app/portals/admin/dashboard/billing/actions.ts` — **not ported**. Grepped for references; `billing/page.tsx` calls `logAction` directly from `@/lib/admin/audit`, not this local wrapper, and nothing else in the repo references `logAdminBillingAction`. It was dead code in the source tree; porting an unused file isn't part of "port the page."
- Known pre-existing security issues in the ported code (team page's plaintext-password invite flow, direct-from-browser `subscription_plans` writes with no server-side authorization boundary) are exactly the D-6/D-7/D-11 defects doc 14 catalogs and defers to R-4/R-7/R-12/R-13. Out of scope here per "do not touch auth."

## SQL authored (if any)

None.

## Verification run

```
npm run build
```
Result: clean build, exit 0. Grepped build output for `error|warn|fail` (excluding `node_modules`) — no matches. Route manifest confirms all five new/changed routes compiled as dynamic (`ƒ`) pages:

```
├ ƒ /dashboard/admin/billing
├ ƒ /dashboard/admin/email-templates
├ ƒ /dashboard/admin/email-templates/[template_key]
├ ƒ /dashboard/admin/plans
├ ƒ /dashboard/admin/team
```

`git status` confirms the diff is scoped to exactly the files listed above (plus pre-existing unrelated uncommitted changes from before this task started — `app/dashboard/admin/layout.tsx`, `page.tsx`, `settings/page.tsx`, several `insforge/functions/admin-*`, etc. — verified via `git diff --stat` that this session made no edits to those files). `app/portals/admin/**` and `app/(dashboard)/admin/**` show no changes in `git status`, confirming the old trees are untouched.

Not run: a live smoke test against the InsForge backend (no dev server / DB session available in this pass) — the build only proves the code compiles and type-checks, not that `subscription_plans` / `admin_members` / `email_templates` queries resolve correctly against live data or that RLS permits these reads for an admin session. That's a §11-style live-verification gap, not a build gap.

## Deviations / assumptions

- Assumed "templates" in the dispatch prompt means `email-templates` (the only templates-shaped stub in Tree A / orphaned trees). No other "templates" surface exists.
- Fixed each ported page's Insforge client instantiation to use the shared `@/lib/insforge` client instead of the orphaned pages' own `createClient(...)` call against nonexistent env vars. Treated this as required for "matching Tree A's existing conventions" and for the port to actually function, not as a UI/behavior/auth change — the query shapes, table names, and handlers are identical before and after.
- Added the one missing "Admin Team" sidebar link so the ported page is reachable. Judged this as part of "port," not "redesign UI" — it's a single nav-array line, following the exact pattern already used for the adjacent "System Settings" entry (same conditional, same array).
- Did not port `billing/actions.ts` (unused dead code in source — see above).
- Did not add `loading.tsx` changes to the three routes that already had one (plans/billing/email-templates use pre-existing `FormSkeleton`/`ListSkeleton` stubs that were already generic enough to fit the real pages) — only the new `[template_key]` route needed a new `loading.tsx`.

## Open questions for the advisor

- Confirm whether the `[SUGGESTION]`-adjacent client-instantiation fix (swapping `createClient(...)` for the shared `@/lib/insforge` client) should be treated as in-scope for a "port only" task, or whether it should have been flagged and left broken pending a separate task. Judgment call made here: without it the ported pages fail to connect at runtime, so the port would be functionally incomplete without the fix.
- The ported pages carry known pre-R-4/R-7/R-12/R-13 defects verbatim (plaintext password invite in Team, unauthenticated-boundary `subscription_plans` writes in Plans). Confirm these are acceptable to ship in this intermediate state (stubs replaced with pre-existing-but-still-insecure code) versus staying as stubs until their respective hardening tasks land.
- No live-backend smoke test was run (§11 concern) — confirm whether that's required before this port is accepted, or deferred to the Phase 0 gate's broader verification pass.
