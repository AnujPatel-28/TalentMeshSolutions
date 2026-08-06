"use client";
import { useEffect, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { insforge, getSession } from '@/lib/insforge';
import { useAuth } from '@/lib/auth/AuthContext';

import { LoadingScreen } from '@/components/ui';
import { CandidateTopNavSkeleton, OpsSidebarSkeleton } from '@/components/ui/RedirectSkeletons';

import { createClient } from '@insforge/sdk';

let callbackLaunched = false;

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const defaultRole = searchParams.get('role');

  // Loading states: 'authenticating' (fetching sesssion) -> 'fetching_profile' (fetching DB profile) -> 'redirecting'
  const [loadingState, setLoadingState] = useState<'authenticating' | 'fetching_profile' | 'redirecting' | 'error'>('authenticating');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'candidate' | 'recruiter' | 'admin' | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const initialRole = defaultRole || (typeof window !== 'undefined' && window.location.hostname.startsWith('app.') ? 'recruiter' : 'candidate');
    setUserRole(initialRole as any);

    if (callbackLaunched) return;
    callbackLaunched = true;

    const handleCallback = async () => {
      try {
        setLoadingState('authenticating');

        // Validate OAuth state parameter to prevent CSRF attacks
        const stateParam = searchParams.get('state');
        if (stateParam && typeof window !== 'undefined') {
          // Try to determine which provider was used by checking sessionStorage
          let foundState = false;
          for (const provider of ['google', 'linkedin', 'github']) {
            const storedState = window.sessionStorage.getItem(`oauth_state_${provider}`);
            if (storedState && storedState === stateParam) {
              foundState = true;
              window.sessionStorage.removeItem(`oauth_state_${provider}`);
              break;
            }
          }
          if (!foundState && stateParam) {
            // Check if we already have an active session (e.g. from double render in StrictMode)
            let hasActiveSession = false;
            try {
              await insforge.auth.getCurrentUser();
              const authAny = insforge.auth as any;
              const session = authAny.tokenManager?.getSession() || null;
              if (session) {
                hasActiveSession = true;
              }
            } catch {}

            const verifier = typeof window !== 'undefined' ? window.sessionStorage.getItem('insforge_pkce_verifier') : null;
            if (!hasActiveSession && !verifier) {
              // State param present but doesn't match stored state, and no PKCE verifier is present — CSRF attempt
              console.error('[auth-callback] OAuth state mismatch — potential CSRF attack detected');
              setLoadingState('error');
              setErrorMessage('Security validation failed. Please try logging in again.');
              return;
            } else if (!hasActiveSession && verifier) {
              console.warn('[auth-callback] OAuth state mismatch detected, but PKCE verifier is present. Proceeding with PKCE exchange.');
            } else {
              console.warn('[auth-callback] State mismatch ignored: Active session already resolved.');
            }
          }
        }

        // 1. Try to detect an existing SDK session (e.g., from a previous auth token in sessionStorage).
        //    Wrapped in try-catch because calling getCurrentUser() before any session is established
        //    may throw on some SDK versions.
        let session: { user: any; accessToken: string } | null = null;
        try {
          await insforge.auth.getCurrentUser();
          // 2. Get the session from the SDK's internal TokenManager
          const authAny = insforge.auth as any;
          session = authAny.tokenManager?.getSession() || null;
        } catch {
          // No existing session — will proceed to fallbacks below.
        }

        // 3. Handle potential CSRF or initial failure with robust fallbacks
        if (!session) {
          console.warn('[auth-callback] No existing session found, attempting fallbacks...');

          const { pendingOAuthCode } = await import('@/lib/insforge');
          const code = pendingOAuthCode;

          if (code) {
            // Priority 1: PKCE OAuth Code Flow
            const verifier = typeof window !== 'undefined' ? window.sessionStorage.getItem('insforge_pkce_verifier') : null;
            console.warn(`[auth-callback] Executing code exchange: code present=${!!code}, pkce_verifier present=${!!verifier}`);
            try {
              // OAuth codes are single-use — do NOT retry, or the code will be consumed
              // by the first attempt and the retry will get "Invalid or expired code".
              const ctrl = new AbortController();
              const timer = setTimeout(() => ctrl.abort(), 35_000);
              let proxyRes: Response;
              try {
                proxyRes = await fetch('/api/auth/oauth/exchange', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ code, code_verifier: verifier }),
                  signal: ctrl.signal,
                });
              } finally {
                clearTimeout(timer);
              }

              if (proxyRes.ok) {
                const exchangeData = await proxyRes.json();
                const token = exchangeData.accessToken || exchangeData.access_token;
                const user = exchangeData.user || exchangeData.data?.user;

                if (token && user) {
                  window.sessionStorage.removeItem('insforge_pkce_verifier');
                  if (exchangeData.csrfToken) {
                    const maxAge = 7 * 24 * 60 * 60;
                    document.cookie = `insforge_csrf_token=${encodeURIComponent(exchangeData.csrfToken)}; path=/; max-age=${maxAge}; SameSite=Lax`;
                  }
                  session = { user, accessToken: token };
                  // Sync the token into the main SDK TokenManager for any subsequent SDK calls
                  const mainAuth = insforge.auth as any;
                  if (mainAuth.tokenManager) {
                    mainAuth.tokenManager.saveSession(session);
                    if (mainAuth.http?.setAuthToken) {
                      mainAuth.http.setAuthToken(token);
                    }
                  }
                } else {
                  console.error('[auth-callback] Exchange succeeded but response missing token/user');
                }
              } else {
                const errText = await proxyRes.text();
                console.error(`[auth-callback] Exchange returned ${proxyRes.status}:`, errText);
              }
            } catch (err: any) {
              const isAbort = err?.name === 'AbortError' || err?.message === 'signal is aborted without reason';
              if (!isAbort) {
                console.error('[auth-callback] Network error during exchange:', err);
              }
            }
          }

          // If no code was present or the exchange failed, try other fallbacks
          if (!session) {
            // Fallback A: Try refreshing the session via our custom proxy refresh helper
            const { refreshAccessToken } = await import('@/lib/insforge');
            const newToken = await refreshAccessToken();
            if (newToken) {
              try {
                const { data: userData } = await insforge.auth.getCurrentUser();
                if (userData?.user) {
                  session = { user: userData.user, accessToken: newToken };
                }
              } catch { /* ignore */ }
            }
          }

          if (!session && typeof window !== 'undefined' && window.location.hash) {
            // Fallback B: Extract from URL hash (Magic Link / Implicit flow)
            const params = new URLSearchParams(window.location.hash.substring(1));
            const hashAccessToken = params.get('access_token');
            if (hashAccessToken) {
              try {
                const { data: userData } = await insforge.auth.getCurrentUser();
                if (userData?.user) {
                  session = { user: userData.user, accessToken: hashAccessToken };
                }
              } catch { /* ignore */ }
            }
          }
        }

        if (!session) {
          console.error('Session retrieval error: No session returned after refresh.');
          setErrorMessage('Session retrieval failed.');
          setLoadingState('error');
          router.push('/login?error=session_fetch_failed');
          return;
        }

        setLoadingState('fetching_profile');

        await processSession({
          user: session.user,
          accessToken: session.accessToken
        });
      } catch (err) {
        console.error('Unexpected callback error:', err);
        setErrorMessage('Authentication callback failed.');
        setLoadingState('error');
        router.push('/login?error=callback_error');
      }
    };

    const processSession = async (session: { user: any; accessToken: string }) => {
      const user = session.user;

      if (!user) {
        throw new Error("No user found in session");
      }

      // Extract metadata / identity info
      const metadataInfo = user.user_metadata || user.metadata || {};
      const identityData = user.identities?.[0]?.identity_data || {};

      const rawName =
        metadataInfo.full_name ||
        metadataInfo.name ||
        identityData.full_name ||
        identityData.name ||
        (metadataInfo.given_name && metadataInfo.family_name
          ? `${metadataInfo.given_name} ${metadataInfo.family_name}`
          : '') ||
        (metadataInfo.given_name || '') ||
        (metadataInfo.family_name || '') ||
        (user.email ?? '').split('@')[0] ||
        'User';
      const realName = rawName.trim();

      const avatarUrl =
        metadataInfo.avatar_url ||
        metadataInfo.picture ||
        identityData.avatar_url ||
        identityData.picture ||
        null;

      // Await profile fetch
      let existingProfile = null;
      try {
        // Inject token into SDK immediately so we can read the profile and bypass RLS
        if (typeof insforge.setAccessToken === 'function') {
          insforge.setAccessToken(session.accessToken);
        }
        
        const { data, error } = await insforge.database
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (!error && data) {
          existingProfile = data;
        }
      } catch (err) {
        console.warn('Error fetching profile in callback:', err);
      }

      let detectedRole = defaultRole;
      if (!detectedRole && typeof window !== 'undefined') {
        const host = window.location.hostname;
        if (host.startsWith('app.')) detectedRole = 'recruiter';
        else if (host.startsWith('jobs.')) detectedRole = 'candidate';
      }

      let finalRole = existingProfile?.role || detectedRole || 'candidate';
      setUserRole(finalRole as any);

      // Prevent privilege escalation: only allow 'candidate' or 'recruiter' for new accounts via OAuth
      if (!existingProfile?.role && (finalRole === 'admin' || finalRole === 'super_admin')) {
        finalRole = 'candidate';
      }

      let roleId = existingProfile?.role_id;
      if (!roleId) {
        const prefix = finalRole === 'super_admin' ? 'admin' : finalRole === 'recruiter' ? 'recr' : 'cand';
        roleId = `${prefix}_${Math.random().toString(36).substring(2, 10)}`;
      }

      const emailPrefix = (user.email ?? '').split('@')[0];
      const isFallbackName = !existingProfile?.name || existingProfile.name === emailPrefix;
      const finalName = (isFallbackName && realName !== emailPrefix) ? realName : (existingProfile?.name || realName);

      // Check onboarding status
      const onboardingComplete =
        existingProfile?.onboarding_complete === true ||
        existingProfile?.completed_onboarding === true ||
        existingProfile?.onboarding_completed === true ||
        existingProfile?.is_onboarded === true;

      const finalAvatarUrl = existingProfile?.avatar_url || avatarUrl;

      const { error: profileUpsertError } = await insforge.database
        .from('profiles')
        .upsert([{
          id: user.id,
          email: user.email,
          name: finalName,
          avatar_url: finalAvatarUrl,
          role: finalRole,
          role_id: roleId,
          completed_onboarding: onboardingComplete,
          updated_at: new Date().toISOString(),
        }]);

      if (profileUpsertError) {
        console.error('[auth-callback] Error upserting profile:', profileUpsertError.message);
      }

      if (finalRole === 'candidate') {
        const { error: candidateUpsertError } = await insforge.database
          .from('candidate_profiles')
          .upsert([{ id: user.id }]);
        if (candidateUpsertError) {
          console.error('[auth-callback] Error upserting candidate profile:', candidateUpsertError.message);
        }
      }

      // 🛡️ SECURE LOGIN HANDOFF
      // This uses our new HttpOnly secure session API internally
      await login(session.accessToken, {
        id: user.id,
        email: user.email!,
        name: realName,
        role: finalRole as any,
        avatar_url: finalAvatarUrl,
        role_id: roleId,
        onboarding_completed: onboardingComplete,
      });

      setLoadingState('redirecting');

      const getSubdomainUrl = (subdomain: string, path: string) => {
        if (typeof window === 'undefined') return path;
        const host = window.location.host;
        const proto = window.location.protocol;
        const isSingleOrigin = window.location.hostname === 'localhost' ||
          window.location.hostname === '127.0.0.1' ||
          window.location.hostname.endsWith('.localhost') ||
          window.location.hostname.endsWith('.vercel.app');

        if (isSingleOrigin) {
          let url = `${proto}//${host}${path}`;
          return url;
        }

        const cleanHost = host.replace(/^(jobs|app|admin)\./, '');
        let url = `${proto}//${subdomain}.${cleanHost}${path}`;
        return url;
      };

      // (4) Route to onboarding if profile doesn't exist or onboarding isn't complete
      if (!existingProfile || !onboardingComplete) {
        if (finalRole === 'recruiter') {
          window.location.replace(getSubdomainUrl('app', '/onboarding/recruiter/setup'));
        } else if (finalRole === 'admin' || finalRole === 'super_admin') {
          // Admins don't have onboarding, just go to dashboard
          window.location.replace(getSubdomainUrl('admin', '/admin/dashboard'));
        } else {
          window.location.replace(getSubdomainUrl('jobs', '/onboarding/candidate'));
        }
        return;
      }

      // OVERRIDE if we have savedReturnTo AND they are onboarded (don't skip onboarding)
      const savedReturnTo = typeof window !== 'undefined' ? window.sessionStorage.getItem('auth_return_to') : null;
      if (savedReturnTo && onboardingComplete) {
        window.sessionStorage.removeItem('auth_return_to');
        let url = savedReturnTo;
        if (url.startsWith('/')) {
            url = getSubdomainUrl('jobs', savedReturnTo);
        }
        window.location.replace(url);
        return;
      }

      // (3) route based on role: admin → /<adminPath>/dashboard, recruiter → /recruiter/dashboard, candidate → /candidate/dashboard
      if (finalRole === 'admin' || finalRole === 'super_admin') {
        window.location.replace(getSubdomainUrl('admin', '/admin/dashboard'));
        return;
      }

      if (finalRole === 'recruiter') {
        window.location.replace(getSubdomainUrl('app', '/recruiter/dashboard'));
        return;
      }

      window.location.replace(getSubdomainUrl('jobs', '/candidate/dashboard'));
    };

    handleCallback();
  }, [router, defaultRole, login]);

  const stateLabel =
    loadingState === 'authenticating'
      ? 'Signing you in…'
      : loadingState === 'fetching_profile'
      ? 'Loading your profile…'
      : loadingState === 'redirecting'
      ? 'Redirecting to your dashboard…'
      : errorMessage || 'Something went wrong.';

  const isRecruiter = typeof window !== 'undefined'
    ? (window.location.hostname.startsWith('app.') || 
       window.location.search.includes('role=recruiter') || 
       window.location.search.includes('role=admin'))
    : (searchParams.get('role') === 'recruiter' || searchParams.get('role') === 'admin');

  if (loadingState === 'error') {
    return <LoadingScreen label={stateLabel} />;
  }

  const isCandidate = userRole === 'candidate' || (!userRole && !isRecruiter);

  if (isCandidate) {
    return <CandidateTopNavSkeleton label={stateLabel} />;
  }

  return <OpsSidebarSkeleton label={stateLabel} />;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Dashboard-shaped skeleton shown while auth is in progress.
   Mirrors the real sidebar + topbar + content shell with no navbar.
