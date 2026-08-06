# 43 — V2 AI-ATS, Pricing, and Company-First Expansion Plan

**Date:** 2026-08-02  
**Status:** Post-V1 execution plan  
**Source proposal:** `Talentmesh-demo/docs/specs/Ai_atsAdisor.md`  
**Implementation target:** `C:\Users\Anuj\Desktop\tm_web\tm-main`

## 1. V1 baseline after execution

V1 remains a plain ATS. The following are now true in the working tree:

- `profile-complete-onboarding` authenticates only from the bearer token and updates only the authenticated profile.
- The function was deployed successfully and an unauthenticated body-injection probe returned `401`.
- Reports uses live `jobs` and `applications` data only; fabricated metrics and USD values were removed.
- Recruiter AI-match UI, random fallback scores, match sorting, and match badges were removed.
- Confirmed-dead duplicate recruiter trees and the unimported `DashboardLayoutClient` were removed.
- `npx tsc --noEmit`, focused ESLint, and `npm run build` pass.

V2 must build on this baseline. It must not restore fabricated scores, reintroduce the deleted route trees, or make AI a hidden authorization or rejection mechanism.

## 2. V2 product definition

V2 adds four capability groups:

1. **AI-assisted job and applicant evaluation** — advisory scoring and explanations, never automatic rejection.
2. **Paid plans and AI quotas** — plan entitlements, Razorpay subscriptions, and prepaid AI top-ups.
3. **Company-First collaboration** — paid team seats and company-wide recruiter workflows.
4. **Scheduling and export** — Google Calendar/Meet scheduling and a small CSV export before any Sheets API.

The AI feature is a decision-support tool. A human recruiter remains responsible for every shortlist, interview, offer, and rejection decision.

## 3. Architecture relationship to the current system

```text
Recruiter server guard
  -> active company membership + verified company
  -> company plan and quota entitlement
  -> deterministic eligibility/consent checks
  -> AI edge function through OpenRouter
  -> service-only write of evaluation result
  -> recruiter UI displays advisory report
```

The existing boundaries remain authoritative:

- `app/dashboard/recruiter/[role_id]/layout.tsx` — recruiter server authorization.
- `withApi` routes — request validation and API role checks.
- InsForge RLS/RPCs — company scope and mutation authorization.
- InsForge server functions — AI provider access and service-only AI writes.
- `subscription_plans` — pricing and feature entitlement source of truth.
- `consent_records` — candidate AI-processing consent source of truth.

The browser must never receive an OpenRouter key, service key, Razorpay secret, Google refresh token, or an authority to write `ai_*` columns directly.

## 4. Mandatory gates before V2 work

| Gate | Requirement | Evidence to capture |
|---|---|---|
| V2-G1 | Function deployment works for a bundled and an unbundled function | Deployment IDs and live function response |
| V2-G2 | DPDP consent for `resume_parsing_ai` is live, withdrawable, and visible in signup/settings | Consent UI and API test |
| V2-G3 | Candidate data export/erasure behavior is AI-aware | Export/erasure test confirms AI reports do not leak or survive incorrectly |
| V2-G4 | Current pricing rows and subscription schema are re-read from the live database | Schema output and row snapshot; never rely only on old docs |
| V2-G5 | Launch/empty-state smoke tests pass on the fresh or approved database | Jobs, applications, consent, and recruiter guard checks |
| V2-G6 | Founder approves Razorpay test credentials and test-mode rollout | Approval record; live mode remains disabled |

If a gate fails, pause the dependent phase. Do not add UI that implies a capability whose server path is not available.

## 5. Entitlement model

### 5.1 Single source of truth

Use `subscription_plans` for plan metadata and entitlements. Existing `plan_limits` is a legacy duplicate and must not become a second pricing source.

Before V2 launch:

- Verify the live `subscription_plans` schema and seed rows.
- Add or confirm `max_members`, `active_jobs`, and `ai_calls_per_month` fields.
- Migrate remaining readers of `plan_limits` to `subscription_plans`.
- Keep a compatibility migration until all readers are moved, then remove the duplicate later.

### 5.2 Initial tiers

The proposed structure is:

| Key | Position | Active jobs | AI calls/month | Seats |
|---|---|---:|---:|---:|
| `free` | Basic ATS | 1 | 0 | 1 |
| `growth` | Team ATS | 10 | 0 | 3 |
| `pro` | AI ATS | Unlimited or verified high limit | 400 initially | 10 |

