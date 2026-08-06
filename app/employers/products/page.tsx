'use client';
import React, { useState } from 'react';
import styles from './products.module.css';

const CheckIco = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>;
const ChevIco = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>;

const PLANS = [
    {
        name: 'Starter', tag: null, price: { monthly: 0, annual: 0 }, period: 'Free forever',
        desc: 'Perfect for small businesses hiring their first role.',
        features: ['1 active job post', 'Basic candidate matching', 'Email support', 'Candidate profile views', 'Standard listing'],
        ctaLabel: 'Get Started Free', ctaStyle: 'outline',
    },
    {
        name: 'Growth', tag: 'Most Popular ★', price: { monthly: 99, annual: 79 }, period: 'per month',
        desc: 'For growing teams that hire regularly.',
        features: ['Up to 5 active job posts', 'AI-powered screening', 'Applicant dashboard', 'Direct messaging', 'Calendar integration', 'Priority support', 'Analytics'],
        ctaLabel: 'Start Free Trial', ctaStyle: 'filled',
    },
    {
        name: 'Enterprise', tag: null, price: { monthly: null, annual: null }, period: 'Custom pricing',
        desc: 'For large teams, agencies, and high-volume hiring.',
        features: ['Unlimited posts + RPO options', 'Dedicated account manager', 'Custom integrations', 'Advanced analytics', 'SLA-backed support', 'Onboarding support'],
        ctaLabel: 'Book a Demo', ctaStyle: 'dark',
    },
];

const TABLE_ROWS = [
    { feature: 'Active Job Posts', starter: '1', growth: 'Up to 5', enterprise: 'Unlimited' },
    { feature: 'AI Candidate Matching', starter: 'Basic', growth: 'Advanced', enterprise: 'Custom' },
    { feature: 'Applicant Dashboard', starter: false, growth: true, enterprise: true },
    { feature: 'Direct Messaging', starter: false, growth: true, enterprise: true },
    { feature: 'Calendar Scheduling', starter: false, growth: true, enterprise: true },
    { feature: 'Analytics & Reporting', starter: false, growth: 'Standard', enterprise: 'Advanced' },
    { feature: 'Support Level', starter: 'Email', growth: 'Priority', enterprise: 'Dedicated SLA' },
    { feature: 'Custom Integrations', starter: false, growth: false, enterprise: true },
];

const FAQS = [
    { q: 'Can I cancel my plan anytime?', a: 'Yes. You can cancel at any time from your account settings with no lock-in period.' },
    { q: 'Do you charge per hire or per post?', a: 'We charge per job post, not per hire. The Growth plan allows up to 5 concurrent posts.' },
    { q: 'Is there a free trial available?', a: 'Yes — the Growth plan comes with a 14-day free trial, no credit card required.' },
    { q: 'What payment methods do you accept?', a: 'We accept all major credit cards (Visa, Mastercard, Amex) and bank transfers for Enterprise plans.' },
    { q: 'How do I upgrade or downgrade my plan?', a: 'You can change plans at any time from your billing settings. Changes take effect at the next billing cycle.' },
    { q: 'Can I try before I buy?', a: 'Absolutely — start with our free Starter plan or activate the Growth free trial to explore all features.' },
];

