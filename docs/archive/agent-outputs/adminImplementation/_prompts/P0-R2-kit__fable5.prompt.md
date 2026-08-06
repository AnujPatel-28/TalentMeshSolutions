# DISPATCH — P0 · R-2 · Shared edge-function kit + deploy bundling

**Executor model:** Fable 5 · **Reviewer:** Opus (advisor) · **Isolation:** git worktree · **Human gate:** none (no live DDL in this task)

You are implementing task **R-2** of the TalentMesh admin-portal rebuild. Read this whole prompt, then follow CLAUDE.md (surgical changes; simplicity first; state assumptions; loop until a runnable check passes). Do **not** exceed the scope in §"Out of scope".

---

## 0. Context you must load first (do not skip)

Read these before writing anything:

- `insforge/functions/admin-jobs/index.ts` (lines 1–60) — the canonical auth preamble you are replacing. Note the exact `createClient` construction, the two-client split (service `db` + `verifyClient`), and how `profiles.role, is_active` are read.
- `insforge/functions/admin-settings/index.ts` around lines 340–390 — the `exec_sql` raw-SQL hazard (AD-8) and the `audit_logs` (plural) write. **Do not fix these here** (that is R-3/056); just be aware the kit must not depend on them.
- `scripts/deploy_edge_functions.mjs` — the deploy mechanism. **Critical constraint:** it does `fs.readFileSync(filePath)` and PUTs that single file's text as the whole function body. There is **no bundler** — a relative `import ... from '../_shared/x.ts'` will NOT be resolved on deploy, because only `index.ts`'s text is uploaded. Your kit must solve this (see §3).
- Spec sources (authoritative): `docs/specs/03_Admin_Portal_API_Routes_And_Endpoints.md` §3; `14_Admin_Portal_Rebuild_Architecture.md` R-2 and §4.2/§4.3; `01_Admin_Portal_Auth_Security_Audit_Report.md` findings AD-6 (CORS), AD-8 (service-key/exec_sql), AD-13 (subdomain origins), AD-14 (limit/PATCH hygiene).

**Runtime facts (verified):** Deno edge functions; `import { createClient } from 'npm:@insforge/sdk';`; env via `Deno.env.get(...)`; each function is `export default async function handler(request: Request): Promise<Response>`. Functions carry `// @ts-nocheck` at the top.

---

## 1. Objective

Create one shared kit under `insforge/functions/_shared/` that centralizes the copy-pasted preamble and fixes, once, the cross-cutting defects. Then **convert exactly one function — `admin-jobs` — onto the kit as the reference implementation.** The bulk migration of the other 14 functions is a **separate** later dispatch (Gemini 3.1 Pro) — do not do it here.

---

## 2. Deliverables — the `_shared/` modules

Create these files. Signatures are binding; internal implementation is yours.

### `_shared/env.ts` — env-only credentials (fixes AD-8 header-injected service key)
```ts
// Reads ONLY from Deno.env — NEVER from request headers.
// Today admin-jobs reads SERVICE_KEY from the `x-insforge-service-key` request header with a
// silent fallback to the anon key. That lets a caller supply the privileged key and removes the
// fail-safe. This module ends that.
export function getEnv(): { url: string; anonKey: string; serviceKey: string };
// - url:       Deno.env INSFORGE_URL || NEXT_PUBLIC_INSFORGE_URL   (throw if empty)
// - anonKey:   Deno.env INSFORGE_ANON_KEY || NEXT_PUBLIC_INSFORGE_ANON_KEY  (throw if empty)
// - serviceKey: Deno.env INSFORGE_SERVICE_KEY   (throw if empty — NO anon fallback, fail loud)
// On any missing value throw a typed error the handler turns into a 500 {error:'server_misconfig'}.
```

### `_shared/cors.ts` — explicit origin allowlist (fixes AD-6)
```ts
// Replaces the literal `Access-Control-Allow-Origin: '*'` + credentials:true (spec-forbidden combo).
export function corsHeaders(req: Request): Record<string,string>;
export function preflight(req: Request): Response | null;   // returns 204 Response for OPTIONS, else null
// Rules:
//  - Allowlist from Deno.env ALLOWED_ORIGINS (comma-separated). Example prod value:
//      https://admin.talentmeshsolutions.com
//  - If the request Origin is in the allowlist → set ACAO to THAT origin (echo the matched one, not '*'),
//    add `Vary: Origin`.
//  - If not in the allowlist → omit ACAO entirely (browser blocks; server still functions for same-origin/no-Origin server calls).
//  - Dev fallback: allow http://localhost:3000 ONLY when Deno.env DENO_ENV !== 'production'
//    (and only if it is not already in ALLOWED_ORIGINS). Never in production.
//  - Methods/Headers: keep the existing set (GET, POST, PATCH, DELETE, OPTIONS; Content-Type, Authorization, x-client-info).
//  - Credentials: VERIFY whether the browser relies on cookies for these calls. Check `lib/insforge.ts`
//    `invokeFunction` — these edge calls authenticate via the `Authorization: Bearer` header, not cookies.
//    Default: DO NOT send `Access-Control-Allow-Credentials: true` (not needed with header auth, and it
//    is the exact combo that forces ACAO away from '*'). If you find a cookie dependency, document it in
//    your output and keep credentials with the echoed (never '*') origin.
```

