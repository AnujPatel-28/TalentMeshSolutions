"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './employers.module.css';
import AnimateOnScroll from '@/components/AnimateOnScroll';
import HeroBg from '@/components/ui/HeroBg/HeroBg';
import CTA from '@/components/sections/CTA';

// --- Premium Custom Icons ---
const IconTarget = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
);

const IconShield = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
);

const IconZap = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
);

const IconChart = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" />
    </svg>
);

const PARTNERS = [
    "Neural Networks",
    "Quantum Systems",
    "Fintech Infrastructure",
    "Distributed Ledger",
    "Autonomous Robotics",
    "Cloud Native",
    "Edge Computing",
    "Cyber Defense"
];

const CANDIDATES = [
    {
        name: "Sophia Vance",
        role: "Principal AI Engineer",
        match: 99,
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80",
        skills: ["PyTorch", "CUDA", "LLMs", "Rust"]
    },
    {
        name: "Marcus Chen",
        role: "Staff Infrastructure Lead",
        match: 97,
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80",
        skills: ["Go", "Kubernetes", "gRPC", "AWS"]
    },
    {
        name: "Elena Rostova",
        role: "Senior WebAssembly Architect",
        match: 96,
        avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&h=150&q=80",
        skills: ["React", "TypeScript", "WebAssembly", "Rust"]
    }
];

