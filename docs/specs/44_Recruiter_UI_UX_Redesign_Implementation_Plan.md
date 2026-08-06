# 44 — Recruiter UI/UX Redesign Implementation Plan

**Date:** 2026-08-02  
**Status:** Review draft — no application code changed  
**Scope:** Recruiter workspace navigation, route recovery, responsive shell, and core UX polish

## 1. Recommendation

Redesign the recruiter workspace as a focused ATS control room around the real V1 workflow:

> post a job → review applicants → move candidates through the pipeline → hire

The current sidebar is not yet a good V1 information architecture. It has no Overview/Home destination, uses public aliases for role-scoped pages, groups unrelated utility screens under “Tools,” and still exposes concepts that are intentionally deferred by the V1 scope lock.

The proposed V1 navigation is:

1. Overview
2. Jobs
3. Candidates
4. Pipeline
5. Reports
6. Messages
7. Settings

Notifications should be available from the top bar/account area. Integrations can live under Settings. NVite, Offers Manager, and Interviews should remain hidden until their company-scoped data model and V1.1/V2 implementation are ready.

This draft has also been updated using the installed `jakubkrehel/skills` interface guidance, especially `better-interface`, `better-colors`, and `better-writing`. The package is being used as design-review guidance only; it does not change the application by itself.

## 2. Current findings

### Route recovery problem

The user-facing `/recruiter/dashboard` path is handled by `proxy.ts`, which rewrites recruiter URLs into the guarded canonical tree:

`/dashboard/recruiter/[role_id]/*`

The current sidebar does not include an Overview/Home item. It starts with Jobs, so a recruiter can enter a feature but has no obvious way to return to the recruiter dashboard. The route is therefore technically supported but not discoverable.

The sidebar also builds most links as `/recruiter/*` aliases. That is compatible with the proxy, but it creates two navigation vocabularies and makes active-state behavior harder to reason about.

### Current V1 navigation problems

| Current item | Problem | Recommendation |
|---|---|---|
| Jobs | Too many status pages are exposed as separate destinations | Keep Jobs as the parent; keep status filters inside the job list |
| Candidates | Pipeline is nested under Candidates even though it is a primary workflow step | Promote Pipeline to a first-class item |
| NVite Inbox | Deferred in V1 | Hide until v1.1/V2 |
| Interviews | Deferred in V1 | Hide until Google Meet/scheduling work is ready |
| Offers Manager | Deferred in V1 | Hide until offer data is company-scoped |
| Analytics / Spend Snapshot | Spend data is not available in V1 | Keep one truthful Reports page; remove Spend Snapshot |
| Tools | Catch-all grouping reduces findability | Split Messages and Settings into primary/utility destinations |
| No Overview | Recruiter cannot easily return to dashboard | Add Overview as the first item and make brand click return home |

### Review method for implementation

Before each implementation phase, review the complete primary recruiter flow as one interface system rather than treating navigation, copy, color, layout, and accessibility as separate polish tasks. Every finding should be tied to a concrete component or route, ranked by user impact, and verified at the affected viewport/state.

The first implementation review should cover: authenticated Overview, Jobs list and filters, Candidate database, Pipeline, route aliases, loading/empty/error states, keyboard navigation, and the compact mobile layout. Visual-only assumptions should be marked as unverified until the rendered interface is inspected.

## 3. Route strategy

### Canonical destinations

Use one route helper as the source of truth for recruiter links. The helper should resolve the authenticated recruiter’s role ID and generate canonical internal destinations:

```text
/dashboard/recruiter/[role_id]
/dashboard/recruiter/[role_id]/jobs
/dashboard/recruiter/[role_id]/candidates
/dashboard/recruiter/[role_id]/pipeline
/dashboard/recruiter/[role_id]/reports
/dashboard/recruiter/[role_id]/messages
/dashboard/recruiter/[role_id]/settings
```

Keep `/recruiter/*` and `/recruiter/dashboard` as compatibility/deep-link aliases through the proxy. They may remain valid browser entry points, but new sidebar links should use one consistent strategy.

### Specific fix for `/recruiter/dashboard`

Add an explicit Overview item whose user-facing target is `/recruiter/dashboard` or whose resolved target is the canonical role-scoped dashboard. The recommended behavior is:

