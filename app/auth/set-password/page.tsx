"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { insforge, getSession } from '@/lib/insforge';
import { useAuth } from '@/lib/auth/AuthContext';
import styles from './set-password.module.css';
import { z } from 'zod';
import { PASSWORD_MIN_LENGTH, validateNewPassword } from '@/lib/validation/auth';

const passwordSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    password: z.string()
        .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number')
        .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

export default function SetPasswordPage() {
    const router = useRouter();
    const { user, refreshUser } = useAuth();

    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [sessionStatus, setSessionStatus] = useState<'checking' | 'active' | 'expired'>('checking');

    // 1. Initial Session Check (Invite creates a session)
    useEffect(() => {
        const checkSession = async () => {
            const sessionData = await getSession();
            const sessionUser = sessionData?.user;

            if (!sessionUser) {
                setSessionStatus('expired');
                setIsLoading(false);
                return;
            }

            setSessionStatus('active');
            // Try to get name from metadata
            const metadata = (sessionUser.metadata || {}) as any;
            setName(metadata.name || sessionUser.email?.split('@')[0] || '');
            setIsLoading(false);
        };
        checkSession();
    }, []);

    // 2. Password Strength Logic
    const getPasswordStrength = (pwd: string) => {
        if (pwd.length === 0) return { label: '', color: '#ddd', width: '0%' };
        if (pwd.length < PASSWORD_MIN_LENGTH) return { label: 'Too short', color: '#ef4444', width: '33%' };

        const hasUpper = /[A-Z]/.test(pwd);
        const hasNumber = /[0-9]/.test(pwd);

        if (validateNewPassword(pwd) === null) return { label: 'Strong', color: '#22c55e', width: '100%' };
        if (hasUpper || hasNumber) return { label: 'Medium', color: '#f59e0b', width: '66%' };

        return { label: 'Weak', color: '#f97316', width: '40%' };
    };

    const strength = getPasswordStrength(password);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const result = passwordSchema.safeParse({ name, password, confirmPassword });
        if (!result.success) {
            setError(result.error.issues[0].message);
            return;
        }

        setIsSubmitting(true);

        try {
            const sessionData = await getSession();
            const accessToken = sessionData?.accessToken;
            const sessionUser = sessionData?.user;
            
            if (!sessionUser || !accessToken) {
                throw new Error("Your session has expired or is invalid. Please try clicking the invite link again.");
            }

            // A. Update Auth User via REST API (since SDK doesn't expose updateUser)
            const response = await fetch(`${process.env.NEXT_PUBLIC_INSFORGE_URL}/auth/v1/user`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'apikey': process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    password,
                    data: { name, password_set_at: new Date().toISOString() }
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.msg || errorData.error_description || errorData.message || 'Failed to update password');
            }

            // B. Update Database Profile
            const { error: profileError } = await insforge.database
                .from('profiles')
                .update({
                    name,
                    password_set_at: new Date().toISOString()
                })
                .eq('id', user?.id || sessionUser.id);

            if (profileError) throw profileError;

            // C. Success
            await refreshUser();
            router.push('/auth/setup-mfa');

        } catch (err: any) {
            setError(err.message || 'Failed to update password');
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.spinner} />
                <p>Verifying invitation...</p>
            </div>
        );
    }

    if (sessionStatus === 'expired') {
        return (
            <div className={styles.page}>
                <div className={styles.card}>
                    <div className={styles.header}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📧</div>
                        <h1 className={styles.title}>Invite Expired</h1>
                        <p className={styles.subtitle}>
                            This invitation link has expired or is invalid.
                            Please contact your administrator for a new invite.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <div className={styles.card}>
                <Link href="/" className={styles.logoWrap}>
                    <Image
                        src="/TalentMesh_page-0002-removebg-preview.png"
                        alt="TalentMesh"
                        width={180}
                        height={50}
                        unoptimized
                        priority
                    />
                </Link>

                <div className={styles.header}>
                    <h1 className={styles.title}>Welcome to TalentMesh Admin</h1>
                    <p className={styles.subtitle}>
                        You&apos;ve been invited as a Super Admin. Set your password to get started.
                    </p>
                </div>

                {error && <div className={styles.errorMessage}>{error}</div>}

                <form className={styles.form} onSubmit={handleSubmit}>
                    <div className={styles.fieldGroup}>
                        <label className={styles.label}>Full Name</label>
                        <input
                            type="text"
                            className={styles.input}
                            value={name}
                            onChange={e => setName(e.target.value)}
                            required
                        />
                    </div>

                    <div className={styles.fieldGroup}>
                        <label className={styles.label}>New Password</label>
                        <input
                            type="password"
                            className={styles.input}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            placeholder="Min 8 chars, 1 uppercase, 1 number"
                        />
                        <div className={styles.strengthBarWrap}>
                            <div
                                className={styles.strengthBar}
                                style={{ width: strength.width, backgroundColor: strength.color }}
                            />
                        </div>
                        {password && <span className={styles.strengthLabel}>{strength.label}</span>}
                    </div>

                    <div className={styles.fieldGroup}>
                        <label className={styles.label}>Confirm Password</label>
                        <input
                            type="password"
                            className={styles.input}
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className={styles.submitBtn}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Setting up account...' : 'Set Password'}
                    </button>
                </form>
            </div>
        </div>
    );
}
