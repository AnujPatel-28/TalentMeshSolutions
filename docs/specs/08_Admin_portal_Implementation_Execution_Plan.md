# 08 — Admin Portal Implementation Execution Plan

**Status:** Ready for execution once the open decisions (§6) are confirmed
**Owner:** Platform
**Version:** 1.0 — 2026-07-18
**Cross-refs:** this Admin_Portal suite docs 01–07, `14_Admin_Portal_Rebuild_Architecture.md` (R-tasks), `12_Admin_Production_Readiness_Execution_Plan.md` (W-tasks — absorbed here), `10_Auth_Token_Propagation_And_Subdomain_Fix.md` (hard dependency for Phase 4), `09_Migration_Execution_Runbook.md` (gate procedure for every migration).

**Standing rules:** humans apply all DDL (052–056); never trust committed SQL as live state; verify with `get-table-schema` after each apply. Test data is disposable (recorded decision) — backfills are simple, and **Phase 0 may wipe test entities freely**.

---

## 1. Phase plan

```
Phase 0  Structural        W1 mock-auth · R-1 tree collapse · R-2 edge kit · W2 live verify (human)
Phase 1  Trust             052+053 · R-3 audit · R-4 RBAC · R-13 bootstrap · admin-plans boundary
                           · R-10 impersonation · OTP infra (055) + team page + email-change
Phase 2  Company-First     054 · R-6 company page · R-7 recruiter replacement · R-5 job detail
Phase 3  Operations        R-8 export · R-9 metrics · R-11 fan-out · settings rebuild + 056 · W6
Phase 4  Subdomain cutover doc-10 cookie fix → admin.talentmeshsolutions.com enforcement
Phase 5  Ops runbooks      admin@talentmeshsolutions.com email cutover · seed real staff · W9 full suite
```

Phases 0–1 are strictly sequential. Phases 2 and 3 can interleave (disjoint files except `admin-candidates`), Phase 4 anytime after Phase 0 + doc-10 lands; Phase 5 last.

### Phase 0 — Structural

| Task | Doc | Agent / model | Isolation | Human gate |
|---|---|---|---|---|
| W1 three-condition mock-auth gate | 12-W1 | general-purpose · Opus 4.8 | — | review diff |
| R-1 port plans/billing/team/templates → Tree A; **delete** mock impersonate page (not port — decision 2); delete orphan trees; nav per 14 §3.2 | 14 R-1, 05 §1 | general-purpose · Sonnet 5 | worktree | review deletions |
| R-2 `_shared/` kit + migrate all kept fns | 03 §3 | general-purpose · Opus 4.8 | worktree | — |
| W2 live checks (RLS, metadata, `exec_sql` callers, `tm_admin_access` writers, Admin-API email update) | 01 §3 | Explore → general-purpose · Opus 4.8 | — | **yes — live creds, report only** |

