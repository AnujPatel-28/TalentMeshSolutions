import { NextResponse } from 'next/server';
import { withApi } from '@/lib/api/handler';
import { getServerInsforgeClient } from '@/lib/server-insforge';
import { insforgeAdmin } from '@/lib/insforge-admin';
import { raiseDpdpRequestSchema } from '@/lib/validation/dpdp';

// Doc 26 §4 L-4: no fixed statutory clock for access/correction/erasure (only grievance has one,
// see 065's due_at comment) — 30 days chosen to mirror GDPR Art.12(3)'s one-month baseline.
const RIGHTS_REQUEST_SLA_DAYS = 30;

// GET /api/dpdp/requests — the requester's own request history + status, read by the "Your data"
// settings panel (candidate + recruiter). Caller's own token: RLS dpr_select_own (migration 065)
// scopes this to user_id = auth.uid() already, no service key needed for a read of your own rows.
export const GET = withApi({}, async (_req, { user }) => {
  const insforge = await getServerInsforgeClient();
  if (!insforge) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await insforge.database
    .from('data_principal_requests')
    .select('id, kind, status, details, response_notes, due_at, created_at, completed_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Failed to load requests' }, { status: 500 });
  }

  return NextResponse.json({ requests: data ?? [] });
});

// POST /api/dpdp/requests — raise an access / correction / erasure request. Writes go through the
// service key: data_principal_requests has no client INSERT policy (migration 065), same
// fail-closed pattern as consent_records (063) — the row must exist even if a caller's own token
// could theoretically write it, because the append-only/no-tamper guarantee must not rest on RLS
// alone (062's lesson).
export const POST = withApi({ schema: { body: raiseDpdpRequestSchema } }, async (_req, { user, body }) => {
  if (!insforgeAdmin) {
    console.error('[dpdp/requests] INSFORGE_SERVICE_KEY not configured');
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }

  const dueAt = new Date(Date.now() + RIGHTS_REQUEST_SLA_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await insforgeAdmin.database
    .from('data_principal_requests')
    .insert({
      user_id: user.id,
      email: user.email,
      kind: body.kind,
      details: body.details ?? null,
      due_at: dueAt,
    })
    .select('id, kind, status, due_at, created_at')
    .single();

  if (error) {
    console.error('[dpdp/requests] INSERT_FAILED', { userId: user.id, kind: body.kind, error: error.message });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }

  return NextResponse.json({ request: data }, { status: 201 });
});