- Brand/logo click → recruiter Overview.
- Sidebar Overview click → recruiter Overview.
- Account menu “Recruiter workspace” → recruiter Overview.
- `/recruiter/dashboard` continues to rewrite to `/dashboard/recruiter/[role_id]`.
- Active matching treats `/recruiter/dashboard`, `/recruiter`, and `/dashboard/recruiter/[role_id]` as the same Overview destination.
- Do not hardcode the production host (`app.anujpotfolio.qzz.io`) inside the navigation component; use relative paths and the existing deployment/base-URL behavior.

The implementation must derive the role ID from the authenticated session for authorization. A URL segment may select the rendered route, but it must never become the security boundary.

## 4. Proposed V1 information architecture

### Overview

The recruiter’s home screen should answer three questions immediately:

- What needs my attention today?
- How is the hiring funnel progressing?
- What is the fastest next action?

Recommended content: active job count, new applicants, candidates needing review, pipeline summary, and one primary “Post a job” action. All metrics must be backed by live data; do not reintroduce fabricated scores or spend values.

### Jobs

- All jobs
- Create job as the primary page action, not a permanent top-level tab
- Draft, published, and expired as list filters/tabs
- Templates as a secondary destination

### Candidates

- Candidate database
- Shortlisted, On Hold, and Saved as filters or clearly scoped subviews
- Candidate profile opens as a drawer on wide screens and a full-screen detail route on compact screens

### Pipeline

Promote the existing pipeline to a top-level destination because it is the main V1 work surface after applications arrive. Keep the seven-stage funnel visible, make the active job context explicit, and provide a clear list/table alternative for users who do not work well with Kanban.

### Reports

Use a single truthful Reports destination for V1. Start with counts and funnel activity that the system can actually support. Add spend, plan, and billing insights only when the pricing/billing data is available.

### Messages and Settings

Keep Messages as a first-class destination if the current implementation is functional. Keep Settings as a utility destination. Move Notifications to the top bar/account area with an unread count and an accessible label; retain a full notifications page behind it.

## 5. Visual direction

### Product character

Use a “quiet operations cockpit” direction: calm, dense enough for daily recruiting work, and confident without looking like a generic admin template.

- Retain the dark sidebar as the brand anchor.
- Use a lighter neutral workspace for reading and data work.
- Reserve the TalentMesh accent for active navigation, primary actions, links, and key focus states.
- Keep semantic green/amber/red for success, pending, and error only.
- Avoid decorative gradients, excessive colored cards, emoji icons, and color-only status communication.
- Preserve the existing semantic token system rather than introducing isolated raw colors or a second color notation. If the system is later migrated to OKLCH, migrate the token layer consistently and verify both light and dark appearances.
- Use one color for one meaning: the accent means action/selection, while success, warning, error, and informational colors retain their semantic roles.

### Layout and spacing

- Expanded desktop: approximately 230–240px drawer plus a constrained content area.
- Collapsed desktop: approximately 64–72px icon rail with tooltips and accessible names.
- Use a 4px spacing rhythm, primarily 8/12/16/24/32px.
- Use 16px mobile margins, 24px tablet margins, and a max content width near 1280px.
- Keep page headers, primary actions, filters, and content aligned to one consistent grid edge.

### Typography

Use the existing product font if it is already loaded; otherwise use one legible UI sans-serif. Limit the interface to three useful weights: regular for body, medium for navigation/labels, and semibold for headings and important values. Use a restrained scale around 12/14/16/20/24/30px and tabular numerals for metrics.

Keep navigation and action labels short, sentence-cased, and consistent. Prefer verb-first actions such as “Post job,” “Save candidate,” and “Move to interview” over vague labels such as “Create new,” “Submit,” or “Manage.” Use “Overview” consistently instead of alternating between “Dashboard,” “Home,” and “Recruiter dashboard.”

### Signature detail

Make the active recruiter context visible with a compact workspace header: page title, breadcrumb, current company/recruiter context, and one relevant action. The active sidebar item should use an accent edge or tonal surface plus label/icon contrast—not only a background-color change.

### Visual-design-master quality gates

The implementation must pass these visual gates before a phase is considered complete:

