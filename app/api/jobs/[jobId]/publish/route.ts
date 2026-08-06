import { NextResponse } from 'next/server';
import { withApi } from '@/lib/api/handler';
import { getServerInsforgeClient } from '@/lib/server-insforge';

const ACTIVE_JOB_LIMIT_RE = /active job limit reached \((\d+)\)/;

// status='active' via caller's own token; RLS jobs_update_company scopes the write, and the
// enforce_active_job_limit trigger (050) raises check_violation if the plan's active-job cap is hit.
export const POST = withApi({ allowedRoles: ['recruiter'], auditLog: true }, async (_req, { params }) => {
  const jobId = params.jobId;
  const insforge = await getServerInsforgeClient();
  if (!insforge) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: existing } = await insforge.database.from('jobs').select('id').eq('id', jobId).maybeSingle();
  if (!existing) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  const { data, error } = await insforge.database
    .from('jobs')
    .update({ status: 'active' })
    .eq('id', jobId)
    .select('*')
    .maybeSingle();

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
    return NextResponse.json({ error: 'Failed to publish job' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({ job: data });
});
