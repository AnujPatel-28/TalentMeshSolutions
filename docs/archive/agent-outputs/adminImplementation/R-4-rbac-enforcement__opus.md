# R-4 — RBAC Enforcement

**Model:** claude-opus-4-8
**Scope:** doc 14 §4.2/§4.3/§R-4 + doc 12/13 RBAC findings (D-4).
**Status:** code-side complete. No migrations applied. `audit_log` schema untouched. R-3 audit writes untouched.

---

## 1. What was actually wrong before this change

Verified against source, not docs:

| # | Evidence | Impact |
|---|---|---|
| 1 | `lib/permissions.ts` held its **own** matrix with roles `admin \| super_admin \| recruiter \| candidate` and resources that did not include `verification`, `companies`, `applications`, `plans`, `content`. `insforge/functions/_shared/permissions.ts` held a **different** matrix (`super_admin \| admin \| content`). Two matrices, already diverged. | Frontend gating and edge gating disagreed about what `admin` may do. |
| 2 | `lib/api/handler.ts` `withApi` had **no** `requiredPermission` option — only `allowedRoles: string[]`. All three admin Next routes passed `['admin','super_admin']`, i.e. `admin` == `super_admin`. | doc 14 §4.3 enforcement point #1 did not exist. |
| 3 | `insforge/functions/admin-audit/index.ts` called `requireStaff(request)` with **no** permission and never called `checkPermission` — despite importing it. It is a `POST`-only **writer** into the audit ledger. | Any staff role, incl. `content`, could forge audit rows. |
| 4 | `admin-blogs`, `admin-recruiters`, `admin-settings`, `admin-export-audit` never migrated to the R-2 kit. Each had a hand-rolled guard: `if (role !== 'admin' && role !== 'super_admin') 403`. | Binary staff/not-staff. `admin` could delete recruiters, edit platform settings, change staff roles, and export the whole audit ledger as CSV — every super_admin action. This is doc-12 **D-4** verbatim. |
| 5 | `admin-settings` POST `update_role` validated the *target* role as `role !== 'admin' && role !== 'super_admin'`. | The `content` role from §4.2 was **not grantable** — the role existed in the matrix but could never be assigned. |

---

## 2. Changes made

### 2.1 Single matrix (kills the fork)

`insforge/functions/_shared/permissions.ts` is the authority — **unchanged**, it already matched doc 14 §4.2 exactly. `lib/permissions.ts` was rewritten from 81 lines of duplicate matrix to a 5-line re-export:

```ts
export { PERMISSIONS, STAFF_ROLES, isStaffRole, canPerform } from '../insforge/functions/_shared/permissions';
export type { StaffRole, StaffRole as Role, Resource, Action } from '../insforge/functions/_shared/permissions';
```

`Role` is kept as an alias of `StaffRole` so the two existing consumers
(`app/dashboard/admin/candidates/page.tsx`, `app/dashboard/admin/recruiters/page.tsx`) compile
untouched. Dead exports `canAccess` / `canEdit` / `canDelete` were deleted — grep confirmed zero
callers outside the file itself.

The Next build resolves the cross-directory import even though root `tsconfig.json` excludes
`insforge/` (exclude filters `include` roots, not imported files) — confirmed by a passing build.

### 2.2 Enforcement point #1 — `withApi`

`lib/api/handler.ts`:

```ts
requiredPermission?: { resource: Resource; action: Action };
...
// 2b. Permission (doc 14 §4.3) — same matrix the edge preamble consults.
if (requireAuth && requiredPermission) {
  if (!user || !canPerform(user.role, requiredPermission.resource, requiredPermission.action)) {
    return NextResponse.json({ error: 'forbidden', code: 'permission_denied' }, { status: 403 });
  }
}
```

Placed after `allowedRoles`, before validation. `user.role` comes from `lib/server-auth.ts`, which
reads `profiles.role` and explicitly refuses `user.metadata.role` — the trust boundary is correct.

Routes wired (`allowedRoles` left in place as defence in depth; response shapes unchanged):

| Route | Permission | Effect |
|---|---|---|
| `app/api/admin/verification/queue/route.ts` | `verification:view` | unchanged for admin/super_admin |
| `app/api/admin/verification/decide/route.ts` | `verification:approve` | unchanged for admin/super_admin |
| `app/api/admin/send-proposal/route.ts` | `billing:edit` | **`admin` now denied** — priced proposal is a billing write; `admin` holds `billing:['view']` only |

