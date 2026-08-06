# 35 — Session Handoff #5 · V1 Delivery Lead

**Written:** 2026-08-01 · **START HERE.** Supersedes the "what's next" of doc 28.
Doc 34 is the test plan; doc 32 is the InsForge runbook; docs 30/31/33 are the legal set.

---

## 0. Your role

Lead engineer, architect and advisor for delivering **V1** safely.

- **You own the verdict, not the typing.** Decide what ships and what blocks.
- **Delegate execution to Sonnet or Haiku** via self-contained prompts (§7). Spend your own budget
  on deciding, reviewing, and catching what a cheaper model misses. That is where every save has come from.
- **Verify before you believe.** Every time this project trusted a doc, a comment, or an agent
  summary, it was wrong — including twice in the session that wrote this doc.
- **The user is near their usage limits.** Don't re-derive §2. Don't spawn agents unless asked.

**V1 = recruiter portal + standard ATS + DPDP compliance.** No AI, no payments. Those are v1.1/v2.0.

---

## 1. Read order for a cold session

1. This doc.
2. `34_V1_Test_Plan_And_Reset_Toolkit.md` — the test plan, the reset SQL, and the QA assistant prompt.
3. `32_InsForge_Function_Restoration_Runbook.md` §Phase 0 result and §Phase 5 — the migration and its aftermath.
4. `30_Privacy_Policy_DRAFT.md`, `31_Terms_Of_Service_DRAFT.md`, `33_Breach_Notification_Runbook.md` — the legal set, all drafted, all awaiting placeholders + counsel.
5. `26_Legal_DPDP_Compliance_Handoff.md` §9, §10, §11 only if a legal question comes up.

---

## 2. Verified state — 2026-08-01

Checked against production, the live DB, or `origin/main`. **Do not re-verify.**

### Shipped to `main` and pushed
- **`@insforge/sdk` 1.4.2 → 1.5.2.** Edge functions moved to Deno Deploy v2; the SDK derives the new
  `{appKey}.function2.insforge.app` host itself, but **only for `.insforge.app` base URLs**.
- **Proxy routes `/functions/*` to the new host** (`app/api/v1/remote/[...path]/route.ts`). The browser
  client's baseUrl is the proxy, so SDK derivation never applied to client calls.
- **Recruiter onboarding trap fixed** — `bumpToRecruiter()` now sets `completed_onboarding`.
- **Fail-open approval gate fixed** — `lib/recruiter-approval.ts` reads `company_members.status` +
  `companies.status` and fails closed. The legacy `recruiter_profiles.is_approved` read is gone.
- **`auth-signup`**: the never-live "recruiter registration is invite only" 403 deleted; the
  `REQUEST_FAILED` → resend branch ported (closes an account-enumeration leak); the resend wrapped in
  try/catch so SMTP's 60s throttle can't turn into a 500.

### Live infrastructure
- **All 54 edge functions redeployed on Deno Deploy v2**, verified over HTTP, zero 404s.
- **`INSFORGE_ANON_KEY` secret added.** It must be the **app's 221-char `eyJ...` anon key**, NOT the
  platform's 69-char `ANON_KEY`. Setting the wrong one made every authenticated function 401.
- 35 functions have an `|| Deno.env.get('ANON_KEY')` fallback (branch `fix/anon-key-fallback`, unmerged).
- Project upgraded to **v2.2.9**.

### Data
- `info@talentmeshsolutions.com` — recruiter, company `verified`, membership `active`, request
  `approved`, `completed_onboarding` backfilled `true`.
- `consent_records` ~41 rows, including outage-era orphans (`user_id IS NULL`) — clear with doc 34 §1.3.
- Probe accounts to delete: `tm-probe-*@mailinator.com`, `ponytail_repro_*@example.com`.

### Drafted, not shipped
Docs 30 (Privacy), 31 (Terms), 33 (Breach runbook + migration 067). All await 6 placeholders and counsel.

