# R-2 — Shared edge-function kit (`_shared/`)   ·   model: Fable 5   ·   phase: 0   ·   date: 2026-07-19

## Prompt given

Author the R-2 kit per doc 14 §R-2/§4.3: `_shared/` modules for adminAuth (`requireStaff`), CORS allowlist (D-10), query hardening (D-13/D-17), reserve-first idempotency (D-20), uniform errors, plus A-12 (service key env-only). Kit authoring only — migrating the other 14 functions onto it is the separate Gemini 3.1 Pro task.

## What changed

**Deploy mechanism (decides everything):** InsForge deploys one file per function (`functions deploy --file index.ts`); relative imports would not exist at runtime. Solution per doc 14: build-time inlining — `scripts/deploy-all-functions.js` now bundles any function that imports `_shared/` with esbuild (already in node_modules) into `.insforge-dist/<slug>.ts` (gitignored) and deploys that; `npm:`/`node:`/`jsr:` specifiers stay external for the Deno runtime. `_shared/` itself is skipped by the deploy loop.

**New `insforge/functions/_shared/`:**

| Module | Contents |
|---|---|
| `permissions.ts` | §4.2 matrix verbatim (`PERMISSIONS`, `canPerform`, `isStaffRole`, `StaffRole/Resource/Action`). Pure TS — R-4 should make `lib/permissions.ts` re-export from this file so withApi and edge fns consult one matrix. |
| `errors.ts` | `json()`, `errorJson(code, message, status, headers, fieldErrors?)` → uniform `{error, code, fieldErrors?}`; `internalError()` logs server-side, returns generic body — `detail` only when `APP_ENV !== 'production'`. |
| `cors.ts` | Origin allowlist from `ALLOWED_ORIGINS` (comma-separated secret); `localhost:3000` fallback only outside production (D-10). Kills the invalid `*` + credentials combo: allowed origin is echoed, disallowed origins get no ACAO header. |
| `query.ts` | `escapeOrFilter(term)` strips `,()."` (D-13); `capLimit(raw, max=100, fallback=25)` (D-17). |
| `idempotency.ts` | Reserve-before-work (D-20): `beginIdempotency` INSERTs `{key, status: 0}` — PK conflict means loser: status 0 → `409 in_flight`, status > 0 → replay stored `response_body`. `completeIdempotency` stores final status+body (+hash for legacy); `releaseIdempotency` deletes the reservation on error so retries can run. **Degrades gracefully pre-DDL** (falls back to hash-only replay until `response_body` column exists). |
| `adminAuth.ts` | `requireStaff(req, perm?)` per §4.3: token → `getCurrentUser` → service-key read of `profiles.role,is_active`; 401 invalid token / 403 not staff / 403 suspended / 403 permission_denied; returns `{userId, role, db}` or a ready `Response`. `checkPermission()` for per-method actions. **A-12: `x-insforge-url`/`x-insforge-anon-key`/`x-insforge-service-key` request-header credential fallbacks are gone; env only, throws loudly if unset, never falls back to anon key.** |

**Reference migration:** `admin-candidates/index.ts` rewritten on the kit as the canonical pattern for the remaining 14 (kit imports → `requireStaff` → per-method `checkPermission` → `beginIdempotency` before mutations → `completeIdempotency`/`releaseIdempotency` → `errorJson`/`internalError`). Behavior preserved except deliberate fixes: search now escaped, per-§4.2 permissions enforced (**candidate delete/bulk-delete is now super_admin-only** — confirmed product decision), PATCH strips `id`/`role` (mass-assignment guard), errors no longer leak `error.message` in production.

Also: `insforge/tsconfig.json` + `noEmit`/`allowImportingTsExtensions` (Deno-style `.ts` imports typecheck); `.insforge-dist/` gitignored.

## SQL authored (if any)

One column, required for full replay (kit works without it, degraded). **Human-applied**; fold into the Phase-1 migration batch (suggest riding with 052):

```sql
ALTER TABLE public.idempotency_keys ADD COLUMN IF NOT EXISTS response_body JSONB;
```

## Verification run

- `npx tsc -p insforge/tsconfig.json` — exit 0.
- esbuild bundle of the exemplar: single file, zero residual `_shared` imports, `npm:@insforge/sdk` external, `requireStaff`+`PERMISSIONS` inlined, no `x-insforge-service-key` string anywhere in output.
- Node assert self-check (pure logic): `escapeOrFilter` strips all five injection chars; `capLimit` caps 5000→100, garbage/negative/zero→25; RBAC spot-checks — admin cannot delete candidates / view team / edit billing, content cannot approve content, non-staff roles get nothing. All passed.
- **Not verified:** live invocation (no function was deployed — deploys to the live backend are deliberately left to the migration task after review); `requireStaff` end-to-end against a real token (needs a deployed fn).

## Deviations / assumptions

- §4.3 sketch returns `{userId, role}`; kit returns `{userId, role, db}` (service client) so handlers can't construct a service client before the staff check passes. Failure is a returned `Response`, not a throw.
- The permission matrix lives in `_shared/permissions.ts` (edge fns can't import `lib/`); **R-4 must make `lib/permissions.ts` re-export it** — flagged so the two never fork.
- Reservation uses `status=0` as the in-flight marker instead of making columns nullable — keeps the required DDL to one ADD COLUMN.
- Spec's `INSERT … ON CONFLICT DO NOTHING RETURNING` is realized as plain INSERT + PK-conflict detection via the SDK (same atomicity, no raw SQL from the edge fn).
- `ALLOWED_ORIGINS` + `APP_ENV=production` secrets must be set on the backend before the migrated functions ship, or browser calls from production will get no CORS headers.
- Env names accept both `INSFORGE_SERVICE_KEY` and legacy `API_KEY` (existing deploys use both); header fallbacks removed everywhere.

## Open questions for the advisor

1. `admin` losing candidate-delete (§4.2) takes effect for this one function as soon as it deploys, ahead of R-4 — acceptable, or hold the exemplar's deploy until R-4 lands?
2. Should the `response_body` ALTER ride in 052 or get its own number? (Kit is live-safe either way.)
3. `cleanup-idempotency-keys` deletes expired keys; a crashed reservation (status 0, released only best-effort) blocks its key until that cleanup runs — acceptable at current traffic, or should cleanup also purge `status=0` rows older than ~1h?

## Advisor decisions — RESOLVED 2026-07-19

1. **HOLD all deploys.** Nothing ships until R-4 lands; then the whole migrated set deploys together. A lone permission change reads as a bug to whoever hits it.
2. **`response_body` ALTER rides in migration 052.** No standalone number.
3. **Purge added**: `cleanup-idempotency-keys` also deletes `status = 0 AND created_at < now() - interval '1 hour'` (implemented in the working tree; a crashed reservation must not 409 a legitimate retry forever).
4. **HARD DEPLOY-ORDERING DEPENDENCY (elevated from the deviations):** `ALLOWED_ORIGINS` and `APP_ENV=production` MUST be set as backend secrets **before any migrated function deploys** — without them `corsHeaders` emits no ACAO in production and every browser call breaks. This is a launch-runbook line item, not a footnote.