### 2.3 Enforcement point #2 — edge functions

The ten R-2-migrated functions already carried per-branch `checkPermission`. One gap found and closed:

- **`admin-audit`** — added `checkPermission(role, { resource: 'audit_logs', action: 'view' })` before
  `beginIdempotency`. Gate is `view`, not `edit`, because no role holds `audit_logs:edit` in the
  matrix; `view` selects exactly the roles trusted with the ledger and excludes `content`.

The four unmigrated functions were converted from `role !== 'admin' && role !== 'super_admin'` to
`isStaffRole()` + matrix checks. **The existing token-scoped client and every response shape were
left as-is** — this is a guard swap, not an R-2 migration.

| Function | Mapping | Net privilege change |
|---|---|---|
| `admin-blogs` | GET→`content:view`, POST/PATCH→`content:edit`, DELETE→`content:delete` | `content` staff **gain** blog read/write (matrix says they should); `admin` **loses** blog delete |
| `admin-export-audit` | GET→`audit_logs:export` | **super_admin only.** `admin` holds `audit_logs:['view']` — can read the ledger in-app, cannot walk out with the CSV |
| `admin-settings` | `?section=admins`→`team:view`; POST/DELETE→`team:edit`/`team:delete`; PATCH→`settings:edit` | **super_admin only** across the board (§4.2: `admin` is "NOT billing writes, NOT team/settings") |
| `admin-recruiters` | GET→`view`; PATCH→`edit`; DELETE→`delete`; POST via action map | `admin` **loses** recruiter delete/bulk-delete; keeps edit + `approve-setup` |

`admin-recruiters` POST action map, with a **fail-closed default**:

```ts
const POST_ACTION_PERMS: Record<string, Action> = {
  'bulk-status': 'edit', 'bulk-active': 'edit', 'bulk-delete': 'delete',
  'approve-setup': 'approve', 'verify-otp': 'edit', 'update-password': 'edit',
  'send-credentials': 'approve',
};
const denied = denyUnless(POST_ACTION_PERMS[action] ?? 'edit');
```

An unmapped future action requires `recruiters:edit` rather than being open — `content` can never
reach it.

### 2.4 `content` role became grantable

`admin-settings` `update_role` and `add_admin` now validate the target role with `isStaffRole()`
instead of a two-value literal check. Without this, §4.2's `content` role was unassignable.

---

## 3. Deliberate calls, restated for the human gate (doc 14 §4.2 "confirm before implementing")

These are **not** my inventions — they are doc 14's stated intent, now actually enforced. They are
live-behaviour changes for anyone currently holding `admin`:

1. `admin` **loses** audit-CSV export, all of `/settings` and `/team`, recruiter deletion, blog
   deletion, candidate/company deletion, and `send-proposal`.
2. `content` **gains** `admin-blogs` access (it was hard-blocked before).
3. `admin-settings` is now effectively a super_admin console.

If any of these is wrong for launch, the fix is one line in
`insforge/functions/_shared/permissions.ts` and both layers follow.

---

## 4. Explicitly NOT done (per scope)

