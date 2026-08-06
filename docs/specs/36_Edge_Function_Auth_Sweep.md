# 36 — Edge Function Auth Sweep (2026-08-02)

Read-only audit of `insforge/functions/*` on branch `fix/edge-fn-isservermode`, against the LIVE
deployed project (`sytk3jgv`, region ap-southeast). No function was modified or deployed. All
behavioural probes used either a syntactically-valid-but-unsigned JWT, a garbage non-JWT string,
or no Authorization header at all — never a real user token. One safe non-destructive write-path
probe was run against `candidate-applications` (details in §3); no database row was created and no
storage object was read, written, or listed beyond confirming a made-up key doesn't exist.

## Correction to the audit brief — read this before anything else

The brief's premise — "`edgeFunctionToken` without `isServerMode` is equally broken" — is
**incorrect** for the installed SDK (`@insforge/sdk@1.5.2`, confirmed via
`node_modules/@insforge/sdk/package.json`). Verified directly against
`node_modules/@insforge/sdk/dist/index.js:2996-3010`:

```js
var InsForgeClient = class {
  constructor(config = {}) {
    ...
    const accessToken = config.accessToken ?? config.edgeFunctionToken;   // line 3002
    if (accessToken) {
      this.http.setAuthToken(accessToken);
      this.tokenManager.setAccessToken(accessToken);
    }
    this.auth = new Auth(this.http, this.tokenManager, {
      isServerMode: config.isServerMode ?? !!accessToken,                 // line 3008
      ...
    });
```

Passing `edgeFunctionToken` (or `accessToken`) **in the constructor**, even with no explicit
`isServerMode`, already makes `isServerMode` default to `true` via the `!!accessToken` fallback.
This was cross-checked against `setAccessToken()` (the instance method, line 3062-3069) — it only
calls `this.tokenManager.setAccessToken(token)`, it never touches `isServerMode`, confirming
`isServerMode` is fixed permanently at construction time.

**The genuinely broken signature is narrower than the brief describes:**
`createClient({...})` with **neither** `accessToken` **nor** `edgeFunctionToken` in the
constructor call, and no explicit `isServerMode: true`, followed later by an **instance-level**
`.setAccessToken(token)` call before `.auth.getCurrentUser()`. That's exactly the pattern the
2026-08-01 incident hit, and exactly what the 17-function patch fixed.

Practical effect: every `createClient({ ..., edgeFunctionToken: token, isServerMode: true })` call
in this codebase (admin-recruiter, admin-settings, candidates, activate-recruiter,
admin-export-audit, admin-blogs, `_shared/adminAuth.ts`, candidate-applications, admin-recruiters)
would have been safe even without the explicit `isServerMode: true` — it's redundant-but-harmless
there, not a fix for a real bug. Do not re-patch these on the assumption that bare
`edgeFunctionToken` is dangerous; it is not, in 1.5.2.

## 1. Verdict

The 17 patched functions' `isServerMode` fix **is live and correct in all 17** — confirmed by
fetching the deployed bundle for every one of them via `npx insforge functions code <slug>` and
finding `isServerMode: true` on the client that calls `setAccessToken()`. That part of the incident
is closed.

However, the sweep found **14 new defects** (3 confirmed P0, 1 unconfirmed-P0, 4 P1, 3 P2, 3 P3),
several more severe than the class this audit was
scoped to find, because they don't require any SDK bug at all — they're missing or bypassable
authentication written directly into the handler:

- **`candidate-applications` (POST)** has no authentication gate at all. Confirmed live and
  reproduced safely (§3): an anonymous caller reaches a **service-role** (RLS-bypassing) storage
  `.download()` call against the private `resumes` bucket using a fully attacker-supplied key,
  before any database write is attempted. This is the most severe finding in the sweep.
- **`ai-match`** has no authentication at all — a non-JWT garbage string as the bearer token
  reaches a real, service-role-backed database query for an attacker-chosen job and candidate ID.
  Reproduced live.
- Three functions are **completely non-functional in production right now** (500 on every call, or
  silently blocked) because they read `Deno.env.get('INSFORGE_SERVICE_KEY')` with **no fallback**,
  and that secret **does not exist** in this project — confirmed via `insforge secrets list` /
  `secrets get`. The real name is `API_KEY`. This affects `mfa-status`, `mfa-backup-codes` (both
  in the patched-17, both behaviourally confirmed broken), and `admin-auth-login` (inferred from
  source, not behaviourally confirmed — see §4).