Prices and limits remain configuration, not hardcoded frontend logic. The founder must approve final INR prices and GST treatment before live checkout.

### 5.3 Quota rules

- Monthly AI usage is derived from `applications.ai_evaluated_at` for the company’s current billing month.
- If the monthly quota is exhausted, consume prepaid `companies.ai_credit_balance` if available.
- If both are exhausted, return a stable `402` entitlement error before calling the model.
- Never perform a model call and then discover that quota was unavailable.
- Top-ups are prepaid and idempotent; there is no post-paid metering in V2.

## 6. Data model and migration plan

Schema changes require a human-reviewed InsForge migration and a backend branch where available.

### 6.1 Billing migration

Verify before applying:

- `subscription_plans` current columns and rows.
- `subscriptions` current status, company, provider ID, and period fields.
- Existing `subscription_events` and `idempotency_keys` contracts.

Expected additions:

```sql
ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS max_members integer;

ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS razorpay_plan_id_monthly text;

ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS razorpay_plan_id_annual text;

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS ai_credit_balance integer NOT NULL DEFAULT 0;
```

Revoke client update access to `companies.ai_credit_balance`. Only the verified payment/webhook path may increment or decrement it.

### 6.2 AI evaluation migration

Expected additions, with live-schema verification first:

```sql
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS must_have text[] NOT NULL DEFAULT '{}';

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS good_to_have text[] NOT NULL DEFAULT '{}';

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS screening_questions jsonb NOT NULL DEFAULT '[]';

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS ai_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS screening_answers jsonb;

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS ai_score numeric(3,1) CHECK (ai_score BETWEEN 0 AND 10);

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS ai_report jsonb;

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS ai_model text;

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS ai_evaluated_at timestamptz;
```

AI columns must be service-write-only. Recruiter reads are company-scoped and candidate consent must be checked before an evaluation is created.

### 6.3 Scheduling migration

Do not add an availability engine in V2. Verify the existing `interviews` table first. Add only the minimum fields needed for a recruiter-selected time, Google event ID, Meet URL, and candidate notification linkage.

Store Google refresh tokens in a dedicated owner-scoped table or approved secret-backed storage. Never store them in a public profile row.

## 7. AI services

### 7.1 Provider and model policy

- Use InsForge’s OpenRouter gateway.
- Keep the model ID in one server-side `AI_ATS_MODEL` environment variable.
- No per-recruiter model choice in V2.
- No BYO model keys in V2.
- Validate model output with Zod and retry once for invalid JSON.
- Log usage metadata without logging raw resumes or unnecessary candidate PII.

### 7.2 `ai-evaluate` function — P0

Input:

```json
{ "application_id": "..." }
```

Execution order:

1. Authenticate the caller and resolve the application’s job/company.
2. Verify the caller is an active recruiter/company member for that company.
3. Check the company plan/quota before any model call.
4. Read the latest candidate consent for `resume_parsing_ai`.
5. If consent is not granted, return `{ "excluded": "no_consent" }` and write no AI result.
6. Run deterministic must-have filters against structured candidate skills and screening answers.
7. For a hard knockout, write a transparent rule-based report and score `0`; do not call the model.
8. Otherwise send only the minimum needed job, resume, and screening context to OpenRouter.
9. Validate `{ score, strengths, gaps, summary }`.
10. Write `ai_score`, `ai_report`, `ai_model`, and `ai_evaluated_at` through the service-only path.

The function must be recruiter-triggered initially. Automatic evaluation on application creation is a later optimization after cost, consent, and latency are measured.

### 7.3 `jd-assist` function — P1

Input is an unsaved job draft. Output contains improved description, suggested must-haves, and good-to-haves. The recruiter edits and confirms the content before saving. It never silently mutates a job.

### 7.4 UI contract

The recruiter applicant list may show:

- `Not evaluated`.
- `AI evaluation unavailable — consent not granted`.
- `Evaluated` with score and report drawer.

Every AI surface must display: **“AI assessment is advisory — you decide.”**

No auto-reject, auto-shortlist, or hidden ranking is permitted.

## 8. Pricing and Razorpay integration

### 8.1 Server flow

Use InsForge’s Razorpay payment module, not hand-rolled provider calls:

1. Configure test credentials in InsForge secrets.
2. Create monthly/annual Razorpay plans and one prepaid AI-credit product.
3. Store returned provider IDs in `subscription_plans`.
4. Add an authenticated company-admin checkout function.
5. Add a webhook function that verifies signatures, handles subscription/top-up events, and uses `idempotency_keys`.
6. Upsert `subscriptions` and update credit balance only from verified webhook events.

