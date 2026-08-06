import { NextRequest, NextResponse } from 'next/server';

import { getCookieDomain } from '@/lib/cookies';

const INSFORGE_URL = process.env.NEXT_PUBLIC_INSFORGE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!;

export async function GET(request: NextRequest, props: { params: Promise<{ path: string[] }> }) {
  return handleProxy(request, props);
}
export async function POST(request: NextRequest, props: { params: Promise<{ path: string[] }> }) {
  return handleProxy(request, props);
}
export async function PUT(request: NextRequest, props: { params: Promise<{ path: string[] }> }) {
  return handleProxy(request, props);
}
export async function PATCH(request: NextRequest, props: { params: Promise<{ path: string[] }> }) {
  return handleProxy(request, props);
}
export async function DELETE(request: NextRequest, props: { params: Promise<{ path: string[] }> }) {
  return handleProxy(request, props);
}
export async function OPTIONS(request: NextRequest, props: { params: Promise<{ path: string[] }> }) {
  return handleProxy(request, props);
}
export async function HEAD(request: NextRequest, props: { params: Promise<{ path: string[] }> }) {
  return handleProxy(request, props);
}

/**
 * Attempt a server-side token refresh using the httpOnly refresh cookie.
 * Returns the new access token string, or null on failure.
 */
