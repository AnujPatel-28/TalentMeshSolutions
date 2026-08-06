# Foundations: Typography, Color, Layout, Materials — Apple HIG Reference

Source: developer.apple.com/design/human-interface-guidelines (Foundations) · iOS 26 / Liquid Glass

---

## Typography

### San Francisco (SF)
The system font. Use it unless the brand demands otherwise — it's optically tuned per size and free with the platform.

- **SF Pro Text** — sizes below 20pt (tighter spacing, larger apertures)
- **SF Pro Display** — 20pt and above
- **SF Mono** — code, tabular data
- **New York** — serif companion for editorial content
- The system switches Text/Display automatically; never do it manually.

### The iOS Type Scale (Dynamic Type, default Large size)

| Style | Size / Weight | Use |
|---|---|---|
| Large Title | 34pt Bold | Screen titles (scrolls away) |
| Title 1 | 28pt Regular | Prominent headings |
| Title 2 | 22pt Regular | Section headings |
| Title 3 | 20pt Regular | Sub-sections |
| Headline | 17pt Semibold | Cell titles, emphasis |
| Body | 17pt Regular | Default body text |
| Callout | 16pt Regular | Slightly de-emphasized body |
| Subheadline | 15pt Regular | Secondary descriptions |
| Footnote | 13pt Regular | Auxiliary info |
| Caption 1 | 12pt Regular | Labels under images |
| Caption 2 | 11pt Regular | Smallest legal text |

**Rules:**
- Always use text styles (`.body`, `.headline`), never fixed point sizes — this is what makes Dynamic Type work.
- Body text minimum 17pt; never below 11pt anywhere.
- Test at the largest accessibility sizes (AX5). Layouts must reflow, not truncate.
- Prefer weight and size for hierarchy; avoid more than 2 weights per screen region.

---

## Color

### Semantic system colors — always prefer these
They adapt automatically to light/dark mode and accessibility settings:

- **Labels:** `label`, `secondaryLabel`, `tertiaryLabel`, `quaternaryLabel`
- **Backgrounds:** `systemBackground`, `secondarySystemBackground`, `tertiarySystemBackground` (+ `Grouped` variants for inset-grouped lists)
- **Fills:** `systemFill` … `quaternarySystemFill` (for thin overlays on content)
- **Separator:** `separator`, `opaqueSeparator`
- **Tints:** `systemBlue`, `systemGreen`, `systemRed`, `systemOrange`, etc. — each has distinct light/dark values

**Rules:**
- One app **tint color** drives interactivity. Anything in the tint color reads as tappable — so never use it for non-interactive decoration.
- Red = destructive/error only. Green = success/confirmation.
- Never hardcode hex values that don't adapt to dark mode.
- Don't rely on color alone to convey state — pair with SF Symbols, labels, or weight.
- Contrast: 4.5:1 body text, 3:1 large text and UI components.

---

## Layout

### Safe areas
Content must respect the safe area — never under the notch/Dynamic Island, never under the home indicator. Backgrounds *should* extend edge-to-edge under bars; content should not.

### Margins & spacing
- Standard screen margins: **16pt** (compact width) / **20pt** on larger devices
- Minimum touch target: **44×44pt** — no exceptions
- List row minimum height: 44pt
- Spacing rhythm: 8pt grid (8 / 16 / 24 / 32)

### Size classes
- **Compact width** (iPhone portrait): single column, tab bar, stacked layouts
- **Regular width** (iPad, iPhone Max landscape): split views, sidebars, multi-column
- Design for both from day one; iPad is not a stretched iPhone.

---

## Liquid Glass (iOS 26)

The system material introduced at WWDC 2025. Controls and navigation surfaces are rendered as translucent "glass" that refracts content behind it.

**Principles:**
- Glass is for the **control layer** (bars, buttons, overlays) — never for content itself.
- Content scrolls *under* glass; the material picks up its color, keeping context visible.
- Don't stack glass on glass. One glass layer above content.
- Use standard bars/controls and you get Liquid Glass for free — custom chrome must not fake it with simple blur + opacity.
- Legibility is system-managed (adaptive light/dark tinting); don't put dense text on top of glass surfaces yourself.

---

## SF Symbols

- 6,000+ system icons, aligned to SF font metrics, with 9 weights that match text weight.
- Always prefer an SF Symbol over a custom icon; custom icons must match SF Symbol optical weight and size.
- Symbols scale with Dynamic Type automatically when configured with a text style.
- Use `.fill` variants in tab bars and selected states (per system convention); outline variants for toolbars/inline.
- Never use emoji as icons.

---

## Foundations Anti-Patterns

- Fixed font sizes that ignore Dynamic Type
- Custom fonts below 11pt or body below 17pt
- Tint color used decoratively on non-interactive elements
- Hardcoded colors that break in dark mode
- Content under the home indicator or Dynamic Island
- Touch targets under 44×44pt
- Custom "glass" chrome that fights the system material
- iPad layouts that are stretched iPhone layouts
