import { NextResponse } from 'next/server';
import { withApi } from '@/lib/api/handler';
import { getServerInsforgeClient } from '@/lib/server-insforge';

// status='closed' via caller's own token; RLS jobs_update_company scopes the write. Closing
// frees an active slot — no limit check applies on this transition.
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
    .update({ status: 'closed' })
    .eq('id', jobId)
    .select('*')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: 'Failed to close job' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({ job: data });
});
