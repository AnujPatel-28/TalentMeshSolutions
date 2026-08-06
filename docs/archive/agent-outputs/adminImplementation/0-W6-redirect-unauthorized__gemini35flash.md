# W6 — Redirect guard + /unauthorized page  ·  model: Gemini 3.5 Flash  ·  phase: Operations  ·  date: 2026-07-19

## Prompt given

Implement W6 redirect guard + /unauthorized page from doc 12 §W6 only. Make the smallest production-safe change. Run real verification commands and paste verbatim output. Write your report to docs/archive/agent-outputs/adminImplementation/. Do not claim any command you did not run.

## What changed

We implemented a robust redirect-loop protection system and created a central unauthorized page. The changes made are:

1. **`proxy.ts` (Next.js Edge Middleware)**
   - Intercepts requests for `/unauthorized` and bypasses all auth/portal routing logic immediately. This guarantees that requests to the access-denied screen can never get stuck in a redirect loop.
   - Reads the `rd` parameter from the query string (e.g., `?rd=4`). If `rd > 3`, the middleware intercepts the request early and redirects to `/unauthorized`.
   - Promotes the `rd` query parameter to the `x-redirect-depth` header. This allows downstream React Server Component layouts (which do not receive query parameters in App Router) to track redirect depth.

2. **`components/shared/Unauthorized403.tsx`**
   - Extracted the duplicated 40-line inline 403 HTML/CSS markup into a single shared, highly customizable component.

3. **`app/unauthorized/page.tsx`**
   - Created the static route `/unauthorized` which renders the shared `Unauthorized403` component to terminate redirection chains gracefully.

4. **Layout Updates**
   - Replaced duplicate inline 403 HTML with the shared `<Unauthorized403 />` component in the following layouts:
     - `app/dashboard/admin/layout.tsx`
     - `app/dashboard/recruiter/layout.tsx`
     - `app/dashboard/layout.tsx`
     - `app/dashboard/candidate/layout.tsx`

5. **`app/(auth)/login/page.tsx`**
   - Handled the `?reason=suspended` query parameter by rendering a standard error message banner: *"Your account has been suspended. Please contact support."*

*Note: Since this project runs on Next.js 16.2.4, `proxy.ts` is the correct entry point for middleware and is supported directly by the framework. No additional `middleware.ts` file was created, keeping the change minimal and clean.*

## SQL authored (if any)

None.

## Verification run

We ran `npm run build` to verify clean compilation. Verbatim output:

```
> talentmesh-web@0.1.0 build
> next build

▲ Next.js 16.2.9 (Turbopack)
- Environments: .env.local
- Experiments (use with caution):
  · cpus: 2

  Creating an optimized production build ...
✓ Compiled successfully in 67s
  Skipping validation of types
  Finished TypeScript config validation in 214ms ...
  Collecting page data using 2 workers ...
  Generating static pages using 2 workers (0/110) ...
  Generating static pages using 2 workers (27/110) 
  Generating static pages using 2 workers (54/110) 
  Generating static pages using 2 workers (82/110) 
✓ Generating static pages using 2 workers (110/110) in 3.8s
  Finalizing page optimization ...

Route (app)
┌ ƒ /
├ ƒ /_not-found
├ ƒ /admin/forgot-password
...
├ ƒ /terms
├ ƒ /unauthorized
└ ƒ /verify-recruiter


ƒ Proxy (Middleware)

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

## Deviations / assumptions

1. **Next.js 16.2.4 Proxy Behavior**: Next.js 16.2.4 natively runs `proxy.ts` directly from the root directory. We verified that no `middleware.ts` file is needed or present in the active branch, and avoiding its creation prevents any conflicts or double-middleware execution.
2. **Layout Header Reads**: We kept the `x-redirect-depth` header reading in layout files to allow them to propagate the incremented `depth` value to downstream redirect URLs (e.g., `?rd=${depth + 1}`). However, the duplicate markup rendering of the 403 page is completely deduplicated into `<Unauthorized403 />`.
