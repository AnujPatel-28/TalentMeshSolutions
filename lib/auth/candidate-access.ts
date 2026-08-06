/**
 * getCandidateAccessState
 *
 * Single source of truth for candidate onboarding/access business logic.
 * Reads directly from the DB (profiles table) rather than trusting cached JWT claims.
 *
 * This read is NOT independent of the session token: the row is RLS-scoped to auth.uid(),
 * so it only returns data when the request reaches Postgres as the user. Authentication
 * rides on the HttpOnly tm_access_token cookie, which /api/v1/remote resolves. If that
 * token is missing or expired the proxy returns 401 and this reports `unauthenticated`,
 * NOT "not onboarded" — the two must stay distinguishable, or a token failure silently
 * redirects a fully-onboarded candidate back into onboarding.
 * See 10_Auth_Token_Propagation_And_Subdomain_Fix.md §4.2 C3.
 *
 * Extend this function when you add:
 *   - profile approval flows
 *   - email-verification gates
 *   - candidate suspension
 *   - premium plan access controls
 */

import { insforge, refreshAccessToken } from '@/lib/insforge';

export interface CandidateAccessState {
  /** True when the candidate has fully completed onboarding */
  completedOnboarding: boolean;
  /** The step they were last on (0 if never started) */
  onboardingStep: number;
  /** Whether the profile row exists at all */
  profileExists: boolean;
  /** Whether the DB read itself failed */
  error: string | null;
  /**
   * True when the read failed because the request was not authenticated (proxy 401),
   * i.e. we learned nothing about onboarding. Callers MUST NOT treat this as
   * "not onboarded" — recover the session instead of redirecting to onboarding.
   */
  unauthenticated: boolean;
}

export async function getCandidateAccessState(
  userId: string,
): Promise<CandidateAccessState> {
  if (!userId) {
    return {
      completedOnboarding: false,
      onboardingStep: 0,
      profileExists: false,
      error: 'No userId provided',
      unauthenticated: false,
    };
  }

  const state = await readAccessState(userId);
  if (!state.unauthenticated) return state;

  // C4: the proxy rejected this read (S3). Rotate the cookie via /api/auth/refresh and retry
  // once. The SDK's own refresh cannot do this — it would resolve to /api/v1/remote/api/auth/
  // refresh, which the Path=/api/auth refresh cookie is never sent to.
  const refreshed = await refreshAccessToken();
  if (!refreshed) return state;
  return readAccessState(userId);
}

async function readAccessState(userId: string): Promise<CandidateAccessState> {
  try {
    const { data, error } = await insforge.database
      .from('profiles')
      .select('completed_onboarding')
      .eq('id', userId)
      .single();

    // PGRST116 = row not found — treat as new user, not an error
    if (error && error.code !== 'PGRST116') {
      return {
        completedOnboarding: false,
        onboardingStep: 0,
        profileExists: false,
        error: error.message,
        unauthenticated: isUnauthenticated(error),
      };
    }

    if (!data) {
      // Row doesn't exist yet (brand new signup)
      return {
        completedOnboarding: false,
        onboardingStep: 0,
        profileExists: false,
        error: null,
        unauthenticated: false,
      };
    }

    return {
      completedOnboarding: data.completed_onboarding === true,
      onboardingStep: 0,
      profileExists: true,
      error: null,
      unauthenticated: false,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return {
      completedOnboarding: false,
      onboardingStep: 0,
      profileExists: false,
      error: message,
      unauthenticated: isUnauthenticated(err),
    };
  }
}

/**
 * A 401 from /api/v1/remote (S3) means the token never reached Postgres, so the empty
 * result says nothing about onboarding. Matches both the proxy's AUTH_TOKEN_EXPIRED body
 * and the SDK's thrown InsForgeError.
 */
function isUnauthenticated(err: unknown): boolean {
  const e = err as { status?: number; statusCode?: number; code?: string; error?: string } | null;
  if (!e) return false;
  return e.status === 401 || e.statusCode === 401 || e.code === 'AUTH_TOKEN_EXPIRED' || e.error === 'AUTH_TOKEN_EXPIRED';
}
