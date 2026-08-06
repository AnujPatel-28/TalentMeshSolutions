import { createClient } from 'npm:@insforge/sdk';

const baseUrl = Deno.env.get('NEXT_PUBLIC_INSFORGE_URL') || Deno.env.get('INSFORGE_URL')!;
const anonKey = Deno.env.get('NEXT_PUBLIC_INSFORGE_ANON_KEY') || Deno.env.get('INSFORGE_ANON_KEY')!;
const serviceKey = Deno.env.get('INSFORGE_SERVICE_KEY')!;

function parseCookies(header: string | null) {
  if (!header) return {};
  return header.split(';').reduce((res, item) => {
    const parts = item.split('=');
    res[parts[0].trim()] = parts.slice(1).join('=');
    return res;
  }, {} as Record<string, string>);
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    if (!serviceKey) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    const cookies = parseCookies(req.headers.get('cookie'));
    const token = cookies['tm_access_token'];

    if (!token) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const insforge = createClient({ baseUrl, anonKey, isServerMode: true });
    insforge.setAccessToken(token);
    const { data: authData, error: authError } = await insforge.auth.getCurrentUser();

    if (authError || !authData?.user || authData.user.id === 'project-admin-with-api-key') {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const insforgeAdmin = createClient({ baseUrl, anonKey: serviceKey });
    const { data: profile } = await insforgeAdmin.database
      .from('profiles')
      .select('mfa_enabled')
      .eq('id', authData.user.id)
      .single();

    return new Response(JSON.stringify({
      mfaEnabled: profile?.mfa_enabled ?? false,
      mfaVerifiedThisSession: cookies['mfa_verified'] === 'true',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    console.error('MFA status error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Failed to get MFA status' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
