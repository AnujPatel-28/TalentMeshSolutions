'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import styles from './Footer.module.css';

const Footer = () => {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const handleSubscribe = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;
        setStatus('loading');
        setMessage('');
        setErrorMsg('');

        try {
            const response = await fetch('https://api.web3forms.com/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    access_key: process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY || '',
                    email,
                    subject: `New Newsletter Subscription: ${email}`,
                    from_name: 'TalentMesh Newsletter',
                }),
            });

            if (response.ok) {
                setStatus('success');
                setMessage("You're subscribed!");
                setEmail('');
            } else {
                setStatus('error');
                setErrorMsg('Something went wrong. Please try again.');
            }
        } catch (error) {
            console.error('Subscription error:', error);
            setStatus('error');
            setErrorMsg('Something went wrong. Please try again.');
        }
    };

    return (
        <footer className={styles.footer}>
            <div className={styles.container}>
                <div className={styles.grid}>
                    <div className={styles.branding}>
                        <Link href="/" className={styles.logo}>
                            <Image src="/TalentMesh_page-0002-removebg-preview.png" alt="TalentMesh" width={150} height={34} />
                        </Link>
                        <p className={styles.description}>
                            Trusted Recruitment & Staffing Partner Across India
                        </p>
                        <div className={styles.newsletter}>
                            <h4 className={styles.newsletterTitle}>Get TalentMesh Insights</h4>
                            {status === 'success' ? (
                                <p className={styles.newsletterSuccess}>{message}</p>
                            ) : (
                                <form onSubmit={handleSubscribe} className={styles.newsletterInputWrapper}>
                                    <input
                                        type="email"
                                        placeholder="Enter your email"
                                        className={styles.newsletterInput}
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        disabled={status === 'loading'}
                                    />
                                    <button
                                        type="submit"
                                        className={styles.newsletterBtn}
                                        disabled={status === 'loading'}
                                    >
                                        {status === 'loading' ? 'Subscribing...' : 'Subscribe'}
                                    </button>
                                </form>
                            )}
                            {status === 'error' && (
                                <p className={styles.newsletterError}>{errorMsg}</p>
                            )}
                        </div>
                    </div>

                    <div className={styles.column}>
                        <h4>Talent Solutions</h4>
                        <Link href="/contingent-staffing">Contingent Staffing</Link>
                        <Link href="/contract-to-hire">Contract-to-Hire</Link>
                        <Link href="/recruitment-process-outsourcing">Recruitment Process Outsourcing</Link>
                        <Link href="/managed-talent-solutions">Managed Talent Solutions</Link>
                        <Link href="/remote-hiring-solutions">Remote Hiring Solutions</Link>
                        <Link href="/technology-talent-sourcing">Technology Talent Sourcing</Link>
                        <Link href="/gcc-setup-and-build">GCC Setup & Build</Link>
                        <Link href="/offshore-staffing">Offshore Staffing</Link>
                        <Link href="/executive-search">Executive Search</Link>
                        <Link href="/direct-hire-recruitment">Direct Hire Recruitment</Link>
                        <Link href="/hire-train-deploy">Hire, Train & Deploy</Link>
                        <Link href="/skill-upskilling">Skill Upskilling</Link>
                    </div>

                    <div className={styles.column}>
                        <h4>Talent Portal</h4>
                        <Link href="/talentmesh-portal">TalentMesh Portal</Link>
                        <Link href="/job-seekers">Candidate Benefits</Link>
                        <Link href="/employers/post-job">Post a Job</Link>
                    </div>

                    <div className={styles.column}>
                        <h4>Company</h4>
                        <Link href="/about">About Us</Link>
                        <Link href="/contact">Contact</Link>
                        <Link href="/blog">Blog</Link>
                        <Link href="/career-advice">Career Advice</Link>
                    </div>
                </div>

                <div className={styles.bottom}>
                    <p>&copy; 2026 TalentMesh Solutions. All rights reserved.</p>
                    <div className={styles.socials}>
                        <a href="https://x.com/TalentmeshS" className={`${styles.socialIcon} ${styles.twitter}`} aria-label="X (Twitter)">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
                            </svg>
                        </a>
                        <a href="https://www.linkedin.com/company/talentmesh-solutions/" className={`${styles.socialIcon} ${styles.linkedin}`} aria-label="LinkedIn">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                            </svg>
                        </a>
                        <a href="https://www.instagram.com/talentmesh_?igsh=NzFidGN2bDc4YzNx" className={`${styles.socialIcon} ${styles.instagram}`} aria-label="Instagram">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                            </svg>
                        </a>
                    </div>
                </div>
            </div>
            <div className={styles.footerBranding}>TALENTMESH</div>
        </footer>
    );
};

export default Footer;
