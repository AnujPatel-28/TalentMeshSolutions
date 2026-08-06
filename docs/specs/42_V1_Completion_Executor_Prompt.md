# 42 — Executor Prompt: finish V1

**Hand this whole file to the executor.** It is self-contained.
Written 2026-08-02. Four tasks. Everything else in V1 is already done.

---

## Your role

You are finishing V1 of the TalentMesh recruiter ATS in
`C:\Users\Anuj\Desktop\tm_web\tm-main` — a clean worktree off `origin/main`.

**Never work in `Talentmesh-demo`.** It is ~39 commits behind with ~110 dirty files.

Branch: `codex/fix-recruiter-sidebar-routing`. Commit locally. **Do not push.**

**Line numbers in this document may have moved. Re-grep before editing.**

---

## Read first, in this order

1. **`41_V1_Scope_Lock_And_V2_Plan.md`** — the scope decision. Read this before anything else; it
   tells you what V1 is and, more importantly, what it deliberately is not.
2. `40_Company_First_Conformance_Audit.md` §Addendum — the four-layer model and why Layers 2–4 are
   out of V1 scope.
3. `37_Recruiter_UI_Audit.md` — where the fabricated data lives, with file:line.
4. `36_Edge_Function_Auth_Sweep.md` — only if you touch `insforge/functions/`.

**Never trust a doc.** Verify against source. Docs in this repo have been wrong many times, and two
of the four above contain claims that were later corrected. Where doc and code disagree, the code is
what ships — say so in your report.

---

## Context you must not re-derive

- **V1 is a plain ATS for a single recruiter per company. No AI. No interview scheduling.**
  Every production company has exactly one active member, so single-recruiter is not a regression.
- NVite, Offers and Interviews were cut (doc 41 §3). Their **routes and tables still exist**; only
  the nav entries and entry-point buttons were removed. Do not delete them, and do not re-add links.
- V1 has no AI. Where you find an AI-derived value on screen, **remove the UI**, never improve it,
  and never delete the underlying edge function — those stay deployed for v2.0.
- Applicant stage changes go through `PATCH /api/applications/[id]/status`. It works. Do not rewrite it.
- Indian market: **INR only. Never render `$` or USD.**

---

## Tasks, in order

### L-1 · P1 — auth bypass in `profile-complete-onboarding`

**File:** `insforge/functions/profile-complete-onboarding/index.ts`

The handler reads `userId` from the POST body first, and only falls through to the `Authorization`
header path if it is absent. It then writes `completed_onboarding: true` for that id using an
anon client created at the top of the handler.

An unauthenticated caller can POST `{"userId":"<any uuid>"}` and mark any user onboarded.
`completed_onboarding` is a routing gate — `proxy.ts` reads a `tm_onboarding` cookie derived from it
and `app/api/auth/refresh/route.ts` enriches it — so this is not cosmetic.

**Fix.** Always authenticate from the `Authorization` header and take `userId` from
`getCurrentUser()`. Never accept `userId` from the request body. If a server-to-server caller
genuinely needs it, require the service key explicitly instead — but check whether any caller
actually does before building that path.

**Trap:** the caller-scoped `createClient` **must** pass `isServerMode: true`. Without it,
`@insforge/sdk` 1.5.2's `getCurrentUser()` returns a null user in ~0 ms without ever calling the
backend, and the function 401s everybody. This bit 17 functions on 2026-08-01.

**Deploy.** Functions importing `_shared/` must be esbuild-bundled first — InsForge deploys one file
per function. Use the rules in `scripts/deploy-all-functions.js`.

**Verify.** POST `{"userId":"<some uuid>"}` with **no** Authorization header and expect 401. Then
confirm the duration in `npx --no-install insforge logs function.logs` — see the measurement rule below.

---

### L-2 · P1 — the Reports page is entirely fabricated

**File:** `app/dashboard/recruiter/[role_id]/reports/page.tsx`

`grep -c "invokeFunction\|fetch(\|\.from("` on this file returns **0**. It performs no data access
at all. Every figure — 18 days, 82%, the hiring funnel, the "Top Sources" table — is a literal. It
also renders **$4,200 USD** in an INR-only product.

**Do the honest version, not the impressive one.** Compute only what the database can actually
support today from `jobs` and `applications`, both of which are already company-scoped by RLS:

- open jobs, total applicants, applicants per stage, hires — these are counts and are truthful
- time-to-hire, conversion %, "Top Sources", cost-per-hire — **no data source exists.** Do not
  invent them. Remove them.

