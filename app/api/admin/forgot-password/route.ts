import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@insforge/sdk';
import { withApi } from '@/lib/api/handler';

const INSFORGE_URL = process.env.NEXT_PUBLIC_INSFORGE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!;

// Always 200 regardless of outcome — prevents admin-account enumeration (D-1).
export const POST = withApi(
  { requireAuth: false, schema: { body: z.object({ email: z.string().email() }) } },
  async (_req, { body }) => {
    try {
      const client = createClient({ baseUrl: INSFORGE_URL, anonKey: ANON_KEY, isServerMode: true });
      const { error } = await client.functions.invoke('admin-forgot-password', {
        body: { email: body.email },
      });
      if (error) {
        console.error('[admin forgot-password] edge function error:', error.message);
      }
    } catch (err) {
      console.error('[admin forgot-password] unexpected error:', err);
    }

    return NextResponse.json({ success: true });
  }
);
