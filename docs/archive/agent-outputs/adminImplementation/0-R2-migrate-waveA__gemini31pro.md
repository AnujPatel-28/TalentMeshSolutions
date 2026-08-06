# Wave A Migration Report (R-2 Kit)

## Overview
Successfully migrated 19 functions to the R-2 edge function kit as requested in Wave A. 
This aligns with the reference pattern defined in `insforge/functions/admin-candidates/index.ts`.

### Staff-Gated Functions (Admin)
Migrated to use `requireStaff` and removed custom auth headers/fallbacks:
1. `activate-recruiter`
2. `admin-announcements`
3. `admin-applications`
4. `admin-audit`
5. `admin-audit-logs`
6. `admin-companies`
7. `admin-dashboard`
8. `admin-jobs`
9. `admin-recruiter`
10. `admin-reports`
11. `cleanup-idempotency-keys`
12. `cleanup-stale-resources`

*Note on `cleanup-idempotency-keys`: Successfully added the logic to purge rows with `status = 0` older than 1 hour as instructed.*

### Non-Staff Functions (Candidate / Public)
Preserved existing authentication logic but standardized CORS, input filtering (`escapeOrFilter`), pagination (`capLimit`), and error formatting (`errorJson`/`internalError`):
1. `auth-session`
2. `candidate-applications`
3. `candidate-applications-id`
4. `candidate-profile`
5. `candidates`
6. `company-profile`
7. `jobs`

## Verification Steps Performed

1. **Type Checking:** Ran `npx tsc -p insforge/tsconfig.json`. (A type error in `candidate-profile` was caught and fixed).
2. **Bundle Verification:** Ran `esbuild --bundle` on three migrated functions (`admin-dashboard`, `candidate-applications`, `jobs`). The bundled output confirmed proper inlining of `_shared` imports with zero runtime dependencies on external local paths.
3. **Legacy Credential Cleanup Grep:**
   - Remaining instances of `x-insforge-service-key`: **5** (These remain in functions outside Wave A scope such as `recruiter-profile`, `recruiter-dashboard`, `notification-worker`, `jobs-id`, `admin-settings`).
   - Remaining instances of `Access-Control-Allow-Origin': '*'`: **8** (These remain in functions outside Wave A scope such as `update-application`, `resume-proxy`, `resume-parse`, `recruiter-profile`, `recruiter-document-proxy`, `recommendations`, `recruiter-dashboard`, `ai-match`).

Please review the implementations as per §7.3 rule 4.
