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

function generateBackupCode() {
  const array = new Uint8Array(4);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

async function hashCode(code: string) {
  const msgBuffer = new TextEncoder().encode(code);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    if (!serviceKey) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    const cookies = parseCookies(req.headers.get('cookie'));
    const token = cookies['tm_access_token'];

    if (!token) {
      return new Response(JSON.stringify({ error: 'Not authorized' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    const insforge = createClient({ baseUrl, anonKey, isServerMode: true });
    insforge.setAccessToken(token);
    const { data: authData } = await insforge.auth.getCurrentUser();

    if (!authData?.user) {
      return new Response(JSON.stringify({ error: 'Not authorized' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    const insforgeAdmin = createClient({ baseUrl, anonKey: serviceKey });
    const { data: profile } = await insforgeAdmin.database
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single();

    const role = profile?.role;
    if (role !== 'admin' && role !== 'super_admin') {
      return new Response(JSON.stringify({ error: 'Not authorized' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    const codes = Array.from({ length: 8 }, generateBackupCode);

    const adminId = authData.user.id;

    await insforgeAdmin.database
      .from('admin_backup_codes')
      .delete()
      .eq('admin_id', adminId)
      .eq('used', false);

    const insertData = await Promise.all(codes.map(async (code) => ({
      admin_id: adminId,
      code_hash: await hashCode(code),
      used: false,
    })));

    const { error } = await insforgeAdmin.database
      .from('admin_backup_codes')
      .insert(insertData);

    if (error) {
      console.error('Failed to save backup codes:', error);
      return new Response(JSON.stringify({ error: 'Failed to save backup codes' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ codes }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    console.error('Backup code generation error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Failed to generate backup codes' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
