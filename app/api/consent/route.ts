import { NextResponse } from 'next/server';
import { getServerUser } from '@/lib/server-auth';
import { fetchConsentRows } from '@/lib/consent/withdraw-db';
import { WITHDRAWABLE_PURPOSES, currentStatus } from '@/lib/consent/withdraw';

// GET /api/consent — current withdrawable-consent state for the logged-in user, read by the
// settings-page consent panel (doc 26 §4 L-3).
export async function GET() {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const rows = await fetchConsentRows(user.id, user.email);
    const consents: Record<string, 'granted' | 'withdrawn'> = {};
    for (const purpose of WITHDRAWABLE_PURPOSES) {
      consents[purpose] = currentStatus(rows, purpose);
    }
    return NextResponse.json({ consents });
  } catch (err: any) {
    console.error('[consent] GET failed', { userId: user.id, error: err.message });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