- **Spacing:** every margin, gap, padding, and component height uses the shared 4px rhythm, primarily 4/8/12/16/24/32/48/64px. No one-off values such as 13px, 22px, or 35px.
- **Type:** one UI typeface, three practical weights, and one fixed non-linear scale. Hierarchy must combine size, weight, and color; it must not depend on bolding every label.
- **Color:** keep the workspace neutral-dominant at roughly 60% neutral, 30% structural/muted, and 10% accent. Never use pure black text on pure white, and never use the accent as a large background field.
- **Depth:** define one consistent light direction and a small elevation scale. Use a border or a shadow for most separation, not a heavy border and heavy shadow together. Keep corner radii on a small shared scale.
- **Hierarchy:** make secondary information quieter instead of making every primary element louder. Each screen gets one dominant action; supporting actions remain visually subordinate.
- **Dashboard density:** match density to the recruiting task. Do not force every metric into identical cards or make charts compete with the actual next action. Preserve white space around the most important decision.
- **Dark surfaces:** dark mode/sidebar surfaces must use layered near-black neutrals, not a pure-black inversion. Recheck muted text, borders, focus rings, and accent contrast on the dark shell.

### Anti-generic visual checklist

Before release, review the rendered recruiter pages for these failure modes: purple/blue gradients used decoratively, emoji used as icons, centered body copy in operational cards, every element outlined, all cards given equal visual weight, mixed random radii, competing primary buttons, inconsistent shadow directions, or one gray value used for every text level. Any occurrence must be corrected or explicitly justified before approval.

## 6. Responsive navigation plan

### Desktop, 840px and above

- Persistent expanded drawer by default.
- Optional collapsed rail at 64–72px.
- Keep seven primary destinations visible; place secondary actions in page headers or the account menu.
- Collapsed mode must preserve tooltips, keyboard access, and `aria-label` values.

### Tablet, 600–839px

- Use a navigation rail rather than a full drawer.
- Show icons with short labels where space permits.
- Move secondary navigation into a contextual sheet or page-level tabs.
- Avoid forcing the desktop sidebar into a narrow viewport.

### Mobile, below 600px

- Use a persistent bottom navigation for the four most frequent destinations: Overview, Jobs, Candidates, and More.
- “More” opens a sheet containing Pipeline, Reports, Messages, Settings, Notifications, and external site links.
- Keep the primary “Post a job” action visible in the Overview/Jobs context.
- Use a full-screen route for candidate details and forms; use bottom sheets for filters and short contextual actions.
- Do not make a hamburger drawer the only way to navigate.

## 7. Interaction, state, and accessibility requirements

- Mark the current destination with `aria-current="page"`; mark expanded groups with `aria-expanded`.
- Keep visible `:focus-visible` rings on every link, button, menu, and form control.
- Give icon-only controls an action label, not a description of the icon.
- Maintain at least 44–48px interactive targets and 8px spacing between adjacent targets.
- Preserve keyboard navigation, Escape-to-close behavior, focus trapping in dialogs, and focus return to the invoking control.
- Support 200% text zoom and a 320px-wide layout without overlap or hidden actions.
- Provide loading, empty, error, success, and permission-denied states for every primary destination.
- Use icons, labels, and text in addition to color for selected, pending, error, and success states.
- Use short 150–250ms transitions for navigation and drawers; honor `prefers-reduced-motion` by switching to instant changes or a simple fade.
- Announce async changes such as applicant updates and notifications through an appropriate live region.
- Add a skip-to-content link before the repeated shell chrome and keep one clear `<main>` landmark per page.
- Use native links for navigation and native buttons for actions; do not make generic containers clickable.
- Verify the full focus indicator against both the dark sidebar and light workspace, including forced-colors mode.

## 8. Implementation architecture

### Navigation foundation

Create a recruiter-only navigation configuration and route helper rather than continuing to duplicate literal paths throughout the shell. It should own:

- destination IDs and labels;
- canonical route generation;
- active-route matching, including public aliases;
- permissions/feature flags for deferred modules;
- desktop, rail, and mobile presentation rules.

Keep the shared admin shell behavior intact. The recruiter configuration should be passed into the existing shell or extracted into a recruiter shell only where the behaviors genuinely differ.

### Suggested component boundaries

- `RecruiterNavConfig` — destinations, labels, icons, feature visibility.
- `RecruiterRouteBuilder` — role-scoped canonical URLs and alias normalization.
- `RecruiterNavigation` — desktop drawer, rail, and compact navigation variants.
- `RecruiterWorkspaceHeader` — title, breadcrumb, context, and primary action.
- `RecruiterMoreSheet` — compact-screen secondary navigation.
- Shared `EmptyState`, `LoadingState`, `ErrorState`, `StatusPill`, and `FilterTray` patterns.

