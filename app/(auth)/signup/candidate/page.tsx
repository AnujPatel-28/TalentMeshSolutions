"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { UserRole } from '@/types/auth';
import { insforge, directInsforge } from '@/lib/insforge';
import { signupSchema, PASSWORD_RULE_TEXT } from '@/lib/validation/auth';
import styles from '../signup.module.css';
import { Linkedin, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import HeroBg from '@/components/ui/HeroBg/HeroBg';

export default function CandidateSignupPage() {
    React.useEffect(() => {
        if (typeof window !== 'undefined') {
            document.title = "Candidate Sign Up | TalentMesh";
        }
    }, []);

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        agreeTerms: false,
        agreeProcessing: false,
        agreeVisible: false,
        agreeMarketing: false,
        agreeAge: false,
    });
    const [showPassword, setShowPassword] = useState(false);
    const [isPasswordFocused, setIsPasswordFocused] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [error, setError] = useState('');
    const router = useRouter();
    const { login } = useAuth();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setFieldErrors({});

        if (formData.password !== formData.confirmPassword) {
            setFieldErrors({ confirmPassword: 'Passwords do not match' });
            setIsLoading(false);
            return;
        }

        const fullName = `${formData.firstName} ${formData.lastName}`.trim();

        const consents = {
            terms_of_service: formData.agreeTerms,
            account_processing: formData.agreeProcessing,
            profile_visible_to_recruiters: formData.agreeVisible,
            marketing_email: formData.agreeMarketing,
            age_18_plus: formData.agreeAge,
        };

        const validation = signupSchema.safeParse({
            name: fullName,
            email: formData.email,
            password: formData.password,
            role: 'candidate',
            consents,
        });

        if (!validation.success) {
            const errors: Record<string, string> = {};
            validation.error.issues.forEach(issue => {
                const path = issue.path[0]?.toString();
                if (path === 'name') errors.firstName = issue.message;
                else if (path) errors[path] = issue.message;
            });
            setFieldErrors(errors);
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password,
                    role: 'candidate',
                    name: fullName,
                    consents,
                })
            });

            const result = await response.json();

            if (result.error || !response.ok) {
                setError(result.error || 'Failed to sign up');
                setIsLoading(false);
                return;
            }

            if (result.requireEmailVerification) {
                router.push(`/signup/verify?email=${encodeURIComponent(formData.email)}&role=candidate&name=${encodeURIComponent(fullName)}`);
                return;
            }

            window.location.assign('/onboarding/candidate');
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred. Please try again.');
            setIsLoading(false);
        }
    };

    const handleSocialSignup = async (provider: 'google' | 'linkedin') => {
        try {
            setError('');
            setIsLoading(true);

            // Generate random state parameter to prevent login CSRF
            const randomState = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            if (typeof window !== 'undefined') {
                window.sessionStorage.setItem(`oauth_state_${provider}`, randomState);
            }

            const siteUrl = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_SITE_URL || '');
            const { data, error: authError } = await directInsforge.auth.signInWithOAuth({
                provider,
                redirectTo: `${siteUrl}/auth/callback?role=candidate&state=${encodeURIComponent(randomState)}`,
                skipBrowserRedirect: true,
                ...(provider === 'google' ? { additionalParams: { prompt: 'select_account' } } : {}),
            });
            // Save the PKCE code_verifier returned by the SDK so the callback page can
            // complete the PKCE exchange. directInsforge (isServerMode:true) skips auto-save.
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
            setError(`Failed to initiate ${provider} signup. Please try again.`);
            setIsLoading(false);
        }
    };

    const p = formData.password;
    const strength = !p ? 0 : [p.length >= 8, /[A-Z]/.test(p), /[0-9]/.test(p), /[^A-Za-z0-9]/.test(p)].filter(Boolean).length;
    const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength];
    const strengthColor = ['', '#ef4444', '#f59e0b', '#22c55e', '#10b981'][strength];

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
                            Create your candidate profile to explore new opportunities and grow your career with TalentMesh.
                        </p>
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
                    </div>
                </div>
            </div>

            {/* Right Panel: Form Side (55% width) */}
            <div className={styles.rightPanel}>
                <div className={styles.blobContainer}>
                    <div className={`${styles.glowBlob} ${styles.blob1}`} />
                    <div className={`${styles.glowBlob} ${styles.blob2}`} />
                </div>

                <div className={styles.cardWrapper}>
                    <motion.div
                        className={styles.card}
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 100, damping: 15 }}
                    >
                <Link 
                    href="/signup" 
                    className={styles.backBtn} 
                    aria-label="Back to role selection"
                    style={{ position: 'absolute', top: '0.8rem', left: '0.8rem', padding: '0.5rem', minWidth: '44px', minHeight: '44px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent' }}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
                    </svg>
                </Link>

                <Link href="/" className={styles.logoWrap}>
                    <Image src="/TalentMesh_page-0002-removebg-preview.png" alt="TalentMesh" width={120} height={35} unoptimized className={styles.logoImg} />
                </Link>

                <div className={styles.header}>
                    <h1 className={styles.title}>Join as Candidate</h1>
                    <p className={styles.subtitle}>Find your next opportunity</p>
                </div>

                <div className={styles.socialAuth}>
                    <button 
                        onClick={() => handleSocialSignup('google')} 
                        className={styles.socialBtn} 
                        disabled={isLoading}
                        aria-label="Sign up with Google"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        <span>Google</span>
                    </button>
                    <button 
                        onClick={() => handleSocialSignup('linkedin')} 
                        className={styles.socialBtn} 
                        disabled={isLoading}
                        aria-label="Sign up with LinkedIn"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#0077b5" aria-hidden="true">
                            <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                        </svg>
                        <span>LinkedIn</span>
                    </button>
                </div>

                <div className={styles.divider}>
                    <div className={styles.dividerLine} />
                    <span className={styles.dividerText}>or continue with email</span>
                    <div className={styles.dividerLine} />
                </div>

                <form className={styles.form} onSubmit={handleSubmit}>
                    {error && <div className="text-red-500 text-xs bg-red-50 p-2 rounded-lg text-center mb-2" role="alert">{error}</div>}

                    <div className={styles.nameRow}>
                        <div className={styles.fieldGroup}>
                            <label className={styles.label} htmlFor="firstName">First Name</label>
                            <input 
                                id="firstName"
                                name="firstName" 
                                type="text" 
                                className={styles.input} 
                                placeholder="e.g. John" 
                                value={formData.firstName} 
                                onChange={handleChange} 
                                required 
                                aria-invalid={!!fieldErrors.firstName}
                                aria-describedby={fieldErrors.firstName ? "firstName-error" : undefined}
                            />
                            {fieldErrors.firstName && <span id="firstName-error" className="text-[10px] text-red-500" role="alert">{fieldErrors.firstName}</span>}
                        </div>
                        <div className={styles.fieldGroup}>
                            <label className={styles.label} htmlFor="lastName">Last Name</label>
                            <input 
                                id="lastName"
                                name="lastName" 
                                type="text" 
                                className={styles.input} 
                                placeholder="e.g. Doe" 
                                value={formData.lastName} 
                                onChange={handleChange} 
                                required 
                            />
                        </div>
                    </div>

                    <div className={styles.fieldGroup}>
                        <label className={styles.label} htmlFor="email">Email Address</label>
                        <input 
                            id="email"
                            name="email" 
                            type="email" 
                            className={styles.input} 
                            placeholder="name@example.com" 
                            value={formData.email} 
                            onChange={handleChange} 
                            required 
                            aria-invalid={!!fieldErrors.email}
                            aria-describedby={fieldErrors.email ? "email-error" : undefined}
                        />
                        {fieldErrors.email && <span id="email-error" className="text-[10px] text-red-500" role="alert">{fieldErrors.email}</span>}
                    </div>

                    <div className={styles.fieldGroup}>
                        <label className={styles.label} htmlFor="password">Password</label>
                        <div className={styles.inputWrap}>
                            <input
                                id="password"
                                name="password" 
                                type={showPassword ? 'text' : 'password'}
                                className={styles.input} 
                                placeholder="Min. 12 characters"
                                value={formData.password} 
                                onChange={handleChange} 
                                onFocus={() => setIsPasswordFocused(true)}
                                onBlur={() => setIsPasswordFocused(false)}
                                required
                                aria-invalid={!!fieldErrors.password}
                                aria-describedby={fieldErrors.password ? "password-error" : undefined}
                            />
                            <button 
                                type="button" 
                                className={styles.eyeBtn} 
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                            </button>

                            <AnimatePresence>
                                {isPasswordFocused && !fieldErrors.password && (
                                    <motion.div
                                        className={styles.passwordPopover}
                                        initial={{ opacity: 0, y: 4, scale: 0.96 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 4, scale: 0.96 }}
                                        transition={{ duration: 0.15 }}
                                    >
                                        <div className={styles.popoverArrow} />
                                        <span>{PASSWORD_RULE_TEXT}</span>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        {fieldErrors.password && <span id="password-error" className="text-[10px] text-red-500" role="alert">{fieldErrors.password}</span>}
                        {formData.password && (
                            <div className={styles.strengthBar} aria-live="polite">
                                <div className={styles.strengthTrack}>
                                    <motion.div
                                        className={styles.strengthFill}
                                        initial={{ width: '0%' }}
                                        animate={{
                                            width: `${(strength / 4) * 100}%`,
                                            backgroundColor: strengthColor
                                        }}
                                        transition={{ duration: 0.3, ease: "easeOut" }}
                                    />
                                </div>
                                <AnimatePresence mode="wait">
                                    <motion.span
                                        key={strengthLabel}
                                        className={styles.strengthLabel}
                                        style={{ color: strengthColor }}
                                        initial={{ opacity: 0, y: -2 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 2 }}
                                        transition={{ duration: 0.15 }}
                                    >
                                        {strengthLabel}
                                    </motion.span>
                                </AnimatePresence>
                            </div>
                        )}
                    </div>

                    <div className={styles.fieldGroup}>
                        <label className={styles.label} htmlFor="confirmPassword">Confirm Password</label>
                        <input 
                            id="confirmPassword"
                            name="confirmPassword" 
                            type={showPassword ? 'text' : 'password'} 
                            className={styles.input} 
                            placeholder="Repeat password" 
                            value={formData.confirmPassword} 
                            onChange={handleChange} 
                            required 
                            aria-invalid={!!fieldErrors.confirmPassword}
                            aria-describedby={fieldErrors.confirmPassword ? "confirmPassword-error" : undefined}
                        />
                        {fieldErrors.confirmPassword && <span id="confirmPassword-error" className="text-[10px] text-red-500" role="alert">{fieldErrors.confirmPassword}</span>}
                    </div>

                    <div className={styles.consentBox}>
                        <label htmlFor="agreeTerms" className={styles.checkboxLabel}>
                            <input type="checkbox" name="agreeTerms" id="agreeTerms" checked={formData.agreeTerms} onChange={handleChange} required className={styles.hiddenCheckbox} />
                            <span className={`${styles.checkboxCustom} ${formData.agreeTerms ? styles.checkboxChecked : ''}`}>
                                {formData.agreeTerms && (
                                    <motion.svg
                                        width="10"
                                        height="8"
                                        viewBox="0 0 10 8"
                                        fill="none"
                                        initial={{ pathLength: 0, opacity: 0 }}
                                        animate={{ pathLength: 1, opacity: 1 }}
                                        transition={{ duration: 0.2, ease: "easeOut" }}
                                    >
                                        <motion.path
                                            d="M1 4L3.5 6.5L9 1"
                                            stroke="white"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </motion.svg>
                                )}
                            </span>
                            <span className={styles.checkboxText}>
                                I agree to the <Link href="/terms" target="_blank" className={styles.inlineLink}>Terms of Service</Link>
                            </span>
                        </label>

                        <label htmlFor="agreeProcessing" className={styles.checkboxLabel}>
                            <input type="checkbox" name="agreeProcessing" id="agreeProcessing" checked={formData.agreeProcessing} onChange={handleChange} required className={styles.hiddenCheckbox} />
                            <span className={`${styles.checkboxCustom} ${formData.agreeProcessing ? styles.checkboxChecked : ''}`}>
                                {formData.agreeProcessing && (
                                    <motion.svg
                                        width="10"
                                        height="8"
                                        viewBox="0 0 10 8"
                                        fill="none"
                                        initial={{ pathLength: 0, opacity: 0 }}
                                        animate={{ pathLength: 1, opacity: 1 }}
                                        transition={{ duration: 0.2, ease: "easeOut" }}
                                    >
                                        <motion.path
                                            d="M1 4L3.5 6.5L9 1"
                                            stroke="white"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </motion.svg>
                                )}
                            </span>
                            <span className={styles.checkboxText}>
                                I consent to TalentMesh processing my personal data to create and operate my account, as described in the <Link href="/privacy" target="_blank" className={styles.inlineLink}>Privacy Policy</Link>
                            </span>
                        </label>

                        <label htmlFor="agreeVisible" className={styles.checkboxLabel}>
                            <input type="checkbox" name="agreeVisible" id="agreeVisible" checked={formData.agreeVisible} onChange={handleChange} required className={styles.hiddenCheckbox} />
                            <span className={`${styles.checkboxCustom} ${formData.agreeVisible ? styles.checkboxChecked : ''}`}>
                                {formData.agreeVisible && (
                                    <motion.svg
                                        width="10"
                                        height="8"
                                        viewBox="0 0 10 8"
                                        fill="none"
                                        initial={{ pathLength: 0, opacity: 0 }}
                                        animate={{ pathLength: 1, opacity: 1 }}
                                        transition={{ duration: 0.2, ease: "easeOut" }}
                                    >
                                        <motion.path
                                            d="M1 4L3.5 6.5L9 1"
                                            stroke="white"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </motion.svg>
                                )}
                            </span>
                            <span className={styles.checkboxText}>
                                I consent to my candidate profile being visible to recruiters on TalentMesh
                            </span>
                        </label>

                        <label htmlFor="agreeAge" className={styles.checkboxLabel}>
                            <input type="checkbox" name="agreeAge" id="agreeAge" checked={formData.agreeAge} onChange={handleChange} required className={styles.hiddenCheckbox} />
                            <span className={`${styles.checkboxCustom} ${formData.agreeAge ? styles.checkboxChecked : ''}`}>
                                {formData.agreeAge && (
                                    <motion.svg
                                        width="10"
                                        height="8"
                                        viewBox="0 0 10 8"
                                        fill="none"
                                        initial={{ pathLength: 0, opacity: 0 }}
                                        animate={{ pathLength: 1, opacity: 1 }}
                                        transition={{ duration: 0.2, ease: "easeOut" }}
                                    >
                                        <motion.path
                                            d="M1 4L3.5 6.5L9 1"
                                            stroke="white"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </motion.svg>
                                )}
                            </span>
                            <span className={styles.checkboxText}>
                                I confirm that I am 18 years of age or older
                            </span>
                        </label>

                        <label htmlFor="agreeMarketing" className={styles.checkboxLabel}>
                            <input type="checkbox" name="agreeMarketing" id="agreeMarketing" checked={formData.agreeMarketing} onChange={handleChange} className={styles.hiddenCheckbox} />
                            <span className={`${styles.checkboxCustom} ${formData.agreeMarketing ? styles.checkboxChecked : ''}`}>
                                {formData.agreeMarketing && (
                                    <motion.svg
                                        width="10"
                                        height="8"
                                        viewBox="0 0 10 8"
                                        fill="none"
                                        initial={{ pathLength: 0, opacity: 0 }}
                                        animate={{ pathLength: 1, opacity: 1 }}
                                        transition={{ duration: 0.2, ease: "easeOut" }}
                                    >
                                        <motion.path
                                            d="M1 4L3.5 6.5L9 1"
                                            stroke="white"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </motion.svg>
                                )}
                            </span>
                            <span className={styles.checkboxText}>
                                I would like to receive marketing and product update emails from TalentMesh (optional)
                            </span>
                        </label>
                    </div>

                    {fieldErrors.consents && <span className="text-[10px] text-red-500" role="alert">{fieldErrors.consents}</span>}

                    <button
                        type="submit"
                        className={styles.submitBtn}
                        disabled={isLoading || !formData.agreeTerms || !formData.agreeProcessing || !formData.agreeVisible || !formData.agreeAge}
                    >
                        <AnimatePresence mode="wait" initial={false}>
                            {isLoading ? (
                                <motion.span
                                    key="loading"
                                    className={styles.spinnerWrap}
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -6 }}
                                    transition={{ duration: 0.15 }}
                                >
                                    <span className={styles.spinner} aria-hidden="true" />
                                    Creating account...
                                </motion.span>
                            ) : (
                                <motion.span
                                    key="idle"
                                    className={styles.btnContent}
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -6 }}
                                    transition={{ duration: 0.15 }}
                                >
                                    Create account
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </button>
                </form>

                <div className="text-center text-xs text-slate-500 mt-2">
                    Already have an account?{' '}
                    <Link href="/login" className="font-semibold text-blue-600 hover:underline">
                        Sign in
                    </Link>
                </div>
            </motion.div>
        </div>
    </div>
</div>
);
}

