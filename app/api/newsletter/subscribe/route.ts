import { NextResponse } from 'next/server';
import {
  createOrUpdatePendingSubscriber,
  checkIpRateLimit,
  findSubscriberByEmail,
  normalizeEmail,
} from '@/lib/newsletter/newsletter-db';
import { generateToken } from '@/lib/newsletter/newsletter-tokens';
import { sendConfirmationEmail } from '@/lib/newsletter/newsletter-email';
import crypto from 'crypto';

// Regex for basic email validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  try {
    // 1. Rate Limiting
    const forwardedFor = req.headers.get('x-forwarded-for');
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : '127.0.0.1';
    
    const isAllowed = await checkIpRateLimit(ip);
    if (!isAllowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // 2. Parse and Validate Request Body
    const body = await req.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email address is required.' },
        { status: 400 }
      );
    }

    const normalized = normalizeEmail(email);

    if (!EMAIL_REGEX.test(normalized)) {
      return NextResponse.json(
        { error: 'Please provide a valid email address.' },
        { status: 400 }
      );
    }

    const genericSuccessMessage = "Thanks for subscribing! Please check your inbox and click the confirmation link to activate your TalentMesh Insights subscription.";

    // 3. Check existing subscriber status
    const existing = await findSubscriberByEmail(normalized);

    if (existing && existing.status === 'confirmed') {
      // Return generic success to prevent email enumeration, skip sending email
      return NextResponse.json({
        success: true,
        message: genericSuccessMessage,
      });
    }

    // 4. Generate Tokens
    const { raw: rawConfirmToken, hash: confirmTokenHash } = generateToken();
    const unsubscribeToken = crypto.randomUUID(); // Secure unique identifier for unsubscribing
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 24); // Expires in 24 hours

    const userAgent = req.headers.get('user-agent') || null;

    // 5. Create or Update Pending Subscriber in Database
    await createOrUpdatePendingSubscriber({
      email: normalized,
      confirmationTokenHash: confirmTokenHash,
      confirmationTokenExpiresAt: expiry,
      unsubscribeToken,
      source: 'footer',
      userAgent,
    });

    // 6. Send Confirmation Email
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const confirmUrl = `${siteUrl}/api/newsletter/confirm?token=${rawConfirmToken}`;
    const unsubscribeUrl = `${siteUrl}/api/newsletter/unsubscribe?token=${unsubscribeToken}`;

    // Send confirmation email asynchronously (fire-and-forget style to keep endpoint fast)
    sendConfirmationEmail(normalized, confirmUrl, unsubscribeUrl).catch((err) => {
      console.error(`[Newsletter Subscribe API] Failed to send email to ${normalized}:`, err);
    });

    return NextResponse.json({
      success: true,
      message: genericSuccessMessage,
    });
  } catch (err: any) {
    console.error('[Newsletter Subscribe API] CRITICAL ERROR:', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
