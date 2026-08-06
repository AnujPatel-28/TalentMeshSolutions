import { NextResponse } from 'next/server';
import { withApi } from '@/lib/api/handler';
import { getServerInsforgeClient } from '@/lib/server-insforge';
import { verificationSubmitSchema } from '@/lib/validation/company';

// Caller's OWN token throughout — no service key. RLS cvr_insert_own (048) independently enforces
// company_id = authz.company_id_of(uid) AND submitted_by = uid, so the insert cannot be aimed at
// another tenant even if the checks below were wrong.
export const POST = withApi(
  { schema: { body: verificationSubmitSchema }, allowedRoles: ['recruiter'], auditLog: true },
  async (_req, { user, body }) => {
    const insforge = await getServerInsforgeClient();
    if (!insforge) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Company scope is derived from the caller's membership, never from body.company_id.
    // 'invited' is included (mig 052): the founder stays invited until verification approval,
    // and must be able to resubmit after needs_more_info/rejected (doc 04 §3).
    const { data: membership } = await insforge.database
      .from('company_members')
      .select('company_id, member_role')
      .eq('user_id', user.id)
      .in('status', ['invited', 'active'])
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: 'no active company' }, { status: 403 });
    }
    if (membership.member_role !== 'admin') {
      return NextResponse.json({ error: 'company admins only' }, { status: 403 });
    }
    if (membership.company_id !== body.company_id) {
      return NextResponse.json({ error: 'company_id does not match your membership' }, { status: 403 });
    }

    const { data, error } = await insforge.database
      .from('company_verification_requests')
      .insert({
        company_id: membership.company_id,
        submitted_by: user.id,
        channel: body.channel,
        kyc_documents: body.kyc_documents ?? null,
        status: 'submitted',
      })
      .select('id, status, created_at')
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Failed to submit verification request' }, { status: 403 });
    }

    return NextResponse.json({ status: 'submitted', request_id: data.id, created_at: data.created_at });
  }
);
