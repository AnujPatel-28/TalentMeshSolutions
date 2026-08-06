# States: Loading, Empty, Error, Success — Apple HIG Reference

Source: developer.apple.com/design/human-interface-guidelines (Loading, Feedback) · iOS 26

Every screen has more than one state. A screen designed only for the happy path is half-designed. For each data-driven view, design all five: **loading · loaded · empty · error · offline**.

---

## Loading States

### Choose the right indicator

| Situation | Pattern |
|---|---|
| < 1 second expected | Nothing — a flash of spinner is worse than none |
| 1–2 s, unknown duration | Spinner (`UIActivityIndicator` / `ProgressView`) |
| Known duration / determinate work (upload, download, export) | Progress bar with % or fraction |
| Structured content loading (lists, cards, feeds) | **Skeleton/redacted placeholder** shaped like the real content |
| Background refresh of already-visible content | No blocking UI — refresh control or silent update |

**Rules:**
- Never block the whole screen for a partial update. Load what you have; placeholder the rest.
- Skeletons must match the final layout — a skeleton that reflows on load is worse than a spinner.
- Show cached/stale content immediately, then refresh — content-first beats spinner-first.
- If loading exceeds ~10s, add reassurance text and a cancel path.
- Pull-to-refresh for user-initiated refresh of chronological/feed content; it never replaces automatic loading.
- Perceived speed: navigate immediately, load in place. Never make a tap "wait" before the screen transition.

---

## Empty States

An empty screen is a **first-run teaching moment**, not a failure.

**Anatomy (top to bottom):**
1. Illustration or SF Symbol (subtle, secondary color — not a giant sad face)
2. **Title** — what this place is: "No Saved Jobs"
3. **One line of guidance** — why it's empty and what it will hold: "Jobs you save will appear here."
4. **Primary action button** — the single next step: "Browse Jobs"

**Rules:**
- Always provide the action if one exists. A dead-end empty state is abandoned UI.
- Distinguish the three kinds of empty — they need different copy:
  - **First use** (never had content) → educate + call to action
  - **Cleared by user** (inbox zero) → celebrate/confirm, no pushy CTA
  - **No results** (search/filter) → say what was searched, offer to clear filters or adjust
- Keep the surrounding chrome (tab bar, nav bar) so users don't feel lost.
- Never show a blank white screen or a bare "No data" label.

---

## Error States

**The rule: say what to do next, not what went wrong internally.**

| Bad | Good |
|---|---|
| "Error 500" / "Request failed" | "Couldn't load your applications. Check your connection and try again." + **Retry** button |
| "Invalid input" | "Enter a phone number with 10 digits." |
| Alert for every failure | Inline error where the failure happened |

**Placement:**
- **Field-level validation** → inline text directly under the field, red, with the field border tinted red. Validate on blur or submit — never on first keystroke.
- **Content-load failure** → full-area error state (same anatomy as empty state: symbol, title, guidance, Retry).
- **Action failure** (save, send) → alert only if the user must decide something; otherwise inline/toast feedback near the action.
- **Partial failure** → show what succeeded, mark what failed. Never discard user data on failure — preserve input, allow retry.

**Offline is a state, not an error.** Detect it, name it ("You're offline"), show cached content when possible, auto-retry on reconnect.

---

## Success & Feedback

- Every user action gets **immediate acknowledgment**: state change, animation, or haptic — within 100ms.
- Scale feedback to significance:
  - Routine (toggle, save) → the control's own state change is enough; add `.success` haptic for confirmations without visible result
  - Flow completion (submitted, sent) → transient confirmation (checkmark animation / brief banner), auto-dismissing; don't require a tap to dismiss success
  - Rare/major milestone (backup complete, first publish) → a designed moment is appropriate
- Never use a blocking alert to say "Success". If the result is visible (the item appears in the list), that *is* the confirmation.
- After success, move the user forward automatically — dismiss the sheet, return to the updated list.

---

## State Design Checklist (run per screen)

- [ ] Loading: right indicator type; skeleton matches layout; cached content shown first
- [ ] Empty: title + guidance + action; first-use vs cleared vs no-results copy
- [ ] Error: human language, recovery action, input preserved, inline where possible
- [ ] Offline: named explicitly, cached content, auto-recovery
- [ ] Success: immediate, proportional, non-blocking, moves the user forward

---

## State Anti-Patterns

- Spinner covering the whole screen for a single component's refresh
- Skeleton that doesn't match the loaded layout
- Empty state with no action or explanation
- "No results" that doesn't offer to clear the filters that caused it
- Raw error codes / server messages shown to users
- Alert dialogs for success confirmation
- Validation errors firing while the user is still typing the first characters
- Losing form input after a failed submit
- No offline handling — infinite spinner on no connection
