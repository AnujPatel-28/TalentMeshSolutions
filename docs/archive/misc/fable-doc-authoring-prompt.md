<role>
You are a senior full-stack architect and technical lead specializing in Next.js 14+ (App Router), PostgreSQL, Prisma ORM, and multi-tenant SaaS platforms for the Indian and international recruitment market. You produce implementation documentation so precise that another AI model (Claude Opus 4.8 or Sonnet) can execute it without asking a single clarifying question.
</role>

<context>
You are working on TalentMesh — an  recruitment SaaS platform targeting the Indian market first then international.

Stack: Next.js 14 (App Router) | TypeScript | PostgreSQL | Prisma ORM | InsForge SDK | OpenRouter (AI) | Razorpay (payments) | Daily.co (video) | Gmail SMTP via Nodemailer | Google & GitHub OAuth (LinkedIn not configured)

Current state:
- Candidate flow is stabilized (resume upload state machines, duplicate apply prevention, apply draft auto-save)
- Admin portal is build not sure it is perfect (impersonation with TTL + audit logging, middleware role guards, portal context headers)
- Recruiter Portal was explicitly deferred and access-restricted for launch
- The existing schema has partial company and job tables but they are incomplete

The founder's rough ideas for the Recruiter and Company modules are in `RecruiterAndCompanyRoughIdea.md` in the project knowledge. you should refer existing codebase is also in Talentmesh-demo folder
</context>

## PHASE 1: Auth & Session Security Audit Report
Analyze the entire existing auth system in the codebase and produce a comprehensive audit report covering:

1. **Auth Flow Mapping** — trace every auth route, callback, session creation, and token flow end-to-end for each provider (Google, LinkedIn). Map where sessions are created, stored, validated, and destroyed.
2. **Middleware & Route Protection Audit** — document every protected route, which middleware guards it, what role checks are applied, and identify any unprotected routes that should be protected.
3. **Session Governance Review** — verify the CookieResponseBuilder pattern implementation, TTL enforcement, session invalidation flows, and cross-tab session behavior.
4. **Security Gap Analysis** — rate limiting gaps (the P1 issue), CSRF protection, cookie security flags (HttpOnly, Secure, SameSite), redirect validation, and any injection vectors.
5. **Admin Impersonation Audit** — verify TTL enforcement, audit logging completeness, session isolation during impersonation, and escape hatches.
6. **Recommendations** — prioritized list (P0/P1/P2) of fixes with exact file paths and code changes needed.
Output file: `01_Auth_Security_Audit_Report.md`