───────────────────────────────────────────────────────────────────────────── */
function AuthCallbackSkeleton({
  state,
  errorMessage,
}: {
  state: 'authenticating' | 'fetching_profile' | 'redirecting' | 'error';
  errorMessage: string | null;
}) {
  const searchParams = useSearchParams();

  const stateLabel =
    state === 'authenticating'
      ? 'Signing you in…'
      : state === 'fetching_profile'
      ? 'Loading your profile…'
      : state === 'redirecting'
      ? 'Redirecting to your dashboard…'
      : errorMessage || 'Something went wrong.';

  const isRecruiter = typeof window !== 'undefined'
    ? (window.location.hostname.startsWith('app.') || 
       window.location.search.includes('role=recruiter') || 
       window.location.search.includes('role=admin'))
    : (searchParams.get('role') === 'recruiter' || searchParams.get('role') === 'admin');

  if (!isRecruiter) {
    return <CandidateTopNavSkeleton label={stateLabel} />;
  }

  return (
    <>
      <div className="auth-skeleton-shell">
        {/* ── Sidebar skeleton ── */}
        <aside className="auth-sk-sidebar">
          {/* Brand */}
          <div className="auth-sk-sidebar-head">
            <div className="sk sk-sm" style={{ width: 34, height: 34, flexShrink: 0 }} />
            <div className="sk" style={{ width: 90, height: 14 }} />
          </div>

          {/* Nav items */}
          <nav className="auth-sk-nav">
            {[80, 110, 95, 70, 100, 88].map((w, i) => (
              <div key={i} className="auth-sk-nav-item">
                <div className="sk sk-sm" style={{ width: 20, height: 20, flexShrink: 0 }} />
                <div className="sk" style={{ width: w, height: 13 }} />
              </div>
            ))}

            {/* Divider */}
            <div style={{ height: 1, background: '#f0f2f5', margin: '8px 4px' }} />

            {[60, 92, 75].map((w, i) => (
              <div key={i} className="auth-sk-nav-item">
                <div className="sk sk-sm" style={{ width: 20, height: 20, flexShrink: 0 }} />
                <div className="sk" style={{ width: w, height: 13 }} />
              </div>
            ))}
          </nav>

          {/* Status pill */}
          <div className="auth-sk-status">
            <span className="auth-sk-dot" />
            {stateLabel}
          </div>

          {/* User footer */}
          <div className="auth-sk-sidebar-foot">
            <div className="sk sk-circle" style={{ width: 34, height: 34, flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div className="sk" style={{ width: '70%', height: 11 }} />
              <div className="sk" style={{ width: '50%', height: 9 }} />
            </div>
          </div>
        </aside>

        {/* ── Main area skeleton ── */}
        <div className="auth-sk-main">
          {/* Topbar */}
          <div className="auth-sk-topbar">
            <div className="sk sk-sm" style={{ width: 28, height: 28 }} />
            <div className="sk" style={{ width: 120, height: 16 }} />
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
              <div className="sk sk-sm" style={{ width: 180, height: 32 }} />
              <div className="sk sk-sm" style={{ width: 32, height: 32 }} />
              <div className="sk sk-circle" style={{ width: 32, height: 32 }} />
            </div>
          </div>

          {/* Content area */}
          <div className="auth-sk-content">
            {/* Page header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <div className="sk" style={{ width: 180, height: 26, marginBottom: 8 }} />
                <div className="sk" style={{ width: 280, height: 14 }} />
              </div>
              <div className="sk sk-sm" style={{ width: 110, height: 36 }} />
            </div>

            {/* KPI cards */}
            <div className="auth-sk-kpis">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="auth-sk-kpi-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="sk" style={{ width: 70, height: 11 }} />
                    <div className="sk sk-circle" style={{ width: 30, height: 30 }} />
                  </div>
                  <div className="sk" style={{ width: 90, height: 28 }} />
                  <div className="sk" style={{ width: 55, height: 10 }} />
                </div>
              ))}
            </div>

            {/* Table / list skeleton */}
            <div className="auth-sk-table">
              <div className="auth-sk-table-head">
                <div className="sk" style={{ width: 130, height: 16 }} />
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                  <div className="sk sk-sm" style={{ width: 80, height: 28 }} />
                  <div className="sk sk-sm" style={{ width: 28, height: 28 }} />
                </div>
              </div>
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="auth-sk-table-row">
                  <div className="sk sk-circle" style={{ width: 36, height: 36, flexShrink: 0 }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div className="sk" style={{ width: `${40 + i * 7}%`, height: 13 }} />
                    <div className="sk" style={{ width: `${20 + i * 4}%`, height: 10 }} />
                  </div>
                  <div className="sk sk-sm" style={{ width: 60, height: 22, borderRadius: 20 }} />
                  <div className="sk sk-sm" style={{ width: 24, height: 24 }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function AuthCallback() {
  return (
    <Suspense fallback={<AuthCallbackSkeleton state="authenticating" errorMessage={null} />}>
      <AuthCallbackContent />
    </Suspense>
  );
}
