"use client";
import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import styles from '../forgot-password/forgot.module.css';

type RecruiterStatus = {
    membership: { company_id: string; member_role: string; status: string } | null;
    company: { id: string; name: string; status: string; verified_at: string | null } | null;
    verification: { id: string; status: string; review_notes: string | null; created_at: string; decided_at: string | null } | null;
};

function deriveContent(data: RecruiterStatus | null) {
    if (!data || !data.membership) {
        return {
            title: 'No Application Found',
            message: "We couldn't find a recruiter application for your account. Start onboarding to request access.",
            reason: null,
        };
    }

    const { membership, company, verification } = data;

    if (membership.status === 'suspended') {
        return {
            title: 'Account Suspended',
            message: 'Your recruiter access has been suspended. Contact support if you believe this is a mistake.',
            reason: null,
        };
    }

    if (company?.status === 'suspended') {
        return {
            title: 'Company Suspended',
            message: 'Your company account has been suspended by our admin team. Contact support for details.',
            reason: null,
        };
    }

    if (company?.status === 'deactivated') {
        return {
            title: 'Company Deactivated',
            message: 'Your company account has been deactivated. Contact support if you need to reactivate it.',
            reason: null,
        };
    }

    if (verification?.status === 'rejected') {
        return {
            title: 'Application Rejected',
            message: 'Your recruiter/company verification was not approved.',
            reason: verification.review_notes,
        };
    }

    if (verification?.status === 'needs_more_info') {
        return {
            title: 'Additional Information Needed',
            message: 'Our team needs more details before your account can be verified.',
            reason: verification.review_notes,
        };
    }

    // invited + submitted/under_review, or invited with no verification row yet (joined an
    // existing company still awaiting that company's own verification).
    return {
        title: 'Account Under Review',
        message: "Thank you for registering! Your recruiter application is currently being vetted by our administration team.\n\nWe will review your company details, credentials, and verification documents. You will receive an email notification as soon as your account is activated.",
        reason: null,
    };
}

/**
 * Recruiter Pending Approval / Under Review Screen.
 * Blocked recruiters are redirected here by middleware/proxy.ts if status is 'pending'.
 * Wired to GET /api/recruiter/status (04 state machine) — see 05/06 pending-approval spec.
 */
export default function PendingApprovalPage() {
    const router = useRouter();
    const { user, logout } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<RecruiterStatus | null>(null);
    const [statusLoading, setStatusLoading] = useState(true);

    const fetchStatus = useCallback(async () => {
        try {
            const res = await fetch('/api/recruiter/status');
            if (!res.ok) return;
            const data: RecruiterStatus = await res.json();
            setStatus(data);

            if (data.membership?.status === 'active' && data.company?.status === 'verified' && user?.id) {
                router.push(`/dashboard/recruiter/${user.id}`);
            }
        } catch (err) {
            console.error('Failed to fetch recruiter status', err);
        } finally {
            setStatusLoading(false);
        }
    }, [router, user?.id]);

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 30000);
        return () => clearInterval(interval);
    }, [fetchStatus]);

    const handleLogout = async () => {
        setIsLoading(true);
        try {
            await logout();
            router.push('/login');
        } catch (err) {
            console.error('Logout failed:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const content = deriveContent(status);

    return (
        <div className={styles.page}>
            {/* Background decorations */}
            <div className={styles.bgGlow1} />
            <div className={styles.bgGlow2} />
            <div className={styles.gridOverlay} />

            <div className={styles.card}>
                {/* Logo */}
                <div className={styles.logoWrap}>
                    <Image
                        src="/TalentMesh_page-0002-removebg-preview.png"
                        alt="TalentMesh"
                        width={150}
                        height={42}
                        unoptimized
                        className={styles.logoImg}
                    />
                </div>

                <div className={styles.successState}>
                    <div className={styles.successIcon} style={{ background: '#fffbeb', border: '1px solid #fef3c7' }}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'pulse 2s infinite' }}>
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                        </svg>
                    </div>

                    <h1 className={styles.title}>{statusLoading ? 'Checking status…' : content.title}</h1>
                    <p className={styles.subtitle} style={{ fontSize: '0.88rem', lineHeight: '1.45rem', marginTop: '0.5rem', color: '#64748b', whiteSpace: 'pre-line' }}>
                        {content.message}
                    </p>
                    {content.reason && (
                        <div className={styles.errorAlert} style={{ textAlign: 'left' }}>
                            <strong>Reviewer notes:</strong> {content.reason}
                        </div>
                    )}
                </div>

                <button
                    onClick={handleLogout}
                    className={styles.submitBtn}
                    style={{ background: '#1e293b', boxShadow: '0 4px 12px rgba(30, 41, 59, 0.2)' }}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <span className={styles.spinnerWrap}>
                            <span className={styles.spinner} />
                            Logging out...
                        </span>
                    ) : 'Back to Login'}
                </button>
            </div>

            {/* Bottom terms */}
            <p className={styles.terms}>
                Need immediate assistance?{' '}
                <a href="mailto:info@talentmeshsolutions.com" className={styles.termsLink}>Contact Support</a>
            </p>
        </div>
    );
}
