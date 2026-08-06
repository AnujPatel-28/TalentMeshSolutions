import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@insforge/sdk';
import crypto from 'node:crypto';
import { getRawCookieDomain } from '@/lib/cookies';
import { validateSignup } from '@/lib/validation/auth';
import { CONSENT_COPY, CONSENT_NOTICE_VERSION, type ConsentPurpose } from '@/lib/consent/copy';

const INSFORGE_URL = process.env.NEXT_PUBLIC_INSFORGE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!;
const SERVICE_KEY = process.env.INSFORGE_SERVICE_KEY;

export async function POST(request: NextRequest) {
  try {
    // Fail closed, before any account exists: without a service key there is no way to persist
    // consent at all, and the point of this route is that signup must not succeed without it.
    if (!SERVICE_KEY) {
      console.error('[signup] INSFORGE_SERVICE_KEY not configured — refusing to create an account with no consent path');
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }

    const body = await request.json();

    // Server-side enforcement is the point (doc 26 L-2): a client-only checkbox is not evidence.
    // This also rejects the signup outright when age_18_plus or a required consent is missing,
    // before any account is created.
    const validation = validateSignup(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid signup data', fieldErrors: validation.errors }, { status: 400 });
    }
    // Non-null: validateSignup's return type doesn't narrow `data` off `success` on its own
    // (pre-existing helper, first strict-typed caller), but the early return above guarantees it.
    const { email, password, role, name, consents } = validation.data!;

    const client = createClient({
      baseUrl: INSFORGE_URL,
      anonKey: ANON_KEY,
      isServerMode: true,
    });

    // Consent is persisted BEFORE the account is created, deliberately.
    //
    // There is no distributed transaction across this route and the auth-signup edge function, so
    // one of the two orderings has to lose. Writing consent second means a failed insert leaves an
    // account with no consent record — an account processing personal data with no lawful basis on
    // record, which is exactly the defect L-2 exists to prevent (doc 26 §1.1). Writing consent
    // first inverts the failure into a harmless one: rows keyed by email with no account attached.
    // So this insert is fail-closed — no consent row, no account.
    //
    // user_id is always null here: when email verification is required (it is live), auth-signup's
    // response omits `user`, and at this point the account does not exist at all. It is backfilled
    // below on the immediate-session path, and in app/api/auth/verify/route.ts otherwise. See
    // insforge/migrations/063_consent_records.sql for why matching on email is safe.
    const insforgeAdmin = createClient({ baseUrl: INSFORGE_URL, anonKey: SERVICE_KEY, isServerMode: true });
    const grantedPurposes = (Object.keys(CONSENT_COPY) as ConsentPurpose[]).filter(
      (purpose) => (consents as Record<string, boolean | undefined>)[purpose] === true
    );

    try {
      const rows = grantedPurposes.map((purpose) => ({
        email,
        user_id: null,
        purpose,
        status: 'granted' as const,
        notice_version: CONSENT_NOTICE_VERSION,
        notice_hash: crypto.createHash('sha256').update(CONSENT_COPY[purpose]).digest('hex'),
        source: 'signup' as const,
        ip_address: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
        user_agent: request.headers.get('user-agent') || null,
      }));
      const { error: consentError } = await insforgeAdmin.database.from('consent_records').insert(rows);
      if (consentError) throw new Error(consentError.message);
    } catch (consentErr: any) {
      console.error('[signup] CONSENT_PERSIST_FAILED — refusing to create the account', { email, grantedPurposes, error: consentErr.message });
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }

    const { data, error } = await client.functions.invoke('auth-signup', {
      body: { email, password, role, name },
    });

    if (error) {
      // The consent rows above are now orphaned: email set, user_id null, no account. They are
      // left in place rather than deleted — the table is append-only evidence, and the user did
      // grant these consents. A later signup with the same email adopts them via the same
      // email-matched backfill.
      console.error('[signup API proxy] Edge function error:', error.message);
      return NextResponse.json({ error: error.message }, { status: error.statusCode || 400 });
    }

    // Immediate-session path (no email verification): the id is knowable now, so attach it here
    // rather than waiting for a /verify call that will never come. Best-effort — the account
    // exists and is valid either way, and the rows remain retrievable by email if this fails.
    const userId: string | null = data?.user?.id || data?.session?.user?.id || null;
    if (userId) {
      const { error: backfillError } = await insforgeAdmin.database
        .from('consent_records')
        .update({ user_id: userId })
        .eq('email', email)
        .is('user_id', null);
      if (backfillError) {
        console.error('[signup] CONSENT_BACKFILL_FAILED', { email, userId, error: backfillError.message });
      }
    }

    const response = NextResponse.json(data, { status: 200 });

    const accessToken = data?.accessToken || data?.access_token;
    const refreshToken = data?.refreshToken || data?.refresh_token;
    const expiresIn = data?.expiresIn || data?.expires_in || 3600;

    if (accessToken) {
      const host = request.headers.get('host') || '';
      const domain = getRawCookieDomain(host);

      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        sameSite: 'lax' as const,
        ...(domain ? { domain } : {}),
      };

      response.cookies.set('tm_access_token', accessToken, {
        ...cookieOptions,
        maxAge: expiresIn,
      });

      if (refreshToken) {
        response.cookies.set('tm_refresh_token', refreshToken, {
          ...cookieOptions,
          maxAge: 60 * 60 * 24 * 30, // 30 days
        });
        response.cookies.set('insforge_refresh_token', refreshToken, {
          ...cookieOptions,
          maxAge: 60 * 60 * 24 * 30, // 30 days
        });
      }
    }

    return response;
  } catch (err: any) {
    console.error('[signup API proxy] Unexpected error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
