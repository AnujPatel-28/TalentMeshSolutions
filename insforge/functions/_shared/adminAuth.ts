// Shared admin edge preamble (R-2 / doc 14 §4.3). Replaces the 15 copy-pasted blocks.
// A-12: all credentials come from env ONLY — the old `x-insforge-service-key` /
// `x-insforge-url` request-header fallbacks let a caller substitute their own backend or
// key and are gone. Missing env fails loudly at request time, never falls back to anon.

import { createClient } from 'npm:@insforge/sdk';
import { canPerform, isStaffRole, type StaffRole, type Resource, type Action } from './permissions.ts';
import { errorJson } from './errors.ts';
import { corsHeaders } from './cors.ts';

function requiredEnv(...names: string[]): string {
  for (const name of names) {
    const value = Deno.env.get(name);
    if (value) return value;
  }
  throw new Error(`Missing required environment variable: ${names.join(' or ')}`);
}

export function getBaseUrl(): string {
  return requiredEnv('NEXT_PUBLIC_INSFORGE_URL', 'INSFORGE_URL', 'INSFORGE_BASE_URL');
}

export function getServiceKey(): string {
  return requiredEnv('INSFORGE_SERVICE_KEY', 'API_KEY');
}

// Service-role client: bypasses RLS. Handlers receive it from requireStaff — after the
// staff check — rather than constructing it themselves.
export function getServiceClient(): any {
  return createClient({ baseUrl: getBaseUrl(), anonKey: getServiceKey(), isServerMode: true });
}

// Caller-scoped client: same identity requireStaff already verified, kept for RPCs whose
// SQL body reads auth.uid() (e.g. claim_export_job's ownership check) — a service-role call
// has no JWT context, so auth.uid() there is NULL and the RPC's own WHERE clause rejects it.
export function getUserClient(token: string): any {
  return createClient({
    baseUrl: getBaseUrl(),
    anonKey: requiredEnv('NEXT_PUBLIC_INSFORGE_ANON_KEY', 'INSFORGE_ANON_KEY', 'ANON_KEY'),
    edgeFunctionToken: token,
    isServerMode: true,
  });
}

export type StaffContext = {
  userId: string;
  role: StaffRole;
  db: any; // service-role client, safe to use only after this check passed
};

// Token → getCurrentUser → service-key read of profiles.role,is_active.
// 401 no/invalid token · 403 not staff · 403 suspended · 403 permission denied (if perm given).
// Returns a ready Response on failure; callers: `if (auth instanceof Response) return auth;`
export async function requireStaff(
  request: Request,
  perm?: { resource: Resource; action: Action },
): Promise<StaffContext | Response> {
  const cors = corsHeaders(request);

  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return errorJson('unauthorized', 'Missing auth', 401, cors);
  const token = authHeader.replace(/^Bearer\s+/i, '');

  const verifyClient = createClient({
    baseUrl: getBaseUrl(),
    anonKey: requiredEnv('NEXT_PUBLIC_INSFORGE_ANON_KEY', 'INSFORGE_ANON_KEY', 'ANON_KEY'),
    edgeFunctionToken: token,
    isServerMode: true,
  });
  const { data: authData, error: authError } = await verifyClient.auth.getCurrentUser();
  if (authError || !authData?.user?.id) {
    return errorJson('unauthorized', 'Unauthorized, invalid token', 401, cors);
  }

  const db = getServiceClient();
  const { data: profile, error: profileError } = await db.database
    .from('profiles')
    .select('role, is_active')
    .eq('id', authData.user.id)
    .single();

  if (profileError || !profile) return errorJson('unauthorized', 'Unauthorized, profile not found', 401, cors);
  if (!isStaffRole(profile.role)) return errorJson('forbidden', 'Forbidden', 403, cors);
  if (profile.is_active !== true) return errorJson('account_suspended', 'Forbidden, account is suspended', 403, cors);

  if (perm && !canPerform(profile.role, perm.resource, perm.action)) {
    return errorJson('permission_denied', 'forbidden', 403, cors);
  }

  return { userId: authData.user.id, role: profile.role, db };
}

// Per-branch permission check for handlers whose action varies by method/route.
export function checkPermission(
  role: StaffRole,
  perm: { resource: Resource; action: Action },
  headers: Record<string, string>,
): Response | null {
  return canPerform(role, perm.resource, perm.action) ? null : errorJson('permission_denied', 'forbidden', 403, headers);
}
