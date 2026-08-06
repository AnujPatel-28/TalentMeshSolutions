"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import styles from './signup.module.css';
import RoleSelection from '@/components/auth/RoleSelection';

export default function SignupPage() {
    const router = useRouter();

    React.useEffect(() => {
        if (typeof window !== 'undefined') {
            document.title = "Sign Up | TalentMesh";
        }
    }, []);

    const handleRoleSelect = (selectedRole: 'candidate' | 'recruiter', variant?: 'call' | 'application') => {
        if (selectedRole === 'candidate') {
            router.push('/signup/candidate');
        } else if (selectedRole === 'recruiter') {
            const query = variant ? `?variant=${variant}` : '';
            router.push(`/signup/recruiter${query}`);
        }
    };

    return (
        <div className={styles.page} style={{ flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <div className={styles.pageOverlay} />

            {/* Drifting Background Blobs */}
            <div className={styles.blobContainer}>
                <div className={`${styles.glowBlob} ${styles.blob1}`} />
                <div className={`${styles.glowBlob} ${styles.blob2}`} />
            </div>

            <div style={{ position: 'relative', zIndex: 10, width: '100%' }}>
                <RoleSelection onSelect={handleRoleSelect} />
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