- `admin-recruiter` falls back to a caller-supplied `x-insforge-service-key` request header when
  that same env var is missing — and since the env var is confirmed absent, this function's
  "service key" is **currently sourced from the request header on every single call**, live.
- `dashboard` (one of the patched 17) never calls `.auth.getCurrentUser()` at all. It accepts a
  garbage-signature JWT and returns **200 OK**, not 401. It is not currently exploitable for
  cross-user data (Postgres RLS on `candidate_profiles`/`interviews`/`applications`/`jobs`/
  `activity` was independently checked and does correctly scope by `auth.uid()`), but the function
  itself provides zero authentication — RLS is the only thing standing in the way, with no
  application-layer backstop.

Full list, evidence, and risk ratings below.

---

## 2. Findings table (most severe first)

| # | Function | Class | File : Line | Evidence | Why it matters | Risk | Fix |
|---|----------|-------|--------------|----------|-----------------|------|-----|
| 1 | **candidate-applications** | B + E | `insforge/functions/candidate-applications/index.ts:44-56` (identity resolution), `:189-244` (storage snapshot), `:250-267` (insert uses `insforgeAdmin`, the service-role client) | POST handler only sets `candidateId` `if (token)` **and** `getCurrentUser()` succeeds (line 44-50); nothing after that block returns 401 if it's still `null`. Live probe, **no Authorization header at all**, safe (nonexistent key, no write occurs): `curl -X POST .../candidate-applications -d '{"jobId":"11111111-1111-1111-1111-111111111111","resumeUrl":"nonexistent/definitely-not-a-real-key.pdf"}'` → `{"error":"Failed to download original resume: Object not found","code":"snapshot_download_failed"}` (source: line 198, `errorJson(..., 500, cors)` — HTTP 500, not captured in the curl but confirmed from source). Separately, `function.logs`: `POST candidate-applications 404 1612ms` (run with a made-up job id) — both probes show real DB/storage round trips, not a fast-fail. | Any anonymous caller reaches a **service-role** `insforgeAdmin.storage.from('resumes').download(originalKey)` call (line 193) with `originalKey` derived entirely from the attacker-supplied `resumeUrl` body field. The response differs by existence (`Object not found`, verified live), and — **source-derived, not behaviourally tested, to avoid an actual write** — by size (`snapshot_file_too_large`, line 203) and type (`invalid_mime_type` line 219 / `invalid_pdf_file` line 226) for a key that does exist: an unauthenticated oracle over every object in the private `resumes` bucket, service-role so RLS never applies. **Worse than an oracle**: if the attacker supplies the key of a real, existing, <5MB PDF, execution reaches line 232 and performs a real **service-role storage write** — `insforgeAdmin.storage.from('application-snapshots').upload(snapshotKey, fileBlob)` — copying someone else's resume into a new object, fully unauthenticated. Only after that write does the code attempt the `applications` INSERT, which fails on `candidate_id NOT NULL` (confirmed via `information_schema.columns`) — the insert goes through `insforgeAdmin` so RLS's `candidate_id = auth.uid()` `WITH CHECK` is bypassed entirely, it's the raw NOT NULL constraint, not a security control, that stops the row. The catch block (line 275) then attempts `remove(snapshotKey)` as best-effort cleanup — the write already happened by that point. | **P0** | Require a valid `getCurrentUser()` result before doing *anything* else in this handler — return 401 immediately if `!candidateId`, matching the GET branch (line 62-64) and matching the sibling `candidate-applications-id` file, which already does this correctly. |
| 2 | **ai-match** | B + E | `insforge/functions/ai-match/index.ts:15-29` | Line 15-20: checks `token` is a non-empty string, **never calls `.auth.getCurrentUser()` or any SDK auth method**. Live probe: `curl -X POST .../ai-match -H "Authorization: Bearer totally-not-a-jwt" -d '{"jobId":"00000000-...","candidateId":"00000000-..."}'` → `{"error":"Job not found"}`. `function.logs`: `POST ai-match 404 1443ms` — real service-role DB query executed on a string that isn't even shaped like a JWT. | Zero authentication. Anyone who knows or guesses a `jobId`/`candidateId` pair gets the full job description and full candidate profile (skills, experience, education, bio, headline) via `insforgeAdmin` (service role, no RLS), then triggers a paid AI completion call with attacker-supplied IDs — unauthenticated PII disclosure (gated on knowing a candidate UUID) plus an unmetered AI-cost/DoS vector. | **P0** | Add the same `getCurrentUser()` + role gate every other recruiter-facing function uses; scope the candidate/job lookup to the caller's own company or an admin role. |
| 3 | **mfa-status**, **mfa-backup-codes** | Infra (adjacent to A) | `insforge/functions/mfa-status/index.ts:5,22-24`; `insforge/functions/mfa-backup-codes/index.ts:5` | `const serviceKey = Deno.env.get('INSFORGE_SERVICE_KEY')!;` — no fallback. `npx insforge secrets get INSFORGE_SERVICE_KEY` → `Error: Secret not found: INSFORGE_SERVICE_KEY`. `npx insforge secrets get API_KEY` → resolves (value confirmed present, redacted here). Live probe: `curl .../mfa-status` (no cookie) → `{"error":"Server configuration error"}`; `function.logs`: `GET mfa-status 500 0ms` / `500 1ms` (repeated). `curl -X POST .../mfa-backup-codes` → same error; `POST mfa-backup-codes 500 1ms`. | Both MFA endpoints are **100% down for every caller in production right now** — not a partial degradation. The `isServerMode` fix applied to both (confirmed present in the live bundle) is correctly deployed but functionally inert, because the function 500s before it ever reaches the `getCurrentUser()` call. This is the same class of "SDK/platform drift silently breaks a whole feature" as the original incident, just a different variable. | **P0** | Change line 5 in both files to match `_shared/adminAuth.ts`'s `getServiceKey()` pattern: `Deno.env.get('INSFORGE_SERVICE_KEY') \|\| Deno.env.get('API_KEY')`. Ideally both files should import `getServiceKey()` from `_shared/adminAuth.ts` instead of re-declaring the env lookup. |
| 4 | **admin-auth-login** | D (adjacent) | `insforge/functions/admin-auth-login/index.ts:52-57` | `const serviceKey = Deno.env.get('INSFORGE_SERVICE_KEY')!;` then `adminDb = createClient({ baseUrl, anonKey: serviceKey, isServerMode: true })`, used at line 59-63 to read `profiles.role` and decide `isAdmin`. Same missing-secret condition as #3, confirmed via the same `secrets get` check. **Not behaviourally confirmed** — see §4, "Could not verify." | If `serviceKey` is `undefined`, `adminDb` is built with an invalid/empty key. The most likely failure mode: `profile` comes back `undefined` → `role = profile?.role ?? 'candidate'` → `isAdmin = false` → every real admin login gets `403 Access denied. You do not have administrator privileges.` even with a correct password — i.e. **admin login for this platform may currently be completely blocked**. This is inference from source + confirmed secret absence, not a live-tested login. | **P0 if confirmed** | Same fix as #3: add `\|\| Deno.env.get('API_KEY')` fallback, or route through `getServiceKey()`. Verify with one real admin login attempt before/after. |
| 5 | **admin-recruiter** | D | `insforge/functions/admin-recruiter/index.ts:24` (confirmed identical in the live bundle via `functions code admin-recruiter`) | `const serviceKey = Deno.env.get('INSFORGE_SERVICE_KEY') \|\| req.headers.get('x-insforge-service-key') \|\| '';` — this is exactly the pattern `_shared/adminAuth.ts` documents as closed ("A-12: … the old `x-insforge-service-key` … fallbacks are gone"). It isn't gone here. Combined with #3/#4's confirmed-absent env var, `Deno.env.get('INSFORGE_SERVICE_KEY')` is always falsy, so **this function currently falls through to the header on every invocation**. | The Next.js proxy sets this header on its own server-to-server calls (per the audit brief and `_shared/adminAuth.ts`'s comment), so under normal operation the header's value happens to be legitimate — but any direct caller of the edge function (it has a public URL, `sytk3jgv.function2.insforge.app/admin-recruiter`) can supply their **own** `x-insforge-service-key` header. If that value is accepted verbatim into `createClient({ anonKey: serviceKey })` and used to read `profiles.role`/write `access_requests`, a caller who can produce *any* string InsForge accepts as an anon key (or who has captured the proxy's real value from anywhere) controls the service-role client used for the admin-only "approve access request" action. | **P1** (P0 if the header value turns out to be guessable/leakable) | Delete the `\|\| req.headers.get(...)` fallback and route through `_shared/adminAuth.ts`'s `getServiceKey()` (which already has the correct `INSFORGE_SERVICE_KEY \|\| API_KEY` fallback and no header path), same as the other admin functions. This single change also fixes the missing-secret problem. |
| 6 | **dashboard** | B + C | `insforge/functions/dashboard/index.ts:14-16` (no `getCurrentUser`), `:96-99` (candidateId from body) | Function never calls `.auth.getCurrentUser()` anywhere — it only does `insforge.setAccessToken(token)` and goes straight to `.database` queries, trusting Postgres RLS via the JWT. Live probe with a syntactically-valid-but-unsigned JWT (`alg:HS256`, real UUID `sub`, far-future `exp`, garbage signature): `curl -X POST .../dashboard -H "Authorization: Bearer <fake-jwt>" -d '{"type":"candidate","candidateId":"00000000-..."}'` → **200 OK** with a well-formed (empty) payload, not 401. Same for `{"type":"company"}`. | The function provides **no authentication of its own** — it relies entirely on RLS to make an invalid/unauthenticated request harmless. I independently queried `pg_policies` for `candidate_profiles`, `interviews`, `applications`, `jobs`, `activity` (see §3) and confirmed real `auth.uid()`-scoped policies exist on all five, which is why the probe above returned empty data rather than someone else's records — **today, this is not a proven cross-user data leak**. But there is zero application-layer backstop: if any of those RLS policies is ever loosened, dropped, or the query is ever changed to run through a service-role client (as `candidate-applications` next door does), this becomes a full IDOR with nothing else in the way. The `type==='company'` branch also never filters `jobs`/`candidate_profiles`/`interviews`/`activity` by the caller's own `companyId` (relies on the same RLS). | **P1** | Add `const { data: authData, error } = await insforge.auth.getCurrentUser(); if (error \|\| !authData?.user) return 401;` before any query, and derive `candidateId`/company scope from `authData.user.id` / the caller's `profiles.company_id` rather than the request body. |
| 7 | **interview-generator** | A (adjacent) | `insforge/functions/interview-generator/index.ts:19-25` | No `if (!token) return 401` guard at all (contrast with every sibling function). `insforge.setAccessToken(token ?? null)` then straight to `.database.from('jobs')` — `getCurrentUser()` is never called. | This function is one of the "isServerMode-patched 17," but the patch is inert: there was never an authentication check here to restore. Impact is low today because the `jobs` table's public RLS policy (`jobs_select_approved`) already exposes approved/active job rows to anyone — so this doesn't leak anything the public `/jobs` endpoint doesn't already. Still, it means "generate interview questions" is fully anonymous and unrate-limited. | **P2** | Require and validate a token the same way `recruiter-dashboard`/`recommendations` do, or explicitly document this as an intentionally-public endpoint if that's the design. |
| 8 | **activate-recruiter** | E | `insforge/functions/activate-recruiter/index.ts:40-62` — **live bundle confirmed identical** (`insforge functions code activate-recruiter`, lines 103-114 match on-disk 40-62) | `userId !== authData.user.id` (line 48) forces the caller to act on their own row only, but there is **no check anywhere in this file** that an admin approved the request first (no read of `access_requests`, no flag consulted). Any authenticated user for whom a `recruiter_profiles` row already exists (created via `recruiter-request`'s public intake form, `is_approved: false`) can call this endpoint with their own `userId` and it unconditionally sets `profiles.status='active'` and `recruiter_profiles.is_approved=true`. Not behaviourally confirmed — would require creating a real test account, which this read-only audit avoided. | Bypasses the manual recruiter-verification business process (see project memory "Recruiter manual verification": docs via Gmail, admin decides) entirely — a user who submitted the public recruiter-request form can self-approve without any admin action. Blast radius partially unclear: `candidates/index.ts` gates recruiter search on `profiles.role === 'recruiter'` alone (not `is_approved`), and `role` is already settable at signup (`auth-signup` allows `role: 'recruiter'` at public signup) — so `is_approved` may not gate as much as intended platform-wide. This audit did not enumerate every place `recruiter_profiles.is_approved` is read, so the full blast radius is unresolved. This may be the same underlying issue as, or adjacent to, the existing tracked "recruiter onboarding trap" item — reconcile before filing as a new ticket. | **P1** | Require the caller's `access_requests` (or equivalent) row to already be `status='approved'` by an admin before flipping `is_approved`, or remove this self-service endpoint and make activation an admin-only action (`admin-recruiter`'s `approve` action already exists and looks like the intended path). |
| 9 | **admin-settings** | D (adjacent) | `insforge/functions/admin-settings/index.ts:19-22` — **live bundle confirmed identical** (`insforge functions code admin-settings`, line 66: `Deno.env.get("INSFORGE_SERVICE_KEY") \|\| Deno.env.get("INSFORGE_ADMIN_KEY") \|\| Deno.env.get("INSFORGE_ANON_KEY") \|\| Deno.env.get("NEXT_PUBLIC_INSFORGE_ANON_KEY")`, no `API_KEY`) | `Deno.env.get('INSFORGE_SERVICE_KEY') \|\| Deno.env.get('INSFORGE_ADMIN_KEY') \|\| Deno.env.get('INSFORGE_ANON_KEY') \|\| Deno.env.get('NEXT_PUBLIC_INSFORGE_ANON_KEY')` — note this chain **never includes `API_KEY`**. `INSFORGE_SERVICE_KEY` and `INSFORGE_ADMIN_KEY` are both confirmed absent from `secrets list`; `INSFORGE_ANON_KEY` **is** present. So `serviceKey` here resolves to the plain anon key. | `insforgeAdmin` (line 45-49), used for every admin-settings write (create admin, upgrade role, update platform settings, delete admin, all audit-log inserts), is built with the anon key, not an elevated key. Depending on RLS on `profiles`/`admin_members`/`admin_users`/`platform_settings`/`audit_log` for the anon/authenticated role, this either (a) makes every admin-settings write silently fail via RLS denial, or (b) if any of those tables has a permissive policy for authenticated writes, is a role-escalation path. **Not independently verified which** — flagged in §4. | **P1** | Add `\|\| Deno.env.get('API_KEY')` ahead of the anon-key fallbacks, or route through `_shared/adminAuth.ts`'s `getServiceKey()`/`requireStaff()` like the 13 other admin-* functions already do. |
| 10 | **upload-logo** | C (adjacent) | `insforge/functions/upload-logo/index.ts:14-24` | No `getCurrentUser()` call — `companyId` is read directly from the multipart form (`formData.get('companyId')`, line 17) and used verbatim as the storage path prefix (line 32) with no check against the caller's own `profiles.company_id`. Static finding only; not behaviourally probed (would require a real session and would write a real object). | Any signed-in caller (any role) can upload/overwrite a logo under `company-logos/<any-companyId>/...` for a company they don't belong to, if the `company-logos` bucket's write policy only checks "is authenticated" rather than company ownership (bucket-level policy not checked in this audit). | **P2** | Derive the target company from the caller's own `profiles.company_id` (looked up server-side after `getCurrentUser()`), not from the form body. |
| 10b | **upload-blog-image** | A (adjacent) | `insforge/functions/upload-blog-image/index.ts:9-31` — read end-to-end from the cached live bundle (`scratchpad/live_fns/upload-blog-image.ts`, fetched during the 17-function verification pass) | Same shape as #10 minus the tenant parameter: requires a non-empty `token` string (line 13-15) but never calls `getCurrentUser()` — `insforge.setAccessToken(token)` then straight to `insforge.storage.from('blog_images_final').upload(...)`. No `companyId`/tenant field is involved, so this is not a Class C cross-tenant bug, but it is the same missing-validation pattern as #6/#7/#10: a garbage token is never actually checked before the storage write is attempted (whether the write itself succeeds then depends on whatever the storage layer's own token validation does, not on this function). | Unauthenticated-looking callers can attempt uploads into the public blog-image bucket; worst case is spam/storage abuse or hosting unwanted content under the platform's domain, not a data leak. | **P3** | Add `getCurrentUser()` before the upload, matching the pattern used everywhere else. |
| 11 | 4 functions: **auth-verify**, **interview-generator**, **recruiter-request**, **upload-resume** | Adjacent (CORS) | `auth-verify/index.ts:7-13`, `interview-generator/index.ts:7-13`, `recruiter-request/index.ts:19-25`, `upload-resume/index.ts:2-7` | Each builds its own CORS headers by reflecting the request's `Origin` header verbatim (`req.headers.get('Origin') \|\| 'http://localhost:3000'` or `\|\| '*'`) **and** sets `Access-Control-Allow-Credentials: true`. `_shared/cors.ts` documents this exact pattern as a previously-fixed finding ("R-2, fixes D-10 … the old `Access-Control-Allow-Origin: '*'` + Allow-Credentials combination is gone") but these four files don't import it. | Any website can make a credentialed cross-origin request to these four endpoints and read the response, because the allowed-origin is whatever the browser sent, not a real allowlist. Impact varies by endpoint (auth-verify takes email+OTP in the body, not cookies, so the credentials flag is mostly moot there; recruiter-request and upload-resume are more exposed if any cookie-based session is ever attached). | **P2** | Replace the local `corsHeaders` object in all four files with `import { corsHeaders } from '../_shared/cors.ts'`, matching every other migrated function. |
| 12 | **update-application** | Infra (P3, cosmetic) | `insforge/functions/update-application/index.ts:137` | `const emailServiceKey = Deno.env.get('INSFORGE_SERVICE_KEY') \|\| '';` — no `API_KEY` fallback (contrast with line 6-7 of the same file, which correctly uses `getServiceKey()` for the actual authorization-critical DB client). | Only affects the fire-and-forget application-status-change email (line 142-159, wrapped in `.catch`) — sent with `x-service-key: ''`, which the Next.js email API route likely rejects, so candidates silently stop receiving status-change emails. Not a security issue; a quiet functional regression from the same stale-var-name root cause as #3/#4. | **P3** | Use `getServiceKey()` from `_shared/adminAuth.ts` here too. |
| 13 | **notification-worker** | E (low severity) | `insforge/functions/notification-worker/index.ts:74-98` | No Authorization check anywhere in the handler — it goes straight to `db.database.rpc('claim_notification_job', ...)` using the service key. | This is a cron/queue-drain worker; it only processes jobs already queued through legitimate paths (no attacker-controlled content is accepted), and `claim_notification_job`'s worker-leasing makes concurrent calls safe rather than duplicative. Impact is limited to: anyone can invoke this public URL to force-drain the notification queue early, or hammer it for minor resource abuse. | **P3** | Gate behind a shared secret header (e.g., compare against a `CRON_SECRET` env var) so only the scheduler can trigger it. |
| — | **test-auth-pattern** | Informational | `insforge/functions/test-auth-pattern/index.ts:9` | References a bare `insforge` global that is never imported or constructed anywhere in the file — this throws a `ReferenceError` and 500s on every call where `x-function-name` header equals `test-auth-pattern`. | Dead/broken test artifact, not part of any real flow. No security impact; flagging only so it isn't mistaken for working code. | — | Delete, or leave as dead code per CLAUDE.md's "mention, don't remove unrelated dead code" guidance — your call. |

---

## 3. Behavioural measurements

All timestamps UTC. Base URL: `https://sytk3jgv.function2.insforge.app`. `FAKE` = a
syntactically-valid, unsigned JWT: header `{"alg":"HS256","typ":"JWT"}`, payload
`{"sub":"00000000-0000-0000-0000-000000000000","exp":2000000000}`, garbage signature segment
`sig`.

| UTC time | Slug | Method | Sent | HTTP status | Handler duration (`function.logs`) |
|---|---|---|---|---|---|
| 05:16:05 | auth-session | GET | no Authorization header (**control**) | 401 | **1ms** |
| 05:16:07 | auth-session | GET | `Authorization: Bearer $FAKE` (**control**) | 401 | **1176ms** |
| 05:16:26–05:16:43 | candidate-dashboard | GET | `Bearer $FAKE` | 401 | 1088ms (cold) |
| 05:16:26–05:16:43 | candidate-profile | GET | `Bearer $FAKE` | 401 | 212ms |
| 05:16:26–05:16:43 | company-profile | GET | `Bearer $FAKE` | 401 | 213ms |
| 05:16:26–05:16:43 | recruiter-dashboard | GET | `Bearer $FAKE` | 401 | 212ms |
| 05:16:26–05:16:43 | recruiter-profile | GET | `Bearer $FAKE` | 401 | 213ms |
| 05:16:26–05:16:43 | recommendations | GET | `Bearer $FAKE` | 401 | 213ms |
| 05:16:32 | dashboard | GET | `Bearer $FAKE`, no body | 500 (JSON parse error, not auth) | 2ms |
| 05:16:36 | mfa-status | GET | `Bearer $FAKE` (header ignored — reads cookie) | 500 | 0ms |
| 05:17:44 | mfa-status | GET | no auth at all | 500 | 1ms |
| 05:18:01 | mfa-backup-codes | POST | no body | 500 | 1ms |
| 05:18:02 | update-application | POST | no Authorization header | 401 | 1ms (correct fast-fail) |
| 05:18:03 | dashboard | POST | no Authorization header, `{}` body | 401 | 0ms (correct fast-fail — no token at all) |
| 05:18:05 | profile-complete-onboarding | POST | no Authorization header, `{}` body | 401 | 1ms (correct fast-fail) |
| 05:21:37 | admin-audit | POST | no auth | 410 | 1ms (confirms tombstone is live) |
| 05:23:42 | ai-match | POST | `Authorization: Bearer totally-not-a-jwt`, `{"jobId":"00000000-...","candidateId":"00000000-..."}` | 404 `Job not found` | **1443ms** — real DB query on a non-JWT string |
| 05:29:12 | candidate-applications | POST | **no Authorization header**, `{"jobId":"00000000-0000-0000-0000-000000000001","applyType":"quick"}` | 404 `Job not found` | **1612ms** — real DB query, unauthenticated |
| 05:40:21 | dashboard | POST | `Bearer $FAKE`, `{"type":"candidate","candidateId":"00000000-..."}` | **200 OK**, empty payload | not isolated in logs (batched) |
| 05:40:21 | dashboard | POST | `Bearer $FAKE`, `{"type":"company"}` | **200 OK**, empty payload | not isolated in logs (batched) |
| 05:43:09 | candidate-applications | POST | **no Authorization header**, real `jobId=11111111-1111-1111-1111-111111111111`, `resumeUrl:"nonexistent/definitely-not-a-real-key.pdf"` | 500 (per source, `index.ts:198`: `errorJson('snapshot_download_failed', ..., 500, cors)` — status not captured by this curl invocation, read from source) — body: `Failed to download original resume: Object not found` | real storage round trip — confirms unauthenticated write-path reaches service-role storage `.download()`; this probe deliberately used a nonexistent key so no object was read or written |

Reading the controls: the ~1-2ms rows are fast in-process rejections (no token supplied, or an
explicit 401/405 before any network call — all correct, expected behaviour). The ~200-1900ms rows
are real network validation (either `getCurrentUser()`'s `/api/auth/sessions/current` call, or a
downstream Postgres/PostgREST round trip). Every "broken" finding above is backed by a duration in
the real-network range, not a timing artifact.

Static verification performed via `npx insforge secrets get/list` (no query values reproduced
here beyond confirming presence/absence):
- `INSFORGE_SERVICE_KEY` → `Error: Secret not found: INSFORGE_SERVICE_KEY`
- `API_KEY` → resolves (value confirmed present, **redacted** — do not print secret values in
  reports)
- `secrets list` shows no `INSFORGE_ADMIN_KEY` either.

Static verification performed via `npx insforge db query` (single-line, per the task's ban on
multi-line queries) against live RLS:
- `pg_policies` for `activity`, `applications`, `candidate_profiles`, `interviews`, `jobs` — 31
  policies total, all reviewed; confirms `dashboard`'s reliance on RLS-only protection is currently
  safe for the tables it touches (finding #6), because every SELECT policy on those tables is
  genuinely `auth.uid()`-scoped (or admin-gated), not permissive-by-default.
- `applications` INSERT policies (`with_check`) — all three require `candidate_id = auth.uid()`.
- `information_schema.columns` for `applications` — `candidate_id`, `job_id`, `id` are all
  `NOT NULL`. This is why an unauthenticated `candidate-applications` POST can't silently create a
  ghost row today, even though the identity check is missing — but see finding #1, the storage
  oracle fires **before** that constraint is ever reached, and it goes through the service-role
  client which bypasses the `WITH CHECK` entirely anyway.

---

## 4. Could not verify (explicit)

- **admin-auth-login is actually broken for admin logins** (finding #4) — inferred from the
  confirmed-missing `INSFORGE_SERVICE_KEY` secret and the code's two failure branches (undefined
  key → likely `profile` lookup failure → `role` defaults to `'candidate'` → 403 either at the
  `profileError` check or the `isAdmin` check). This was **not** tested with a real admin
  email/password because this audit had no admin credentials and creating one would be a write
  outside a read-only audit's scope. **Confirming test:** attempt one real admin login through the
  UI or directly against `/admin-auth-login` with known-good admin credentials, and check whether
  it 403s with "Access denied" despite a correct password.
- **admin-settings' anon-key fallback (#9) — silent RLS failure vs. actual escalation.** I
  confirmed the env chain resolves to the anon key, not `API_KEY`, but did not enumerate the RLS
  policies on `profiles` (UPDATE), `admin_members`, `admin_users`, `platform_settings`, and
  `audit_log` for the `authenticated`/anon role to determine which of the two outcomes actually
  occurs. This requires a staff-role token to test end-to-end and wasn't attempted.
- **admin-recruiter's header-fallback (#5) — actual exploitability.** Confirmed the code path is
  live and the env var is absent, so the header branch is always taken. Did not attempt to
  determine what value the Next.js proxy sends in that header, whether it's the real service key,
  or whether it's reachable/guessable by a caller who bypasses the proxy and hits the edge function
  URL directly — that would require reading the Next.js API route source, which is outside
  `insforge/functions/`.
- **upload-logo cross-company write (#10)** — static-analysis only. Did not test with a real
  session (would require creating/using a real account and would write a real storage object, both
  outside this audit's read-only scope). `upload-blog-image` (#10b) was read end-to-end via the
  cached live bundle and does not have the same `companyId`-from-body issue (no tenant parameter
  exists in that flow) — resolved, not a follow-up item.
- **Four functions verified against on-disk source only, not the live bundle**: `notification-worker`
  (#13), and three of the four CORS-reflection functions — `auth-verify`, `recruiter-request`,
  `upload-resume` (#11; `interview-generator` in the same finding *was* live-verified as part of the
  17-function pass). Given this branch (`fix/edge-fn-isservermode`) is otherwise confirmed to match
  live for everything that was checked, drift is unlikely here, but it wasn't independently fetched.
- **activate-recruiter's full blast radius (#8)** — did not enumerate every place in the codebase
  that reads `recruiter_profiles.is_approved` (only checked `candidates/index.ts`, which doesn't).
  Whether this is the same root cause as the existing "recruiter onboarding trap" memory item or a
  distinct issue is unresolved.
- **resume-parse, resume-proxy, recruiter-document-proxy, candidate-dashboard, candidate-profile,
  recruiter-profile, recommendations, admin-blogs, auth-session, mfa-backup-codes** — confirmed the
  `isServerMode`/`getCurrentUser()` pattern is present and correct (grep + partial reads), but were
  **not** read end-to-end for Class C/D/E issues the way `candidate-applications`, `dashboard`,
  `activate-recruiter`, and `update-application` were. `auth-session` in particular is large and
  handles admin impersonation (line ~200) — it deserves a dedicated pass this audit didn't have
  budget for.
- **cleanup-idempotency-keys, cleanup-stale-resources, admin-recruiters (body), upload-resume
  (body)** — not read at all beyond a grep hit.

---

## 5. Clean — verified end-to-end, no defects found

- `company-profile` — company scoped strictly via caller's own `profiles.company_id`; isServerMode fix confirmed live.
- `candidates` — recruiter search correctly gated on `role === 'recruiter'` and `candidate_profiles.is_discoverable`.
- `update-application` — correct ownership checks for candidate (own application, withdraw-only) and recruiter (own job only) before any status change.
- `recruiter-dashboard` — all queries scoped by `recruiter_id = userId`; candidate list restricted to system admins.
- `candidate-applications-id` (singular — the sibling of finding #1) — requires token up front, calls `getCurrentUser()`, scopes every query by `candidate_id = authData.user.id`. This is the correct pattern finding #1 should be matched to.
- `jobs`, `jobs-id` — intentionally public, correctly filtered to `is_approved && status='active' && companies.status='verified'`.
- `blogs`, `blogs-slug` — intentionally public, correctly filtered to `status='published'`.
- `auth-signup` — has an explicit privilege-escalation guard downgrading `admin`/`super_admin` role requests to `candidate` at public signup; uses `getServiceKey()` correctly.
- `auth-verify` — public-by-design (email+OTP), no identity/authz issue found beyond the shared CORS finding (#11).
- `admin-forgot-password` — enumeration-safe (always returns `{success:true}`), gated by an `ADMIN_EMAILS` allowlist.
- `admin-export-audit` — proper staff-role + `canPerform` permission gate before any export.
- `admin-audit` — deliberately retired (410 tombstone), confirmed live matches the on-disk stub, confirmed the forgeable predecessor is gone.
- `recruiter-request` — intentionally public intake form using the service key by design (pre-auth by definition); writes `is_approved: false` / `status: 'pending'`, does not itself grant access.
- `_shared/adminAuth.ts`, `_shared/cors.ts`, `_shared/permissions.ts` — read fully; `requireStaff()`/`getServiceKey()`/`getBaseUrl()` are correctly implemented and are the pattern every other function should be converging on.

**Auth path only (via `requireStaff()`/`_shared/adminAuth.ts`), handler bodies not read for
Class C/D/E beyond what the shared helper itself guarantees** — do not re-audit the auth gate on
these, but a body-level pass hasn't happened in this sweep: `admin-announcements`,
`admin-applications`, `admin-audit-logs`, `admin-billing`, `admin-companies`, `admin-dashboard`,
`admin-export`, `admin-jobs`, `admin-plans`, `admin-reports`, `admin-recruiters`,
`cleanup-stale-resources`. (`admin-candidates` was partially read — confirmed a deliberate
mass-assignment guard at line 183-185 stripping `id`/`role` from PATCH bodies — but not read fully
end-to-end.)
