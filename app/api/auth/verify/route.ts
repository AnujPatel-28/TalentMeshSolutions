import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@insforge/sdk';
import { getRawCookieDomain } from '@/lib/cookies';

const INSFORGE_URL = process.env.NEXT_PUBLIC_INSFORGE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!;
const SERVICE_KEY = process.env.INSFORGE_SERVICE_KEY;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, otp } = body;

    if (!email || !otp) {
      return NextResponse.json({ error: 'Missing email or OTP' }, { status: 400 });
    }

    const client = createClient({
      baseUrl: INSFORGE_URL,
      anonKey: ANON_KEY,
      isServerMode: true,
    });

    const { data, error } = await client.functions.invoke('auth-verify', {
      body: { email, otp },
    });

    if (error) {
      console.error('[verify API proxy] Edge function error:', error.message);
      return NextResponse.json({ error: error.message }, { status: error.statusCode || 400 });
    }

    // Edge function returns: { data: { accessToken, user, ... } }
    // If the data payload itself contains the error, return it
    if (data?.error) {
      return NextResponse.json({ error: data.error.message || data.error }, { status: 400 });
    }

    const verifyData = data?.data || data;
    const accessToken = verifyData?.accessToken || verifyData?.access_token;
    const refreshToken = verifyData?.refreshToken || verifyData?.refresh_token;
    const user = verifyData?.user;

    const response = NextResponse.json({ data: verifyData }, { status: 200 });

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
        maxAge: 3600, // 1 hour default
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

      // Enrich routing metadata cookies from profile
      try {
        const getUserId = (tok: string) => {
          try {
            const pts = tok.split('.');
            if (pts.length !== 3) return null;
            return JSON.parse(Buffer.from(pts[1], 'base64').toString('utf8')).sub || null;
          } catch {
            return null;
          }
        };

        const userId = getUserId(accessToken);

        // Backfill consent_records rows written at signup before verification completed, when
        // auth-signup's response had no user object yet (see insforge/migrations/063_consent_records.sql
        // and app/api/auth/signup/route.ts). Matches on email is safe because auth.users.email is
        // unique, so at most one signup is ever "pending" for a given email at a time.
        if (userId && SERVICE_KEY) {
          try {
            const insforgeAdmin = createClient({ baseUrl: INSFORGE_URL, anonKey: SERVICE_KEY, isServerMode: true });
            const { error: backfillError } = await insforgeAdmin.database
              .from('consent_records')
              .update({ user_id: userId })
              .eq('email', email)
              .is('user_id', null);
            if (backfillError) {
              console.error('[verify] CONSENT_BACKFILL_FAILED', { email, userId, error: backfillError.message });
            }
          } catch (backfillErr: any) {
            console.error('[verify] CONSENT_BACKFILL_FAILED', { email, userId, error: backfillErr.message });
          }
        }

        if (userId) {
          const profileUrl = `${INSFORGE_URL}/api/database/records/profiles?id=eq.${userId}&select=role,completed_onboarding,mfa_enabled`;
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 5000);
          
          let profile: any = null;
          try {
            const profileRes = await fetch(profileUrl, {
              method: 'GET',
              headers: {
                'apikey': ANON_KEY,
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              signal: controller.signal,
            });
            if (profileRes.ok) {
              const profilesData = await profileRes.json();
              if (Array.isArray(profilesData) && profilesData.length > 0) {
                profile = profilesData[0];
              }
            }
          } finally {
            clearTimeout(timer);
          }

          if (profile) {
            response.cookies.set('tm_role', profile.role || 'candidate', { ...cookieOptions, maxAge: 3600 });
            response.cookies.set('tm_onboarding', profile.completed_onboarding ? 'true' : 'false', { ...cookieOptions, maxAge: 3600 });
            response.cookies.set('tm_mfa', profile.mfa_enabled ? 'true' : 'false', { ...cookieOptions, maxAge: 3600 });

            if (profile.role === 'recruiter') {
              const recUrl = `${INSFORGE_URL}/api/database/records/recruiter_profiles?id=eq.${userId}&select=company_id`;
              const recController = new AbortController();
              const recTimer = setTimeout(() => recController.abort(), 5000);
              try {
                const recRes = await fetch(recUrl, {
                  method: 'GET',
                  headers: {
                    'apikey': ANON_KEY,
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                  },
                  signal: recController.signal,
                });
                if (recRes.ok) {
                  const recData = await recRes.json();
                  if (Array.isArray(recData) && recData.length > 0) {
                    response.cookies.set('tm_company', recData[0].company_id || '', { ...cookieOptions, maxAge: 3600 });
                  }
                }
              } finally {
                clearTimeout(recTimer);
              }
            }
          }
        }
      } catch (profileErr) {
        console.warn('[verify] Could not enrich routing cookies:', profileErr);
      }
    }

    return response;
  } catch (err: any) {
    console.error('[verify API proxy] Unexpected error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
