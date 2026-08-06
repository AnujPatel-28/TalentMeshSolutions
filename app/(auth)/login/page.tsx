"use client";

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { insforge, directInsforge } from '@/lib/insforge';
import { getMyProfile } from '@/lib/api/profile';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck } from 'lucide-react';
import { getPublicStorageUrl } from '@/lib/utils/storage-url';
import styles from './login.module.css';
import { FormSkeleton } from '@/components/ui/LoadingSkeletons';
import { CandidateTopNavSkeleton, OpsSidebarSkeleton } from '@/components/ui/RedirectSkeletons';


/* ─────────────────────────────────────────────────────────────────────────────
   Dashboard-shaped skeleton — shown during sign-in redirect for all roles.
   Self-contained with scoped CSS-in-JS (no external imports needed).
───────────────────────────────────────────────────────────────────────────── */
function DashboardRedirectSkeleton({ label = 'Signing you in…' }: { label?: string }) {
    return (
        <>


            <div className="sk-shell">
                {/* Sidebar */}
                <aside className="sk-sidebar">
                    <div className="sk-sb-head">
                        <div className="sk-b" style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0 }} />
                        <div className="sk-b" style={{ width: 90, height: 14 }} />
                    </div>
                    <nav className="sk-nav">
                        {[80, 110, 95, 70, 100, 88].map((w, i) => (
                            <div key={i} className="sk-nav-item">
                                <div className="sk-b" style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0 }} />
                                <div className="sk-b" style={{ width: w, height: 13 }} />
                            </div>
                        ))}
                        <div style={{ height: 1, background: '#f0f2f5', margin: '8px 4px' }} />
                        {[60, 92, 75].map((w, i) => (
                            <div key={i} className="sk-nav-item">
                                <div className="sk-b" style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0 }} />
                                <div className="sk-b" style={{ width: w, height: 13 }} />
                            </div>
                        ))}
                    </nav>
                    {/* Status pill */}
                    <div className="sk-status">
                        <span className="sk-dot" />
                        {label}
                    </div>
                    {/* User footer */}
                    <div className="sk-sb-foot">
                        <div className="sk-b sk-circle" style={{ width: 34, height: 34, flexShrink: 0 }} />
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                            <div className="sk-b" style={{ width: '70%', height: 11 }} />
                            <div className="sk-b" style={{ width: '50%', height: 9 }} />
                        </div>
                    </div>
                </aside>

                {/* Main */}
                <div className="sk-main">
                    {/* Topbar */}
                    <div className="sk-topbar">
                        <div className="sk-b" style={{ width: 28, height: 28, borderRadius: 6 }} />
                        <div className="sk-b" style={{ width: 120, height: 16 }} />
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
                            <div className="sk-b" style={{ width: 180, height: 32, borderRadius: 10 }} />
                            <div className="sk-b" style={{ width: 32, height: 32, borderRadius: 10 }} />
                            <div className="sk-b sk-circle" style={{ width: 32, height: 32 }} />
                        </div>
                    </div>

                    {/* Content */}
                    <div className="sk-content">
                        {/* Page heading */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <div>
                                <div className="sk-b" style={{ width: 180, height: 26, marginBottom: 8 }} />
                                <div className="sk-b" style={{ width: 280, height: 14 }} />
                            </div>
                            <div className="sk-b" style={{ width: 110, height: 36, borderRadius: 10 }} />
                        </div>
                        {/* KPI cards */}
                        <div className="sk-kpis">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="sk-kpi">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div className="sk-b" style={{ width: 70, height: 11 }} />
                                        <div className="sk-b sk-circle" style={{ width: 30, height: 30 }} />
                                    </div>
                                    <div className="sk-b" style={{ width: 90, height: 28 }} />
                                    <div className="sk-b" style={{ width: 55, height: 10 }} />
                                </div>
                            ))}
                        </div>
                        {/* Table rows */}
                        <div className="sk-table">
                            <div className="sk-thead">
                                <div className="sk-b" style={{ width: 130, height: 16 }} />
                                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                                    <div className="sk-b" style={{ width: 80, height: 28, borderRadius: 8 }} />
                                    <div className="sk-b" style={{ width: 28, height: 28, borderRadius: 8 }} />
                                </div>
                            </div>
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="sk-trow">
                                    <div className="sk-b sk-circle" style={{ width: 36, height: 36, flexShrink: 0 }} />
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        <div className="sk-b" style={{ width: `${40 + i * 7}%`, height: 13 }} />
                                        <div className="sk-b" style={{ width: `${20 + i * 4}%`, height: 10 }} />
                                    </div>
                                    <div className="sk-b" style={{ width: 60, height: 22, borderRadius: 20 }} />
                                    <div className="sk-b" style={{ width: 24, height: 24, borderRadius: 6 }} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}



