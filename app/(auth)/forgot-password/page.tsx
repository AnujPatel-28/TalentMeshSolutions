"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { insforge } from '@/lib/insforge';
import { forgotPasswordSchema } from '@/lib/validation/auth';
import styles from './forgot.module.css';

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [step, setStep] = useState<'email' | 'code'>('email');
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');
    const [otpSentAt, setOtpSentAt] = useState<number | null>(null);
    const [timeLeft, setTimeLeft] = useState(120);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            document.title = "Forgot Password | TalentMesh";
        }
    }, []);

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

    const handleResend = async () => {
        setIsLoading(true);
        setError('');
        try {
            const { error: resetError } = await insforge.auth.sendResetPasswordEmail({
                email,
            });

            if (resetError) {
                setError(resetError.message);
                setIsLoading(false);
                return;
            }

            setOtpSentAt(Date.now());
            setTimeLeft(120);
        } catch (err: any) {
            setError(err.message || 'Failed to resend code.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        // 1. Validate email
        const validation = forgotPasswordSchema.safeParse({ email });
        if (!validation.success) {
            setError(validation.error.issues[0].message);
            setIsLoading(false);
            return;
        }

        try {
            // 2. Request reset link
            const { error: resetError } = await insforge.auth.sendResetPasswordEmail({
                email,
            });

            if (resetError) {
                setError(resetError.message);
                setIsLoading(false);
                return;
            }

            setSent(true);
            setStep('code');
            setOtpSentAt(Date.now());
            setTimeLeft(120);
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (timeLeft <= 0) {
            setError('Verification code has expired. Please resend code to get a new one.');
            return;
        }
        setIsLoading(true);
        setError('');

        if (code.length !== 6) {
            setError('Please enter a valid 6-digit code.');
            setIsLoading(false);
            return;
        }

        try {
            const { data, error: verifyError } = await insforge.auth.exchangeResetPasswordToken({
                email,
                code,
            });

            if (verifyError) {
                setError(verifyError.message);
                setIsLoading(false);
                return;
            }

            if (data?.token) {
                router.push(`/reset-password?token=${data.token}&email=${encodeURIComponent(email)}`);
            }
        } catch (err: any) {
            setError(err.message || 'Verification failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.page}>
            {/* Background decorations */}
            <div className={styles.bgGlow1} />
            <div className={styles.bgGlow2} />
            <div className={styles.gridOverlay} />

            <div className={styles.card}>
                {/* Logo */}
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

                {step === 'email' ? (
                    <>
                        <div className={styles.header}>
                            <div className={styles.iconCircle}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary-blue)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </svg>
                            </div>
                            <h1 className={styles.title}>Reset password</h1>
                            <p className={styles.subtitle}>
                                Enter your email and we&apos;ll send a reset link
                            </p>
                        </div>

                        <form className={styles.form} onSubmit={handleSubmit}>
                            {error && <div className={styles.errorAlert}>{error}</div>}
                            
                            <div className={styles.fieldGroup}>
                                <label className={styles.label} htmlFor="reset-email">Email address</label>
                                <div className={styles.inputWrap}>
                                    <svg className={styles.inputIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                        <polyline points="22,6 12,13 2,6" />
                                    </svg>
                                    <input
                                        id="reset-email"
                                        type="email"
                                        className={styles.input}
                                        placeholder="you@company.com"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        required
                                        autoComplete="email"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className={styles.submitBtn}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <span className={styles.spinnerWrap}>
                                        <span className={styles.spinner} />
                                        Sending link...
                                    </span>
                                ) : 'Send Reset Link'}
                            </button>
                        </form>
                    </>
                ) : (
                    <>
                        <div className={styles.successState}>
                            <div className={styles.successIcon}>
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            </div>
                            <h1 className={styles.title}>Check your email</h1>
                            <p className={styles.subtitle}>
                                We&apos;ve sent a 6-digit code to <br/>
                                <strong style={{ color: 'var(--primary-blue)' }}>{email}</strong>
                            </p>
                        </div>

                        <form className={styles.form} onSubmit={handleVerifyCode}>
                            {error && <div className={styles.errorAlert}>{error}</div>}
                            
                            <div className={styles.fieldGroup}>
                                <label className={styles.label} htmlFor="reset-code">Verification Code</label>
                                <div className={styles.inputWrap}>
                                    <svg className={styles.inputIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                    </svg>
                                    <input
                                        id="reset-code"
                                        type="text"
                                        className={styles.input}
                                        placeholder="Enter 6-digit code"
                                        value={code}
                                        onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        required
                                        maxLength={6}
                                        pattern="[0-9]*"
                                        inputMode="numeric"
                                    />
                                </div>
                            </div>

                            <div style={{ textAlign: 'center', marginTop: '0.5rem', marginBottom: '1rem' }}>
                                {timeLeft > 0 ? (
                                    <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                        Code expires in <span style={{ fontWeight: 600, color: 'var(--primary-blue)' }}>{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
                                    </p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                                        <p style={{ fontSize: '0.85rem', color: '#ef4444', fontWeight: 600 }}>
                                            Code has expired.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={handleResend}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: 'var(--primary-blue)',
                                                textDecoration: 'underline',
                                                fontSize: '0.85rem',
                                                cursor: 'pointer',
                                                fontWeight: 600
                                            }}
                                        >
                                            Resend Code
                                        </button>
                                    </div>
                                )}
                            </div>

                            <button
                                type="submit"
                                className={styles.submitBtn}
                                disabled={isLoading || code.length !== 6 || timeLeft <= 0}
                            >
                                {isLoading ? (
                                    <span className={styles.spinnerWrap}>
                                        <span className={styles.spinner} />
                                        Verifying...
                                    </span>
                                ) : 'Verify Code'}
                            </button>

                            <button 
                                type="button" 
                                className={styles.backLink} 
                                style={{ background: 'none', border: 'none', padding: 0, marginTop: '0.5rem', fontSize: '0.82rem' }}
                                onClick={() => setStep('email')}
                            >
                                Try a different email
                            </button>
                        </form>
                    </>
                )}

                <p className={styles.backLine}>
                    Remembered it?{' '}
                    <Link href="/login" className={styles.backLink}>
                        Sign in
                    </Link>
                </p>
            </div>

            {/* Bottom terms */}
            <p className={styles.terms}>
                By using our service, you agree to our{' '}
                <Link href="/terms" className={styles.termsLink}>Terms</Link>
                {' '}&{' '}
                <Link href="/privacy" className={styles.termsLink}>Privacy Policy</Link>
            </p>
        </div>
    );
}