async function refreshServerToken(
  request: NextRequest,
): Promise<{ accessToken: string; csrfToken?: string; setCookieHeaders: string[] } | null> {
  try {
    const csrfToken = request.cookies.get('insforge_csrf_token')?.value || '';
    const cookieHeader = request.headers.get('cookie') || '';

    const res = await fetch(`${INSFORGE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      },
    });

    if (!res.ok) return null;

    const data = await res.json();
    const newToken = data?.accessToken || null;
    if (!newToken) return null;

    const setCookieHeaders: string[] = [];
    res.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') {
        setCookieHeaders.push(value);
      }
    });

    return { accessToken: newToken, csrfToken: data?.csrfToken, setCookieHeaders };
  } catch (err) {
    console.error('[refreshServerToken] Error:', err);
    return null;
  }
}

/**
 * Extract the best available user token from the incoming request.
 *
 * Priority:
 *  1. Authorization header sent by the SDK (already has the user's JWT)
 *  2. tm_access_token cookie set by our auth flow
 *  3. Fallback to the anon key
 */
function resolveToken(request: NextRequest): string {
  // 1. Trust the Authorization header only if it carries a real JWT (not the anon key).
  //    A non-JWT value means the caller had no token — e.g. `Bearer null` from a caller
  //    reading a now-removed sessionStorage copy — and must fall through to the cookie,
  //    not be forwarded upstream as a broken credential.
  const authHeader = request.headers.get('authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    const headerToken = authHeader.slice(7).trim();
    if (headerToken && headerToken !== ANON_KEY && headerToken.split('.').length === 3) {
      return headerToken;
    }
  }

  // 2. Try the tm_access_token cookie
  const cookieHeader = request.headers.get('cookie') || '';
  if (cookieHeader) {
    const match = cookieHeader.match(/tm_access_token=([^;]+)/);
    if (match) {
      let raw = decodeURIComponent(match[1]).trim();
      // Strip leading "Bearer " if it was accidentally stored with that prefix
      if (raw.startsWith('Bearer ')) raw = raw.slice(7).trim();
      if (raw && raw !== ANON_KEY) {
        return raw;
      }
    }
  }

  // 3. Anon key fallback
  return ANON_KEY;
}

async function handleProxy(
  request: NextRequest,
  props: { params: Promise<{ path: string[] }> },
) {
  const url = new URL(request.url);
  const rawPath = url.pathname.replace(/^\/api\/storage/, '');
  const targetUrl = `${INSFORGE_URL}/api/storage${rawPath}${url.search}`;

  // Build forwarding headers
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('content-length');
  headers.set('x-insforge-url', INSFORGE_URL);
  headers.set('x-insforge-anon-key', ANON_KEY);
  if (process.env.INSFORGE_SERVICE_KEY) {
    headers.set('x-insforge-service-key', process.env.INSFORGE_SERVICE_KEY);
  }

  // Set the best available token as the Authorization header
  const token = resolveToken(request);
  headers.set('authorization', `Bearer ${token}`);

  try {
    let requestBody: any = undefined;
    if (!['GET', 'HEAD'].includes(request.method)) {
      requestBody = await request.arrayBuffer();
    }

    const fetchOptions: RequestInit = {
      method: request.method,
      headers,
      redirect: 'manual',
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : requestBody,
      // @ts-ignore
      duplex: 'half',
      cache: 'no-store',
    };

    let response = await fetch(targetUrl, fetchOptions);

    // On 401 try a server-side token refresh and retry once
    if (response.status === 401) {
      const refreshResult = await refreshServerToken(request);
      if (refreshResult) {
        const newHeaders = new Headers(headers);
        newHeaders.set('authorization', `Bearer ${refreshResult.accessToken}`);

        response = await fetch(targetUrl, { ...fetchOptions, headers: newHeaders });

        const responseHeaders = new Headers(response.headers);
        const newResponse = new NextResponse(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders,
        });

        const isSecure = process.env.NODE_ENV === 'production';
        const sameSiteStr = isSecure ? 'SameSite=Lax; Secure;' : 'SameSite=Lax;';
        // HttpOnly + parent-domain scoped, matching the single token-cookie contract in
        // 10_Auth_Token_Propagation_And_Subdomain_Fix.md §4. Previously this wrote a
        // JS-readable, host-only copy that re-opened H-8 and broke sibling subdomains.
        const domainStr = getCookieDomain(request.headers.get('host') || '');
        newResponse.headers.append(
          'Set-Cookie',
          `tm_access_token=${refreshResult.accessToken}; path=/; HttpOnly; ${sameSiteStr} max-age=${60 * 60 * 24 * 7}${domainStr}`,
        );

        refreshResult.setCookieHeaders.forEach((value) => {
          let fixed = value;
          if (!isSecure) {
            fixed = fixed.replace(/SameSite=None/gi, 'SameSite=Lax').replace(/Secure/gi, '');
          }
          newResponse.headers.append('Set-Cookie', fixed);
        });

        fixCookies(request, response, newResponse);
        return newResponse;
      }
    }

    const responseHeaders = new Headers(response.headers);
    const newResponse = new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });

    fixCookies(request, response, newResponse);
    return newResponse;
  } catch (error) {
    console.error('Storage proxy error:', error);
    return new NextResponse(JSON.stringify({ error: 'Storage proxy error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

function fixCookies(request: NextRequest, sourceResponse: Response, targetResponse: NextResponse) {
  const host = request.headers.get('host') || '';
  const isLocal = host.includes('localhost') || host.includes('127.0.0.1');

  // Remove the merged Set-Cookie header that might have been copied
  targetResponse.headers.delete('set-cookie');

  const setCookies =
    typeof sourceResponse.headers.getSetCookie === 'function'
      ? sourceResponse.headers.getSetCookie()
      : [];

  setCookies.forEach((value) => {
    let fixed = value;

    if (isLocal) {
      fixed = fixed.replace(/Domain=[^;]+(;|$)/i, '').replace(/;\s*$/, '');
    } else {
      const parts = host.split(':');
      const domainParts = parts[0].split('.');
      const baseDomain =
        domainParts.length > 2 ? domainParts.slice(-2).join('.') : domainParts.join('.');

      if (fixed.toLowerCase().includes('domain=')) {
        fixed = fixed.replace(/Domain=[^;]+(;|$)/i, `Domain=.${baseDomain};`);
      } else {
        fixed = `${fixed}; Domain=.${baseDomain}`;
      }
    }

    if (process.env.NODE_ENV === 'development') {
      fixed = fixed.replace(/SameSite=None/gi, 'SameSite=Lax');
      fixed = fixed.replace(/Secure/gi, '');
    }

    targetResponse.headers.append('Set-Cookie', fixed);
  });
}