### `_shared/adminAuth.ts` — the auth preamble (centralizes role + is_active; hooks RBAC for R-4)
```ts
import type { StaffPerm } from './permissions.ts';
export type StaffContext = { userId: string; role: string };
// Throws typed AuthError (handler maps to Response) OR returns StaffContext.
export async function requireStaff(req: Request, perm?: StaffPerm): Promise<StaffContext>;
// Steps (mirror admin-jobs exactly, but once):
//  1. Authorization header present → else 401 {error:'missing_auth'}
//  2. verifyClient (anonKey + edgeFunctionToken=rawToken).auth.getCurrentUser() → invalid ⇒ 401 {error:'invalid_token'}
//  3. service db.database.from('profiles').select('role,is_active').eq('id',uid).single()
//     → missing ⇒ 401 {error:'profile_not_found'}
//  4. role ∈ {admin, super_admin, content} → else 403 {error:'forbidden'}
//  5. is_active === true → else 403 {error:'account_suspended'}
//  6. if perm provided AND canPerform(role, perm.resource, perm.action) === false ⇒ 403 {error:'permission_denied'}
//     (perm is OPTIONAL here; callers start passing it in R-4. When omitted, steps 1–5 are the gate.)
// Returns { userId, role }. Build the two clients from getEnv(); do NOT read keys from headers.
```

### `_shared/permissions.ts` — Deno-side matrix copy (source of truth for edge enforcement)
```ts
// EXACT copy of the matrix in 14_Admin_Portal_Rebuild_Architecture.md §4.2 (super_admin / admin / content).
// This is the Deno duplicate; R-4 rewrites the Next.js lib/permissions.ts to match and wires withApi.
// Keep the two in sync by identical content — note in your output that R-4 must mirror this file.
export type StaffRole = 'super_admin' | 'admin' | 'content';
export type Resource = 'dashboard'|'companies'|'verification'|'jobs'|'applications'
  |'candidates'|'recruiters'|'content'|'reports'|'billing'|'plans'|'settings'|'team'|'audit_logs';
export type Action = 'view'|'edit'|'delete'|'approve'|'export';
export type StaffPerm = { resource: Resource; action: Action };
export const PERMISSIONS: Record<StaffRole, Partial<Record<Resource, Action[]>>>; // = §4.2 content verbatim
export function canPerform(role: string, resource: Resource, action: Action): boolean;
```

### `_shared/query.ts` — filter/limit hygiene (fixes AD-7/D-13, AD-14/D-17)
```ts
export function escapeOrFilter(term: string): string;
//  Strip/escape the PostgREST-.or() breakers , ( ) . " (and backslash) from a search term
//  BEFORE it is interpolated into `.or('name.ilike.%'+term+'%,...')`. Prefer stripping to escaping.
export function capLimit(raw: string | number | null, max = 100): number;
//  Parse, floor at 1, cap at max (default 100). admin-jobs currently accepts ?limit=1000000 — this ends it.
```

### `_shared/idempotency.ts` — reserve-before-work (fixes AD/D-20)
```ts
// Replaces the current write-after-success replay-suppression. Reserve the key BEFORE doing work.
export async function reserveIdempotencyKey(db, key: string): Promise<'reserved' | 'duplicate'>;
//  INSERT ... ON CONFLICT DO NOTHING RETURNING — 'reserved' if this call won the row, 'duplicate' otherwise.
export async function storeIdempotentResponse(db, key: string, body: unknown): Promise<void>;
export async function getIdempotentResponse(db, key: string): Promise<unknown | null>;
//  Store the FULL response body (not just a hash/ref) so a duplicate replays the real payload.
//  Duplicate handling in the handler: if getIdempotentResponse returns a stored body → replay it;
//  if reserved==='duplicate' but no stored body yet (concurrent in-flight) → 409 {error:'in_progress'}.
//  NOTE: verify the idempotency_keys table columns first (get-table-schema is NOT available to you offline —
//  read insforge/migrations for the table def; if the schema can't store a full body, document the needed
//  column as a migration for R-3/human-apply and implement against the intended shape).
```

### `_shared/errors.ts` — uniform responses (no stack leak)
```ts
export class AuthError extends Error { status: number; code: string; }
export function json(body: unknown, status: number, req: Request): Response;   // attaches corsHeaders(req)
export function fail(code: string, status: number, req: Request, extra?): Response; // {error:code, ...extra}
export function toResponse(err: unknown, req: Request): Response;
//  AuthError → its status/code; anything else → 500 {error:'internal'} with NO message/stack unless
//  Deno.env DENO_ENV !== 'production'. Never leak internals in prod.
```

---

## 3. Deploy bundling (the hard part — make `_shared/` actually ship)

