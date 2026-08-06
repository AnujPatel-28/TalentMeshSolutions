import { createClient } from 'npm:@insforge/sdk';
import { corsHeaders } from '../_shared/cors.ts';
import { json, errorJson, internalError } from '../_shared/errors.ts';
import { beginIdempotency, completeIdempotency, releaseIdempotency } from '../_shared/idempotency.ts';

export default async function handler(req: Request): Promise<Response> {
  const cors = corsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return errorJson('unauthorized', 'You must be logged in to continue.', 401, cors);
  }

  const baseUrl = Deno.env.get('NEXT_PUBLIC_INSFORGE_URL') || Deno.env.get('INSFORGE_URL') || '';
  const anonKey = Deno.env.get('NEXT_PUBLIC_INSFORGE_ANON_KEY') || Deno.env.get('INSFORGE_ANON_KEY') || '';
  const serviceKey = Deno.env.get('INSFORGE_SERVICE_KEY') || Deno.env.get('INSFORGE_ADMIN_KEY') || Deno.env.get('API_KEY') || '';

  try {
    const insforge = createClient({ baseUrl, anonKey, isServerMode: true });
    insforge.setAccessToken(token);
    const { data: authData, error: authError } = await insforge.auth.getCurrentUser();

    if (authError || !authData?.user || authData.user.id === 'project-admin-with-api-key') {
      return errorJson('unauthorized', 'You must be logged in to continue.', 401, cors);
    }

    const insforgeAdmin = createClient({ baseUrl, anonKey: serviceKey, isServerMode: true });

    const { data: profile } = await insforgeAdmin.database
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single();

    if (profile?.role === 'admin' || profile?.role === 'super_admin' || profile?.role === 'recruiter') {
      return errorJson('forbidden', 'Only candidates can access this endpoint.', 403, cors);
    }

    const candidateId = authData.user.id;
    const url = new URL(req.url);
    const applicationId = url.searchParams.get('id');

    if (!applicationId) {
      return errorJson('invalid_request', 'Application ID is required', 400, cors);
    }

    if (req.method === 'GET') {
      const { data, error } = await insforgeAdmin.database
        .from('applications')
        .select(
          'id, status, applied_at, updated_at, cover_letter, ' +
          'jobs(title, location, type, salary_min, salary_max, currency, companies(name, logo_url))'
        )
        .eq('id', applicationId)
        .eq('candidate_id', candidateId)
        .single();

      if (error || !data) {
        return errorJson('not_found', 'Application not found.', 404, cors);
      }

      return json({ application: data }, 200, cors);
    }

    if (req.method === 'PATCH') {
      const idempotencyKey = req.headers.get('x-idempotency-key');
      const idem = await beginIdempotency(insforgeAdmin, idempotencyKey, cors);
      if (idem.replay) return idem.replay;

      try {
        const body = await req.json();
        if (body.status !== 'withdrawn') {
          return errorJson('invalid_request', "Only 'withdrawn' status updates are allowed via this endpoint.", 400, cors);
        }

        const { data: existing, error: existingError } = await insforgeAdmin.database
          .from('applications')
          .select('id, status')
          .eq('id', applicationId)
          .eq('candidate_id', candidateId)
          .single();

        if (existingError || !existing) {
          return errorJson('not_found', 'Application not found.', 404, cors);
        }

        if (existing.status === 'withdrawn') {
          const resPayload = { id: applicationId, status: 'withdrawn' };
          await completeIdempotency(insforgeAdmin, idempotencyKey, 200, resPayload);
          return json(resPayload, 200, cors);
        }

        const WITHDRAWABLE_STATUSES = ['applied', 'reviewing', 'shortlisted', 'interviewing', 'offered'];
        if (!WITHDRAWABLE_STATUSES.includes(existing.status)) {
          return errorJson('conflict', `Cannot withdraw an application with status '${existing.status}'.`, 409, cors);
        }

        const { data: rpcResult, error: rpcError } = await insforgeAdmin.database
          .rpc('update_application_status', {
            p_application_id: applicationId,
            p_status: 'withdrawn',
            p_actor_id: candidateId,
            p_actor_type: 'candidate',
            p_metadata: {}
          });

        if (rpcError || !rpcResult?.success) {
          throw new Error(`Failed to withdraw application: ${rpcError?.message || 'Unknown RPC error'}`);
        }

        const resPayload = { id: applicationId, status: 'withdrawn' };
        await completeIdempotency(insforgeAdmin, idempotencyKey, 200, resPayload);
        return json(resPayload, 200, cors);
      } catch (workError) {
        await releaseIdempotency(insforgeAdmin, idempotencyKey);
        throw workError;
      }
    }

    return errorJson('method_not_allowed', 'Method not allowed', 405, cors);
  } catch (err) {
    return internalError(cors, err);
  }
}