**Exit:** `next build` green; forged-cookie curl denied; every nav link resolves; W2 report filed (it sizes Phase 1's W7 scope).

### Phase 1 — Trust

| Task | Doc | Agent / model | Human gate |
|---|---|---|---|
| Apply 052 (roles+guards) then 053 (audit merge) | 02 | human applies; agent writes SQL | **yes — DDL; snapshot before 053** |
| R-3 audit writers (destructive ops, exports, search) | 03 | general-purpose · Opus 4.8 | — |
| R-4 matrix + `withApi.requiredPermission` + `requireStaff` perms | 14 §4, 03 §2 | general-purpose · Opus 4.8 | **yes — confirm §6.1 split first** |
| Apply 055; build OTP endpoints + accept-invite page + team page + email-change + reset-link | 03 §5, 04 §§1–2, 05 §5 | general-purpose · Opus 4.8 | — |
| R-10 impersonation **removal** (route + mock page + banner + 3 cookie readers) | 03 §5.4 | general-purpose · Sonnet 5 | — |
| R-13 forgot-password route + timingSafeEqual + env cleanup | 03 §6 | general-purpose · Sonnet 5 | — |
| `admin-plans`/`admin-billing` fns; port pages onto them | 03 §4 | general-purpose · Sonnet 5 | — |

**Exit:** W9 core suite green (forged cookie, role matrix incl. `content`, suspended staff, last-super_admin 422, OTP lockout, impersonation guards). No plaintext-credential path (grep + spec).

### Phase 2 — Company-First (docs 06, 07)

Apply 054 → R-6 (company detail + GSTIN registration + attach) → R-7 (recruiter directory/actions replacement + legacy deletion + **public `/signup/recruiter?variant=application` form alignment**: drop PAN/Aadhaar/KYC-upload/emergency contacts, GSTIN required, KYC → verification Gmail — doc 06 §"Signup form alignment") → R-5 (job detail + approvals re-filter). One e2e round trip is the gate: *register company (409/attach tested) → verify → invite member on behalf → recruiter sets password via link → posts job → admin approves → admin changes an application stage with reason → company notified → all steps visible in audit + company Audit tab.*

### Phase 3 — Operations

R-8 `admin-export` (delete both browser blocks) · R-9 metrics module (error-not-zero, verification-queue card) · R-11 fan-out via `notification_jobs` · settings-page rebuild together with **056** and the proxy maintenance check + signup flag enforcement (03 §8) · W6 redirect/`/unauthorized`/`?reason=suspended`.

**Exit:** announcement to a 10k-notification fixture completes via worker; maintenance toggle blocks a non-staff session ≤30 s; settings page contains zero dead controls (AD-9 closed).

### Phase 4 — Subdomain cutover (`admin.talentmeshsolutions.com`)

**Hard dependency: doc 10 §4 (single HttpOnly `Domain=.talentmeshsolutions.com` cookie) fully landed** — without it every admin session on the new origin is "logged in but no data" (sessionStorage is per-origin). Then:

1. AD-10 sweep: no `sessionStorage.getItem('tm_token')` remains under `app/dashboard/admin/**`.
2. DNS + Vercel domain for `admin.talentmeshsolutions.com`; confirm TLS.
3. `proxy.ts`: keep the existing `isAdminPortal` rewrite (`admin.*` → `/dashboard/admin/**`, `proxy.ts:393-415`); **add** the inverse gate — on non-admin hosts, `/dashboard/admin/*` and `/admin/*` redirect to `admin.<domain>` (partially present at `:222-227`; make it unconditional incl. main domain) so the canonical path stops resolving elsewhere (AD-13.3).
4. Resolve AD-13.2 (`tm_admin_access` OR-branch): per W2's finding, either confirm server-only HttpOnly writes or delete the branch.
5. Delete `NEXT_PUBLIC_ADMIN_SECRET_PATH` rewrites (obsolete obfuscation).
6. CORS allowlist (R-2) includes exactly `https://admin.talentmeshsolutions.com` for admin fns.
7. Update OTP/invite/reset links to absolute `https://admin.<domain>/...` (03 §5 templates).

**Verification:** login on `admin.` works with data (doc 10 §5 checks); `/dashboard/admin` on the apex 308s to `admin.`; candidate session hitting `admin.` gets the role redirect, not a blank shell; e2e suite runs against the subdomain in CI config.

### Phase 5 — Ops runbooks

**5a. Primary admin email → `admin@talentmeshsolutions.com`** (uses the Phase-1 email-change machine; current primary is a personal Gmail):

1. Precondition: mailbox `admin@talentmeshsolutions.com` exists and is receivable (domain mail is already in use for the verification mailbox).
2. Sign in as the current super_admin → Settings → Profile & Security → change email → OTP arrives at `admin@talentmeshsolutions.com` → verify.
3. Effect (04 §2): auth email updated (UUID unchanged), all sessions invalidated → re-login with the new address.
4. Update server-only `ADMIN_EMAILS` env (bootstrap allowlist) to the new address; redeploy.
5. Verify: old address cannot log in; audit shows `admin_email_changed`; forgot-password on the new address round-trips.
6. Fallback if the flow is broken: `/admin/setup` bootstrap (token-gated) creates a fresh super_admin on the new address; old account is then removed via the team page (last-super_admin guard forces ordering: create first, remove second).

**5b. Seed real staff:** invite each operator via the OTP flow with least-privilege roles (`content` for content staff); delete every test/staff account; confirm exactly the intended set in the team page and `audit_log`.

**5c. W9 full regression + 01 §4 exit criteria** — the audit report is closed only when that suite is green against the live subdomain.

---

## 2. Launch gate (supersedes doc 12 §3)

- [ ] W1 mock-auth closed (curl-verified, prod env)
- [ ] W2 live verification filed; any RLS gap → W7 scope completed
- [ ] 052/053 applied — RBAC enforced, single append-only audit spine
- [ ] R-7 shipped — no plaintext-credential or delete-recreate path exists
- [ ] R-10 impersonation **removed** — no route, page, banner, or cookie reader remains (grep-verified)
- [ ] R-13 recovery works end-to-end
- [ ] `exec_sql` dropped (056) — AD-8
- [ ] Settings page has no dead controls — AD-9
- [ ] Phase 4 cutover verified on `admin.talentmeshsolutions.com`
- [ ] Phase 5a email cutover done; 5b real staff seeded
- [ ] W9 suite green in CI against the subdomain

## 3. Parallelism & model notes

Worktree-isolate R-1, R-13, and the plans/billing port (disjoint). Never parallelize R-2 with function-level work (same files). **Full model-orchestration matrix is §7** — that section supersedes the brief hints in the phase tables above; where a phase table says "Opus 4.8 / Sonnet 5," read the §7 fleet mapping instead.

## 4. What this plan deliberately does not do

- No talent-pool/AI features (flag stays off — company-suite doc 07).
- No company hard-delete or merge tooling (07 §5 [SUGGESTION] — deferred until real-data need).
- No `finance` role until billing write APIs exist.
- No admin mobile layout work beyond the responsive baseline (ops console is desktop-first).

## 5. Risks

| Risk | Mitigation |
|---|---|
| 053 audit merge loses rows | snapshot first (`_db_snapshots/`); copy-then-drop in one reviewed script |
| Cutover before doc-10 cookie fix | Phase 4 hard-gated on doc 10 §5 verification |
| OTP email deliverability (new domain mailbox) | Phase 5a step 1 precondition + `send-email` fn test to the exact address before cutover |
| `exec_sql` dropped while a forgotten caller exists | W2 enumerates callers live; 056 applied last, after the settings rewrite deploy |
| Role-matrix enforcement locks out current workflows | §6.1 confirmation before R-4; matrix change is a one-file edit + redeploy |

## 6. Product-owner decisions — CONFIRMED 2026-07-18

All four locked; the docs reflect these, no open gates remain:

1. **Permission split — KEEP as specified** (14 §4.2). `admin` = platform ops without billing writes / team / settings / candidate+company delete; `super_admin` = full; `content` = content-only, cannot publish announcements. R-4 ships this matrix verbatim.
2. **Impersonation — REMOVE for launch** (W4 Option A). No impersonation ships. Delete the route, mock page, banner, and the three `document.cookie` readers; `impersonation_sessions` is dropped from migration 055. There is no impersonation gate on the launch checklist anymore — removal *is* the resolution. Rebuild (Option B) is a post-launch backlog item if support ever needs it.
3. **PAN/Aadhaar — DO NOT collect.** Phase-1 KYC is manual via the verification Gmail mailbox (company-suite doc 07). Intake (`request-access`, admin create-on-behalf, **and the public `/signup/recruiter?variant=application` form**) drops PAN, Aadhaar, and the KYC upload — see doc 06 §"Signup form alignment". No column-encryption work needed; the fields are simply not gathered.
4. **Approved-job edits — NO re-approval** for MVP. Editing an approved job leaves `approval_status='approved'`. The 04 §4 re-trigger idea stays parked as a post-MVP [SUGGESTION].

---

## 7. Model Orchestration — which model does what

This maps every admin task onto the available fleet. The operating model is **Opus-as-advisor**: one always-on Opus session is the orchestrator — it writes each task prompt, picks the executor per this table, defines the verification, and reviews the returned output file (§8). Executors run in **parallel sessions** and never decide their own scope; they execute the prompt Opus hands them and return a result doc.

### 7.1 Capability tiers (what each model is for)

| Model | Tier | Use it for | Do NOT use it for |
|---|---|---|---|
| **Opus** | Orchestrator + T-High | Advisor session: prompt authoring, sequencing, executor selection, output review/merge decisions. Can also execute the hardest security/DDL task if no other T-High model is free. | High-volume mechanical work (waste of the orchestrator). |
| **Fable 5** | T-Top (scarce — use maximally while available) | The tasks where a wrong call is expensive **and** hard to catch in review: security/authz **authoring** (W1, R-2 kit, R-4 enforcement, R-3 audit spine), migration **SQL authoring** (052/053/055/056), and the **final pre-launch security review gate**. Front-load Fable into Phase 0–1. | Ports, UI, decomposition, file moves — Sonnet/Flash/Haiku do these fine; spending Fable on them wastes the scarce budget. |
| **Gemini 3.1 Pro** | T-High | The **second** T-High stream in parallel with Fable: complex edge functions + RPC wiring (R-6 `admin-companies` v2, R-7 recruiter pipeline replacement), migration authoring when Fable is saturated, W2 live-verification analysis. | Trivial mechanical work. |
| **Sonnet** | T-Mid | Well-specified implementation with a clear verification step: R-1 ports, R-5 job-detail page, R-9 metrics, R-11 fan-out, R-13 bootstrap route, R-8 export UI, settings-page rebuild, W6, R-10 impersonation removal, W9 test authoring. | Novel security decisions, DDL authoring. |
| **Gemini Flash 3.5** | T-Mid-low | High-volume, low-ambiguity implementation: signup-form field removal (decision 3), CSS-module conversions, `loading.tsx`/`error.tsx` scaffolds, W10 decomposition mechanics, test-spec scaffolding. | Anything touching authz logic or schema. |
| **Haiku** | T-Low | Pure mechanical: grep censuses, orphan-tree + impersonation **deletions**, import/dead-code cleanup, file moves (Tree-B→A ports' mechanical half), checklist verification, `next build` runs. | Any judgment call. |

**Standing rule (all models):** never apply live DDL — the agent writes SQL, a **human** applies it. Never trust committed SQL as live state.

### 7.2 Task → model map

Legend: **Exec** = model that does the work in a parallel session · **Author** = Opus advisor writes the prompt for every row · **Review** = who checks the output doc before merge.

| Phase | Task | Exec model | Review | Isolation | Notes |
|---|---|---|---|---|---|
| 0 | W1 mock-auth 3-condition gate | **Fable 5** | Opus | — | tiny but pure-security; Fable authors, Opus reviews |
| 0 | R-1 port plans/billing/team/templates → Tree A | Sonnet | Opus | worktree | mechanical port |
| 0 | R-1 delete orphan trees + impersonation (route/page/banner/cookies) | **Haiku** | Sonnet | worktree | deletion + grep-verify only |
| 0 | R-1 sidebar rebuild (nav §3.2) | Flash 3.5 | Sonnet | worktree | well-specified list |
| 0 | R-2 `_shared/` kit (cors/query/idempotency/errors/adminAuth) | **Fable 5** | Opus | worktree | the security spine — highest authoring stakes |
| 0 | R-2 migrate kept fns onto the kit | Gemini 3.1 Pro | Fable 5 | worktree | 15 edge fns; T-High, Fable reviews |
| 0 | W2 live verification (RLS, exec_sql callers, metadata, email-update) | Gemini 3.1 Pro | Opus + **human** | — | report only; human runs live queries |
| 1 | 052 + 053 + 055 + 056 **SQL authoring** | **Fable 5** | Opus | — | DDL correctness; **human applies** |
| 1 | R-3 audit writers on every destructive path | **Fable 5** | Opus | — | compliance-critical authoring |
| 1 | R-4 RBAC matrix + `requiredPermission` + `requireStaff` enforcement | **Fable 5** | Opus | — | authz boundary; the one to get right |
| 1 | R-10 impersonation removal | Sonnet | Haiku (grep) | — | delete + confirm nothing references it |
| 1 | R-13 forgot-password route + timingSafeEqual + env cleanup | Sonnet | Fable 5 | worktree | security-adjacent; Fable reviews |
| 1 | OTP infra: invite / accept / email-change / reset-link endpoints | Gemini 3.1 Pro | Fable 5 | — | new auth surface; T-High exec, Fable review |
| 1 | Team page + accept-invite UI + OtpDialog | Sonnet | Opus | — | UI over the new endpoints |
| 1 | `admin-plans` / `admin-billing` fns + port pages | Sonnet | Opus | worktree | server boundary + port |
| 2 | 054 approval_status SQL | Gemini 3.1 Pro | Fable 5 | worktree | small DDL; **human applies** |
| 2 | R-6 `admin-companies` v2 + company detail page | Gemini 3.1 Pro | Opus | worktree | RPC wiring + GSTIN intake; T-High |
| 2 | R-7 recruiter pipeline replacement (edge fn) | Gemini 3.1 Pro | Fable 5 | worktree | deletes legacy, membership lifecycle |
| 2 | R-7 recruiter directory + drawer UI | Sonnet | Opus | worktree | absorbs W10 for this page |
| 2 | **Signup form alignment** (`RecruiterRegisterForm` + `recruiter-request`) | Flash 3.5 (form fields) + Sonnet (`recruiter-request` intake) | Opus | worktree | field removal is mechanical; intake rewrite is T-Mid |
| 2 | R-5 job detail page + approvals re-filter | Sonnet | Opus | worktree | UI + query change |
| 3 | R-8 `admin-export` server-side job | Sonnet | Opus | worktree | delete both browser blocks |
| 3 | R-9 metrics module (error-not-zero) | Sonnet | Opus | worktree | shared `_shared/metrics.ts` |
| 3 | R-11 fan-out → `notification_jobs` | Sonnet | Opus | worktree | queue wiring |
| 3 | Settings rebuild + proxy maintenance + signup flag enforcement | Sonnet | Fable 5 | — | ships with 056; Fable reviews the enforcement paths |
| 3 | W6 redirect/`/unauthorized`/`?reason=suspended` | Flash 3.5 | Sonnet | worktree | mechanical, well-specified |
| 3 | W10 decomposition (remaining oversized pages) | Flash 3.5 | Sonnet | worktree | pure refactor |
| 4 | Subdomain cutover (proxy gates, CORS allowlist, link absolutes) | Gemini 3.1 Pro | Opus + human | — | after doc-10 cookie fix; human does DNS/TLS |
| 5 | Email cutover runbook execution | — (human) | Opus | — | uses the Phase-1 flow; Opus supervises |
| 5 | W9 full authz regression suite | Sonnet | **Fable 5** | worktree | Fable does the final security review of coverage |
| all | grep censuses, checklist verification, `next build` | **Haiku** | Sonnet | — | cheap, mechanical, run often |

### 7.3 Efficiency rules for the fleet

1. **Fable is the bottleneck resource — spend it only on rows marked Fable, and front-load them (Phase 0–1).** If a Fable row and a Sonnet row are both ready, give Fable the Fable row and let Sonnet run in parallel; never let Fable idle on a queue while doing Sonnet-grade work.
2. **Two T-High streams max in parallel** (Fable + Gemini 3.1 Pro). Beyond that, Opus reviews become the bottleneck — queue, don't fan out wider.
3. **Haiku/Flash run wide and cheap** — deletions, scaffolds, censuses can all fan out simultaneously; they gate nothing security-critical.
4. **Every security/DDL row gets a different model as reviewer than authored it** (Fable authors → Opus reviews; Gemini exec → Fable reviews). No model reviews its own auth/DDL output.
5. **Opus stays the single advisor session** — one source of sequencing truth. Executors report back; Opus decides the next dispatch. Do not run two orchestrators.

---

## 8. Output review folder — `archive/agent-outputs/adminImplementation/`

Every executed task returns one markdown file the Opus advisor reads before the change is accepted. Location: `docs/archive/agent-outputs/adminImplementation/` (create at Phase 0 start).

**Filename:** `<phase>-<task-id>__<exec-model>.md` — e.g. `P0-R2-kit__fable5.md`, `P2-R7-recruiter-fn__gemini31pro.md`. One file per dispatched prompt; re-runs append `-v2`.

**Required sections in each output file** (the advisor prompt must ask the executor to produce these — keeps review fast and comparable):

```markdown
# <Task ID> — <title>   ·   model: <exec>   ·   phase: <n>   ·   date:

## Prompt given
<verbatim prompt Opus dispatched>

## What changed
- files touched (path — one-line why), each traceable to the task (CLAUDE.md §3 surgical rule)

## SQL authored (if any)
<full migration text — NOT applied; flagged for human apply>

## Verification run
<commands + results: next build, targeted test, grep proof for deletions>

## Deviations / assumptions
<anything the executor decided that the prompt didn't specify — the review focus>

## Open questions for the advisor
<blocking items, if any>
```

**Advisor review checklist per file** (Opus, before accept): changes trace to the task only (no scope creep); security/DDL rows reviewed by a *different* model than authored (§7.3 rule 4); verification actually ran (not asserted); deviations are acceptable or bounce back; DDL is marked human-apply, never self-applied. Accepted files stay in the folder as the implementation audit trail; a one-line index (`README.md` in that folder) tracks status per task (queued / running / returned / accepted).

**Why a folder and not just PR diffs:** parallel sessions across six models don't share a diff view; the output files are the common surface where the advisor compares approaches, catches an executor that misread scope, and keeps the "which model did what, and did it work" record you asked for.