Because the deploy PUTs a single file, choose and implement ONE mechanism so `admin-jobs` can use `_shared/` yet still deploy as one file. **Recommended default (justify if you deviate):**

- Add a **build step to the deploy path** that bundles each `insforge/functions/<fn>/index.ts` into one self-contained file before PUT, inlining the `_shared/` imports.
- Use **esbuild** (check `package.json`/`node_modules` — it is very likely already present transitively via Next; if not, add it as a devDependency). Config: `bundle:true`, `format:'esm'`, `platform:'neutral'`, and **`external: ['npm:@insforge/sdk']`** plus leave all `npm:` and `Deno.*` specifiers untouched. Preserve the `// @ts-nocheck` header on the output.
- Emit the bundled file to a gitignored build dir (e.g. `insforge/.build/<fn>/index.ts`) and PUT that, keeping `index.ts` (with imports) as the committed source. Update `scripts/deploy_edge_functions.mjs` (or a thin wrapper) to bundle-then-PUT.
- The mechanism must be: single-source `_shared/`, one file on the wire, `npm:`/`Deno` specifiers intact at runtime, idempotent, and reviewable.

If esbuild cannot keep `npm:@insforge/sdk` as a runtime `npm:` specifier cleanly, fall back to a **minimal string inliner** (resolve the `_shared` imports and concatenate the module bodies into `index.ts` between generated markers). Document whichever you chose and why in your output.

> Do NOT deploy anything. Produce the build output locally and show it works (§5). Deployment is a human step later.

---

## 4. Convert `admin-jobs` onto the kit (reference only)

Rewrite `insforge/functions/admin-jobs/index.ts` to:
- Replace the inline preamble with `preflight(req)` + `requireStaff(req)` (no `perm` arg yet — R-4 adds it).
- Use `getEnv()` for clients (no header-sourced keys).
- Use `corsHeaders(req)` everywhere it currently spreads `corsHeaders`.
- Apply `capLimit` to the `limit` param and `escapeOrFilter` to `search` before `.or()`.
- Return errors via `_shared/errors.ts` helpers.
- **Preserve all existing behavior otherwise** — same actions, same queries, same response shapes. This is a preamble/hygiene swap, not a feature change. (Audit-on-delete, approval_status, PATCH allowlist are R-3/R-5 — out of scope; leave the business logic as-is.)

---

## 5. Required runnable check (leave it behind)

You cannot hit the live backend. Provide a **self-contained check** that fails if the kit logic breaks:

- `insforge/functions/_shared/_selfcheck.ts` (or `.test.ts`) with `assert`-based cases (Deno test or a plain `if !x throw`): `escapeOrFilter` neutralizes `a,b).c"d`; `capLimit('1000000')===100`, `capLimit('-3')===1`, `capLimit(null)` = sane default; `canPerform('admin','plans','edit')===false` and `canPerform('super_admin','plans','edit')===true` and `canPerform('content','jobs','edit')===false`; `corsHeaders` echoes an allowlisted origin and omits ACAO for a non-listed one; `getEnv` throws when `INSFORGE_SERVICE_KEY` is unset.
- Show the command you ran (`deno test` / `deno run`) and its passing output.
- Show the esbuild/inliner producing a bundled `admin-jobs` output with `npm:@insforge/sdk` still external, and confirm the bundle has no unresolved `_shared` import.

---

## 6. Out of scope (do NOT touch)

- The other 14 admin functions (separate Gemini dispatch). Only `admin-jobs` is converted here.
- `exec_sql` removal, `audit_logs`→`audit_log` merge, audit-on-delete, PATCH allowlists, approval_status — those are R-3/R-5/056.
- The Next.js `lib/permissions.ts` rewrite and `withApi.requiredPermission` — that is R-4. You only create the Deno-side `_shared/permissions.ts`.
- Any live DDL or deployment. Any live backend call.
- The hardcoded `API_KEY` in `deploy_edge_functions.mjs` — flag it in your output (it is a committed secret) but do not refactor secrets management here.

---

## 7. Return your result as a markdown file

Write to `docs/archive/agent-outputs/adminImplementation/P0-R2-kit__fable5.md` using this exact structure:

```markdown
# P0 · R-2 — Shared edge-function kit   ·   model: Fable 5   ·   phase: 0   ·   date: <today>

## Prompt given
<paste this dispatch verbatim or link it>

## What changed
- <path> — <one-line why> (one bullet per file; each must trace to R-2)

## Deploy bundling decision
<esbuild vs inliner, why; how single-source _shared survives single-file PUT; external/npm handling>

## Security fixes landed (map to findings)
- AD-8 service key: <how> · AD-6 CORS: <how> · AD-7 filter: <how> · AD-14 limit: <how> · D-20 idempotency: <how>

## Verification run
<commands + passing output for the self-check and the bundle proof>

## Deviations / assumptions
<anything not spelled out that you decided — the reviewer reads this first>

## Open questions for the advisor
<blocking items: e.g. idempotency_keys column shape, cookie/credentials finding, esbuild availability>
```

Then stop. Do not proceed to any other R-task.
