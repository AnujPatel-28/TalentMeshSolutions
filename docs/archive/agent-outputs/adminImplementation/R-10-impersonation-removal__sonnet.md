# R-10 — Impersonation Removal (Option A, CONFIRMED)

**Source spec:** `14_Admin_Portal_Rebuild_Architecture.md §R-10` (W4 Option A, P0 removal)
**Cross-refs:** `03_Admin_Portal_API_Routes_And_Endpoints.md §5.4`, `04_Admin_Portal_State_Machines_And_Business_Logic.md`
**Model:** Claude Sonnet 4.6 (Thinking)
**Date:** 2026-07-19

---

## 1. Spec Summary

R-10 requires full removal of the impersonation surface before launch (P0 gate):

| Spec target | Detail |
|---|---|
| `app/api/impersonate/route.ts` | Delete |
| `app/dashboard/admin/impersonate/` | Delete directory (page + loading) |
| `components/admin/ImpersonationBanner.tsx` | Delete |
| `components/admin/ImpersonationBanner.module.css` | Delete |
| `AuthContext.tsx:327-329` | Delete 3 cookie reads + enclosing if-block |
| `DashboardLayoutClient.tsx:345` | Delete `isImpersonating` cookie-read |
| `lib/insforge.ts:175` | Delete mutation-block cookie-read |

Option B (rebuild) is explicitly retained in the spec as a backlog note only — not in scope.

---

## 2. Pre-Change Discovery

Command run (verbatim output):

```
PS> Get-ChildItem -Recurse -Force -ErrorAction SilentlyContinue | Where-Object { $_.FullName -match 'impersonat' } | Select-Object FullName, Length

FullName                                                                                     Length
--------                                                                                     ------
C:\Users\Anuj\Desktop\tm_web\Talentmesh-demo\app\api\impersonate
C:\Users\Anuj\Desktop\tm_web\Talentmesh-demo\app\api\impersonate\route.ts                    3324
C:\Users\Anuj\Desktop\tm_web\Talentmesh-demo\app\dashboard\admin\impersonate
C:\Users\Anuj\Desktop\tm_web\Talentmesh-demo\app\dashboard\admin\impersonate\loading.tsx     142
C:\Users\Anuj\Desktop\tm_web\Talentmesh-demo\app\dashboard\admin\impersonate\page.tsx        5332
C:\Users\Anuj\Desktop\tm_web\Talentmesh-demo\components\admin\ImpersonationBanner.module.css 1280
C:\Users\Anuj\Desktop\tm_web\Talentmesh-demo\components\admin\ImpersonationBanner.tsx        1978
```

All spec-listed files confirmed present.

---

## 3. Changes Made

### 3.1 Files Deleted (5 files / 2 directories)

```
Remove-Item -Recurse -Force "app\api\impersonate"
Remove-Item -Recurse -Force "app\dashboard\admin\impersonate"
Remove-Item -Force "components\admin\ImpersonationBanner.tsx"
Remove-Item -Force "components\admin\ImpersonationBanner.module.css"
```

Files deleted:
- `app/api/impersonate/route.ts` (3 324 bytes) — the impersonation POST/DELETE route
- `app/dashboard/admin/impersonate/page.tsx` (5 332 bytes) — mock impersonation UI page
- `app/dashboard/admin/impersonate/loading.tsx` (142 bytes) — loading skeleton for above
- `components/admin/ImpersonationBanner.tsx` (1 978 bytes) — sticky banner component
- `components/admin/ImpersonationBanner.module.css` (1 280 bytes) — banner styles

### 3.2 lib/auth/AuthContext.tsx — Cookie readers + state removed

Interface fields removed (lines 25-27):
```diff
-  isImpersonating: boolean;
-  impersonatedUser?: { id: string; role: string } | null;
-  adminId?: string | null;
```

useState declarations removed (lines 39-40):
```diff
-  const [impersonatedUser, setImpersonatedUser] = useState<{ id: string; role: string } | null>(null);
-  const [adminId, setAdminId] = useState<string | null>(null);
```

Derived value removed (line 99):
```diff
-  const isImpersonating = !!impersonatedUser && !!adminId;
```

Cookie-read block removed (lines 325-338):
```diff
-      // Check impersonation status from cookies
-      if (typeof window !== 'undefined') {
-        const impId = document.cookie.match(/impersonating_user_id=([^;]+)/)?.[1];
-        const impRole = document.cookie.match(/impersonating_user_role=([^;]+)/)?.[1];
-        const admId = document.cookie.match(/admin_user_id=([^;]+)/)?.[1];
-        if (impId && impRole && admId) {
-          setImpersonatedUser({ id: impId, role: impRole });
-          setAdminId(admId);
-        } else {
-          setImpersonatedUser(null);
-          setAdminId(null);
-        }
-      }
```

Context value entries removed (lines 800-802):
```diff
-      isImpersonating,
-      impersonatedUser,
-      adminId
```

### 3.3 app/dashboard/DashboardLayoutClient.tsx

Import removed (line 12):
```diff
-import ImpersonationBanner from '@/components/admin/ImpersonationBanner';
```

Cookie-read derivation removed (line 345):
```diff
-    const isImpersonating = typeof window !== 'undefined' ? document.cookie.includes('tm_impersonating_user_id=') : false;
```

Conditional banner JSX removed (lines 727-733):
```diff
-                {isImpersonating && (
-                    <ImpersonationBanner
-                        userName={authUser.name || 'User'}
-                        userEmail={authUser.email}
-                        role={authUser.role}
-                    />
-                )}
```

### 3.4 lib/insforge.ts — Mutation-block cookie reader removed (lines 173-187)

