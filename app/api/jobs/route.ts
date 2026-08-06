import { NextResponse } from 'next/server';
import { withApi } from '@/lib/api/handler';
import { getServerInsforgeClient } from '@/lib/server-insforge';
import { jobCreateSchema, jobsCompanyQuerySchema } from '@/lib/validation/jobs';

const ACTIVE_JOB_LIMIT_RE = /active job limit reached \((\d+)\)/;

// GET ?scope=company — company scope is applied here explicitly. RLS alone is NOT enough:
// SELECT policies are OR'ed, so jobs_select_company ∪ jobs_select_approved would also return
// every other company's publicly-approved job. The company comes from the caller's own active
// membership (same row authz.company_id_of() reads), never from the request.
export const GET = withApi(
  { schema: { query: jobsCompanyQuerySchema }, allowedRoles: ['recruiter'] },
  async (_req, { query, user }) => {
    const insforge = await getServerInsforgeClient();
    if (!insforge) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: membership } = await insforge.database
      .from('company_members')
      .select('company_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: 'no active company' }, { status: 403 });
    }

    let builder = insforge.database
      .from('jobs')
      .select('*', { count: 'exact' })
      .eq('company_id', membership.company_id);
    if (query.status && query.status !== 'all') {
      builder = builder.eq('status', query.status);
    }
    const from = query.page * query.limit;
    const to = from + query.limit - 1;

    const { data, error, count } = await builder.order('created_at', { ascending: false }).range(from, to);
    if (error) {
      return NextResponse.json({ error: 'Failed to load jobs' }, { status: 500 });
    }

    return NextResponse.json({ jobs: data ?? [], total: count ?? 0, page: query.page, limit: query.limit });
  }
);

// POST — create_job (049) derives company_id/recruiter_id from auth.uid() server-side; the body
// never carries either (jobCreateSchema omits them). If body.status === 'active' the RPC checks
// the plan's active-job limit at creation time, same as the publish route.
export const POST = withApi(
  { schema: { body: jobCreateSchema }, allowedRoles: ['recruiter'], auditLog: true },
  async (_req, { body }) => {
    const insforge = await getServerInsforgeClient();
    if (!insforge) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await insforge.database.rpc('create_job', { p_payload: body });

    if (error) {
      const message = error.message ?? '';
      const limitMatch = message.match(ACTIVE_JOB_LIMIT_RE);
      if (limitMatch) {
        const limit = Number(limitMatch[1]);
        return NextResponse.json(
          { error: 'ACTIVE_JOB_LIMIT', message: `Active job limit reached (${limit}). Close an active job to post another.`, limit },
          { status: 409 }
        );
      }
      if (message.includes('coordinators cannot post jobs')) {
        return NextResponse.json({ error: 'coordinators cannot post jobs' }, { status: 403 });
      }
      if (message.includes('no active company membership')) {
        return NextResponse.json({ error: 'no active company' }, { status: 403 });
      }
      return NextResponse.json({ error: 'Failed to create job' }, { status: 500 });
    }

    return NextResponse.json({ job: data }, { status: 201 });
  }
);
