import { corsHeaders } from '../_shared/cors.ts';
import { json, errorJson, internalError } from '../_shared/errors.ts';
import { escapeOrFilter, capLimit } from '../_shared/query.ts';
import { beginIdempotency, completeIdempotency, releaseIdempotency } from '../_shared/idempotency.ts';
import { requireStaff, checkPermission } from '../_shared/adminAuth.ts';

export default async function handler(request: Request): Promise<Response> {
  const cors = corsHeaders(request);
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const auth = await requireStaff(request);
  if (auth instanceof Response) return auth;
  const { role, db } = auth;

  const idempotencyKey = request.headers.get('x-idempotency-key');

  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.replace(/\/+$/, '').split('/');
    const id = pathParts[pathParts.length - 1] !== '' && pathParts[pathParts.length - 1] !== 'admin-announcements'
      ? pathParts[pathParts.length - 1]
      : null;

    if (request.method === 'GET') {
      const denied = checkPermission(role, { resource: 'content', action: 'view' }, cors);
      if (denied) return denied;

      const search = url.searchParams.get('search') || '';
      const type = url.searchParams.get('type') || '';
      const status = url.searchParams.get('status') || '';
      const page = parseInt(url.searchParams.get('page') || '0');
      const limit = capLimit(url.searchParams.get('limit'), 100, 20);

      let query = db.database
        .from('announcements')
        .select('*', { count: 'exact' });

      if (search) {
        const term = escapeOrFilter(search);
        query = query.or(`title.ilike.%${term}%,message.ilike.%${term}%`);
      }
      if (type && type !== 'all') {
        query = query.eq('type', type);
      }
      if (status === 'active') {
        query = query.eq('is_active', true);
      } else if (status === 'inactive') {
        query = query.eq('is_active', false);
      }

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(page * limit, (page + 1) * limit - 1);

      if (error) throw error;

      const announcements = data ?? [];
      let announcementsWithProgress = announcements;

      if (announcements.length > 0) {
        try {
          const { data: jobsData } = await db.database
            .from('notification_jobs')
            .select('*')
            .contains('payload', { type: 'announcement_fanout' });

          const jobs = jobsData ?? [];
          announcementsWithProgress = announcements.map((ann: any) => {
            const matchingJob = jobs.find((j: any) => j.payload?.announcement_id === ann.id);
            return {
              ...ann,
              fanout_job: matchingJob ? {
                status: matchingJob.status,
                processed_count: matchingJob.payload?.processed_count || 0,
                total_count: matchingJob.payload?.total_count || 0,
              } : null
            };
          });
        } catch (jobsErr) {
          console.warn('[admin-announcements] Failed to fetch fan-out jobs progress:', jobsErr);
        }
      }

      return json({ announcements: announcementsWithProgress, total: count ?? 0 }, 200, cors);
    }

    const idem = await beginIdempotency(db, idempotencyKey, cors);
    if (idem.replay) return idem.replay;

    try {
      if (request.method === 'POST') {
        const body = await request.json();
        const {
          title,
          message,
          type = 'info',
          target_roles = ['candidate', 'recruiter'],
          is_active = false,
          show_as_banner = false,
          scheduled_at = null,
          expires_at = null,
        } = body;

        const actionNeeded = is_active === true ? 'approve' : 'edit';
        const denied = checkPermission(role, { resource: 'content', action: actionNeeded }, cors);
        if (denied) return denied;

        if (!title || !message) {
          return errorJson('invalid_request', 'title and message are required', 400, cors);
        }

        const { data: newAnn, error: insertErr } = await db.database
          .from('announcements')
          .insert([{
            title,
            message,
            type,
            target_roles,
            is_active,
            show_as_banner,
            scheduled_at,
            expires_at,
            image_url: body.image_url ?? null,
            view_count: 0,
            dismiss_count: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }])
          .select()
          .single();

        if (insertErr) throw insertErr;

        if (is_active && target_roles?.length > 0) {
          try {
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7);

            await db.database.from('notification_jobs').insert([{
              user_id: null,
              channel: 'in_app',
              status: 'pending',
              priority: 'normal',
              title,
              message: message.replace(/\*\*/g, ''),
              expires_at: expiresAt.toISOString(),
              payload: {
                type: 'announcement_fanout',
                announcement_id: newAnn.id,
                target_roles,
                processed_count: 0,
                total_count: null,
                last_processed_user_id: null
              },
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }]);
          } catch (notifErr) {
            console.warn('[admin-announcements] Failed to insert fan-out job:', notifErr);
          }
        }

        const resPayload = { announcement: newAnn };
        await completeIdempotency(db, idempotencyKey, 201, resPayload);
        return json(resPayload, 201, cors);
      }

      if (request.method === 'PATCH') {
        if (!id) {
          return errorJson('invalid_request', 'Missing announcement id', 400, cors);
        }

        const body = await request.json();

        const { data: existing, error: getErr } = await db.database
          .from('announcements')
          .select('is_active, title, message, type, target_roles')
          .eq('id', id)
          .single();

        if (getErr || !existing) {
          return errorJson('not_found', 'Announcement not found', 404, cors);
        }

        const isPublishing = body.is_active === true && existing.is_active === false;
        const actionNeeded = isPublishing ? 'approve' : 'edit';
        const denied = checkPermission(role, { resource: 'content', action: actionNeeded }, cors);
        if (denied) return denied;

        const { data, error } = await db.database
          .from('announcements')
          .update({ ...body, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;

        if (body.is_active === true && existing?.is_active === false) {
          try {
            const targetRoles = data.target_roles ?? existing?.target_roles ?? [];
            if (targetRoles.length > 0) {
              const expiresAt = new Date();
              expiresAt.setDate(expiresAt.getDate() + 7);

              await db.database.from('notification_jobs').insert([{
                user_id: null,
                channel: 'in_app',
                status: 'pending',
                priority: 'normal',
                title: data.title ?? existing?.title,
                message: (data.message ?? existing?.message ?? '').replace(/\*\*/g, ''),
                expires_at: expiresAt.toISOString(),
                payload: {
                  type: 'announcement_fanout',
                  announcement_id: id,
                  target_roles: targetRoles,
                  processed_count: 0,
                  total_count: null,
                  last_processed_user_id: null
                },
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }]);
            }
          } catch (notifErr) {
            console.warn('[admin-announcements] Notification fan-out failed on activation:', notifErr);
          }
        }

        const resPayload = { announcement: data };
        await completeIdempotency(db, idempotencyKey, 200, resPayload);
        return json(resPayload, 200, cors);
      }

      if (request.method === 'DELETE') {
        const denied = checkPermission(role, { resource: 'content', action: 'delete' }, cors);
        if (denied) return denied;

        if (!id) {
          return errorJson('invalid_request', 'Missing announcement id', 400, cors);
        }

        await db.database
          .from('announcement_dismissals')
          .delete()
          .eq('announcement_id', id);

        const { error } = await db.database
          .from('announcements')
          .delete()
          .eq('id', id);

        if (error) throw error;

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

