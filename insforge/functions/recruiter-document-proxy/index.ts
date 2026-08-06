import { createClient } from 'npm:@insforge/sdk';
import { corsHeaders } from '../_shared/cors.ts';
import { getBaseUrl, getServiceKey } from '../_shared/adminAuth.ts';

const baseUrl = getBaseUrl();
const anonKey = Deno.env.get('NEXT_PUBLIC_INSFORGE_ANON_KEY') || Deno.env.get('INSFORGE_ANON_KEY')!;
const serviceKey = getServiceKey();

export default async function handler(req: Request): Promise<Response> {
  const cors = corsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 204, headers: cors });
  }

  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: cors });
  }

  const url = new URL(req.url);
  const key = url.searchParams.get('key');

  if (!key) {
    return new Response(JSON.stringify({ error: 'Missing key parameter' }), { status: 400, headers: cors });
  }

  const reqBaseUrl = baseUrl;
  const reqAnonKey = anonKey;
  const reqServiceKey = serviceKey;

  const insforge = createClient({ baseUrl: reqBaseUrl, anonKey: reqAnonKey, isServerMode: true });
  insforge.setAccessToken(token);
  const insforgeAdmin = createClient({ baseUrl: reqBaseUrl, anonKey: reqServiceKey });

  try {
    // 1. Authenticate caller
    const { data: { user }, error: authError } = await insforge.auth.getCurrentUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: cors });
    }

    // 2. Authorization Check: Must be admin or super_admin
    const { data: profile, error: profileError } = await insforgeAdmin.database
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), { status: 404, headers: cors });
    }

    const isSystemAdmin = profile.role === 'admin' || profile.role === 'super_admin';
    if (!isSystemAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden. Only administrators can access recruiter documents.' }), { status: 403, headers: cors });
    }

    // 3. Download recruiter document from storage
    let storageKey = key;
    if (storageKey.startsWith('objects/')) {
      storageKey = storageKey.substring(8);
    }
    const { data: fileBlob, error: storageError } = await insforgeAdmin.storage
      .from('recruiter_documents')
      .download(storageKey);

    if (storageError || !fileBlob) {
      console.error('[recruiter-document-proxy] Storage download failed:', storageError?.message);
      return new Response(JSON.stringify({ error: 'Document not found in storage.' }), { status: 404, headers: cors });
    }

    // 4. Log the access to the audit logs
    const { error: logError } = await insforgeAdmin.database
      .from('audit_log')
      .insert([{
        actor_id: user.id,
        action: 'recruiter_document_view',
        metadata: {
          resource_type: 'recruiter_document',
          resource_key: key,
        },
        status: 'success'
      }]);

    if (logError) {
      console.error('[recruiter-document-proxy] Failed to insert audit log:', logError.message);
    }

    // 5. Determine content type based on extension
    const keyLower = key.toLowerCase();
    let contentType = 'application/octet-stream';
    if (keyLower.endsWith('.pdf')) {
      contentType = 'application/pdf';
    } else if (keyLower.endsWith('.png')) {
      contentType = 'image/png';
    } else if (keyLower.endsWith('.jpg') || keyLower.endsWith('.jpeg')) {
      contentType = 'image/jpeg';
    } else if (keyLower.endsWith('.gif')) {
      contentType = 'image/gif';
    }

    // 6. Return streamed file response
    return new Response(fileBlob, {
      status: 200,
      headers: { ...cors,
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${key.split('/').pop()}"`,
      },
    });
  } catch (err: any) {
    console.error('[recruiter-document-proxy] Unexpected error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal Server Error' }), { status: 500, headers: cors });
  }
}
