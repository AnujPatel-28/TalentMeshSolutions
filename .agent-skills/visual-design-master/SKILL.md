---
name: visual-design-master
description: >
  Visual design mastery — typography, spacing, color, depth, hierarchy, dark mode, and dashboard
  layout for premium-feeling interfaces. Distilled from Refactoring UI (Wathan & Schoger),
  Practical UI (Dannaway), and industry practice. Use this skill whenever designing or building
  ANY user interface and it needs to look professional, polished, or premium — web app, dashboard,
  landing page, mobile UI, or a single component. Trigger on: "make it look better", "make it
  premium", "polish the UI", "improve the design", "looks AI-generated", "looks generic", "spacing
  feels off", "typography", "font", "color palette", "color scheme", "shadows", "borders", "corner
  radius", "dark mode", "visual hierarchy", "dashboard layout", "data visualization", "charts",
  "cards", "forms", "tables", "white space", "layout grid", or any request to review/critique the
  visual quality of a UI. Framework-agnostic: applies to plain CSS, Tailwind, React, Vue, Flutter,
  SwiftUI — anything with pixels.
---

# Visual Design Master

**Sources:** Refactoring UI (Wathan & Schoger) · Practical UI (Dannaway) · Every Layout · industry practice

This skill defines **how an interface should look**. It is the difference between a UI that works and a UI that looks like a team of professionals shipped it. Every rule here is concrete — sizes, ratios, hex-level decisions — not vague advice.

---

## The Five Non-Negotiables

Apply these before anything else. They fix 80% of amateur-looking UI:

**1. A spacing system, not ad-hoc gaps.** Every margin and padding comes from one scale (4/8/12/16/24/32/48/64px). If a value isn't on the scale, it's wrong. Start with *too much* white space and remove it, not the reverse.

**2. Three font weights, one scale.** One typeface, weights 400/500/600–700, sizes from a fixed non-linear scale. Hierarchy comes from size + weight + color — never from more fonts.

**3. Neutral-dominant color.** ~60% neutral surfaces, ~30% muted structure, ~10% brand/accent. Real UIs are mostly gray; the accent color earns attention *because* it's scarce. Never pure black (#000) text on pure white (#FFF).

**4. One light source.** Shadows are consistent in direction and grow with elevation. Small tight shadows for cards, larger softer ones for modals. Borders OR shadows for separation — rarely both at full strength.

**5. Hierarchy by de-emphasis.** Don't make the important thing louder — make everything else quieter. Secondary text gets muted color, not smaller-and-bold. One primary action per view.

---

## Quick Reference: What to Load

| You need guidance on... | Load |
|---|---|
| Fonts, type scale, weights, line height, letter spacing | `references/typography.md` |
| Spacing scale, padding, margins, grids, alignment | `references/spacing-layout.md` |
| Palettes, neutrals, semantic colors, contrast, 60-30-10 | `references/color.md` |
| Shadows, borders, corner radius, elevation | `references/depth-shadows.md` |
| Hierarchy, icons, white space strategy | `references/visual-hierarchy.md` |
| Cards, forms, tables | `references/components.md` |
| Dashboard layout, charts, data visualization | `references/dashboards-dataviz.md` |
| Dark mode surfaces, text, borders, semantic colors | `references/dark-mode.md` |

Load all relevant files for a full-page or full-app design. For a single component, load its file plus `typography.md` and `spacing-layout.md` (they underpin everything).

---

## The "Looks AI-Generated" Checklist

These are the tells of generated/amateur UI — check against them before finalising:

- [ ] Pure black text (#000) on pure white (#FFF)
- [ ] Purple-to-blue gradient on everything (the default AI aesthetic)
- [ ] Every card the same size in a rigid uniform grid regardless of content importance
- [ ] Emoji used as icons
- [ ] Spacing values off the scale (13px, 22px, 35px...)
- [ ] Centered body text in cards and forms
- [ ] More than 2 typefaces, or more than 3 weights
- [ ] Saturated brand color used for large background areas
- [ ] Border + heavy shadow on the same card
- [ ] Every element outlined — no white-space-based separation
- [ ] All text the same gray — no hierarchy between primary/secondary/tertiary
- [ ] Multiple competing primary buttons in one view
- [ ] Shadows in inconsistent directions or with visible harsh edges
- [ ] Corner radii mixed randomly (4px buttons next to 24px cards next to 9999px inputs)
- [ ] Dark mode that is just inverted colors — same saturated accents, pure black background

---

## How to Use This Skill

1. Identify what's being designed (component / page / whole app / review)
2. Load the relevant reference file(s) from the table above
3. Apply the Five Non-Negotiables first, then the file-specific rules
4. Run the "Looks AI-Generated" checklist before finalising
5. For interaction behavior (how it *works* rather than *looks*), defer to the platform skill (apple-hig / material-design-3); for product feel and motion philosophy, defer to family-values-design
