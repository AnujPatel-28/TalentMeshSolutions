# System Architecture & Technical Documentation
**Target Audience**: Senior Developers, Tech Leads, Engineering Managers
**Project**: TalentMesh AI Recruiting Platform
**Stack**: Next.js 14 (App Router), TypeScript, InsForge (PostgreSQL, Edge Functions, Auth, Storage)

---

## 1. Architectural Philosophy & Overview

TalentMesh adopts a **Serverless, Edge-First Architecture** designed for high security, scalability, and strict data isolation. 

Instead of traditional monolithic API routes or direct ORM database connections from the Next.js server, the system relies heavily on **InsForge Edge Functions (Deno)** for business logic and **PostgreSQL Row Level Security (RLS)** for multi-tenant data protection.

### Core Stack Decisions:
- **Next.js App Router**: Utilizes React Server Components (RSC) to minimize client-side JavaScript. Server actions are used for form mutations, while `lib/api/` wrappers handle external data fetching.
- **State Management**: `Zustand` is used for global client state (e.g., Kanban board dragging), while React Context (`AuthContext.tsx`) handles session ubiquity.
- **Database (PostgreSQL via InsForge)**: Acts as the source of truth. The Next.js client **never** writes to the database directly; it delegates to Edge Functions.
- **Styling**: Modular CSS + Tailwind CSS.

---

## 2. Authentication & Authorization Lifecycle

Auth in TalentMesh is not just about logging in; it enforces strict **Role-Based Access Control (RBAC)** across three isolated domains: `Candidate`, `Recruiter`, and `Admin`.

### How the Code Works:
1. **JWT Issuance**: `insforge/functions/auth-session/` handles standard Email/Password and OAuth flows, issuing a JWT.
2. **Session Persistence**: The JWT is stored in cookies. `AuthContext.tsx` hydrates the client, while `lib/server-auth.ts` extracts the user safely inside Server Components.
3. **The Stateless Proxy Shield (`proxy.ts`)**:
   - Executes at the Edge before rendering any Next.js route.
   - Computes fast, edge-level redirects based purely on lightweight cookies (`tm_role`, `tm_onboarding`, `tm_mfa`) without hitting the database, eliminating 504 Gateway Timeouts.
   - Intercepts requests and forcefully redirects candidates, recruiters, or unauthenticated users to their correct domains or `/login`.
4. **Authoritative Layout Verification (The True Gate)**:
   - While the proxy handles fast routing, the true authorization gate is inside the root layouts (`app/dashboard/layout.tsx`, `admin/layout.tsx`, etc.).
   - The server validates the JWT natively via `getServerUser()` to construct an authoritative, tamper-proof session.
   - It enforces Suspension (`is_active = false`), MFA completion (`mfa_verified`), Onboarding completion (`completed_onboarding`), and strict Role Boundaries.
5. **Console Leakage Prevention**:
   - The Next.js SWC compiler (`next.config.ts`) is configured with `removeConsole: true` in production. This guarantees that zero internal API responses, payloads, or credentials can ever leak to the browser console.
6. **Registration Hook (`auth-signup`)**:
   - When a user signs up, the `auth-signup` Edge Function intercepts the event. It dynamically creates a linked record in either the `candidate_profiles` or `recruiter_profiles` table based on the signup form payload, ensuring no orphaned Auth users exist.

---

## 3. Data Access & Security (RLS)

TalentMesh employs a "Zero-Trust" database model using PostgreSQL **Row Level Security (RLS)**.

### How the Code Works:
Instead of writing imperative checks in the codebase (e.g., `if (job.recruiter_id !== user.id) throw 403`), security is baked into the database schema (`insforge/migrations/fix-rls-*.sql`).

**Example Policy (Candidates reading Jobs)**:
- Candidates can `SELECT` from the `jobs` table, but the RLS policy automatically filters out jobs where `status != 'published'`.
- Recruiters bypass this filter for their own `company_id`.

**Why this matters**: Even if a developer accidentally writes a wildcard query `SELECT * FROM jobs` in the frontend, the InsForge client automatically appends the user's JWT, and the PostgreSQL engine truncates the results at the database level.

---

## 4. Feature Deep-Dive & Execution Flow

### Feature A: AI-Powered Job Matching & Recommendations
**Goal**: Match candidate resumes against job descriptions semantically.

**How the Code Works**:
1. **Trigger**: When a recruiter views a candidate pipeline, or a candidate opens their dashboard, the client calls `lib/api/aiSuggest.ts`.
2. **Edge Compute (`insforge/functions/ai-match/index.ts`)**:
   - The Edge Function retrieves the candidate's parsed resume and the job description.
   - It interfaces with **OpenRouter/OpenAI APIs** to generate embeddings or semantic analysis.
   - It calculates a compatibility score (e.g., 85% match).
