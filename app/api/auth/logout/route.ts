import { NextRequest, NextResponse } from 'next/server';
import { buildAuthClearCookies } from '@/lib/cookies';

const INSFORGE_URL = process.env.NEXT_PUBLIC_INSFORGE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!;
const IS_PROD = process.env.NODE_ENV === 'production';

/**
 * Proxy for POST /api/auth/logout.
 * Forwards the auth token to InsForge and clears auth cookies from the browser.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || '';
  const cookieHeader = request.headers.get('cookie') || '';

  try {
    await fetch(`${INSFORGE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': ANON_KEY,
        ...(authHeader ? { 'Authorization': authHeader } : { 'Authorization': `Bearer ${ANON_KEY}` }),
        ...(cookieHeader ? { 'Cookie': cookieHeader } : {}),
      },
    });
  } catch {
    // Best-effort — always clear cookies even if InsForge is unreachable
  }

  const host = request.headers.get('host') || '';
  const isSecure = IS_PROD || request.headers.get('x-forwarded-proto') === 'https';

  const response = NextResponse.json({ success: true }, { status: 200 });

  // 'all' — a real logout also revokes the refresh credentials. /api/auth/session
  // DELETE deliberately does not, so a failed refresh stays recoverable.
  for (const value of buildAuthClearCookies(host, isSecure, 'all')) {
    response.headers.append('Set-Cookie', value);
  }

  return response;
}
