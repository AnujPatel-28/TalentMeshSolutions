'use client';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform, useVelocity } from 'framer-motion';
import Image from 'next/image';
import styles from './sourcing.module.css';
import AnimateOnScroll from '@/components/AnimateOnScroll';
import { MotionAccordion } from '@/components/ui';
import {
    Users, Award, Target, Headphones, ShieldCheck, Building2, Scale,
    HeartHandshake, Lock, Briefcase, Code2, Crown, UserPlus, Search,
    Factory, Monitor, Heart, Landmark, ShoppingBag, Truck, GraduationCap,
    Megaphone, ClipboardCheck, ListChecks, Handshake, Clock, Star, Settings,
    ChevronDown, ArrowRight, Check, Clock3, Phone, Mail, MapPin, Sparkles, CheckCircle2,
    Globe, Radio, Cpu
} from 'lucide-react';

const CheckIco = () => <Check size={16} className={styles.checkIconColor} />;

// ── Hero Frame Slides ──
const HERO_SLIDES = [
    {
        src: '/sourcing_challenge_polite_positive.png',
        alt: 'Talent Assessment & Team Collaboration',
        caption: 'Helping companies build high-performing teams',
    },
    {
        src: '/smart_job_matching.png',
        alt: 'Smart Candidate Profile Matching',
        caption: 'Smart Candidate Profile Matching',
    },
    {
        src: '/sourcing_challenge_professional.png',
        alt: 'Enterprise Sourcing Analytics',
        caption: 'AI-Powered Candidate Sourcing & Analytics',
    },
    {
        src: '/sourcing_challenge_executive.png',
        alt: 'Executive & Technical Talent Matching',
        caption: 'Dedicated recruitment experts across top industries',
    },
];

// ── Trust Badges ──
const TRUST_BADGES = [
    { icon: <Users size={20} />, label: 'Expert Recruiters' },
    { icon: <Clock size={20} />, label: 'Faster Hiring' },
    { icon: <Award size={20} />, label: 'Quality Candidates' },
    { icon: <Headphones size={20} />, label: 'End-to-End Support' },
];

// ── Why Companies Choose ──
const WHY_CHOOSE = [
    { icon: <ShieldCheck size={28} strokeWidth={1.5} />, title: 'Pre-screened Candidates' },
    { icon: <Users size={28} strokeWidth={1.5} />, title: 'Dedicated Recruitment Team' },
    { icon: <Building2 size={28} strokeWidth={1.5} />, title: 'Industry-Specific Hiring' },
    { icon: <ClipboardCheck size={28} strokeWidth={1.5} />, title: 'Quality Over Quantity' },
    { icon: <ListChecks size={28} strokeWidth={1.5} />, title: 'End-to-End Recruitment Support' },
    { icon: <Lock size={28} strokeWidth={1.5} />, title: 'Confidential & Professional' },
];

// ── Recruitment Services ──
const SERVICES = [
    { icon: <Briefcase size={24} />, title: 'Permanent Hiring', desc: 'Build long-term teams with carefully screened professionals.' },
    { icon: <Code2 size={24} />, title: 'Technical Recruitment', desc: 'Hire developers, engineers, QA, DevOps, Data Scientists and more.' },
    { icon: <Crown size={24} />, title: 'Leadership Hiring', desc: 'Find experienced managers, department heads, and senior executives.' },
    { icon: <UserPlus size={24} />, title: 'Bulk Hiring', desc: 'Scale your workforce quickly during expansion or seasonal demand.' },
    { icon: <ClipboardCheck size={24} />, title: 'Candidate Screening', desc: 'We verify experience, assess skills and shortlist only qualified candidates.' },
    { icon: <Factory size={24} />, title: 'Industry Hiring', desc: 'Recruiting across diverse industries with deep domain expertise.' },
];

