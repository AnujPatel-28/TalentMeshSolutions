import { NextRequest, NextResponse } from 'next/server';

const INSFORGE_URL = process.env.NEXT_PUBLIC_INSFORGE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!;

// In-memory rate limiting store: key -> { count, resetAt }
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

// Clean up expired entries every minute
if (typeof global !== 'undefined' && !(global as any).__rateLimitCleanup) {
  (global as any).__rateLimitCleanup = true;
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitMap.entries()) {
      if (now > entry.resetAt) {
        rateLimitMap.delete(key);
      }
    }
  }, 60 * 1000);
}

function checkRateLimit(key: string, maxAttempts: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  
  if (entry.count >= maxAttempts) {
    return false;
  }
  
  entry.count++;
  return true;
}

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

function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    let jsonPayload: string;
    if (typeof Buffer !== 'undefined') {
      jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
    } else {
      jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
    }
    const payload = JSON.parse(jsonPayload);
    if (!payload.exp) return true;
    return payload.exp <= Math.floor(Date.now() / 1000) - 5;
  } catch {
    return true;
  }
}

// Edge functions moved off Deno Subhosting onto Deno Deploy v2 (Classic was sunset 2026-07-20).
// They now live on a DIFFERENT host and serve the slug at the root — {appKey}.function2.insforge.app/<slug>
// — not {appKey}.{region}.insforge.app/functions/<slug>. @insforge/sdk 1.5.2 derives this itself, but
// only for .insforge.app base URLs; the browser client's baseUrl is this proxy, so the derivation
// never applies and every client-side function call has to be re-pointed here instead.
const FUNCTIONS_URL =
  process.env.NEXT_PUBLIC_INSFORGE_FUNCTIONS_URL ||
  INSFORGE_URL.replace(/^(https?:\/\/)([^.]+)\.[^/]+/, '$1$2.function2.insforge.app');