const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.08,
            delayChildren: 0.15
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 15, scale: 0.98 },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            type: "spring" as const,
            stiffness: 100,
            damping: 15
        }
    }
};

function LoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { signIn, signOut } = useAuth();

    useEffect(() => {
        if (typeof window !== 'undefined') {
            document.title = "Sign In | TalentMesh";
        }
    }, []);

    const reason = searchParams.get('reason');
    const errorParam = searchParams.get('error');
    const returnToParam = searchParams.get('returnTo') || searchParams.get('redirect');

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Per-portal login variant (ADR: suggestionidea.md S-1). Host-driven:
    // jobs./main = candidate, app. = recruiter (email-only, manual verification),
    // admin. = staff (email-only, no signup). Default candidate until mount.
    const [portal, setPortal] = useState<'candidate' | 'recruiter' | 'admin'>('candidate');
    useEffect(() => {
        const h = window.location.hostname;
        if (h.startsWith('admin.')) setPortal('admin');
        else if (h.startsWith('app.')) setPortal('recruiter');
    }, []);
    const [isLoading, setIsLoading] = useState(false);
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [redirectLabel, setRedirectLabel] = useState('Signing you in…');
    const [error, setError] = useState('');

    useEffect(() => {
        if (returnToParam && typeof window !== 'undefined') {
            window.sessionStorage.setItem('auth_return_to', returnToParam);
        }
    }, [returnToParam]);

    useEffect(() => {
        if (errorParam) {
            if (errorParam === 'session_fetch_failed') {
                setError('Session retrieval failed after OAuth callback.');
            } else if (errorParam === 'callback_error') {
                setError('An error occurred during authentication callback.');
            } else {
                setError(errorParam.replace(/_/g, ' '));
            }
        }
    }, [errorParam]);
    const [isEmailUnconfirmed, setIsEmailUnconfirmed] = useState(false);
    const [showVerification, setShowVerification] = useState(false);
    const [otp, setOtp] = useState('');
    const [resendCooldown, setResendCooldown] = useState(0);
    const [otpSentAt, setOtpSentAt] = useState<number | null>(null);
    const [timeLeft, setTimeLeft] = useState(120);

    // Resend cooldown timer
    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
        return () => clearTimeout(timer);
    }, [resendCooldown]);

    // 2-minute OTP expiration timer
    useEffect(() => {
        if (!otpSentAt) return;
        const interval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - otpSentAt) / 1000);
            const remaining = Math.max(0, 120 - elapsed);
            setTimeLeft(remaining);
            if (remaining === 0) {
                clearInterval(interval);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [otpSentAt]);

    const handleResendCode = useCallback(async () => {
        if (resendCooldown > 0 || !email) return;
        try {
            await insforge.auth.resendVerificationEmail({ email });
            setResendCooldown(60);
            setOtpSentAt(Date.now());
            setTimeLeft(120);
            setShowVerification(true);
            setError('');
        } catch {
            setError('Failed to resend verification code. Please try again.');
        }
    }, [email, resendCooldown]);

    const handleVerifyFromLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (timeLeft <= 0) {
            setError('Verification code has expired. Please resend code to get a new one.');
            return;
        }
        setIsLoading(true);
        setError('');

        try {
            const { data, error: verifyError } = await insforge.auth.verifyEmail({
                email,
                otp,
            });

            if (verifyError) {
                setError(verifyError.message || 'Invalid verification code.');
                setIsLoading(false);
                return;
            }

            if (!data?.user) {
                setError('Verification failed. Please try again.');
                setIsLoading(false);
                return;
            }

            // Email verified! Now sign in automatically
            setIsEmailUnconfirmed(false);
            setShowVerification(false);
            setOtp('');

            // Auto-login after verification
            const result = await signIn(email, password);
            if (result.error) {
                setError(result.error);
                setIsLoading(false);
                return;
            }

            // Redirect based on profile
            let profile;
            try {
                profile = await getMyProfile(result.accessToken);
            } catch (err) {
                console.error('Failed to fetch profile during auto-login:', err);
            }

            if (!profile) {
                router.push('/onboarding/candidate');
                return;
            }

            const role = profile.role || 'candidate';
            const isAdminRole = role === 'admin' || role === 'super_admin';
            const isOnboarded =
                profile.onboarding_complete === true ||
                profile.is_onboarded === true ||
                profile.onboarding_completed === true ||
                profile.completed_onboarding === true;

            if (isAdminRole) {
                setIsRedirecting(true); setRedirectLabel('Entering Admin Portal…');
                router.push('/admin/dashboard');
            } else if (role === 'recruiter') {
                let hasRecruiterData = false;
                try {
                    const { createClient } = await import('@insforge/sdk');
                    const baseUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/v1/remote` : (process.env.NEXT_PUBLIC_INSFORGE_URL || '');
                    const anonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!;
                    const authedClient = createClient({ baseUrl, anonKey });
                    const isJwt = result.accessToken && result.accessToken.split('.').length === 3;
                    if (isJwt) {
                        authedClient.setAccessToken(result.accessToken ?? null);
                    }
                    const { data: recProfile } = await authedClient.database
                        .from('recruiter_profiles')
                        .select('company_id, job_title')
                        .eq('id', profile.id)
                        .single();
                    if (recProfile && recProfile.company_id && recProfile.job_title) {
                        hasRecruiterData = true;
                    }
                } catch (err) {
                    console.error('Failed to check recruiter profile data during login verification:', err);
                }

                setIsRedirecting(true); setRedirectLabel('Loading Recruiter Dashboard…');
                router.push((isOnboarded && hasRecruiterData) ? '/recruiter/dashboard' : '/onboarding/recruiter/setup');
            } else {
                // Candidate
                setIsRedirecting(true); setRedirectLabel('Loading Candidate Dashboard…');
                router.push(isOnboarded ? '/candidate/dashboard' : '/onboarding/candidate');
            }
        } catch (err: any) {
            setError(err.message || 'Verification failed.');
            setIsLoading(false);
        }
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // 1. Basic Validation
        if (!email || !password) {
            setError('Email and password are required');
            return;
        }
        // Sign-in guard — deliberately NOT the 12-char policy in lib/validation/auth.ts.
        // Accounts created under the older 8-char rule must still be able to log in.
        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        setIsLoading(true);
        setError('');
        setIsEmailUnconfirmed(false);

        try {
            // 2. Attempt sign in
            const result = await signIn(email, password);

            if (result.error) {
                if (result.error.toLowerCase().includes('confirm your email') || result.error.includes('email_not_confirmed')) {
                    setIsEmailUnconfirmed(true);
                    setError('Please confirm your email address before logging in.');
                    setIsLoading(false);
                    return;
                }

                // If invalid credentials, attempt candidate auto-signup
                const isCredentialError =
                    result.error.toLowerCase().includes('invalid email or password') ||
                    result.error.toLowerCase().includes('invalid login credentials') ||
                    result.error.toLowerCase().includes('invalid_credentials');

                if (isCredentialError) {
                    try {
                        const autoName = email.split('@')[0]
                            .split(/[._\-+]/)
                            .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                            .join(' ') || 'Candidate';

                        const signupResponse = await fetch('/api/auth/signup', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                email,
                                password,
                                role: 'candidate',
                                name: autoName,
                            })
                        });

                        const signupResult = await signupResponse.json();

                        if (!signupResponse.ok || signupResult.error) {
                            const errStr = signupResult.error || '';
                            const alreadyExists =
                                errStr.toLowerCase().includes('already') ||
                                errStr.toLowerCase().includes('registered') ||
                                errStr.toLowerCase().includes('in use');

                            if (alreadyExists) {
                                setError('Invalid email or password. Please try again.');
                            } else {
                                setError(errStr || 'Failed to sign in.');
                            }
                            setIsLoading(false);
                            return;
                        }

                        if (signupResult.requireEmailVerification) {
                            router.push(`/signup/verify?email=${encodeURIComponent(email)}&role=candidate&name=${encodeURIComponent(autoName)}`);
                            return;
                        }

                        // Direct login success via auto-signup (verification not required)
                        window.location.assign('/onboarding/candidate');
                        return;
                    } catch (signupErr: any) {
                        console.error('Candidate auto-signup failed:', signupErr);
                        setError('Invalid email or password. Please try again.');
                        setIsLoading(false);
                        return;
                    }
                }

                setError(result.error);
                setIsLoading(false);
                return;
            }

            // sees the authenticated user and redirects to /dashboard/{role}.
            // 🔥 STEP 1 — Use user from signIn result first, fallback to getMyProfile
            const userFromAuth = result.user;
            let profile: any = userFromAuth;

            try {

                const fetchedProfile = await getMyProfile(result.accessToken);
                if (fetchedProfile) {
                    profile = fetchedProfile;
                }
            } catch (err) {
                console.error('Failed to fetch detailed profile during login:', err);
                // We still have userFromAuth, so we can continue
            }

            const role = profile?.role || 'candidate';
            const isAdminRole = role === 'admin' || role === 'super_admin';


            // 🔥 STEP 2 — Redirect logic with safety delay for cookie persistence
            // On localhost, subdomains (admin.localhost, jobs.localhost) don't resolve in browsers.
            // Detect local dev and use same-origin path-based routing instead.
            const isSingleOrigin = typeof window !== 'undefined' &&
                (window.location.hostname === 'localhost' ||
                    window.location.hostname === '127.0.0.1' ||
                    window.location.hostname.endsWith('.localhost') ||
                    window.location.hostname.endsWith('.vercel.app'));

            const getDestinationUrl = (subdomain: string, path: string) => {
                if (typeof window === 'undefined') return path;
                const host = window.location.host;
                const proto = window.location.protocol;

                if (isSingleOrigin) {
                    // Same-origin path-based routing for local dev & Vercel testing stage
                    let url = `${proto}//${host}${path}`;
                    return url;
                }

                // Production: use subdomains
                const cleanHost = host.replace(/^(jobs|app|admin)\./, '');
                let url = `${proto}//${subdomain}.${cleanHost}${path}`;
                return url;
            };

            let destination = '';

            const isOnboarded =
                (profile as any)?.onboarding_complete === true ||
                (profile as any)?.is_onboarded === true ||
                (profile as any)?.onboarding_completed === true ||
                (profile as any)?.completed_onboarding === true;

            if (isAdminRole) {
                destination = getDestinationUrl('admin', '/admin/dashboard');
            } else if (role === 'recruiter') {
                let hasRecruiterData = false;
                try {
                    const { createClient } = await import('@insforge/sdk');
                    const baseUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/v1/remote` : (process.env.NEXT_PUBLIC_INSFORGE_URL || '');
                    const anonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!;
                    const authedClient = createClient({ baseUrl, anonKey });
                    const isJwt = result.accessToken && result.accessToken.split('.').length === 3;
                    if (isJwt) {
                        authedClient.setAccessToken(result.accessToken ?? null);
                    }
                    const { data: recProfile } = await authedClient.database
                        .from('recruiter_profiles')
                        .select('company_id, job_title')
                        .eq('id', profile.id)
                        .single();
                    if (recProfile && recProfile.company_id && recProfile.job_title) {
                        hasRecruiterData = true;
                    }
                } catch (err) {
                    console.error('Failed to check recruiter profile data during login:', err);
                }

                destination = (isOnboarded && hasRecruiterData)
                    ? getDestinationUrl('app', '/recruiter/dashboard')
                    : getDestinationUrl('app', '/onboarding/recruiter/setup');
            } else {
                // Candidate
                destination = isOnboarded
                    ? getDestinationUrl('jobs', '/candidate/dashboard')
                    : getDestinationUrl('jobs', '/onboarding/candidate');
            }

            // OVERRIDE if we have savedReturnTo AND they are onboarded (don't skip onboarding)
            const savedReturnTo = typeof window !== 'undefined' ? window.sessionStorage.getItem('auth_return_to') : null;
            if (savedReturnTo && isOnboarded) {
                window.sessionStorage.removeItem('auth_return_to');
                let url = savedReturnTo;
                if (url.startsWith('/')) {
                    // Relative path — use same-origin on localhost, subdomain on production
                    url = getDestinationUrl('jobs', savedReturnTo);
                }
                destination = url;
            }

            // Show dashboard skeleton immediately, then navigate client-side or fallback
            setIsRedirecting(true);
            const roleLabel =
                isAdminRole ? 'Entering Admin Portal…'
                    : role === 'recruiter' ? 'Loading Recruiter Dashboard…'
                        : 'Loading Candidate Dashboard…';
            setRedirectLabel(roleLabel);

            // Broadcast session state change to other tabs
            try {
                const { broadcastSessionEvent } = await import('@/lib/sessionSync');
                broadcastSessionEvent('SESSION_REFRESHED', {
                    token: result.accessToken,
                    user: result.user,
                });
            } catch (broadcastErr) {
                console.warn('Failed to broadcast login session:', broadcastErr);
            }

            // Client-side replace if same origin to preserve SPA state, fallback to hard replace
            try {
                const targetUrl = new URL(destination, window.location.href);
                if (targetUrl.host === window.location.host) {
                    router.replace(targetUrl.pathname + targetUrl.search + targetUrl.hash);
                } else {
                    window.location.replace(destination);
                }
            } catch {
                window.location.replace(destination);
            }

        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred. Please try again.');
            setIsLoading(false);
            setIsRedirecting(false);
        }
    };

    const handleOAuthLogin = async (provider: 'google' | 'linkedin') => {
        try {
            setError('');
            setIsLoading(true);

            // Generate random state parameter to prevent login CSRF
            const randomState = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            if (typeof window !== 'undefined') {
                window.sessionStorage.setItem(`oauth_state_${provider}`, randomState);
            }

            const siteUrl = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_SITE_URL || '');
            // OAuth is only offered on the candidate portal (S-1); recruiter access is manually verified.
            const { data, error: authError } = await directInsforge.auth.signInWithOAuth({
                provider,
                redirectTo: `${siteUrl}/auth/callback?role=candidate&state=${encodeURIComponent(randomState)}`,
                skipBrowserRedirect: true,
                ...(provider === 'google' ? { additionalParams: { prompt: 'select_account' } } : {}),
            });
            // The InsForge SDK returns the PKCE code_verifier in data.codeVerifier when
            // skipBrowserRedirect:true is used. We MUST persist it to sessionStorage here
            // so the callback page (Fallback C) can complete the PKCE exchange.
            // directInsforge uses isServerMode:true which skips auto-save, so we save manually.
            if (data?.codeVerifier && typeof window !== 'undefined') {
                window.sessionStorage.setItem('insforge_pkce_verifier', data.codeVerifier);
            }
            if (authError) throw authError;
            if (data?.url) {
                window.location.href = data.url;
            } else {
                setIsLoading(false);
            }
        } catch (err: any) {
            setError(`Failed to initiate ${provider} login. Please try again.`);
            setIsLoading(false);
        }
    };

    // While navigating away, show the role-matching skeleton UI loader instead of the login form
    if (isRedirecting) {
        if (redirectLabel.toLowerCase().includes('candidate')) {
            return <CandidateTopNavSkeleton label={redirectLabel} />;
        }
        return <OpsSidebarSkeleton label={redirectLabel} />;
    }

    return (
        <div className={styles.page}>
            <div className={styles.pageOverlay} />
            {/* Left Panel: Hero Background & Branding (45% width) */}
            <div className={styles.leftPanel}>
                <div className={styles.leftPanelContent}>
                    <div className={styles.heroBranding}>
                        <h2 className={styles.heroBrandingTitle}>
                            <span className={styles.heroBrandingText}>Every Journey</span> <br />
                            <span className={styles.heroBrandingHighlight}>Begins With One Step</span>
                        </h2>
                        <p className={styles.heroBrandingSub}>
                            {portal === 'admin'
                                ? 'TalentMesh platform administration.'
                                : portal === 'recruiter'
                                    ? 'Sign in to manage your hiring and find the right talent faster.'
                                    : 'Sign in to explore new opportunities and grow your career with TalentMesh.'}
                        </p>
                        {portal !== 'admin' && (
                        <div className={styles.statsGrid}>
                            <div className={styles.statCard}>
                                <span className={styles.statValue}>10k+</span>
                                <span className={styles.statLabel}>Placed Candidates</span>
                            </div>
                            <div className={styles.statCard}>
                                <span className={styles.statValue}>98%</span>
                                <span className={styles.statLabel}>Match Accuracy</span>
                            </div>
                            <div className={styles.statCard}>
                                <span className={styles.statValue}>4x</span>
                                <span className={styles.statLabel}>Faster Hiring</span>
                            </div>
                        </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Right Panel: Form Side (55% width) */}
            <div className={styles.rightPanel}>


                {/* Drifting Background Blobs */}
                <div className={styles.blobContainer}>
                    <div className={`${styles.glowBlob} ${styles.blob1}`} />
                    <div className={`${styles.glowBlob} ${styles.blob2}`} />
                </div>

                <div className={styles.cardWrapper}>
                    <motion.div
                        className={styles.card}
                        initial="hidden"
                        animate="visible"
                        variants={containerVariants}
                    >
                        <motion.div variants={itemVariants}>
                            <Link href="/" className={styles.logoWrap}>
                                <Image
                                    src="/TalentMesh_page-0002-removebg-preview.png"
                                    alt="TalentMesh"
                                    width={180}
                                    height={50}
                                    unoptimized
                                    priority
                                    className={styles.logoImg}
                                    style={{ height: 'auto' }}
                                />
                            </Link>
                        </motion.div>

                        <motion.div variants={itemVariants} className={styles.header}>
                            <h1 className={styles.title}>
                                {portal === 'admin' ? 'Platform administration'
                                    : portal === 'recruiter' ? 'Company sign in'
                                        : 'Welcome back'}
                            </h1>
                            <p className={styles.subtitle}>
                                {portal === 'admin' ? 'Staff sign in with email and password'
                                    : portal === 'recruiter' ? 'Sign in to your recruiter workspace'
                                        : 'Sign in to find your next opportunity'}
                            </p>
                        </motion.div>

                        {portal === 'candidate' && (<>
                        <motion.div variants={itemVariants} className={styles.socialRow}>
                            <button className={styles.socialBtn} type="button" onClick={() => handleOAuthLogin('google')} disabled={isLoading}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                                <span>Google</span>
                            </button>
                            <button className={styles.socialBtn} type="button" onClick={() => handleOAuthLogin('linkedin')} disabled={isLoading}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#0077B5' }}>
                                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                                </svg>
                                <span>LinkedIn</span>
                            </button>
                        </motion.div>

                        <motion.div variants={itemVariants} className={styles.divider}>
                            <span className={styles.dividerLine} />
                            <span className={styles.dividerText}>or</span>
                            <span className={styles.dividerLine} />
                        </motion.div>
                        </>)}

                        <AnimatePresence mode="wait">
                            {reason === 'session_expired' && (
                                <motion.div
                                    key="session-expired"
                                    className={styles.sessionExpiredBanner}
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                >
                                    Your session expired. Please log in again.
                                </motion.div>
                            )}

                            {reason === 'suspended' && (
                                <motion.div
                                    key="suspended"
                                    className={styles.errorMessage}
                                    style={{ marginBottom: '1rem' }}
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                >
                                    Your account has been suspended. Please contact support.
                                </motion.div>
                            )}

                            {error && (
                                <motion.div
                                    key="login-error-banner"
                                    className={styles.errorMessage}
                                    data-testid="login-error"
                                    role="alert"
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                >
                                    <span>{error}</span>
                                    {isEmailUnconfirmed && !showVerification && (
                                        <button
                                            type="button"
                                            onClick={handleResendCode}
                                            disabled={resendCooldown > 0}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: resendCooldown > 0 ? '#94a3b8' : '#3b82f6',
                                                cursor: resendCooldown > 0 ? 'default' : 'pointer',
                                                fontSize: '0.8rem',
                                                fontWeight: 700,
                                                textDecoration: resendCooldown > 0 ? 'none' : 'underline',
                                                marginLeft: '6px',
                                                padding: 0,
                                            }}
                                        >
                                            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend verification code'}
                                        </button>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Inline OTP verification for unverified users */}
                        <AnimatePresence>
                            {showVerification && (
                                <motion.form
                                    onSubmit={handleVerifyFromLogin}
                                    initial={{ opacity: 0, scale: 0.95, height: 0 }}
                                    animate={{ opacity: 1, scale: 1, height: 'auto' }}
                                    exit={{ opacity: 0, scale: 0.95, height: 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <div className={styles.otpCard}>
                                        <div className={styles.otpHeaderIcon}>
                                            <ShieldCheck size={20} />
                                        </div>
                                        <h3 className={styles.otpTitle}>Verify Your Email</h3>
                                        <p className={styles.otpSubtitle}>
                                            Enter the 6-digit code sent to <strong>{email}</strong>
                                        </p>
                                        <div className={styles.otpInputWrap}>
                                            <input
                                                type="text"
                                                className={styles.otpInput}
                                                placeholder="000000"
                                                value={otp}
                                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                                maxLength={6}
                                                disabled={isLoading}
                                                autoComplete="one-time-code"
                                                autoFocus
                                            />
                                        </div>
                                        <div className={styles.otpTimer}>
                                            {timeLeft > 0 ? (
                                                <p>
                                                    Code expires in <span>{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
                                                </p>
                                            ) : (
                                                <p className={styles.otpExpired}>
                                                    Code has expired. Please resend code.
                                                </p>
                                            )}
                                        </div>
                                        <button
                                            type="submit"
                                            className={styles.submitBtn}
                                            disabled={isLoading || otp.length < 6 || timeLeft <= 0}
                                        >
                                            {isLoading ? (
                                                <span className={styles.spinnerWrap}>
                                                    <span className={styles.spinner} />
                                                    Verifying...
                                                </span>
                                            ) : 'Verify & Sign In'}
                                        </button>
                                        <div className={styles.otpResendWrap}>
                                            <button
                                                type="button"
                                                onClick={handleResendCode}
                                                disabled={resendCooldown > 0}
                                                className={styles.otpResendBtn}
                                            >
                                                {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend Code'}
                                            </button>
                                        </div>
                                    </div>
                                </motion.form>
                            )}
                        </AnimatePresence>

                        <form className={styles.form} onSubmit={handleSubmit}>
                            <motion.div variants={itemVariants} className={styles.fieldGroup}>
                                <div className={styles.inputWrap}>
                                    <input
                                        id="email"
                                        type="email"
                                        className={styles.input}
                                        placeholder=" "
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        required
                                        autoComplete="email"
                                    />
                                    <label className={styles.label} htmlFor="email">Email address</label>
                                    <Mail className={styles.inputIcon} size={18} />
                                </div>
                            </motion.div>

                            <motion.div variants={itemVariants} className={styles.fieldGroup}>
                                <div className={styles.labelRow}>
                                    <Link
                                        href={portal === 'admin' ? '/admin/forgot-password' : '/forgot-password'}
                                        className={styles.forgotLink}
                                    >
                                        Forgot password?
                                    </Link>
                                </div>
                                <div className={styles.inputWrap}>
                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        className={styles.input}
                                        placeholder=" "
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        required
                                        autoComplete="current-password"
                                    />
                                    <label className={styles.label} htmlFor="password">Password</label>
                                    <Lock className={styles.inputIcon} size={18} />
                                    <button
                                        type="button"
                                        className={styles.eyeBtn}
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? (
                                            <EyeOff size={18} />
                                        ) : (
                                            <Eye size={18} />
                                        )}
                                    </button>
                                </div>
                            </motion.div>

                            <motion.div variants={itemVariants}>
                                <button
                                    type="submit"
                                    className={styles.submitBtn}
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <span className={styles.spinnerWrap}>
                                            <span className={styles.spinner} />
                                            Signing in...
                                        </span>
                                    ) : (
                                        <span className={styles.submitContent}>
                                            Sign In
                                            <ArrowRight className={styles.submitArrow} size={16} />
                                        </span>
                                    )}
                                </button>
                            </motion.div>
                        </form>

                        {portal !== 'admin' && (
                        <motion.div variants={itemVariants} className={styles.footer}>
                            {portal === 'recruiter' ? (
                                <p>
                                    Hiring for your company?{' '}
                                    <Link href="/signup/recruiter" className={styles.footerLink}>Register your company</Link>
                                </p>
                            ) : (
                                <p>
                                    Don&apos;t have an account?{' '}
                                    <Link href="/signup/candidate" className={styles.footerLink}>Sign up</Link>
                                </p>
                            )}
                            <p style={{ marginTop: '0.6rem' }}>
                                Need to verify your account?{' '}
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        if (!email) {
                                            setError('Please enter your email address above first to verify your account.');
                                            document.getElementById('email')?.focus();
                                            return;
                                        }
                                        setError('');
                                        setIsEmailUnconfirmed(true);
                                        if (resendCooldown <= 0) {
                                            handleResendCode();
                                        } else {
                                            setShowVerification(true);
                                        }
                                    }}
                                    className={styles.footerLink}
                                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}
                                >
                                    Verify email
                                </button>
                            </p>
                        </motion.div>
                        )}

                        <motion.div variants={itemVariants} className={styles.terms}>
                            By signing in, you agree to our{' '}
                            <Link href="/terms" className={styles.termsLink}>Terms of Service</Link> and{' '}
                            <Link href="/privacy" className={styles.termsLink}>Privacy Policy</Link>.
                        </motion.div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<FormSkeleton />}>
            <LoginContent />
        </Suspense>
    );
}
