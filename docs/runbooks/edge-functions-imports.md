# TypeScript Import Problems Report: Edge Functions (.ts Extensions)

This report details the TypeScript compilation errors found across **32 Edge Function files** within the `insforge/functions` directory. These errors are caused by import paths that end with a `.ts` extension, which is required for Deno runtime execution but triggers warnings under the current TypeScript compiler configuration in standard development environments.

---

## 1. Executive Summary

- **Total Affected Files:** 32 Edge Function scripts (including `_shared/adminAuth.ts` and 31 endpoint-specific `index.ts` controllers).
- **Core Error Message:** `An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled.`
- **Nature of the Issue:** Non-blocking development environment warning. These `.ts` extensions are fully valid and mandatory when deployed to the Deno-based edge runtime platform (InsForge/Supabase), but the local IDE TypeScript Language Server complains because the compiler options are missing the compatibility flag.

---

## 2. Root Cause Analysis

In the Edge Functions directory, files are written for execution within a **Deno** environment. Deno resolves module imports explicitly using full file paths including their file extensions (e.g., `import { corsHeaders } from '../_shared/cors.ts'`).

However, standard TypeScript compilation (under standard Node/bundler module resolution specs) discourages `.ts` extensions in import statements unless the compiler is explicitly told to allow them.

### Current Configuration Analysis
The configuration in [tsconfig.json](../../insforge/functions/tsconfig.json) is currently:
```json
{
  "compilerOptions": {
    "ignoreDeprecations": "5.0",
    "target": "ES2022",
    "lib": ["dom", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "baseUrl": ".",
    "paths": {
      "npm:*": ["../../node_modules/*"]
    }
  },
  "include": [
    "**/*.ts",
    "deno.d.ts"
  ]
}
```

Because `"allowImportingTsExtensions": true` is **not** specified in `compilerOptions` under `moduleResolution: "bundler"`, the TypeScript compiler flags every relative import ending with `.ts` as an error.

---

## 3. List of Affected Files and Problems

Below is the complete registry of the 32 affected files, including specific line references and the exact import paths causing the warning.

### 3.1 Shared Library Code

| File Path | Line(s) | Source Code snippet | Error Message |
| :--- | :--- | :--- | :--- |
| [_shared/adminAuth.ts](../../insforge/functions/_shared/adminAuth.ts) | 7-9 | `import { ... } from './permissions.ts';`<br>`import { errorJson } from './errors.ts';`<br>`import { corsHeaders } from './cors.ts';` | An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled. |

### 3.2 Endpoint Edge Controllers (`index.ts`)

