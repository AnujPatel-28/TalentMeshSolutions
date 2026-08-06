import { createClient } from 'npm:@insforge/sdk';
import { canPerform, isStaffRole } from '../_shared/permissions.ts';

const baseUrl = Deno.env.get('NEXT_PUBLIC_INSFORGE_URL') || Deno.env.get('INSFORGE_URL')!;
const anonKey = Deno.env.get('NEXT_PUBLIC_INSFORGE_ANON_KEY') || Deno.env.get('NEXT_PUBLIC_INSFORGE_ANON_KEY')!;

export default async function handler(req: Request): Promise<Response> {
  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const insforge = createClient({ baseUrl, anonKey, edgeFunctionToken: token, isServerMode: true });

    // Verify caller is an active admin before exporting audit data
    const { data: { user }, error: authError } = await insforge.auth.getCurrentUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized, invalid token' }), { status: 401 });
    }

    const { data: guardProfile } = await insforge.database
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single();

    if (!isStaffRole(guardProfile?.role)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    }

    if (guardProfile?.is_active !== true) {
      return new Response(JSON.stringify({ error: 'Forbidden, account is suspended' }), { status: 403 });
    }

    // R-4: bulk PII/ledger extraction. Only super_admin holds audit_logs:export — `admin`
    // has audit_logs:['view'] and can read the log in-app but not walk out with it.
    if (!canPerform(guardProfile.role, 'audit_logs', 'export')) {
      return new Response(JSON.stringify({ error: 'forbidden', code: 'permission_denied' }), { status: 403 });
    }

    if (req.method === 'GET') {
      const url = new URL(req.url);
      const adminId = url.searchParams.get('adminId');
      const type = url.searchParams.get('type') || 'all';
      const activeTab = url.searchParams.get('activeTab');
      const from = url.searchParams.get('from');
      const to = url.searchParams.get('to');

      let query = insforge.database
        .from('audit_log')
        .select(`
            id,
            created_at,
            actor_id,
            action,
            table_name,
            record_id,
            status,
            ip_address
        `)
        .order('created_at', { ascending: false });

      if (activeTab === 'login') {
        query = query.or('action.ilike.%security%,action.ilike.%login%,action.ilike.%mfa%');
      } else {
        if (adminId) query = query.eq('actor_id', adminId);
        if (from) query = query.gte('created_at', new Date(from).toISOString());
        if (to) query = query.lte('created_at', new Date(to).toISOString());
        
        if (type !== 'all') {
          if (type === 'user') query = query.or('action.ilike.%user%,action.ilike.%recruiter%');
          if (type === 'job') query = query.ilike('action', '%job%');
          if (type === 'security') query = query.or('action.ilike.%security%,action.ilike.%login%,action.ilike.%mfa%');
          if (type === 'settings') query = query.ilike('action', '%settings%');
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      const results = data || [];
      const actorIdsToFetch = [...new Set(results.map((l: any) => l.actor_id).filter(Boolean))];

      let profileMap: Record<string, string> = {};
      if (actorIdsToFetch.length > 0) {
        const { data: profilesList } = await insforge.database
          .from('profiles')
          .select('id, name')
          .in('id', actorIdsToFetch);
        if (profilesList) {
          profilesList.forEach((p: any) => {
            profileMap[p.id] = p.name || 'System Admin';
          });
        }
      }

      // Convert to CSV
      const headers = ['Timestamp', 'Admin', 'Action', 'Resource', 'Status', 'IP Address'];
      const rows = results.map((log: any) => [
        new Date(log.created_at).toISOString(),
        profileMap[log.actor_id] || 'System',
        log.action.toUpperCase(),
        `${log.table_name || ''} ${log.record_id || ''}`.trim(),
        log.status,
        log.ip_address
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      // R-3: log export start with filter + row count
      try {
        await insforge.database.from('audit_log').insert([{
          actor_id: user.id,
          action: 'export_started',
          table_name: 'audit_log',
          record_id: user.id,
          metadata: {
            export_type: 'audit_csv',
            filters: { adminId, type, activeTab, from, to },
            row_count: results.length
          },
          created_at: new Date().toISOString()
        }]);
      } catch (e) {
        console.warn('Failed to insert audit log entry:', e);
      }

      return new Response(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="talentmesh-audit-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  } catch (err: any) {
    console.error('Admin Export Audit Edge Function Error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal Server Error' }), { status: 500 });
  }
}