```diff
-  // Block mutations during impersonation for security
-  if (typeof window !== 'undefined' && method !== 'GET') {
-    const isImpersonating = document.cookie.includes('tm_impersonating_user_id=');
-    if (isImpersonating) {
-      console.warn('Mutation blocked: You are in READ-ONLY impersonation mode.');
-      endTrace(trace, 'error', 'Blocked by read-only impersonation');
-      return {
-        data: null,
-        error: {
-          message: 'Action blocked: You are in read-only impersonation mode. Please exit impersonation to perform this action.',
-          status: 403
-        }
-      };
-    }
-  }
```

---

## 4. Verification — Verbatim Command Output

### V1 — Deleted files absent

```
=== V1: Deleted files absent ===
PASS absent: app\api\impersonate
PASS absent: app\dashboard\admin\impersonate
PASS absent: components\admin\ImpersonationBanner.tsx
PASS absent: components\admin\ImpersonationBanner.module.css
```

### V2 — No impersonate file under app/api

```
=== V2: No impersonate string in app/api (recursive) ===
PASS: no impersonate file under app\api
```

### V3 — Cookie reader patterns absent in all three edited files

```
=== V3: Cookie readers absent in edited files ===
PASS: 'impersonating_user_id' absent in lib\auth\AuthContext.tsx
PASS: 'impersonating_user_role' absent in lib\auth\AuthContext.tsx
PASS: 'admin_user_id' absent in lib\auth\AuthContext.tsx
PASS: 'tm_impersonating_user_id' absent in lib\auth\AuthContext.tsx
PASS: 'impersonating_user_id' absent in app\dashboard\DashboardLayoutClient.tsx
PASS: 'impersonating_user_role' absent in app\dashboard\DashboardLayoutClient.tsx
PASS: 'admin_user_id' absent in app\dashboard\DashboardLayoutClient.tsx
PASS: 'tm_impersonating_user_id' absent in app\dashboard\DashboardLayoutClient.tsx
PASS: 'impersonating_user_id' absent in lib\insforge.ts
PASS: 'impersonating_user_role' absent in lib\insforge.ts
PASS: 'admin_user_id' absent in lib\insforge.ts
PASS: 'tm_impersonating_user_id' absent in lib\insforge.ts
```

### V4 — ImpersonationBanner no longer imported

```
=== V4: ImpersonationBanner no longer imported ===
PASS: ImpersonationBanner absent from DashboardLayoutClient.tsx
```

### V5 — isImpersonating/impersonatedUser/adminId state absent from AuthContext

```
=== V5: isImpersonating/impersonatedUser/adminId absent from AuthContext ===
PASS: 'isImpersonating' absent
PASS: 'impersonatedUser' absent
PASS: 'setImpersonatedUser' absent
PASS: 'adminId' absent
PASS: 'setAdminId' absent
```

### V6 — Global residual scan (src only, excl. node_modules, insforge/functions, .next)

```
=== V6: Global residual scan ===
Path                                              LineNumber  Line
----                                              ----------  ----
...\app\dashboard\admin\settings\page.tsx                 51   impersonated_by: string | null;
...\app\dashboard\admin\settings\page.tsx                442   impersonation_started_at: string | null;
...\app\dashboard\admin\settings\page.tsx                443   impersonated_by: string | null;
...\app\dashboard\admin\settings\page.tsx                456   impersonated_by: string | null;
...\app\dashboard\admin\settings\page.tsx                460   impersonated_by: string | null;
...\app\dashboard\admin\settings\page.tsx                478   impersonated_by: string | null;
...\app\dashboard\admin\settings\page.tsx                488   impersonated_by: string | null;
...\app\dashboard\admin\settings\page.tsx                488   impersonated_by: string | null;
```

---

## 5. Residual Analysis

All remaining hits in `settings/page.tsx` are TypeScript type annotations for database columns (`impersonated_by: string | null`, `impersonation_started_at: string | null`) in the `Session` display type. They are:

- **Not** a cookie reader
- **Not** a route
- **Not** a page
- **Not** a banner
- Read-only display fields from existing `auth_sessions` DB rows

R-10 Option A removes the active surface (route, page, banner, cookie reads). DB column name type annotations are not part of that surface. **No further action required.**

The `insforge/functions/auth-session/index.ts` references (excluded from V6 scan) similarly reflect DB read fields in an edge function, not a client-side impersonation surface.

---

## 6. Gate Checklist (doc 08 §98)

From `08_Admin_portal_Implementation_Execution_Plan.md`:
> `[ ]` R-10 impersonation **removed** — no route, page, banner, or cookie reader remains (grep-verified)

| Spec item | V# | Result |
|---|---|---|
| `app/api/impersonate/route.ts` deleted | V1, V2 | ✅ PASS |
| `app/dashboard/admin/impersonate/` deleted | V1 | ✅ PASS |
| `components/admin/ImpersonationBanner.tsx` deleted | V1, V4 | ✅ PASS |
| `components/admin/ImpersonationBanner.module.css` deleted | V1 | ✅ PASS |
| Cookie reader `AuthContext.tsx:327-329` removed | V3, V5 | ✅ PASS |
| Cookie reader `DashboardLayoutClient.tsx:345` removed | V3, V4 | ✅ PASS |
| Cookie reader `lib/insforge.ts:175` removed | V3 | ✅ PASS |
| No residual active surface | V6 | ✅ PASS |

**R-10 gate item: ✅ CLOSED**

---

## 7. What Was NOT Changed (intentional)

- `app/dashboard/admin/settings/page.tsx` — DB column type annotations; no active surface
- `insforge/functions/auth-session/index.ts` — Edge function; not part of client-side surface
- All other admin pages, layout, routing, RBAC, and audit-log behaviour
