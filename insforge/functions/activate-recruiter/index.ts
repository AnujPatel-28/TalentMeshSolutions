import { createClient } from 'npm:@insforge/sdk';
import { corsHeaders } from '../_shared/cors.ts';
import { json, errorJson, internalError } from '../_shared/errors.ts';
import { beginIdempotency, completeIdempotency, releaseIdempotency } from '../_shared/idempotency.ts';

export default async function handler(request: Request): Promise<Response> {
  const cors = corsHeaders(request);
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    if (request.method !== 'POST') {
      return errorJson('method_not_allowed', 'Method not allowed', 405, cors);
    }

    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '');
    if (!token) return errorJson('unauthorized', 'Missing auth', 401, cors);

    const baseUrl = Deno.env.get('NEXT_PUBLIC_INSFORGE_URL') || Deno.env.get('INSFORGE_URL') || '';
    const anonKey = Deno.env.get('NEXT_PUBLIC_INSFORGE_ANON_KEY') || Deno.env.get('INSFORGE_ANON_KEY') || '';
    const serviceKey = Deno.env.get('INSFORGE_SERVICE_KEY') || Deno.env.get('INSFORGE_ADMIN_KEY') || Deno.env.get('API_KEY') || '';

    const verifyClient = createClient({
      baseUrl,
      anonKey,
      edgeFunctionToken: token,
      isServerMode: true,
    });
    
    const { data: authData, error: authError } = await verifyClient.auth.getCurrentUser();
    if (authError || !authData?.user?.id) {
      return errorJson('unauthorized', 'Unauthorized, invalid token', 401, cors);
    }

    const db = createClient({ baseUrl, anonKey: serviceKey, isServerMode: true });
    const idempotencyKey = request.headers.get('x-idempotency-key');
    const idem = await beginIdempotency(db, idempotencyKey, cors);
    if (idem.replay) return idem.replay;

    try {
      const body = await request.json();
      const { userId } = body;

      if (!userId) {
        return errorJson('invalid_request', 'userId is required', 400, cors);
      }
      
      if (userId !== authData.user.id) {
        return errorJson('forbidden', 'Forbidden: User ID mismatch', 403, cors);
      }

      const { error } = await db.database
        .from('profiles')
        .update({ status: 'active', completed_onboarding: true })
        .eq('id', userId);
      if (error) throw error;

      const { error: rpError } = await db.database
        .from('recruiter_profiles')
        .update({ is_approved: true })
        .eq('id', userId);
      if (rpError) throw rpError;

      const { data: recruiterProfile } = await db.database
        .from('profiles')
        .select('email, name')
        .eq('id', userId)
        .single();

      if (recruiterProfile?.email) {
        const siteUrl = Deno.env.get('NEXT_PUBLIC_SITE_URL') || 'http://localhost:3000';
        fetch(`${siteUrl}/api/email/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-service-key': serviceKey,
          },
          body: JSON.stringify({
            to: recruiterProfile.email,
            template: 'recruiter-welcome',
            data: {
              name: recruiterProfile.name || 'Recruiter',
              email: recruiterProfile.email,
            },
            role: 'hr',
          }),
        }).catch((e: any) => console.error('[activate-recruiter] Email failed:', e.message));
      }

      const resPayload = { success: true, message: 'Recruiter account activated' };
      await completeIdempotency(db, idempotencyKey, 200, resPayload);
      return json(resPayload, 200, cors);
    } catch (workError) {
      await releaseIdempotency(db, idempotencyKey);
      throw workError;
    }
  } catch (error) {
    return internalError(cors, error);
  }
}
