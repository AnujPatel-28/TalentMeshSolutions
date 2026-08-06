"use client";

import React, { createContext, useCallback, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';

import { insforge, refreshAccessToken } from '@/lib/insforge';
import type { User, UserRole } from '@/types/auth';
import { initSessionSync, broadcastSessionEvent } from '@/lib/sessionSync';
import { useSessionRefresh } from '@/hooks/useSessionRefresh';
import { useNetworkState } from '@/hooks/useNetworkState';
import { SessionExpireModal } from '@/components/system/SessionExpireModal';

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string; user?: User | null; accessToken?: string }>;
  signUp: (email: string, password: string, role: UserRole, name: string) => Promise<{ error?: string; requireEmailVerification?: boolean }>;
  signOut: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: (skipLoadingState?: boolean) => Promise<User | null>;
  login: (token: string, user: User) => void;
  updateUser: (updatedUser: User) => void;

}

const AuthContext = createContext<AuthContextType | undefined>(undefined);


const USER_STORAGE_KEY = 'tm_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  const router = useRouter();
  const queryClient = useQueryClient();

  const userRef = useRef<User | null>(null);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Session governance states & refs
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [isOffline, setIsOffline] = useState(false);

  const countdownIntervalRef = useRef<any>(null);
  const warningTimerRef = useRef<any>(null);

  const extendSession = useCallback(async () => {
    setIsWarningOpen(false);
    setIsOffline(false);
    setCountdown(60);

    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('tm_last_active_time', Date.now().toString());
      broadcastSessionEvent('SESSION_EXTENDED');
    }

    try {
      await refreshAccessToken();
    } catch (err) {
      console.warn('[AuthContext] Session extension refresh failed:', err);
    }
  }, []);

  const handleReconnect = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      alert('You are still offline. Please check your internet connection.');
      return;
    }

    try {
      await refreshAccessToken();
      await extendSession();
    } catch (err) {
      console.warn('[AuthContext] Reconnection re-auth failed:', err);
      alert('Failed to reconnect session. Your session may have expired.');
    }
  }, [extendSession]);

  // Coordinated multi-tab session refresh hook
  useSessionRefresh(user?.role);

  // Global offline action queue monitor
  useNetworkState();


  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const clearAuthCookies = useCallback(async () => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(USER_STORAGE_KEY);
      // Clear the non-HttpOnly signal cookie immediately on client. The HttpOnly token cookie
      // is not reachable from JS by design — the DELETE below clears it server-side.
      document.cookie = 'tm_session=; path=/; max-age=0';
    }
    // Cached query data belongs to the session being torn down. The broadcast logout
    // handlers navigate via router.push without a reload, so entries under a
    // user-agnostic key (queryKeys.adminDashboardSummary) would survive into the next login.
    queryClient.clear();
    try {
      await fetch('/api/auth/session', { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to clear auth cookies via API', err);
    }
  }, [queryClient]);

  const syncAuthCookies = useCallback(async (
    token: string, 
    authUser: Pick<User, 'role' | 'email' | 'company_id'>, 
    onboardingComplete?: boolean,
    mfaEnabled?: boolean
  ) => {
    // The token is NOT persisted to sessionStorage or document.cookie. /api/auth/session below
    // writes it once, as an HttpOnly + Domain=.<parent> cookie that the browser attaches to
    // every same-origin /api/v1/remote call on every subdomain and in every tab.
    // See 10_Auth_Token_Propagation_And_Subdomain_Fix.md §4.2 C2 / audit 01 H-8.

    const adminAccess = authUser.role === 'admin' || authUser.role === 'super_admin';

    // Call the NEW Next.js API route to govern cookies
    await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        token, 
        role: authUser.role, 
        adminAccess, 
        onboardingComplete,
        mfaEnabled,
        companyId: authUser.company_id
      }),
    }).catch(console.error);
  }, []);


  const cacheUser = useCallback((authUser: User | null) => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!authUser) {
      window.sessionStorage.removeItem(USER_STORAGE_KEY);
      return;
    }

    window.sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(authUser));
  }, []);

  const fetchProfile = useCallback(async (
    token: string,
    userId: string,
    email: string,
    metadata?: Record<string, unknown>,
  ): Promise<User | null> => {
    if (!token) return null;
    try {
      const baseUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/v1/remote` : (process.env.NEXT_PUBLIC_INSFORGE_URL || '');
      const authEndpoint = typeof window !== 'undefined' ? '/api/v1/remote/functions/auth-session' : `${baseUrl}/functions/auth-session`;

      const response = await fetch(authEndpoint, {
        method: 'GET',
        headers: {
          'x-client-info': 'talentmesh-web',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const payload = await response.json();
        if (payload?.user) {
          console.log('[AuthContext] Successfully loaded profile via auth-session edge function');
          return payload.user as User;
        }
      }
    } catch (err) {
      console.warn('[AuthContext] Failed to fetch profile via auth-session edge function, falling back to direct DB fetch:', err);
    }

    try {
      const { createClient } = await import('@insforge/sdk');
      const baseUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/v1/remote` : (process.env.NEXT_PUBLIC_INSFORGE_URL || '');
      const anonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!;
      const authedClient = createClient({ baseUrl, anonKey });
      const isJwt = token && token.split('.').length === 3;
      if (isJwt) {
        authedClient.setAccessToken(token);
      }

      const { data: profile, error } = await authedClient.database
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();


      if (error || !profile) {
        const fallbackRole: UserRole = (metadata?.role as UserRole) || 'candidate';
        // Prefer the real name from OAuth metadata (Google sends full_name / name)
        const metadataName = (metadata?.full_name || metadata?.name || '') as string;
        const fallbackName = metadataName.trim() || email.split('@')[0];

        try {
          const { data: createdProfile, error: insertError } = await authedClient.database
            .from('profiles')
            .insert([{
              id: userId,
              email,
              role: fallbackRole,
              name: fallbackName,
            }])
            .select()
            .single();

          if (!insertError && createdProfile) {
            return {
              id: userId,
              email,
              role: createdProfile.role as UserRole,
              name: createdProfile.name || fallbackName,
              avatar_url: createdProfile.avatar_url || null,
              company_id: createdProfile.company_id,
              created_at: createdProfile.created_at,
              mfa_enabled: createdProfile.mfa_enabled || false,
              password_set_at: createdProfile.password_set_at,
              onboarding_completed: createdProfile.completed_onboarding || createdProfile.onboarding_completed || false,
              onboarding_step: createdProfile.onboarding_step || 0,
            };
          }
        } catch {
          // Fall through to a minimal in-memory user object.
        }

        return {
          id: userId,
          email,
          role: fallbackRole,
          name: fallbackName,
          avatar_url: (metadata?.avatar_url || metadata?.picture || null) as string | null,
          onboarding_completed: false,
          onboarding_step: 0,
        };
      }

      // Prefer profile name from DB; if it looks like an email prefix, try metadata instead
      const dbName = (profile.name || '') as string;
      const metaName = ((metadata?.full_name || metadata?.name || '') as string).trim();
      const resolvedName = (dbName && dbName !== email.split('@')[0]) ? dbName : (metaName || dbName);

      return {
        id: userId,
        email,
        role: (profile.role as UserRole) || 'candidate',
        name: resolvedName,
        avatar_url: profile.avatar_url || null,
        company_id: profile.company_id,
        created_at: profile.created_at,
        mfa_enabled: profile.mfa_enabled || false,
        password_set_at: profile.password_set_at,
        onboarding_completed: profile.completed_onboarding || profile.onboarding_completed || false,
        onboarding_step: profile.onboarding_step || 0,
      };
    } catch (err) {
      console.error('Unexpected error fetching profile:', err);
      return null;
    }
  }, []);

  const refreshUser = useCallback(async (skipLoadingState: boolean = false) => {
    if (!skipLoadingState) {
      setIsLoading(true);
    }

    try {
      // Proactively rotate the token first to keep the session active. This re-sets the
      // HttpOnly cookie server-side; the returned token is only held in memory for this call.
      const token = await refreshAccessToken();

      // No JS-visible token gate here: on a fresh tab or a sibling subdomain the only proof of
      // session is the HttpOnly cookie, which JS cannot read. We always ask the server, which
      // authenticates the request from that cookie (credentials: 'include'). A dead session
      // surfaces as a non-ok response below and is cleared there.
      const authEndpoint = '/api/v1/remote/functions/auth-session';

      const response = await fetch(authEndpoint, {
        method: 'GET',
        headers: {
          'x-client-info': 'talentmesh-web',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'include'
      });


      if (!response.ok) {
        clearAuthCookies();
        setUser(null);
        return null;
      }

      const payload = await response.json();

      if (!payload?.user) {
        clearAuthCookies();
        setUser(null);
        return null;
      }

      const resolvedUser = payload.user as User;

      // Sync token to API route and local store/SDK via syncAuthCookies
      const finalToken = payload.token || token;
      if (finalToken) {
        await syncAuthCookies(finalToken, resolvedUser, resolvedUser.onboarding_completed, resolvedUser.mfa_enabled);
      }



      setUser(resolvedUser);
      cacheUser(resolvedUser);
      if (typeof window !== 'undefined') {
        const lastActive = parseInt(localStorage.getItem('tm_last_active_time') || '0');
        const now = Date.now();
        const twoHoursMs = 2 * 60 * 60 * 1000;
        if (!lastActive || isNaN(lastActive) || (now - lastActive > twoHoursMs)) {
          localStorage.setItem('tm_last_active_time', now.toString());
        }
      }

      return resolvedUser;
    } catch (err) {
      if (!(err instanceof TypeError && err.message === 'Failed to fetch')) {
        console.error('Refresh user error:', err);
      }

      clearAuthCookies();
      setUser(null);
      return null;
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
    }
  }, [cacheUser, clearAuthCookies]);

  const signOut = async (preserveRedirect: boolean = false) => {
    await insforge.auth.signOut();
    // Call the auth-session edge function to clear cookies
    const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;
    const authEndpoint = typeof window !== 'undefined' ? '/api/v1/remote/functions/auth-session' : `${baseUrl}/functions/auth-session`;
    await fetch(authEndpoint, {
      method: 'DELETE',
      headers: {
        'x-client-info': 'talentmesh-web'
      },
      credentials: 'include'
    }).catch(() => undefined);

    // Both requests must settle before the redirect below: window.location.replace unloads
    // the document and aborts anything still in flight, and these carry the only Set-Cookie
    // headers that clear tm_* (session) and insforge_refresh_token/insforge_csrf_token (logout).
    await Promise.all([
      clearAuthCookies(),
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'x-client-info': 'talentmesh-web' },
        credentials: 'include',
      }).catch(() => undefined),
    ]);

    setUser(null);
    if (preserveRedirect && typeof window !== 'undefined') {
      const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.replace(`/login?reason=session_expired&returnTo=${returnTo}`);
    } else {
      window.location.replace('/login');
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await insforge.auth.signInWithPassword({ email: email!, password: password! });

      if (error) {
        let message = error.message;
        if (message.includes('Invalid login credentials')) {
          message = 'Invalid email or password. Please try again.';
        } else if (message.includes('Email not confirmed')) {
          message = 'Please confirm your email address before logging in.';
        }
        return { error: message };
      }

      let parsedData = data;
      if (typeof data === 'string') {
        try {
          parsedData = JSON.parse(data);
        } catch { }
      }
      const token = parsedData?.accessToken || (parsedData as any)?.access_token;
      const userIdVal = parsedData?.user?.id;
      const userEmail = parsedData?.user?.email;
      if (!token || !userIdVal || !userEmail) {
        return { error: 'Sign in succeeded, but the session payload was incomplete.' };
      }

      const fullUser = await fetchProfile(token, userIdVal, userEmail, data?.user?.metadata || undefined);
      if (!fullUser) {
        return { error: 'Signed in, but failed to load your profile.' };
      }

      await syncAuthCookies(token, fullUser, fullUser.onboarding_completed, fullUser.mfa_enabled);
      setUser(fullUser);
      cacheUser(fullUser);
      if (typeof window !== 'undefined') {
        localStorage.setItem('tm_last_active_time', Date.now().toString());
      }
      return { user: fullUser, accessToken: token };
    } catch {
      return { error: 'An unexpected error occurred during sign in.' };
    }
  };


  const signUp = async (email: string, password: string, role: UserRole, name: string) => {
    try {
      // Use the auth-signup edge function which handles both auth and profile creation
      const { data, error } = await insforge.functions.invoke('auth-signup', {
        body: { email, password, role, name }
      });

      if (error) {
        return { error: error.message };
      }

      // If we got an access token (email verification not required), set up the session
      const signupToken = data?.accessToken || (data as any)?.access_token;
      const signupUser = data?.user;
      if (signupToken && signupUser) {
        // Construct user object from response
        const fullUser: User = {
          id: signupUser.id,
          email: signupUser.email,
          role: role,
          name: name,
          avatar_url: null,
          created_at: new Date().toISOString(),
          mfa_enabled: false
        };

        await syncAuthCookies(signupToken, fullUser, false, false);
        setUser(fullUser);
        cacheUser(fullUser);
        if (typeof window !== 'undefined') {
          localStorage.setItem('tm_last_active_time', Date.now().toString());
        }
      }

      return { requireEmailVerification: data?.requireEmailVerification };
    } catch {
      return { error: 'An unexpected error occurred during sign up.' };
    }
  };

  // Coordinated multi-tab session synchronization listener
  useEffect(() => {
    const cleanup = initSessionSync((type, payload) => {
      if (type === 'LOGOUT') {
        console.log('[AuthContext] Signout broadcast received. Signing out locally...');
        clearAuthCookies();
        setUser(null);
        router.push('/login');
      } else if (type === 'SESSION_REFRESHED') {
        // No token is broadcast: the refreshing tab rotated the shared HttpOnly cookie, which
        // already authenticates this tab's requests. We only adopt the refreshed user.
        const { user: refreshedUser } = payload as { user?: User };
        console.log('[AuthContext] Session refreshed in another tab. Adopting refreshed user...');
        if (refreshedUser) {
          setUser(refreshedUser);
          cacheUser(refreshedUser);
        }
      } else if (type === 'SESSION_WARNING') {
        if (userRef.current) {
          console.log('[AuthContext] Session warning broadcast received.');
          setIsWarningOpen(true);
          setCountdown(60);
        }
      } else if (type === 'SESSION_EXTENDED') {
        console.log('[AuthContext] Session extended broadcast received.');
        setIsWarningOpen(false);
        setIsOffline(false);
        setCountdown(60);
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
      } else if (type === 'SESSION_LOGOUT') {
        console.log('[AuthContext] Session logout broadcast received.');
        clearAuthCookies();
        setUser(null);
        if (typeof window !== 'undefined') {
          const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
          router.push(`/login?reason=session_expired&returnTo=${returnTo}`);
        } else {
          router.push('/login?reason=session_expired');
        }
      }
    });
    return () => {
      if (cleanup) cleanup();
    };
  }, [clearAuthCookies, cacheUser, router]);

  useEffect(() => {
    const initAuth = async () => {
      if (typeof window !== 'undefined') {
        // A ?token= hop is never trusted to establish a session: tokens in URLs leak to
        // history, referrers and logs (H-8), and the shared HttpOnly cookie makes the hop
        // unnecessary. Any such param is stripped, not consumed.
        // See 10_Auth_Token_Propagation_And_Subdomain_Fix.md §4.3.
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('token')) {
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete('token');
          window.history.replaceState({}, '', newUrl.toString());
        }
      }

      let hasLoadedCached = false;
      try {
        const cached = window.sessionStorage.getItem(USER_STORAGE_KEY);
        if (cached) {
          setUser(JSON.parse(cached) as User);
          hasLoadedCached = true;
        }
      } catch {
        window.sessionStorage.removeItem(USER_STORAGE_KEY);
      }

      // Use tm_session (non-HttpOnly signal cookie) instead of tm_access_token (HttpOnly)
      // because HttpOnly cookies are invisible to document.cookie. This is critical for
      // cross-subdomain auth detection (e.g. after redirect from main domain to jobs.domain.com).
      const hasAccessToken = document.cookie.includes('tm_session');
      const isAuthPage = typeof window !== 'undefined' &&
        (window.location.pathname === '/auth/callback' || window.location.pathname === '/login');

      if ((hasLoadedCached || hasAccessToken) && !isAuthPage) {
        await refreshUser();
      } else {
        setIsLoading(false);
        setIsInitialized(true);
      }
    };

    initAuth();
  }, [refreshUser]);

  // 🔥 Listen for session-expired events from invokeFunction
  useEffect(() => {
    const handleExpiry = () => {
      console.warn('[AuthContext] Session expired event received. Signing out...');
      signOut(true);
    };

    window.addEventListener('auth:session-expired', handleExpiry);
    return () => window.removeEventListener('auth:session-expired', handleExpiry);
  }, [signOut]);

  // 🔥 Auth state is handled via proactive refresh and manual sign out calls.
  // InsForge SDK does not provide a separate onAuthStateChange listener like Supabase.



  // Check for expired pending actions and commit them in the background
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkAndCommitPending = async () => {
      const keys = ['tm_pending_action_candidates', 'tm_pending_action_recruiters'];
      for (const storageKey of keys) {
        const stored = window.sessionStorage.getItem(storageKey);
        if (!stored) continue;

        try {
          const parsed = JSON.parse(stored);
          if (Date.now() >= parsed.expiresAt) {
            // Expired! Commit immediately.
            const endpoint = storageKey.includes('candidates') ? 'admin-candidates' : 'admin-recruiters';
            const { invokeFunction: invokeFn } = await import('@/lib/insforge');
            const { mutationQueue: mutQueue } = await import('@/lib/mutationQueue');

            await mutQueue.enqueue(
              async (idemKey) => {
                let error = null;
                if (parsed.action === 'approve' || parsed.action === 'reject') {
                  const { error: patchError } = await invokeFn(endpoint, {
                    method: 'POST',
                    body: { ids: parsed.ids, action: 'bulk-status', status: parsed.action === 'approve' ? 'approved' : 'rejected' },
                    idempotencyKey: idemKey
                  });
                  error = patchError;
                } else if (parsed.action === 'activate' || parsed.action === 'deactivate') {
                  const { error: patchError } = await invokeFn(endpoint, {
                    method: 'POST',
                    body: { ids: parsed.ids, action: 'bulk-active', is_active: parsed.action === 'activate' },
                    idempotencyKey: idemKey
                  });
                  error = patchError;
                }
                if (error) throw new Error(error.message);
              },
              () => { },
              { key: `bg_commit_${endpoint}_${Date.now()}` }
            );

            window.sessionStorage.removeItem(storageKey);
          }
        } catch (e) {
          window.sessionStorage.removeItem(storageKey);
        }
      }
    };

    checkAndCommitPending();
    const interval = setInterval(checkAndCommitPending, 5000);
    return () => clearInterval(interval);
  }, []);

  // Inactivity timeout manager
  useEffect(() => {
    if (!user) {
      if (warningTimerRef.current) {
        clearInterval(warningTimerRef.current);
        warningTimerRef.current = null;
      }
      setIsWarningOpen(false);
      return;
    }

    // Role-based timeout settings
    let idleMs = 7 * 24 * 60 * 60 * 1000; // default candidate: 7 days
    const warningMs = 60 * 1000;  // 60s

    if (user.role === 'admin' || user.role === 'super_admin') {
      idleMs = 120 * 60 * 1000; // admin: 2h (120m)
    } else if (user.role === 'recruiter') {
      idleMs = 240 * 60 * 1000; // recruiter: 4h (240m)
    }

    const checkTimeout = () => {
      const lastActiveGlobal = parseInt(localStorage.getItem('tm_last_active_time') || Date.now().toString());
      const now = Date.now();
      const elapsed = now - lastActiveGlobal;
      console.log(`[checkTimeout] elapsed: ${elapsed}, threshold: ${idleMs - warningMs}, isWarningOpen: ${isWarningOpen}, userRole: ${user?.role}`);

      if (elapsed >= (idleMs - warningMs) && !isWarningOpen) {
        setIsWarningOpen(true);
        setCountdown(60);
        broadcastSessionEvent('SESSION_WARNING');
      }
    };

    // Initialize or reset tm_last_active_time if missing, invalid, or stale (older than 2 hours)
    const initialLastActive = parseInt(localStorage.getItem('tm_last_active_time') || '0');
    const now = Date.now();
    const twoHoursMs = 2 * 60 * 60 * 1000;
    if (!initialLastActive || isNaN(initialLastActive) || (now - initialLastActive > twoHoursMs)) {
      localStorage.setItem('tm_last_active_time', now.toString());
    }

    const intervalId = setInterval(checkTimeout, 5000);
    warningTimerRef.current = intervalId;

    const handleLocalActivity = () => {
      const now = Date.now();
      const lastActiveGlobal = parseInt(localStorage.getItem('tm_last_active_time') || '0');

      if (now - lastActiveGlobal > 2000) {
        localStorage.setItem('tm_last_active_time', now.toString());
      }

      if (isWarningOpen) {
        extendSession();
      }
    };

    window.addEventListener('mousedown', handleLocalActivity);
    window.addEventListener('keydown', handleLocalActivity);
    window.addEventListener('click', handleLocalActivity);
    window.addEventListener('scroll', handleLocalActivity);

    return () => {
      clearInterval(intervalId);
      warningTimerRef.current = null;
      window.removeEventListener('mousedown', handleLocalActivity);
      window.removeEventListener('keydown', handleLocalActivity);
      window.removeEventListener('click', handleLocalActivity);
      window.removeEventListener('scroll', handleLocalActivity);
    };
  }, [user, isWarningOpen, extendSession]);

  // Synchronized countdown timer across all tabs using shared localStorage
  useEffect(() => {
    if (!isWarningOpen || !user) {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      return;
    }

    // Role-based timeout settings
    let idleMs = 7 * 24 * 60 * 60 * 1000; // default candidate: 7 days
    if (user.role === 'admin' || user.role === 'super_admin') {
      idleMs = 120 * 60 * 1000; // admin: 2h (120m)
    } else if (user.role === 'recruiter') {
      idleMs = 240 * 60 * 1000; // recruiter: 4h (240m)
    }

    const updateCountdown = () => {
      const lastActiveGlobal = parseInt(localStorage.getItem('tm_last_active_time') || Date.now().toString());
      const now = Date.now();
      const elapsed = now - lastActiveGlobal;
      
      const remainingMs = idleMs - elapsed;
      const secondsLeft = Math.max(0, Math.ceil(remainingMs / 1000));
      
      setCountdown(secondsLeft);

      const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
      setIsOffline(!online);

      if (secondsLeft <= 0) {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }

        console.log('[AuthContext] Session warning countdown hit 0. Revoking session.');
        broadcastSessionEvent('SESSION_LOGOUT');
        signOut();
        router.push('/login?reason=session_expired');
      }
    };

    updateCountdown();

    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    countdownIntervalRef.current = setInterval(updateCountdown, 1000);

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, [isWarningOpen, user, signOut, router]);

  const login = useCallback(async (token: string, authUser: User) => {
    await syncAuthCookies(token, authUser, authUser.onboarding_completed, authUser.mfa_enabled);
    setUser(authUser);
    cacheUser(authUser);
    if (typeof window !== 'undefined') {
      const lastActive = parseInt(localStorage.getItem('tm_last_active_time') || '0');
      const now = Date.now();
      const twoHoursMs = 2 * 60 * 60 * 1000;
      if (!lastActive || isNaN(lastActive) || (now - lastActive > twoHoursMs)) {
        localStorage.setItem('tm_last_active_time', now.toString());
      }
    }
  }, [cacheUser, syncAuthCookies]);

  const updateUser = useCallback((updatedUser: User) => {
    setUser(updatedUser);
    cacheUser(updatedUser);
  }, [cacheUser]);

  return (
    <AuthContext.Provider value={{
      user,
      isAdmin,
      isLoading,
      isInitialized,
      signIn,
      signUp,
      signOut,
      logout: signOut,
      refreshUser,
      login,
      updateUser,
    }}>
      {children}
      <SessionExpireModal
        isOpen={isWarningOpen}
        countdown={countdown}
        onExtend={extendSession}
        isOffline={isOffline}
        onReconnect={handleReconnect}
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
