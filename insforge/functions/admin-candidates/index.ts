// Reference migration onto the R-2 _shared kit (doc 14). Deploy bundles _shared imports
// into this file via scripts/deploy-all-functions.js — never copy kit code in by hand.
import { corsHeaders } from '../_shared/cors.ts';
import { json, errorJson, internalError } from '../_shared/errors.ts';
import { escapeOrFilter, capLimit } from '../_shared/query.ts';
import { beginIdempotency, completeIdempotency, releaseIdempotency } from '../_shared/idempotency.ts';
import { requireStaff, checkPermission, getBaseUrl, getServiceKey } from '../_shared/adminAuth.ts';

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
      const denied = checkPermission(role, { resource: 'candidates', action: 'view' }, cors);
      if (denied) return denied;

      const search = url.searchParams.get('search');
      const discoverable = url.searchParams.get('discoverable');
      const page = parseInt(url.searchParams.get('page') || '0');
      const limit = capLimit(url.searchParams.get('limit'), 100, 25);
      const sort = url.searchParams.get('sort') || 'newest';

      let selectClause = '*, candidate_profiles(*)';
      if (discoverable === 'true' || discoverable === 'false' || discoverable === 'missing_primary') {
        selectClause = '*, candidate_profiles!inner(*)';
      }

      let query = db.database.from('profiles')
        .select(selectClause, { count: 'exact' })
        .eq('role', 'candidate');

      if (search) {
        const term = escapeOrFilter(search);
        query = query.or(`name.ilike.%${term}%,email.ilike.%${term}%`);
      }

      let orderField = 'created_at';
      let ascending = false;
      if (sort === 'oldest') {
        orderField = 'created_at';
        ascending = true;
      } else if (sort === 'name_asc') {
        orderField = 'name';
        ascending = true;
      } else if (sort === 'name_desc') {
        orderField = 'name';
        ascending = false;
      }

      if (discoverable === 'true') {
        query = query.eq('candidate_profiles.is_discoverable', true);
      } else if (discoverable === 'false') {
        query = query.eq('candidate_profiles.is_discoverable', false);
      } else if (discoverable === 'missing_primary') {
        query = query.filter('candidate_profiles.primary_resume_id', 'is', null);
      }

      const { data, count, error } = await query
        .order(orderField, { ascending })
        .range(page * limit, (page + 1) * limit - 1);

      if (error) throw error;

      const totalCount = count || 0;
      return json({
        items: data || [],
        candidates: data || [],
        total: totalCount,
        page,
        hasMore: (page + 1) * limit < totalCount,
        nextCursor: null,
      }, 200, cors);
    }

    const idem = await beginIdempotency(db, idempotencyKey, cors);
    if (idem.replay) return idem.replay;

    try {
      if (request.method === 'POST') {
        const body = await request.json();
        const { action } = body;

        if (action === 'bulk-status' || action === 'bulk-active') {
          const denied = checkPermission(role, { resource: 'candidates', action: 'edit' }, cors);
          if (denied) return denied;
        }

        if (action === 'bulk-status') {
          const { ids, status } = body;
          if (!ids || !Array.isArray(ids) || !status) {
            return errorJson('invalid_request', 'ids and status are required', 400, cors);
          }
          const { error } = await db.database
            .from('profiles')
            .update({ status })
            .in('id', ids);
          if (error) throw error;

          const resPayload = { success: true, count: ids.length };
          await completeIdempotency(db, idempotencyKey, 200, resPayload);
          return json(resPayload, 200, cors);
        }

        if (action === 'bulk-active') {
          const { ids, is_active } = body;
          if (!ids || !Array.isArray(ids) || is_active === undefined) {
            return errorJson('invalid_request', 'ids and is_active are required', 400, cors);
          }
          const { error } = await db.database
            .from('profiles')
            .update({ is_active })
            .in('id', ids);
          if (error) throw error;

          try {
            await db.database.from('audit_log').insert([{
              actor_id: userId,
              action: is_active ? 'candidates_unsuspended' : 'candidates_suspended',
              table_name: 'profiles',
              record_id: ids[0],
              metadata: { target_ids: ids, count: ids.length, is_active },
              created_at: new Date().toISOString()
            }]);
          } catch (e) {
            console.warn('Failed to insert audit log entry:', e);
          }

          const resPayload = { success: true, count: ids.length };
          await completeIdempotency(db, idempotencyKey, 200, resPayload);
          return json(resPayload, 200, cors);
        }

        if (action === 'bulk-delete') {
          // Destructive PII operation: super_admin only (doc 14 §4.2, confirmed decision).
          const denied = checkPermission(role, { resource: 'candidates', action: 'delete' }, cors);
          if (denied) return denied;

          const { ids } = body;
          if (!ids || !Array.isArray(ids)) {
            return errorJson('invalid_request', 'ids are required', 400, cors);
          }

          const resPayload = await deleteCandidates(db, ids);

          try {
            await db.database.from('audit_log').insert([{
              actor_id: userId,
              action: 'candidates_bulk_deleted',
              table_name: 'profiles',
              record_id: ids[0],
              metadata: { deleted_ids: ids, count: ids.length },
              created_at: new Date().toISOString()
            }]);
          } catch (e) {
            console.warn('Failed to insert audit log entry:', e);
          }

          await completeIdempotency(db, idempotencyKey, 200, resPayload);
          return json(resPayload, 200, cors);
        }

        return errorJson('invalid_request', 'Invalid POST action', 400, cors);
      }

      if (request.method === 'PATCH') {
        const denied = checkPermission(role, { resource: 'candidates', action: 'edit' }, cors);
        if (denied) return denied;

        const id = url.pathname.split('/').pop();
        if (!id || id === 'admin-candidates') {
          return errorJson('invalid_request', 'ID is required', 400, cors);
        }
        const body = await request.json();
        // Mass-assignment guard: this endpoint edits candidate data, never identity or role.
        delete body.id;
        delete body.role;

        const { data, error } = await db.database
          .from('profiles')
          .update(body)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        const resPayload = { candidate: data };
        await completeIdempotency(db, idempotencyKey, 200, resPayload);
        return json(resPayload, 200, cors);
      }

      if (request.method === 'DELETE') {
        const denied = checkPermission(role, { resource: 'candidates', action: 'delete' }, cors);
        if (denied) return denied;

        const id = url.searchParams.get('id');
        if (!id) return errorJson('invalid_request', 'ID is required', 400, cors);

        await deleteCandidates(db, [id]);

        try {
          await db.database.from('audit_log').insert([{
            actor_id: userId,
            action: 'candidate_deleted',
            table_name: 'profiles',
            record_id: id,
            created_at: new Date().toISOString()
          }]);
        } catch (e) {
          console.warn('Failed to insert audit log entry:', e);
        }

        const resPayload = { success: true };
        await completeIdempotency(db, idempotencyKey, 200, resPayload);
        return json(resPayload, 200, cors);
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

async function deleteCandidates(db: any, ids: string[]): Promise<{ success: true; count: number }> {
  const { error: cpErr } = await db.database
    .from('candidate_profiles')
    .delete()
    .in('id', ids);
  if (cpErr) throw cpErr;

  const { error: pErr } = await db.database
    .from('profiles')
    .delete()
    .in('id', ids);
  if (pErr) throw pErr;

  const deleteResp = await fetch(`${getBaseUrl()}/api/auth/users`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'apikey': getServiceKey(),
      'Authorization': `Bearer ${getServiceKey()}`,
    },
    body: JSON.stringify({ userIds: ids }),
  });

  if (!deleteResp.ok) {
    const errData = await deleteResp.json().catch(() => ({}));
    throw new Error(errData.message || errData.error || 'Failed to delete users via Admin API');
  }

  return { success: true, count: ids.length };
}
