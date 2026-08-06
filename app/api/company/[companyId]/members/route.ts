import { NextResponse } from 'next/server';
import { withApi } from '@/lib/api/handler';
import { getServerInsforgeClient } from '@/lib/server-insforge';

// GET roster — RLS company_members_read_own_company (047) keys off authz.company_id_of(uid),
// which is null until the caller's own membership is 'active'; only active company members can
// list the roster through their own token (matches doc 03's "company-admin scoped" framing —
// pending/invited members use /api/recruiter/status instead).
export const GET = withApi({ allowedRoles: ['recruiter'] }, async (_req, { params }) => {
  const companyId = params.companyId;
  const insforge = await getServerInsforgeClient();
  if (!insforge) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: members, error } = await insforge.database
    .from('company_members')
    .select('id, user_id, member_role, status, invited_by, joined_at, created_at')
    .eq('company_id', companyId);

  if (error) {
    return NextResponse.json({ error: 'Failed to load members' }, { status: 500 });
  }

  return NextResponse.json({ members: members ?? [] });
});
