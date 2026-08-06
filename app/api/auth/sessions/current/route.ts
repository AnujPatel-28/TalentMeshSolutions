import { NextRequest, NextResponse } from 'next/server';
import { createServerSessionClient } from '@/lib/auth/server-auth';
import { getCookieDomain } from '@/lib/cookies';

const INSFORGE_URL = process.env.NEXT_PUBLIC_INSFORGE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!;

/**
 * GET /api/auth/sessions/current
 * Helper endpoint for the SDK to retrieve the current session.
 */
export async function GET(request: NextRequest) {
  const token = request.cookies.get('tm_access_token')?.value;

  if (!token) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  try {
    const insforge = createServerSessionClient(token);
    const { data, error } = await insforge.auth.getCurrentUser();

    if (error || !data?.user) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    return NextResponse.json({ user: data.user }, { status: 200 });
  } catch (err) {
    console.error('[sessions/current] Error fetching session:', err);
    return NextResponse.json({ user: null }, { status: 200 });
  }
}

/**
 * POST /api/auth/sessions/current
 * Handler to proxy token refresh requests from the SDK client to the InsForge backend.
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('content-length');
  headers.set('apikey', ANON_KEY);

  const targetUrl = `${INSFORGE_URL.replace(/\/$/, '')}/api/auth/sessions/current`;

  try {
    const insforgeRes = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body,
    });

    const responseBody = await insforgeRes.text();

    const response = new NextResponse(responseBody, {
      status: insforgeRes.status,
      headers: { 'Content-Type': insforgeRes.headers.get('Content-Type') || 'application/json' },
    });

    // Fix cookies so the browser doesn't drop them on localhost / custom domain
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
  } catch (error) {
    console.error('[sessions/current] POST Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
