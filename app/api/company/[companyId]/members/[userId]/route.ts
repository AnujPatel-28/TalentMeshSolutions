import { NextResponse } from 'next/server';
import { withApi } from '@/lib/api/handler';
import { getServerInsforgeClient } from '@/lib/server-insforge';
import { insforgeAdmin } from '@/lib/insforge-admin';
import { updateMemberSchema } from '@/lib/validation/company';

const STAFF_ROLES = ['admin', 'super_admin'];

// Direct table write under company_members_admin_write RLS (047) — no RPC. The last-admin
// invariant is enforced by the guard_last_company_admin trigger (051); its check_violation is
// surfaced here as 422 rather than re-implemented in the route. Doc 14 R-6: platform staff reuse
// this exact endpoint for on-behalf interventions (not a separate admin-side implementation) —
// the branch below skips the "caller is this company's own admin" check for staff and requires
// `reason`, writing it to audit_log with on_behalf_of = companyId.
export const PATCH = withApi(
  { schema: { body: updateMemberSchema }, allowedRoles: ['recruiter', ...STAFF_ROLES], auditLog: true },
  async (_req, { user, body, params }) => {
    const { companyId, userId } = params;

    if (STAFF_ROLES.includes(user.role)) {
      if (!body.reason || body.reason.trim().length < 10) {
        return NextResponse.json({ error: 'A reason (at least 10 characters) is required for staff-initiated member changes.' }, { status: 400 });
      }
      if (!insforgeAdmin) {
        return NextResponse.json({ error: 'Internal Server Error: Admin client not configured' }, { status: 500 });
      }
      const { reason, ...updateFields } = body;
      const { data, error } = await insforgeAdmin.database
        .from('company_members')
        .update(updateFields)
        .eq('company_id', companyId)
        .eq('user_id', userId)
        .select('id, user_id, member_role, status')
        .maybeSingle();

      if (error) {
        const message = error.message ?? '';
        if (message.includes('last_admin')) {
          return NextResponse.json(
            { error: 'last_admin', message: 'A company must keep at least one active admin.' },
            { status: 422 }
          );
        }
        return NextResponse.json({ error: 'Failed to update member' }, { status: 500 });
      }
      if (!data) {
        return NextResponse.json({ error: 'Member not found' }, { status: 404 });
      }

      try {
        await insforgeAdmin.database.from('audit_log').insert([{
          actor_id: user.id,
          action: 'member_updated',
          table_name: 'company_members',
          record_id: data.id,
          on_behalf_of: companyId,
          reason,
          metadata: { fields: Object.keys(updateFields), target_user_id: userId },
        }]);
      } catch (e) {
        console.warn('Failed to insert audit log entry:', e);
      }

      return NextResponse.json({ member: data });
    }

    const insforge = await getServerInsforgeClient();
    if (!insforge) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: membership } = await insforge.database
      .from('company_members')
      .select('company_id, member_role')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (!membership || membership.company_id !== companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (membership.member_role !== 'admin') {
      return NextResponse.json({ error: 'company admins only' }, { status: 403 });
    }

    const { reason: _reason, ...recruiterUpdate } = body;
    const { data, error } = await insforge.database
      .from('company_members')
      .update(recruiterUpdate)
      .eq('company_id', companyId)
      .eq('user_id', userId)
      .select('id, user_id, member_role, status')
      .maybeSingle();

    if (error) {
      const message = error.message ?? '';
      if (message.includes('last_admin')) {
        return NextResponse.json(
          { error: 'last_admin', message: 'A company must keep at least one active admin.' },
          { status: 422 }
        );
      }
      return NextResponse.json({ error: 'Failed to update member' }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    return NextResponse.json({ member: data });
  }
);