If what remains is thin, that is the correct outcome — a small honest report beats a rich fake one.
If nothing survives, remove the Reports nav entry entirely rather than shipping a dead page.

Every figure that stays needs a loading state, an empty state and an error state. The database is
near-empty at launch, so the empty path is the one users will actually see first.

**Verify.** No hardcoded numeric literal is rendered as data. No `$` or `USD` anywhere in the file.

---

### L-3 · P1 — remove the fabricated "AI Match" score

**File:** `app/dashboard/recruiter/[role_id]/candidates/page.tsx` (and check
`components/recruiter/CandidateProfileDrawer.tsx`, which renders a match label)

A `Math.random()`-derived value is displayed as an "AI Match" score. V1 has no AI, so this is a
number invented at render time and shown to a recruiter as if it meant something. Doc 40 confirmed
the `candidates` edge function also returns a fabricated score.

**Fix.** Remove the AI Match column and any match label/sort from the recruiter UI. Do **not** delete
the `ai-match` or `candidates` edge functions — they stay for v2.0. If a sort control offers "Best
Match", remove that option and default to something real.

**Verify.** `grep -rn "Math.random" app/dashboard/recruiter/` returns nothing. No match score renders.

---

### L-4 · P2 — delete confirmed-dead code

Each of these was verified dead. **Re-verify with `rg` before deleting each one**, and if anything
still imports or links to it, stop and report instead of deleting.

| Path | Evidence it is dead |
|---|---|
| `app/dashboard/DashboardLayoutClient.tsx` | 1006 lines, zero importers |
| `app/company/[companyId]/recruiter/` | `proxy.ts` no longer rewrites to it (commit `2a42a4e`); no inbound links |
| `app/portals/app/company/[companyId]/recruiter/` | superseded portal tree; contains a second, weaker client-side auth guard reading the retired `recruiter_profiles` |

Deleting the two `company` trees also removes a duplicate authorization implementation, which is the
main reason to do it — the code volume is secondary.

**Verify.** `npx tsc --noEmit` reports no new errors. Stale `.next/types` errors referencing
`app/onboarding/recruiter/{documents,interests}` are pre-existing and regenerate on build — ignore
exactly those two.

---

## What NOT to do

- **Do not** re-add NVite, Offers or Interviews to the nav, or restore the NVite buttons.
- **Do not** delete the `nvites` / `offers` / `interviews` routes or tables — v1.1 needs them.
- **Do not** delete the `ai-match`, `candidates`, `interview-generator` or `recommendations` edge
  functions. V1 only stops *calling* AI.
- **Do not** touch `proxy.ts`. Its routing was just fixed; changing it will undo the approval gate.
- **Do not** touch `app/dashboard/layout.tsx` or `app/dashboard/recruiter/[role_id]/layout.tsx` —
  these are the authorization boundary.
- **Do not** add company-scoping migrations, a Team UI, or anything from Layers 2–4 of doc 40.
  That is v1.1/v2.0.
- **Do not** add a value you cannot source. Render an empty state instead.
- **Do not** run `npm audit fix --force` — it downgrades Next 16.2.12 to 14.2.35.
- **Do not** `git push`.

## Two measurement rules that have burned this project

1. **Curl wall-clock time proves nothing about an edge function.** Cold start and TLS make a 0 ms
   handler take 4 s on the wire. Use `npx --no-install insforge logs function.logs`, which reports
   the handler's own duration: **0–2 ms = returned with no network I/O; 200–1500 ms = it really
   validated a token.** Run a known-good control in the same batch — `GET auth-session` with no
   token logs ~1 ms, with a token ~1000 ms.
2. **`insforge db query` needs single-line SQL.** The Windows shim truncates at the first newline
   and still prints success. Re-read after every write.

## House rules

- Match the surrounding style — CSS modules plus inline styles. Do not introduce Tailwind.
- Reuse before building. `StatusPill`, `CandidateProfileDrawer` and `DataTable` already exist.
- Every `invokeFunction` returns `{ data, error }`. Handle `error`.
- Remove imports and variables **your** changes orphan. Do not clean up unrelated dead code beyond L-4.
- Smallest diff that works.

## Reporting back

Per task: files and functions changed, how you verified, and the **actual observed result** — not
"should work". For L-1 include the measured handler duration. **State explicitly what you could not
verify.** You have no login, so no authenticated browser testing — say so rather than implying you
ran it. Do not call a task done because a CLI printed success.
