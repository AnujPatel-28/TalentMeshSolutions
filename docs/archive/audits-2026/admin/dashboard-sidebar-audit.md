# Admin Dashboard & Sidebar — Technical Audit Report

**Feature Area:** Admin  
**Audit Date:** 2026-06-09  
**Audited By:** Internal implementation review  
**Status:** 🔄 In Progress — Design phase

---

## 1. Summary

This audit covers the optimization of the admin dashboard page loads (stats caching and skeleton loaders) and the synchronization of the sidebar collapsed preference to the database (debounced writes and multi-tab synchronization).

---

## 2. Dashboard Performance Optimizations

**Problem:** Admin dashboard stats loaded slowly on initial render, occasionally showing static `0` counts or layout shifts.

**Solution:** 
- Implement client-side `MetricCache` with a 60-second TTL.
- Render tailored stats card skeletons instead of displaying hardcoded zeroes while fetching fresh data.
- Provide a Manual Refresh button with a freshness indicator to trigger cache eviction and refetching.

---

## 3. Sidebar Preference Synchronization

**Problem:** Sidebar collapse state did not persist across sessions or sync across active open browser tabs.

**Solution:**
- Create a dedicated `public.user_preferences` table with JSONB structure to prevent `profiles` bloat.
- Debounce database updates (5s delay) on toggling the sidebar, using an initiator-only write to prevent write storms across active tabs.
- Abstract sidebar preference logic into `lib/preferences/sidebarPreference.ts` (DB -> localStorage fallback -> viewport defaults).
- Use `BroadcastChannel` to synchronize the collapse state across all open browser tabs instantly.

---

## 4. Proposed File Changes

| File | Change | Role |
|---|---|---|
| `insforge/migrations/010_user_preferences.sql` | [NEW] SQL migration to create `user_preferences` table with RLS | DB Migration |
| `scripts/setup-user-preferences.ts` | [NEW] Migration runner | DB Runner |
| `lib/preferences/sidebarPreference.ts` | [NEW] Sidebar preference store and custom hook | Infrastructure |
| `lib/cache/metricCache.ts` | [NEW] SWR cache helper with invalidation triggers | Infrastructure |
| `app/dashboard/admin/_components/WidgetSkeletons.tsx` | [NEW] Independent skeletons for page widgets | UI Component |
| `app/dashboard/admin/_components/RefreshButton.tsx` | [NEW] Request-safe refresh CTA + freshness label | UI Component |
| `app/dashboard/layout.tsx` | [MODIFY] Consume `useSidebarPreference` + BroadcastChannel follower sync | UI Layout |
| `app/dashboard/admin/page.tsx` | [MODIFY] Use SWR MetricCache + widget skeletons + invalidation | UI Page |

---

## 5. Verification Checklist

| Check | Status |
|---|---|
| Dedicated `user_preferences` table created with RLS | 🔄 Pending |
| Multi-tab sidebar state syncs instantly via BroadcastChannel | 🔄 Pending |
| Sidebar collapse state persists on browser refresh (DB -> localStorage -> responsive fallbacks) | 🔄 Pending |
| Dashboard stats read from SWR cache without blank screen flashing | 🔄 Pending |
| Freshness indicator updates correctly on dashboard | 🔄 Pending |
| Independent widget-level skeletons show on cache miss | 🔄 Pending |
| Cache invalidation correctly triggers on job approval/settings saves/notifications read/logout | 🔄 Pending |
| Multi-click dashboard refresh throttled & enqueued safely | 🔄 Pending |
| Verified performance targets (render <1s, refresh <500ms, toggle <100ms, restore <300ms) | 🔄 Pending |

---

## Changelog

| Date | Change | Author |
|---|---|---|
| 2026-06-09 | Initial report skeleton created for Phase B | System |
