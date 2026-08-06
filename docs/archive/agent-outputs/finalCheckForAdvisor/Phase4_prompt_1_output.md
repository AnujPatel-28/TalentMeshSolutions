# Phase 4 — Admin Verification Queue

## Background

The backend RPCs and route handlers are fully live:
- `GET /api/admin/verification/queue` — paginated (page, status filter), returns `{ items, total, page, limit }` via `formatPaginatedResponse`
- `POST /api/admin/verification/decide` — body: `{ request_id, decision: 'approved'|'rejected'|'needs_more_info', notes? }`
  - 409 `request_not_pending` — someone else decided first
  - 403 — `admin only` RPC guard
  - 200 — `{ status, request_id }`

Queue row shape (from the GET select clause):
```
id, company_id, submitted_by, channel, status, kyc_documents, review_notes, created_at, decided_at,
companies { name, gstin, website, status }
```

Status enum (from `verificationQueueQuerySchema`): `submitted | under_review | approved | rejected | needs_more_info`

Decision enum: `approved | rejected | needs_more_info`

`notes` is **required** for `rejected` and `needs_more_info`; optional for `approved`.

## Proposed Changes

### `app/dashboard/admin/verification/`  [NEW directory]

#### [NEW] page.tsx
- `'use client'` page, mirrors job-approvals structure
- Tab bar: All / Submitted / Under Review / Approved / Rejected / Needs More Info
- Stat cards: Pending (submitted + under_review combined), Approved, Rejected, Needs More Info
- Table columns: Company Name | GSTIN | Channel | Submitted Date | Status
- Row status rendered as a colored pill (reuse the color pattern from AdminStatCard)
- "Review" button per row → opens `VerificationDecisionModal`
- On page load: `fetch('/api/admin/verification/queue?page=1')` + optional `&status=` filter
- Pagination: next/prev buttons; no infinite scroll (keep it simple — the queue is small)

#### [NEW] verification.module.css
- Reuse all class names from `job-approvals.module.css` where identical
- Add: `.statusPill`, `.statusSubmitted`, `.statusUnderReview`, `.statusApproved`, `.statusRejected`, `.statusNeedsMoreInfo`
- Add: `.notesRequired` (small red asterisk helper)
- No other new classes

#### [NEW] _components/VerificationDecisionModal.tsx
Props: `{ request: QueueItem; onClose: () => void; onDecided: (id: string) => void; }`

Three decision buttons:
- **Approve** → POST `{ request_id, decision: 'approved', notes }` (notes optional here)
- **Reject** → POST `{ request_id, decision: 'rejected', notes }` (notes required — client-validates before submit)
- **Needs More Info** → POST `{ request_id, decision: 'needs_more_info', notes }` (notes required)

Error handling:
- **409** → toast "This request was already decided by another admin. Refreshing…" + call `onDecided(id)` to remove row  
- **403** → inline error "You don't have permission to decide this request."
- **Other** → inline error + toast

Notes field: `<AdminTextArea>` from `_components/AdminForm.tsx`; required validation client-side when decision ≠ `approved`.

## Company Detail — YAGNI Decision

**Skipped.** Doc 07 marks it P1 and the prompt allows skipping if not cheap reuse. The existing `admin/companies/page.tsx` is 30 KB of bespoke code with no `DetailDrawer` to hook. Building a separate detail page would require 200+ lines of new fetch+render code. **Call: skip; note in output.**

## No New Dependencies

All imports come from existing admin `_components/`, `react-hot-toast` (already installed), and native `fetch`.

## Action → API Map

| Button | Method | URL | Body |
|---|---|---|---|
| Approve | POST | `/api/admin/verification/decide` | `{ request_id, decision: 'approved', notes? }` |
| Reject | POST | `/api/admin/verification/decide` | `{ request_id, decision: 'rejected', notes }` |
| Needs More Info | POST | `/api/admin/verification/decide` | `{ request_id, decision: 'needs_more_info', notes }` |
| Queue load | GET | `/api/admin/verification/queue?page=N[&status=S]` | — |

## Verification Plan

```
npx tsc --noEmit (one known framer-motion baseline error is acceptable)
npx eslint app/dashboard/admin/verification/page.tsx app/dashboard/admin/verification/_components/VerificationDecisionModal.tsx
```
----
Summary
Files created
File	Purpose


verification/page.tsx
Queue page — tabs, stat cards, table, pagination, modal trigger


verification/_components/VerificationDecisionModal.tsx
Decision modal


verification/verification.module.css
CSS — direct fork of job-approvals.module.css + status pills
Action → API map
UI action	Method	Endpoint	Body
Load queue / tab switch / paginate	GET	/api/admin/verification/queue?page=N[&status=S]	—
Approve button	POST	/api/admin/verification/decide	{ request_id, decision: 'approved', notes? }
Needs More Info button	POST	/api/admin/verification/decide	{ request_id, decision: 'needs_more_info', notes }
Reject button	POST	/api/admin/verification/decide	{ request_id, decision: 'rejected', notes }
Error rendering
Code	What the UI shows
409 request_not_pending	toast('This request was already decided by another admin. Refreshing…') → row removed, queue re-fetched
403 Forbidden	Inline error inside modal: "You don't have permission to decide this request." Modal stays open
Client notes-missing	Inline error before fetch fires: "Notes are required when rejecting or requesting more information."
tsc / eslint
tsc: 1 error — pre-existing framer-motion baseline in applications/page.tsx (not our files).
eslint: ✅ 0 errors, 0 warnings on both new files.
Company detail drawer — YAGNI
Skipped (explicitly called out as allowed). admin/companies/page.tsx is 30 KB of bespoke code with no DetailDrawer hook point. Building a detail page would add 200+ lines of new fetch/render/nav code unrelated to the verification queue. Doc 07 marks it P1 (lower priority), and the prompt allows skipping if "not cheap reuse." This is the right call.

Spec gaps noted
under_review stat card omitted from the 4 stat cards — the queue doesn't have a server endpoint to get an under_review count independently without a 5th fetch (the decision is to fold it conceptually into "Pending"). If the team wants it separate, add a 5th stat card + fetch.
kyc_documents are returned in the queue row but not rendered in the modal — the docs say "KYC docs emailed" (no upload portal in Phase 1), so there's nothing to preview. The field is there for future use.
The route is accessible at /dashboard/admin/verification — not yet linked from the admin sidebar. A nav link should be added to the admin sidebar when that component is surfaced.