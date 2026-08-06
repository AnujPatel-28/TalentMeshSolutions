'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import styles from './case-studies.module.css';

// ─── Icons ─────────────────────────────────────────────────────────────────────
const ArrowIco = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14m-7-7 7 7-7 7" /></svg>;

// ─── Data ───────────────────────────────────────────────────────────────────────
const STATS = [
    { val: '10,000+', label: 'Companies' },
    { val: '3x', label: 'Faster Time-to-Hire' },
    { val: '94%', label: 'Satisfaction Rate' },
    { val: '50+', label: 'Platforms Searched' },
];

const FILTERS = ['All', 'Tech', 'Finance', 'Marketing', 'Design', 'Operations'];

const CASES = [
    {
        id: 1, company: 'Veritas Cloud', logo: 'VC', color: '#0D47A1', size: '250 employees', industry: 'Tech',
        challenge: 'Struggling to hire senior engineers in a competitive market with a 90-day average time-to-fill.',
        approach: 'TalentMesh\'s AI sourcing searched GitHub, LinkedIn, and Stack Overflow to surface passive candidates.',
        metric: '60% faster', metricLabel: 'Time-to-Hire',
        quote: 'We\'d tried three agencies before TalentMesh. Night and day difference in candidate quality.',
        person: 'Samira Chen', personRole: 'VP Engineering',
    },
    {
        id: 2, company: 'BrightCapital', logo: 'BC', color: '#1565C0', size: '800 employees', industry: 'Finance',
        challenge: 'Needed to scale from 2 to 20 finance analysts in under 3 months after Series B funding.',
        approach: 'Applied RPO model — dedicated sourcing team embedded within BrightCapital\'s processes.',
        metric: '20 hires', metricLabel: 'in 6 Weeks',
        quote: 'The candidate fit scores were incredibly accurate. We saved weeks of screening time.',
        person: 'Daniel Okafor', personRole: 'CFO',
    },
    {
        id: 3, company: 'ViralLoop', logo: 'VL', color: '#1E88E5', size: '50 employees', industry: 'Marketing',
        challenge: 'A fast-growing performance marketing startup needed senior growth specialists — a scarce profile.',
        approach: 'TalentMesh built a custom talent map and proactively outreached to candidates on 12 platforms.',
        metric: '4 hires', metricLabel: 'in 3 Weeks',
        quote: 'Our team went from 3 to 7 growth marketers in under a month. Exceptional speed.',
        person: 'Priya Sharma', personRole: 'CMO',
    },
    {
        id: 4, company: 'Designify Studio', logo: 'DS', color: '#2196F3', size: '120 employees', industry: 'Design',
        challenge: 'Required a mix of UX researchers, product designers, and a head of brand — all at once.',
        approach: 'AI screening matched portfolio quality against role benchmarks, removing bias from the process.',
        metric: '89%', metricLabel: 'Offer Acceptance Rate',
        quote: 'Every shortlisted candidate had a portfolio that blew us away. Zero wasted interviews.',
        person: 'Mei Lin', personRole: 'Head of Product',
    },
    {
        id: 5, company: 'OpsForce Global', logo: 'OG', color: '#42A5F5', size: '1,200 employees', industry: 'Operations',
        challenge: 'High-volume ops hiring across 5 countries with tight compliance requirements.',
        approach: 'Full RPO engagement — TalentMesh handled JD writing, sourcing, screening, and offer management.',
        metric: '150 hires', metricLabel: 'in One Quarter',
        quote: 'We\'d never scaled hiring this fast before. TalentMesh made international hiring feel simple.',
        person: 'James Okafor', personRole: 'COO',
    },
    {
        id: 6, company: 'NovaPay', logo: 'NP', color: '#0D47A1', size: '300 employees', industry: 'Finance',
        challenge: 'Needed to replace a legacy payroll team while simultaneously hiring for new fintech roles.',
        approach: 'Parallel sourcing streams — one for replacement hires, one for new capabilities.',
        metric: '2.5x', metricLabel: 'Pipeline Quality Score',
        quote: 'The AI match scores for fintech specialists were surprisingly accurate.',
        person: 'Fatima Al-Hassan', personRole: 'CHRO',
    },
];

