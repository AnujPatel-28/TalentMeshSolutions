import { NextResponse } from 'next/server';
import { withApi } from '@/lib/api/handler';
import { getServerInsforgeClient } from '@/lib/server-insforge';
import { companyApplicationStatusSchema } from '@/lib/validation/applications';

// Reuses the existing update_application_status() RPC (022/034 lockdown — no direct UPDATE).
// p_actor_id is always the session user, never taken from the body.
//
// Flagged drift from doc 03: the RPC's own actor check for actor_type='recruiter' requires
// p_actor_id === jobs.recruiter_id exactly (the specific job's assigned recruiter), which is
// narrower than the company-scoped apps_company_update RLS policy (any company admin/recruiter).
// A company admin who isn't the job's own recruiter will get a 403 from the RPC even though RLS
// would have allowed a direct update. Not fixed here — the RPC is the mandated write path per
// doc 03 and changing its actor check is outside this task's scope.
export const PATCH = withApi(
  { schema: { body: companyApplicationStatusSchema }, allowedRoles: ['recruiter'], auditLog: true },
  async (_req, { user, body, params }) => {
    const applicationId = params.id;
    const insforge = await getServerInsforgeClient();
    if (!insforge) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await insforge.database.rpc('update_application_status', {
      p_application_id: applicationId,
      p_status: body.status,
      p_actor_id: user.id,
      p_actor_type: 'recruiter',
    });

    if (error) {
      const message = error.message ?? '';
      if (message.includes('Access Denied')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (message.includes('Application not found')) {
        return NextResponse.json({ error: 'Application not found' }, { status: 404 });
      }
      if (message.includes('Invalid status transition')) {
        return NextResponse.json({ error: 'invalid_transition', message }, { status: 422 });
      }
      return NextResponse.json({ error: 'Failed to update application status' }, { status: 500 });
    }

    return NextResponse.json(data);
  }
);
