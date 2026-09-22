"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Mail, User, ArrowRight, CheckCircle2 } from 'lucide-react';
import styles from './login.module.css';

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

export default function LoginPage() {
    useEffect(() => {
        if (typeof window !== 'undefined') {
            document.title = "Early Access | TalentMesh";
        }
    }, []);

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<'candidate' | 'employer'>('candidate');
    const [isLoading, setIsLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !email) {
            setError('Name and email are required');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const response = await fetch('https://api.web3forms.com/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    access_key: process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY || '',
                    name,
                    email,
                    interested_as: role,
                    subject: `New Early Access Signup from ${name}`,
                    from_name: 'TalentMesh Early Access',
                }),
            });

            if (response.ok) {
                setSubmitted(true);
            } else {
                setError('Something went wrong. Please try again.');
            }
        } catch (err) {
            console.error('Early access signup failed:', err);
            setError('Connection failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.page}>
            <div className={styles.pageOverlay} />
            {/* Left Panel: Hero Background & Branding (45% width) */}
            <div className={styles.leftPanel}>
                <div className={styles.leftPanelContent}>
                    <div className={styles.heroBranding}>
                        <h2 className={styles.heroBrandingTitle}>
                            <span className={styles.heroBrandingText}>Every Journey</span> <br />
                            <span className={styles.heroBrandingHighlight}>Begins With One Step</span>
                        </h2>
                        <p className={styles.heroBrandingSub}>
                            Be the first to know when TalentMesh launches. Join the early access list for candidates and employers.
                        </p>
                        <div className={styles.statsGrid}>
                            <div className={styles.statCard}>
                                <span className={styles.statValue}>10k+</span>
                                <span className={styles.statLabel}>Placed Candidates</span>
                            </div>
                            <div className={styles.statCard}>
                                <span className={styles.statValue}>98%</span>
                                <span className={styles.statLabel}>Match Accuracy</span>
                            </div>
                            <div className={styles.statCard}>
                                <span className={styles.statValue}>4x</span>
                                <span className={styles.statLabel}>Faster Hiring</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Panel: Form Side (55% width) */}
            <div className={styles.rightPanel}>
                {/* Drifting Background Blobs */}
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
                                    width={180}
                                    height={50}
                                    unoptimized
                                    priority
                                    className={styles.logoImg}
                                    style={{ height: 'auto' }}
                                />
                            </Link>
                        </motion.div>

                        {submitted ? (
                            <motion.div variants={itemVariants} style={{ textAlign: 'center', padding: '1rem 0' }}>
                                <CheckCircle2 size={40} color="#16a34a" style={{ marginBottom: '1rem' }} />
                                <h1 className={styles.title}>You&apos;re on the list</h1>
                                <p className={styles.subtitle}>
                                    Thanks, {name.split(' ')[0]}! We&apos;ll email you at {email} as soon as early access opens.
                                </p>
                            </motion.div>
                        ) : (
                            <>
                                <motion.div variants={itemVariants} className={styles.header}>
                                    <h1 className={styles.title}>Get early access</h1>
                                    <p className={styles.subtitle}>Sign up to be notified when TalentMesh launches.</p>
                                </motion.div>

                                {error && (
                                    <motion.div
                                        className={styles.errorMessage}
                                        role="alert"
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                    >
                                        <span>{error}</span>
                                    </motion.div>
                                )}

                                <form className={styles.form} onSubmit={handleSubmit}>
                                    <motion.div variants={itemVariants} className={styles.fieldGroup}>
                                        <div className={styles.inputWrap}>
                                            <input
                                                id="name"
                                                type="text"
                                                className={styles.input}
                                                placeholder=" "
                                                value={name}
                                                onChange={e => setName(e.target.value)}
                                                required
                                                autoComplete="name"
                                            />
                                            <label className={styles.label} htmlFor="name">Full name</label>
                                            <User className={styles.inputIcon} size={18} />
                                        </div>
                                    </motion.div>

                                    <motion.div variants={itemVariants} className={styles.fieldGroup}>
                                        <div className={styles.inputWrap}>
                                            <input
                                                id="email"
                                                type="email"
                                                className={styles.input}
                                                placeholder=" "
                                                value={email}
                                                onChange={e => setEmail(e.target.value)}
                                                required
                                                autoComplete="email"
                                            />
                                            <label className={styles.label} htmlFor="email">Email address</label>
                                            <Mail className={styles.inputIcon} size={18} />
                                        </div>
                                    </motion.div>

                                    <motion.div variants={itemVariants} className={styles.socialRow}>
                                        <button
                                            type="button"
                                            className={styles.socialBtn}
                                            aria-pressed={role === 'candidate'}
                                            style={role === 'candidate' ? { borderColor: '#3b82f6', color: '#3b82f6' } : undefined}
                                            onClick={() => setRole('candidate')}
                                        >
                                            <span>I&apos;m a candidate</span>
                                        </button>
                                        <button
                                            type="button"
                                            className={styles.socialBtn}
                                            aria-pressed={role === 'employer'}
                                            style={role === 'employer' ? { borderColor: '#3b82f6', color: '#3b82f6' } : undefined}
                                            onClick={() => setRole('employer')}
                                        >
                                            <span>I&apos;m hiring</span>
                                        </button>
                                    </motion.div>

                                    <motion.div variants={itemVariants}>
                                        <button
                                            type="submit"
                                            className={styles.submitBtn}
                                            disabled={isLoading}
                                        >
                                            {isLoading ? (
                                                <span className={styles.spinnerWrap}>
                                                    <span className={styles.spinner} />
                                                    Submitting...
                                                </span>
                                            ) : (
                                                <span className={styles.submitContent}>
                                                    Join the waitlist
                                                    <ArrowRight className={styles.submitArrow} size={16} />
                                                </span>
                                            )}
                                        </button>
                                    </motion.div>
                                </form>
                            </>
                        )}

                    </motion.div>
                </div>
            </div>
        </div>
    );
}