// ── Recruitment Process ──
const PROCESS_STEPS = [
    { n: 1, prefix: 'Understand Your', highlight: 'Hiring Needs', desc: 'We learn about your company, culture, job requirements, and expectations.' },
    { n: 2, prefix: 'Source Qualified', highlight: 'Candidates', desc: 'Our recruiters search multiple channels including our talent network, job platforms, referrals and more.' },
    { n: 3, prefix: 'Screen &', highlight: 'Evaluate', desc: 'Every candidate goes through resume screening, qualification checks, and recruiter interviews.' },
    { n: 4, prefix: 'Shortlist the Best', highlight: 'Candidates', desc: 'Receive only high-quality profiles that match your requirements.' },
    { n: 5, prefix: 'Interview &', highlight: 'Hire', desc: 'We coordinate interviews and support your hiring process until the position is successfully filled.' },
];

// ── Industries ──
const INDUSTRY_ROWS = [
    [
        { id: 0, icon: <Monitor size={22} />, label: 'IT & Software', color: '#3b82f6', image: '/images/tech-office.jpg' },
        { id: 1, icon: <Heart size={22} />, label: 'Healthcare', color: '#ef4444', image: '/healthcare_photo.png' },
        { id: 2, icon: <Landmark size={22} />, label: 'Finance', color: '#10b981', image: '/Finance management.png' },
        { id: 3, icon: <Factory size={22} />, label: 'Manufacturing', color: '#f59e0b', image: '/manufacturing_photo.png' },
    ],
    [
        { id: 4, icon: <ShoppingBag size={22} />, label: 'Retail', color: '#8b5cf6', image: '/retail_photo.png' },
        { id: 5, icon: <Truck size={22} />, label: 'Logistics', color: '#06b6d4', image: '/logistics_photo.jpg' },
        { id: 6, icon: <GraduationCap size={22} />, label: 'Education', color: '#ec4899', image: '/education_photo.jpg' },
    ],
    [
        { id: 7, icon: <Megaphone size={22} />, label: 'Marketing', color: '#f97316', image: '/Marketing and finance.png' },
        { id: 8, icon: <Users size={22} />, label: 'Human Resources', color: '#6366f1', image: '/Human research.png' },
        { id: 9, icon: <Headphones size={22} />, label: 'Customer Support', color: '#14b8a6', image: '/Customer services.png' },
    ],
];

const FLAT_INDUSTRIES = INDUSTRY_ROWS.flat();

// ── Why Partner ──
const WHY_PARTNER = [
    { icon: <Clock size={24} strokeWidth={1.5} />, title: 'Reduced Time-to-Hire' },
    { icon: <UserPlus size={24} strokeWidth={1.5} />, title: 'Access to Passive Candidates' },
    { icon: <Users size={24} strokeWidth={1.5} />, title: 'Experienced Recruiters' },
    { icon: <Star size={24} strokeWidth={1.5} />, title: 'Better Candidate Quality' },
    { icon: <Settings size={24} strokeWidth={1.5} />, title: 'Flexible Hiring Solutions' },
    { icon: <ShieldCheck size={24} strokeWidth={1.5} />, title: 'Confidential Hiring Support' },
    { icon: <Building2 size={24} strokeWidth={1.5} />, title: 'Recruitment for Startups to Enterprises' },
];

// ── FAQ ──
const FAQS = [
    { q: 'What industries do you recruit for?', a: 'We specialize in IT & Software, Healthcare, Finance, Manufacturing, Retail, Logistics, Education, Marketing, HR, and Customer Support. Our domain-specific recruiters understand the unique demands of each industry.' },
    { q: 'Do you recruit only in India?', a: 'No, we operate globally. While we have deep networks in India, our sourcing extends across North America, Europe, APAC, and the Middle East.' },
    { q: 'How quickly can you provide candidates?', a: 'For most roles, we deliver a curated shortlist within 3–5 business days. Executive and highly specialized roles may take 7–10 days.' },
    { q: 'Can you help with bulk hiring?', a: 'Yes, we have dedicated bulk hiring teams and scalable pipelines designed for high-volume recruitment campaigns.' },
    { q: 'Do you recruit technical professionals?', a: 'Absolutely. Technical recruitment is one of our core strengths — from junior developers to CTO-level leadership.' },
];

