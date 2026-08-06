import { corsHeaders } from '../_shared/cors.ts';
import { json, errorJson, internalError } from '../_shared/errors.ts';
import { escapeOrFilter, capLimit } from '../_shared/query.ts';
import { requireStaff, checkPermission } from '../_shared/adminAuth.ts';

export default async function handler(request: Request): Promise<Response> {
  const cors = corsHeaders(request);
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const auth = await requireStaff(request);
  if (auth instanceof Response) return auth;
  const { role, db } = auth;

  try {
    if (request.method === 'GET') {
      const denied = checkPermission(role, { resource: 'audit_logs', action: 'view' }, cors);
      if (denied) return denied;

      const url = new URL(request.url);
      const search = url.searchParams.get('search') || '';
      const recordId = url.searchParams.get('record_id');
      const page = parseInt(url.searchParams.get('page') || '0');
      const limit = capLimit(url.searchParams.get('limit'), 100, 20);

      let matchedActorIds: string[] = [];
      if (search) {
        const term = escapeOrFilter(search);
        const { data: matchedProfiles, error: matchError } = await db.database
          .from('profiles')
          .select('id')
          .or(`name.ilike.%${term}%,email.ilike.%${term}%`);
        
        if (matchError) throw matchError;
        
        if (matchedProfiles && matchedProfiles.length > 0) {
          matchedActorIds = matchedProfiles.map((p: any) => p.id);
        }
      }

      let query = db.database
        .from('audit_log')
        .select('*', { count: 'exact' });

      if (recordId) {
        query = query.eq('record_id', recordId);
      }

      if (search) {
        const term = escapeOrFilter(search);
        if (matchedActorIds.length > 0) {
          query = query.or(`action.ilike.%${term}%,table_name.ilike.%${term}%,actor_id.in.(${matchedActorIds.join(',')})`);
        } else {
          query = query.or(`action.ilike.%${term}%,table_name.ilike.%${term}%`);
        }
      }

      const { data: logs, count: total, error } = await query
        .order('created_at', { ascending: false })
        .range(page * limit, (page + 1) * limit - 1);

      if (error) throw error;

      const results = logs || [];
      const actorIdsToFetch = [...new Set(results.map((l: any) => l.actor_id).filter(Boolean))];

      let profileMap: Record<string, { name: string, email: string }> = {};
      if (actorIdsToFetch.length > 0) {
        const { data: profilesList, error: pError } = await db.database
          .from('profiles')
          .select('id, name, email')
          .in('id', actorIdsToFetch);
        
        if (pError) throw pError;
        
        if (profilesList) {
          profilesList.forEach((p: any) => {
            profileMap[p.id] = { name: p.name || 'System Admin', email: p.email || '' };
          });
        }
      }

      const formattedLogs = results.map((log: any) => ({
        id: log.id,
        actor_id: log.actor_id,
        action: log.action,
        table_name: log.table_name || '',
        record_id: log.record_id || '',
        old_data: log.old_data,
        new_data: log.new_data,
        created_at: log.created_at,
        ip_address: log.ip_address || '',
        on_behalf_of: log.on_behalf_of || null,
        reason: log.reason || '',
        actor: profileMap[log.actor_id] || { name: 'System Admin', email: '' }
      }));

      return json({ logs: formattedLogs, total: total || 0 }, 200, cors);
    }

    return errorJson('method_not_allowed', 'Method not allowed', 405, cors);
  } catch (err) {
    return internalError(cors, err);
  }
}
