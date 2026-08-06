# Wave B Migration Report: Edge Functions Security & Consistency (v2)

## Overview
This updated report details the successful migration of Edge functions to the new `_shared/cors.ts` and `_shared/adminAuth.ts` utilities. This migration addresses insecure `Access-Control-Allow-Origin: '*'` headers and legacy `SUPABASE_SERVICE_ROLE_KEY` / `x-insforge-service-key` fallback patterns.

## Additions in v2
- Fixed `resume-parse/index.ts` to correctly reference the evaluated `cors` variable instead of the `corsHeaders` function.
- Fully migrated `recommendations/index.ts` to `getServiceKey()` and evaluated `cors`.
- Migrated `jobs-id/index.ts` to use `getBaseUrl()` and `getServiceKey()`, removing `x-insforge-service-key` headers.
- Migrated `notification-worker/index.ts` to use `getBaseUrl()`, `getServiceKey()`, and centralized `corsHeaders`, removing `x-insforge-service-key` headers.

## Verification Results
- **Service Keys:** A workspace-wide grep for `SUPABASE_SERVICE_ROLE_KEY` and `x-insforge-service-key` usage for initializing clients returned **0 results**. All functions now correctly fall back on `_shared/adminAuth.ts`.
- **ACAO Headers:** A workspace-wide grep for `Access-Control-Allow-Origin: '*'` returned **0 results**.

### TypeScript Compilation
The backend was compiled using `npx tsc -p insforge/tsconfig.json` to ensure no typing regressions occurred.
**Output:**
```
insforge/functions/_shared/adminAuth.ts(7,85): error TS5097: An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled.
insforge/functions/_shared/adminAuth.ts(8,27): error TS5097: An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled.
insforge/functions/_shared/adminAuth.ts(9,29): error TS5097: An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled.
insforge/functions/_shared/idempotency.ts(13,33): error TS5097: An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled.
insforge/functions/recommendations/index.ts(2,29): error TS5097: An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled.
insforge/functions/recommendations/index.ts(3,43): error TS5097: An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled.
```
*(Note: These TS5097 errors are expected in Deno environments where `.ts` extensions are mandatory for imports but not natively permitted by `tsc` without `allowImportingTsExtensions: true` configured.)*

## Security Posture Improvements
1. **Hardened CORS Policies:** Elimination of wildcard ACAO prevents arbitrary web-origins from reading sensitive backend API responses. 
2. **Unified Privilege Escalation Points:** By piping all privileged requests through `_shared/adminAuth.ts`, the backend ensures the service key is never extracted from unpredictable or unsafe environmental fallbacks.
3. **Consolidated Core Libraries:** Reusing `_shared/cors.ts` reduces LOC and maintenance overhead, ensuring any future CORS updates apply globally across the InsForge backend.
