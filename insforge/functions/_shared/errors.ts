// Uniform response helpers (R-2 / doc 14 §6): every error is `{ error, code, fieldErrors? }`,
// stack traces and internal messages never leave the function outside development.

export function json(body: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), { status, headers });
}

export function errorJson(
  code: string,
  message: string,
  status: number,
  headers: Record<string, string>,
  fieldErrors?: Record<string, string[]>,
): Response {
  return json({ error: message, code, ...(fieldErrors ? { fieldErrors } : {}) }, status, headers);
}

// Catch-all for unexpected throws: logs the real error server-side, returns a generic body.
// Outside production a `detail` field carries the message to ease debugging.
export function internalError(headers: Record<string, string>, err: unknown): Response {
  console.error('[internal_error]', err);
  const detail =
    Deno.env.get('APP_ENV') !== 'production' && err instanceof Error ? { detail: err.message } : {};
  return json({ error: 'Internal Server Error', code: 'internal_error', ...detail }, 500, headers);
}
