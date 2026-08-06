"use client";
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import AnimateOnScroll from '@/components/AnimateOnScroll';
import HeroBg from '@/components/ui/HeroBg/HeroBg';
import CTA from '@/components/sections/CTA';
import styles from './about.module.css';

/* ─── DATA ──────────────────────────────────── */

const MILESTONES = [
    {
        year: '2019',
        title: 'The Founding Idea',
        desc: 'Two ex-recruiters and an ML engineer frustrated by broken hiring sketched TalentMesh on a napkin in a coffee shop.'
    },
    {
        year: '2020',
        title: 'First Ten Clients',
        desc: 'Our first 10 enterprise clients saw time-to-hire drop from 6 weeks to 12 days. The model worked.'
    },
    {
        year: '2021',
        title: 'AI Screening Goes Live',
        desc: 'Our bias-free engine launched, analyzing 200+ signals per profile. Match accuracy hit 94% in Q1.'
    },
    {
        year: '2022',
        title: '10,000 Placements',
        desc: 'Ten thousand careers changed across tech, finance, design, and healthcare globally.'
    },
    {
        year: '2023',
        title: 'Series B & Platform Launch',
        desc: '$28M raised. The full employer + candidate platform shipped — analytics, ATS integrations, and talent marketplace.'
    },
    {
        year: '2024',
        title: 'Industry Recognition',
        desc: 'Named Most Innovative HR Tech Platform by HRTech World. 300+ team members. 98% client satisfaction.'
    }
];

const TEAM = [
    {
        name: 'Aryan Mehta',
        role: 'Co-Founder & CEO',
        img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&h=500&q=80'
    },
    {
        name: 'Priya Nair',
        role: 'Co-Founder & CTO',
        img: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=400&h=500&q=80'
    },
    {
        name: 'Samuel Clarke',
        role: 'Chief Revenue Officer',
        img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&h=500&q=80'
    },
    {
        name: 'Mei Liang',
        role: 'VP of Product',
        img: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&h=500&q=80'
    }
];

const STATS_TESTIMONIALS = [
    {
        metric: '98%',
        label: 'Client satisfaction rate',
        quote: 'TalentMesh has completely transformed how we build teams. The combination of AI screening and specialist verification is unmatched.',
        author: 'David Callahan',
        role: 'VP of Talent, Spotify',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&h=100&q=80'
    },
    {
        metric: '12 Days',
        label: 'To first shortlist',
        quote: 'We went from spending weeks filtering resumes to interviewing qualified candidates within days. The speed and quality are phenomenal.',
        author: 'Sarah Mitchel',
        role: 'Director of Engineering, Google',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&h=100&q=80'
    },
    {
        metric: '120+',
        label: 'Enterprise partners',
        quote: 'A recruitment platform that actually respects both sides of the table. Their transparency and context-rich matches are a breath of fresh air.',
        author: 'Daniella Reyes',
        role: 'Chief People Officer, Stripe',
        avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=100&h=100&q=80'
    }
];

const OFFICES = [
    { city: 'Mumbai', country: 'India', role: 'Global HQ', address: 'BKC, Bandra Kurla Complex, Mumbai 400051', lat: 19.0596, lng: 72.8656, top: '56%', left: '71%' },
    { city: 'San Francisco', country: 'USA', role: 'Americas Hub', address: '340 Pine Street, CA 94104', lat: 37.7897, lng: -122.4025, top: '40%', left: '14%' },
    { city: 'London', country: 'UK', role: 'EMEA Hub', address: '1 Canada Square, Canary Wharf, London E14 5AB', lat: 51.5045, lng: -0.0235, top: '28%', left: '48%' },
    { city: 'Singapore', country: 'Singapore', role: 'APAC Hub', address: '1 Raffles Place, Singapore 048616', lat: 1.2842, lng: 103.8513, top: '65%', left: '76%' }
];

const COMPANYS = [
    { name: 'Quantum', logo: '◈ Quantum' },
    { name: 'Acme Corp', logo: '▲ Acme Corp' },
    { name: 'Helix', logo: '☤ Helix' },
    { name: 'Aether', logo: '❖ Aether' },
    { name: 'Spherion', logo: '● Spherion' }
];

/* ─── PAGE ──────────────────────────────────── */

