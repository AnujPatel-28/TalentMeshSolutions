import { NextResponse } from 'next/server';
import { withApi } from '@/lib/api/handler';
import { getServerInsforgeClient } from '@/lib/server-insforge';
import { verificationDecisionSchema } from '@/lib/validation/company';

const RPC_BY_DECISION = {
  approved: 'approve_company_verification',
  rejected: 'reject_company_verification',
  needs_more_info: 'request_more_info_for_verification',
} as const;

// The caller's OWN token is mandatory here, not the service key: all three RPCs (049/051) are
// SECURITY DEFINER but gate on authz.is_admin(), which resolves auth.uid() from the JWT. A
// service-key call has no uid and would fail 'admin only'. withApi's allowedRoles is the first
// gate; the RPC's is_admin() check is defense in depth.
export const POST = withApi(
  { schema: { body: verificationDecisionSchema }, allowedRoles: ['admin', 'super_admin'], requiredPermission: { resource: 'verification', action: 'approve' }, auditLog: true },
  async (_req, { body }) => {
    const insforge = await getServerInsforgeClient();
    if (!insforge) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { request_id, decision, notes } = body;
    const { error } = await insforge.database.rpc(RPC_BY_DECISION[decision], {
      p_request_id: request_id,
      p_notes: notes ?? '',
    });

    if (error) {
      const message = error.message ?? '';
      if (message.includes('admin only')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      // 'verification request not found or already decided' (049) /
      // 'request not found or not pending' (051) — already decided, or never existed.
      if (message.includes('not found')) {
        return NextResponse.json(
          { error: 'request_not_pending', message: 'This request no longer exists or has already been decided.' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: 'Failed to record decision' }, { status: 500 });
    }

    return NextResponse.json({ status: decision, request_id });
  }
);
