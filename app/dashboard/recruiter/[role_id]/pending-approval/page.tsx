"use client";
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';
import styles from './pending.module.css';

export default function PendingApprovalPage() {
    const { user, isLoading: authLoading, logout } = useAuth();
    const router = useRouter();
    const [isChecking, setIsChecking] = useState(false);

    useEffect(() => {
        if (authLoading) return;
        if (!user || user.role !== 'recruiter') {
            router.push('/login');
            return;
        }

        // Approval is company_members.status='active' AND companies.status='verified' — the same
        // pair app/dashboard/recruiter/[role_id]/layout.tsx gates on. This used to poll
        // recruiter_profiles.is_approved, which approval never writes: of 27 recruiters only 5 had
        // a recruiter_profiles row at all, so an approved recruiter was never released from this
        // screen. /api/recruiter/status is the one read that works here — RLS returns NULL for a
        // caller whose membership is not yet active, so the route resolves it service-side.
        const checkApproval = async () => {
            setIsChecking(true);
            try {
                const res = await fetch('/api/recruiter/status', { credentials: 'include' });
                if (!res.ok) return;
                const { membership, company } = await res.json();

                if (membership?.status === 'active' && company?.status === 'verified') {
                    router.push('/recruiter/dashboard');
                }
            } catch (err) {
                console.error('Error checking approval status:', err);
            } finally {
                setIsChecking(false);
            }
        };

        // Initial check
        checkApproval();

        // Polling every 30 seconds as requested
        const interval = setInterval(checkApproval, 30000);
        return () => clearInterval(interval);
    }, [user, authLoading, router]);

    if (authLoading) return <div className={styles.loading}>Loading...</div>;

    const signupDate = user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Recently';

    return (
        <div className={styles.page}>
            <div className={styles.card}>
                <div className={styles.iconWrap}>
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--primary-blue)" strokeWidth="1.5">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        <path d="M12 8v4" />
                        <path d="M12 16h.01" />
                    </svg>
                </div>
                
                <h1 className={styles.title}>Account Pending Approval</h1>
                <p className={styles.message}>
                    Hi <strong>{user?.name || 'Recruiter'}</strong>, your account is currently awaiting admin approval. 
                    This usually takes less than 24 hours.
                </p>

                <div className={styles.details}>
                    <div className={styles.detail}>
                        <span className={styles.label}>Member since:</span>
                        <span className={styles.value}>{signupDate}</span>
                    </div>
                    <div className={styles.detail}>
                        <span className={styles.label}>Status:</span>
                        <span className={styles.statusBadge}>Under Review</span>
                    </div>
                </div>

                <div className={styles.info}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    <span>Auto-refreshing status...</span>
                </div>

                <div className={styles.actions}>
                    <button onClick={() => logout()} className={styles.logoutBtn}>
                        Sign Out
                    </button>
                    <button 
                        onClick={() => window.location.reload()} 
                        className={styles.refreshBtn}
                        disabled={isChecking}
                    >
                        {isChecking ? 'Checking...' : 'Check Now'}
                    </button>
                </div>
            </div>
        </div>
    );
}
