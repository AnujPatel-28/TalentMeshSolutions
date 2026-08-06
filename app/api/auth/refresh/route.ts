import { NextRequest, NextResponse } from 'next/server';
import { getRawCookieDomain } from '@/lib/cookies';
import { resolveMockRole } from '@/lib/mock-auth';

const INSFORGE_URL = process.env.NEXT_PUBLIC_INSFORGE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!;
const IS_PROD = process.env.NODE_ENV === 'production';

/**
 * Proxy for POST /api/auth/refresh (token refresh).
 * Forwards the `insforge_refresh_token` cookie (stored at path /api/auth)
 * and `insforge_csrf_token` cookie to InsForge and returns the new access token.
 * Also strips `Secure` from Set-Cookie responses on localhost.
 */
export async function POST(request: NextRequest) {
  let csrfToken = request.headers.get('x-csrf-token') || '';
  let cookieHeader = request.headers.get('cookie') || '';

  // E2E mock token interception — exact match on the tm_access_token cookie through the
  // shared three-condition gate (previously a substring scan of the whole Cookie header).
  // See lib/mock-auth.ts (W1).
  const mockRole = resolveMockRole(request.cookies.get('tm_access_token')?.value);
  if (mockRole) {
    const isAdmin = mockRole === 'admin';
    const mockToken = isAdmin ? process.env.E2E_MOCK_ADMIN_TOKEN! : process.env.E2E_MOCK_CANDIDATE_TOKEN!;
    const parsedData = {
      accessToken: mockToken,
      refreshToken: mockToken,
      expiresIn: 3600,
      user: isAdmin
        ? { id: 'adm-uuid-999', email: 'admin@test.com', name: 'Super Admin', role: 'super_admin' }
        : { id: 'cand-uuid-123', email: 'candidate@test.com', name: 'Fake Candidate', role: 'candidate' }
    };
    const response = NextResponse.json(parsedData);
    response.cookies.set('tm_access_token', mockToken, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 3600 });
    response.cookies.set('tm_role', isAdmin ? 'super_admin' : 'candidate', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 3600 });
    return response;
  }

  // If the browser only sent tm_refresh_token (from OAuth), map it to insforge_refresh_token for the backend
  if (cookieHeader && !cookieHeader.includes('insforge_refresh_token=') && cookieHeader.includes('tm_refresh_token=')) {
    const match = cookieHeader.match(/tm_refresh_token=([^;]+)/);
    if (match) {
      cookieHeader = `${cookieHeader}; insforge_refresh_token=${match[1]}`;
    }
  }

  // To prevent tab-specific sessionStorage mismatch issues, fall back to extracting the CSRF token directly from the cookie
  if (cookieHeader && cookieHeader.includes('insforge_csrf_token=')) {
    const match = cookieHeader.match(/insforge_csrf_token=([^;]+)/);
    if (match) {
      csrfToken = decodeURIComponent(match[1]);
    }
  }

  let extractedRefreshToken = '';
  if (cookieHeader) {
    const rtMatch = cookieHeader.match(/insforge_refresh_token=([^;]+)/);
    if (rtMatch) {
      extractedRefreshToken = rtMatch[1];
    }
  }

  // If there's no refresh token, the user is genuinely logged out.
  // Return 401 early to avoid hitting the backend and throwing scary proxy errors.
  if (!extractedRefreshToken) {
    return NextResponse.json(
      { error: 'AUTH_UNAUTHORIZED', message: 'No refresh token provided in cookies' },
      { status: 401 }
    );
  }

  const insforgeRes = await fetch(`${INSFORGE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
      ...(cookieHeader ? { 'Cookie': cookieHeader } : {}),
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    },
  });

  const responseBody = await insforgeRes.text();

  if (!insforgeRes.ok) {
    console.error('[Refresh Proxy Error]', {
      status: insforgeRes.status,
      body: responseBody,
      hasCookie: !!cookieHeader,
      hasCsrfToken: !!csrfToken,
      csrfHeader: csrfToken
    });
  }

  let parsedData: any = null;
  try {
    parsedData = JSON.parse(responseBody);
  } catch (e) {}

  const response = new NextResponse(responseBody, {
    status: insforgeRes.status,
    headers: { 'Content-Type': insforgeRes.headers.get('Content-Type') || 'application/json' },
  });

  if (insforgeRes.ok && parsedData) {
    const accessToken = parsedData.access_token || parsedData.accessToken;
    const refreshToken = parsedData.refresh_token || parsedData.refreshToken;
    const expiresIn = parsedData.expires_in || parsedData.expiresIn || 3600;

    const host = request.headers.get('host') || '';
    const domain = getRawCookieDomain(host);

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax' as const,
      ...(domain ? { domain } : {})
    };

    if (accessToken) {
      response.cookies.set('tm_access_token', accessToken, {
        ...cookieOptions,
        maxAge: expiresIn,
      });
    }

    // Non-HttpOnly signal cookie — lets client JS detect session across subdomains
    response.cookies.set('tm_session', '1', {
      ...cookieOptions,
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 7,
    });

    if (refreshToken) {
      response.cookies.set('tm_refresh_token', refreshToken, {
        ...cookieOptions,
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
      // Explicitly delete any legacy insforge_refresh_token cookie on the root path '/' to prevent duplicates
      response.cookies.set('insforge_refresh_token', '', {
        ...cookieOptions,
        path: '/',
        maxAge: 0,
      });
      // Set the path explicitly to /api/auth to limit cookie exposure and match backend
      response.cookies.set('insforge_refresh_token', refreshToken, {
        ...cookieOptions,
        path: '/api/auth',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
    }

    const newCsrf = parsedData.csrfToken || parsedData.csrf_token;
    if (newCsrf) {
      response.cookies.set('insforge_csrf_token', newCsrf, {
        ...cookieOptions,
        httpOnly: false, // Must be accessible to client JS
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
    }

    // Enrich routing metadata cookies from profile
    if (accessToken) {
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
            response.cookies.set('tm_role', profile.role || 'candidate', { ...cookieOptions, maxAge: expiresIn });
            response.cookies.set('tm_onboarding', profile.completed_onboarding ? 'true' : 'false', { ...cookieOptions, maxAge: expiresIn });
            response.cookies.set('tm_mfa', profile.mfa_enabled ? 'true' : 'false', { ...cookieOptions, maxAge: expiresIn });

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
                    response.cookies.set('tm_company', recData[0].company_id || '', { ...cookieOptions, maxAge: expiresIn });
                  }
                }
              } finally {
                clearTimeout(recTimer);
              }
            }
          }
        }
      } catch (profileErr) {
        // Non-critical — routing cookies will be slightly stale until next refresh
        console.warn('[Refresh Proxy] Could not enrich routing cookies:', profileErr);
      }
    }
  }

  // Forward Set-Cookie headers, stripping Secure on localhost
  insforgeRes.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') {
      // If this set-cookie header is setting insforge_refresh_token, skip forwarding it
      // since we explicitly manage it via response.cookies.set
      if (value.toLowerCase().includes('insforge_refresh_token=')) {
        return;
      }

      const fixed = IS_PROD
        ? value
        : value.replace(/;\s*Secure/gi, '').replace(/SameSite=None/gi, 'SameSite=Lax');
      response.headers.append('Set-Cookie', fixed);
    }
  });

  return response;
}

