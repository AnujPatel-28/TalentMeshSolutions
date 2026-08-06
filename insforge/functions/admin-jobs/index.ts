import { z } from 'npm:zod';
import { corsHeaders } from '../_shared/cors.ts';
import { json, errorJson, internalError } from '../_shared/errors.ts';
import { escapeOrFilter, capLimit } from '../_shared/query.ts';
import { beginIdempotency, completeIdempotency, releaseIdempotency } from '../_shared/idempotency.ts';
import { requireStaff, checkPermission } from '../_shared/adminAuth.ts';
import { isValidJobStatusTransition } from '../_shared/jobStatusTransitions.ts';

// D-16 (P0): the ONLY fields admin PATCH may write. `.strict()` rejects any other key in the
// body — this IS the allowlist. Column names match the live `jobs` table, not doc 14 R-5's
// prose list verbatim (that list says `experience`/`skills`; the real columns are
// experience_min/experience_max/skills_required — see 5-R5 report).
const jobPatchSchema = z
  .object({
    title: z.string().min(3).max(120).optional(),
    description: z.string().min(50).max(12000).optional(),
    requirements: z.array(z.string()).optional(),
    location: z.string().min(2).max(120).optional(),
    salary_min: z.number().min(0).nullable().optional(),
    salary_max: z.number().min(0).nullable().optional(),
    experience_min: z.number().min(0).max(30).nullable().optional(),
    experience_max: z.number().min(0).max(30).nullable().optional(),
    department: z.string().max(80).nullable().optional(),
    skills_required: z.array(z.string()).optional(),
    status: z.enum(['draft', 'active', 'paused', 'closed']).optional(),
    reason: z.string().min(10).max(500),
  })
  .strict();

