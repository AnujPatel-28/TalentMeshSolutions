"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@insforge/sdk';
import styles from './pricing.module.css';
import AnimateOnScroll from '@/components/AnimateOnScroll';
import HeroBg from '@/components/ui/HeroBg/HeroBg';
import CTA from '@/components/sections/CTA';
import { MotionAccordion } from '@/components/ui';

const insforge = createClient({
    baseUrl: process.env.NEXT_PUBLIC_BACKEND_URL || '',
    anonKey: process.env.NEXT_PUBLIC_ANON_KEY || ''
});

// --- Premium Custom Icons ---
const IconCheck = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const IconShield = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
);

const IconGlobe = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 0 20 15.3 15.3 0 0 1 0-20" />
    </svg>
);

const IconZap = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
);

const IconSparkle = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none">
        <path d="m12 3 1.912 5.885L20 10.8l-5.088 1.912L13 18.6l-1.912-5.888L6 10.8l5.088-1.915L12 3Z" />
    </svg>
);

const PARTNERS = ["Neural Networks", "Quantum Systems", "Fintech Infrastructure", "Distributed Ledger", "Autonomous Robotics", "Cloud Native", "Edge Computing", "Cyber Defense"];

interface Plan {
    id: string;
    name: string;
    tagline: string;
    price_monthly_inr: number | null;
    is_popular: boolean;
    features: string[];
    cta_label: string;
    cta_url: string;
}

