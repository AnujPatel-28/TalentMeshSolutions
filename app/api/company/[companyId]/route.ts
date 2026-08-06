import { NextResponse } from 'next/server';
import { withApi } from '@/lib/api/handler';
import { getServerInsforgeClient } from '@/lib/server-insforge';
import { insforgeAdmin } from '@/lib/insforge-admin';
import { updateCompanySchema } from '@/lib/validation/company';

// GET: member-scoped read via the caller's own token. `companies_public_read` (046) allows any
// non-deactivated company row, so the real scoping is done here: a recruiter must belong to
// companyId, a platform admin may read any company.
//
// Platform-admin branch needs the service key: `admin_bypass`/`project_admin_policy` (046) are
// `TO project_admin` — that Postgres role is only assumed by the service-key connection, not by
// an admin user's own JWT. There is no RLS path for an admin's own token to read a company they
// are not a member of. Flagged per the T-High(b) rule rather than decided silently; this mirrors
// the identical, already-merged pattern in recruiter/status/route.ts and request-access/route.ts.
export const GET = withApi({ allowedRoles: ['recruiter', 'admin', 'super_admin'] }, async (_req, { user, params }) => {
  const companyId = params.companyId;

  if (user.role === 'admin' || user.role === 'super_admin') {
    if (!insforgeAdmin) {
      return NextResponse.json({ error: 'Internal Server Error: Admin client not configured' }, { status: 500 });
    }
    const { data: company } = await insforgeAdmin.database.from('companies').select('*').eq('id', companyId).maybeSingle();
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }
    return NextResponse.json({ company });
  }

  const insforge = await getServerInsforgeClient();
  if (!insforge) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Own membership row is readable regardless of status via company_members_read_self (047).
  const { data: membership } = await insforge.database
    .from('company_members')
    .select('company_id')
    .eq('user_id', user.id)
    .neq('status', 'removed')
    .maybeSingle();

  if (!membership || membership.company_id !== companyId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: company } = await insforge.database.from('companies').select('*').eq('id', companyId).maybeSingle();
  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }
  return NextResponse.json({ company });
});

// PATCH: company-admin-scoped write, caller's own token only — never the service key.
//
// Flagged drift from doc 03: doc 03 says this "requires authz.is_company_admin", but the live
// `companies_owner_write` RLS policy (046) is `created_by = auth.uid()`, not membership/role
// scoped. A company-admin who is not the original `created_by` (e.g. added via invite after
// founding) will pass the pre-check below but still be blocked by RLS. Rather than widen scope
// with the service key, this returns a distinguishable 403 so the gap is visible instead of a
// silent no-op update — flagged for a P1 RLS fix (new `companies_admin_write` policy keyed off
// authz.is_company_admin), not resolved here since it's a schema/RLS change outside this task.
export const PATCH = withApi(
  { schema: { body: updateCompanySchema }, allowedRoles: ['recruiter'], auditLog: true },
  async (_req, { user, body, params }) => {
    const companyId = params.companyId;
    const insforge = await getServerInsforgeClient();
    if (!insforge) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: membership } = await insforge.database
      .from('company_members')
      .select('company_id, member_role, status')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (!membership || membership.company_id !== companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (membership.member_role !== 'admin') {
      return NextResponse.json({ error: 'company admins only' }, { status: 403 });
    }

    if (Object.keys(body).length === 0) {
      return NextResponse.json({ error: 'nothing to update' }, { status: 400 });
    }

    const { data, error } = await insforge.database
      .from('companies')
      .update(body)
      .eq('id', companyId)
      .select('*')
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: 'Failed to update company' }, { status: 500 });
    }
    if (!data) {
      // RLS filtered the write silently — see the `companies_owner_write` drift note above.
      return NextResponse.json(
        { error: 'not_company_owner', message: 'Only the company creator can currently update this profile.' },
        { status: 403 }
      );
    }

    return NextResponse.json({ company: data });
  }
);
