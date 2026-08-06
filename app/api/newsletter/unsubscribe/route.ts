import { NextResponse } from 'next/server';
import { unsubscribeByToken } from '@/lib/newsletter/newsletter-db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.redirect(new URL('/newsletter/unsubscribed', req.url));
    }

    // Unsubscribe subscriber
    await unsubscribeByToken(token);

    // Redirect to unsubscribed confirmation page
    return NextResponse.redirect(new URL('/newsletter/unsubscribed', req.url));
  } catch (err: any) {
    console.error('[Newsletter Unsubscribe API] Error:', err);
    return NextResponse.redirect(new URL('/newsletter/unsubscribed', req.url));
  }
}
