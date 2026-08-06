"use client";

import { useState, useEffect, FormEvent } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { insforge } from '@/lib/insforge';
import styles from './setup-mfa.module.css';

export default function SetupMFAPage() {
    const router = useRouter();
    
    const [step, setStep] = useState<'enroll' | 'verify' | 'backup'>('enroll');
    const [factorId, setFactorId] = useState('');
    const [qrUri, setQrUri] = useState('');
    const [secret, setSecret] = useState('');
    const [verifyCode, setVerifyCode] = useState('');
    const [backupCodes, setBackupCodes] = useState<string[]>([]);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);

    // 1. Enrollment Initiation — use SDK
    const startEnrollment = async () => {
        setIsLoading(true);
        setError('');
        try {
            const { data, error: enrollError } = await (insforge.auth as any).mfa.enroll({
                factorType: 'totp'
            });

            if (enrollError) throw enrollError;

            setFactorId(data.id);
            setSecret(data.totp.secret);
            setQrUri(data.totp.qr_code);
            setStep('enroll');
        } catch (err: any) {
            console.error('MFA Enrollment error:', err);
            setError(err.message || 'Failed to start MFA enrollment');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        startEnrollment();
    }, []);

    // 2. Verification — use SDK challenge/verify
    const handleVerifyEnrollment = async (e: FormEvent) => {
        e.preventDefault();
        if (verifyCode.length !== 6) return;
        
        setIsVerifying(true);
        setError('');

        try {
            // Step 1: Challenge
            const { data: challengeData, error: challengeError } = 
                await (insforge.auth as any).mfa.challenge({ factorId });
            
            if (challengeError) throw challengeError;

            // Step 2: Verify
            const { error: verifyError } = await (insforge.auth as any).mfa.verify({
                factorId,
                challengeId: challengeData.id,
                code: verifyCode.trim()
            });

            if (verifyError) throw verifyError;

            // Optional: Generate backup codes if supported
            try {
                await generateBackupCodes();
            } catch (bErr) {
                console.warn('Backup codes failed, but MFA enabled:', bErr);
            }
            
            setStep('backup');
        } catch (err: any) {
            setError(err.message || 'Verification failed. Try again.');
        } finally {
            setIsVerifying(false);
        }
    };

    const generateBackupCodes = async () => {
        // Checking if SDK has specific method, else use edge function if available
        // Based on metadata, there is an edge function slug 'mfa-backup-codes'
        const { data, error } = await insforge.functions.invoke('mfa-backup-codes', {
            method: 'POST'
        });

        if (error) throw error;
        setBackupCodes(data.codes || []);
    };

    if (isLoading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.spinner} />
                <p>Initializing secure enrollment...</p>
            </div>
        );
    }

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

                {step === 'enroll' && (
                    <>
                        <div className={styles.header}>
                            <h1 className={styles.title}>Secure Your Account</h1>
                            <p className={styles.subtitle}>
                                Open Google Authenticator or Authy and scan this QR code.
                            </p>
                        </div>

                        <div className={styles.qrContainer}>
                            {qrUri && <img src={qrUri} alt="MFA QR Code" className={styles.qrCode} />}
                        </div>

                        <div className={styles.manualEntry}>
                            <p className={styles.label}>Can&apos;t scan? Enter manually:</p>
                            <code className={styles.secretText}>{secret}</code>
                        </div>

                        <form className={styles.form} onSubmit={handleVerifyEnrollment}>
                            <div className={styles.fieldGroup}>
                                <label className={styles.label}>6-Digit Verification Code</label>
                                <input
                                    type="text"
                                    maxLength={6}
                                    placeholder="000000"
                                    className={styles.input}
                                    value={verifyCode}
                                    onChange={e => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                                    required
                                />
                            </div>

                            {error && <div className={styles.errorMessage}>{error}</div>}

                            <button
                                type="submit"
                                className={styles.submitBtn}
                                disabled={isVerifying || verifyCode.length !== 6}
                            >
                                {isVerifying ? 'Verifying...' : 'Enable MFA'}
                            </button>
                        </form>
                    </>
                )}

                {step === 'backup' && (
                    <>
                        <div className={styles.header}>
                            <h1 className={styles.title}>MFA Enabled!</h1>
                            <p className={styles.subtitle}>
                                Your account is now protected. Save these backup codes in a safe place.
                            </p>
                        </div>

                        <div className={styles.backupGrid}>
                            {backupCodes.map((code, i) => (
                                <div key={i} className={styles.backupCode}>{code}</div>
                            ))}
                        </div>

                        <p className={styles.warning}>
                            ⚠️ These codes can be used if you lose your authenticator app. 
                            Each code can only be used once.
                        </p>

                        <button
                            onClick={() => router.push('/dashboard/admin')}
                            className={styles.submitBtn}
                        >
                            Go to Dashboard
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
