import { NextRequest, NextResponse } from 'next/server';
import { getCookieDomain } from '@/lib/cookies';
import * as crypto from 'crypto';

/**
 * POST /api/auth/mfa-complete
 * 
 * Sets a signed MFA verification cookie after successful TOTP/backup code verification.
 * The middleware checks this cookie to prevent infinite redirects to /auth/mfa-verify.
 * 
 * Body: { factorId: string, timestamp: number }
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('tm_access_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { factorId, timestamp } = body;

    if (!factorId || !timestamp) {
      return NextResponse.json({ error: 'Missing factorId or timestamp' }, { status: 400 });
    }

    // Verify timestamp is recent (within last 60 seconds) to prevent token reuse
    const now = Date.now();
    if (Math.abs(now - timestamp) > 60000) {
      return NextResponse.json({ error: 'MFA verification expired' }, { status: 400 });
    }

    // Create signed MFA verification token
    const mfaSecret = process.env.MFA_SIGNING_SECRET || 'default-mfa-secret-change-in-prod';
    const message = `${token}:${factorId}:${timestamp}`;
    const signature = crypto.createHmac('sha256', mfaSecret).update(message).digest('hex');
    const mfaVerifiedValue = `${signature}:${timestamp}:${factorId}`;

    // Set HttpOnly, Secure cookie with 24-hour expiry
    const response = NextResponse.json({ success: true }, { status: 200 });
    
    const host = request.headers.get('host') || '';
    const isSecure = request.headers.get('x-forwarded-proto') === 'https' || process.env.NODE_ENV === 'production';
    const sameSiteStr = isSecure ? 'SameSite=None; Secure;' : 'SameSite=Lax;';
    
    const domainStr = getCookieDomain(host);

    const cookieOptions = `Path=/; HttpOnly; ${sameSiteStr} Max-Age=${24 * 60 * 60}${domainStr}`;
    response.headers.append('Set-Cookie', `mfa_verified=${mfaVerifiedValue}; ${cookieOptions}`);

    return response;
  } catch (err) {
    console.error('[mfa-complete] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
