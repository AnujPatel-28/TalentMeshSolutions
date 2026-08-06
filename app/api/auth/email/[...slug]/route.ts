import { NextRequest, NextResponse } from 'next/server';
import { getCookieDomain } from '@/lib/cookies';

const INSFORGE_URL = process.env.NEXT_PUBLIC_INSFORGE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!;

/**
 * Proxy for POST /api/auth/email/* (password reset flows: send-reset-password, exchange-reset-password-token, reset-password).
 * Intercepts SDK auth requests that bypass v1/remote due to absolute leading slash URL construction
 * and forwards them directly to the remote InsForge backend.
 */
export async function POST(request: NextRequest, props: { params: Promise<{ slug: string[] }> }) {
  const params = await props.params;
  const slug = params.slug.join('/');
  const searchParams = request.nextUrl.searchParams.toString();
  const queryString = searchParams ? `?${searchParams}` : '';

  const targetUrl = `${INSFORGE_URL.replace(/\/$/, '')}/api/auth/email/${slug}${queryString}`;

  const body = await request.text();

  // Forward all headers except host
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('content-length');
  headers.set('x-client-info', 'talentmesh-web');
  headers.set('apikey', ANON_KEY);

  // Ensure Authorization header is present, fall back to ANON_KEY if not
  if (!headers.has('authorization')) {
    headers.set('authorization', `Bearer ${ANON_KEY}`);
  }

  try {
    const insforgeRes = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body,
    });

    if (!insforgeRes.ok) {
      const errorText = await insforgeRes.text();
      console.error(`[email-auth] InsForge error ${insforgeRes.status} for ${slug}:`, errorText);
      return new NextResponse(errorText, {
        status: insforgeRes.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const responseBody = await insforgeRes.text();
    const response = new NextResponse(responseBody, {
      status: insforgeRes.status,
      headers: { 'Content-Type': insforgeRes.headers.get('Content-Type') || 'application/json' },
    });

    // Fix cookies so the browser doesn't drop them on localhost / custom domain
    fixCookies(request, insforgeRes, response);

    return response;
  } catch (error: any) {
    console.error(`[email-auth] Proxy error for ${slug}:`, error);
    return new NextResponse(JSON.stringify({ 
      error: 'Proxy error',
      message: error?.message || String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

function fixCookies(request: NextRequest, sourceResponse: Response, targetResponse: NextResponse) {
  const host = request.headers.get('host') || '';
  const isLocal = host.includes('localhost') || host.includes('127.0.0.1');

  // Remove the merged Set-Cookie header that might have been copied
  targetResponse.headers.delete('set-cookie');

  // getSetCookie() returns an array of individual Set-Cookie strings
  const setCookies = typeof sourceResponse.headers.getSetCookie === 'function'
    ? sourceResponse.headers.getSetCookie()
    : [];

  setCookies.forEach((value) => {
    let fixed = value;

    if (isLocal) {
      fixed = fixed.replace(/Domain=[^;]+(;|$)/i, '').replace(/;\s*$/, '');
    } else {
      const domainStr = getCookieDomain(host);
      fixed = fixed.replace(/;\s*Domain=[^;]+/gi, '');
      fixed = `${fixed}${domainStr}`;
    }

    if (process.env.NODE_ENV === 'development') {
      fixed = fixed.replace(/SameSite=None/gi, 'SameSite=Lax');
      fixed = fixed.replace(/Secure/gi, '');
    }

    targetResponse.headers.append('Set-Cookie', fixed);
  });
}
