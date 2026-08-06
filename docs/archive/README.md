# Archive — historical, not maintained

**Archived 2026-08-05.** Nothing in this directory is current. It is kept because it records *why*
decisions were made, which the code alone cannot tell you. Do not use it to answer "how does the
system work today" — use [../README.md](../README.md) for that.

Links inside archived documents may point at paths that no longer exist.

---

## What's here

| Folder | Files | What it is |
|---|---|---|
| [`sql-hotfixes/`](sql-hotfixes/) | 12 | ⚠️ **Read the warning below** |
| [`audits-2026/`](audits-2026/) | 56 | Security and feature audits, roughly 2026-06 → 2026-07 |
| [`agent-outputs/`](agent-outputs/) | 55 | Raw per-task reports from AI agent sessions |
| [`misc/`](misc/) | 10 | Superseded plans and one-off analyses |

---

## ⚠️ `sql-hotfixes/` — do not delete without checking

Eleven `fix-*.sql` files plus a pre-migration database snapshot, all previously loose in the repo
root.

Production DDL on this project has been applied **out-of-band, with an empty migration ledger**.
These files may be the **only written record** of a schema change that is live in production right
now. They were archived rather than deleted for exactly that reason.

Before deleting any of them, confirm the change it makes is represented in `insforge/migrations/`.

---

## `audits-2026/`

Point-in-time audits. Many findings have since been fixed; some have not. Cross-reference every
finding against current source before acting.

> **`shared/compliance_blueprint.md` is untrustworthy.** It declares itself the compliance source of
> truth and is wrong on multiple counts. It is retained only as a record that it existed. **Do not
> hand it to anyone as a compliance reference.**

## `agent-outputs/`

Two sets of raw AI-agent task reports:

- `adminImplementation/` — admin-portal rebuild, filenames encode `task__model`
  (e.g. `4-R9-dashboard-metrics__sonnet5.md`)
- `finalCheckForAdvisor/` — numbered phase/prompt outputs from a review sweep

These are working notes, not specifications. Where one contradicts a document in `../specs/`, the
spec wins. Several reports were later found to contain inaccuracies that the review process caught —
which is precisely why they were reviewed.

## `misc/`

Two entries deserve a note:

- **`PROJECT_STRUCTURE-stale.md`** — describes the repo layout *before* the 2026-08-05 cleanup.
  Structurally wrong now, kept only for diffing. Regenerate rather than update.
- **`DOCUMENTATION-legacy.md`** — the former root-level docs entry point, superseded by
  [../README.md](../README.md).
