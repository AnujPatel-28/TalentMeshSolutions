import { NextResponse } from 'next/server';
import { withApi } from '@/lib/api/handler';
import { getServerInsforgeClient } from '@/lib/server-insforge';
import { companyApplicationsQuerySchema } from '@/lib/validation/applications';

// GET ?job_id= — RLS apps_company_view (050) scopes rows to jobs in the caller's own company via
// authz.company_id_of(uid); caller's own token, no service key. A job_id outside the caller's
// company simply returns an empty set (RLS row-filters rather than erroring on select).
export const GET = withApi(
  { schema: { query: companyApplicationsQuerySchema }, allowedRoles: ['recruiter'] },
  async (_req, { query }) => {
    const insforge = await getServerInsforgeClient();
    if (!insforge) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await insforge.database
      .from('applications')
      .select('*')
      .eq('job_id', query.job_id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Failed to load applications' }, { status: 500 });
    }

    return NextResponse.json({ applications: data ?? [] });
  }
);
