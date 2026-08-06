import { NextResponse } from 'next/server';
import { withApi } from '@/lib/api/handler';
import { insforgeAdmin } from '@/lib/insforge-admin';

// Service key is required for the reads below, scoped by the SESSION user id only (no client input).
// Reason: cvr_read_own / company_members_read_own_company (047/048) key off
// authz.company_id_of(uid), which returns NULL until the membership is 'active' — so a pending
// recruiter cannot read their own membership or verification request through their own token.
// This route exists to render exactly that pending state. See the gap note in the P2-B report.
export const GET = withApi({ allowedRoles: ['recruiter', 'candidate'] }, async (_req, { user }) => {
  if (!insforgeAdmin) {
    return NextResponse.json({ error: 'Internal Server Error: Admin client not configured' }, { status: 500 });
  }
  const db = insforgeAdmin.database;

  const { data: membership } = await db
    .from('company_members')
    .select('company_id, member_role, status')
    .eq('user_id', user.id)
    .neq('status', 'removed')
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ membership: null, company: null, verification: null });
  }

  const { data: company } = await db
    .from('companies')
    .select('id, name, status, verified_at')
    .eq('id', membership.company_id)
    .maybeSingle();

  const { data: verification } = await db
    .from('company_verification_requests')
    .select('id, status, review_notes, created_at, decided_at')
    .eq('company_id', membership.company_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ membership, company, verification });
});
