# Message to send to InsForge support

> The original deploy blocker turned out to be **our** bug, found via `insforge diagnose --ai`:
> InsForge does not support `_shared/` cross-function imports, and one function still stored with a
> raw `../_shared/cors.ts` import fails the **whole** project build. Bundling the 7 offenders fixed
> it. What remains below is the part that is genuinely InsForge-side.

---

**Subject:** Three issues found while debugging a failed edge-function deploy

Hi,

**Project ID:** `da785b2b-7ece-483d-8879-9d0a9ea06932`
**Base URL:** `https://sytk3jgv.ap-southeast.insforge.app`

We spent a day blocked on `The deployment failed: Module not found "file:///src/_shared/cors.ts"`.
We've since fixed it ourselves — `_shared/` cross-function imports aren't supported, so we bundled
every function to be self-contained. Three things made that much harder to find than it should
have been, plus one bug that will bite us again.

### 1. The error names a file the same build just downloaded

The build log downloads `file:///src/_shared/cors.ts` and then reports it missing, on consecutive
lines:

```
[info] Downloaded file:///src/_shared/cors.ts (57/63)
...
[error] The deployment failed: Module not found "file:///src/_shared/cors.ts".
```

If `_shared/` layouts are unsupported, could the build fail with something like *"function
`<slug>` imports `../_shared/cors.ts`; cross-function imports are not supported — bundle before
upload"*? Naming the **offending slug** is the key part. Ours took a scan of all 54 functions to
find, because a function with **zero imports** also fails — one bad function fails the whole build,
and the error points at the shared file rather than at the importer.

### 2. Benign code is rejected as a "dangerous pattern"

```
Error updating function: Code contains a potentially dangerous pattern.
```

Both of these were rejected — plain TypeScript, no eval, no dynamic import, no network access:

```typescript
// rejected
function buildHeaders() {
  return { 'Content-Type': 'application/json' };
}
export default async function handler(request: Request): Promise<Response> {
  return new Response(JSON.stringify({ probe: 'B' }), { status: 200, headers: buildHeaders() });
}
```

```typescript
// also rejected — a CORS headers helper
function corsHeaders(request) {
  const origin = request.headers.get('origin') || '';
  return {
    ...(origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}),
    'Content-Type': 'application/json',
  };
}
```

The same handler **without** a local helper function was accepted. What pattern is being matched?
Since you require self-contained functions, local helper functions are unavoidable — and our
bundled functions are full of them.

### 3. Deploy logs are unreachable, and failures aren't recorded

- `insforge logs function-deploy.logs` returns `OSS request failed: 504` every time. We could only
  read build logs from the CLI's own deploy output.
- `insforge diagnose` reports `function-deploy.logs: 0` recent errors, despite roughly ten failed
  builds that day.

### Smaller notes

- `insforge functions deploy` succeeds in **persisting** code even when the build fails —
  `updatedAt`/`deployedAt` both advance while the runtime keeps serving the previous build. That
  made it look like our changes had shipped when they hadn't. Could a failed build leave those
  timestamps untouched, or expose a `lastBuildStatus`?
- The CLI has no `feedback` command, which is why this is coming through the support thread.

### Credit where due

`insforge diagnose --ai` gave us the actual answer — that `_shared/` isn't supported and functions
must be self-contained — after a day of dead ends. That's a genuinely good feature. It would be
even better surfaced in the build error itself.

Thanks,
Anuj — TalentMesh Solutions