export default function TalentSourcingPage() {
    const [form, setForm] = useState({ fullName: '', workEmail: '', companyName: '', phone: '', jobTitle: '', hiringLocation: '', message: '' });
    const [submitted, setSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hoveredIndustryIndex, setHoveredIndustryIndex] = useState<number | null>(null);
    const [supportsHover, setSupportsHover] = useState(false);
    const industriesSectionRef = useRef<HTMLDivElement>(null);

    // Track touch device capability
    useEffect(() => {
        const mediaQuery = window.matchMedia('(hover: hover)');
        setSupportsHover(mediaQuery.matches);
        
        const handler = (e: MediaQueryListEvent) => setSupportsHover(e.matches);
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, []);

    // Coordinates for the follower card
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    // Spring configuration for smooth lag/inertia
    const springConfig = { damping: 25, stiffness: 220, mass: 0.6 };
    const x = useSpring(mouseX, springConfig);
    const y = useSpring(mouseY, springConfig);

    // Calculate velocity-based rotation
    const xVelocity = useVelocity(mouseX);
    const rotateRaw = useTransform(xVelocity, [-2000, 2000], [-10, 10]);
    const rotate = useSpring(rotateRaw, { damping: 20, stiffness: 200 });

    const handleMouseMove = (e: React.MouseEvent) => {
        mouseX.set(e.clientX - 160);
        mouseY.set(e.clientY - 210);
    };

    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

    React.useEffect(() => {
        const timer = setInterval(() => {
            setCurrentSlideIndex((prev) => (prev + 1) % HERO_SLIDES.length);
        }, 4000);
        return () => clearInterval(timer);
    }, []);

    React.useEffect(() => {
        if (typeof window !== 'undefined') {
            document.title = "Talent Sourcing & Recruitment Services | TalentMesh Solutions";
        }
    }, []);

    const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await fetch('https://api.web3forms.com/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    access_key: process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY || '',
                    subject: `New Sourcing Request from ${form.companyName}`,
                    from_name: 'TalentMesh Sourcing',
                    name: form.fullName,
                    email: form.workEmail,
                    company: form.companyName,
                    phone: form.phone,
                    job_title: form.jobTitle,
                    hiring_location: form.hiringLocation,
                    message: form.message
                }),
            });

            if (res.ok) {
                setSubmitted(true);
            } else {
                setSubmitted(true);
            }
        } catch {
            setSubmitted(true);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className={styles.page}>
            {/* ── Ambient Background Blobs (4–6% opacity) ── */}
            <div className={styles.ambientBlobs} aria-hidden="true">
                <div className={styles.blob1} />
                <div className={styles.blob2} />
                <div className={styles.blob3} />
                <div className={styles.blob4} />
            </div>

            {/* ═══════════════════════════════════════════
                  HERO
               ═══════════════════════════════════════════ */}
            <section className={styles.hero}>
                <div className="premium-container">
                    <div className={styles.heroGrid}>
                        <div className={styles.heroContent}>
                            <div className={styles.heroBadge}>Talent Sourcing & Recruitment Services</div>
                            <h1 className={styles.heroTitle}>
                                Talent Sourcing & Recruitment <br />
                                <span className={styles.highlight}>Services for Growing Businesses</span>
                            </h1>
                            <p className={styles.heroSub}>
                                Find qualified professionals faster with TalentMesh Solutions. We help companies hire skilled talent across IT, Sales, Marketing, Finance, Healthcare, Manufacturing and more.
                            </p>
                            <div className={styles.heroActions}>
                                <button className={styles.btnPrimary} onClick={() => document.getElementById('sourcing-form')?.scrollIntoView({ behavior: 'smooth' })}>
                                    Request Talent <ArrowRight size={18} />
                                </button>
                                <button className={styles.btnOutline} onClick={() => document.getElementById('sourcing-form')?.scrollIntoView({ behavior: 'smooth' })}>
                                    Talk to Our Experts
                                </button>
                            </div>
                        </div>
                        <div className={styles.heroVisual}>
                            <div className={styles.heroImageCard}>
                                <div className={styles.heroImageWrap}>
                                    <div className={styles.dashboardContainer}>
                                        {/* Header */}
                                        <div className={styles.dashHeader}>
                                            <div className={styles.dashTitleWrap}>
                                                <div className={styles.dashLogoDot} />
                                                <span className={styles.dashTitle}>TalentMesh Sourcing Hub</span>
                                                <span className={styles.dashBadge}>● AI Active</span>
                                            </div>
                                            <div className={styles.dashMetricsSummary}>
                                                Avg Time-to-Hire: <strong>14 Days</strong> (60% Faster)
                                            </div>
                                        </div>

                                        {/* Filter Pills */}
                                        <div className={styles.dashFilters}>
                                            <div className={styles.filterChipActive}>All Candidates (48)</div>
                                            <div className={styles.filterChip}>Engineering & Tech</div>
                                            <div className={styles.filterChip}>Sales & Growth</div>
                                            <div className={styles.filterChip}>Leadership</div>
                                        </div>

                                        {/* Candidate Cards Grid */}
                                        <div className={styles.dashGrid}>
                                            <div className={styles.candidateCard}>
                                                <div className={styles.candHeader}>
                                                    <div className={styles.avatarWrap}>
                                                        <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80" alt="Sarah Chen" />
                                                    </div>
                                                    <div className={styles.candMeta}>
                                                        <h4>Sarah Chen</h4>
                                                        <p>Senior Frontend Engineer • 7 yrs experience</p>
                                                    </div>
                                                    <div className={styles.matchBadge}>98% Match</div>
                                                </div>
                                                <div className={styles.tagRow}>
                                                    <span>React.js</span>
                                                    <span>TypeScript</span>
                                                    <span>Next.js</span>
                                                    <span className={styles.verifiedTag}>✓ Skills Verified</span>
                                                </div>
                                            </div>

                                            <div className={styles.candidateCard}>
                                                <div className={styles.candHeader}>
                                                    <div className={styles.avatarWrap}>
                                                        <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80" alt="Michael Smith" />
                                                    </div>
                                                    <div className={styles.candMeta}>
                                                        <h4>Michael Smith</h4>
                                                        <p>Lead DevOps Architect • 9 yrs experience</p>
                                                    </div>
                                                    <div className={styles.matchBadge}>95% Match</div>
                                                </div>
                                                <div className={styles.tagRow}>
                                                    <span>AWS</span>
                                                    <span>Kubernetes</span>
                                                    <span>Docker</span>
                                                    <span className={styles.verifiedTag}>✓ Background Cleared</span>
                                                </div>
                                            </div>

                                            <div className={styles.candidateCard}>
                                                <div className={styles.candHeader}>
                                                    <div className={styles.avatarWrap}>
                                                        <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80" alt="Chloe Adams" />
                                                    </div>
                                                    <div className={styles.candMeta}>
                                                        <h4>Chloe Adams</h4>
                                                        <p>Senior Product Designer • 6 yrs experience</p>
                                                    </div>
                                                    <div className={styles.matchBadge}>92% Match</div>
                                                </div>
                                                <div className={styles.tagRow}>
                                                    <span>Figma</span>
                                                    <span>Design Systems</span>
                                                    <span>UI/UX</span>
                                                    <span className={styles.verifiedTag}>✓ Portfolio Screened</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={styles.trustGrid}>
                        {TRUST_BADGES.map((b, i) => (
                            <div key={i} className={styles.trustBadge}>
                                <span className={styles.trustIcon}>{b.icon}</span>
                                <span className={styles.trustLabel}>{b.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════
                  WHY COMPANIES CHOOSE
               ═══════════════════════════════════════════ */}
            <AnimateOnScroll animation="fadeUp">
                <section className={styles.whyChooseBannerSection}>
                    <div className="premium-container">
                        <h2 className={styles.whyChooseBannerTitle}>Why Companies Choose TalentMesh</h2>
                        <div className={styles.whyChooseBannerRow}>
                            {WHY_CHOOSE.map((item, i) => (
                                <React.Fragment key={i}>
                                    <div className={styles.whyChooseBannerItem}>
                                        <div className={styles.whyChooseBannerIcon}>{item.icon}</div>
                                        <span className={styles.whyChooseBannerLabel}>{item.title}</span>
                                    </div>
                                    {i < WHY_CHOOSE.length - 1 && (
                                        <div className={styles.whyChooseBannerDivider} />
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                </section>
            </AnimateOnScroll>

            {/* ═══════════════════════════════════════════
                  THE CHALLENGE
               ═══════════════════════════════════════════ */}
            <AnimateOnScroll animation="fadeUp">
                <section className={styles.section}>
                    <div className="premium-container">
                        <div className={styles.challengeGrid}>
                            <div className={styles.challengeContent}>
                                <span className={styles.challengeTag}>THE CHALLENGE</span>
                                <h2 className={styles.challengeTitle}>
                                    Hiring the Right Talent <br />
                                    Shouldn&apos;t Slow Down <br />
                                    Your Business
                                </h2>
                                <p className={styles.challengeText}>
                                    Recruitment takes time. Posting jobs, screening hundreds of resumes, scheduling interviews, and following up with candidates can delay business growth.
                                </p>
                                <p className={styles.challengeText}>
                                    TalentMesh Solutions acts as your recruitment partner, handling the sourcing process so your hiring managers can focus on selecting the best candidates instead of searching for one.
                                </p>
                            </div>
                            <div className={styles.challengeVisual}>
                                <div className={styles.challengeImageCard}>
                                    <div className={styles.browserHeader}>
                                        <div className={styles.browserDot} />
                                        <div className={styles.browserDot} />
                                        <div className={styles.browserDot} />
                                    </div>
                                    <div className={styles.challengeImageWrap}>
                                        <Image
                                            src="/sourcing_challenge_polite_positive.png"
                                            alt="Polite & Positive Executive Recruitment Team Collaboration"
                                            width={440}
                                            height={260}
                                            className={styles.challengeImgAsset}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </AnimateOnScroll>

            {/* ═══════════════════════════════════════════
                  RECRUITMENT SERVICES
               ═══════════════════════════════════════════ */}
            <AnimateOnScroll animation="fadeUp">
                <section className={styles.section}>
                    <div className="premium-container">
                        <h2 className={styles.sectionTitle}>Recruitment Services We Offer</h2>
                        <div className={styles.servicesGrid}>
                            {SERVICES.map((s, i) => (
                                <div key={i} className={`${styles.serviceCard} glass-card`}>
                                    <div className={styles.serviceIconWrap}>{s.icon}</div>
                                    <h3 className={styles.serviceTitle}>{s.title}</h3>
                                    <p className={styles.serviceDesc}>{s.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </AnimateOnScroll>

            {/* ═══════════════════════════════════════════
                  RECRUITMENT PROCESS
               ═══════════════════════════════════════════ */}
            <AnimateOnScroll animation="fadeUp">
                <section className={styles.processSection}>
                    <div className={styles.sectionInner}>
                        <div className={styles.sectionHeader}>
                            <div className={styles.sectionBadge}>Timeline</div>
                            <h2 className={styles.sectionTitle}>
                                Our Recruitment <span className={styles.highlightText}>Process</span>
                            </h2>
                            <p className={styles.sectionDesc}>
                                From understanding your hiring needs to making the final offer, our structured process ensures top-tier talent for your team.
                            </p>
                        </div>

                        <div className={styles.timelineWrapper}>
                            <div className={styles.timelineLine} />
                            <div className={styles.timelineSteps}>
                                {PROCESS_STEPS.map((step, idx) => (
                                    <div key={idx} className={styles.timelineStep}>
                                        <div className={styles.timelineNode}>
                                            <span className={styles.timelineNodeNumber}>{step.n}</span>
                                        </div>
                                        <h3 className={styles.timelineStepTitle}>
                                            {step.prefix} <span className={styles.stepHighlight}>{step.highlight}</span>
                                        </h3>
                                        <p className={styles.timelineStepDesc}>{step.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>
            </AnimateOnScroll>

            {/* ═══════════════════════════════════════════
                  INDUSTRIES
               ═══════════════════════════════════════════ */}
            <AnimateOnScroll animation="fadeUp">
                <section 
                    className={styles.section}
                    ref={industriesSectionRef}
                    onMouseMove={handleMouseMove}
                >
                    <div className="premium-container">
                        <h2 className={styles.sectionTitle}>Recruitment Solutions Across Multiple Industries</h2>
                        <p className={styles.sectionSubtitle}>We recruit skilled professionals across a wide range of industries.</p>
                        <div className={styles.industriesContainer}>
                            {INDUSTRY_ROWS.map((row, rIdx) => (
                                <div key={rIdx} className={styles.industryRow}>
                                    {row.map((ind) => (
                                        <div
                                            key={ind.id}
                                            className={styles.industryTag}
                                            style={{ '--hover-color': ind.color } as React.CSSProperties}
                                            onMouseEnter={() => setHoveredIndustryIndex(ind.id)}
                                            onMouseLeave={() => setHoveredIndustryIndex(null)}
                                        >
                                            <span className={styles.tagIcon}>{ind.icon}</span>
                                            <span className={styles.tagName}>{ind.label}</span>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Preload images in background to avoid rendering delay */}
                    <div style={{ display: 'none' }} aria-hidden="true">
                        {FLAT_INDUSTRIES.map((ind, i) => (
                            <img key={i} src={ind.image} alt="" />
                        ))}
                    </div>

                    {/* Hover Follower Image Card */}
                    <AnimatePresence>
                        {supportsHover && hoveredIndustryIndex !== null && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ type: 'spring', damping: 25, stiffness: 250 }}
                                style={{
                                    position: 'fixed',
                                    left: 0,
                                    top: 0,
                                    x,
                                    y,
                                    rotate,
                                    width: 320,
                                    height: 200,
                                    pointerEvents: 'none',
                                    zIndex: 9999,
                                    overflow: 'hidden',
                                    borderRadius: '16px',
                                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 8px 16px -8px rgba(0, 0, 0, 0.15)',
                                    border: '1px solid rgba(255, 255, 255, 0.3)',
                                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                    backdropFilter: 'blur(8px)',
                                }}
                            >
                                <motion.img
                                    src={FLAT_INDUSTRIES[hoveredIndustryIndex].image}
                                    alt={FLAT_INDUSTRIES[hoveredIndustryIndex].label}
                                    initial={{ scale: 1.15 }}
                                    animate={{ scale: 1 }}
                                    exit={{ scale: 1.15 }}
                                    transition={{ duration: 0.35, ease: 'easeOut' }}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                    }}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </section>
            </AnimateOnScroll>

            {/* ═══════════════════════════════════════════
                  WHY PARTNER
               ═══════════════════════════════════════════ */}
            <AnimateOnScroll animation="fadeUp">
                <section className={styles.whyPartnerBannerSection}>
                    <div className="premium-container">
                        <h2 className={styles.whyPartnerBannerTitle}>Why Partner with TalentMesh?</h2>
                        <div className={styles.whyPartnerBannerRow}>
                            {WHY_PARTNER.map((item, i) => (
                                <React.Fragment key={i}>
                                    <div className={styles.whyPartnerBannerItem}>
                                        <div className={styles.whyPartnerBannerIcon}>{item.icon}</div>
                                        <span className={styles.whyPartnerBannerLabel}>{item.title}</span>
                                    </div>
                                    {i < WHY_PARTNER.length - 1 && (
                                        <div className={styles.whyPartnerBannerDivider} />
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                </section>
            </AnimateOnScroll>

            {/* ═══════════════════════════════════════════
                  FAQ
               ═══════════════════════════════════════════ */}
            <AnimateOnScroll animation="fadeUp">
                <section className={styles.section} id="faq">
                    <div className="premium-container">
                        <h2 className={styles.sectionTitle}>Frequently Asked <span className={styles.highlight}>Questions</span></h2>
                        <div className="max-w-3xl mx-auto mt-8">
                            <MotionAccordion
                                items={FAQS.map(f => ({ question: f.q, answer: f.a }))}
                                gap={12}
                                itemClassName={styles.faqAccordionItem}
                            />
                        </div>
                    </div>
                </section>
            </AnimateOnScroll>

            {/* ═══════════════════════════════════════════
                  CTA / FORM
               ═══════════════════════════════════════════ */}
            <AnimateOnScroll animation="fadeUp">
                <section className={styles.formSection} id="sourcing-form">
                    <div className="premium-container">
                        <div className={styles.formGrid}>
                            <div className={styles.formInfo}>
                                <span className={styles.formTag}>READY TO HIRE?</span>
                                <h2 className={styles.formTitle}>Looking for the <br /><span className={styles.highlight}>Right Talent?</span></h2>
                                <p className={styles.formText}>
                                    Whether you are hiring for your first employee or expanding an entire department, our recruitment specialists are ready to help you find qualified candidates faster.
                                </p>
                                <div className={styles.formContact}>
                                    <div className={styles.formContactItem}>
                                        <Phone size={18} />
                                        <span>+91 98981 61106</span>
                                    </div>
                                    <div className={styles.formContactItem}>
                                        <Mail size={18} />
                                        <span>info@talentmeshsolutions.com</span>
                                    </div>
                                    <div className={styles.formContactItem}>
                                        <MapPin size={18} />
                                        <span>Ahmedabad, India</span>
                                    </div>
                                </div>
                                <div className={styles.formTrust}>
                                    <Clock3 size={16} />
                                    <span>We will respond within 24 hours of receiving your request</span>
                                </div>
                            </div>

                            <div className={styles.formCard}>
                                {submitted ? (
                                    <div className={styles.successState}>
                                        <div className={styles.successCircle}>✓</div>
                                        <h3 className={styles.successTitle}>Request Received!</h3>
                                        <p className={styles.successDesc}>A member of our sourcing team will contact you within 24 hours.</p>
                                        <div className={styles.successBadge}>
                                            <Clock3 size={14} style={{ marginRight: '6px' }} />
                                            <span>24hr Response Guaranteed</span>
                                        </div>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmit} className={styles.form}>
                                        <h3 className={styles.formCardTitle}>Request Recruitment Assistance</h3>
                                        <div className={styles.fieldRow}>
                                            <div className={styles.field}>
                                                <label className={styles.lbl}>Full Name *</label>
                                                <input required className={styles.input} placeholder="John Doe" value={form.fullName} onChange={e => set('fullName', e.target.value)} />
                                            </div>
                                            <div className={styles.field}>
                                                <label className={styles.lbl}>Work Email *</label>
                                                <input required type="email" className={styles.input} placeholder="john@company.com" value={form.workEmail} onChange={e => set('workEmail', e.target.value)} />
                                            </div>
                                        </div>
                                        <div className={styles.fieldRow}>
                                            <div className={styles.field}>
                                                <label className={styles.lbl}>Company Name *</label>
                                                <input required className={styles.input} placeholder="Acme Corp" value={form.companyName} onChange={e => set('companyName', e.target.value)} />
                                            </div>
                                            <div className={styles.field}>
                                                <label className={styles.lbl}>Phone Number</label>
                                                <input type="tel" className={styles.input} placeholder="+91 98981 61106" value={form.phone} onChange={e => set('phone', e.target.value)} />
                                            </div>
                                        </div>
                                        <div className={styles.fieldRow}>
                                            <div className={styles.field}>
                                                <label className={styles.lbl}>Job Title / Position *</label>
                                                <input required className={styles.input} placeholder="e.g. Senior React Developer" value={form.jobTitle} onChange={e => set('jobTitle', e.target.value)} />
                                            </div>
                                            <div className={styles.field}>
                                                <label className={styles.lbl}>Hiring Location</label>
                                                <input className={styles.input} placeholder="e.g. Bangalore, Remote" value={form.hiringLocation} onChange={e => set('hiringLocation', e.target.value)} />
                                            </div>
                                        </div>
                                        <div className={styles.field}>
                                            <label className={styles.lbl}>Tell us about your hiring needs</label>
                                            <textarea className={styles.textarea} rows={4} placeholder="Describe the role, required skills, timeline, budget, and any other details..." value={form.message} onChange={e => set('message', e.target.value)} />
                                        </div>
                                        <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                                            {isSubmitting ? 'Submitting...' : 'Request Recruitment Assistance'}
                                        </button>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>
                </section>
            </AnimateOnScroll>
        </main>
    );
}
