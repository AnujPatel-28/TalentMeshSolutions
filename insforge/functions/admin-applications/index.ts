import { z } from 'npm:zod';
import { corsHeaders } from '../_shared/cors.ts';
import { json, errorJson, internalError } from '../_shared/errors.ts';
import { escapeOrFilter, capLimit } from '../_shared/query.ts';
import { beginIdempotency, completeIdempotency, releaseIdempotency } from '../_shared/idempotency.ts';
import { requireStaff, checkPermission, getServiceKey } from '../_shared/adminAuth.ts';

// R-5 (d): admin-applications is staff-only end-to-end (requireStaff gates the whole
// function), so every PATCH here is a staff-initiated change and always needs a reason.
const reasonSchema = z.string().min(10).max(500);

export default async function handler(request: Request): Promise<Response> {
  const cors = corsHeaders(request);
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const auth = await requireStaff(request);
  if (auth instanceof Response) return auth;
  const { role, db, userId } = auth;

  const idempotencyKey = request.headers.get('x-idempotency-key');

  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.replace(/\/+$/, '').split('/');
    const lastSegment = pathParts[pathParts.length - 1];
    const id = lastSegment && lastSegment !== 'admin-applications' ? lastSegment : null;

    if (request.method === 'GET') {
      const denied = checkPermission(role, { resource: 'applications', action: 'view' }, cors);
      if (denied) return denied;

      const search = url.searchParams.get('search') || '';
      const status = url.searchParams.get('status') || 'all';
      const jobId = url.searchParams.get('job_id');
      const companyId = url.searchParams.get('company_id');
      const page = parseInt(url.searchParams.get('page') || '0');
      const limit = capLimit(url.searchParams.get('limit'), 100, 20);

      let query = db.database
        .from('applications')
        .select(
          '*, jobs(id, title, company_id, companies(name)), profiles(name, email, phone, location, candidate_profiles(headline, experience_years, skills, resume_url, education, linkedin_url, github_url, portfolio_url))',
          { count: 'exact' }
        );

      if (status && status !== 'all') {
        query = query.eq('status', status);
      }
      if (jobId) {
        query = query.eq('job_id', jobId);
      }
      if (companyId) {
        // R-6 company detail "Applications" tab: resolve job ids first rather than filtering
        // on the embedded jobs.company_id, which needs an inner join to be eq()-able.
        const { data: companyJobs } = await db.database.from('jobs').select('id').eq('company_id', companyId);
        const jobIds = (companyJobs ?? []).map((j: any) => j.id);
        query = query.in('job_id', jobIds.length > 0 ? jobIds : ['00000000-0000-0000-0000-000000000000']);
      }

      if (search) {
        const term = escapeOrFilter(search);
        query = query.or(
          `profiles.name.ilike.%${term}%,jobs.title.ilike.%${term}%`
        );
      }

      const { data: applications, count: total, error } = await query
        .order('applied_at', { ascending: false })
        .range(page * limit, (page + 1) * limit - 1);

      if (error) throw error;

      return json({ applications: applications ?? [], total: total ?? 0 }, 200, cors);
    }

    const idem = await beginIdempotency(db, idempotencyKey, cors);
    if (idem.replay) return idem.replay;

    try {
      if (request.method === 'PATCH') {
        const denied = checkPermission(role, { resource: 'applications', action: 'edit' }, cors);
        if (denied) return denied;

        const body = await request.json();
        const targetId = id || url.searchParams.get('id') || body.id;

        if (!targetId) {
          return errorJson('invalid_request', 'Missing application id', 400, cors);
        }

        const reasonResult = reasonSchema.safeParse(body.reason);
        if (!reasonResult.success) {
          return errorJson(
            'invalid_request',
            'reason is required (min 10 characters) for staff-initiated changes',
            400,
            cors,
            { reason: reasonResult.error.flatten().formErrors }
          );
        }
        const reason = reasonResult.data;

        delete body.id;
        delete body.created_at;
        delete body.updated_at;
        delete body.reason;

        const nextStatus: string | undefined = body.status;

        if (nextStatus) {
          const { data: rpcResult, error: rpcError } = await db.database
            .rpc('update_application_status', {
              p_application_id: targetId,
              p_status: nextStatus,
              p_actor_id: userId,
              p_actor_type: 'admin',
              p_metadata: {}
            });

          if (rpcError) {
            if (rpcError.message?.includes('withdrawn')) {
              return errorJson('conflict', 'Cannot update a withdrawn application.', 409, cors);
            }
            throw rpcError;
          }

          const { success, no_op, application } = rpcResult;

          const { data: updatedApp } = await db.database
            .from('applications')
            .select('*, jobs(id, title, company_id, companies(name)), profiles(name, email, phone, location, candidate_profiles(headline, experience_years, skills, resume_url, education, linkedin_url, github_url, portfolio_url))')
            .eq('id', targetId)
            .single();

          const companyId = updatedApp?.jobs?.company_id;
          if (success && !no_op && companyId) {
            try {
              await db.database.from('audit_log').insert([{
                actor_id: userId,
                action: 'application_stage_changed',
                table_name: 'applications',
                record_id: targetId,
                on_behalf_of: companyId,
                reason,
                metadata: { status: nextStatus },
                created_at: new Date().toISOString()
              }]);
            } catch (e) {
              console.warn('Failed to insert audit log entry:', e);
            }

            try {
              const { data: companyAdmins } = await db.database
                .from('company_members')
                .select('user_id')
                .eq('company_id', companyId)
                .eq('member_role', 'admin')
                .eq('status', 'active');

              const jobTitle = updatedApp?.jobs?.title || 'a job posting';
              const candidateName = updatedApp?.profiles?.name || 'A candidate';
              const notifyRows = (companyAdmins ?? [])
                .filter((m: any) => m.user_id)
                .map((m: any) => ({
                  user_id: m.user_id,
                  channel: 'in_app',
                  title: 'Application stage changed by TalentMesh staff',
                  message: `${candidateName}'s application for "${jobTitle}" was moved to "${nextStatus}" by platform staff. Reason: ${reason}`,
                  expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                  payload: { application_id: targetId, job_id: updatedApp?.jobs?.id, status: nextStatus }
                }));
              if (notifyRows.length > 0) {
                await db.database.from('notification_jobs').insert(notifyRows);
              }
            } catch (e) {
              console.warn('Failed to notify company admins:', e);
            }
          }

          if (success && !no_op && application && application.candidate_email) {
            const siteUrl = Deno.env.get('NEXT_PUBLIC_SITE_URL') || 'http://localhost:3000';
            fetch(`${siteUrl}/api/email/send`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-service-key': getServiceKey(),
              },
              body: JSON.stringify({
                to: application.candidate_email,
                template: 'application-status',
                data: {
                  name: application.candidate_name || 'Candidate',
                  email: application.candidate_email,
                  jobTitle: application.job_title,
                  status: nextStatus,
                },
                role: 'hr',
              }),
            }).catch((e: any) =>
              console.error('[admin-applications] Email send failed:', e.message)
            );
          }

          const resPayload = { application: updatedApp };
          await completeIdempotency(db, idempotencyKey, 200, resPayload);
          return json(resPayload, 200, cors);
        }

        const { data, error } = await db.database
          .from('applications')
          .update({ ...body, updated_at: new Date().toISOString() })
          .eq('id', targetId)
          .select()
          .single();

        if (error) throw error;

        const resPayload = { application: data };
        await completeIdempotency(db, idempotencyKey, 200, resPayload);
        return json(resPayload, 200, cors);
      }

      if (request.method === 'DELETE') {
        const denied = checkPermission(role, { resource: 'applications', action: 'delete' }, cors);
        if (denied) return denied;

        const targetId = id || url.searchParams.get('id');

        if (!targetId) {
          return errorJson('invalid_request', 'Missing application id', 400, cors);
        }

        const { error } = await db.database
          .from('applications')
          .delete()
          .eq('id', targetId);

        if (error) throw error;

        try {
          await db.database.from('audit_log').insert([{
            actor_id: userId,
            action: 'application_deleted',
            table_name: 'applications',
            record_id: targetId,
            created_at: new Date().toISOString()
          }]);
        } catch (e) {
          console.warn('Failed to insert audit log entry:', e);
        }

        await completeIdempotency(db, idempotencyKey, 204, null);
        return new Response(null, { status: 204, headers: cors });
      }

      return errorJson('method_not_allowed', 'Method not allowed', 405, cors);
    } catch (workError) {
      await releaseIdempotency(db, idempotencyKey);
      throw workError;
    }
  } catch (err) {
    return internalError(cors, err);
  }
}
