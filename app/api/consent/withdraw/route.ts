import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/server-auth';
import { insforgeAdmin } from '@/lib/insforge-admin';
import { CONSENT_NOTICE_VERSION } from '@/lib/consent/copy';
import { isWithdrawable, NON_WITHDRAWABLE_REASON, type WithdrawablePurpose } from '@/lib/consent/withdraw';

// POST /api/consent/withdraw — one route for both directions of an optional-purpose consent
// (withdraw and regrant), since withdrawal must be as easy as giving consent (doc 26 §4 L-3) and
// a settings toggle naturally goes both ways. Writes go through the service key: client roles
// have SELECT only on consent_records (insforge/migrations/063_consent_records.sql) — same
// fail-closed, service-key pattern as app/api/auth/signup/route.ts.
export async function POST(request: NextRequest) {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const purpose = body?.purpose;
  const status = body?.status;

  if (status !== 'granted' && status !== 'withdrawn') {
    return NextResponse.json({ error: 'status must be "granted" or "withdrawn"' }, { status: 400 });
  }

  // Server-side enforcement, not just a disabled button: account_processing/terms_of_service/
  // age_18_plus and any unlisted purpose (resume_parsing_ai, analytics_cookies, typos) are
  // rejected here regardless of what the client sends.
  if (typeof purpose !== 'string' || !isWithdrawable(purpose)) {
    const reason =
      typeof purpose === 'string' && purpose in NON_WITHDRAWABLE_REASON
        ? NON_WITHDRAWABLE_REASON[purpose as keyof typeof NON_WITHDRAWABLE_REASON]
        : 'Unknown or non-withdrawable consent purpose.';
    return NextResponse.json({ error: reason }, { status: 400 });
  }
  const withdrawablePurpose = purpose as WithdrawablePurpose;

  if (!insforgeAdmin) {
    console.error('[consent/withdraw] INSFORGE_SERVICE_KEY not configured');
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }

  // Append-only: this insert is the statutory record of the withdrawal/regrant itself, written
  // before the downstream effect below — the same ordering signup/route.ts uses, and for the same
  // reason: the record of what the user did must exist even if the enforcement step that follows
  // fails.
  const { error: insertError } = await insforgeAdmin.database.from('consent_records').insert({
    email: user.email,
    user_id: user.id,
    purpose: withdrawablePurpose,
    status,
    notice_version: CONSENT_NOTICE_VERSION,
    notice_hash: null, // no fixed notice text is "displayed" for a settings toggle the way signup's checkbox copy is
    source: 'settings',
    ip_address: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
    user_agent: request.headers.get('user-agent') || null,
  });

  if (insertError) {
    console.error('[consent/withdraw] CONSENT_WRITE_FAILED', {
      userId: user.id,
      purpose: withdrawablePurpose,
      status,
      error: insertError.message,
    });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }

  // Real downstream effect (doc 26 §4 L-3: "a withdrawal that changes nothing is worse than
  // none"). marketing_email has no live send path to gate — verified 2026-07-29, see
  // lib/consent/withdraw-db.ts — so there is nothing to flip for it today.
  let effectApplied = true;
  if (withdrawablePurpose === 'profile_visible_to_recruiters' && user.role === 'candidate') {
    const { error: effectError } = await insforgeAdmin.database
      .from('candidate_profiles')
      .update({ is_discoverable: status === 'granted' })
      .eq('id', user.id);
    if (effectError) {
      effectApplied = false;
      console.error('[consent/withdraw] DOWNSTREAM_EFFECT_FAILED', {
        userId: user.id,
        purpose: withdrawablePurpose,
        error: effectError.message,
      });
    }
  }

  return NextResponse.json({ purpose: withdrawablePurpose, status, effectApplied }, { status: 200 });
}
