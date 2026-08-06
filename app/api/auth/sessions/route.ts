import { NextRequest, NextResponse } from 'next/server';
import { getCookieDomain, getRawCookieDomain } from '@/lib/cookies';

const INSFORGE_URL = process.env.NEXT_PUBLIC_INSFORGE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!;
const IS_PROD = process.env.NODE_ENV === 'production';

/**
 * Proxy for POST /api/auth/sessions (login).
 * Strips the `Secure` flag from InsForge's Set-Cookie response on HTTP localhost
 * so the `insforge_refresh_token` httpOnly cookie is actually stored by the browser.
 * On production (HTTPS) the cookie is forwarded unchanged.
 */
export async function POST(request: NextRequest) {
  const body = await request.text();

  const insforgeRes = await fetch(`${INSFORGE_URL.replace(/\/$/, '')}/api/auth/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
      'x-client-info': 'talentmesh-web',
    },
    body,
  });

  if (!insforgeRes.ok) {
    const errorText = await insforgeRes.text();
    console.error(`[sessions] InsForge error ${insforgeRes.status}:`, errorText);
    return new NextResponse(errorText, {
      status: insforgeRes.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const responseBody = await insforgeRes.text();
  let parsedData: any = null;
  try {
    parsedData = JSON.parse(responseBody);
  } catch (e) {
    console.error('[sessions] Failed to parse JSON:', e);
  }

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
  }

  // Forward Set-Cookie headers, stripping Secure on localhost so the browser stores them
  insforgeRes.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') {
      // If this set-cookie header is setting insforge_refresh_token, skip forwarding it
      // since we explicitly manage it via response.cookies.set
      if (value.toLowerCase().includes('insforge_refresh_token=')) {
        return;
      }

      let fixed = value;
      // Inject root domain for multi-tenant cookie sharing
      const host = request.headers.get('host') || '';
      if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
        if (!fixed.toLowerCase().includes('domain=')) {
          const domainStr = getCookieDomain(host);
          if (domainStr) {
            fixed = `${fixed}${domainStr}`;
          }
        }
      } else {
        // Localhost: strip Domain if present so browser accepts it
        fixed = fixed.replace(/Domain=[^;]+(;|$)/i, '').replace(/;\s*$/, '');
      }

      if (process.env.NODE_ENV === 'development') {
        fixed = fixed.replace(/SameSite=None/gi, 'SameSite=Lax');
        fixed = fixed.replace(/Secure/gi, '');
      }
      
      response.headers.append('Set-Cookie', fixed);
    }
  });

  return response;
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get('tm_access_token')?.value;

  if (!token) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  try {
    const { data, error } = await fetch(`${INSFORGE_URL.replace(/\/$/, '')}/api/auth/sessions`, {
      method: 'GET',
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${token}`,
        'x-client-info': 'talentmesh-web',
      },
    }).then(res => res.json());

    if (error || !data?.user) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    return NextResponse.json({ user: data.user }, { status: 200 });
  } catch (err) {
    console.error('[sessions] GET Error:', err);
    return NextResponse.json({ user: null }, { status: 200 });
  }
}