export default function PricingPage() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchPlans() {
            try {
                const { data, error } = await insforge.database
                    .from('subscription_plans')
                    .select('*')
                    .eq('is_active', true)
                    .order('display_order', { ascending: true });

                if (error) throw error;
                const formatted = (data || []).map((p: any) => ({
                    ...p,
                    price_monthly_inr: p.price_monthly_inr !== null ? p.price_monthly_inr / 100 : null
                }));
                setPlans(formatted);
            } catch (err) {
                console.error('Fetch Error:', err);
            } finally {
                setIsLoading(false);
            }
        }
        fetchPlans();
    }, []);

    return (
        <main style={{ background: 'transparent', position: 'relative' }}>
            <HeroBg src="/bg2.png" fixed />
            {/* 1. Hero Section */}
            <section className={styles.hero}>
                <div className="premium-container">
                    <div className={styles.heroContent}>
                        <div className={styles.badge}>
                            <IconSparkle /> Transparent • Enterprise Ready • Secure
                        </div>
                        <h1 className={styles.title}>
                            Investment in <br />
                            <span className={styles.highlight}>excellence.</span>
                        </h1>
                        <p className={styles.description}>
                            Flexible protocols designed for high-growth innovation hubs and
                            global technical ecosystems alike.
                        </p>
                    </div>
                </div>
            </section>

            {/* 2. Specialized Marquee */}
            <div className={styles.marqueeContainer}>
                <div className={styles.marqueeTrack}>
                    {[...PARTNERS, ...PARTNERS].map((p, i) => (
                        <span key={i} className={styles.partnerName}>{p}</span>
                    ))}
                </div>
            </div>

            {/* 3. Pricing Grid */}
            <AnimateOnScroll animation="fadeUp">
                <section className={styles.pricingSection}>
                    <div className="premium-container">
                        <div className={styles.pricingGrid}>
                            {isLoading ? (
                                <div style={{ textAlign: 'center', gridColumn: '1/-1', padding: '4rem', color: '#64748b' }}>
                                    Optimizing pricing models...
                                </div>
                            ) : plans.map((plan, i) => (
                                <div key={plan.id} className={`${styles.pricingCard} ${plan.is_popular ? styles.popularCard : ''}`}>
                                    {plan.is_popular && <div className={styles.popularBadge}>Most Precision</div>}
                                    <h3 className={styles.planName}>{plan.name}</h3>
                                    <div className={styles.planPrice}>
                                        {plan.price_monthly_inr !== null && <span className={styles.currency}>₹</span>}
                                        <span className={styles.amount}>
                                            {plan.price_monthly_inr !== null ? plan.price_monthly_inr.toLocaleString() : "Custom"}
                                        </span>
                                        {plan.price_monthly_inr !== null && <span className={styles.period}>/mo</span>}
                                    </div>
                                    <p className={styles.planDesc}>{plan.tagline}</p>

                                    <ul className={styles.featureList}>
                                        {plan.features.map((feature, idx) => (
                                            <li key={idx} className={styles.featureItem}>
                                                <div className={styles.checkIcon}><IconCheck /></div>
                                                {feature}
                                            </li>
                                        ))}
                                    </ul>

                                    <Link
                                        href={plan.cta_url}
                                        className={`${styles.planBtn} ${plan.is_popular ? styles.primaryBtn : ''}`}
                                    >
                                        {plan.cta_label}
                                    </Link>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </AnimateOnScroll>

            {/* 4. Enterprise Grade Details */}
            <AnimateOnScroll animation="blurIn">
                <section className={styles.infraSection}>
                    <div className="premium-container">
                        <div className={styles.infraHeader}>
                            <h2 style={{ fontSize: '3.5rem', fontWeight: 900, marginBottom: '1.5rem', letterSpacing: '-0.03em' }}>Diagnostic Infrastructure</h2>
                            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.25rem' }}>Security, compliance, and support at scale.</p>
                        </div>

                        <div className={styles.infraGrid}>
                            <div className={styles.infraCard}>
                                <div className={styles.infraIcon}><IconShield /></div>
                                <h3 className={styles.infraTitle}>SSO & Auth 2.0</h3>
                                <p className={styles.infraText}>Integrated with Okta, Azure AD, and Google Workspace for seamless enterprise access management.</p>
                            </div>
                            <div className={styles.infraCard}>
                                <div className={styles.infraIcon}><IconGlobe /></div>
                                <h3 className={styles.infraTitle}>Data Sovereignty</h3>
                                <p className={styles.infraText}>Select your primary hosting region to comply with global GDPR, CCPA, and regional data residency laws.</p>
                            </div>
                            <div className={styles.infraCard}>
                                <div className={styles.infraIcon}><IconZap /></div>
                                <h3 className={styles.infraTitle}>Dedicated Deployment</h3>
                                <p className={styles.infraText}>Guaranteed 99.99% system uptime with a dedicated deployment success lead for your team.</p>
                            </div>
                        </div>
                    </div>
                </section>
            </AnimateOnScroll>

            {/* 5. FAQ Section */}
            <AnimateOnScroll animation="fadeUp" delay={100}>
                <section className={styles.faqSection}>
                    <div className="premium-container">
                        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                            <h2 style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--deep-navy)' }}>Frequently Asked Questions</h2>
                        </div>

                        <div className="max-w-3xl mx-auto">
                            <MotionAccordion
                                items={[
                                    { question: 'How does the AI sourcing work?', answer: 'Our engine scans millions of open-source signals, project contributions, and technical deployments to identify specialists before they are active in the market.' },
                                    { question: 'Can I cancel my subscription?', answer: 'Yes, you can upgrade or discontinue your protocol at any time. We also offer month-to-month deployment options for specific hiring sprints.' },
                                    { question: 'Do you offer volume discounts?', answer: 'Our Enterprise ecosystems can scale to thousands of hires annually. Contact our solutions team for custom volume pricing and platform white-labeling.' }
                                ]}
                                gap={12}
                            />
                        </div>
                    </div>
                </section>
            </AnimateOnScroll>

            {/* 6. Custom CTA */}
            <AnimateOnScroll animation="scaleUp">
                <CTA
                    glass
                    title={<>Ready to <span className="text-gradient">Deploy?</span></>}
                    description="Join the world's leading Enterprise Ecosystems and start sourcing elite technical talent today."
                    buttonText="Talk to Sales"
                    buttonLink="/portals/jobs/contact"
                />
            </AnimateOnScroll>
        </main>
    );
}
