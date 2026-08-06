// @ts-nocheck — Deno edge function
import { corsHeaders } from '../_shared/cors.ts';
import { json, errorJson, internalError } from '../_shared/errors.ts';
import { requireStaff, checkPermission } from '../_shared/adminAuth.ts';

export default async function handler(request: Request): Promise<Response> {
  const cors = corsHeaders(request);
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const auth = await requireStaff(request);
  if (auth instanceof Response) return auth;
  const { role, db } = auth;

  try {
    if (request.method !== 'GET') {
      return errorJson('method_not_allowed', 'Method not allowed', 405, cors);
    }

    const denied = checkPermission(role, { resource: 'billing', action: 'view' }, cors);
    if (denied) return denied;

    const { data, error } = await db.database
      .from('subscriptions')
      .select(`
        *,
        company:companies(id, name, logo_url),
        recruiter:profiles!recruiter_id(id, name, email)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return json(data || [], 200, cors);
  } catch (err) {
    return internalError(cors, err);
  }
}
// Billing dashboard stays read-only; no POST/PATCH/DELETE endpoints exposed.