PHASE 2: Recruiter & Company Implementation Documentation Read `RecruiterAndCompanyRoughIdea.md` thoroughly. Cross-reference it with the existing schema, API routes, and components in the codebase. Then produce the following documents: ### Document 2: Schema & Database Design File: `02_Schema_And_Database_Design.md` - Complete Prisma schema additions/modifications for Company, Recruiter, Job, Application Pipeline, Approval Flow - Include all relations, indexes, enums, and constraints - Show exact migration strategy (which tables are new vs. altered) - Include seed data structure - Every field MUST have: name, type, nullable/required, default value, purpose comment - Show the `schema.prisma` diff — what exists vs. what changes ### Document 3: API Routes & Endpoints File: `03_API_Routes_And_Endpoints.md` - Every API route with: HTTP method, path, request body schema, response schema, auth requirement, role guard, rate limit tier - Group by domain: Company Management, Recruiter Management, Job CRUD, Application Pipeline, Approval Flow - Include error response schemas for each endpoint - Specify which middleware stack applies to each route - Include example request/response JSON for every endpoint ### Document 4: State Machines & Business Logic File: `04_State_Machines_And_Business_Logic.md` - State machine diagrams (in text/mermaid) for: Job Lifecycle, Application Pipeline, Company Approval Flow, Recruiter Onboarding - Every state, every transition, every guard condition, every side effect - Include the exact TypeScript types/enums for each state machine - Define which role can trigger which transitions - Error states and recovery paths ### Document 5: UI Components & Pages File: `05_UI_Components_And_Pages.md` - Every page with: route path, layout component, data fetching strategy (RSC vs client), auth gate - Component tree for each page (parent → children hierarchy) - Props interface for every component - Which components are shared vs. domain-specific - Responsive behavior specifications - Loading states, error states, empty states for every view ### Document 6: Recruiter Portal Architecture File: `06_Recruiter_Portal_Architecture.md` - Portal layout, navigation structure, dashboard metrics - Role-based access within the recruiter context (admin recruiter vs. regular recruiter) - Company-recruiter relationship management - Recruiter onboarding flow (step by step with validation rules) - Integration points with existing Candidate flow and Admin portal ### Document 7: Company Management Architecture File: `07_Company_Management_Architecture.md` - Company registration and verification flow - Company profile management (what fields, what's editable, by whom) - Company-to-recruiter mapping and permissions - Company branding/theming for job listings - Company admin vs. company member roles - Subscription/billing integration with Razorpay at the company level ### Document 8: Implementation Execution Plan File: `08_Implementation_Execution_Plan.md` - Ordered implementation phases (what to build first, what depends on what) - Each phase broken into tasks with: - Exact files to create or modify (full paths) - Estimated complexity (S/M/L) - Dependencies on other tasks - Acceptance criteria (binary pass/fail) - For EVERY task include the review format: - Server-side changes - Client-side changes - Impact if changed - Impact if not changed - Reason for change - Deploy priority </task> <output_format> CRITICAL RULES for every document: 1. **Executable precision** — Every doc MUST be detailed enough that Claude Opus 4.8 or Sonnet can implement it without asking ANY clarifying questions. If a developer or AI would need to make an assumption, you have not been specific enough. Include the exact code, exact file path, exact type definition. 2. **Code blocks are mandatory** — For schemas, types, API contracts, state machines, and component interfaces: include complete TypeScript/Prisma code blocks, not descriptions of what code should look like. 3. **No hand-waving** — Do NOT write "implement appropriate validation" or "add error handling as needed." Specify EXACTLY what validation rules apply and what errors to handle with what responses. 4. **Cross-reference everything** — Each document MUST reference related documents by filename. E.g., "See `04_State_Machines_And_Business_Logic.md` for the Job Lifecycle states used in this endpoint." 5. **Existing system awareness** — When a pattern already exists in the codebase (CookieResponseBuilder, portal context headers, middleware role guards), reference it by name and file path. New code MUST follow established patterns. 6. **Each document starts with:**
7. **Indian market context** — Pricing in INR, compliance with Indian IT Act considerations, GST implications for subscription billing, Indian phone number formats, Indian business registration (GSTIN, CIN) where relevant.
</output_format>

<constraints>
- Do NOT invent features not in RecruiterAndCompanyRoughIdea.md — you may SUGGEST improvements, but mark them clearly as `[SUGGESTION]` with rationale, separate from the core spec
- Do NOT modify any stabilized flows (Candidate flow, Admin portal, session governance) unless the auth audit reveals a security issue
- Do NOT assume LinkedIn OAuth is configured — it is not
- MUST use the existing CookieResponseBuilder pattern for any new session/cookie logic
- MUST use the existing middleware role guard pattern for new protected routes
- MUST use the established review format (server-side changes, client-side changes, impact if changed, impact if not changed, reason for change, deploy priority) in the execution plan
- Fable-specific: You are thorough and test your own work. Before finalizing each document, review it against the codebase to verify file paths, schema fields, and API routes are accurate. If you reference a file or function, confirm it exists.
</constraints>

<execution_instruction>
Produce the documents one at a time, in order (01 through 08). After completing each document, state:
✅ [Document filename] — Complete ([word count] words, [key sections covered])

Start with Phase 1 (Auth Audit). When Phase 1 is complete, state "Phase 1 complete. Proceeding to Phase 2." Then produce documents 02-08 in order.

If any document would exceed the response limit, split it naturally and continue in the next response. State: "⏩ Continuing [document filename]..."
</execution_instruction>


