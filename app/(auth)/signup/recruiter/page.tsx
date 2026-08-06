"use client";
import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import RecruiterRegisterForm from '@/components/auth/RecruiterRegisterForm';
import BookACallForm from '@/components/auth/BookACallForm';
import styles from '../signup.module.css';
import HeroBg from '@/components/ui/HeroBg/HeroBg';
import { motion } from 'framer-motion';

function RecruiterSignupContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const variant = (searchParams.get('variant') as 'call' | 'application') || 'application';

    React.useEffect(() => {
        if (typeof window !== 'undefined') {
            document.title = "Recruiter Sign Up | TalentMesh";
        }
    }, []);

    return (
        <div className={`${styles.page} flex flex-col items-center justify-center min-h-screen py-8 px-4 overflow-y-auto`}>
            <HeroBg src="/bg2job.png" fixed />
            <div className={styles.pageOverlay} />
            <div className={styles.bgGlow1} />
            <div className={styles.bgGlow2} />
            <div className={styles.gridOverlay} />

            <motion.div 
                className={`w-full ${variant === 'call' ? 'max-w-4xl' : 'max-w-md'} mx-auto z-10 my-auto`}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 100, damping: 15 }}
            >
                {variant === 'call' ? (
                    <BookACallForm onBack={() => router.push('/signup')} />
                ) : (
                    <RecruiterRegisterForm onBack={() => router.push('/signup')} />
                )}
            </motion.div>
        </div>
    );
}

export default function RecruiterSignupPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <RecruiterSignupContent />
        </Suspense>
    );
}
