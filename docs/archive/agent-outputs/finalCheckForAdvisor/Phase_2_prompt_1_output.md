Prompt P2-A — Sonnet/Gemini Flash: validation schemas

You are executing Phase 2 task 1 from docs/specs/08_Implementation_Execution_Plan.md in the Talentmesh-demo project: create lib/validation/company.ts. File-only, no DB changes, no deploys.

Read first: 03_API_Routes_And_Endpoints.md (the Zod schemas section — copy the schemas it specifies exactly), lib/validation/recruiter.ts (the existing pattern to extend — same style, same export conventions), and lib/api/companies.ts (the row types the schemas must stay consistent with).

Do:
1. Create lib/validation/company.ts with the schemas doc 03 specifies for: company profile create/update, member invite/patch, verification submit, and the India-specific regexes (GSTIN, CIN, PAN, +91 phone) — use the exact validation rules from doc 03, do not invent formats. country_code defaults 'IN' but the schemas must not hard-reject non-IN (international-ready per CLAUDE.md).
2. If doc 03 references a regex or rule it never defines, STOP and report the gap — do not guess a format.
3. IMPORTANT drift note: the live companies table has `description` (not `about`) and no `recruiter_id`; migration 046 added status/cin/pan/registered_email_domain/country_code/slug. If doc 03's schemas name fields that don't exist in lib/api/companies.ts, flag each and align to the row types.

Verify: npx tsc --noEmit (baseline: one framer-motion error in applications/page.tsx:686); a tiny vitest file (follow __tests__/lib/cookies.test.ts conventions) asserting one valid + one invalid case per regex (GSTIN, CIN, PAN, phone).

Output: file path, the schema list, any doc-03 gaps/drift found, tsc + test results. Fable review follows before P2-B.

-----


All green. Summary:

File: lib/validation/company.ts

Schemas created: createCompanySchema, updateCompanySchema (.partial() of create, per doc 03's PATCH route), inviteMemberSchema, updateMemberSchema, verificationSubmitSchema, plus exported regexes GSTIN, CIN, PAN, PHONE_IN and validateX helpers following recruiter.ts conventions.

Doc-03 gap: none — all rules were explicit, no regex needed inventing.

Drift found: createCompanySchema in doc 03 uses field about, but the live companies row type (lib/api/companies.ts) has description, not about. Renamed the field to description in the schema and noted it with a comment. No other field mismatches (name/industry/website/gstin/cin/country_code all match the row type).

Excluded from this file per task scope: verificationDecisionSchema (admin-decide route) and jobCreateSchema (jobs, not company) — those belong to other P2 tasks, not doc 03's company/member/verification-submit trio.

tsc --noEmit: clean except the pre-existing baseline error at applications/page.tsx:686 (framer-motion Variants typing) — no new errors.

vitest: __tests__/lib/company.test.ts — 4/4 passed (GSTIN, CIN, PAN, PHONE_IN, one valid + one invalid case each).