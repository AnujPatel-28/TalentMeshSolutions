# R-4 Follow-up — `admin-audit` retired

**Model:** claude-opus-4-8
**Supersedes:** §2.3 of `R-4-rbac-enforcement__opus.md` (the `audit_logs:view` gate on `admin-audit`)
**Files changed:** `insforge/functions/admin-audit/index.ts` only.

---

## 1. The reviewer was right, and it was worse than described

The review said `audit_logs:view` lets ordinary `admin` forge audit rows. Confirmed, plus a second
defect in the same handler.

Pre-fix source, `insforge/functions/admin-audit/index.ts:49-58`:

```ts
const logData = {
  actor_id: actor_id || userId,   // ← caller-supplied actor_id WINS
  action: action,                 // ← unvalidated, from body
  table_name: entity_type || '',  // ← from body
  record_id: entity_id || '',     // ← from body
  ...
};
```

Two distinct problems:

| | Defect | Consequence |
|---|---|---|
| A | Gated `audit_logs:view`, which `admin` holds | Any `admin` could write ledger rows |
| B | `actor_id: actor_id \|\| userId` — body value takes precedence over the server-derived `userId` | Rows could be attributed to **any user id**, including a super_admin |

B is the sharper one. A forged row is bad; a forged row *signed as someone else* turns the ledger
into an active framing tool. An append-only log whose rows can be forged by their own subject is
"worse than none" — doc 13 FR-7's phrase for exactly this.

## 2. Caller analysis: none

Exhaustive repo grep for `admin-audit` (excluding the `admin-audit-logs` prefix collision) returned
**only** documentation and prior audit notes. Zero code references.

- The audit UI, `app/dashboard/admin/audit-logs/page.tsx:41`, calls `admin-audit-logs` — the reader.
- All legitimate audit writes are made server-side by the acting function itself, with a
  server-derived actor (R-3).
- Doc 03 `03_Admin_Portal_API_Routes_And_Endpoints.md:26` **already specifies this**:
  `| admin-audit | **Deleted** (read the merged audit_log via admin-audit-logs) |`,
  with an open checklist item at line 188. Retirement is documented intent, not a new decision.

## 3. Why I did NOT delete the directory

This is the part that changes the fix, and it is the reason to read this section before approving.

**Deleting the directory would not have closed the hole. It would have widened it.**

- `scripts/deploy-all-functions.js` `deployFunctions()` walks on-disk directories and deploys each
  one. Verified by grep: the script contains **no** delete/remove path at all.
- `metadata_full.json:345` shows the live backend carrying slug `admin-audit` with
  `"status": "active"`.

So removing the directory means the old forgeable handler stays live and reachable exactly as it is,
while its source vanishes from the repo — an active vulnerability that no longer greps. The local
filesystem is not the deployment.

## 4. What I did instead — 410 tombstone

The whole handler is replaced by a hard 410. This neutralizes the live slug **through the normal
deploy path**, which is the only channel that actually reaches the running function:

```ts
export default async function handler(request: Request): Promise<Response> {
  const cors = corsHeaders(request);
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });

  return errorJson('gone', 'admin-audit is retired; audit rows are written server-side only', 410, cors);
}
```

Chosen over the "gate super_admin-only + force `actor_id = userId`" fallback because with zero
callers, a hardened writer keeps a privileged write path into the audit ledger that nothing uses —
permanent attack surface earning nothing. The endpoint that does not exist cannot be misgated later.

No auth check remains: 410 for everyone leaks nothing and costs one round trip. If some unknown
caller does exist, it now fails loudly with 410 rather than silently forging attribution — the
correct failure direction for an audit path.

## 5. Required follow-up — TWO steps, and the order matters

Neither is done; both need a human (standing rule: no agent-applied live changes).

1. **Redeploy** `admin-audit`. Until then the live function is the **unfixed original** — the
   forgery hole described in §1 is open in production right now. This report does not close it;
   deploying does.
2. **Then** delete the live function, after which the directory can go:
   ```
   npx @insforge/cli functions delete admin-audit
   ```
   Doc 03's checklist line 188 can be ticked at that point.

Doing step 2 without step 1 is also fine and is strictly better. What is **not** fine is deleting
the local directory while the live slug is active.

## 6. Correction to the main R-4 report

`R-4-rbac-enforcement__opus.md` §2.3 claims `admin-audit` was closed by gating it `audit_logs:view`,
and §6's coverage table shows `admin-audit permChecks=1`. Both are now obsolete — the function has
no permission check because it has no functionality. My original `audit_logs:view` reasoning was
wrong: I picked the gate by asking which role should *see* the ledger, and never asked whether the
endpoint should accept a body-supplied `actor_id` at all. The gate choice was a distraction from a
writer that should not have existed.

## 7. Verification — verbatim output

### `npx tsc -p insforge/tsconfig.json`

```
PS> npx tsc -p insforge/tsconfig.json; if ($?) { Write-Output "TSC_EXIT_OK (exit 0, no diagnostics)" } else { Write-Output "TSC_FAILED" }
TSC_EXIT_OK (exit 0, no diagnostics)
```

### `npx vitest run __tests__/permissions-matrix.test.ts`

```
PS> npx vitest run __tests__/permissions-matrix.test.ts

 RUN  v4.1.9 C:/Users/Anuj/Desktop/tm_web/Talentmesh-demo


 Test Files  1 passed (1)
      Tests  5 passed (5)
   Start at  16:32:13
   Duration  5.47s (transform 221ms, setup 825ms, import 111ms, tests 10ms, environment 2.18s)
```

### `npm run build`

```
PS> npm run build 2>&1 | Select-String -Pattern "Compiled|Failed|Error|error" | Select-Object -First 10
✓ Compiled successfully in 95s
```

Filtered to status lines; the pattern includes `Failed`/`Error`/`error` and matched none.

### Caller grep

```
PS> grep -rn "admin-audit" ... (excluding node_modules, .next, admin-audit-log*)
```

All surviving hits are `.md` documentation or `metadata_full.json`. No `.ts`/`.tsx`/`.js` caller.
