import { createClient } from 'npm:@insforge/sdk';
import { corsHeaders } from '../_shared/cors.ts';
import { json, errorJson, internalError } from '../_shared/errors.ts';

function parseCookies(header: string | null) {
  if (!header) return {};
  return header.split(';').reduce((res, item) => {
    const parts = item.split('=');
    res[parts[0].trim()] = parts.slice(1).join('=');
    return res;
  }, {} as Record<string, string>);
}

function parseSessionName(ua: string | null): string {
  if (!ua) return 'Unknown Session';
  let browser = 'Other';
  let os = 'Other';

  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Chrome') && !ua.includes('Chromium')) browser = 'Chrome';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Edge')) browser = 'Edge';
  
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Macintosh') || ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('Linux')) os = 'Linux';

  return `${browser} • ${os}`;
}

async function cSign(message: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const msgData = encoder.encode(message);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    msgData
  );

  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function cHashStr(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const msgBuffer = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export default async function handler(request: Request): Promise<Response> {
  const cors = corsHeaders(request);
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const baseUrl = Deno.env.get('NEXT_PUBLIC_INSFORGE_URL') || Deno.env.get('INSFORGE_URL') || '';
  const anonKey = Deno.env.get('NEXT_PUBLIC_INSFORGE_ANON_KEY') || Deno.env.get('INSFORGE_ANON_KEY') || '';
  const serviceKey = Deno.env.get('INSFORGE_SERVICE_KEY') || Deno.env.get('INSFORGE_ADMIN_KEY') || Deno.env.get('API_KEY') || '';

  try {
    const cookies = parseCookies(request.headers.get('cookie'));
    // Bearer header takes precedence: tm_access_token can outlive a logout, so preferring
    // the cookie resolves an explicitly-authenticated caller to the stale prior session.
    const token = request.headers.get('Authorization')?.split(' ')[1] || cookies['tm_access_token'];

    if (!token) {
      return errorJson('unauthorized', 'Unauthorized, no token', 401, cors);
    }

    const userDb = createClient({ baseUrl, anonKey, isServerMode: true });
    userDb.setAccessToken(token);
    const { data: authData, error: authError } = await userDb.auth.getCurrentUser();

    if (authError || !authData?.user) {
      return errorJson('unauthorized', 'Unauthorized, invalid token', 401, cors);
    }

    const user = authData.user;
    const userId = user.id;
    if (!userId || userId === 'project-admin-with-api-key') {
      return errorJson('unauthorized', 'Unauthorized, invalid token', 401, cors);
    }

    const adminDb = createClient({ baseUrl, anonKey: serviceKey, isServerMode: true });
    const refreshToken = cookies['tm_refresh_token'] || cookies['insforge_refresh_token'] || token;
    const fingerprint = await cSign(refreshToken, serviceKey);

    if (request.method === 'GET') {
      const urlObj = new URL(request.url);
      const isHeartbeat = urlObj.searchParams.get('heartbeat') === 'true';

      if (isHeartbeat) {
        const { error: heartbeatErr } = await adminDb.database
          .from('user_sessions')
          .update({ last_active_at: new Date().toISOString() })
          .eq('token_fingerprint', fingerprint);

        if (heartbeatErr) throw heartbeatErr;

        return json({ success: true, message: 'Heartbeat registered.' }, 200, cors);
      }

      const { data: profile, error: profileError } = await adminDb.database
        .from('profiles')
        .select('id, email, role, name, avatar_url, company_id, created_at, mfa_enabled, completed_onboarding')
        .eq('id', userId)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      const oauthName = ((user.metadata?.full_name || user.metadata?.name || '') as string).trim();
      const dbName = profile?.name || '';
      const emailPrefix = (profile?.email || user.email || '').split('@')[0] || '';

      let displayName = dbName;
      let shouldWriteBack = false;

      const isDefaultName = !dbName || dbName.toLowerCase() === emailPrefix.toLowerCase();
      if (isDefaultName && oauthName) {
        displayName = oauthName;
        shouldWriteBack = true;
      } else if (!dbName) {
        displayName = emailPrefix || 'User';
        shouldWriteBack = true;
      }

      if (shouldWriteBack && profile?.id) {
        await adminDb.database
          .from('profiles')
          .update({ name: displayName })
          .eq('id', profile.id);
      }

      const finalUser = {
        id: userId,
        email: profile?.email || user.email,
        name: displayName,
        role: profile?.role || 'candidate',
        avatar_url: profile?.avatar_url || null,
        company_id: profile?.company_id,
        created_at: profile?.created_at,
        mfa_enabled: profile?.mfa_enabled || false,
        onboarding_completed: profile?.completed_onboarding === true,
        onboarding_step: 0,
      };

      const requiresMfa = (finalUser.role === 'admin' || finalUser.role === 'super_admin') ? finalUser.mfa_enabled : false;

      return json({ user: finalUser, requiresMfa }, 200, cors);
    }

    if (request.method === 'POST') {
      const body = await request.json();
      const { action, newName, sessionId } = body;

      if (action === 'rename_session') {
        if (!sessionId || !newName) {
          return errorJson('invalid_request', 'Missing parameters', 400, cors);
        }

        const { error: renameErr } = await adminDb.database
          .from('user_sessions')
          .update({ session_name: newName })
          .eq('id', sessionId)
          .eq('user_id', userId);

        if (renameErr) {
          throw renameErr;
        }

        return json({ success: true }, 200, cors);
      }

      const ua = request.headers.get('user-agent');
      const ip = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
      const ipHash = await cHashStr(ip);
      const sessionLabel = parseSessionName(ua);

      const adminId = cookies['admin_user_id'];
      const impersonatingId = cookies['impersonating_user_id'];
      const isImpersonating = !!adminId && !!impersonatingId && userId === impersonatingId;

      if (isImpersonating) {
        const adminToken = cookies['tm_access_token'];
        const adminVerifier = createClient({ baseUrl, anonKey, edgeFunctionToken: adminToken, isServerMode: true });
        const { data: adminUserRes } = await adminVerifier.auth.getCurrentUser();
        if (!adminUserRes?.user || adminUserRes.user.id !== adminId) {
          return errorJson('forbidden', 'Impersonation security check failed.', 403, cors);
        }
      }

      const { error: upsertErr } = await adminDb.database
        .from('user_sessions')
        .upsert([{
          user_id: userId,
          session_type: isImpersonating ? 'impersonation' : 'normal',
          token_fingerprint: fingerprint,
          session_name: sessionLabel,
          ip_hash: ipHash,
          user_agent: ua || null,
          country: request.headers.get('cf-ipcountry') || request.headers.get('x-vercel-ip-country') || 'Unknown',
          region: request.headers.get('x-vercel-ip-region') || 'Unknown',
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          revoked_at: null,
          last_active_at: new Date().toISOString(),
          impersonation_started_at: isImpersonating ? new Date().toISOString() : null,
          impersonated_by: isImpersonating ? adminId : null
        }], { onConflict: 'token_fingerprint' });

      if (upsertErr) {
        console.error('[auth-session] Session upsert failed:', upsertErr.message);
      }

      return json({ success: true }, 200, cors);
    }

    if (request.method === 'DELETE') {
      await adminDb.database
        .from('user_sessions')
        .update({ revoked_at: new Date().toISOString() })
        .eq('token_fingerprint', fingerprint);

      try {
        const insforge = createClient({ baseUrl, anonKey, edgeFunctionToken: token, isServerMode: true });
        await insforge.auth.signOut();
      } catch {
        // ignore
      }

      return json({ success: true }, 200, cors);
    }

    return errorJson('method_not_allowed', 'Method not allowed', 405, cors);
  } catch (err) {
    return internalError(cors, err);
  }
}