export default function AboutPage() {
    return (
        <main className={styles.page}>
            <HeroBg src="/wave-bg.png" fixed />

            {/* ── HERO & INTRO ── */}
            <section className={styles.hero}>
                <div className="premium-container">
                    <div className={styles.heroInner}>
                        <div className={styles.sectionBadge}>About us</div>
                        <h1 className={styles.heroTitle}>
                            We are on a mission to align potential with<br />
                            <span className={styles.highlight}>opportunity.</span>
                        </h1>
                        <p className={styles.heroSub}>
                            We're a next-gen recruitment platform focused on creating high-performing teams
                            and hiring strategies that fuel growth.
                        </p>
                    </div>

                    {/* 3-Image Grid Layout */}
                    <div className={styles.heroImageGrid}>
                        <div className={styles.imgLeft}>
                            <Image
                                src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&h=800&q=80"
                                alt="Careers team working"
                                fill
                                className={styles.gridImg}
                                priority
                                unoptimized
                            />
                        </div>
                        <div className={styles.imgRightCol}>
                            <div className={styles.imgRightTop}>
                                <Image
                                    src="https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&h=500&q=80"
                                    alt="Global mission alignment"
                                    fill
                                    className={styles.gridImg}
                                    unoptimized
                                />
                            </div>
                            <div className={styles.imgRightBottom}>
                                <Image
                                    src="https://images.unsplash.com/photo-1556761175-4b46a572b786?auto=format&fit=crop&w=800&h=500&q=80"
                                    alt="Collaboration at office"
                                    fill
                                    className={styles.gridImg}
                                    unoptimized
                                />
                            </div>
                        </div>
                    </div>

                    {/* Trusted By Logos */}
                    <div className={styles.trustedCompanies}>
                        <span className={styles.trustedLabel}>Trusted by top companies</span>
                        <div className={styles.logoRow}>
                            {COMPANYS.map((company, i) => (
                                <span key={i} className={styles.companyLogo}>{company.logo}</span>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── FOUNDER QUOTE ── */}
            <AnimateOnScroll animation="fadeUp">
                <section className={styles.quoteSection}>
                    <div className="premium-container">
                        <div className={styles.quoteContent}>
                            <span className={styles.quoteMark}>“</span>
                            <blockquote className={styles.mainQuote}>
                                We believe great hiring starts with empathy and ends with impact. Our approach is simple:
                                listen closely, analyze deeply, and connect with purpose.
                            </blockquote>
                            <div className={styles.quoteAuthor}>
                                <div className={styles.authorAvatar}>
                                    <Image
                                        src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80"
                                        alt="Aryan Mehta"
                                        fill
                                        className={styles.avatarImg}
                                        unoptimized
                                    />
                                </div>
                                <div className={styles.authorMeta}>
                                    <cite className={styles.authorName}>Aryan Mehta</cite>
                                    <span className={styles.authorRole}>Co-Founder & CEO, TalentMesh</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </AnimateOnScroll>

            {/* ── MEET THE TEAM ── */}
            <AnimateOnScroll animation="fadeUp">
                <section className={styles.teamSection}>
                    <div className="premium-container">
                        <div className={styles.teamHeaderRow}>
                            <div className={styles.teamHeaderLeft}>
                                <div className={styles.sectionBadge}>Our team</div>
                                <h2 className={styles.sectionTitle}>
                                    Meet the <span className={styles.highlight}>team</span>
                                </h2>
                            </div>
                            <div className={styles.teamHeaderRight}>
                                <p className={styles.teamDescription}>
                                    We're a team of recruiters, builders, and strategists driven by curiosity and craft.
                                    Every match we make is powered by collaboration, diverse perspectives, and a shared mission to deliver real results.
                                </p>
                            </div>
                        </div>

                        <div className={styles.teamRowGrid}>
                            {TEAM.map((member, i) => (
                                <div key={i} className={`${styles.teamCard} glass-card`}>
                                    <div className={styles.teamImgWrapper}>
                                        <Image
                                            src={member.img}
                                            alt={member.name}
                                            fill
                                            className={styles.teamCardImg}
                                            unoptimized
                                        />
                                    </div>
                                    <div className={styles.teamCardInfo}>
                                        <h3 className={styles.teamCardName}>{member.name}</h3>
                                        <span className={styles.teamCardRole}>{member.role}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </AnimateOnScroll>

            {/* ── MILESTONES (Journey) ── */}
            <AnimateOnScroll animation="fadeUp">
                <section className={styles.journeySection}>
                    <div className="premium-container">
                        <div className={styles.journeyHeader}>
                            <div className={styles.sectionBadge}>Achievements</div>
                            <h2 className={styles.sectionTitle}>
                                Our <span className={styles.highlight}>Journey</span>
                            </h2>
                        </div>

                        <div className={styles.milestonesTable}>
                            <div className={styles.tableHeaderRow}>
                                <span className={styles.colHeader}>Milestone</span>
                                <span className={styles.colHeader}>Description</span>
                                <span className={styles.colHeaderRight}>Year</span>
                            </div>
                            {MILESTONES.map((m, i) => (
                                <div key={i} className={styles.tableRow}>
                                    <span className={styles.milestoneTitle}>{m.title}</span>
                                    <span className={styles.milestoneDesc}>{m.desc}</span>
                                    <span className={styles.milestoneYear}>{m.year}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </AnimateOnScroll>

            {/* ── STATS & TESTIMONIALS ── */}
            <AnimateOnScroll animation="fadeUp">
                <section className={styles.statsSection}>
                    <div className="premium-container">
                        <div className={styles.statsGrid}>
                            {STATS_TESTIMONIALS.map((st, i) => (
                                <div key={i} className={`${styles.testimonialStatCard} glass-card`}>
                                    <div className={styles.cardStatHeader}>
                                        <span className={styles.statMetric}>{st.metric}</span>
                                        <span className={styles.statLabel}>{st.label}</span>
                                    </div>
                                    <span className={styles.cardQuoteMark}>“</span>
                                    <p className={styles.cardTestimonialText}>{st.quote}</p>
                                    <div className={styles.cardAuthorRow}>
                                        <div className={styles.cardAvatar}>
                                            <Image
                                                src={st.avatar}
                                                alt={st.author}
                                                fill
                                                className={styles.avatarImg}
                                                unoptimized
                                            />
                                        </div>
                                        <div className={styles.cardAuthorMeta}>
                                            <cite className={styles.cardAuthorName}>{st.author}</cite>
                                            <span className={styles.cardAuthorRole}>{st.role}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </AnimateOnScroll>

            {/* ── WHY WORK WITH US? ── */}
            <AnimateOnScroll animation="fadeUp">
                <section className={styles.whyUsSection}>
                    <div className="premium-container">
                        <div className={styles.whyUsHeader}>
                            <div className={styles.sectionBadge}>Why us</div>
                            <h2 className={styles.sectionTitle}>
                                Why work <span className={styles.highlight}>with us?</span>
                            </h2>
                            <p className={styles.whyUsSub}>Find out why TalentMesh is better than traditional agencies.</p>
                        </div>

                        <div className={styles.comparisonGrid}>
                            {/* Other Agencies */}
                            <div className={`${styles.comparisonCard} glass-card`}>
                                <h3 className={styles.compCardTitle}>Other Agencies:</h3>
                                <ul className={styles.compList}>
                                    <li className={styles.compItemMinus}>
                                        <span className={styles.compIconMinus}>−</span>
                                        Rigid workflows with little flexibility
                                    </li>
                                    <li className={styles.compItemMinus}>
                                        <span className={styles.compIconMinus}>−</span>
                                        Overpromise, underdeliver
                                    </li>
                                    <li className={styles.compItemMinus}>
                                        <span className={styles.compIconMinus}>−</span>
                                        Keyword-only matches without context
                                    </li>
                                    <li className={styles.compItemMinus}>
                                        <span className={styles.compIconMinus}>−</span>
                                        Slow feedback loops and high candidate drop-off
                                    </li>
                                    <li className={styles.compItemMinus}>
                                        <span className={styles.compIconMinus}>−</span>
                                        Opaque pricing structure with hidden fees
                                    </li>
                                </ul>
                            </div>

                            {/* TalentMesh */}
                            <div className={`${styles.comparisonCard} ${styles.compCardActive} glass-card`}>
                                <h3 className={styles.compCardTitle}>TalentMesh:</h3>
                                <ul className={styles.compList}>
                                    <li className={styles.compItemPlus}>
                                        <span className={styles.compIconPlus}>✓</span>
                                        Custom-tailored solutions for each client
                                    </li>
                                    <li className={styles.compItemPlus}>
                                        <span className={styles.compIconPlus}>✓</span>
                                        Realistic goals, consistently delivered
                                    </li>
                                    <li className={styles.compItemPlus}>
                                        <span className={styles.compIconPlus}>✓</span>
                                        AI-powered context screening + specialist verification
                                    </li>
                                    <li className={styles.compItemPlus}>
                                        <span className={styles.compIconPlus}>✓</span>
                                        Under 12 days to first shortlists
                                    </li>
                                    <li className={styles.compItemPlus}>
                                        <span className={styles.compIconPlus}>✓</span>
                                        100% transparent matchmaking process
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>
            </AnimateOnScroll>

            {/* ── OUR VISION ── */}
            <AnimateOnScroll animation="fadeUp">
                <section className={styles.visionSection}>
                    <div className="premium-container">
                        <div className={styles.visionContent}>
                            <div className={styles.sectionBadge}>Our Vision</div>
                            <h2 className={styles.sectionTitle}>
                                A world where every person finds work that <span className={styles.highlight}>truly fits.</span>
                            </h2>
                            <p className={styles.visionText}>
                                Talent is evenly distributed — opportunity is not. TalentMesh exists to close that gap,
                                removing geographic, demographic, and informational barriers that keep great people from great roles.
                                We envision a future where hiring is frictionless, bias-free, and based on potential.
                            </p>
                            <div className={styles.visionQuoteText}>
                                “ The right hire, made the right way, changes everything. ”
                            </div>
                        </div>
                    </div>
                </section>
            </AnimateOnScroll>

            {/* ── OFFICES & WORLD MAP ── */}
            <AnimateOnScroll animation="fadeUp">
                <section className={styles.officeSection}>
                    <div className="premium-container">
                        <div className={styles.officeHeader}>
                            <div className={styles.sectionBadge}>Where We Work</div>
                            <h2 className={styles.sectionTitle}>
                                Global offices, <span className={styles.highlight}>one mission.</span>
                            </h2>
                        </div>

                        {/* Local SVG world map with ripple pins */}
                        <div className={styles.worldMap}>
                            <Image
                                src="/images/world-map.svg"
                                alt="World map"
                                fill
                                className={styles.worldMapImg}
                                unoptimized
                            />
                            <div className={styles.worldMapOverlay} />

                            {/* Location pins */}
                            {OFFICES.map((o, i) => (
                                <div key={i} className={styles.mapPin} style={{ top: o.top, left: o.left }}>
                                    <div className={styles.mapPinDot} />
                                    <div className={styles.mapPinRipple} />
                                    <div className={styles.mapPinLabel}>
                                        <strong>{o.city}</strong>
                                        <span>{o.role}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Office cards row */}
                        <div className={styles.officeCards}>
                            {OFFICES.map((o, i) => (
                                <div key={i} className={`${styles.officeCard} glass-card`}>
                                    <div className={styles.officeTop}>
                                        <div>
                                            <h3 className={styles.officeCity}>{o.city}</h3>
                                            <span className={styles.officeCountry}>{o.country}</span>
                                        </div>
                                        <span className={styles.officeRole}>{o.role}</span>
                                    </div>
                                    <p className={styles.officeAddr}>{o.address}</p>
                                    <a
                                        href={`https://www.openstreetmap.org/?mlat=${o.lat}&mlon=${o.lng}#map=14/${o.lat}/${o.lng}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={styles.mapLink}
                                    >
                                        View on Map
                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                                        </svg>
                                    </a>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </AnimateOnScroll>

            {/* ── CTA ── */}
            <AnimateOnScroll animation="scaleUp">
                <CTA
                    glass
                    title={<>Ready to Join the <span className="text-gradient">Mesh?</span></>}
                    description="Discover how our AI-powered platform matches top-tier talent with world-class companies."
                    buttonText="Get Started"
                    buttonLink="/portals/jobs/contact"
                />
            </AnimateOnScroll>
        </main>
    );
}