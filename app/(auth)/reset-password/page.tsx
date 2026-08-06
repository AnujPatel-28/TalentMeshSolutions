"use client";
import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Eye, EyeOff, Check, X } from 'lucide-react';
import { insforge } from '@/lib/insforge';
import { validateResetPassword } from '@/lib/validation/auth';
import styles from '../forgot-password/forgot.module.css';

function ResetPasswordContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const email = searchParams.get('email');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    // Real-time criteria checks
    const isMinLength = password.length >= 12;
    const hasNumOrSpecial = /[0-9!@#$%^&*()]/.test(password);
    const isMatching = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;

    useEffect(() => {
        if (typeof window !== 'undefined') {
            document.title = "Reset Password | TalentMesh";
        }
    }, []);

    useEffect(() => {
        if (!token) {
            setError('Invalid or missing reset token. Please try again from the forgot password page.');
        }
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        if (!token) {
            setError('Missing reset token.');
            setIsLoading(false);
            return;
        }

        // 1. Validate
        const validation = validateResetPassword({ password, confirmPassword });
        if (!validation.success) {
            const firstError = Object.values(validation.errors || {})[0];
            setError(firstError as string || 'Invalid input.');
            setIsLoading(false);
            return;
        }

        try {
            // 2. Call SDK
            const { error: resetError } = await insforge.auth.resetPassword({
                newPassword: password,
                otp: token,
            });

            if (resetError) {
                setError(resetError.message);
                setIsLoading(false);
                return;
            }

            setSuccess(true);
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.card}>
            <Link href="/" className={styles.logoWrap}>
                <Image
                    src="/TalentMesh_page-0002-removebg-preview.png"
                    alt="TalentMesh"
                    width={150}
                    height={42}
                    unoptimized
                    className={styles.logoImg}
                />
            </Link>

            {!success ? (
                <>
                    <div className={styles.header}>
                        <div className={styles.iconCircle}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary-blue)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3y-3-3" />
                                <circle cx="11" cy="13" r="3" fill="var(--primary-blue)" opacity="0.2" />
                                <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" stroke="var(--primary-blue)" strokeWidth="1.5" />
                            </svg>
                        </div>
                        <h1 className={styles.title}>New password</h1>
                        <p className={styles.subtitle}>
                            Set your new password for <br/>
                            <strong style={{ color: 'var(--primary-blue)' }}>{email || 'your account'}</strong>
                        </p>
                    </div>

                    <form className={styles.form} onSubmit={handleSubmit}>
                        {error && (
                            <div className={styles.errorAlert} id="reset-error" role="alert">
                                {error}
                            </div>
                        )}
                        
                        <div className={styles.fieldGroup}>
                            <label className={styles.label} htmlFor="new-password">New Password</label>
                            <div className={styles.inputWrap}>
                                <svg className={styles.inputIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </svg>
                                <input
                                    id="new-password"
                                    type={showPassword ? 'text' : 'password'}
                                    className={styles.input}
                                    placeholder="Min. 12 characters"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    autoComplete="new-password"
                                    aria-invalid={!!error}
                                    aria-describedby={error ? "reset-error" : undefined}
                                />
                                <button
                                    type="button"
                                    className={styles.eyeBtn}
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? "Hide new password" : "Show new password"}
                                >
                                    {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                                </button>
                            </div>
                        </div>

                        <div className={styles.fieldGroup}>
                            <label className={styles.label} htmlFor="confirm-password">Confirm Password</label>
                            <div className={styles.inputWrap}>
                                <svg className={styles.inputIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </svg>
                                <input
                                    id="confirm-password"
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    className={styles.input}
                                    placeholder="Repeat your password"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    required
                                    autoComplete="new-password"
                                    aria-invalid={!!error}
                                    aria-describedby={error ? "reset-error" : undefined}
                                />
                                <button
                                    type="button"
                                    className={styles.eyeBtn}
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                                >
                                    {showConfirmPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                                </button>
                            </div>
                        </div>

                        {/* Live Criteria Checklist */}
                        {password.length > 0 && (
                            <div className={styles.checklist} aria-live="polite">
                                <div className={`${styles.checkItem} ${isMinLength ? styles.checkItemValid : ''}`}>
                                    {isMinLength ? <Check size={14} /> : <X size={14} />}
                                    <span>At least 12 characters</span>
                                </div>
                                <div className={`${styles.checkItem} ${hasNumOrSpecial ? styles.checkItemValid : ''}`}>
                                    {hasNumOrSpecial ? <Check size={14} /> : <X size={14} />}
                                    <span>Contains a number or special character</span>
                                </div>
                                {confirmPassword.length > 0 && (
                                    <div className={`${styles.checkItem} ${isMatching ? styles.checkItemValid : ''}`}>
                                        {isMatching ? <Check size={14} /> : <X size={14} />}
                                        <span>Passwords match</span>
                                    </div>
                                )}
                            </div>
                        )}

                        <button
                            type="submit"
                            className={styles.submitBtn}
                            disabled={isLoading || !token}
                        >
                            {isLoading ? (
                                <span className={styles.spinnerWrap}>
                                    <span className={styles.spinner} />
                                    Updating...
                                </span>
                            ) : 'Reset Password'}
                        </button>
                    </form>
                </>
            ) : (
                <div className={styles.successState}>
                    <div className={styles.successIcon}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                    </div>
                    <h1 className={styles.title}>Password update successful</h1>
                    <p className={styles.subtitle}>
                        Your password has been changed successfully. <br/>
                        You can now sign in with your new password.
                    </p>
                    <Link href="/login" className={`${styles.submitBtn} ${styles.successLink}`}>
                        Go to Sign In
                    </Link>
                </div>
            )}

            <p className={styles.backLine}>
                Back to{' '}
                <Link href="/login" className={styles.backLink}>
                    Sign in
                </Link>
            </p>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <div className={styles.page}>
            <div className={styles.bgGlow1} />
            <div className={styles.bgGlow2} />
            <div className={styles.gridOverlay} />

            <Suspense fallback={
                <div className={styles.card}>
                    <p style={{ color: '#6b6b8a', textAlign: 'center' }}>Loading...</p>
                </div>
            }>
                <ResetPasswordContent />
            </Suspense>
        </div>
    );
}
