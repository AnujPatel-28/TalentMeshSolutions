# Accessibility — Material Design 3 Reference

Source: m3.material.io (Foundations → Accessible design) · WCAG 2.2 · Android accessibility docs

Accessibility in M3 is not an add-on layer — tokens, state layers, and components carry most of it if used correctly. This file covers what components can't do for you.

---

## Touch Targets

- Minimum **48×48dp** target for every interactive element (Android baseline; stricter than Apple's 44pt).
- The *visual* element may be smaller (a 24dp icon) — the *touch* target must still be 48dp (padding or `touchTargetSize`).
- Minimum **8dp spacing** between adjacent targets.
- Compose: `minimumInteractiveComponentSize()`; standard M3 components already comply.
- Dense/desktop density settings may reduce targets — never apply dense density to touch-first surfaces.

---

## Contrast

M3 color roles are designed in tonal pairs that guarantee contrast — **this only works if you pair them correctly**:

| On this surface | Use this content color |
|---|---|
| `primary` | `on-primary` |
| `primary-container` | `on-primary-container` |
| `surface` / `surface-container-*` | `on-surface`, `on-surface-variant` |
| `error` | `on-error` |

The tonal system guarantees ≥4.5:1 between a color and its `on-` pair (tone difference of 40+), and ≥3:1 for container pairs.

**Requirements (WCAG 2.2 AA):**
- Body text: **4.5:1**
- Large text (≥18sp regular / ≥14sp bold): **3:1**
- Icons, input outlines, focus indicators: **3:1** against adjacent colors
- Disabled elements: exempt (but don't disable without explanation — see below)

**Rules:**
- Never mix roles across pairs (`on-primary` text on a `surface` background — no guarantee).
- Dynamic color (wallpaper-derived) preserves tone relationships, so contrast survives *if* you stayed inside the role system. Hardcoded hex breaks this.
- `outline-variant` (borders/dividers) does NOT meet 3:1 — decorative only. Input field outlines use `outline`.
- Test in both light/dark *and* with high-contrast settings enabled.

---

## Color Independence

Color must never be the only signal:

- Selected chip → checkmark icon + fill change, not fill change alone
- Error text field → error icon + supporting text, not red outline alone
- Charts → shape/pattern/label per series, not hue alone
- Badges → number or icon, not a bare colored dot for critical info

---

## Labels & Semantics (TalkBack / screen readers)

- Every icon-only button needs a **content description** ("Add to favorites") — describing the *action*, not the glyph ("heart icon" ✗).
- Decorative images: `contentDescription = null` (Compose) / `importantForAccessibility="no"` so they're skipped.
- State must be programmatically exposed: selected, checked, expanded/collapsed, disabled — Compose `Modifier.semantics` / `stateDescription`, Web `aria-pressed`, `aria-expanded`, `aria-selected`.
- Group related items (`mergeDescendants = true`) so a card reads as one element, not five fragments.
- Headings marked as headings (`Modifier.semantics { heading() }` / `<h1>`–`<h6>`) — screen-reader users navigate by them.
- Live updates (snackbars, async results) announced via live regions (`aria-live="polite"` / `Modifier.semantics { liveRegion }`).
- Reading order must match visual order.

---

## Keyboard & Focus (Web + large screen)

- Everything mouse/touch can do, keyboard can do: Tab/Shift-Tab traversal, Enter/Space activate, arrows within composite widgets (menus, radio groups, tabs).
- **Focus indicator must be visible** — M3 focus state layer + a visible focus ring meeting 3:1. Never `outline: none` without a replacement.
- Focus order follows visual/logical order; dialogs trap focus and return it to the invoker on close.
- No keyboard traps. Escape closes menus, dialogs, sheets.
- FAB and primary actions reachable early in tab order.

---

## Text & Motion

- Support font scaling to **200%** — layouts reflow, never truncate or overlap. Use `sp` for text (never `dp`), don't fix container heights around text.
- Line length ≤ ~60ch for body; don't justify.
- Respect `prefers-reduced-motion` / Android "Remove animations": replace M3 Expressive springs and large transitions with fades or instant changes. Motion must never be required to understand state.
- No flashing content >3 times/second.

---

## Disabled States & Errors

- Disabled = 38% opacity content on 12% container (M3 spec) — intentionally exempt from contrast, so **prefer enabled-with-validation** over disabled-until-valid submit buttons: let the user tap, then show them exactly what's missing.
- Error messaging: supporting text under the field, specific and actionable ("Enter a 10-digit phone number"), announced to screen readers, error icon in the field.

---

## Accessibility Anti-Patterns

- Visual 24dp icon with a 24dp touch target
- `on-` colors mismatched across role pairs, or hardcoded hex bypassing tokens
- `outline-variant` used for meaningful boundaries (fails 3:1)
- Icon buttons without content descriptions
- Selection/error conveyed by color alone
- Focus outline removed on web
- Text in `dp`, or layouts that break at 200% font scale
- Dialogs that don't trap and restore focus
- Snackbar-only critical errors (auto-dismissing, unannounced, unreachable)
- Disabled buttons as the only form-validation feedback
