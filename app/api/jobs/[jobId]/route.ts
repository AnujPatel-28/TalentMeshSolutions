import { NextResponse } from 'next/server';
import { withApi } from '@/lib/api/handler';
import { getServerInsforgeClient } from '@/lib/server-insforge';
import { jobUpdateSchema } from '@/lib/validation/jobs';

const ACTIVE_JOB_LIMIT_RE = /active job limit reached \((\d+)\)/;

// PATCH — direct table update via the caller's own token; RLS jobs_update_company (050) enforces
// company scope AND (company-admin OR the job's own recruiter_id). company_id/recruiter_id are
// not in jobUpdateSchema, so the body can never redirect a job to another tenant.
export const PATCH = withApi(
  { schema: { body: jobUpdateSchema }, allowedRoles: ['recruiter'], auditLog: true },
  async (_req, { body, params }) => {
    const jobId = params.jobId;
    const insforge = await getServerInsforgeClient();
    if (!insforge) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: existing } = await insforge.database.from('jobs').select('id').eq('id', jobId).maybeSingle();
    if (!existing) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (Object.keys(body).length === 0) {
      return NextResponse.json({ error: 'nothing to update' }, { status: 400 });
    }

    const { data, error } = await insforge.database.from('jobs').update(body).eq('id', jobId).select('*').maybeSingle();

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
      return NextResponse.json({ error: 'Failed to update job' }, { status: 500 });
    }
    if (!data) {
      // Existed on the select above but RLS blocked the write: caller is company-scoped but
      // neither company-admin nor the job's own recruiter.
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ job: data });
  }
);
