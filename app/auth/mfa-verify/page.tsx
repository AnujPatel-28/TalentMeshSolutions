"use client";

import { useState, useEffect, useRef, FormEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { insforge } from '@/lib/insforge';
import { logAction } from '@/lib/admin/audit';
import { useAuth } from '@/lib/auth/AuthContext';
import styles from './mfa-verify.module.css';

export default function MFAVerifyPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [code, setCode] = useState('');
    const [factorId, setFactorId] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isBackup, setIsBackup] = useState(false);
    const [attempts, setAttempts] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    // Fetch the TOTP factor ID on mount
    useEffect(() => {
        async function getFactor() {
            try {
                const { data, error: factorsError } = await (insforge.auth as any).mfa.listFactors();
                if (factorsError) throw factorsError;

                const totpFactor = data.all.find(
                    (f: any) => f.factor_type === 'totp' && f.status === 'verified'
                );

                if (totpFactor) {
                    setFactorId(totpFactor.id);
                } else {
                    setError('No verified TOTP factor found. Please contact support.');
                }
            } catch (err: any) {
                console.error('MFA Factor error:', err);
                setError('Failed to initialize MFA. Please refresh or try again.');
            }
        }
        getFactor();
    }, []);

    useEffect(() => {
        if (inputRef.current) inputRef.current.focus();
    }, [isBackup]);

    const handleVerify = async (val: string) => {
        if (!factorId) {
            setError('MFA session not initialized. Please refresh.');
            return;
        }
        if (val.length !== 6 && !isBackup) return;
        
        setIsLoading(true);
        setError('');

        try {
            // Step 1: Create a challenge for the factor
            const { data: challengeData, error: challengeError } = 
                await (insforge.auth as any).mfa.challenge({ factorId });
            
            if (challengeError) throw challengeError;

            // Step 2: Verify the challenge with the user-provided code
            const { error: verifyError } = await (insforge.auth as any).mfa.verify({
                factorId,
                challengeId: challengeData.id,
                code: val.trim()
            });

            if (verifyError) {
                if (user) {
                    await logAction({
                        adminId: user.id,
                        action: 'security_mfa_failed',
                        status: 'failure'
                    });
                }
                const newAttempts = attempts + 1;
                setAttempts(newAttempts);
                if (newAttempts >= 5) {
                    setError('Too many failed attempts. Account locked for 15 minutes.');
                } else {
                    setError(verifyError.message || `Incorrect code. ${5 - newAttempts} attempts remaining.`);
                }
                setCode('');
                return;
            }

            // Success
            if (user) {
                await logAction({
                    adminId: user.id,
                    action: 'security_mfa_success',
                    status: 'success'
                });
            }

            // Set signed MFA verification cookie
            try {
                await fetch('/api/auth/mfa-complete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        factorId,
                        timestamp: Date.now()
                    })
                });
            } catch (err) {
                console.warn('Failed to set MFA cookie:', err);
                // Continue anyway - cookie might still be set
            }

            // Redirect based on role
            const dest = user?.role === 'super_admin' || user?.role === 'admin'
                       ? '/dashboard/admin'
                       : user?.role === 'recruiter' ? '/dashboard/recruiter' 
                       : user?.id ? `/dashboard/candidate/${user.id}` : '/dashboard/candidate';
            
            router.push(dest);
        } catch (err: any) {
            setError(err.message || 'Verification failed');
        } finally {
            setIsLoading(false);
        }
    };

    const handleBackupVerify = async (e: FormEvent) => {
        e.preventDefault();
        setError('Manual backup code verification not fully implemented in this demo. Please use TOTP.');
    };

    const onInputChange = (val: string) => {
        const cleanVal = val.replace(/\D/g, '').substring(0, 6);
        setCode(cleanVal);
        if (cleanVal.length === 6) {
            handleVerify(cleanVal);
        }
    };

    return (
        <div className={styles.page}>
            <div className={styles.card}>
                <div className={styles.logoWrap}>
                    <Image
                        src="/TalentMesh_page-0002-removebg-preview.png"
                        alt="TalentMesh"
                        width={180}
                        height={50}
                        unoptimized
                        priority
                    />
                </div>

                <div className={styles.header}>
                    <h1 className={styles.title}>Two-Factor Authentication</h1>
                    <p className={styles.subtitle}>
                        {isBackup 
                            ? 'Enter one of your 8-digit backup codes to sign in.' 
                            : 'Enter the 6-digit code from your authenticator app.'}
                    </p>
                </div>

                {error && <div className={styles.errorMessage}>{error}</div>}

                {!isBackup ? (
                    <div className={styles.inputContainer}>
                        <input
                            ref={inputRef}
                            type="text"
                            maxLength={6}
                            value={code}
                            onChange={(e) => onInputChange(e.target.value)}
                            className={styles.mfaInput}
                            disabled={isLoading || attempts >= 5}
                            placeholder="000000"
                            autoFocus
                        />
                        {isLoading && <div className={styles.loaderLine} />}
                    </div>
                ) : (
                    <form onSubmit={handleBackupVerify} className={styles.form}>
                        <input
                            ref={inputRef}
                            type="text"
                            className={styles.backupInput}
                            placeholder="Enter backup code"
                            required
                        />
                        <button type="submit" className={styles.submitBtn} disabled={isLoading}>
                            Verify Backup Code
                        </button>
                    </form>
                )}

                <div className={styles.footer}>
                    <button 
                        onClick={() => setIsBackup(!isBackup)} 
                        className={styles.ghostBtn}
                    >
                        {isBackup ? 'Use Authenticator App' : 'Use a backup code instead'}
                    </button>
                    
                    <Link href="/login" className={styles.link}>
                        Back to Login
                    </Link>
                </div>
            </div>
        </div>
    );
}
