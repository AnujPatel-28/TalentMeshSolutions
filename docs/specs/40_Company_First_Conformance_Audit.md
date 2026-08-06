# 40 — Company-First Conformance Audit

**Scope:** Does the recruiter side implement the documented Company-First model (company is the
tenant, teammates share visibility) or is it recruiter-scoped (single-player)? Static source read +
live database inspection. No login was performed — no runtime/browser testing anywhere in this audit.

**Repo:** `tm-main`, branch `codex/fix-recruiter-sidebar-routing`, commit `e9fd1b4` (includes `2a42a4e`
routing fix). Live database queried directly via `insforge db query`.

Builds on, does not restate: `37_Recruiter_UI_Audit.md` (UI-only findings F-01…F-17), `39_Jobs_ATS_Implementation_Report.md`.

---

## 1. Verdict

**The recruiter side is recruiter-scoped, not Company-First, and the gap is deeper than doc 37 could
see.** Doc 37 found the *client code* filters most pages by `recruiter_id = user.id`. This audit went
one layer down, to the database, and found the failure has two genuinely different root causes that
require two different fixes:

- **Jobs, applications, and pipeline/candidate visibility** are already company-scoped at the RLS
  layer (`jobs_select_company`, `apps_company_view`, plus a legacy `recruiter_profiles`-joined
  policy that is *also* company-scoped). The client code adds an unnecessary, wrong
  `.eq('recruiter_id', user.id)` / `.eq('jobs.recruiter_id', user.id)` filter on top of a query that
  would otherwise return the whole company's data. **This is a pure front-end bug** — no migration
  needed, the database already permits the correct answer.
- **NVite, Offers, and Interviews are individually-scoped at the RLS layer itself** — there is no
  company-scoped policy on `nvites`, `offers`, or `interviews` at all, and none of the three tables
  even has a `company_id` column to scope by (only `job_id`/`recruiter_id`). Fixing the client query
  here does **nothing**: Postgres will still silently filter every row belonging to a teammate. **This
  requires new migrations** (RLS policies joining through `jobs.company_id`), not just a UI change.
- **Application-stage writes** are blocked below even the RLS layer: the `update_application_status`
  RPC hard-codes `p_actor_id = jobs.recruiter_id` with no company-admin/teammate branch at all
  (confirmed by reading the live function body). This is narrower than the `apps_company_update` RLS
  policy that would otherwise allow it — the documented drift in `app/api/applications/[id]/status/route.ts`
  is real, verified, and this audit found no other endpoint that reuses the same RPC, so its blast
  radius is exactly the one caller.
- **`company_members`/`member_role` is real at the schema and API layer (a fully working invite/
  list/patch/accept API exists, RLS-correct, with a last-admin guard) but is completely decorative on
  the client** — `RecruiterLayoutClient` receives `companyId`/`memberRole` from the server guard and
  discards both (never destructures them, never provides them via context). No sidebar section, no
  page, and no component reads `memberRole` anywhere in the recruiter tree. There is also **no
  recruiter-facing UI** to invite a teammate, view the roster, or change anyone's role — the only
  callers of the member-management API are two admin-portal files. A company admin cannot grow their
  own team without a platform-staff intervention.
- **Live data confirms this has never been exercised**: of the 3 companies that have any
  `company_members` row, every one has exactly 1 active member. Company-First has zero production
  test coverage.

**Is V1 shippable as a single-recruiter-per-company product if this gap is not closed?** Yes, with one
caveat: as long as every company that signs up has exactly one recruiter, none of these bugs are
visible — a lone recruiter's own `recruiter_id` filter always matches their own data, so the product
works correctly for the single-player case it accidentally implements. The moment a second recruiter
is added to any company (which the product's own "Team" concept, `company_members`, and the
`member_role` schema all assume is a supported, marketed feature), that teammate silently sees an
empty pipeline, empty interviews, empty offers, empty NVites, and gets a false 403 on every stage
change on a colleague's job. Shipping V1 single-recruiter-only is viable **only if the product is
explicitly marketed and gated that way** (e.g., block invites, hide the "Team" concept) — shipping it
as advertised multi-recruiter collaboration would be a shipped false claim.

---

## 2. The two-recruiter table

Scenario: Company has Recruiter A (posted the job, is `company_members.member_role='admin'` — first
member becomes admin per doc 07) and Recruiter B (teammate, `company_members.status='active'`,
`member_role='recruiter'`).

