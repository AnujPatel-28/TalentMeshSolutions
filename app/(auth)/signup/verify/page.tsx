"use client";
import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { insforge } from '@/lib/insforge';
import styles from '../signup.module.css';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowLeft, CheckCircle, Clock } from 'lucide-react';

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

function VerifyContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const email = searchParams.get('email') || '';
    const role = searchParams.get('role') || 'candidate';
    const name = searchParams.get('name') || '';

    const [otp, setOtp] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [resendSuccess, setResendSuccess] = useState(false);
    const [otpSentAt, setOtpSentAt] = useState<number | null>(null);
    const [timeLeft, setTimeLeft] = useState(120);
    const [isFocused, setIsFocused] = useState(false);
    const { login } = useAuth();

    useEffect(() => {
        if (typeof window !== 'undefined') {
            document.title = "Verify Email | TalentMesh";
        }
    }, []);

    useEffect(() => {
        setOtpSentAt(Date.now());
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
        setResendSuccess(false);
        try {
            await insforge.auth.resendVerificationEmail({ email });
            setOtpSentAt(Date.now());
            setTimeLeft(120);
            setResendSuccess(true);
            setTimeout(() => setResendSuccess(false), 4000);
        } catch (err: any) {
            setError(err.message || 'Failed to resend code.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (timeLeft <= 0) {
            setError('Verification code has expired. Please resend code to get a new one.');
            return;
        }
        setIsLoading(true);
        setError('');

        try {
            const response = await fetch('/api/auth/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp })
            });

            const result = await response.json();

            if (result.error || !response.ok) {
                throw new Error(result.error || 'Invalid or expired code.');
            }

            const { data } = result;
            const userId = data.user.id;
            const actualToken = data.accessToken || (data as any).session?.access_token || '';

            // Log activity
            await insforge.database.from('activity').insert([{
                user_id: userId,
                description: `Verified email and joined as ${role}`,
                type: 'signup_verify'
            }]);

            await login(actualToken, {
                id: userId,
                email,
                name,
                role: role as any,
                avatar_url: null
            });

            if (role === 'candidate') {
                window.location.assign('/onboarding/candidate');
            } else {
                window.location.assign('/onboarding/recruiter/setup');
            }
        } catch (err: any) {
            setError(err.message || 'Verification failed. Please try again.');
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.page} style={{ flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <div className={styles.pageOverlay} />

            {/* Drifting Mesh Gradient Blobs */}
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
                                width={140}
                                height={40}
                                unoptimized
                                priority
                                className={styles.logoImg}
                                style={{ height: 'auto' }}
                            />
                        </Link>
                    </motion.div>

                    <form className={styles.form} onSubmit={handleVerify} style={{ width: '100%' }}>
                        <motion.div variants={itemVariants} style={{ textAlign: 'center', marginTop: '0.25rem', width: '100%' }}>
                            <div className={styles.verifyHeaderIcon}>
                                <Mail width={28} height={28} aria-hidden="true" />
                            </div>
                            <h1 className={styles.title} style={{ marginBottom: '0.35rem' }}>Check your email</h1>
                            <p className={styles.subtitle} style={{ textWrap: 'balance' }}>
                                We sent a 6-digit verification code to <span className={styles.emailHighlight}>{email || 'your email'}</span>
                            </p>
                        </motion.div>

                        <AnimatePresence mode="wait">
                            {error && (
                                <motion.div
                                    key="verify-error"
                                    id="otp-error"
                                    role="alert"
                                    aria-live="assertive"
                                    className="text-red-500 text-xs bg-red-50 p-2.5 rounded-xl text-center font-medium border border-red-100"
                                    style={{ width: '100%' }}
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                >
                                    {error}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <motion.div variants={itemVariants} className={styles.fieldGroup} style={{ width: '100%' }}>
                            <label htmlFor="otp-input" className={styles.label} style={{ textAlign: 'center', display: 'block' }}>
                                Verification Code
                            </label>
                            <div className={styles.otpContainer}>
                                <input
                                    id="otp-input"
                                    type="text"
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    pattern="[0-9]*"
                                    maxLength={6}
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    onFocus={() => setIsFocused(true)}
                                    onBlur={() => setIsFocused(false)}
                                    className={styles.otpInputHidden}
                                    required
                                    aria-invalid={Boolean(error)}
                                    aria-describedby={error ? "otp-error" : undefined}
                                    aria-label="6-digit verification code"
                                />
                                <div className={styles.otpSlots} aria-hidden="true">
                                    {[0, 1, 2, 3, 4, 5].map((index) => {
                                        const char = otp[index] || '';
                                        const isCurrent = isFocused && (index === otp.length || (index === 5 && otp.length === 6));
                                        const isFilled = Boolean(char);
                                        return (
                                            <div
                                                key={index}
                                                className={`${styles.otpSlot} ${isFilled ? styles.otpSlotFilled : ''} ${isCurrent ? styles.otpSlotActive : ''}`}
                                            >
                                                {char}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </motion.div>

                        <motion.div variants={itemVariants} className={styles.timerWrapper}>
                            {timeLeft > 0 ? (
                                <p className={styles.timerText} role="status" aria-live="polite">
                                    <Clock width={14} height={14} aria-hidden="true" style={{ color: '#2563eb' }} />
                                    Code expires in{' '}
                                    <span className={styles.timerValue}>
                                        {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                                    </span>
                                </p>
                            ) : (
                                <p className={styles.timerExpired} role="status" aria-live="polite">
                                    Code has expired. Resend code to receive a new one.
                                </p>
                            )}

                            {resendSuccess && (
                                <div className={styles.resendSuccessBadge} role="status" aria-live="polite">
                                    <CheckCircle width={16} height={16} aria-hidden="true" />
                                    New code sent!
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={handleResend}
                                disabled={isLoading}
                                className={styles.resendBtn}
                                aria-label="Resend verification code to your email"
                            >
                                Resend code
                            </button>
                        </motion.div>

                        <motion.div variants={itemVariants} style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                            <button
                                type="submit"
                                className={styles.submitBtn}
                                style={{ width: '82%', maxWidth: '320px' }}
                                disabled={isLoading || otp.length < 6 || timeLeft <= 0}
                                aria-busy={isLoading}
                            >
                                {isLoading ? (
                                    <span className={styles.spinnerWrap}>
                                        <span className={styles.spinner} aria-hidden="true" />
                                        Verifying...
                                    </span>
                                ) : (
                                    'Verify & Continue'
                                )}
                            </button>
                        </motion.div>

                        <motion.div variants={itemVariants} className={styles.footerNav}>
                            <Link href="/login" className={styles.backToLogin}>
                                <ArrowLeft width={14} height={14} aria-hidden="true" />
                                Back to sign in
                            </Link>
                        </motion.div>
                    </form>
                </motion.div>
            </div>

            {/* Bottom terms */}
            <p className={styles.terms}>
                Protected by TalentMesh ·{' '}
                <a href="/terms" className={styles.termsLink}>Terms</a>
                {' '}&{' '}
                <a href="/privacy" className={styles.termsLink}>Privacy</a>
            </p>
        </div>
    );
}

export default function VerifyPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <VerifyContent />
        </Suspense>
    );
}