export default async function handler(request: Request): Promise<Response> {
  const cors = corsHeaders(request);
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const auth = await requireStaff(request);
  if (auth instanceof Response) return auth;
  const { role, db, userId } = auth;

  const idempotencyKey = request.headers.get('x-idempotency-key');

  try {
    const url = new URL(request.url);

    if (request.method === 'GET') {
      const denied = checkPermission(role, { resource: 'jobs', action: 'view' }, cors);
      if (denied) return denied;

      if (url.searchParams.get('action') === 'get-detail') {
        const id = url.searchParams.get('id');
        if (!id) return errorJson('invalid_request', 'ID required', 400, cors);

        const { data: job, error: jobError } = await db.database
          .from('jobs')
          .select(
            '*, companies!jobs_company_id_fkey(id,name,gstin,status), profiles!jobs_recruiter_id_fkey(id,name,email)'
          )
          .eq('id', id)
          .single();
        if (jobError || !job) return errorJson('not_found', 'Job not found', 404, cors);

        const { data: appRows, error: appError } = await db.database
          .from('applications')
          .select('status')
          .eq('job_id', id);
        if (appError) throw appError;

        const applicationsByStage: Record<string, number> = {};
        for (const row of appRows ?? []) {
          applicationsByStage[row.status] = (applicationsByStage[row.status] ?? 0) + 1;
        }

        return json(
          {
            job,
            company: job.companies ?? null,
            recruiter: job.profiles ?? null,
            approval_status: job.approval_status,
            applicationsByStage,
          },
          200,
          cors
        );
      }

      const search = url.searchParams.get('search');
      const status = url.searchParams.get('status');
      const companyId = url.searchParams.get('company_id');
      const department = url.searchParams.get('department');
      const skill = url.searchParams.get('skill');
      const title = url.searchParams.get('title');
      const location = url.searchParams.get('location');
      const experience = url.searchParams.get('experience');
      const salary = url.searchParams.get('salary');
      const page = parseInt(url.searchParams.get('page') || '0');
      const limit = capLimit(url.searchParams.get('limit'), 100, 20);

      let query = db.database.from('jobs').select('*, companies!jobs_company_id_fkey(*)', { count: 'exact' });

      if (companyId) {
        query = query.eq('company_id', companyId);
      }
      if (search) {
        const term = escapeOrFilter(search);
        query = query.or(`title.ilike.%${term}%,location.ilike.%${term}%,department.ilike.%${term}%`);
      }
      if (status) {
        if (status === 'pending' || status === 'approved' || status === 'rejected') {
          // W5: filter on approval_status (054 column), not the is_approved+status dual-column inference
          query = query.eq('approval_status', status);
        } else {
          // pass-through for publication status (draft/active/paused/closed)
          query = query.eq('status', status);
        }
      }
      if (department && department !== 'all') {
        query = query.eq('department', department);
      }
      if (skill && skill !== 'all') {
        query = query.contains('skills_required', [skill]);
      }
      if (title && title !== 'all') {
        query = query.eq('title', title);
      }
      if (location && location !== 'all') {
        const term = escapeOrFilter(location);
        query = query.ilike('location', `%${term}%`);
      }
      if (experience && experience !== 'all') {
        if (experience === '0-1') {
          query = query.lte('experience_min', 1);
        } else if (experience === '1-3') {
          query = query.gte('experience_max', 1).lte('experience_min', 3);
        } else if (experience === '3-5') {
          query = query.gte('experience_max', 3).lte('experience_min', 5);
        } else if (experience === '5-8') {
          query = query.gte('experience_max', 5).lte('experience_min', 8);
        } else if (experience === '8+') {
          query = query.gte('experience_max', 8);
        }
      }
      if (salary && salary !== 'all') {
        if (salary === 'under-500000') {
          query = query.lt('salary_max', 500000);
        } else if (salary === '500000-1000000') {
          query = query.gte('salary_max', 500000).lte('salary_min', 1000000);
        } else if (salary === '1000000-2000000') {
          query = query.gte('salary_max', 1000000).lte('salary_min', 2000000);
        } else if (salary === '2000000-4000000') {
          query = query.gte('salary_max', 2000000).lte('salary_min', 4000000);
        } else if (salary === '4000000+') {
          query = query.gte('salary_min', 4000000);
        }
      }

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(page * limit, (page + 1) * limit - 1);

      if (error) throw error;

      let compData = null;
      if (url.searchParams.get('includeMeta') === 'true') {
        const { data: companiesData } = await db.database.from('companies').select('id, name');
        compData = companiesData;
      }

      return json({ items: data, total: count, companies: compData }, 200, cors);
    }

    const idem = await beginIdempotency(db, idempotencyKey, cors);
    if (idem.replay) return idem.replay;

    try {
      if (request.method === 'PATCH') {
        const denied = checkPermission(role, { resource: 'jobs', action: 'edit' }, cors);
        if (denied) return denied;

        const id = url.searchParams.get('id');
        if (!id) {
          return errorJson('invalid_request', 'ID required', 400, cors);
        }

        const rawBody = await request.json();
        const parsed = jobPatchSchema.safeParse(rawBody);
        if (!parsed.success) {
          const fieldErrors = parsed.error.flatten().fieldErrors;
          return errorJson('invalid_request', 'Invalid PATCH body', 400, cors, fieldErrors);
        }
        const { reason, status: nextStatus, ...fields } = parsed.data;

        const { data: existing, error: existingError } = await db.database
          .from('jobs')
          .select('status, company_id')
          .eq('id', id)
          .single();
        if (existingError || !existing) return errorJson('not_found', 'Job not found', 404, cors);

        if (nextStatus && !isValidJobStatusTransition(existing.status, nextStatus)) {
          return errorJson(
            'invalid_transition',
            `Cannot transition job from "${existing.status}" to "${nextStatus}"`,
            409,
            cors
          );
        }

        const updatePayload = { ...fields, ...(nextStatus ? { status: nextStatus } : {}) };
        const { data, error } = await db.database.from('jobs').update(updatePayload).eq('id', id).select().single();
        if (error) throw error;

        try {
          await db.database.from('audit_log').insert([{
            actor_id: userId,
            action: 'job_updated',
            table_name: 'jobs',
            record_id: id,
            on_behalf_of: existing.company_id,
            reason,
            metadata: { fields: Object.keys(updatePayload) },
            created_at: new Date().toISOString()
          }]);
        } catch (e) {
          console.warn('Failed to insert audit log entry:', e);
        }

        const resPayload = { job: data };
        await completeIdempotency(db, idempotencyKey, 200, resPayload);
        return json(resPayload, 200, cors);
      }

      if (request.method === 'POST') {
        const body = await request.json();
        const { action, id, ids, updates, ...jobData } = body;
        
        if (action === 'approve') {
          const denied = checkPermission(role, { resource: 'jobs', action: 'approve' }, cors);
          if (denied) return denied;

          if (!id) return errorJson('invalid_request', 'ID required', 400, cors);
          // W5: write approval_status; is_approved kept for backward compat until cleanup migration
          const { error } = await db.database.from('jobs')
            .update({ approval_status: 'approved', is_approved: true })
            .eq('id', id);
          if (error) throw error;
          
          try {
            await db.database.from('audit_log').insert([{
              actor_id: userId,
              action: 'job_approved',
              table_name: 'jobs',
              record_id: id,
              metadata: { reason: body.reason || 'Admin approved job listing' },
              created_at: new Date().toISOString()
            }]);
          } catch (e) {
            console.warn('Failed to insert audit log entry:', e);
          }

          const resPayload = { success: true };
          await completeIdempotency(db, idempotencyKey, 200, resPayload);
          return json(resPayload, 200, cors);
        }

        if (action === 'reject') {
          const denied = checkPermission(role, { resource: 'jobs', action: 'approve' }, cors);
          if (denied) return denied;

          if (!id) return errorJson('invalid_request', 'ID required', 400, cors);
          // W5: write approval_status only; do NOT force status='closed' (publication is recruiter-owned)
          const { error } = await db.database.from('jobs')
            .update({ approval_status: 'rejected', is_approved: false })
            .eq('id', id);
          if (error) throw error;

          try {
            await db.database.from('audit_log').insert([{
              actor_id: userId,
              action: 'job_rejected',
              table_name: 'jobs',
              record_id: id,
              metadata: { reason: body.reason || 'Admin rejected job listing' },
              created_at: new Date().toISOString()
            }]);
          } catch (e) {
            console.warn('Failed to insert audit log entry:', e);
          }

          const resPayload = { success: true };
          await completeIdempotency(db, idempotencyKey, 200, resPayload);
          return json(resPayload, 200, cors);
        }

        if (action === 'bulk-update' && ids) {
          const denied = checkPermission(role, { resource: 'jobs', action: 'edit' }, cors);
          if (denied) return denied;

          // Approval state is NOT writable here. This action runs under jobs:edit and writes no
          // audit_log entry, so it must not be able to moderate a job. Approval goes through the
          // 'approve'/'reject' actions, which require jobs:approve, write approval_status and
          // is_approved together, and record an audit entry.
          if (updates && ('is_approved' in updates || 'approval_status' in updates)) {
            return errorJson(
              'invalid_request',
              'Approval state cannot be changed via bulk-update; use the approve or reject action',
              400,
              cors
            );
          }

          const { error } = await db.database.from('jobs').update(updates).in('id', ids);
          if (error) throw error;
          const resPayload = { success: true };
          await completeIdempotency(db, idempotencyKey, 200, resPayload);
          return json(resPayload, 200, cors);
        }

        if (action === 'bulk-delete' && ids) {
          const denied = checkPermission(role, { resource: 'jobs', action: 'delete' }, cors);
          if (denied) return denied;

          const { error } = await db.database.from('jobs').delete().in('id', ids);
          if (error) throw error;

          try {
            await db.database.from('audit_log').insert([{
              actor_id: userId,
              action: 'jobs_bulk_deleted',
              table_name: 'jobs',
              record_id: ids[0],
              metadata: { deleted_ids: ids, count: ids.length },
              created_at: new Date().toISOString()
            }]);
          } catch (e) {
            console.warn('Failed to insert audit log entry:', e);
          }

          const resPayload = { success: true };
          await completeIdempotency(db, idempotencyKey, 200, resPayload);
          return json(resPayload, 200, cors);
        }

        const denied = checkPermission(role, { resource: 'jobs', action: 'edit' }, cors);
        if (denied) return denied;

        // Approval state is NOT writable on create, for the same reason as bulk-update above: this
        // branch runs under jobs:edit and writes no audit_log entry, so it must not be able to
        // publish an already-approved job. New jobs always start pending; moderation goes through
        // the 'approve'/'reject' actions, which require jobs:approve and record an audit entry.
        if ('approval_status' in jobData || 'is_approved' in jobData) {
          return errorJson(
            'invalid_request',
            'Approval state cannot be set on create; use the approve or reject action',
            400,
            cors
          );
        }

        const { data, error } = await db.database
          .from('jobs')
          .insert({ ...jobData, approval_status: 'pending' })
          .select()
          .single();
        if (error) throw error;
        const resPayload = { job: data };
        await completeIdempotency(db, idempotencyKey, 201, resPayload);
        return json(resPayload, 201, cors);
      }

      if (request.method === 'DELETE') {
        const denied = checkPermission(role, { resource: 'jobs', action: 'delete' }, cors);
        if (denied) return denied;

        const id = url.searchParams.get('id');
        if (!id) return errorJson('invalid_request', 'ID required', 400, cors);
        const { error } = await db.database.from('jobs').delete().eq('id', id);
        if (error) throw error;

        try {
          await db.database.from('audit_log').insert([{
            actor_id: userId,
            action: 'job_deleted',
            table_name: 'jobs',
            record_id: id,
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
  } catch (error) {
    return internalError(cors, error);
  }
}
