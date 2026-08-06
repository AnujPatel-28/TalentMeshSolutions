import 'server-only';

import { createClient } from '@insforge/sdk';
import { cookies } from 'next/headers';

import { resolveMockRole } from '@/lib/mock-auth';
import type { User } from '@/types/auth';


export async function getServerUser(): Promise<User | null> {
  const cookieStore = await cookies();
  // Token comes only from the HttpOnly cookie. The `x-access-token` request header
  // was previously accepted first, but it is fully attacker-controlled and defeats the
  // HttpOnly cookie. See 11_Admin_Portal_Audit_And_Remediation (A-1).
  const token = cookieStore.get('tm_access_token')?.value;

  if (!token) return null;

  // E2E mock identities — minted only when the three-condition gate in lib/mock-auth.ts
  // holds (flag on, non-production deployment, token equals the harness-injected env value).
  // The e2e harness (which runs a production build) sets the flag and tokens in
  // playwright.config.ts. See 12_Admin_Production_Readiness_Execution_Plan (W1).
  const mockRole = resolveMockRole(token);

  if (mockRole === 'admin') {
    return {
      id: 'adm-uuid-999',
      email: 'admin@test.com',
      name: 'Super Admin',
      role: 'admin',
      mfa_enabled: false,
      avatar_url: null,
    };
  }

  if (mockRole === 'candidate') {
    return {
      id: 'cand-uuid-123',
      email: 'candidate@test.com',
      name: 'Test User',
      role: 'candidate',
      mfa_enabled: false,
      avatar_url: null,
    };
  }

  if (mockRole === 'recruiter') {
    return {
      id: 'rec-uuid-777',
      email: 'recruiter@test.com',
      name: 'Test Recruiter',
      role: 'recruiter',
      mfa_enabled: false,
      avatar_url: null,
    };
  }

  if (mockRole === 'suspended_admin') {
    return {
      id: 'susp-adm-uuid-000',
      email: 'suspended-admin@test.com',
      name: 'Suspended Admin',
      role: 'admin',
      mfa_enabled: false,
      avatar_url: null,
      is_active: false,
    };
  }

  const insforge = createClient({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
    anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
    edgeFunctionToken: token,
    isServerMode: true,
  });

  const response = await insforge.auth.getCurrentUser();
  const user = response.data?.user;
  const userError = response.error;

  if (userError || !user) return null;

  const { data: profile } = await insforge.database
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // Authorization role comes only from the policy-controlled `profiles` table.
  // The provider-managed `user.metadata.role` is client-writable and must never be an
  // authorization input. See 11_Admin_Portal_Audit_And_Remediation (A-3).
  const role = profile?.role || 'candidate';

  return {
    id: user.id,
    email: user.email!,
    name: profile?.name || user.email?.split('@')[0] || '',
    role: role,
    avatar_url: profile?.avatar_url || null,
    company_id: profile?.company_id,
    created_at: profile?.created_at,
    mfa_enabled: profile?.mfa_enabled || false,
    password_set_at: profile?.password_set_at,
    is_active: profile?.is_active !== false, // Default true if not present
    completed_onboarding: profile?.completed_onboarding || false,
  };
}
