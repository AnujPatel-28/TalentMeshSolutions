import { NextResponse } from 'next/server';
import { activateSubscriber, findSubscriberByEmail } from '@/lib/newsletter/newsletter-db';
import { hashToken } from '@/lib/newsletter/newsletter-tokens';
import { sendWelcomeEmail } from '@/lib/newsletter/newsletter-email';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.redirect(new URL('/newsletter/invalid-token', req.url));
    }

    const hashedToken = hashToken(token);
    
    // Attempt to activate subscriber
    const subscriber = await activateSubscriber(hashedToken);

    if (!subscriber) {
      // Check if subscriber exists but token expired
      const db = require('@/lib/newsletter/newsletter-db');
      const { insforgeAdmin } = require('@/lib/insforge-admin');
      
      const { data: existingSub } = await insforgeAdmin.database
        .from('newsletter_subscribers')
        .select('*')
        .eq('confirmation_token_hash', hashedToken)
        .maybeSingle();

      if (existingSub) {
        // Token expired! Redirect to expired page with email query param
        const expiredUrl = new URL('/newsletter/token-expired', req.url);
        expiredUrl.searchParams.set('email', existingSub.email);
        return NextResponse.redirect(expiredUrl);
      }

      return NextResponse.redirect(new URL('/newsletter/invalid-token', req.url));
    }

    // Send Welcome Email
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const unsubscribeUrl = `${siteUrl}/api/newsletter/unsubscribe?token=${subscriber.unsubscribe_token}`;

    sendWelcomeEmail(subscriber.email, unsubscribeUrl).catch((err) => {
      console.error(`[Newsletter Confirm API] Failed to send welcome email to ${subscriber.email}:`, err);
    });

    // Redirect to success page
    return NextResponse.redirect(new URL('/newsletter/confirmed', req.url));
  } catch (err: any) {
    console.error('[Newsletter Confirm API] Error:', err);
    return NextResponse.redirect(new URL('/newsletter/invalid-token', req.url));
  }
}