export default function CaseStudiesPage() {
    const [filter, setFilter] = useState('All');

    const shown = filter === 'All' ? CASES : CASES.filter(c => c.industry === filter);

    return (
        <main className={styles.page}>
            {/* ── HERO ── */}
            <section className={styles.hero}>
                <div className="premium-container">
                    <h1 className={styles.heroTitle}>Real Companies. Real Results.</h1>
                    <p className={styles.heroSub}>See how businesses across industries scaled their teams faster with TalentMesh.</p>

                    {/* Filter tabs */}
                    <div className={styles.filterRow}>
                        {FILTERS.map(f => (
                            <button key={f} className={`${styles.filterTab} ${filter === f ? styles.filterTabActive : ''}`}
                                onClick={() => setFilter(f)}>{f}</button>
                        ))}
                    </div>
                </div>

                {/* Stats bar */}
                <div className={styles.statsBar}>
                    <div className="premium-container">
                        <div className={styles.statsInner}>
                            {STATS.map((s, i) => (
                                <React.Fragment key={s.val}>
                                    {i > 0 && <div className={styles.statDiv} />}
                                    <div className={styles.statItem}>
                                        <div className={styles.statVal}>{s.val}</div>
                                        <div className={styles.statLabel}>{s.label}</div>
                                    </div>
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── CASE STUDY CARDS ── */}
            <section className={styles.cardsSection}>
                <div className="premium-container">
                    {shown.length > 0 ? (
                        <div className={styles.cardsGrid}>
                            {shown.map(c => (
                                <div key={c.id} className={`${styles.card} glass-card`}>
                                    {/* Card head */}
                                    <div className={styles.cardHead}>
                                        <div className={styles.cardLogo} style={{ background: c.color }}>{c.logo}</div>
                                        <div>
                                            <div className={styles.cardCompany}>{c.company}</div>
                                            <div className={styles.cardSize}>{c.industry} · {c.size}</div>
                                        </div>
                                    </div>

                                    {/* Challenge */}
                                    <div className={styles.section}>
                                        <div className={styles.sectionLbl}>Challenge</div>
                                        <p className={styles.sectionTxt}>{c.challenge}</p>
                                    </div>

                                    {/* Approach */}
                                    <div className={styles.section}>
                                        <div className={styles.sectionLbl}>Approach</div>
                                        <p className={styles.sectionTxt}>{c.approach}</p>
                                    </div>

                                    {/* Result metric */}
                                    <div className={styles.metricBox}>
                                        <div className={styles.metricVal}>{c.metric}</div>
                                        <div className={styles.metricLabel}>{c.metricLabel}</div>
                                    </div>

                                    {/* Quote */}
                                    <div className={styles.quoteBlock}>
                                        <p className={styles.quoteText}>&ldquo;{c.quote}&rdquo;</p>
                                        <div className={styles.quotePerson}>— {c.person}, <em>{c.personRole}</em></div>
                                    </div>

                                    <Link href="#" className={styles.readMore}>Read Full Story <ArrowIco /></Link>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className={styles.emptyState}>No case studies found for this category yet.</div>
                    )}
                </div>
            </section>

            {/* ── CTA STRIP ── */}
            <section className={styles.ctaStrip}>
                <div className="premium-container">
                    <h2 className={styles.ctaTitle}>Ready to Write Your Own Success Story?</h2>
                    <div className={styles.ctaBtns}>
                        <Link href="/employers/post-job" className={styles.ctaPrimary}>Post a Job Free</Link>
                        <Link href="/employers/sourcing" className={styles.ctaSecondary}>Talk to Our Team</Link>
                    </div>
                </div>
            </section>
        </main>
    );
}
