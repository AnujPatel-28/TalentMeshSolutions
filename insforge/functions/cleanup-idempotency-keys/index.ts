import { corsHeaders } from '../_shared/cors.ts';
import { json, errorJson, internalError } from '../_shared/errors.ts';
import { getServiceClient } from '../_shared/adminAuth.ts';

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export default async function handler(request: Request): Promise<Response> {
  const cors = corsHeaders(request);
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const cronSecret = Deno.env.get('CRON_SECRET');
    if (!cronSecret) {
      return errorJson('server_error', 'CRON_SECRET is not configured', 500, cors);
    }

    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '') || '';

    if (!token || !timingSafeEqual(token, cronSecret)) {
      return errorJson('unauthorized', 'Unauthorized', 401, cors);
    }

    const db = getServiceClient();

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    const nowIso = now.toISOString();

    const { error: expError } = await db.database
      .from('idempotency_keys')
      .delete()
      .lt('expires_at', nowIso);

    if (expError) throw expError;

    const { error: abndError } = await db.database
      .from('idempotency_keys')
      .delete()
      .eq('status', 0)
      .lt('created_at', oneHourAgo);

    if (abndError) throw abndError;

    return json({ success: true, message: 'Expired and abandoned idempotency keys cleaned successfully.' }, 200, cors);
  } catch (error) {
    return internalError(cors, error);
  }
}