async function handleProxy(request: NextRequest, props: { params: Promise<{ path: string[] }> }) {
  const url = new URL(request.url);
  const rawPath = url.pathname.replace(/^\/api\/v1\/remote/, '');
  const functionSlugPath = rawPath.replace(/^\/functions/, '');
  const targetUrl = functionSlugPath !== rawPath
    ? `${FUNCTIONS_URL}${functionSlugPath}${url.search}`
    : `${INSFORGE_URL}${rawPath}${url.search}`;

  // Forward all headers except host
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('content-length');
  headers.set('x-insforge-url', INSFORGE_URL);
  headers.set('x-insforge-anon-key', ANON_KEY);
  if (process.env.INSFORGE_SERVICE_KEY) {
    headers.set('x-insforge-service-key', process.env.INSFORGE_SERVICE_KEY);
  }

  // Upgrade Anon Key to User Token if cookie is present and not expired
  const authHeader = headers.get('authorization');
  let token = ANON_KEY;

  const cookieHeader = request.headers.get('cookie');
  let hasTokenCookie = false;
  let cookieTokenUsable = false;
  if (cookieHeader) {
    const match = cookieHeader.match(/tm_access_token=([^;]+)/);
    if (match) {
      hasTokenCookie = true;
      let decoded = decodeURIComponent(match[1]);
      let parsedToken = decoded.startsWith('Bearer ') ? decoded.substring(7) : decoded;
      if (parsedToken && !isTokenExpired(parsedToken)) {
        token = parsedToken;
        cookieTokenUsable = true;
      }
    }
  }

  // Detect public GET requests to allow unauthenticated access via service role key
  const isPublicGet = request.method === 'GET' && (
    rawPath.includes('/api/database/records/blog') ||
    rawPath.includes('/api/database/records/jobs')
  );

  // The HttpOnly cookie is the single source of truth for the caller's identity
  // (10_Auth_Token_Propagation_And_Subdomain_Fix.md §4). A caller-supplied header is only
  // honoured when it is a real JWT that isn't the anon key — anything else (`Bearer null`,
  // `Bearer undefined`, `Bearer `, the anon key) means "no token supplied" and must be
  // upgraded from the cookie. Callers that read a now-deleted sessionStorage copy send a
  // literal `Bearer null`; without this they would forward a broken header and 401.
  const callerToken = authHeader?.replace(/^Bearer\s+/i, '').trim() ?? '';
  const callerSuppliedJwt =
    callerToken.split('.').length === 3 && callerToken !== ANON_KEY;

  if (!callerSuppliedJwt) {
    if (token === ANON_KEY && isPublicGet && process.env.INSFORGE_SERVICE_KEY) {
      headers.set('authorization', `Bearer ${process.env.INSFORGE_SERVICE_KEY}`);
    } else {
      headers.set('authorization', `Bearer ${token}`);
    }
  }

  // S3: when the browser claims a session (tm_session signal and/or a tm_access_token cookie)
  // but the token is missing/expired, fail loudly with 401 instead of silently degrading to
  // anon — an anon read passes RLS with zero rows and renders as "logged in but no data".
  // A 401 is recoverable: the client refreshes (C4) and retries. Genuinely anonymous callers
  // (no session cookies at all) still get the anon path so public browsing and login work.
  // Auth endpoints (login/signup/refresh/auth-session) must stay reachable with a stale
  // cookie — that is exactly the state a user logging back in is in. Matched on the endpoint
  // prefix, not a bare 'auth' substring, so a table like `authors` is not caught.
  // Storage GETs are exempt: they are asset reads (<img> etc.) that should degrade to anon
  // rather than break a page — private objects stay protected by RLS upstream regardless.
  const claimsSession = hasTokenCookie || /(?:^|;\s*)tm_session=1/.test(cookieHeader || '');
  const isAuthEndpoint = /^\/api\/auth\//i.test(rawPath) || /^\/functions\/(admin-)?auth-/i.test(rawPath);
  const isAssetGet = request.method === 'GET' && url.pathname.includes('storage/buckets/');
  if (claimsSession && !cookieTokenUsable && !callerSuppliedJwt && !isPublicGet && !isAuthEndpoint && !isAssetGet) {
    return new NextResponse(
      JSON.stringify({
        error: 'AUTH_TOKEN_EXPIRED',
        message: 'Session token is missing or expired. Refresh the session and retry.',
      }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const isStorageGet = request.method === 'GET' && url.pathname.includes('storage/buckets/');

  // Rate Limiting for Authentication Endpoints
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
             request.headers.get('x-real-ip') || 
             'unknown';
  
  const path = rawPath.toLowerCase();
  
  // Apply rate limits to sensitive endpoints
  if (path.includes('auth/login') || path.includes('functions/admin-auth-login')) {
    if (!checkRateLimit(`login:${ip}`, 5, 15 * 60 * 1000)) { // 5 per 15 min
      return new NextResponse(JSON.stringify({ error: 'Too many login attempts. Please try again later.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Retry-After': '900' }
      });
    }
  } else if (path.includes('auth/verify') || path.includes('functions/auth-verify')) {
    if (!checkRateLimit(`otp:${ip}`, 5, 10 * 60 * 1000)) { // 5 per 10 min
      return new NextResponse(JSON.stringify({ error: 'Too many verification attempts. Please try again later.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Retry-After': '600' }
      });
    }
  } else if (path.includes('auth/signup') || path.includes('functions/auth-signup')) {
    if (!checkRateLimit(`signup:${ip}`, 10, 15 * 60 * 1000)) { // 10 per 15 min
      return new NextResponse(JSON.stringify({ error: 'Too many signup attempts. Please try again later.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Retry-After': '900' }
      });
    }
  } else if (path.includes('reset_password') || path.includes('password-reset')) {
    if (!checkRateLimit(`reset:${ip}`, 3, 60 * 60 * 1000)) { // 3 per hour
      return new NextResponse(JSON.stringify({ error: 'Too many password reset attempts. Please try again later.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Retry-After': '3600' }
      });
    }
  } else if (path.includes('resume-parse')) {
    if (!checkRateLimit(`resume:${ip}`, 20, 60 * 60 * 1000)) { // 20 per hour (DoS mitigation)
      return new NextResponse(JSON.stringify({ error: 'Resume parsing rate limit exceeded. Please try again later.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Retry-After': '3600' }
      });
    }
  }

  // CSRF & Payload Size Guard for Mutating Requests
  let requestBody: any = undefined;
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    // A. CSRF Verification
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');
    const host = request.headers.get('host');
    
    let isSameOrigin = false;
    if (origin) {
      try {
        isSameOrigin = new URL(origin).host === host;
      } catch {}
    } else if (referer) {
      try {
        isSameOrigin = new URL(referer).host === host;
      } catch {}
    }
    
    if ((origin || referer) && !isSameOrigin) {
      return new NextResponse(JSON.stringify({ error: 'CSRF validation failed: Invalid Origin/Referer' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Require custom header to block simple cross-site requests
    const clientInfo = request.headers.get('x-client-info');
    const csrfTokenHeader = request.headers.get('x-csrf-token');
    const reqWith = request.headers.get('x-requested-with');
    const authHeader = request.headers.get('authorization');
    
    if (!clientInfo && !csrfTokenHeader && !reqWith && !authHeader) {
      return new NextResponse(JSON.stringify({ error: 'CSRF validation failed: Missing secure request header' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // B. Payload Size Check (OOM Mitigation)
    const contentLengthHeader = request.headers.get('content-length');
    const contentLength = contentLengthHeader ? parseInt(contentLengthHeader, 10) : NaN;
    const MAX_ALLOWED_SIZE = 10 * 1024 * 1024; // 10MB limit

    if (!isNaN(contentLength) && contentLength > MAX_ALLOWED_SIZE) {
      return new NextResponse(JSON.stringify({ error: 'Payload too large: Content-Length exceeds maximum limit.' }), {
        status: 413,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Progressively read the stream to prevent OOM even if Content-Length is missing or spoofed
    if (request.body) {
      const chunks: Uint8Array[] = [];
      let totalLength = 0;
      const reader = request.body.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            totalLength += value.length;
            if (totalLength > MAX_ALLOWED_SIZE) {
              return new NextResponse(JSON.stringify({ error: 'Payload too large: Request body exceeds maximum limit.' }), {
                status: 413,
                headers: { 'Content-Type': 'application/json' }
              });
            }
            chunks.push(value);
          }
        }
      } finally {
        reader.releaseLock();
      }
      // Re-assemble the chunks into a single ArrayBuffer for the fetch body
      const assembled = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        assembled.set(chunk, offset);
        offset += chunk.length;
      }
      requestBody = assembled.buffer;
    } else {
      try {
        requestBody = await request.arrayBuffer();
      } catch (err) {
        // request has no body or reading failed
      }
    }
  }

  try {

    const fetchOptions: RequestInit = {
      method: request.method,
      headers,
      redirect: isStorageGet ? 'follow' : 'manual',
      body: requestBody,
      cache: 'no-store'
    };

    const response = await fetch(targetUrl, fetchOptions);

    let responseBody: any = response.body;
    const responseHeaders = new Headers(response.headers);
    const contentType = responseHeaders.get('content-type') || '';

    if (contentType.includes('application/json')) {
      try {
        const text = await response.text();
        responseBody = text; // Default fallback to text if parsing/mapping is not modified
        
        if (!text) throw new Error('skip'); // empty body, nothing to parse
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed === 'object') {
          let modified = false;
          if (parsed.access_token && !parsed.accessToken) {
            parsed.accessToken = parsed.access_token;
            modified = true;
          }
          if (parsed.refresh_token && !parsed.refreshToken) {
            parsed.refreshToken = parsed.refresh_token;
            modified = true;
          }
          if (parsed.expires_in && !parsed.expiresIn) {
            parsed.expiresIn = parsed.expires_in;
            modified = true;
          }
          
          if (modified) {
            responseBody = JSON.stringify(parsed);
            responseHeaders.set('content-length', new TextEncoder().encode(responseBody).length.toString());
          }
        }
      } catch (err: any) {
        if (err?.message !== 'skip') {
          console.error('[proxy] Error parsing JSON body in proxy route:', err);
        }
      }
    }

    // If the request was a storage GET request for a PDF file, rewrite Content-Disposition to inline
    const isPdfFile = url.pathname.toLowerCase().endsWith('.pdf') || 
                      decodeURIComponent(url.pathname).toLowerCase().endsWith('.pdf') ||
                      responseHeaders.get('content-type')?.includes('application/pdf');

    if (isStorageGet && isPdfFile) {
      // Force correct PDF content type if missing or octet-stream
      const currentType = responseHeaders.get('content-type');
      if (!currentType || currentType === 'application/octet-stream') {
        responseHeaders.set('content-type', 'application/pdf');
      }

      const contentDisposition = responseHeaders.get('content-disposition');
      if (contentDisposition) {
        responseHeaders.set('content-disposition', contentDisposition.replace('attachment', 'inline'));
      } else {
        responseHeaders.set('content-disposition', 'inline');
      }
    }

    const newResponse = new NextResponse(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });

    // Fix cookies so the browser doesn't drop them on localhost / custom domain
    fixCookies(request, response, newResponse);

    return newResponse;
  } catch (error) {
    console.error('Proxy error:', error);
    return new NextResponse(JSON.stringify({ error: 'Proxy error' }), {
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

    // Override Domain
    if (isLocal) {
      fixed = fixed.replace(/Domain=[^;]+(;|$)/i, '').replace(/;\s*$/, '');
    } else {
      const parts = host.split(':');
      const domainParts = parts[0].split('.');
      const baseDomain = domainParts.length > 2 ? domainParts.slice(-2).join('.') : domainParts.join('.');

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
