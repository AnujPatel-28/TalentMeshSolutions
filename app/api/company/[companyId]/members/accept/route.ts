import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApi } from '@/lib/api/handler';
import { getServerInsforgeClient } from '@/lib/server-insforge';
import { insforgeAdmin } from '@/lib/insforge-admin';

const STAFF_ROLES = ['admin', 'super_admin'];

const acceptOnBehalfSchema = z.object({
  userId: z.string().uuid().optional(),
  reason: z.string().min(10).max(500).optional(),
});

// Invitee accepts their own invite. Caller's own token — accept_company_invite (051) is
// SECURITY DEFINER but resolves the invite row from auth.uid() internally, so a service-key call
// (no uid) could not identify which invite to accept.
//
// Doc 14 R-6 "accept on behalf": the RPC above cannot be reused literally for this — it is
// SECURITY DEFINER scoped to auth.uid() of the caller, and a service-role call has no JWT
// context (auth.uid() is NULL), so it can never resolve which invitee to activate. This branch
// reproduces the RPC's exact effect (company_members invited->active, joined_at set, a
// verification_audit_log row) directly with the service client instead, plus the staff
// intervention envelope (reason, audit_log on_behalf_of) doc 14 §7 requires on every on-behalf
// mutation. Flagged as a documented deviation from the doc's literal "RPC" wording, not a gap.
export const POST = withApi(
  { schema: { body: acceptOnBehalfSchema }, allowedRoles: ['recruiter', 'candidate', ...STAFF_ROLES], requireAuth: true, auditLog: true },
  async (_req, { user, body, params }) => {
    const companyId = params.companyId;

    if (STAFF_ROLES.includes(user.role) && body.userId) {
      if (!body.reason || body.reason.trim().length < 10) {
        return NextResponse.json({ error: 'A reason (at least 10 characters) is required for staff-initiated accept-on-behalf.' }, { status: 400 });
      }
      if (!insforgeAdmin) {
        return NextResponse.json({ error: 'Internal Server Error: Admin client not configured' }, { status: 500 });
      }

      const { data: company } = await insforgeAdmin.database.from('companies').select('status').eq('id', companyId).maybeSingle();
      if (!company || company.status !== 'verified') {
        return NextResponse.json({ error: 'company_not_verified', message: 'This company is not yet verified.' }, { status: 422 });
      }

      const { data: updated, error } = await insforgeAdmin.database
        .from('company_members')
        .update({ status: 'active', joined_at: new Date().toISOString() })
        .eq('company_id', companyId)
        .eq('user_id', body.userId)
        .eq('status', 'invited')
        .select('id')
        .maybeSingle();

      if (error) {
        return NextResponse.json({ error: 'Failed to accept invite on behalf' }, { status: 500 });
      }
      if (!updated) {
        return NextResponse.json({ error: 'no_pending_invite', message: 'No pending invite for this company.' }, { status: 404 });
      }

      try {
        await insforgeAdmin.database.from('verification_audit_log').insert([{
          company_id: companyId,
          actor_id: user.id,
          action: 'member_activated',
          from_state: 'invited',
          to_state: 'active',
          metadata: { on_behalf_of_staff: true, target_user_id: body.userId },
        }]);
        await insforgeAdmin.database.from('audit_log').insert([{
          actor_id: user.id,
          action: 'member_accepted_on_behalf',
          table_name: 'company_members',
          record_id: updated.id,
          on_behalf_of: companyId,
          reason: body.reason,
          metadata: { target_user_id: body.userId },
        }]);
      } catch (e) {
        console.warn('Failed to insert audit log entry:', e);
      }

      return NextResponse.json({ status: 'active', company_id: companyId });
    }

    const insforge = await getServerInsforgeClient();
    if (!insforge) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await insforge.database.rpc('accept_company_invite', { p_company_id: companyId });

    if (error) {
      const message = error.message ?? '';
      if (message.includes('company not verified')) {
        return NextResponse.json({ error: 'company_not_verified', message: 'This company is not yet verified.' }, { status: 422 });
      }
      if (message.includes('no pending invite')) {
        return NextResponse.json({ error: 'no_pending_invite', message: 'No pending invite for this company.' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to accept invite' }, { status: 500 });
    }

    return NextResponse.json({ status: 'active', company_id: companyId });
  }
);