---

## 3. The blocker — CLOSED 2026-08-02

### Recruiter is signed out seconds after reaching the dashboard

**Symptom:** land on `/recruiter/dashboard`, then bounce to
`/login?reason=session_expired&returnTo=%2Frecruiter%2Fdashboard`.

**Chain:** a `/functions/*` call 401s → `lib/insforge.ts` `invokeFunction` reads 401 as an expired
token → `refreshAccessToken()` fails → dispatches `auth:session-expired` → `AuthContext` signs out.

### Root cause — `isServerMode` missing on every caller-scoped edge client

`@insforge/sdk` 1.5.2, `Auth.getCurrentUser()` (`node_modules/@insforge/sdk/dist/index.js`):

```js
async getCurrentUser() {
  if (this.isServerMode()) {
    const accessToken = this.tokenManager.getAccessToken();   // setAccessToken() populates THIS
    if (!accessToken) return { data: { user: null }, error: null };
    this.http.setAuthToken(accessToken);
    const response = await this.http.get("/api/auth/sessions/current");   // real validation
    return { data: { user: response.user ?? null }, error: null };
  }
  const session = this.tokenManager.getSession();   // setAccessToken() does NOT populate this
  if (session) { ... }
  if (typeof window !== "undefined") { ...refreshSession()... }   // Deno 2 has no `window`
  return { data: { user: null }, error: null };     // ← falls out here, zero network I/O
}
```

A function that did `createClient({ baseUrl, anonKey })` then `setAccessToken(token)` took the
**non**-server branch, found no session object, could not reach the browser refresh fallback, and
returned `user: null` with `error: null` — in **zero milliseconds**. Every such function then hit its
own `if (authError || !authData?.user) return 401` and rejected every caller unconditionally,
regardless of what token was sent.

**Introduced by the 1.4.2 → 1.5.2 upgrade + 54-function redeploy on 2026-08-01.** It is the same
defect as the parked `mfa-backup-codes` failure in §6 Queue E.

**Blast radius: 17 of the 19 functions using `setAccessToken`.** Only `auth-session` and
`candidate-applications-id` already passed `isServerMode: true`. The rest were dead:
`candidate-dashboard`, `candidate-profile`, `company-profile`, `dashboard`, `interview-generator`,
`mfa-backup-codes`, `mfa-status`, `profile-complete-onboarding`, `recommendations`,
`recruiter-dashboard`, `recruiter-document-proxy`, `recruiter-profile`, `resume-parse`,
`resume-proxy`, `update-application`, `upload-blog-image`, `upload-logo`.

**Fix:** add `isServerMode: true` to the caller-scoped `createClient` in all 17
(branch `fix/edge-fn-isservermode`). Service-role clients were left alone — every `isServerMode`
reference in the SDK is inside the auth module; database and storage never read it.

**Deployed to InsForge 2026-08-02.** No Vercel build is involved, so the partner's README dance was
not needed for this fix.

### The measurement that settled it

The platform's own `insforge logs function.logs` duration is trustworthy and is the whole diagnostic
— a handler that makes no network call reports 0–2 ms, one that validates a token reports 200–1500 ms.

| Probe | Before | After |
|---|---|---|
| `POST recruiter-dashboard` via the real prod proxy, `tm_access_token` cookie | **401 0 ms** | **401 1121 ms** |
| `POST candidate-dashboard` direct | 401 0 ms | **401 1140 ms** |
| `POST recruiter-profile` direct | 401 0 ms | **401 225 ms** |
| `GET auth-session` no token (control, always correct) | 401 1 ms | 401 1 ms |
| `GET auth-session` with token (control, always correct) | 401 1089 ms | 401 1089 ms |

`auth-session` is the clean control this investigation lacked for two sessions: same runtime, same
host, same request shape — it distinguishes "no token" (1 ms) from "invalid token" (1089 ms) because
it is one of the two functions that already passed `isServerMode: true`.

