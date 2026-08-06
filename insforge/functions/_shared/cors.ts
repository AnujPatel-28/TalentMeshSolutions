// CORS with an explicit origin allowlist (R-2, fixes D-10). Origins come from the
// ALLOWED_ORIGINS secret (comma-separated). The localhost:3000 fallback exists ONLY outside
// production (APP_ENV !== 'production'; DENO_-prefixed env vars are reserved by Deno
// Subhosting and reject the whole deployment). The old `Access-Control-Allow-Origin: '*'` +
// Allow-Credentials combination is gone: the allowed origin is echoed back, or omitted
// entirely for disallowed origins (the browser then blocks the response).
// Server-to-server callers (Next.js API routes) send no Origin header and are unaffected.

export function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin') || '';
  const configured = (Deno.env.get('ALLOWED_ORIGINS') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const allowlist =
    Deno.env.get('APP_ENV') === 'production'
      ? configured
      : configured.length > 0
        ? configured
        : ['http://localhost:3000'];

  const allowed = origin !== '' && allowlist.includes(origin);

  return {
    ...(allowed ? { 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin' } : {}),
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, x-idempotency-key',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  };
}