export default function ProductsPage() {
    const [annual, setAnnual] = useState(false);
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    React.useEffect(() => {
        if (typeof window !== 'undefined') {
            document.title = "Pricing Plans & Packages | TalentMesh for Employers";
        }
    }, []);

    const displayPrice = (plan: typeof PLANS[0]) => {
        if (plan.price.monthly === null) return 'Custom';
        const p = annual ? plan.price.annual : plan.price.monthly;
        return p === 0 ? 'Free' : `$${p}`;
    };

    return (
        <main className={styles.page}>
            {/* ── HERO ── */}
            <section className={styles.hero}>
                <div className="premium-container">
                    <h1 className={styles.heroTitle}>Simple Pricing. Powerful Hiring.</h1>
                    <p className={styles.heroSub}>Whether you&apos;re hiring one person or scaling a team, we have a plan that fits.</p>

                    {/* Billing toggle */}
                    <div className={styles.toggleWrap}>
                        <span className={`${styles.toggleLabel} ${!annual ? styles.toggleLabelActive : ''}`}>Monthly</span>
                        <button
                            className={`${styles.togglePill} ${annual ? styles.togglePillOn : ''}`}
                            onClick={() => setAnnual(a => !a)} aria-label="Switch billing period"
                        >
                            <span className={styles.toggleThumb} />
                        </button>
                        <span className={`${styles.toggleLabel} ${annual ? styles.toggleLabelActive : ''}`}>
                            Annual {annual && <span className={styles.saveBadge}>Save 20%</span>}
                        </span>
                    </div>
                </div>
            </section>

            {/* ── PRICING CARDS ── */}
            <section className={styles.pricingSection}>
                <div className="premium-container">
                    <div className={styles.pricingGrid}>
                        {PLANS.map(plan => (
                            <div key={plan.name} className={`${styles.planCard} ${plan.tag ? styles.planCardFeatured : ''}`}>
                                {plan.tag && <div className={styles.popularRibbon}>{plan.tag}</div>}
                                <div className={styles.planName}>{plan.name}</div>
                                <div className={styles.planPrice}>
                                    <span className={styles.priceNum}>{displayPrice(plan)}</span>
                                    {plan.price.monthly !== null && plan.price.monthly > 0 && (
                                        <span className={styles.pricePer}>/{annual ? 'mo (billed annually)' : 'month'}</span>
                                    )}
                                </div>
                                <div className={styles.planPeriod}>{plan.period}</div>
                                <p className={styles.planDesc}>{plan.desc}</p>
                                <ul className={styles.featureList}>
                                    {plan.features.map(f => (
                                        <li key={f} className={styles.featureItem}><span className={styles.featureCheck}><CheckIco /></span>{f}</li>
                                    ))}
                                </ul>
                                <button className={`${styles.planCta} ${styles[`cta_${plan.ctaStyle}`]}`}>{plan.ctaLabel}</button>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── COMPARISON TABLE ── */}
            <section className={styles.tableSection}>
                <div className="premium-container">
                    <h2 className={styles.sectionTitle}>Feature Comparison</h2>
                    <div className={styles.tableWrap}>
                        <table className={styles.table}>
                            <thead>
                                <tr className={styles.tableHead}>
                                    <th className={styles.thFeature}>Feature</th>
                                    <th>Starter</th>
                                    <th className={styles.thGrowth}>Growth ★</th>
                                    <th>Enterprise</th>
                                </tr>
                            </thead>
                            <tbody>
                                {TABLE_ROWS.map((row, i) => (
                                    <tr key={row.feature} className={i % 2 === 0 ? styles.rowEven : styles.rowOdd}>
                                        <td className={styles.tdFeature}>{row.feature}</td>
                                        {([row.starter, row.growth, row.enterprise] as (boolean | string)[]).map((val, ci) => (
                                            <td key={ci} className={`${styles.tdVal} ${ci === 1 ? styles.tdGrowth : ''}`}>
                                                {val === true ? <span className={styles.check}>✓</span> :
                                                    val === false ? <span className={styles.dash}>—</span> : val}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* ── FAQ ── */}
            <section className={styles.faqSection}>
                <div className="premium-container">
                    <h2 className={styles.sectionTitle}>Frequently Asked Questions</h2>
                    <div className={styles.faqList}>
                        {FAQS.map((faq, i) => (
                            <div key={i} className={styles.faqItem}>
                                <button className={styles.faqQ} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                                    <span>{faq.q}</span>
                                    <span className={`${styles.faqChev} ${openFaq === i ? styles.faqChevOpen : ''}`}><ChevIco /></span>
                                </button>
                                {openFaq === i && <div className={styles.faqA}>{faq.a}</div>}
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </main>
    );
}