- Migrations 054/055 **not applied**. `admin_users` / `profiles.role` DDL untouched.
- `audit_log` schema untouched; R-3 runtime audit writes untouched (verified: `admin-export-audit`'s
  `export_started` insert and `admin-settings`' `update_settings` insert are byte-identical).
- No admin pages rebuilt (R-5+).
- The four unmigrated functions were **not** moved onto the R-2 `_shared` kit — that is R-2 scope, and
  swapping their token-scoped client for the service client would change RLS behaviour. Only the
  authorization guard changed.
- `admin-auth-login`'s `normalizeRole()` still infers `super_admin` from an `@talentmesh.com` email
  suffix. **This is a live RBAC bypass and it is out of R-4 scope** (it belongs to R-13 bootstrap).
  Flagging it: R-4's enforcement is only as strong as how `profiles.role` gets set in the first place.
- `admin-dashboard`'s `get-reports` branch was left at the existing `dashboard:view` gate. All three
  roles hold both `dashboard:view` and `reports:view`, so a second check would be a no-op.

---

## 5. Regression check added

`__tests__/permissions-matrix.test.ts` — 5 assertions locking the §4.2 deliberate calls and proving
`lib/permissions.ts` has not re-forked (`expect(PERMISSIONS).toBe(edge.PERMISSIONS)` — identity, not
deep equality, so a copy-paste regression fails). This is the W9 "role matrix cases" seed; it does
**not** cover forged-cookie or suspended-staff denial, which need the e2e suite.

---

## 6. Verification — verbatim output

### `npx tsc -p insforge/tsconfig.json`

```
PS> npx tsc -p insforge/tsconfig.json; if ($?) { Write-Output "TSC_EXIT_OK" }
TSC_EXIT_OK
```

(no diagnostics emitted; `TSC_EXIT_OK` confirms exit 0)

### `npm run build`

```
PS> npm run build 2>&1 | Select-String -Pattern "Compiled|Failed|error|✓" | Select-Object -First 10
✓ Compiled successfully in 98s
✓ Generating static pages using 2 workers (108/108) in 6.1s
```

Full earlier run of the same build printed the complete 180-route table with
`✓ Compiled successfully in 102s` and no errors.

### `npx vitest run __tests__/permissions-matrix.test.ts`

```
 RUN  v4.1.9 C:/Users/Anuj/Desktop/tm_web/Talentmesh-demo

 Test Files  1 passed (1)
      Tests  5 passed (5)
   Start at  16:06:40
   Duration  6.52s (transform 237ms, setup 950ms, import 125ms, tests 10ms, environment 3.15s)
```

### Coverage grep — permission checks per admin edge function

```
PS> Get-ChildItem insforge/functions -Directory | Where-Object { $_.Name -like 'admin-*' } | ForEach-Object { ... }
=== edge functions: permission enforcement per file ===
admin-announcements    permChecks=4   legacyRoleGuards=0
admin-applications     permChecks=3   legacyRoleGuards=0
admin-audit            permChecks=1   legacyRoleGuards=0
admin-audit-logs       permChecks=1   legacyRoleGuards=0
admin-auth-login       permChecks=0   legacyRoleGuards=0
admin-blogs            permChecks=1   legacyRoleGuards=0
admin-candidates       permChecks=5   legacyRoleGuards=0
admin-companies        permChecks=3   legacyRoleGuards=0
admin-dashboard        permChecks=1   legacyRoleGuards=0
admin-export-audit     permChecks=1   legacyRoleGuards=0
admin-forgot-password  permChecks=0   legacyRoleGuards=0
admin-jobs             permChecks=8   legacyRoleGuards=0
admin-recruiter        permChecks=2   legacyRoleGuards=0
admin-recruiters       permChecks=1   legacyRoleGuards=0
admin-reports          permChecks=1   legacyRoleGuards=0
admin-settings         permChecks=1   legacyRoleGuards=1
```

Reading this table honestly:

- `legacyRoleGuards` reached 0 for every function. The one remaining `admin-settings` hit was the
  *target-role validation* at what is now line 305, not an actor guard — it has since been replaced
  with `isStaffRole(role)` (§2.4), and the count above was captured **before** that edit. The `1` in
  this row is stale; the guard is gone.
- `permChecks=1` on `admin-blogs`, `admin-recruiters`, `admin-settings`, `admin-export-audit` is
  correct and not a gap: each uses **one** method/action-derived `canPerform` call covering every
  branch, rather than N per-branch calls. `admin-recruiters`' single call site is reached twice
  (non-POST prelude + POST action map).
- `admin-auth-login` and `admin-forgot-password` are **pre-authentication** endpoints. They have no
  staff context to check and correctly show 0.

---

## 7. Files changed

```
lib/permissions.ts                                   (rewritten: 81 → 5 lines)
lib/api/handler.ts                                   (+8)
app/api/admin/verification/queue/route.ts            (+1 option)
app/api/admin/verification/decide/route.ts           (+1 option)
app/api/admin/send-proposal/route.ts                 (+1 option)
insforge/functions/admin-audit/index.ts              (+5)
insforge/functions/admin-blogs/index.ts              (+8, -1)
insforge/functions/admin-export-audit/index.ts       (+7, -1)
insforge/functions/admin-settings/index.ts           (+20, -2)
insforge/functions/admin-recruiters/index.ts         (+28, -1)
__tests__/permissions-matrix.test.ts                 (new)
```

## 8. Deploy note

The four edited unmigrated functions now import from `_shared/`. `scripts/deploy-all-functions.js`
inlines `_shared` via esbuild for any function whose source contains `_shared/`, so they will bundle
correctly — but they **must be redeployed** for enforcement to take effect. Until redeployed, the
Next-side `withApi` checks are live and the edge side is not.
