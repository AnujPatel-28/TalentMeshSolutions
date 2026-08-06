import { NextResponse } from 'next/server';
import { withApi } from '@/lib/api/handler';
import { formatPaginatedResponse } from '@/lib/api/pagination';
import { insforgeAdmin } from '@/lib/insforge-admin';
import { dpdpQueueQuerySchema } from '@/lib/validation/dpdp';

const PAGE_SIZE = 20;

// Read-only, admin-gated by withApi. Service key is required: data_principal_requests has no
// staff-read RLS policy (migration 065 follows the app/api/admin/verification/queue precedent —
// a platform admin's own token would read zero rows here), so the service key is not optional.
export const GET = withApi(
  { schema: { query: dpdpQueueQuerySchema }, allowedRoles: ['admin', 'super_admin'], requiredPermission: { resource: 'dpdp', action: 'view' } },
  async (_req, { query }) => {
    if (!insforgeAdmin) {
      return NextResponse.json({ error: 'Internal Server Error: Admin client not configured' }, { status: 500 });
    }

    const from = (query.page - 1) * PAGE_SIZE;
    let q = insforgeAdmin.database
      .from('data_principal_requests')
      .select(
        'id, user_id, email, kind, status, details, response_notes, handled_by, due_at, created_at, completed_at',
        { count: 'exact' }
      )
      .order('due_at', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (query.status) q = q.eq('status', query.status);
    if (query.kind) q = q.eq('kind', query.kind);

    const { data, count, error } = await q;
    if (error) {
      return NextResponse.json({ error: 'Failed to load DPDP request queue' }, { status: 500 });
    }

    return NextResponse.json(formatPaginatedResponse(data ?? [], count ?? 0, { page: query.page, limit: PAGE_SIZE }));
  }
);