### Both earlier diagnoses were wrong — do not reopen either

- **Sonnet's "production is serving a stale build" — wrong,** and already disproven in this doc.
- **Luna's "the proxy honours a caller-supplied anon-key bearer" — wrong, and now disproven
  directly.** `invokeFunction` (`lib/insforge.ts:141-153`) sends **no** `Authorization` header at all
  unless a caller passes one, so `callerSuppliedJwt` is computed from an absent header and is always
  `false` on the first call. The proxy therefore always overwrites with the cookie token, exactly as
  designed. The doc's earlier "UPDATE" rehabilitated Luna on the premise that "the real browser SDK
  *does* send one" — **that premise is false for this code path.**
  **`18a300c` / `codex/fix-function-auth-forwarding` is not needed. Close it.**
- **The "401 0 ms ⇒ `if (!token)` ⇒ no Authorization at the function" inference — wrong.** A
  throwaway probe function deployed on 2026-08-02 echoed, through the production proxy with only a
  `tm_access_token` cookie: `authPresent: true, authLen: 132, authPrefix: "Bearer eyJhbGc"`.
  **The proxy forwards `Authorization` correctly. The proxy was never the problem.**
- **The anon-key env check (old step 4) — run, and clean on the InsForge side.** There is no
  `NEXT_PUBLIC_INSFORGE_ANON_KEY` *secret*; the `INSFORGE_ANON_KEY` secret matches `.env.local`
  byte-for-byte and still authenticates (`/api/database/records/jobs` → 200). See §3b for the Vercel
  half, which is a real but separate bug.

### 3b. Still open — Vercel has the WRONG `NEXT_PUBLIC_INSFORGE_ANON_KEY`

**Evidence, from the built production chunk (not inferred):** grepping the JS bundles served by
`https://app.anujpotfolio.qzz.io/login` yields `anon_525ad36c35754f76…` — the **69-char platform
`ANON_KEY`**, which is what the InsForge dashboard displays. The correct value is the **221-char app
anon JWT** `eyJhbGciOiJIUzI1NiIs…`, identical to `.env.local` and to the `INSFORGE_ANON_KEY` secret.

This did **not** cause the logout — the platform key is accepted by InsForge REST, and both keys
behave identically on `/api/auth/refresh`. But it is live in `app/api/v1/remote/[...path]/route.ts`
`callerSuppliedJwt` and in ~15 server routes, and `lib/insforge.ts` only throws on a *missing* key,
never a malformed one. **Fix it:** set Vercel's `NEXT_PUBLIC_INSFORGE_ANON_KEY` to the `.env.local`
value, then have the partner push a README commit or it will not rebuild (§5).

### Separate bug found alongside — not the cause of the logout
`GET /api/v1/remote/api/database/records/applications?select=...&job.recruiter_id=eq...` returns
**400 Bad Request** (PostgREST, 182-byte error body). A malformed embed or a column that does not
exist in the recruiter's applications query. It is a 400, not a 401, so it does **not** trigger the
sign-out — but the recruiter applications list is broken independently. Fetch the response body to
get the PostgREST `message`/`details`; it names the offending column or relationship directly.

### New trap for §5
**Wall-clock curl timing is not evidence of what a function did.** Cold start, TLS and RTT dominate
— a 0 ms handler can take 4.4 s on the wire. Two sessions drew wrong conclusions from it. Use
`insforge logs function.logs`, which reports the handler's own duration, and always run a
known-good control function in the same batch.

---

## 4. V1 launch gate

