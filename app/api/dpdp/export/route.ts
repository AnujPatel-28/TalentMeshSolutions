import { NextResponse } from 'next/server';
import { withApi } from '@/lib/api/handler';
import { buildDataExport } from '@/lib/dpdp/export';

// GET /api/dpdp/export — self-service "access" fulfilment (doc 26 §4 L-4). Own data only, no
// staff gate: unlike correction/erasure, an access request needs no case-by-case judgment before
// it can be fulfilled, so this returns the export directly rather than waiting on an admin queue
// action. The kind='access' ticket raised via POST /api/dpdp/requests still exists as the
// auditable record that the right was exercised and when.
export const GET = withApi({ allowedRoles: ['candidate', 'recruiter'] }, async (_req, { user }) => {
  try {
    const data = await buildDataExport(user.id, user.email, user.role as 'candidate' | 'recruiter');
    return new NextResponse(JSON.stringify(data, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="talentmesh-data-export-${user.id}.json"`,
      },
    });
  } catch (err: any) {
    console.error('[dpdp/export] EXPORT_FAILED', { userId: user.id, error: err.message });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});
