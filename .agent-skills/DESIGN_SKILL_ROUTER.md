# Design Skill Router

Four specialized design skills, each with a single responsibility. Determine the type of design problem, then load **only** the skill responsible for that area (its `SKILL.md` first; it tells you which reference files to load next).

This folder is self-contained and portable: drop it into any project and point any AI agent at this file. In Claude Code, copy the four skill folders into `.claude/skills/` (project) or `~/.claude/skills/` (global) and they become auto-discoverable.

---

## The Four Skills

| Skill (folder) | Owns | One-line test |
|---|---|---|
| `family-values-design/` | Product **philosophy & feel** — simplicity, fluidity, delight, motion philosophy | "How should this *feel*?" |
| `apple-hig/` | **Interaction & UX patterns** — navigation, modality, gestures, states, iOS/iPadOS | "How should this *behave*?" |
| `visual-design-master/` | **Visual aesthetics** — typography, spacing, color, depth, hierarchy, dark mode, dashboards | "How should this *look*?" |
| `material-design-3/` | **Component specs & systems** — tokens, elevation, state layers, adaptive layout, accessibility, Android/Flutter/web Material | "What is the exact *spec*?" |

---

## Routing Table

| Task involves... | Load |
|---|---|
| Product personality, emotional design, what to simplify, whether motion adds value, onboarding feel, "make it feel premium/alive" | `family-values-design/SKILL.md` |
| Navigation structure, tab bars, modals/sheets, gestures, search, loading/empty/error states, any iOS/iPadOS UI, "is this the right pattern?" | `apple-hig/SKILL.md` |
| Fonts, type scale, spacing, color palettes, shadows, corner radius, icons, white space, dark mode, dashboard/chart layout, "make it look better" | `visual-design-master/SKILL.md` |
| Design tokens, color roles, elevation, hover/focus/pressed/disabled states, responsive/adaptive layout, WCAG compliance, Android/Flutter/Material web components | `material-design-3/SKILL.md` |

**Platform defaults:** building for iOS/iPadOS → `apple-hig` is the interaction authority. Building for Android/Flutter/Material web → `material-design-3` is. Building a non-Material web app → use `apple-hig` for interaction *principles* (states, modality, navigation logic) and `visual-design-master` for all styling; ignore platform-specific chrome.

---

## Combining Skills (full feature / page / app design)

Work top-down — each layer constrains the next:

1. **`family-values-design`** — decide the experience: what's shown now vs progressively disclosed, where delight belongs → *verify: one clear job per screen*
2. **`apple-hig`** (or `material-design-3` on Android) — choose interaction patterns: navigation, modality, all five view states → *verify: every screen has loading/empty/error designed*
3. **`visual-design-master`** — apply visual system: type scale, spacing tokens, palette, depth → *verify: passes the "Looks AI-Generated" checklist*
4. **`material-design-3`** — validate specs: contrast ratios, touch targets, state layers, adaptive breakpoints → *verify: accessibility anti-pattern checklist clean*

For a small component tweak, skip to the single relevant skill — don't load all four for a button color.

---

## Rules

- Never answer a design question from general knowledge when a skill here covers it — load the skill.
- Never mix responsibilities: don't take visual styling from `apple-hig` or interaction behavior from `visual-design-master`.
- When two skills conflict (e.g., HIG vs M3 navigation), **the target platform wins**; `visual-design-master` wins on pure aesthetics; `family-values-design` wins on what to build at all.
- Every skill ends with an anti-pattern checklist — always run it before finalising.
