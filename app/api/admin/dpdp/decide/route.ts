import { NextResponse } from 'next/server';
import { withApi } from '@/lib/api/handler';
import { insforgeAdmin } from '@/lib/insforge-admin';
import { dpdpDecisionSchema } from '@/lib/validation/dpdp';
import { executeErasure } from '@/lib/dpdp/execute-erasure';

// Action + close a data_principal_requests row (doc 26 §4 L-4 admin queue). Service key only:
// same reasoning as app/api/admin/dpdp/queue/route.ts. Unlike
// app/api/admin/verification/decide/route.ts there is no SECURITY DEFINER RPC for this — the
// write is a plain service-role UPDATE, matching the pattern app/api/consent/withdraw/route.ts
// already established for this codebase's DPDP work.
export const POST = withApi(
  { schema: { body: dpdpDecisionSchema }, allowedRoles: ['admin', 'super_admin'], requiredPermission: { resource: 'dpdp', action: 'approve' }, auditLog: true },
  async (_req, { user, body }) => {
    if (!insforgeAdmin) {
      return NextResponse.json({ error: 'Internal Server Error: Admin client not configured' }, { status: 500 });
    }
    const db = insforgeAdmin.database;

    const { data: reqRow, error: fetchError } = await db
      .from('data_principal_requests')
      .select('id, user_id, kind, status')
      .eq('id', body.request_id)
      .single();

    if (fetchError || !reqRow) {
      return NextResponse.json({ error: 'request_not_found' }, { status: 404 });
    }
    if (reqRow.status === 'completed' || reqRow.status === 'rejected') {
      return NextResponse.json(
        { error: 'request_not_pending', message: 'This request has already been closed.' },
        { status: 409 },
      );
    }

    // Erasure must actually run before the request is allowed to close as completed — closing
    // the ticket is not the same as doing the erasure, and doc 26 §4 treats the two as one act.
    if (body.decision === 'completed' && reqRow.kind === 'erasure') {
      if (!reqRow.user_id) {
        return NextResponse.json(
          { error: 'no_user_id', message: 'This request has no linked account to erase (already anonymised or never verified).' },
          { status: 409 },
        );
      }
      const { data: profileRow, error: profileError } = await db
        .from('profiles')
        .select('role')
        .eq('id', reqRow.user_id)
        .single();
      if (profileError || !profileRow || (profileRow.role !== 'candidate' && profileRow.role !== 'recruiter')) {
        return NextResponse.json({ error: 'Cannot determine account role for erasure' }, { status: 500 });
      }
      try {
        await executeErasure(reqRow.user_id, profileRow.role as 'candidate' | 'recruiter');
      } catch (err: any) {
        console.error('[dpdp/decide] ERASURE_EXECUTION_FAILED', { requestId: body.request_id, error: err.message });
        return NextResponse.json({ error: 'Erasure execution failed', message: err.message }, { status: 500 });
      }
    }

    const { error: updateError } = await db
      .from('data_principal_requests')
      .update({
        status: body.decision,
        response_notes: body.notes ?? null,
        handled_by: user.id,
        completed_at: body.decision === 'completed' || body.decision === 'rejected' ? new Date().toISOString() : null,
      })
      .eq('id', body.request_id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to record decision' }, { status: 500 });
    }

    return NextResponse.json({ status: body.decision, request_id: body.request_id });
  }
);
