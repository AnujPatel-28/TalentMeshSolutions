import { NextRequest, NextResponse } from 'next/server';
import { getRawCookieDomain, getCookieDomain } from '@/lib/cookies';

const INSFORGE_URL = process.env.NEXT_PUBLIC_INSFORGE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!;

/**
 * Proxy for POST /api/auth/oauth/exchange (OAuth callback code exchange).
 * Strips the `Secure` flag from InsForge's Set-Cookie response on HTTP localhost
 * so the `insforge_refresh_token` httpOnly cookie is actually stored by the browser.
 * On production (HTTPS) the cookie is forwarded unchanged.
 */
export async function POST(request: NextRequest) {
  const body = await request.text();

  const searchParams = request.nextUrl.searchParams.toString();
  const queryString = searchParams ? `?${searchParams}` : '';

  const exchangeUrl = `${INSFORGE_URL.replace(/\/$/, '')}/api/auth/oauth/exchange${queryString}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': ANON_KEY,
    'Authorization': `Bearer ${ANON_KEY}`,
    'x-client-info': 'talentmesh-web',
  };


  let insforgeRes: Response;
  try {
    // OAuth codes are single-use — do NOT retry on failure or timeout, or the code
    // will be consumed by the first attempt and the retry will get "Invalid or expired code".
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000); // generous 30s timeout
    try {
      insforgeRes = await fetch(exchangeUrl, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  } catch (err: any) {
    console.error('[oauth/exchange] Exchange request failed:', err.name, err.message);
    return NextResponse.json(
      { error: 'OAuth exchange timed out. Please try logging in again.' },
      { status: 504 }
    );
  }

  if (!insforgeRes.ok) {
    const errorText = await insforgeRes.text();
    console.error(`[oauth/exchange] InsForge error ${insforgeRes.status}:`, errorText);
    return new NextResponse(errorText || `{"error": "HTTP ${insforgeRes.status}"}`, {
      status: insforgeRes.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const responseBody = await insforgeRes.text();

  let parsedData: any = null;
  let safeBody = responseBody.trim() === '' ? '{}' : responseBody;

  try {
    parsedData = JSON.parse(safeBody);
    
    // The InsForge SDK strictly expects camelCase properties (accessToken, user)
    // If the backend returns snake_case (access_token), we must map them for the SDK!
    if (insforgeRes.ok && parsedData) {
      let modified = false;
      if (parsedData.access_token && !parsedData.accessToken) {
        parsedData.accessToken = parsedData.access_token;
        modified = true;
      }
      if (parsedData.refresh_token && !parsedData.refreshToken) {
        parsedData.refreshToken = parsedData.refresh_token;
        modified = true;
      }
      if (parsedData.expires_in && !parsedData.expiresIn) {
        parsedData.expiresIn = parsedData.expires_in;
        modified = true;
      }
      
      if (modified) {
        safeBody = JSON.stringify(parsedData);
      }
    }
  } catch (e) {
    console.error('[oauth/exchange] Failed to parse JSON:', e);
  }

  const response = new NextResponse(safeBody, {
    status: insforgeRes.status,
    headers: { 'Content-Type': insforgeRes.headers.get('Content-Type') || 'application/json' },
  });

  // Extract tokens from JSON and explicitly set cookies
  if (insforgeRes.ok && parsedData) {
    const accessToken = parsedData.access_token || parsedData.accessToken;
    const refreshToken = parsedData.refresh_token || parsedData.refreshToken;
    const expiresIn = parsedData.expires_in || parsedData.expiresIn || 3600;

    const host = request.headers.get('host') || '';
    const domain = getRawCookieDomain(host);

    if (accessToken) {
      response.cookies.set('tm_access_token', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        sameSite: 'lax',
        maxAge: expiresIn,
        ...(domain ? { domain } : {})
      });
    }

    if (refreshToken) {
      response.cookies.set('tm_refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        ...(domain ? { domain } : {})
      });
    }
  }

  // Also forward any Set-Cookie headers from the backend just in case
  insforgeRes.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') {
      let fixed = value;
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
