# 41 — V1 Scope Lock and V2 Plan

**Date:** 2026-08-02 · **Status:** decided · Supersedes the scope assumptions in docs 06 and 39.
Evidence: doc 40 (company-first conformance), doc 37 (recruiter UI audit), doc 36 (edge-function sweep).

---

## 1. The decision

**V1 is a single-recruiter-per-company ATS. No AI. No interview scheduling.**

Company-First stays the target architecture — it is not abandoned, it is sequenced. V1 ships the
loop that already works and defers the three features whose data model was never built.

### Why single-recruiter is safe to ship

Every production company has exactly **one** active member. Company-First has never actually run.
Shipping single-recruiter is not a regression — it is naming what is already true. The risk is only
that a second member silently sees empty screens, so **the team-invite path stays closed in V1**.

---

## 2. What ships in V1

| Capability | State |
|---|---|
| Post, edit, publish, expire, delete a job | Working |
| Job list with drafts / published / expired tabs | Working |
| Job templates (static, prefill the post-job form) | Working |
| Per-job applicants table | Built in doc 39 |
| Pipeline Kanban — 7 stages, drag to move | Working |
| Candidate profile drawer, saved candidates | Working |
| Company registration → admin approval → dashboard | Working |
| Settings, company profile | Working |

The V1 loop end to end: **post a job → application arrives → open the job → see applicants → move
them through stages → hired.** That is a complete ATS.

---

## 3. What is cut, and why

### Cut to v1.1: NVite, Offers Manager, Interviews

The evidence, measured against the live database on 2026-08-02:

| Table | Rows ever | Company-scoped RLS | `company_id` column |
|---|---|---|---|
| `nvites` | **0** | none | absent |
| `offers` | **0** | none | absent |
| `interviews` | **0** | none | absent |
| `applications` | 36 | `apps_company_view` / `apps_company_update` | present |
| `jobs` | 5 | `jobs_select_company` / `_update_` / `_delete_` | present |

Three features, never used once — and they are **exactly** the three tables that would need a
migration to become company-scoped. Cutting them removes the entire migration burden from V1.

Nothing is lost from the hiring funnel: the pipeline already carries `interviewing`, `offered` and
`hired` stages, so a recruiter still records the full outcome. What is deferred is offer-letter
generation, outbound invitations, and interview scheduling.

- **NVite** is outbound sourcing, not applicant tracking. It belongs with v2.0 AI sourcing.
- **Offers Manager** is document generation. The `offered` stage covers the state.
- **Interviews** is deferred deliberately so it can be built once, with Google Meet, in v2.0.
  **This is the one real tradeoff:** V1 has no in-product interview scheduling. Recruiters schedule
  over email or their own calendar. Accepted knowingly — building a scheduler now that v2.0 replaces
  is waste.

**Implementation:** nav entries and the candidate-surface NVite buttons are removed. **Routes and
tables are left in place.** Zero rows means nothing to migrate or preserve, and v1.1 restores the
way in rather than rebuilding the feature.

### Already cut

- **Smart Sourcing** — nav category pointing at `/sourcing` and `/sourcing/search`, which never
  existed. AI feature. Removed.
- **Recruiter onboarding steps** `interests` and `documents` — already unreachable dead code.
  Removed; `completed_onboarding` is set by the setup form.

---

## 4. Company-First: the four layers, and where each lands

Doc 40 established that the gap is not one problem but four, at different layers.

| Layer | What | V1 | Notes |
|---|---|---|---|
| **1** | Client queries add a redundant `recruiter_id = self` on top of RLS that is *already* company-scoped | **Done** | Pure front-end. No migration. Jobs, applications, pipeline, candidates. |
| **2** | `nvites` / `offers` / `interviews` have no company scope and no `company_id` | **Removed from scope** | Cut with the features. Returns in v1.1. |
| **3** | `update_application_status` RPC hard-codes `p_actor_id = jobs.recruiter_id` | **v1.1** | Invisible while there is one recruiter per company. |
| **4** | Team invite UI absent (the four `/api/company/[companyId]/members*` routes already exist and are correct) | **v2.0, paid** | Becomes a pricing lever, not debt. |

Layer 1 was safe to do now because the policies genuinely scope by company —
`jobs_select_company` is `company_id = authz.company_id_of(auth.uid())` and `apps_company_view`
joins through `jobs.company_id`. Removing the client filter narrows nothing; RLS remains the
boundary. Under one member per company the visible result is identical, and when a second member is
added, jobs/applications/pipeline/candidates already work.

`saved_candidates` filters were **kept** — a saved candidate is a personal bookmark, not company
data.

---

## 5. V2 plan

### v1.1 — multi-recruiter (no new product surface)
1. Add company scope to `nvites`, `offers`, `interviews` — either a `company_id` column with a
   backfill, or RLS joining through `jobs.company_id`. The join is preferable: no backfill, no
   denormalised column to keep in sync.
2. Widen `update_application_status` to accept a company admin/recruiter, not only the job's exact
   owner. Today it is stricter than the `apps_company_update` policy that would otherwise allow it.
3. Restore NVite / Offers / Interviews to the nav.

### v2.0 — AI, Google Meet, plans

**The entitlement scaffolding already exists** — this does not need building:

```
plan_limits         │ plan · max_active_jobs · price_inr · talent_pool
subscription_plans  │  subscriptions  │  subscription_events
create_job()        │ RPC already enforces active-job limits server-side
```

`max_active_jobs` and `price_inr` are exactly the "more live posts per tier, INR pricing" model.
To complete it:

- Add `max_members` to `plan_limits`; enforce it in the invite route.
- Build the recruiter-facing **Team** tab against the existing members endpoints and stop discarding
  `companyId` / `memberRole` in `RecruiterLayoutClient` (they are passed down and never read).
- Google Meet link generation on the restored Interviews module.
- AI matching — and **remove the fabricated score first**. A `Math.random()`-derived "AI Match" is
  currently rendered as a real number; it must show `Not scored` until a real model exists.

**Pricing levers, in the order they are cheapest to enforce:** active job posts (already enforced) →
company members (needs one column) → AI features (needs the feature) → Google Meet (needs the
integration).

---

## 6. Still open before V1 ships

| Priority | Item | Owner |
|---|---|---|
| P0 | `candidate-applications` POST has no auth enforcement — anonymous POST reaches service-role storage | engineering |
| P0 | `ai-match` never validates its token — presence-only check, then service-role DB | engineering |
| P1 | `profile-complete-onboarding` accepts `userId` from the body and skips the token check | engineering |
| P1 | Reports page is 100% fabricated and renders USD in an INR product — wire it or hide the tab | product decision |
| P1 | Doc 34 suites A–G, especially **B1** (a pending recruiter must be bounced from a dashboard URL) | QA |
| P2 | Delete the dead `app/company/...` and `app/portals/app/company/...` trees, and `DashboardLayoutClient.tsx` (1006 lines, zero importers) | engineering |

**Not yet verified by a human:** every routing and ATS change since doc 39 has been verified by
reading code and by database queries. A single recruiter login — Jobs → open a job → change a stage
— would confirm the whole chain. That test has not been run.
