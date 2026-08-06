# Navigation & Information Architecture — Apple HIG Reference

Source: developer.apple.com/design/human-interface-guidelines (Navigation, Tab bars, Modality) · iOS 26

---

## The Three Navigation Models

**1. Hierarchical (drill-down).** One path to each screen; back retraces it. Navigation stack + push transitions. Settings, Mail. Default for content with parent→child structure.

**2. Flat (peer sections).** Several top-level categories, switchable at any time. Tab bar. Music, App Store. Default for apps with 2–5 distinct areas.

**3. Content-driven.** Navigation emerges from the content itself. Games, books, immersive media.

Most real apps: **flat at the top (tab bar) + hierarchical inside each tab**.

---

## Tab Bar

- **2–5 tabs on iPhone.** More than 5 → system adds "More", which buries features. Redesign the IA instead.
- Tabs are **destinations, never actions.** A "+" tab that opens a composer is a violation — use a button in the nav bar or a prominent in-content control.
- Every tab stays visible everywhere in the flat hierarchy. Don't hide the tab bar mid-flow (present a modal instead if the flow must be focused).
- Each tab keeps **its own navigation stack** — switching tabs preserves state and scroll position.
- Tapping the active tab pops its stack to the root; tapping again scrolls to top.
- Badges for actionable, countable info only.
- On iPad (iOS 18+), the tab bar can appear at the top / convert to a sidebar — support both.

---

## Navigation Bar & Stack

- Title reflects the **current screen's content**, not the app name.
- Large title at root, shrinking to inline on scroll — the standard system behavior; don't fight it.
- The back button shows the **previous screen's title** (or chevron alone if too long). Never label it "Back" manually and never remove it.
- **Never block the interactive swipe-from-left-edge back gesture.** Full-screen side-swipe carousels and drawers that eat this gesture break the platform's most-used interaction.
- Nav bar trailing area: max 2–3 actions; overflow into an ellipsis menu.
- Destructive or primary flow actions (Save/Cancel) live in nav bars of **modal** screens, not pushed screens.

---

## Modality (Sheets, Full-Screen Covers, Alerts)

Modality interrupts. Use it only when the task is (a) self-contained and (b) requires focus or completion before returning.

### Sheets (default modal)
- Standard sheet: covers most of the screen, parent visible dimmed behind — signals "temporary side-task".
- Support **detents** (medium/large) for progressive tasks; drag between them.
- Dismiss: swipe down + explicit Cancel/Done. If unsaved data exists, intercept dismissal with a confirmation action sheet.
- Sheets present forms, composers, settings-for-this-item, share flows.

### Full-screen covers
For immersive, mandatory flows only: camera, video playback, onboarding that must complete. Everything else → sheet.

### Alerts
- Reserved for **critical** information requiring a decision. Max 2 buttons ideally; destructive option in red; Cancel on the left/bottom.
- Title: the question or issue. Message: what happens next, not what went wrong internally.
- Never use alerts for confirmation of success (use inline/haptic/toast-style feedback), and never for marketing.

### Action sheets / confirmation dialogs
For choosing between multiple actions on one object, especially destructive confirmation ("Delete Draft?"). Destructive action in red, Cancel always present.

**Modal depth rule:** avoid modals over modals. One level; a second only when unavoidable (e.g., photo picker inside a composer).

---

## Search

- Search lives where the content is: search field in the nav bar (or `.searchable` scope bar), activated by pull-down or a dedicated tab if search *is* the app's core.
- Show recent searches and suggestions immediately on focus — never an empty dead screen.
- Filter live as the user types where result sets are local; show explicit search-on-submit for network queries.
- Scope bars (segmented filter under the field) for constraining category.

---

## Deep Structure Rules

- Maximum comfortable drill depth ≈ 3 levels. Deeper → re-think IA or use search/filters.
- Every screen answers: *Where am I? How did I get here? How do I get back?* — if any answer is unclear, the navigation is broken.
- Preserve state on return: scroll positions, selections, half-entered input.
- Deep links must land with a working back path (synthesize the stack), never a dead-end screen.

---

## Navigation Anti-Patterns

- Hamburger/drawer as primary navigation on iPhone (hides the IA; use a tab bar)
- Tab used as an action button (composer, camera "+")
- More than 5 tabs on iPhone
- Hidden tab bar during normal (non-modal) browsing
- Custom back buttons / removed back gesture
- Modal without a visible dismiss affordance
- Alerts for non-critical info or success confirmation
- Titles that don't change per screen ("MyApp" everywhere)
- Deep link that opens a screen with no back path