export default function EmployersPage() {
    const [candidateIndex, setCandidateIndex] = useState(0);
    const [scanning, setScanning] = useState(true);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            document.title = "Talent Acquisition & Recruiting Solutions | TalentMesh for Employers";
        }
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setScanning(false);
            setTimeout(() => {
                setCandidateIndex((prev) => (prev + 1) % CANDIDATES.length);
                setScanning(true);
            }, 600);
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    const activeCandidate = CANDIDATES[candidateIndex];

    return (
        <main style={{ background: 'transparent' }}>
            <HeroBg src="/bg5.png" fixed />
            
            {/* 1. Command Hero */}
            <section className={styles.hero}>
                <div className="premium-container">
                    <div className={styles.heroContent}>
                        <div className={styles.enterpriseBadge}>
                            Enterprise Acquisition Suite 2.0
                        </div>
                        <h1 className={styles.heroTitle}>
                            Command your <br />
                            <span className={styles.titleGlow}>talent pipeline.</span>
                        </h1>
                        <p className={styles.heroDesc}>
                            The world's most advanced AI-driven sourcing engine.
                            Automate discovery, vetting, and matching for your elite technical roles.
                        </p>

                        <div className={styles.dashboardMockup}>
                            <div className={styles.statItem}>
                                <div className={styles.statValue}>1.2M+</div>
                                <div className={styles.statLabel}>Vetted Specialists</div>
                            </div>
                            <div className={styles.statItem}>
                                <div className={styles.statValue}>98.4%</div>
                                <div className={styles.statLabel}>Match Precision</div>
                            </div>
                            <div className={styles.statItem}>
                                <div className={styles.statValue}>8.2d</div>
                                <div className={styles.statLabel}>Avg. Deployment Time</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 2. Partner Marquee */}
            <div className={styles.marqueeContainer}>
                <div className={styles.marqueeTrack}>
                    {[...PARTNERS, ...PARTNERS].map((name, i) => (
                        <span key={i} className={styles.partnerName}>
                            {name}
                        </span>
                    ))}
                </div>
            </div>

            {/* 3. Command Center Section */}
            <AnimateOnScroll animation="fadeUp">
                <section className={styles.commandSection}>
                    <div className="premium-container">
                        <div className={styles.commandGrid}>
                            <div className={styles.commandContent}>
                                <span className={styles.featureTag}>The Aura Engine</span>
                                <h2 className={styles.commandTitle}>Recruitment on <br /> Autopilot.</h2>
                                <p className={styles.commandText}>
                                    Our machine learning model doesn't just scan keywords. It understands
                                    engineering depth, project impact, and cultural trajectory to find
                                    exactly who you're looking for before they even hit the market.
                                </p>

                                <div className={styles.featureList}>
                                    <div className={styles.featureItem}>
                                        <div className={styles.featureIcon}><IconTarget /></div>
                                        <div className={styles.featureBox}>
                                            <h4>Passive Talent Sourcing</h4>
                                            <p>Reach the 85% of elite engineers who aren't active on job boards.</p>
                                        </div>
                                    </div>
                                    <div className={styles.featureItem}>
                                        <div className={styles.featureIcon}><IconShield /></div>
                                        <div className={styles.featureBox}>
                                            <h4>Biometric Skill Vetting</h4>
                                            <p>Every candidate's technical profile is verified via automated AI screening.</p>
                                        </div>
                                    </div>
                                    <div className={styles.featureItem}>
                                        <div className={styles.featureIcon}><IconChart /></div>
                                        <div className={styles.featureBox}>
                                            <h4>Compensation IQ</h4>
                                            <p>Real-time salary benchmarking for every role and location worldwide.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.visualPanel}>
                                <div className={styles.sonarCircle}></div>
                                <div className={styles.scanLine}></div>
                                <div className={styles.sandboxContainer}>
                                    <div className={styles.sandboxHeader}>
                                        <span className={styles.statusIndicator}>
                                            <span className={styles.statusDot}></span>
                                            {scanning ? "AURA ACTIVE SCANNER" : "LOCKING MATCH..."}
                                        </span>
                                        <span className={styles.databaseCount}>4.2M DB</span>
                                    </div>

                                    <div className={`${styles.profileCard} ${scanning ? styles.profileScanning : ''}`}>
                                        <div className={styles.profileHeader}>
                                            <div className={styles.avatarWrapper}>
                                                <img 
                                                    src={activeCandidate.avatar} 
                                                    alt={activeCandidate.name} 
                                                    className={styles.avatar} 
                                                />
                                            </div>
                                            <div className={styles.profileMeta}>
                                                <h4 className={styles.candidateName}>{activeCandidate.name}</h4>
                                                <p className={styles.candidateRole}>{activeCandidate.role}</p>
                                            </div>
                                            <div className={styles.matchScore}>
                                                <span className={styles.matchPercent}>{activeCandidate.match}%</span>
                                                <span className={styles.matchLabel}>Match</span>
                                            </div>
                                        </div>

                                        <div className={styles.skillsGrid}>
                                            {activeCandidate.skills.map((skill, index) => (
                                                <span key={index} className={styles.skillTag}>
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>

                                        <div className={styles.analysisBox}>
                                            <div className={styles.analysisLine}></div>
                                            <div className={styles.analysisLabel}>VETTING STATUS</div>
                                            <div className={styles.vettingBadges}>
                                                <span className={styles.vettingBadge}>✓ Bio Vetted</span>
                                                <span className={styles.vettingBadge}>✓ System Design</span>
                                                <span className={styles.vettingBadge}>✓ Live Coding</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </AnimateOnScroll>

            {/* 4. Strategic Solutions */}
            <AnimateOnScroll animation="fadeUp" delay={100}>
                <section className={styles.solutionsSection}>
                    <div className="premium-container">
                        <div className={styles.sectionHeader}>
                            <h2 style={{ fontSize: '3.5rem', fontWeight: 900, color: 'var(--deep-navy)', marginBottom: '1.5rem' }}>Bespoke Solutions.</h2>
                            <p style={{ color: 'var(--medium-grey)', fontSize: '1.25rem' }}>Tailored acquisition strategies for every stage of growth.</p>
                        </div>

                        <div className={styles.solutionGrid}>
                            <div className={styles.solutionCard}>
                                <h3 className={styles.solutionTitle}>Precision Hire</h3>
                                <p className={styles.solutionDesc}>
                                    High-touch sourcing for critical leadership or high-specialization individual contributors.
                                </p>
                                <Link href="/employers/sourcing" className={styles.actionLink}>
                                    Explore Solution <IconZap />
                                </Link>
                            </div>
                            <div className={styles.solutionCard}>
                                <h3 className={styles.solutionTitle}>Volume Core</h3>
                                <p className={styles.solutionDesc}>
                                    Scale your engineering teams rapidly with our automated technical vetting pipeline.
                                </p>
                                <Link href="/employers/products" className={styles.actionLink}>
                                    View Platform <IconZap />
                                </Link>
                            </div>
                            <div className={styles.solutionCard}>
                                <h3 className={styles.solutionTitle}>Stealth Sourcing</h3>
                                <p className={styles.solutionDesc}>
                                    Discrete talent acquisition for confidential projects or competitive market moves.
                                </p>
                                <Link href="/portals/jobs/contact" className={styles.actionLink}>
                                    Speak to Expert <IconZap />
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>
            </AnimateOnScroll>

            {/* 5. Enterprise CTA */}
            <AnimateOnScroll animation="scaleUp">
                <CTA
                    glass
                    title={<>Scale with <span className="text-gradient">certainty.</span></>}
                    description="Join 200+ world-class Enterprise Ecosystems using TalentMesh to build their technical core."
                    buttonText="Schedule a Consult"
                    buttonLink="/portals/jobs/contact"
                />
            </AnimateOnScroll>
        </main>
    );
}
