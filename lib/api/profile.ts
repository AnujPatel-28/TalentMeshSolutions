import { createClient } from '@insforge/sdk';
import { insforge, directInsforge } from '@/lib/insforge';
import { resolveMockRole } from '@/lib/mock-auth';
import { UserProfile } from '@/types/user';

function decodeJwt(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payloadPart = parts[1];
    const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Error decoding JWT in getMyProfile:', e);
    return null;
  }
}

export async function getMyProfile(token?: string, allowFallback: boolean = true): Promise<UserProfile | null> {
  // E2E mock profiles — these checks were previously ungated hardcoded literals; they now
  // route through the shared three-condition gate. See lib/mock-auth.ts (W1).
  const mockRole = resolveMockRole(token);
  if (mockRole === 'candidate') {
    return {
      id: 'cand-uuid-123',
      email: 'candidate@test.com',
      name: 'Test User',
      role: 'candidate',
      completed_onboarding: true,
      onboarding_completed: true,
      onboarding_complete: true,
    };
  }
  if (mockRole === 'admin') {
    return {
      id: 'adm-uuid-999',
      email: 'admin@test.com',
      name: 'Super Admin',
      role: 'admin',
      completed_onboarding: true,
      onboarding_completed: true,
      onboarding_complete: true,
    };
  }
  try {
    const baseUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/v1/remote` : (process.env.NEXT_PUBLIC_INSFORGE_URL || '');
    const anonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || '';

    // Create client instance authenticated with token if available
    const client = token
      ? createClient({
          baseUrl,
          anonKey,
          edgeFunctionToken: token,
          isServerMode: typeof window === 'undefined',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
      : insforge;

    let user: any = null;
    try {
      const { data, error: userError } = await client.auth.getCurrentUser();
      if (!userError && data?.user) {
        user = data.user;
      }
    } catch (err) {
      console.warn('Could not get current user from client auth:', err);
    }

    let userId = user?.id;
    let userEmail = user?.email;
    let userMetadata = user?.user_metadata || {};

    // Decode token fallback
    if (token) {
      const decoded = decodeJwt(token);
      if (decoded) {
        userId = userId || decoded.sub;
        userEmail = userEmail || decoded.email;
        userMetadata = { ...userMetadata, ...(decoded.user_metadata || decoded) };
      }
    }

    if (!userId) {
      console.warn('No user ID found in getMyProfile');
      return null;
    }

    let profileData: any = null;
    let dbError: any = null;

    // 1. Try fetching by ID
    try {
      const { data, error } = await client.database
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (!error && data) {
        profileData = data;
      } else {
        dbError = error;
      }
    } catch (err) {
      dbError = err;
    }

    // 2. Try fetching by email if fetching by ID failed
    if (!profileData && userEmail) {
      try {
        const { data, error } = await client.database
          .from('profiles')
          .select('*')
          .eq('email', userEmail)
          .single();
        
        if (!error && data) {
          profileData = data;
          dbError = null;
        }
      } catch (err) {
        // ignore
      }
    }

    // 3. Try fetching with directInsforge client (bypassing local proxy) if still not found
    if (!profileData) {
      try {
        const { data } = await directInsforge.database
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
        
        if (data) {
          profileData = data;
          dbError = null;
        }
      } catch (err) {
        // ignore
      }
    }

    // 4. Return database profile if found
    if (profileData) {
      return profileData;
    }

    // 5. Build fallback profile if not found in database to prevent login blocking
    if (!allowFallback) {
      return null;
    }
    console.warn(`Profile not found in database (error: ${JSON.stringify(dbError)}). Generating fallback profile for user: ${userId}`);
    const role = userMetadata.role || 'candidate';
    const name = userMetadata.full_name || userMetadata.name || userEmail?.split('@')[0] || 'User';

    return {
      id: userId,
      email: userEmail || '',
      name: name,
      role: role,
      is_onboarded: false,
      onboarding_complete: false,
      onboarding_completed: false,
      completed_onboarding: false,
    };

  } catch (err) {
    console.error('Unexpected error in getMyProfile:', err);
    return null;
  }
}


