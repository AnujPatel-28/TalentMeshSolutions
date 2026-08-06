import { createClient } from 'npm:@insforge/sdk';
import { corsHeaders } from '../_shared/cors.ts';
import { getBaseUrl, getServiceKey } from '../_shared/adminAuth.ts';

const baseUrl = getBaseUrl();
const anonKey = Deno.env.get('INSFORGE_ANON_KEY') || Deno.env.get('NEXT_PUBLIC_INSFORGE_ANON_KEY')!;

export default async function handler(req: Request): Promise<Response> {
  const cors = corsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 204, headers: cors });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405,
      headers: { ...cors, 'Content-Type': 'application/json' }
    });
  }

  try {
    const { email, password, role, name } = await req.json();

    if (!email || !password || !role || !name) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { 
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' }
      });
    }

    // Prevent privilege escalation: Only allow 'candidate' or 'recruiter' roles during public signup
    let safeRole = role;
    if (safeRole === 'admin' || safeRole === 'super_admin') {
      safeRole = 'candidate';
    }

    const serviceKey = getServiceKey();

    const insforge = createClient({ baseUrl, anonKey });
    const insforgeAdmin = createClient({ baseUrl, anonKey: serviceKey });

    // 1. Sign up the user
    const { data, error: signupError } = await insforge.auth.signUp({
      email,
      password,
      name,
    });

    if (signupError) {
      if ((signupError as any).error === 'REQUEST_FAILED') {
        // Swallow deliberately: SMTP enforces a 60s minimum interval, so a quick retry throws.
        // The response must not vary on that, or the failure itself reveals the email is
        // already registered — the enumeration leak this branch exists to close.
        try { await insforge.auth.resendVerificationEmail({ email }); } catch { /* already sent recently */ }
        return new Response(JSON.stringify({ requireEmailVerification: true }), {
          status: 200,
          headers: { ...cors, 'Content-Type': 'application/json' }
        });
      }
      return new Response(JSON.stringify({ error: signupError.message }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' }
      });
    }

    const user = data?.user || (data as any)?.session?.user;
    const accessToken = data?.accessToken || (data as any)?.session?.access_token;

    if (user) {
      // 2. Create the profile record
      const { error: profileError } = await insforgeAdmin.database
        .from('profiles')
        .insert([{
          id: user.id,
          user_id: user.id,
          email: user.email,
          role: safeRole,
          name,
        }]);
      if (profileError) {
        return new Response(JSON.stringify({ error: profileError.message }), { 
          status: 400,
          headers: { ...cors, 'Content-Type': 'application/json' }
        });
      }

      // 3. Send welcome email (fire-and-forget — don't block signup)
      const siteUrl = Deno.env.get('NEXT_PUBLIC_SITE_URL') || 'http://localhost:3000';
      const template = safeRole === 'recruiter' ? 'recruiter-welcome' : 'candidate-welcome';
      try {
        fetch(`${siteUrl}/api/email/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-service-key': serviceKey,
          },
          body: JSON.stringify({
            to: user.email,
            template,
            data: { name, email: user.email },
          }),
        }).catch((e: any) => console.error('[auth-signup] Welcome email fire-and-forget failed:', e.message));
      } catch (emailErr: any) {
        console.error('[auth-signup] Welcome email error:', emailErr.message);
      }
    }

    return new Response(JSON.stringify({ 
      requireEmailVerification: data?.requireEmailVerification,
      user,
      accessToken
    }), { 
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Signup API Error:', err);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { 
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' }
    });
  }
}