| Capability | What B can do today | What the spec says | Verdict |
|---|---|---|---|
| See the company's job list | Yes — `/jobs` calls `GET /api/jobs?scope=company`, which resolves B's own active membership and filters `jobs.company_id` (`app/api/jobs/route.ts:20-34`) | Yes | **Matches** |
| Open A's job detail page | Yes — no owner-gate on view since doc 39's fix; relies on RLS `jobs_select_company` (`app/dashboard/recruiter/[role_id]/jobs/[job_id]/page.tsx:55-59`) | Yes | **Matches** (fixed 2026-08-02) |
| Edit / publish / close A's job | No, correctly — B is a plain recruiter, not the job's `recruiter_id`, not company-admin; `jobs_update_company` RLS requires one of those (`PATCH /api/jobs/[jobId]`, `POST /publish`, `POST /close` all rely on this) | No (recruiters edit only their own; company-admin edits any) | **Matches** — if B *were* the company admin, RLS would allow it |
| See A's job's applicants in the job-detail applicants table | Yes — the query has no recruiter filter, relies on RLS `apps_company_view`/legacy company-scoped policy | Yes | **Matches** |
| Change an applicant's stage on A's job (from the job-detail dropdown) | **No — hard 403** for anyone but A, even if B is the company admin. `update_application_status` RPC checks `p_actor_id = jobs.recruiter_id` literally, no membership/role branch (verified from live `pg_get_functiondef`) | Yes for company-admin or the job's own recruiter (`apps_company_update` RLS) | **Mismatch — P0.** RPC change required, not a query fix |
| See A's applicants in **Pipeline** | **No** — `pipeline/page.tsx:36` filters `.eq('jobs.recruiter_id', user.id)`; RLS would return them if asked | Yes | **Mismatch — P0, client-only fix** (RLS already permits it) |
| See A's applicants in **Candidates → Shortlisted/On Hold/Saved/Rejected** | **No** — `candidates/page.tsx:102,116,123,172,204,255`, `candidates/saved/page.tsx:21`, `candidates/shortlisted/page.tsx:20-21` all filter by B's own id | Yes | **Mismatch — P0, client-only fix** |
| See interviews A scheduled | **No** — RLS itself (`"Interviews access"` policy) is `candidate_id = uid OR recruiter_id = uid`; no company clause exists at any layer | Yes | **Mismatch — P0, requires new migration** (no company-scoped RLS exists to fall back on) |
| See offers A sent | **No** — same: RLS `offers_select_recruiter` is individually-scoped, no company policy exists | Yes | **Mismatch — P0, requires new migration** |
| See NVites A sent | **No** — same: RLS `nvites_select_recruiter` is individually-scoped, no company policy exists | Yes | **Mismatch — P0, requires new migration** |
| Browse the general candidate database ("All Candidates" tab) | Yes — the `candidates` edge function is platform-wide, not scoped to any company (by design — it's talent search, not "my applicants") | N/A (not a company-scoped feature) | **Matches intent** |
| Invite a third recruiter C | **No UI at all**, even though B is the company admin — no invite form exists anywhere in the recruiter portal. The backing API (`POST /api/company/[companyId]/members/invite`) and RLS already support it | Yes (doc 07 "Team management") | **Mismatch — P1, UI-only gap** (backend is done) |
| View the company roster | **No UI** — `GET /api/company/[companyId]/members` exists and works but nothing in the recruiter tree calls it | Yes | **Mismatch — P1, UI-only gap** |
| See a "Team" settings tab reflecting role | **No** — `settings/page.tsx`'s `activeTab` union still lists `'team'` but no tab button or content branch exists (dead type member, doc 37 F-16) | Yes | **Mismatch — P2** |
| See real company-wide analytics on Reports | No — page is 100% hardcoded static numbers regardless of company or recruiter (doc 37 F-02, unchanged) | Yes | **Mismatch — pre-existing, not new** |

---

## 3. Scoping inventory

Legend: **DB-backed** = RLS on the underlying table/view already allows company-wide access, so the
narrow client filter is the only thing wrong. **DB-blocked** = RLS itself is individually scoped, so
a client fix alone changes nothing.

| Feature | File:line | Current scope (as coded) | Required scope | RLS reality |
|---|---|---|---|---|
| Jobs list | `app/api/jobs/route.ts:20-34` | `company_id = <caller's active membership>` | Company | Already company-scoped by design (correct) |
| Jobs create | `app/api/jobs/route.ts:61` → `create_job()` RPC | Derives `company_id`/`recruiter_id` server-side from `authz.company_id_of(uid)` | Company | Correct |
| Job edit/publish/close | `app/api/jobs/[jobId]/route.ts:29`, `publish/route.ts:21-24`, `close/route.ts:19-22` | Direct write, RLS-enforced | Company-admin or job's own recruiter | `jobs_update_company` — correct, matches spec |
| Job detail view | `app/dashboard/recruiter/[role_id]/jobs/[job_id]/page.tsx:55-59` | `.eq('id', job_id)`, no owner filter | Company | **DB-backed**, fixed |
| Job detail — stage update | `app/dashboard/recruiter/[role_id]/jobs/[job_id]/page.tsx:75,121` (UI gate) + `app/api/applications/[id]/status/route.ts:24-29` (RPC call) | UI disables control unless `job.recruiter_id === user.id`; RPC hard-enforces the same | Company-admin or job's own recruiter | **DB-blocked** — `update_application_status` RPC has no company-admin branch |
| Job-title autocomplete (minor) | `app/dashboard/recruiter/[role_id]/jobs/post-job/page.tsx:261` | `.eq('recruiter_id', user.id)` | Company (past titles across the team) | DB-backed (jobs RLS is company-scoped) but low severity — cosmetic suggestion list only |
| Applications list API | `app/api/applications/route.ts:17-21` | `.eq('job_id', ...)`, relies on RLS | Company | `apps_company_view` — correct |
| Pipeline | `app/dashboard/recruiter/[role_id]/pipeline/page.tsx:36,110` | `.eq('jobs.recruiter_id', user.id)` | Company | **DB-backed**, client-only bug |
| Candidates — Shortlisted/On Hold/Saved/Rejected counts + lists | `app/dashboard/recruiter/[role_id]/candidates/page.tsx:81,88,95,102,116,123,172,204,255` | `.eq('recruiter_id'\|'jobs.recruiter_id', user.id)` | Company | **DB-backed**, client-only bug |
| Candidates — save/shortlist insert | `app/dashboard/recruiter/[role_id]/candidates/page.tsx:270` | `insert({ recruiter_id: user.id, ... })` | Individual (who tagged it) is arguably correct to keep as the actor, but the **read side** must still be company-wide | N/A (insert) |
| Candidates → Saved tab | `app/dashboard/recruiter/[role_id]/candidates/saved/page.tsx:21,49` | `.eq('recruiter_id', user.id)` | Company | **DB-backed**, client-only bug |
| Candidates → Shortlisted tab | `app/dashboard/recruiter/[role_id]/candidates/shortlisted/page.tsx:20-21` | `.eq('jobs.recruiter_id', user.id)` | Company | **DB-backed**, client-only bug |
| Candidates → search / browse | `app/dashboard/recruiter/[role_id]/candidates/search/page.tsx:87` → `candidates` edge fn | Platform-wide, not company-gated | N/A — correct as talent search, not "my/our applicants" | N/A |
| Home dashboard "Applications Queue" widget | `app/dashboard/recruiter/[role_id]/page.tsx:59-63,88` | `.eq('job.recruiter_id'\|'recruiter_id', authUser.id)` | Company | **DB-backed**, client-only bug (also has the known alias-filter 400 risk per doc 37 §4) |
| Interviews list | `app/dashboard/recruiter/[role_id]/interviews/page.tsx:374` | `.eq('recruiter_id', authUser.id)` | Company | **DB-blocked** — `"Interviews access"` RLS is `candidate_id=uid OR recruiter_id=uid` only, no company clause, no `company_id` column on the table |
| Interview detail | `app/dashboard/recruiter/[role_id]/interviews/[interview_id]/page.tsx:114-178` | `.eq('id', interview_id)` only — relies entirely on RLS | Company | **DB-blocked** — same RLS gap; B gets a null/empty result opening a colleague's interview directly |
| Interview create | `app/dashboard/recruiter/[role_id]/interviews/page.tsx:129` | `recruiter_id: recruiterId` (self) | Individual actor is fine; visibility (above) is the bug | N/A (insert) |
| Offers list | `app/dashboard/recruiter/[role_id]/offers/page.tsx:32` | `.eq('recruiter_id', user.id)` | Company | **DB-blocked** — `offers_select_recruiter` RLS is individually-scoped, no company policy, no `company_id` column |
| NVite inbox | `app/dashboard/recruiter/[role_id]/nvite/page.tsx:34` | `.eq('recruiter_id', user.id)` | Company | **DB-blocked** — `nvites_select_recruiter` RLS is individually-scoped, no company policy, no `company_id` column |
| NVite compose | `app/dashboard/recruiter/[role_id]/nvite/compose/page.tsx:44,88,120` | Reads/writes scoped to `user.id` | Individual actor for insert is fine; read-back (nvite/page.tsx) is the bug above | N/A |
| Jobs — drafts/published/expired | `app/dashboard/recruiter/[role_id]/jobs/{drafts,published,expired}/page.tsx` | **Fixed** — now plain redirects to `/jobs?tab=...` (company-scoped) per doc 39 | Company | Resolved, not re-flagging doc 37's F-13 for these three |
| Company profile read | `app/api/company/[companyId]/route.ts:36-51` | Own active/invited/suspended membership, `company_id` must match URL | Company (self) | Correct |
| Company profile write | `app/api/company/[companyId]/route.ts:72-95` | `member_role === 'admin'` required, then RLS | Company-admin only | `companies_admin_write` — correct (see §6 for a stale comment about this) |
| Company roster read | `app/api/company/[companyId]/members/route.ts:9-25` | Any active member of that company, `company_id` from URL | Company (any member) | `company_members_read_own_company` — correct |
| Invite a member | `app/api/company/[companyId]/members/invite/route.ts:73-113` | Caller must be `member_role='admin'` of that company | Company-admin only | `company_members_admin_write` — correct, **but zero recruiter-portal UI calls this endpoint** |
| Update/suspend/remove a member | `app/api/company/[companyId]/members/[userId]/route.ts:67-111` | Same admin-only check + last-admin guard trigger | Company-admin only | Correct, **zero recruiter-portal UI calls this endpoint** — only `app/dashboard/admin/recruiters/_components/MembershipActions.tsx` and `app/dashboard/admin/companies/[id]/page.tsx` do |
| Accept invite | `app/api/company/[companyId]/members/accept/route.ts:84-102` | Self, via `accept_company_invite` RPC | Self | Correct |
| Reports/Analytics | `app/dashboard/recruiter/[role_id]/reports/page.tsx` | 100% static constants, no scope of any kind | Company | Pre-existing (doc 37 F-02), unchanged, not re-scored here |

---

## 4. Layer disagreement table

| Data | RLS says | RPC says | API route says | Layout guard says | Net effect |
|---|---|---|---|---|---|
| Applications view | Company-wide (`apps_company_view`, plus a company-scoped legacy policy via `recruiter_profiles.company_id`) | N/A (no RPC gates reads) | `allowedRoles: ['recruiter']`, no extra narrowing (`/api/applications`) | N/A | **DB and API agree (company); only the client UI queries disagree, narrowing to self** |
| Application stage write | Company-wide for admin/recruiter (`apps_company_update`) | **Individual-owner-only** (`p_actor_id = jobs.recruiter_id`, no company-admin branch) | `allowedRoles: ['recruiter']`, delegates entirely to the RPC | N/A | **RPC is stricter than RLS — a company admin who isn't the job's own recruiter is denied by the RPC even though RLS would allow it.** This is the documented drift, confirmed live. |
| Jobs edit/publish/close | Company-admin OR job's own recruiter (`jobs_update_company`) | N/A (direct writes) | `allowedRoles: ['recruiter']`, no extra narrowing | N/A | **All layers agree** |
| NVite / Offers / Interviews | **Individual only** — no company policy exists at the DB layer at all | N/A | No dedicated API route — pages hit `insforge.database` directly from the client | Layout guard resolves `companyId`/`memberRole` but never reaches these pages (discarded, §5) | **RLS is the strictest and only real gate — it is stricter than the documented spec, and no other layer compensates** |
| Company profile write | Company-admin only via `authz.is_company_admin`/`admin_company_id_of` (membership-based) | `approve_company_verification` et al. are separate, admin(platform)-only RPCs, not implicated here | Pre-checks `member_role === 'admin'` before attempting the write | N/A | **All layers agree** (see §6 — a code *comment* claims otherwise but is stale) |
| Recruiter portal access | `company_members_read_self`/`company_members_read_own_company` back the reads the guard performs | N/A | N/A | `app/dashboard/recruiter/[role_id]/layout.tsx:30-51` — requires active membership + verified company | **All layers agree; this guard is correctly implemented per doc 06** |

---

## 5. Findings (most severe first)

### G-01 — P0 — RLS itself has no company-scoped path for NVite, Offers, or Interviews
**Evidence (live `pg_policies`):**
```
nvites      | nvites_select_recruiter     | SELECT | (recruiter_id = ( SELECT auth.uid()))
offers      | offers_select_recruiter     | SELECT | (recruiter_id = ( SELECT auth.uid()))
interviews  | "Interviews access"         | SELECT | (candidate_id = uid OR recruiter_id = uid)
```
None of the three tables has a `company_id` column (confirmed via `information_schema.columns`) —
there is no join target for a company-scoped policy to even reference today.

**Why it matters:** This is qualitatively worse than the client-code bugs doc 37 found. Fixing
`nvite/page.tsx`, `offers/page.tsx`, or `interviews/page.tsx` to stop filtering by `recruiter_id`
changes nothing — Postgres RLS will still silently return zero rows for a teammate's data, because
there is no policy that would allow it even if asked for. Any fix here requires new DDL, not a
one-line query edit.

**Risk:** P0 (blocks the collaboration feature at the deepest possible layer; silent, not an error).
**Fix:** Migration adding `company_id` (or an RLS policy that joins through `jobs.company_id`) plus a
new `*_select_company`/`*_update_company` policy pair on each of the three tables, modeled on
`apps_company_view`/`apps_company_update`. See §7.

---

### G-02 — P0 — `update_application_status` RPC has no company-admin/teammate branch
**File:** live function body of `public.update_application_status` (verified via
`pg_get_functiondef`); called from `app/api/applications/[id]/status/route.ts:24-29`.

**Evidence:**
```sql
IF p_actor_type = 'recruiter' THEN
  IF p_actor_id IS DISTINCT FROM v_recruiter_id THEN
    RAISE EXCEPTION 'Access Denied: Recruiter does not own the job for this application.';
  END IF;
```
`v_recruiter_id` is read straight from `jobs.recruiter_id` — there is no lookup against
`company_members`/`authz.company_role` anywhere in the function.

**Why it matters:** The `apps_company_update` RLS policy (correctly) allows any active company-admin
or company-recruiter to update an application on any of the company's jobs. This RPC is the **only**
write path the API exposes (per the file's own comment) and is strictly narrower — a company admin
managing their team's pipeline gets a hard 403 on any job they didn't personally post. The existing
comment in the route file already flags this as known drift; this audit independently reproduced it
by reading the live function definition, confirming the comment is accurate and current.

**Risk:** P0 (breaks the single most common "manager reviews team's applicants" action).
**Fix:** Add a company-scope branch to the RPC's recruiter check: allow when
`p_actor_id = v_recruiter_id` **OR** `authz.company_role(p_actor_id, jobs.company_id) IN ('admin','recruiter')`.
See §7.

---

### G-03 — P0 — `company_members`/`memberRole` is resolved server-side and then thrown away
**File:** `app/dashboard/recruiter/[role_id]/RecruiterLayoutClient.tsx:16-26`.

**Evidence:**
```tsx
export default function RecruiterLayoutClient({ children }: {
    children: React.ReactNode;
    companyId: string;
    memberRole: string;
}) {
    return (
        <GlobalErrorBoundary>
            {children}
        </GlobalErrorBoundary>
    );
}
```
The function signature destructures only `{ children }` — `companyId` and `memberRole`, computed
correctly and expensively by `layout.tsx`'s two DB round-trips, are passed as props and never used:
not rendered, not put in context, not forwarded to any child. `grep -rn "memberRole"` across
`components/dashboard/OpsDarkSidebarShell.tsx` and every page under
`app/dashboard/recruiter/[role_id]/` returns zero hits outside this one file's own type annotation.

**Why it matters:** Doc 06 states "`*` company-admin-only sections hidden via
`company_members.member_role`." That gating does not exist anywhere in the code — every recruiter,
regardless of role (`admin`/`recruiter`/`coordinator`), sees an identical sidebar and identical
pages. There is no way for the UI to even ask "am I the company admin?" without a page re-deriving it
itself via a fresh query (which several pages already do inconsistently, e.g. `settings/page.tsx`).

**Risk:** P0 (the entire role-based UI differentiation the architecture promises does not exist; it
also means any future "admin-only" UI added naively has no existing plumbing to gate on).
**Fix:** Thread `companyId`/`memberRole` through a small React context provided by
`RecruiterLayoutClient`; gate sidebar sections and settings tabs on it.

---

### G-04 — P0 — No recruiter-facing UI to invite, list, or manage teammates, despite a complete backend
**Files:** `app/api/company/[companyId]/members/route.ts`, `.../invite/route.ts`, `.../[userId]/route.ts`,
`.../accept/route.ts` all exist, are RLS-correct, and are audit-logged. `grep` for any call to
`members/invite`, `members/[id]` PATCH, or the roster GET outside `app/api/` and `app/dashboard/admin/`
returns **zero** matches.

**Why it matters:** The schema (`company_members`), the RLS (`company_members_admin_write`,
`company_members_read_own_company`), the last-admin guard trigger, and the full REST surface for team
management are all built and correct. The only missing piece is a page. Without it, the only way a
company ever gets a second member is a platform-staff (admin portal) intervention — confirmed live:
every company in production has exactly 1 active member. Company-First is architecturally real but
operationally unreachable by an actual recruiter.

**Risk:** P0 for the product claim ("teammates collaborate"); P2 for security (nothing is exposed
insecurely, it's simply unbuilt).
**Fix:** Build the "Team" settings tab already reserved as a dead type value in
`app/dashboard/recruiter/[role_id]/settings/page.tsx:24` (`'team'` is in the `activeTab` union with no
button or content branch) calling the three existing endpoints. No backend work needed.

---

### G-05 — P0 (restated/verified, not new) — Client queries narrower than RLS for Pipeline, Candidates, home dashboard
**Files:** `pipeline/page.tsx:36,110`; `candidates/page.tsx:81,88,95,102,116,123,172,204,255`;
`candidates/saved/page.tsx:21,49`; `candidates/shortlisted/page.tsx:20-21`; `page.tsx:59-63,88` (home
dashboard queue).

**Evidence:** all filter `.eq('recruiter_id', user.id)` or `.eq('jobs.recruiter_id', user.id)` against
tables (`applications`) whose live RLS (`apps_company_view`) already permits company-wide reads (§3,
§4). This is the exact class doc 37 flagged as F-05; this audit's contribution is confirming via live
`pg_policies` that **RLS is not the reason** — these five surfaces need only a query change (drop the
recruiter filter, or replace it with the company-scoped equivalent), no migration.

**Risk:** P0 (silent wrong answer — a recruiter believes they see the full pipeline/candidate pool and
don't).
**Fix:** Remove the individual filter; company scope is already available via the same
`company_members` lookup the layout guard performs (or via `companyId` from context, once G-03 is
fixed).

---

### G-06 — P1 — `candidates` edge function's AI-match score is fabricated (`Math.random()`), same defect as doc 37 F-03, now confirmed at a second call site
**File:** `insforge/functions/candidates/index.ts:173`.
```ts
match: c.ai_match_score || (85 + Math.floor(Math.random() * 15)),
```
Doc 37 listed "whether the `candidates` edge function returns a genuine computed match score" as
**could not verify**. This audit read the function: it does not — it is the identical fabrication
pattern as the client-side `candidates/page.tsx` occurrence doc 37 already flagged as F-03. Not a
scoping bug (this function is intentionally platform-wide, not company-scoped — see §3), but it
resolves doc 37's open question with a concrete "confirmed fabricated."
**Risk:** P1 (same class as already-P0-flagged F-03; not re-scored to avoid double-counting doc 37).
**Fix:** Same as F-03 — render "Not scored" when `ai_match_score` is null.

---

### G-07 — P3 — Stale code comment describes a since-fixed RLS gap as open
**File:** `app/api/company/[companyId]/route.ts:54-62`.

**Evidence:** The comment says live `companies_owner_write` RLS is `created_by = auth.uid()` and
flags a "P1 RLS fix" as still needed for admins who joined via invite rather than founding the
company. Live `pg_policies` shows the actual current policy is `companies_admin_write` with
`USING (id = authz.admin_company_id_of(uid))`, and `authz.admin_company_id_of` resolves via
`company_members` membership (`member_role='admin'`, `status IN ('invited','active')`) — **not**
`created_by`. The policy this comment warns about no longer exists; a different, correct one already
replaced it (out-of-band, undocumented in this doc set).
**Why it matters:** Low severity today (the code's own pre-check already independently requires
`member_role === 'admin'`, so behavior is correct), but the stale comment could cause a future
engineer to "fix" a bug that no longer exists, or to distrust a control that is actually sound.
**Risk:** P3 (documentation/comment hygiene only).
**Fix:** Update or remove the comment; no code change required.

---

## 6. Doc vs. code divergences

| Doc claim | Source | What the code/DB actually does | Which is right |
|---|---|---|---|
| "Recruiter A and Recruiter B in the same company both see all company jobs and applicants (RLS `jobs_select_company`, `apps_company_view`)" | `06_Recruiter_Portal_Architecture.md` §"Collaboration rules" | Jobs and Applications RLS **does** implement exactly this (verified live). Client code for Pipeline/Candidates/home-queue ignores it (G-05). Interviews/Offers/NVite have **no such RLS at all** (G-01). | **Doc is right about jobs/applications RLS; code fails to use it. Doc is silent on NVite/Offers/Interviews needing the same treatment — that gap was never designed, not just unbuilt.** |
| "`*` company-admin-only sections hidden via `company_members.member_role`" | same doc, §"Information architecture" | `memberRole` is discarded by `RecruiterLayoutClient` (G-03); no gating exists anywhere | **Doc describes intent; code never implemented it.** |
| "Team* → .../settings/team (company-admin only)" | same doc, §"Information architecture" | No `team` tab exists; the type union has a dead `'team'` value (doc 37 F-16) | **Doc is right that this should exist; it does not.** |
| "Company admins may read their own company's verification requests + submit" / team management via RLS | `02_Schema_And_Database_Design.md` migration 047-048, `07_Company_Management_Architecture.md` §"Team management" | The RLS and RPCs described are live and correct (verified: `company_members_admin_write`, `company_members_read_own_company`, `guard_last_company_admin` trigger all exist and match the doc's SQL closely) | **Doc and DB agree — this part of doc 02/07 is accurate and implemented.** Only the UI to exercise it is missing (G-04). |
| "`companies_owner_write` ... `created_by = auth.uid()`" as the live write policy | `02_Schema_And_Database_Design.md` migration 046 (marked "interim owner write (superseded by 050 jobs/members scoping)") + stale code comment in `app/api/company/[companyId]/route.ts` | Live policy is `companies_admin_write` keyed off `company_members` admin status, not `created_by` — the "superseded by 050" note in doc 02 turned out true; the interim policy is gone | **Doc 02 correctly predicted its own policy would be superseded; the code comment (G-07) just never got the memo.** |
| "V1 is a standard ATS, not an AI ATS" and AI features are out of scope | doc 39, and audit-brief instruction | The `candidates` edge function still fabricates an `ai_match_score` with `Math.random()` (G-06) — this predates and is unrelated to the V1 ATS work; it's leftover from before the AI-scope decision | **Not a contradiction of the "no AI in V1" decision — this is dead fabricated code that should have been removed when that decision was made, not a new AI feature.** |

---

## 7. Migration/RPC changes required

Listed precisely; no SQL written per instructions.

1. **New RLS policies on `nvites`** — add `nvites_select_company` (SELECT) and, if teammates should
   be able to act on each other's NVites (e.g. mark responded), `nvites_update_company` (UPDATE),
   both scoped via `EXISTS (SELECT 1 FROM jobs j WHERE j.id = nvites.job_id AND j.company_id =
   authz.company_id_of(auth.uid()))`. Keep the existing `nvites_select_recruiter`/`_update_recruiter`
   policies (RLS policies OR together, so this is additive, not a replacement). Add a covering index
   on `nvites.job_id` if one does not already exist.
2. **New RLS policies on `offers`** — identical shape: `offers_select_company` (SELECT) joined through
   `offers.job_id → jobs.company_id`; decide whether `offers_update_company` should require
   `authz.company_role(...) IN ('admin','recruiter')` (mirroring `apps_company_update`) before any
   teammate can change an offer's status, or restrict updates to company-admin only given offers are
   financially sensitive — this is a product decision, not just a schema one.
3. **New RLS policies on `interviews`** — identical shape, joined through `interviews.job_id →
   jobs.company_id`; also decide the same admin-vs-recruiter update question as above (interview
   feedback/reschedule).
4. **`update_application_status` RPC change** — in the `p_actor_type = 'recruiter'` branch, replace
   the single equality check `p_actor_id IS DISTINCT FROM v_recruiter_id` with: allow when
   `p_actor_id = v_recruiter_id` **OR** `authz.company_role(p_actor_id, v_company_id) IN
   ('admin','recruiter')`, where `v_company_id` is fetched alongside `v_recruiter_id` in the existing
   lookup query (add `j.company_id` to the `SELECT ... INTO` list at the top of the function). This
   brings the RPC in line with the `apps_company_update` RLS policy it currently contradicts.
5. **No DDL for Pipeline/Candidates/home-dashboard queue** — these are pure application-code changes
   (remove the `recruiter_id` filter; scope by the caller's company membership instead), since
   `apps_company_view` already permits the read. Not listed as a migration.
6. **No DDL for company/member management** — the schema, RLS, RPCs, and API routes already fully
   support invite/list/role-change/last-admin-guard. This is a UI-only gap (a settings "Team" tab
   calling the three existing endpoints).

---

## 8. Could not verify

- **All runtime/authenticated behavior.** No login was performed anywhere in this audit (per the
  audit's own rules) — every RLS/RPC/query finding above is from reading live `pg_policies` /
  `pg_get_functiondef` output and static source, not from an observed HTTP response or an actual
  two-recruiter session. In particular, the two-recruiter table (§2) is a logical derivation from the
  RLS/RPC/route source, not an observed test — no company in the live database currently has a second
  active member to test against (verified: max 1 active member per company across all 3 companies
  with any `company_members` rows).
- **Whether teammate B's "denied" experiences above surface as silent empty states vs. visible errors
  in the UI.** The RLS/RPC layer's behavior (empty result set for a blocked SELECT, `403`/exception
  for a blocked write) is confirmed; how each specific page's error/loading/empty-state code reacts to
  that was not separately re-audited page by page beyond what doc 37 already covered.
- **The `Messages` inbox and `NotificationCenter` component's data scoping** — out of scope for this
  audit's brief (not in the "what to check" list) and previously flagged by doc 37 as not audited in
  depth; not re-examined here.
- **Whether `offers`/`interviews` teammate UPDATE access is even a desired behavior** (vs. company-admin-only,
  given these are financially/legally sensitive documents) — flagged as a product decision in §7,
  not something the codebase or docs currently answer either way.
- **`insforge/functions/` beyond the `candidates` function** — the rest of the edge-function layer
  (e.g., whatever backs `notifications`, `messages`) was not read; doc 36 covers edge functions
  generally but this audit only opened `candidates/index.ts` because it was directly implicated in the
  scoping question.
- **Whether the legacy `"Recruiters can update application status"` / `"Recruiters can view job
  applications"` policies on `applications` (joined through `recruiter_profiles.company_id`) are
  live-correct** — they resolve to company scope in principle (same `recruiter_profiles.company_id`
  used elsewhere in this codebase is known from prior session notes to be sparsely populated/legacy),
  but this audit did not cross-check every one of the 5 live `recruiter_profiles` rows against its
  corresponding `company_members` row for consistency; both the legacy and new policies are additive
  (OR'ed), so any gap in the legacy one is masked by `apps_company_view`/`apps_company_update` as long
  as `company_members` is populated, which it is for the 3 live companies checked.

---

## References

Live database objects read via `insforge db query`: `pg_policies` (jobs, applications, companies,
company_members, nvites, offers, interviews), `information_schema.columns` (companies,
company_members, nvites, offers, interviews), `pg_proc`/`pg_get_functiondef` (`update_application_status`,
`create_job`, `authz.company_id_of`, `authz.company_role`, `authz.is_company_admin`,
`authz.admin_company_id_of`), row counts/samples (`jobs`, `recruiter_profiles`, `company_members`).

Source files read in full or substantially: `proxy.ts` (recruiter routing section);
`app/dashboard/recruiter/[role_id]/{layout.tsx,RecruiterLayoutClient.tsx,page.tsx,jobs/[job_id]/page.tsx,
jobs/{post-job,drafts,published,expired}/page.tsx,pipeline/page.tsx,nvite/{page.tsx,compose/page.tsx},
offers/page.tsx,interviews/{page.tsx,[interview_id]/page.tsx},candidates/{page.tsx,saved/page.tsx,
shortlisted/page.tsx,search/page.tsx},settings/page.tsx}`;
`app/api/{jobs/route.ts,jobs/[jobId]/{route.ts,publish/route.ts,close/route.ts},applications/route.ts,
applications/[id]/status/route.ts,company/[companyId]/{route.ts,members/route.ts,members/invite/route.ts,
members/[userId]/route.ts,members/accept/route.ts}}`;
`app/dashboard/admin/recruiters/_components/MembershipActions.tsx`;
`insforge/functions/candidates/index.ts`;
`docs/specs/{02_Schema_And_Database_Design.md,
06_Recruiter_Portal_Architecture.md,07_Company_Management_Architecture.md,37_Recruiter_UI_Audit.md,
39_Jobs_ATS_Implementation_Report.md}`.

---

## Addendum — merged from the parallel alignment audit (2026-08-02)

Source: `docs/auditReportDoc/recruiter-company-first-alignment-audit-2026-08-02.md`. Kept as a
separate document. The items below are the ones this report did not already cover; each was
re-verified against the live database before being merged.

### A-1 · P0 — `pending-approval` polls the retired `recruiter_profiles.is_approved`

**Evidence.** `app/dashboard/recruiter/[role_id]/pending-approval/page.tsx:24-29`:

```ts
.from('recruiter_profiles')
.select('is_approved')
...
if (data?.is_approved) { /* release to dashboard */ }
```

Approval does not write that column. It writes `company_members.status = 'active'` and
`companies.status = 'verified'` — the same source of truth `app/dashboard/recruiter/[role_id]/layout.tsx`
already uses.

**Live data, 2026-08-02:**

| profiles.role='recruiter' | recruiter_profiles rows | is_approved=true | company_members active |
|---|---|---|---|
| 27 | 5 | 5 | 3 |

**Why it matters.** 22 of 27 recruiters have no `recruiter_profiles` row at all, so the poll reads
null forever and an approved recruiter is never released from the waiting screen. The mismatch also
runs the other way — 5 rows say `is_approved` while only 3 memberships are active — so the legacy
table both under- and over-reports. This is the same failure shape as the recruiter onboarding trap,
and it sits in the V1 path: setup → pending-approval → dashboard.

**Fix.** Poll `GET /api/recruiter/status`, which already returns membership + company + verification
state. Release only when membership is `active` **and** company is `verified`. Make no authorization
decision from `recruiter_profiles`.

**Deploy priority:** P0 — blocks V1 regardless of the single-recruiter decision.

### A-2 · P1 — broken `/recruiter/nvite/compose` links

Independently found by doc 37. Callers: `candidates/page.tsx`, `candidates/search/page.tsx`,
`components/recruiter/CandidateProfileDrawer.tsx`. Moot if NVite is cut from V1 (see §V1 scope) —
the links should be removed with the feature rather than repaired.

### A-3 · P2 — the alternate recruiter route trees are now fully dead

`proxy.ts` no longer rewrites anything into `app/company/[companyId]/recruiter/[recruiterId]/`
(commit `2a42a4e`). `app/portals/app/company/[companyId]/recruiter/[recruiterId]/layout.tsx` is a
client-side guard reading `recruiter_profiles` — a second, weaker authorization implementation with
no remaining entry point. Delete both trees once `rg` confirms no inbound links.

### A-4 · P2 — settings still calls the `recruiter-profile` / `company-profile` edge functions

Company identity and team management should go through `/api/company/[companyId]` and
`/api/company/[companyId]/members*`, which already exist and are correct. Defer with the Team UI.

### A-5 · P3 — `lib/queries/queryKeys.ts` lacks `recruiter` / `company` namespaces

Cosmetic until reads are consolidated. Not a V1 item.

### Not merged

R-03 (owner scope → company scope) and R-07 (fabricated metrics) are already covered above and in
doc 37 with more specific evidence. R-08 (legacy edge-function inventory) overlaps doc 36.
