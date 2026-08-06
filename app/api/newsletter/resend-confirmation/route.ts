import { NextResponse } from 'next/server';
import {
  findSubscriberByEmail,
  updateConfirmationToken,
  normalizeEmail,
} from '@/lib/newsletter/newsletter-db';
import { generateToken } from '@/lib/newsletter/newsletter-tokens';
import { sendConfirmationEmail } from '@/lib/newsletter/newsletter-email';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  try {
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

    const genericSuccessMessage = "If that email can receive TalentMesh Insights, you'll receive an email shortly.";

    // Look up the subscriber
    const subscriber = await findSubscriberByEmail(normalized);

    // Only resend if they exist and are still in a 'pending' state
    if (subscriber && subscriber.status === 'pending') {
      const { raw: rawConfirmToken, hash: confirmTokenHash } = generateToken();
      const expiry = new Date();
      expiry.setHours(expiry.getHours() + 24);

      await updateConfirmationToken(normalized, {
        confirmationTokenHash: confirmTokenHash,
        confirmationTokenExpiresAt: expiry,
      });

      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      const confirmUrl = `${siteUrl}/api/newsletter/confirm?token=${rawConfirmToken}`;
      const unsubscribeUrl = `${siteUrl}/api/newsletter/unsubscribe?token=${subscriber.unsubscribe_token}`;

      sendConfirmationEmail(normalized, confirmUrl, unsubscribeUrl).catch((err) => {
        console.error(`[Newsletter Resend API] Failed to send email to ${normalized}:`, err);
      });
    }

    return NextResponse.json({
      success: true,
      message: genericSuccessMessage,
    });
  } catch (err: any) {
    console.error('[Newsletter Resend API] Error:', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
