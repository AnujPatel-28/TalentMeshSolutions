import { NextResponse } from 'next/server';
import { withApi } from '@/lib/api/handler';
import { getServerInsforgeClient } from '@/lib/server-insforge';
import { insforgeAdmin } from '@/lib/insforge-admin';
import { inviteMemberSchema } from '@/lib/validation/company';

const STAFF_ROLES = ['admin', 'super_admin'];

// Caller's own token — RLS company_members_admin_write (047) independently enforces
// authz.is_company_admin(auth.uid(), company_id), so the insert cannot land in another tenant
// even if the pre-check below were wrong. companyId comes from the URL, never trusted alone.
// Doc 14 R-6: platform staff reuse this endpoint (service-role write, required reason,
// audit_log on_behalf_of) rather than a separate admin-side invite implementation.
export const POST = withApi(
  { schema: { body: inviteMemberSchema }, allowedRoles: ['recruiter', ...STAFF_ROLES], auditLog: true },
  async (_req, { user, body, params }) => {
    const companyId = params.companyId;

    if (STAFF_ROLES.includes(user.role)) {
      if (!body.reason || body.reason.trim().length < 10) {
        return NextResponse.json({ error: 'A reason (at least 10 characters) is required for staff-initiated invites.' }, { status: 400 });
      }
      if (!insforgeAdmin) {
        return NextResponse.json({ error: 'Internal Server Error: Admin client not configured' }, { status: 500 });
      }
      const { data: invitee } = await insforgeAdmin.database.from('profiles').select('id').eq('email', body.email).maybeSingle();
      if (!invitee) {
        return NextResponse.json({ error: 'no_account', message: 'No TalentMesh account found for this email.' }, { status: 404 });
      }

      const { data, error } = await insforgeAdmin.database
        .from('company_members')
        .insert({
          company_id: companyId,
          user_id: invitee.id,
          member_role: body.member_role,
          status: 'invited',
          invited_by: user.id,
        })
        .select('id, user_id, member_role, status')
        .single();

      if (error || !data) {
        const message = error?.message ?? '';
        if (message.includes('duplicate') || message.includes('unique')) {
          return NextResponse.json({ error: 'already_member', message: 'This user already belongs to a company.' }, { status: 409 });
        }
        return NextResponse.json({ error: 'Failed to invite member' }, { status: 500 });
      }

      try {
        await insforgeAdmin.database.from('audit_log').insert([{
          actor_id: user.id,
          action: 'member_invited',
          table_name: 'company_members',
          record_id: data.id,
          on_behalf_of: companyId,
          reason: body.reason,
          metadata: { email: body.email, member_role: body.member_role },
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

    const { data: invitee } = await insforge.database.from('profiles').select('id').eq('email', body.email).maybeSingle();
    if (!invitee) {
      return NextResponse.json({ error: 'no_account', message: 'No TalentMesh account found for this email.' }, { status: 404 });
    }

    const { data, error } = await insforge.database
      .from('company_members')
      .insert({
        company_id: companyId,
        user_id: invitee.id,
        member_role: body.member_role,
        status: 'invited',
        invited_by: user.id,
      })
      .select('id, user_id, member_role, status')
      .single();

    if (error || !data) {
      const message = error?.message ?? '';
      if (message.includes('duplicate') || message.includes('unique')) {
        return NextResponse.json({ error: 'already_member', message: 'This user already belongs to a company.' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Failed to invite member' }, { status: 500 });
    }

    return NextResponse.json({ member: data });
  }
);