3. **Caching**: The result is cached in a `match_scores` table to avoid redundant LLM API calls, significantly reducing latency and costs on subsequent loads.

### Feature B: Applicant Tracking System (ATS) Pipeline
**Goal**: Allow recruiters to drag-and-drop candidates through hiring stages (Applied -> Interviewing -> Offered).

**How the Code Works**:
1. **Client State (Optimistic UI)**: The pipeline uses a drag-and-drop library tied to a **Zustand** store. When a recruiter drops a candidate card into a new column, the UI updates instantly.
2. **Mutation**: The client fires a request to `insforge/functions/update-application/`.
3. **Backend Logic**:
   - The function verifies the recruiter's authorization over the specific `job_id`.
   - It updates the application status in PostgreSQL.
   - **Side Effects**: If moved to "Interviewing", the function triggers an email notification to the candidate via an integrated email provider (handled asynchronously to prevent blocking the UI).

### Feature C: Resume Parsing & Secure Storage
**Goal**: Candidates upload CVs; recruiters view them securely.

**How the Code Works**:
1. **Upload (`components/candidate/ResumeManager.tsx`)**:
   - The client uploads the PDF directly to an InsForge Storage bucket (`resumes`).
   - The bucket is private. RLS ensures candidates can only upload to their own folder (`/resumes/{user_id}/`).
2. **Retrieval (`components/recruiter/CandidateProfileDrawer.tsx`)**:
   - When a recruiter opens a candidate drawer, the app requests a **Signed URL** with a short expiration (e.g., 60 seconds) from InsForge Storage.
   - This prevents resumes from being hotlinked or leaked publicly.
3. **Application Snapshots & Proxy Access**:
   - To guarantee compliance and recruiter view stability, submitting an application uploads a copy of the candidate's active resume to the private `application-snapshots` bucket at `applications/{applicationId}/resume.pdf`.
   - Even if the candidate later deletes or replaces their original resume in the Resume Manager, the application snapshot is unaffected.
   - Recruiters view/download these snapshots via the `resume-proxy` edge function, which validates that the logged-in user is either an admin or the recruiter who owns the job, logs the event in `resume_access_log` (categorizing the `source` as `application` or `admin`), and streams the PDF.
4. **Snapshot Storage Growth & Retention Policy**:
   - *Production Risk*: Since every job application creates a separate immutable PDF file, storage requirements scale linearly (e.g., 100,000 applications = 100,000 PDFs).
   - *Retention Policy*: In Phase A, snapshots are retained indefinitely. For long-term production, it is recommended to implement a cleanup worker that deletes snapshots associated with applications older than 3 years (or 7 years for strict enterprise compliance) where the status is closed/rejected/withdrawn.

### Feature D: Global Admin Oversight
**Goal**: Admins can impersonate, audit, and moderate the platform.

**How the Code Works**:
1. **Universal Search (`components/admin/UniversalSearch.tsx`)**: 
   - A debounced search component that queries an optimized PostgreSQL view, instantly returning Users, Companies, or Jobs.
2. **Reporting (`insforge/functions/admin-reports/`)**:
   - Instead of the Next.js server running heavy analytical queries (which could cause memory spikes or timeouts), the Edge Function executes a pre-compiled SQL aggregation and returns a lightweight JSON payload to populate the Admin Charts.

---

## 5. Routing Architecture & Next.js Patterns

We utilize advanced Next.js App Router patterns to keep the codebase modular:

- **Route Groups**: Folders like `(auth)`, `(dashboard)`, and `(company)` bypass the URL path. This allows us to share `layout.tsx` files across multiple domains without affecting the URL structure.
- **Parallel & Intercepting Routes**: Used for modals (like the Application Modal or Video Room popouts) to ensure the user doesn't lose context of the underlying page.
- **Server Components**: The root `page.tsx` of a dashboard is always a Server Component. It fetches the initial data payload and passes it as props to a Client Component (e.g., `RecruiterLayoutClient.tsx`), which then handles interactivity.

---

## 6. Developer Workflows & CI/CD

- **Edge Deployment**: Developers use `scripts/deploy-all-functions.js` to bundle and push all Deno Edge Functions to the InsForge infrastructure in a single command.
- **Testing**: 
  - **Vitest** is used for isolated unit testing of utility functions and API wrappers.
  - **Playwright** is used for critical path E2E testing (e.g., the signup-to-apply flow), with reports outputting to `playwright-report/` (which is git-ignored).
