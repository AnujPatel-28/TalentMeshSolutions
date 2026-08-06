import { createClient } from '@insforge/sdk';

import { resolveMockRole } from '@/lib/mock-auth';
import type { User, UserRole } from '@/types/auth';
import { getServerStorageUrl } from '@/lib/utils/storage-url';

const SESSION_MAX_AGE_SECONDS = 60 * 60;

type ProfileRecord = {
  id: string;
  email?: string | null;
  role?: UserRole | null;
  name?: string | null;
  avatar_url?: string | null;
  company_id?: string | null;
  created_at?: string | null;
  mfa_enabled?: boolean | null;
  password_set_at?: string | null;
  status?: string | null;
  mfa_locked_until?: string | null;
};

export type AuthenticatedSession = {
  accessToken: string;
  user: User;
  profile: ProfileRecord | null;
  isAdmin: boolean;
  requiresMfa: boolean;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }

  return value;
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  };
}


export function normalizeRole(role: string | null | undefined): UserRole {
  if (role === 'admin' || role === 'super_admin' || role === 'recruiter') {
    return role;
  }

  return 'candidate';
}

export function createServerSessionClient(accessToken: string) {
  return createClient({
    baseUrl: requireEnv('NEXT_PUBLIC_INSFORGE_URL'),
    anonKey: requireEnv('NEXT_PUBLIC_INSFORGE_ANON_KEY'),
    edgeFunctionToken: accessToken,
    isServerMode: true,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export function createPublicInsforgeClient() {
  return createClient({
    baseUrl: requireEnv('NEXT_PUBLIC_INSFORGE_URL'),
    anonKey: requireEnv('NEXT_PUBLIC_INSFORGE_ANON_KEY'),
  });
}

function mapProfileToUser(userId: string, email: string, profile: ProfileRecord | null): User {
  const resolvedRole = normalizeRole(profile?.role);

  return {
    id: userId,
    email,
    name: profile?.name || email.split('@')[0] || '',
    role: resolvedRole,
    avatar_url: profile?.avatar_url || null,
    company_id: profile?.company_id || undefined,
    created_at: profile?.created_at || undefined,
    mfa_enabled: profile?.mfa_enabled || false,
    password_set_at: profile?.password_set_at || undefined,
  };
}

export async function resolveSessionFromToken(accessToken: string): Promise<AuthenticatedSession | null> {
  // Unified onto the shared three-condition gate (previously gated on a divergent
  // ENABLE_MOCK_AUTH flag that nothing set). See lib/mock-auth.ts (W1).
  const mockRole = resolveMockRole(accessToken);

  if (mockRole === 'admin') {
    return {
      accessToken,
      user: {
        id: 'adm-uuid-999',
        email: 'admin@test.com',
        name: 'Super Admin',
        role: 'admin',
        mfa_enabled: false,
        avatar_url: null
      },
      profile: {
        id: 'adm-uuid-999',
        email: 'admin@test.com',
        role: 'admin',
        name: 'Super Admin'
      },
      isAdmin: true,
      requiresMfa: false
    };
  }
  if (mockRole === 'candidate') {
    return {
      accessToken,
      user: {
        id: 'cand-uuid-123',
        email: 'candidate@test.com',
        name: 'Test User',
        role: 'candidate',
        mfa_enabled: false,
        avatar_url: null
      },
      profile: {
        id: 'cand-uuid-123',
        email: 'candidate@test.com',
        role: 'candidate',
        name: 'Test User'
      },
      isAdmin: false,
      requiresMfa: false
    };
  }

  try {
    const insforge = createServerSessionClient(accessToken);
    const { data: { user: authUser }, error: authError } = await insforge.auth.getCurrentUser();

    if (authError || !authUser || !authUser.id || !authUser.email) {
      return null;
    }

    let profile: ProfileRecord | null = null;

    try {
      const { data } = await insforge.database
        .from('profiles')
        .select('id, email, role, name, avatar_url, company_id, created_at, mfa_enabled, password_set_at, status, mfa_locked_until')
        .eq('id', authUser.id)
        .single();

      profile = (data as ProfileRecord | null) || null;
    } catch {
      profile = null;
    }

    const user = mapProfileToUser(authUser.id, authUser.email, profile);
    const isAdmin = user.role === 'admin' || user.role === 'super_admin';

    return {
      accessToken,
      user,
      profile,
      isAdmin,
      requiresMfa: isAdmin && Boolean(profile?.mfa_enabled),
    };
  } catch {
    return null;
  }
}

export async function getAuthenticatedSession(): Promise<AuthenticatedSession | null> {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('tm_access_token')?.value;

  if (!accessToken) {
    return null;
  }

  return resolveSessionFromToken(accessToken);
}
