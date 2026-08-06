import { createClient } from 'npm:@insforge/sdk';
import { z } from 'npm:zod';

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

function getAdminEmails(): string[] {
  return (Deno.env.get('ADMIN_EMAILS') || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function isWhitelistedAdminEmail(email: string | null | undefined): boolean {
  if (!email) {
    return false;
  }
  return getAdminEmails().includes(email.trim().toLowerCase());
}

const baseUrl = Deno.env.get('NEXT_PUBLIC_INSFORGE_URL') || Deno.env.get('INSFORGE_URL')!;
const anonKey = Deno.env.get('NEXT_PUBLIC_INSFORGE_ANON_KEY') || Deno.env.get('INSFORGE_ANON_KEY')!;

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  const validation = forgotPasswordSchema.safeParse(payload);
  if (!validation.success || !validation.data?.email) {
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  const email = validation.data.email.trim().toLowerCase();
  if (!isWhitelistedAdminEmail(email)) {
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const insforge = createClient({ baseUrl, anonKey });
    const { error } = await insforge.auth.sendResetPasswordEmail({ email });

    if (error) {
      console.error('[Admin ForgotPW] sendResetPasswordEmail error:', error.message);
    }
  } catch (err) {
    console.error('[Admin ForgotPW] Unexpected error:', err);
  }

  return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}