| File Path | Line(s) | Import Path Target(s) | Error Message |
| :--- | :--- | :--- | :--- |
| [activate-recruiter/index.ts](../../insforge/functions/activate-recruiter/index.ts) | 2-4 | `../_shared/cors.ts`<br>`../_shared/errors.ts`<br>`../_shared/idempotency.ts` | An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled. |
| [admin-announcements/index.ts](../../insforge/functions/admin-announcements/index.ts) | 1-5 | `../_shared/adminAuth.ts`<br>`../_shared/cors.ts`<br>`../_shared/errors.ts`<br>`../_shared/database.ts`<br>`../_shared/idempotency.ts` | An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled. |
| [admin-applications/index.ts](../../insforge/functions/admin-applications/index.ts) | 1-5 | `../_shared/adminAuth.ts`<br>`../_shared/cors.ts`<br>`../_shared/errors.ts`<br>`../_shared/database.ts`<br>`../_shared/idempotency.ts` | An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled. |
| [admin-audit-logs/index.ts](../../insforge/functions/admin-audit-logs/index.ts) | 1-4 | `../_shared/adminAuth.ts`<br>`../_shared/cors.ts`<br>`../_shared/errors.ts`<br>`../_shared/database.ts` | An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled. |
| [admin-audit/index.ts](../../insforge/functions/admin-audit/index.ts) | 17-18 | `../_shared/cors.ts`<br>`../_shared/errors.ts` | An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled. |
| [admin-candidates/index.ts](../../insforge/functions/admin-candidates/index.ts) | 3-7 | `../_shared/adminAuth.ts`<br>`../_shared/cors.ts`<br>`../_shared/errors.ts`<br>`../_shared/database.ts`<br>`../_shared/idempotency.ts` | An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled. |
| [admin-companies/index.ts](../../insforge/functions/admin-companies/index.ts) | 1-5 | `../_shared/adminAuth.ts`<br>`../_shared/cors.ts`<br>`../_shared/errors.ts`<br>`../_shared/database.ts`<br>`../_shared/idempotency.ts` | An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled. |
| [admin-dashboard/index.ts](../../insforge/functions/admin-dashboard/index.ts) | 1-3 | `../_shared/adminAuth.ts`<br>`../_shared/cors.ts`<br>`../_shared/errors.ts` | An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled. |
| [admin-export-audit/index.ts](../../insforge/functions/admin-export-audit/index.ts) | 2 | `../_shared/adminAuth.ts` | An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled. |
| [admin-jobs/index.ts](../../insforge/functions/admin-jobs/index.ts) | 1-5 | `../_shared/adminAuth.ts`<br>`../_shared/cors.ts`<br>`../_shared/errors.ts`<br>`../_shared/database.ts`<br>`../_shared/idempotency.ts` | An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled. |
| [admin-recruiter/index.ts](../../insforge/functions/admin-recruiter/index.ts) | 1-4 | `../_shared/adminAuth.ts`<br>`../_shared/cors.ts`<br>`../_shared/errors.ts`<br>`../_shared/database.ts` | An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled. |
| [admin-recruiters/index.ts](../../insforge/functions/admin-recruiters/index.ts) | 2 | `../_shared/adminAuth.ts` | An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled. |
| [admin-reports/index.ts](../../insforge/functions/admin-reports/index.ts) | 1-3 | `../_shared/adminAuth.ts`<br>`../_shared/cors.ts`<br>`../_shared/errors.ts` | An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled. |
| [ai-match/index.ts](../../insforge/functions/ai-match/index.ts) | 2-3 | `../_shared/cors.ts`<br>`../_shared/errors.ts` | An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled. |
| [auth-session/index.ts](../../insforge/functions/auth-session/index.ts) | 2-3 | `../_shared/cors.ts`<br>`../_shared/errors.ts` | An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled. |
| [auth-signup/index.ts](../../insforge/functions/auth-signup/index.ts) | 2-3 | `../_shared/cors.ts`<br>`../_shared/errors.ts` | An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled. |
| [candidate-applications-id/index.ts](../../insforge/functions/candidate-applications-id/index.ts) | 2-4 | `../_shared/cors.ts`<br>`../_shared/errors.ts`<br>`../_shared/idempotency.ts` | An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled. |
| [candidate-applications/index.ts](../../insforge/functions/candidate-applications/index.ts) | 3-5 | `../_shared/cors.ts`<br>`../_shared/errors.ts`<br>`../_shared/idempotency.ts` | An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled. |
| [candidate-profile/index.ts](../../insforge/functions/candidate-profile/index.ts) | 2-4 | `../_shared/cors.ts`<br>`../_shared/errors.ts`<br>`../_shared/idempotency.ts` | An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled. |
| [candidates/index.ts](../../insforge/functions/candidates/index.ts) | 2-5 | `../_shared/cors.ts`<br>`../_shared/errors.ts`<br>`../_shared/database.ts`<br>`../_shared/idempotency.ts` | An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled. |
| [cleanup-idempotency-keys/index.ts](../../insforge/functions/cleanup-idempotency-keys/index.ts) | 1-3 | `../_shared/cors.ts`<br>`../_shared/errors.ts`<br>`../_shared/database.ts` | An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled. |
| [cleanup-stale-resources/index.ts](../../insforge/functions/cleanup-stale-resources/index.ts) | 1-3 | `../_shared/cors.ts`<br>`../_shared/errors.ts`<br>`../_shared/database.ts` | An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled. |
| [company-profile/index.ts](../../insforge/functions/company-profile/index.ts) | 2-4 | `../_shared/cors.ts`<br>`../_shared/errors.ts`<br>`../_shared/idempotency.ts` | An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled. |
| [jobs-id/index.ts](../../insforge/functions/jobs-id/index.ts) | 2 | `../_shared/cors.ts` | An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled. |
| [jobs/index.ts](../../insforge/functions/jobs/index.ts) | 3-5 | `../_shared/cors.ts`<br>`../_shared/errors.ts`<br>`../_shared/idempotency.ts` | An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled. |
| [notification-worker/index.ts](../../insforge/functions/notification-worker/index.ts) | 2-3 | `../_shared/cors.ts`<br>`../_shared/errors.ts` | An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled. |
| [recommendations/index.ts](../../insforge/functions/recommendations/index.ts) | 2-3 | `../_shared/cors.ts`<br>`../_shared/errors.ts` | An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled. |
| [recruiter-dashboard/index.ts](../../insforge/functions/recruiter-dashboard/index.ts) | 2-3 | `../_shared/cors.ts`<br>`../_shared/errors.ts` | An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled. |
| [recruiter-document-proxy/index.ts](../../insforge/functions/recruiter-document-proxy/index.ts) | 2-3 | `../_shared/cors.ts`<br>`../_shared/errors.ts` | An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled. |
| [resume-parse/index.ts](../../insforge/functions/resume-parse/index.ts) | 2-3 | `../_shared/cors.ts`<br>`../_shared/errors.ts` | An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled. |
| [resume-proxy/index.ts](../../insforge/functions/resume-proxy/index.ts) | 2-3 | `../_shared/cors.ts`<br>`../_shared/errors.ts` | An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled. |

---

## 4. Suggested Remediation Plans

To resolve these IDE/TypeScript warnings without breaking compatibility with Deno (which requires explicit `.ts` extensions in Deno environments), the advisor can use one of the following approaches:

### Option A: Enable `allowImportingTsExtensions` (Recommended)
This is the simplest and safest option. It permits `.ts` imports directly in the compiler options, meaning the IDE warnings vanish instantly.

Add the configuration flags to [tsconfig.json](../../insforge/functions/tsconfig.json):
```json
{
  "compilerOptions": {
    ...
    "allowImportingTsExtensions": true,
    "noEmit": true
  }
}
```
*Note: `allowImportingTsExtensions` requires `noEmit` or `emitDeclarationOnly` to be set to true, which is already the case (`noEmit: true`).*

### Option B: Use import maps / Deno configuration
If utilizing Deno CLI/deploy environments natively, configure a `deno.json` file to manage paths, or configure your local IDE Deno extension to handle workspace files within `insforge/functions/` as a Deno workspace, separating it from the main React/Node workspace configuration.