Do not create a second routing tree. The existing guarded `app/dashboard/recruiter/[role_id]` tree remains the implementation boundary.

## 9. Phased implementation sequence

### Phase 0 — Review and product decisions

- Confirm the seven-item V1 information architecture.
- Confirm that Messages is a primary destination.
- Confirm whether Reports should remain visible with counts-only content.
- Confirm the preferred public URL presentation: `/recruiter/dashboard` alias or canonical role-scoped URL.
- Confirm whether the dark sidebar remains the brand anchor.

### Phase 1 — Route and navigation foundation

- Add Overview/Home to the recruiter nav.
- Make logo and account “workspace” actions return to Overview.
- Centralize recruiter route generation and active matching.
- Remove deferred V1 entries from all recruiter navigation and create-action menus.
- Remove the misleading Spend Snapshot entry.
- Verify direct load, refresh, client navigation, and back navigation on the production app host.

### Phase 2 — Shell and responsive behavior

- Refine the existing drawer styles and active state.
- Add robust collapsed-rail tooltips and focus behavior.
- Add tablet rail behavior.
- Add compact bottom navigation plus More sheet.
- Add workspace header/breadcrumb pattern.
- Establish spacing, typography, color, focus, and motion tokens without changing business logic.

### Phase 3 — Core V1 work surfaces

- Redesign Overview around live recruiter actions and metrics.
- Redesign Jobs around clear status filters and a single prominent Create job action.
- Redesign Candidates around search, filters, saved/shortlisted states, and responsive profile details.
- Redesign Pipeline around active-job context and clear stage movement.

### Phase 4 — Supporting surfaces

- Align Reports with the truthful V1 data model.
- Refine Messages, Notifications, and Settings.
- Move integrations and external links into an intentional utility area.

### Phase 5 — Validation

- Route matrix: Overview, Jobs, Candidates, Pipeline, Reports, Messages, Settings, aliases, refresh, back/forward, and unauthorized access.
- Viewports: 320px, 375px, 600px, 768px, 1024px, 1440px, and 200% zoom.
- Keyboard-only pass and screen-reader landmarks/labels.
- Reduced-motion pass.
- Empty/error/loading/permission states.
- One authenticated manual ATS journey: post job → open applicants → move a candidate → return to Overview.
- Holistic interface pass: accessibility first, then layout, wording, typography, color, and visual polish; consolidate duplicate findings by root cause.
- Copy pass for navigation labels, empty states, errors, confirmation actions, and loading messages; ensure labels remain clear when translated or shown at 200% text size.
- Color pass for semantic roles and foreground/background pairs in every supported appearance; do not approve a color change from a screenshot alone.
- Visual-design-master gate: inspect the five non-negotiables, the anti-generic checklist, elevation direction, border/shadow usage, card hierarchy, and dark-surface treatment on rendered Overview, Jobs, Candidates, and Pipeline states.

## 10. Acceptance criteria

- A recruiter can return to Overview from every recruiter page in one click.
- `/recruiter/dashboard` and the canonical role-scoped Overview render the same guarded recruiter home.
- The sidebar has no dead, misleading, duplicate, or V1-deferred primary destinations.
- Active navigation remains correct after direct loading, refresh, query-filter changes, and browser back/forward.
- The nav adapts to drawer, rail, and bottom navigation patterns at the agreed breakpoints.
- All supported destinations remain reachable by keyboard and screen reader.
- The redesign does not change company-first authorization, RLS, or route guards.
- No fabricated metrics, AI scores, spend data, or unavailable workflow states are presented as real.
- Navigation, buttons, empty states, errors, and notifications use clear, action-oriented language and expose their state to assistive technology.

## 11. Review decisions requested

Please review these choices before implementation:

1. Approve the seven-item V1 navigation: Overview, Jobs, Candidates, Pipeline, Reports, Messages, Settings.
2. Approve hiding NVite, Interviews, and Offers until their planned scope returns.
3. Approve the route rule: public `/recruiter/dashboard` remains a compatibility alias; the app uses role-scoped canonical destinations internally.
4. Approve the responsive model: drawer on desktop, rail on tablet, bottom navigation plus More on mobile.
5. Approve the visual direction: dark recruiter drawer, neutral work surface, one restrained TalentMesh accent.

After approval, implementation should begin with Phase 1 so the dashboard recovery issue is fixed before visual refinement work.
