import { NextResponse } from 'next/server';
import { withApi } from '@/lib/api/handler';
import { formatPaginatedResponse } from '@/lib/api/pagination';
import { insforgeAdmin } from '@/lib/insforge-admin';
import { verificationQueueQuerySchema } from '@/lib/validation/company';

const PAGE_SIZE = 20;

// Read-only, admin-gated by withApi. Service key is required: company_verification_requests has
// no platform-admin read policy (048 gives cvr_read_own to members and admin_bypass only to the
// project_admin DB role), so a platform admin's own token reads zero rows here.
export const GET = withApi(
  { schema: { query: verificationQueueQuerySchema }, allowedRoles: ['admin', 'super_admin'], requiredPermission: { resource: 'verification', action: 'view' } },
  async (_req, { query }) => {
    if (!insforgeAdmin) {
      return NextResponse.json({ error: 'Internal Server Error: Admin client not configured' }, { status: 500 });
    }

    const from = (query.page - 1) * PAGE_SIZE;
    let q = insforgeAdmin.database
      .from('company_verification_requests')
      .select(
        'id, company_id, submitted_by, channel, status, kyc_documents, review_notes, created_at, decided_at,' +
        'companies(name, gstin, website, status),' +
        'profiles!company_verification_requests_submitted_by_fkey(name, email, phone)',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (query.status) {
      q = q.eq('status', query.status);
    }

    const { data, count, error } = await q;
    if (error) {
      return NextResponse.json({ error: 'Failed to load verification queue' }, { status: 500 });
    }

    return NextResponse.json(formatPaginatedResponse(data ?? [], count ?? 0, { page: query.page, limit: PAGE_SIZE }));
  }
);