- [x] The §3 blocker closed and verified behaviourally (2026-08-02) — but §3b anon key still open
- [ ] Doc 34 suites A–G pass, with SQL output recorded
- [ ] B-1 (OAuth consent gate, `fix/oauth-consent-gate`) merged
- [ ] B-2 (rate limiting, `feat/auth-rate-limiting`) **committed** and merged — it may still be uncommitted
- [ ] `fix/anon-key-fallback` merged
- [ ] Migrations **066** (rate limits) and **067** (breach log) applied by a human
- [ ] Terms + Privacy: 6 placeholders filled, counsel-reviewed
- [ ] **Grievance Officer named** — can be a director; does not require a hire
- [ ] Registered address supplied
- [ ] Breach runbook: 4 names + one tabletop
- [ ] Launch wipe, then empty-state paths re-smoked
- [ ] Dead code removed (doc 34 Part 4)

---

## 5. Traps — every one has already cost time

- **Push to `main` ≠ deploy.** Hobby plan builds on the partner's commits. **This caused the §3
  blocker's misdiagnosis.** Always confirm production is serving the commit you think it is.
- **A forward-only code fix leaves every pre-existing row broken.** `completed_onboarding` was fixed in
  code and the already-approved recruiter stayed trapped until a backfill. Whenever a gate depends on a
  flag a new code path starts writing, check existing rows.
- **Never audit from `Talentmesh-demo`** — ~39 commits behind, ~110 dirty files. Use a clean worktree
  off `origin/main` (`tm-main`).
- **Testing an endpoint is not testing the app's path to it.** All 54 functions were curled healthy while
  every browser call was broken — the proxy sat in between and was never exercised.
- **`docs/insforge_function_capture_2026-07-31/` is a lossy backup.** BOM, inconsistent headers, at least
  one file with corrupted template literals. Never deploy from it; pull fresh with
  `insforge functions code <slug>`.
- **`deployedAt` is stamped at creation and never updated** — 51 of 54 match `createdAt` to the second.
  `updatedAt > deployedAt` does NOT mean "never deployed".
- **The control plane lies about function health.** It reported all 54 `active` while every one 404'd.
  Only a real HTTP request settles it.
- **`insforge db query` needs SINGLE-LINE SQL** — the Windows shim truncates at the first newline and
  still prints success. Re-read after every write.
- **A page returning 200 does not mean the journey completes.**
- **Migrations are applied by a human** unless explicitly delegated. **Never run 064** — it drops 13 tables.
- **`npm audit fix --force` downgrades Next 16.2.12 → 14.2.35.** The sharp CVEs are unreachable
  (`images.unoptimized = true`). Never run it.
- **4 `*.test.ts` files are `npx tsx` scripts** vitest can't execute — their assertions never run under
  `npm test`, and they guard the password policy, consent capture, withdrawal and erasure.

---

## 6. Work queues

**Queue A — close §3, then test.** Doc 34 suites A → B first. A7 and B1 are the two that prove today's
recruiter fixes took. **B1 is the security half** — a pending recruiter typing a dashboard URL must be
bounced. B4 alone proves nothing.

**Queue B — merge chain.** B-1 → B-2 → `fix/anon-key-fallback`. Then a human applies 066 and 067.

**Queue C — legal.** Placeholders → counsel. Independent of everything else; it can run in parallel and
should start as soon as the user supplies the two values.

**Queue D — cleanup** (doc 34 Part 4, confirmed-dead only, own branch, post-launch).

**Queue E — after V1.** `mfa-backup-codes` 500 (2 real callers) · `admin-forgot-password` returns 200 to
an empty POST · the refresh question (doc 34 §G5) · e2e harness · `Ai_atsAdisor.md` for v2.0.

---

## 7. How to delegate

- **One self-contained prompt per phase.** Include the §5 traps — executors do not know them.
- **Name exact files and line numbers**, and say line numbers may have moved so they must re-grep.
- **State what NOT to do**, explicitly and by name.
- **Demand verification with expected values**, and never accept "the CLI reported success".
- **Make them report what they could not verify.** The best outputs have been honest gaps.
- **Prefer instrumentation over reasoning** when two explanations compete. That is exactly what settled §3.
- **Review what comes back against the live system**, not against their summary.
