"use client";
import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import CursorGrid from '@/components/ui/CursorGrid';
import styles from './onboarding.module.css';

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (isLoading) return;

        if (!user) {
            router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
            return;
        }

        // Global Guard: Admins/Super Admins should NEVER be in onboarding
        if (user.role === 'admin' || user.role === 'super_admin') {
            window.location.replace('/dashboard/admin');
            return;
        }

        // Prevent cross-onboarding access
        if (user.role === 'recruiter' && pathname.startsWith('/onboarding/candidate')) {
            window.location.replace('/onboarding/recruiter/setup');
            return;
        }
        // /setup is also the landing page for a freshly-verified recruiter registrant, who is
        // still role='candidate' until that step's POST /api/recruiter/request-access bumps them
        // (doc 20 §0.2). Every other /onboarding/recruiter/* path stays recruiter-only. Predicate
        // kept identical to the equivalent carve-out in proxy.ts.
        const isRecruiterSetupPath = pathname === '/onboarding/recruiter/setup' || pathname.startsWith('/onboarding/recruiter/setup/');
        if (user.role === 'candidate' && pathname.startsWith('/onboarding/recruiter') && !isRecruiterSetupPath) {
            window.location.replace('/onboarding/candidate');
            return;
        }
    }, [user, isLoading, router, pathname]);

    if (isLoading) {
        return (
            <div className={styles.page}>
                <div style={{ color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
                    Loading...
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <div className={styles.bgGlow1} />
            <div className={styles.bgGlow2} />
            <div className="fixed inset-0 z-0 pointer-events-none">
                <CursorGrid
                    cellSize={70}
                    color="#3b82f6"
                    radius={140}
                    falloff="smooth"
                    holdTime={400}
                    fadeDuration={800}
                    lineWidth={1.2}
                    maxOpacity={0.9}
                    fillOpacity={0.03}
                    gridOpacity={0.03}
                    cellRadius={4}
                    clickPulse
                    pulseSpeed={600}
                />
            </div>
            {/* Static Blueprint Grid Overlay (.gridOverlay) */}
            {/* <div className={styles.gridOverlay} /> */}
            {children}
        </div>
    );
}


