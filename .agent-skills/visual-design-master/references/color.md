# Color — Visual Design Master Reference

Sources: Practical UI (Dannaway) · Refactoring UI (Wathan & Schoger) · WCAG 2.2 · industry practice

Color is the most abused tool in UI. The fix is almost always *less* color, applied more deliberately.

---

## The 60-30-10 Rule

- **60% neutral** — page backgrounds, card surfaces, most text
- **30% structural** — borders, muted fills, secondary surfaces, icons
- **10% accent** — primary buttons, active states, links, key data points

A professional UI is mostly gray. The brand color reads as important *because* it is scarce. If the accent appears everywhere, nothing is emphasized.

---

## Building the Palette

A complete product UI needs exactly four groups:

### 1. Neutrals (the workhorse — 9–10 steps)
You need far more grays than you think. Build a scale from near-white to near-black:

```css
:root {
  --gray-50:  #fafafa;  /* subtle page background */
  --gray-100: #f4f4f5;  /* hover fills, wells */
  --gray-200: #e4e4e7;  /* borders, dividers */
  --gray-300: #d4d4d8;  /* strong borders, disabled fills */
  --gray-400: #a1a1aa;  /* placeholder text, disabled text */
  --gray-500: #71717a;  /* tertiary text, icons */
  --gray-600: #52525b;  /* secondary text */
  --gray-700: #3f3f46;  /* strong secondary text */
  --gray-800: #27272a;  /* headings on light */
  --gray-900: #18181b;  /* primary text */
}
```

**Tint the grays toward your brand hue** for cohesion: a blue product uses cool grays (slate), a warm product uses warm grays (stone). Pure `#808080`-style grays feel dead next to a colored accent.

### 2. Brand / Primary (5–9 steps, one hue)
One hue, multiple shades. You need light shades (backgrounds, badges), mid shades (buttons, links), dark shades (hover, active, text-on-light):

```css
--primary-50:  /* badge/notification backgrounds */
--primary-100: /* selected item background */
--primary-500: /* links, secondary emphasis */
--primary-600: /* primary buttons (the "main" shade) */
--primary-700: /* button hover */
--primary-800: /* button active, primary-colored text */
```

### 3. Semantic colors (fixed meanings — never repurpose)
| Role | Hue | Usage |
|---|---|---|
| Success | Green | confirmations, positive deltas, completed states |
| Warning | Amber/Yellow | caution, pending, degraded |
| Danger | Red | errors, destructive actions, negative deltas |
| Info | Blue | neutral notices (skip if primary is already blue) |

Each needs at least 3 shades: pale background (`-50`), main (`-600`), dark text (`-800`) — so you can build the standard alert pattern: pale fill + dark text of the same hue.

**Rules:**
- Red is reserved for errors and destruction. Never use it decoratively.
- Green means success. Don't use it as a brand accent if you show success states.
- Semantic colors must also differ by icon/label — color is never the only signal (color-blind users).

### 4. Data visualization palette (only if you have charts)
See `dashboards-dataviz.md`. Categorical chart colors are a separate, deliberately-varied set — don't reuse the semantic trio.

---

## Choosing Shades: Work in HSL

Hex values hide relationships; HSL exposes them.

- **Lighter shade** → increase L, *and slightly rotate H toward yellow* for warm hues / keep S up. Simply adding white (L only) makes colors washed-out.
- **Darker shade** → decrease L, increase S slightly. Simply adding black makes colors muddy.
- **Saturation compensation:** as L moves toward the extremes (very light or very dark), raise S to keep the color from graying out.

```
primary-600: hsl(221, 83%, 53%)   /* base */
primary-100: hsl(221, 90%, 93%)   /* lighter: L up, S up */
primary-800: hsl(222, 90%, 32%)   /* darker: L down, S up */
```

---

## Text Color Rules

- **Never pure black on pure white.** Use `gray-900` on `gray-50`/white. Pure #000/#FFF contrast (21:1) is harsh and increases eye strain.
- **Three text levels, by color not size:**
  - Primary: `gray-900` — headings, key content
  - Secondary: `gray-600` — supporting copy, labels
  - Tertiary: `gray-400/500` — placeholders, timestamps, captions
- **On colored backgrounds, don't use gray.** Use a lighter tint of the background hue (e.g., `primary-200` text on `primary-700` button-adjacent surfaces). Gray-on-color looks disabled.
- **White text on saturated mid-tones often fails contrast** (white on `amber-500`, white on `green-500`). Prefer dark text (`-900` of the same hue) on those fills.

---

## Contrast Requirements (WCAG 2.2 AA)

| Element | Minimum ratio |
|---|---|
| Body text (<18px / <14px bold) | **4.5:1** |
| Large text (≥18px regular / ≥14px bold) | **3:1** |
| UI components (input borders, icons, focus rings) | **3:1** |
| Decorative elements, disabled states | exempt |

Practical implications on white:
- `gray-400` (#a1a1aa) fails for body text — placeholder/disabled only
- `gray-500` (#71717a) ≈ 4.6:1 — the lightest acceptable body text gray
- Most `-600` brand shades pass; most `-400/500` shades don't for small text

Check with a contrast tool, not by eye. When in doubt, go one shade darker.

---

## Backgrounds & Large Areas

- **Saturated brand color is for small areas only** (buttons, badges, active indicators). Large saturated areas exhaust the eye and kill the accent's power.
- Page background: white or `gray-50`. Sidebar: white, `gray-50`, or `gray-900` (dark sidebar + light content is a proven pattern).
- Tinted section backgrounds: use `-50` shades at most (`primary-50` for a highlighted panel).
- Gradients: same hue, two nearby lightness stops (e.g., `primary-500 → primary-700`), subtle. Cross-hue gradients (purple→blue) on cards/buttons is the #1 "AI-generated" tell.

---

## Color Anti-Patterns

- Pure #000 text or pure #000 backgrounds (see `dark-mode.md` for dark surfaces)
- Accent color on more than ~10% of the viewport
- Red for anything other than errors/destruction
- Gray text on colored backgrounds
- Color as the only differentiator between states (add icon/label/weight)
- Random one-off hex values not in the token scale
- Multiple accent hues competing (one brand hue; semantic hues have fixed jobs)
- Neutral grays that ignore the brand's temperature (cold gray UI with a warm accent)
- Failing contrast on placeholder-turned-real-content (placeholders may be light; actual values may not)
