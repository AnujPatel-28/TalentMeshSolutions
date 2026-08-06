import { createClient } from 'npm:@insforge/sdk';
import { canPerform, isStaffRole } from '../_shared/permissions.ts';
import { corsHeaders as sharedCorsHeaders } from '../_shared/cors.ts';

const baseUrl = Deno.env.get('NEXT_PUBLIC_INSFORGE_URL') || Deno.env.get('INSFORGE_URL')!;
const anonKey = Deno.env.get('NEXT_PUBLIC_INSFORGE_ANON_KEY') || Deno.env.get('INSFORGE_ANON_KEY')!;

export default async function handler(req: Request): Promise<Response> {
  // D-10: was echoing back any Origin with Allow-Credentials. Now uses the R-2 kit
  // allowlist (ALLOWED_ORIGINS secret) like every other admin function.
  const corsHeaders: Record<string, string> = sharedCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  try {
    const insforge = createClient({ baseUrl, anonKey, edgeFunctionToken: token, isServerMode: true });

    // Verify caller is an active admin before any read or write
    const { data: { user }, error: authError } = await insforge.auth.getCurrentUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized, invalid token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: guardProfile } = await insforge.database
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single();

    if (!isStaffRole(guardProfile?.role)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (guardProfile?.is_active !== true) {
      return new Response(JSON.stringify({ error: 'Forbidden, account is suspended' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // R-4: blogs are the `content` resource. Read/write open to content staff; only
    // super_admin holds content:delete (doc 14 §4.2).
    const role = guardProfile.role;
    const needed = req.method === 'GET' ? 'view' : req.method === 'DELETE' ? 'delete' : 'edit';
    if (!canPerform(role, 'content', needed)) {
      return new Response(JSON.stringify({ error: 'forbidden', code: 'permission_denied' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (req.method === 'GET') {
      const url = new URL(req.url);
      const search = url.searchParams.get('search');
      const status = url.searchParams.get('status');
      const page = parseInt(url.searchParams.get('page') || '0');
      const limit = parseInt(url.searchParams.get('limit') || '20');

      let query = insforge.database.from('blog').select('*', { count: 'exact' });

      if (search) {
        query = query.ilike('title', `%${search}%`);
      }
      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(page * limit, (page + 1) * limit - 1);

      if (error) throw error;

      return new Response(JSON.stringify({ blogs: data, total: count }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (req.method === 'POST') {
      const body = await req.json();
      // Get user from token
      const { data: userData, error: userError } = await insforge.auth.getCurrentUser();
      const user = userData?.user;
      
      if (userError || !user) throw new Error('Unauthorized');

      const { data, error } = await insforge.database.from('blog').insert([{
        ...body,
        author_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }]).select().single();

      if (error) throw error;

      return new Response(JSON.stringify({ blog: data }), { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (req.method === 'PATCH') {
      const url = new URL(req.url);
      const id = url.pathname.split('/').pop();
      const body = await req.json();

      const { data, error } = await insforge.database
        .from('blog')
        .update({ ...body, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return new Response(JSON.stringify({ blog: data }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (req.method === 'DELETE') {
      const url = new URL(req.url);
      const id = url.pathname.split('/').pop();

      const { error } = await insforge.database
        .from('blog')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  } catch (err: any) {
    console.error('Admin Blogs Edge Function Error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal Server Error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}
