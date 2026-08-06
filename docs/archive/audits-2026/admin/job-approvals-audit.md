# Admin Job Approvals — Technical Audit Report

**Feature Area:** Admin  
**Audit Date:** 2026-06-09  
**Audited By:** Internal implementation review  
**Status:** ✅ Implemented — Deployed to dev

---

## 1. Summary

The job approvals workflow connects the recruiter job posting flow to an admin review gate before listings go live. This audit covers the database constraint mapping, sidebar navigation, UI states, and backend edge function logic.

---

## 2. Critical Fix — DB Check Constraint

**Problem:** `jobs` table has a check constraint: `status IN ('active','paused','closed','draft')`. Attempting to update `status = 'rejected'` throws a constraint violation error.

**Solution:** Map logical states to valid DB values:

| Logical State | `status` | `is_approved` |
|---|---|---|
| Pending Review | `active` | `false` |
| Approved (Live) | `active` | `true` |
| Rejected | `closed` | `false` |

---

## 3. Backend Changes

**File:** `insforge/functions/admin-jobs/index.ts`

- GET: Status filter maps `pending/active/rejected` to DB field combos
- POST: Added `action === 'reject'` case that sets `status='closed'` & `is_approved=false`
- Audit logging added for both approve and reject actions

---

## 4. Frontend Changes

| File | Change |
|---|---|
| `app/dashboard/admin/job-approvals/page.tsx` | Full rewrite — modular CSS, AdminHeader, optimistic UI, ARIA |
| `app/dashboard/admin/job-approvals/job-approvals.module.css` | Created — golden ratio grid, mobile card tables, fullscreen modal |
| `app/dashboard/admin/jobs/page.tsx` | Renamed "Review Queue" → "Job Approvals", CSS module for form |
| `app/dashboard/layout.tsx` | "Job Approvals" nested under "Manage Jobs" sidebar group with badge |

---

## 5. Sidebar Navigation

```
Manage Jobs (accordion)
├── All Jobs          → /dashboard/admin/jobs
└── Job Approvals [12] → /dashboard/admin/job-approvals  ← red badge = pending count
```

---

## 6. Verification Checklist

| Check | Status |
|---|---|
| No DB constraint error on Reject | ✅ |
| Pending queue populated | ✅ |
| Approve moves to Approved tab | ✅ |
| Reject moves to Rejected tab | ✅ |
| Optimistic UI + rollback | ✅ |
| Badge live count on sidebar | ✅ |
| Build passes | ✅ 101 routes, 0 errors |

---

## Changelog

| Date | Change | Author |
|---|---|---|
| 2026-06-09 | Full implementation — DB fix, sidebar, page refactor | System |