### 8.2 Client flow

- Pricing page reads `subscription_plans`.
- Company admin sees the current company plan and quota.
- Checkout runs in Razorpay test mode first.
- UI handles stable server errors: plan limit, quota exhausted, not company admin, and payment pending.
- Live-mode keys require explicit founder approval.

## 9. Company-First collaboration expansion

This is a V2 capability, not a V1 cleanup task.

1. Add/enforce plan `max_members` in the existing member-invite endpoint.
2. Build the recruiter Settings → Team tab using the existing company member APIs.
3. Pass `companyId` and `memberRole` from the server layout into a context consumed by the UI; treat them as UX context, not authorization.
4. Restore NVite, Offers, and Interviews only after their data access is company-safe.
5. Prefer deriving scope through `jobs.company_id` where possible; avoid redundant denormalized `company_id` columns unless the query/RLS design requires them.
6. Widen application stage mutation authorization for active company members while preserving coordinator restrictions.

## 10. Google Calendar and Meet

Implement after AI and billing gates pass:

- One Google connection per recruiter with owner-only access.
- OAuth scope limited to `calendar.events`.
- Recruiter selects a time; no availability engine.
- Server inserts a Calendar event with `conferenceData.createRequest`.
- Persist event/Meet metadata in the verified interview data model.
- Notify the candidate using the existing notification pipeline.
- Re-check token encryption, revocation, and deletion behavior before production.

## 11. CSV export

Ship CSV before Google Sheets:

- One company/job-scoped route.
- Export candidate/application fields permitted by the recruiter authorization model.
- Include AI score/report summary only when present and permitted.
- Return `Content-Disposition: attachment`.
- Add audit logging for exports if the existing compliance model requires it.

Sheets API is deferred until a paying customer requests it.

## 12. Execution sequence

| Phase | Work | Exit criteria |
|---|---|---|
| 0 | Re-verify backend/schema/legal gates | All V2 gates pass; no unverified live-state assumption remains |
| 1 | Billing schema, plan seed, plan gate | Free company receives a stable limit error on the next live job; pricing reads data |
| 2 | Razorpay test checkout/webhook | Subscription row is created; replay is idempotent; top-up balance is correct |
| 3 | AI schema and `ai-evaluate` | Consent exclusion and deterministic knockout tests pass without model calls |
| 4 | Applicant AI UI and `jd-assist` | Real scores/reports only; no fabricated fallback; human-decision copy visible |
| 5 | Team seats and company collaboration | Member limit, invite, role, suspend/remove, and last-admin tests pass |
| 6 | Google Meet scheduling | Real test event and Meet link created; candidate notification verified |
| 7 | CSV export and launch audit | Company scoping, privacy, quota, payment, and browser smoke tests pass |

## 13. Non-goals for V2

- Automatic rejection or automatic employment decisions.
- Post-paid AI metering.
- Per-recruiter model selection or BYO keys.
- AI-powered talent-pool search as an authorization path.
- Google Sheets API before CSV and customer demand.
- Calendar availability/slot optimization.
- Rebuilding the deleted recruiter route trees.

## 14. Required verification suite

### Security and tenancy

- Unauthenticated AI, billing, member, and scheduling calls fail.
- Recruiter from another company cannot evaluate, read, or export an application.
- Coordinator cannot post/publish jobs or invite members.
- Company admin cannot alter another company’s plan or AI balance.
- Service-only AI columns cannot be client-written.

### Consent and safety

- No consent → no model call and no AI result write.
- Withdrawn consent → future evaluation is blocked.
- Must-have knockout → score `0`, rule report, no model call.
- Invalid model JSON → one retry, then safe error with no partial result.
- Every AI screen says the decision remains human.

### Billing and reliability

- Quota is checked before model invocation.
- Top-up webhook replay is idempotent.
- Subscription webhook replay is idempotent.
- Payment pending/failed does not grant entitlement.
- AI provider outage leaves the application usable without changing ATS stages.

### Product behavior

- Empty companies see honest empty states.
- Reports never render fabricated metrics or USD values.
- Unscored applicants remain unranked.
- Company members see only features allowed by their plan and role.

## 15. Implementation rule

V2 should be delivered as small, reviewable slices. Each slice must include its migration/RLS contract, API contract, UI state handling, tests, and rollback plan. A feature is not complete when its page exists; it is complete when its server authorization, consent, quota, audit, and failure behavior are verified.

