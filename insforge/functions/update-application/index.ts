import { createClient } from 'npm:@insforge/sdk';
import { corsHeaders } from '../_shared/cors.ts';
import { getBaseUrl, getServiceKey } from '../_shared/adminAuth.ts';

const baseUrl = getBaseUrl();
const anonKey = Deno.env.get('NEXT_PUBLIC_INSFORGE_ANON_KEY') || Deno.env.get('INSFORGE_ANON_KEY')!;
const serviceKey = getServiceKey();

export default async function handler(req: Request): Promise<Response> {
  const cors = corsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: cors });
  }

  try {
    const body = await req.json();
    const { id, ids, status } = body;

    if ((!id && !ids) || !status) {
      return new Response(JSON.stringify({ error: 'id or ids, and status required' }), { status: 400, headers: cors });
    }

    const isBulk = Array.isArray(ids);
    const targetIds = isBulk ? ids : [id];

    const insforge = createClient({ baseUrl, anonKey, isServerMode: true });
    insforge.setAccessToken(token);
    const insforgeAdmin = createClient({ baseUrl, anonKey: serviceKey });

    // 1. Authenticate caller securely
    const { data: authData, error: authError } = await insforge.auth.getCurrentUser();
    if (authError || !authData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: cors });
    }
    const actorId = authData.user.id;

    // 2. Resolve actor role/type
    const { data: profile, error: profileError } = await insforgeAdmin.database
      .from('profiles')
      .select('role')
      .eq('id', actorId)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), { status: 404, headers: cors });
    }

    let actorType = 'recruiter';
    if (profile.role === 'admin' || profile.role === 'super_admin') {
      actorType = 'admin';
    } else if (profile.role === 'candidate') {
      actorType = 'candidate';
    }

    // 3. Enforce access control verification before modifying the application status
    if (profile.role !== 'admin' && profile.role !== 'super_admin') {
      // Fetch application details to verify ownership
      const { data: appsDetails, error: appError } = await insforgeAdmin.database
        .from('applications')
        .select('id, status, candidate_id, jobs!inner(recruiter_id)')
        .in('id', targetIds);

      if (appError) {
        return new Response(JSON.stringify({ error: 'Database error fetching applications: ' + appError.message }), { status: 500, headers: cors });
      }

      if (!appsDetails || appsDetails.length === 0) {
        return new Response(JSON.stringify({ error: 'Applications not found' }), { status: 404, headers: cors });
      }

      if (appsDetails.length !== targetIds.length) {
        return new Response(JSON.stringify({ error: 'Some applications were not found' }), { status: 404, headers: cors });
      }

      for (const appDetails of appsDetails) {
        const { candidate_id: candidateId, jobs: job } = appDetails;
        const jobRecruiterId = Array.isArray(job) ? job[0]?.recruiter_id : (job as any)?.recruiter_id;

        if (profile.role === 'candidate') {
          if (isBulk) {
            return new Response(JSON.stringify({ error: 'Forbidden. Candidates cannot perform bulk status updates.' }), { status: 403, headers: cors });
          }
          // Candidates can only update their own application
          if (candidateId !== actorId) {
            return new Response(JSON.stringify({ error: 'Forbidden. You do not own this application.' }), { status: 403, headers: cors });
          }
          // Candidates can only transition status to 'withdrawn'
          if (status !== 'withdrawn') {
            return new Response(JSON.stringify({ error: 'Forbidden. Candidates can only withdraw their application.' }), { status: 403, headers: cors });
          }
        } else if (profile.role === 'recruiter') {
          // Recruiters can only update applications for their own jobs
          if (jobRecruiterId !== actorId) {
            return new Response(JSON.stringify({ error: 'Forbidden. You do not own the job for this application.' }), { status: 403, headers: cors });
          }
        } else {
          return new Response(JSON.stringify({ error: 'Forbidden. Invalid role.' }), { status: 403, headers: cors });
        }
      }
    }

    // Invoke update_application_status RPC for each target ID
    const results = [];
    for (const targetId of targetIds) {
      const { data: rpcResult, error: rpcError } = await insforgeAdmin.database
        .rpc('update_application_status', {
          p_application_id: targetId,
          p_status: status,
          p_actor_id: actorId,
          p_actor_type: actorType,
          p_metadata: {}
        });

      if (rpcError) {
        return new Response(JSON.stringify({ error: rpcError.message }), { status: 500, headers: cors });
      }
      results.push(rpcResult);
    }

    // Fetch full application details to return to the UI (backward compatibility)
    const { data: updatedApps, error: fetchUpdatedError } = await insforgeAdmin.database
      .from('applications')
      .select('*, jobs!inner(title, recruiter_id), profiles!inner(name, id)')
      .in('id', targetIds);

    if (fetchUpdatedError) {
      return new Response(JSON.stringify({ error: fetchUpdatedError.message }), { status: 500, headers: cors });
    }

    // Send email notification (fire-and-forget) if not a no-op
    const siteUrl = Deno.env.get('NEXT_PUBLIC_SITE_URL') || 'http://localhost:3000';
    const emailServiceKey = Deno.env.get('INSFORGE_SERVICE_KEY') || '';

    for (const rpcResult of results) {
      const { success, no_op, application } = rpcResult;
      if (success && !no_op && application && application.candidate_email) {
        fetch(`${siteUrl}/api/email/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-service-key': emailServiceKey,
          },
          body: JSON.stringify({
            to: application.candidate_email,
            template: 'application-status',
            data: {
              name: application.candidate_name || 'Candidate',
              email: application.candidate_email,
              jobTitle: application.job_title,
              status,
            },
            role: 'hr',
          }),
        }).catch((e: any) => console.error('[update-application] Email failed:', e.message));
      }
    }

    return new Response(JSON.stringify({
      success: true,
      application: isBulk ? undefined : (updatedApps?.[0] || null),
      applications: updatedApps
    }), { 
      status: 200, 
      headers: { ...cors, 'Content-Type': 'application/json' } 
    });

  } catch (err: any) {
    console.error('Update Application Error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: cors });
  }
}
