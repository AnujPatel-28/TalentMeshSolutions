import { NextRequest, NextResponse } from 'next/server';

import { buildAuthClearCookies, getCookieDomain } from '@/lib/cookies';

function getUserIdFromToken(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    return payload.sub || null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // SECURITY: `role`/`adminAccess` are intentionally NOT read from the body.
    // The client cannot be trusted to declare its own privilege level; role and
    // admin-access cookies are derived below only from the token-authenticated
    // profile fetch. onboarding/mfa/company are non-privileged routing hints.
    const { token, onboardingComplete, mfaEnabled, companyId } = body;

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const host = request.headers.get('host') || '';
    const isSecure = process.env.NODE_ENV === 'production' || request.headers.get('x-forwarded-proto') === 'https';
    // SameSite=Lax (not None): the token cookie is only ever needed same-origin and on
    // top-level navigations between jobs./app./admin., both of which Lax permits. See
    // 10_Auth_Token_Propagation_And_Subdomain_Fix.md §4.
    const sameSiteStr = isSecure ? 'SameSite=Lax; Secure;' : 'SameSite=Lax;';
    const domainStr = getCookieDomain(host);

    const cookieOptions = `Path=/; HttpOnly; ${sameSiteStr} Max-Age=${60 * 60 * 24 * 7}${domainStr}`;

    const response = NextResponse.json({ success: true }, { status: 200 });
    
    response.headers.append('Set-Cookie', `tm_access_token=${token}; ${cookieOptions}`);

    // Non-HttpOnly signal cookie — carries no sensitive data, just signals to client JS
    // that a session exists. Required for cross-subdomain auth detection (e.g. jobs.domain.com)
    // where the HttpOnly tm_access_token is invisible to document.cookie.
    const signalCookieOptions = `Path=/; ${sameSiteStr} Max-Age=${60 * 60 * 24 * 7}${domainStr}`;
    response.headers.append('Set-Cookie', `tm_session=1; ${signalCookieOptions}`);

    // Non-privileged routing hints may come from the client as a fast path...
    if (onboardingComplete !== undefined) {
      response.headers.append('Set-Cookie', `tm_onboarding=${onboardingComplete ? 'true' : 'false'}; ${cookieOptions}`);
    }
    if (mfaEnabled !== undefined) {
      response.headers.append('Set-Cookie', `tm_mfa=${mfaEnabled ? 'true' : 'false'}; ${cookieOptions}`);
    }
    if (companyId !== undefined) {
      response.headers.append('Set-Cookie', `tm_company=${companyId || ''}; ${cookieOptions}`);
    }

    // ...but role and admin-access are ALWAYS derived from the profile, authenticated
    // by the bearer token (a forged token can't read a real profile row). The client's
    // claimed role/adminAccess is never trusted. See 01_Auth_Security_Audit_Report (C-3).
    try {
      const userId = getUserIdFromToken(token);
      if (userId) {
        const profileUrl = `${process.env.NEXT_PUBLIC_INSFORGE_URL}/api/database/records/profiles?id=eq.${userId}&select=role,completed_onboarding,mfa_enabled`;

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000); // 5s timeout

        let profile: any = null;
        try {
          const profileRes = await fetch(profileUrl, {
            method: 'GET',
            headers: {
              'apikey': process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
              'Authorization': `Bearer ${token}`,
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
          const resolvedRole = profile.role || 'candidate';
          // Authoritative role + admin-access, derived from the verified profile only.
          response.headers.append('Set-Cookie', `tm_role=${resolvedRole}; ${cookieOptions}`);
          if (resolvedRole === 'admin' || resolvedRole === 'super_admin') {
            response.headers.append('Set-Cookie', `tm_admin_access=true; ${cookieOptions}`);
          }
          if (onboardingComplete === undefined) {
            response.headers.append('Set-Cookie', `tm_onboarding=${profile.completed_onboarding ? 'true' : 'false'}; ${cookieOptions}`);
          }
          if (mfaEnabled === undefined) {
            response.headers.append('Set-Cookie', `tm_mfa=${profile.mfa_enabled ? 'true' : 'false'}; ${cookieOptions}`);
          }
          if (resolvedRole === 'recruiter' && companyId === undefined) {
            const recUrl = `${process.env.NEXT_PUBLIC_INSFORGE_URL}/api/database/records/recruiter_profiles?id=eq.${userId}&select=company_id`;
            const recController = new AbortController();
            const recTimer = setTimeout(() => recController.abort(), 5000);
            try {
              const recRes = await fetch(recUrl, {
                method: 'GET',
                headers: {
                  'apikey': process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                signal: recController.signal,
              });
              if (recRes.ok) {
                const recData = await recRes.json();
                if (Array.isArray(recData) && recData.length > 0) {
                  response.headers.append('Set-Cookie', `tm_company=${recData[0].company_id || ''}; ${cookieOptions}`);
                }
              }
            } finally {
              clearTimeout(recTimer);
            }
          }
        }
      }
    } catch (profileErr) {
      // Non-critical — routing cookies will be stale until next refresh. Role/admin
      // cookies simply won't be set (fail-safe: no privilege granted).
      console.warn('[auth/session] Could not derive routing cookies from profile:', profileErr);
    }

    return response;
  } catch (err) {
    console.error('[auth/session] POST Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const isSecure = process.env.NODE_ENV === 'production' || request.headers.get('x-forwarded-proto') === 'https';
  const response = NextResponse.json({ success: true }, { status: 200 });

  for (const value of buildAuthClearCookies(host, isSecure)) {
    response.headers.append('Set-Cookie', value);
  }

  // tm_session is a non-HttpOnly signal cookie
  const sameSiteStr = isSecure ? 'SameSite=Lax; Secure;' : 'SameSite=Lax;';
  const domainStr = getCookieDomain(host);
  const clearSignalOptions = `Path=/; ${sameSiteStr} Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT${domainStr}`;
  response.headers.append('Set-Cookie', `tm_session=; ${clearSignalOptions}`);
  return response;
}
