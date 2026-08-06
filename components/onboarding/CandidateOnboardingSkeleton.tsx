"use client";
import React from 'react';
import { OnboardingStepper } from './OnboardingStepper';
import Skeleton from '../ui/Skeleton';
import styles from '../../app/onboarding/onboarding.module.css';

// Kept as its own small file (not part of app/onboarding/candidate/page.tsx) so that
// app/onboarding/candidate/loading.tsx — the Next.js route-level Suspense fallback,
// which should stay lightweight — doesn't have to pull in page.tsx's much larger
// module (INDIAN_CITIES, DOMAIN_SKILLS, STATE_UNIVERSITIES_COLLEGES, etc.) just to
// render a skeleton. Mirrors page.tsx's Step 1 shell exactly so the loading -> loaded
// transition doesn't look like two different UIs swapping.
const STEP_LABELS = ['Basic Info', 'Professional', 'Preferences', 'Documents'];

export function CandidateOnboardingSkeleton() {
    return (
        <div className={styles.card}>
            <div className={styles.cardHeader}>
                <OnboardingStepper currentStep={1} steps={STEP_LABELS} />
                <div className={styles.header}>
                    <h1 className={styles.title}>Basic Information</h1>
                    <p className={styles.subtitle}>Your name, phone and current location</p>
                </div>
            </div>
            <div className={styles.section}>
                {/* Name */}
                <div className={styles.fieldGroup}>
                    <Skeleton width={60} height="0.8rem" className="mb-2" />
                    <Skeleton width="100%" height="2.6rem" className="rounded-xl" />
                </div>
                {/* Phone: dial-code chip + number */}
                <div className={styles.fieldGroup}>
                    <Skeleton width={60} height="0.8rem" className="mb-2" />
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <Skeleton width={64} height="2.6rem" className="rounded-xl" />
                        <Skeleton width="100%" height="2.6rem" className="rounded-xl" />
                    </div>
                </div>
                {/* City */}
                <div className={styles.fieldGroup}>
                    <Skeleton width={50} height="0.8rem" className="mb-2" />
                    <Skeleton width="100%" height="2.6rem" className="rounded-xl" />
                </div>
                {/* State + PIN */}
                <div className={styles.fieldGroup}>
                    <Skeleton width={70} height="0.8rem" className="mb-2" />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        <Skeleton height="2.6rem" className="rounded-xl" />
                        <Skeleton height="2.6rem" className="rounded-xl" />
                    </div>
                </div>
            </div>
        </div>
    );
}
