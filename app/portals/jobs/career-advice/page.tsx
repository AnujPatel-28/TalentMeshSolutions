'use client';
import React, { useState } from 'react';
import AnimateOnScroll from '@/components/AnimateOnScroll';
import { CTA } from '@/components/sections';
import styles from './career-advice.module.css';
import { CustomSelect } from '@/components/ui';
import { 
    Clock, 
    Check, 
    ChevronDown,
    User,
    FileText,
    MessageSquare,
    Briefcase
} from 'lucide-react';

// ─── Form Options & Data ──────────────────────────────────────────────────────
const CURRENT_STATUS = ['Actively Looking', 'Passively Exploring', 'Recently Laid Off', 'Fresh Graduate', 'Career Changer', 'Currently Employed'];
const EXP_YEARS = ['0–1 years', '1–3 years', '3–5 years', '5–10 years', '10+ years'];
const HELP_OPTIONS = ['Resume Review', 'Interview Prep', 'Job Search Strategy', 'Career Switching Advice', 'Salary Negotiation', 'LinkedIn Optimisation', 'Other'];
const CONTACT_TIMES = ['Morning', 'Afternoon', 'Evening'];
const CONTACT_METHODS = ['Call', 'Email', 'WhatsApp'];

// ─── FAQ Data ─────────────────────────────────────────────────────────────────
const FAQS = [
    {
        q: "How much does career advice cost?",
        a: "Our initial career consultation and recommendations are completely free. We believe in helping professionals find their footing and navigate their career journeys with confidence."
    },
    {
        q: "Who can request guidance?",
        a: "Anyone looking to grow in their career can request guidance. Whether you are a student, a fresh graduate, a mid-career professional, or planning a complete career pivot, our team is equipped to support you."
    },
    {
        q: "How long does it take to receive a response?",
        a: "Our recruitment specialists review submissions daily. You can typically expect a personalized response or contact within 24 to 48 hours."
    },
    {
        q: "Can experienced professionals also apply?",
        a: "Yes, absolutely. We assist professionals at all stages of their journey, including senior engineers, product leaders, managers, and strategy consultants who want to optimize their market positioning."
    },
    {
        q: "Will someone review my resume?",
        a: "Yes. During our review process, we will analyze your resume against industry standards and provide actionable feedback on formatting, keywords, and impact statements."
    },
    {
        q: "Can I ask interview-related questions?",
        a: "Certainly! We help candidates prepare for both behavioral and technical interviews, including mock interview tips and common recruiter question breakdowns."
    },
    {
        q: "Do you guarantee job placement?",
        a: "While we do not guarantee immediate job placement, our practical advice and resume reviews are designed to maximize your interview conversion rate and connect you with matching open roles in our network."
    }
];

const VALUE_STEPS = [
    { 
        num: '01', 
        title: 'Personalized Guidance',    
        desc: 'Get one-on-one career guidance tailored to your background, goals, and market opportunities.', 
        image: '/illu1.png',
        features: ['Industry-specific insights', 'Personalized career roadmap', 'Actionable next steps'],
        iconName: 'User'
    },
    { 
        num: '02', 
        title: 'Expert Resume Review', 
        desc: 'Get actionable, honest feedback that makes your application stand out.', 
        image: '/illu 2.png',
        features: ['Format and keyword optimization', 'LinkedIn profile polish', 'Recruiter-ready audit report'],
        iconName: 'FileText'
    },
    { 
        num: '03', 
        title: 'Interview Preparation',    
        desc: 'Mock interviews, common questions, and insider recruiter expectations.', 
        image: '/illu3.png',
        features: ['Mock interview practice', 'Common recruiter questions', 'Negotiation coaching'],
        iconName: 'MessageSquare'
    },
    { 
        num: '04', 
        title: 'Access to Opportunities',          
        desc: 'Build a clear roadmap for long-term growth, not just the next job.', 
        image: '/illu4.png',
        features: ['Long-term growth blueprint', 'Market demand analysis', 'Transition strategy planning'],
        iconName: 'Briefcase'
    },
];

const renderIcon = (name: string) => {
    switch (name) {
        case 'User': return <User size={24} className={styles.stepIcon} />;
        case 'FileText': return <FileText size={24} className={styles.stepIcon} />;
        case 'MessageSquare': return <MessageSquare size={24} className={styles.stepIcon} />;
        case 'Briefcase': return <Briefcase size={24} className={styles.stepIcon} />;
        default: return null;
    }
};

export default function CareerAdvicePage() {
    // ─── Consultation Request Form State ───
    const [form, setForm] = useState({
        fullName: '', email: '', phone: '', status: '', currentTitle: '', industry: '', expYears: '',
        contactTime: '', contactMethod: '', situation: ''
    });
    const [helpNeeds, setHelpNeeds] = useState<string[]>([]);
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    // ─── Value Showcase (Scroll-Pinned Storytelling) ───
    const sectionRef = React.useRef<HTMLDivElement>(null);
    const whySectionIntroRef = React.useRef<HTMLDivElement>(null);
    const layoutRef = React.useRef<HTMLDivElement>(null);
    const maskRef = React.useRef<HTMLDivElement>(null);
    const trackRef = React.useRef<HTMLDivElement>(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const [isMobile, setIsMobile] = useState(false);
    const [dimensions, setDimensions] = useState({
        introHeight: 0,
        layoutHeight: 0,
        stickyScrollDistance: 0,
    });

    const activeStep = VALUE_STEPS[activeIndex];

    React.useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 1024);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    const dimensionsRef = React.useRef(dimensions);
    React.useEffect(() => {
        dimensionsRef.current = dimensions;
    }, [dimensions]);

    // Dynamically measure layout metrics safely on mount/resize
    React.useEffect(() => {
        if (isMobile) return;

        const intro = whySectionIntroRef.current;
        const layout = layoutRef.current;
        if (!intro || !layout) return;

        const measure = () => {
            const introH = intro.offsetHeight;
            const layoutH = layout.offsetHeight;
            const stickyScrollDistance = VALUE_STEPS.length * 250; // 1000px total scroll travel

            setDimensions({
                introHeight: introH,
                layoutHeight: layoutH,
                stickyScrollDistance,
            });
        };

        // Measure on mount and check again once styles settle
        measure();
        const timer = setTimeout(measure, 150);

        window.addEventListener('resize', measure);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', measure);
        };
    }, [isMobile]);

    // Track scroll position to update active index dynamically
    React.useEffect(() => {
        if (isMobile) return;

        const handleScroll = () => {
            const element = sectionRef.current;
            if (!element) return;
            const rect = element.getBoundingClientRect();
            const { introHeight, stickyScrollDistance } = dimensionsRef.current;
            
            // Pinned phase starts when top of sticky container reaches top: 80px
            const scrolledInSticky = 80 - rect.top - introHeight;
            
            if (stickyScrollDistance <= 0) return;
            
            const stickyProgress = Math.max(0, Math.min(1, scrolledInSticky / stickyScrollDistance));
            const idx = Math.min(VALUE_STEPS.length - 1, Math.floor(stickyProgress * VALUE_STEPS.length));
            setActiveIndex(idx);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, [isMobile]);

    // Mobile swipe carousel tracking
    React.useEffect(() => {
        if (!isMobile) return;
        const mask = maskRef.current;
        if (!mask) return;
        const observer = new IntersectionObserver(
            (entries) => {
                for (const e of entries) {
                    if (e.isIntersecting) {
                        setActiveIndex(Number((e.target as HTMLElement).getAttribute('data-card-index')));
                    }
                }
            },
            { root: mask, threshold: 0.6 }
        );
        const cards = mask.querySelectorAll('[data-card-index]');
        cards.forEach(c => observer.observe(c));
        return () => observer.disconnect();
    }, [isMobile]);

    const scrollToStep = (idx: number) => {
        if (isMobile) {
            const mask = maskRef.current;
            if (!mask) return;
            const card = mask.querySelector(`[data-card-index="${idx}"]`) as HTMLElement;
            if (card) {
                mask.scrollTo({
                    left: card.offsetLeft + card.offsetWidth / 2 - mask.clientWidth / 2,
                    behavior: 'smooth'
                });
            }
            return;
        }
        const element = sectionRef.current;
        if (!element) return;
        const rect = element.getBoundingClientRect();
        
        const N = VALUE_STEPS.length;
        const targetProgress = (idx + 0.5) / N;
        
        const targetScrollY = window.scrollY + rect.top - 80 + dimensions.introHeight + targetProgress * dimensions.stickyScrollDistance;
        window.scrollTo({ top: targetScrollY, behavior: 'smooth' });
    };

    const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
            e.preventDefault();
            scrollToStep(Math.min(VALUE_STEPS.length - 1, index + 1));
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
            e.preventDefault();
            scrollToStep(Math.max(0, index - 1));
        }
    };

    const sectionHeight = isMobile
        ? undefined
        : dimensions.introHeight && dimensions.layoutHeight && dimensions.stickyScrollDistance
        ? `${dimensions.introHeight + dimensions.layoutHeight + dimensions.stickyScrollDistance}px`
        : '150vh';

    const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
    const toggleHelp = (h: string) => setHelpNeeds(p => p.includes(h) ? p.filter(x => x !== h) : [...p, h]);
    const toggleFaq = (idx: number) => setOpenFaq(openFaq === idx ? null : idx);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch('https://api.web3forms.com/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    access_key: process.env.NEXT_PUBLIC_CAREER_ADVICE_ACCESS_KEY || '',
                    name: form.fullName,
                    email: form.email,
                    phone: form.phone || 'N/A',
                    status: form.status,
                    currentTitle: form.currentTitle,
                    industry: form.industry,
                    expYears: form.expYears,
                    contactTime: form.contactTime || 'N/A',
                    contactMethod: form.contactMethod || 'N/A',
                    situation: form.situation,
                    helpNeeds: helpNeeds.join(', '),
                    subject: `New Career Advice Form Submission from ${form.fullName}`,
                    from_name: 'TalentMesh Career Advice Form',
                }),
            });

            if (response.ok) {
                setSubmitted(true);
            } else {
                const errorData = await response.text();
                console.error('Server responded with error:', errorData);
                alert(`Server Error: ${response.status}. Please try again later.`);
            }
        } catch (error) {
            console.error('CRITICAL: Connection failed.', error);
            alert('Connection failed. This is usually due to an Ad-Blocker or a CORS security block in your browser. Check the Console (F12) for details.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className={styles.page}>
            {/* Background overlays */}
            <div className={styles.bgWrapper}>
                <div className={styles.bgImage} />
                <div className={styles.bgOverlay} />
            </div>

            {/* ── 1. HERO SECTION (ABOVE THE FOLD) ── */}
            <section className={styles.heroSection}>
                <div className="premium-container">
                    <div className={styles.heroInner}>
                        <h1 className={styles.heroTitle}>
                            Get Personalized Career Advice That <span className={styles.highlightText}>Helps You Move Forward</span>
                        </h1>
                        <p className={styles.heroSubtitle}>
                            Whether you're searching for your first job, planning a career switch, improving your resume, or preparing for interviews, our team provides practical guidance tailored to your goals.
                        </p>
                        <div className={styles.trustIndicators}>
                            <div className={styles.trustItem}>
                                <svg className={styles.trustIcon} viewBox="0 0 100 100">
                                    <g fill="#15D330">
                                        <circle cx="50" cy="50" r="33" />
                                        <circle cx="82" cy="50" r="11" />
                                        <circle cx="77.71" cy="66" r="11" />
                                        <circle cx="66" cy="77.71" r="11" />
                                        <circle cx="50" cy="82" r="11" />
                                        <circle cx="34" cy="77.71" r="11" />
                                        <circle cx="22.29" cy="66" r="11" />
                                        <circle cx="18" cy="50" r="11" />
                                        <circle cx="22.29" cy="34" r="11" />
                                        <circle cx="34" cy="22.29" r="11" />
                                        <circle cx="50" cy="18" r="11" />
                                        <circle cx="66" cy="22.29" r="11" />
                                        <circle cx="77.71" cy="34" r="11" />
                                    </g>
                                    <polyline points="32,53 45,66 72,36" fill="none" stroke="white" strokeWidth={11} strokeLinecap="butt" strokeLinejoin="miter" />
                                </svg>
                                <span className={styles.trustText}>Free Career Guidance</span>
                            </div>
                            <div className={styles.trustItem}>
                                <svg className={styles.trustIcon} viewBox="0 0 100 100">
                                    <g fill="#15D330">
                                        <circle cx="50" cy="50" r="33" />
                                        <circle cx="82" cy="50" r="11" />
                                        <circle cx="77.71" cy="66" r="11" />
                                        <circle cx="66" cy="77.71" r="11" />
                                        <circle cx="50" cy="82" r="11" />
                                        <circle cx="34" cy="77.71" r="11" />
                                        <circle cx="22.29" cy="66" r="11" />
                                        <circle cx="18" cy="50" r="11" />
                                        <circle cx="22.29" cy="34" r="11" />
                                        <circle cx="34" cy="22.29" r="11" />
                                        <circle cx="50" cy="18" r="11" />
                                        <circle cx="66" cy="22.29" r="11" />
                                        <circle cx="77.71" cy="34" r="11" />
                                    </g>
                                    <polyline points="32,53 45,66 72,36" fill="none" stroke="white" strokeWidth={11} strokeLinecap="butt" strokeLinejoin="miter" />
                                </svg>
                                <span className={styles.trustText}>Personalized Recommendations</span>
                            </div>
                            <div className={styles.trustItem}>
                                <svg className={styles.trustIcon} viewBox="0 0 100 100">
                                    <g fill="#15D330">
                                        <circle cx="50" cy="50" r="33" />
                                        <circle cx="82" cy="50" r="11" />
                                        <circle cx="77.71" cy="66" r="11" />
                                        <circle cx="66" cy="77.71" r="11" />
                                        <circle cx="50" cy="82" r="11" />
                                        <circle cx="34" cy="77.71" r="11" />
                                        <circle cx="22.29" cy="66" r="11" />
                                        <circle cx="18" cy="50" r="11" />
                                        <circle cx="22.29" cy="34" r="11" />
                                        <circle cx="34" cy="22.29" r="11" />
                                        <circle cx="50" cy="18" r="11" />
                                        <circle cx="66" cy="22.29" r="11" />
                                        <circle cx="77.71" cy="34" r="11" />
                                    </g>
                                    <polyline points="32,53 45,66 72,36" fill="none" stroke="white" strokeWidth={11} strokeLinecap="butt" strokeLinejoin="miter" />
                                </svg>
                                <span className={styles.trustText}>Response from Recruitment Professionals</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── 2. FORM SECTION ── */}
            <section id="advice-form" className={styles.consultationSection}>
                <div className="premium-container">
                    <div className={styles.formLayout}>
                        {/* Glassmorphic styled form card */}
                        <div className={`${styles.glassCard} ${styles.formCard}`}>
                            {submitted ? (
                                <div className={styles.successState}>
                                    <div className={styles.successIco}>
                                        <Check size={28} />
                                    </div>
                                    <h2 className={styles.successTitle}>Request Received!</h2>
                                    <p className={styles.successDesc}>
                                        Thank you, <strong>{form.fullName || 'there'}</strong>. Our recruitment team evaluates your query and will respond with practical recommendations to help you take the next step.
                                    </p>
                                    <div className={styles.successBadge}>
                                        <Clock size={16} /> <span>24–48 hr response</span>
                                    </div>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className={styles.form} noValidate>
                                    <h2 className={styles.formTitle}>Request My <span className={styles.highlightText}>Career Advice</span></h2>
                                    <p className={styles.formNote}>All fields required unless marked <em>(optional)</em></p>

                                    <div className={styles.formTrustNote}>
                                        <Clock size={16} />
                                        <span>Our team typically responds within <strong>24–48 hours.</strong></span>
                                    </div>

                                    {/* SECTION 1: CONTACT INFO */}
                                    <div className={styles.formSectionHeader}>
                                        <span className={styles.formSectionNumber}>01</span>
                                        <h3 className={styles.formSectionTitle}>Contact Information</h3>
                                    </div>
                                    <div className={styles.formSectionDivider} />

                                    <div className={styles.fieldRow}>
                                        <div className={styles.field}>
                                            <label className={styles.label}>Full Name</label>
                                            <input required className={styles.input} type="text" placeholder="Jane Smith" value={form.fullName} onChange={e => set('fullName', e.target.value)} />
                                        </div>
                                        <div className={styles.field}>
                                            <label className={styles.label}>Email Address</label>
                                            <input required className={styles.input} type="email" placeholder="jane@example.com" value={form.email} onChange={e => set('email', e.target.value)} />
                                        </div>
                                    </div>

                                    <div className={styles.field}>
                                        <label className={styles.label}>Phone Number <em className={styles.optional}>(optional)</em></label>
                                        <input className={styles.input} type="tel" placeholder="+1 555 000 0000" value={form.phone} onChange={e => set('phone', e.target.value)} />
                                    </div>

                                    {/* SECTION 2: CAREER PROFILE */}
                                    <div className={styles.formSectionHeader}>
                                        <span className={styles.formSectionNumber}>02</span>
                                        <h3 className={styles.formSectionTitle}>Career Profile</h3>
                                    </div>
                                    <div className={styles.formSectionDivider} />

                                    <div className={styles.fieldRow}>
                                        <div className={styles.field}>
                                            <label className={styles.label}>Current Status</label>
                                            <CustomSelect
                                                className={styles.select}
                                                value={form.status}
                                                onChange={e => set('status', (e as any).target.value)}
                                                placeholder="Select status"
                                                options={CURRENT_STATUS.map(s => ({ label: s, value: s }))}
                                                required
                                            />
                                        </div>
                                        <div className={styles.field}>
                                            <label className={styles.label}>Years of Experience</label>
                                            <CustomSelect
                                                className={styles.select}
                                                value={form.expYears}
                                                onChange={e => set('expYears', (e as any).target.value)}
                                                placeholder="Select range"
                                                options={EXP_YEARS.map(e => ({ label: e, value: e }))}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className={styles.fieldRow}>
                                        <div className={styles.field}>
                                            <label className={styles.label}>Current Job Title</label>
                                            <input required className={styles.input} type="text" placeholder="e.g. Software Engineer" value={form.currentTitle} onChange={e => set('currentTitle', e.target.value)} />
                                        </div>
                                        <div className={styles.field}>
                                            <label className={styles.label}>Industry / Domain of Interest</label>
                                            <input required className={styles.input} type="text" placeholder="e.g. FinTech, Creative" value={form.industry} onChange={e => set('industry', e.target.value)} />
                                        </div>
                                    </div>

                                    {/* SECTION 3: CONSULTATION DETAILS */}
                                    <div className={styles.formSectionHeader}>
                                        <span className={styles.formSectionNumber}>03</span>
                                        <h3 className={styles.formSectionTitle}>Consultation Details</h3>
                                    </div>
                                    <div className={styles.formSectionDivider} />

                                    <div className={styles.field}>
                                        <label className={styles.label}>What kind of help do you need? <span className={styles.selectAll}>(select all that apply)</span></label>
                                        <div className={styles.chipGroup}>
                                            {HELP_OPTIONS.map(h => (
                                                <button type="button" key={h}
                                                    className={`${styles.helpChip} ${helpNeeds.includes(h) ? styles.helpChipActive : ''}`}
                                                    onClick={() => toggleHelp(h)}>{h}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className={styles.field}>
                                        <label className={styles.label}>Share Your Question</label>
                                        <textarea required className={styles.textarea} rows={4}
                                            placeholder="Tell us about your career goals, challenges, or the advice you're looking for..."
                                            value={form.situation} onChange={e => set('situation', e.target.value)} />
                                    </div>

                                    <div className={styles.fieldRow}>
                                        <div className={styles.field}>
                                            <label className={styles.label}>Preferred Contact Time</label>
                                            <div className={styles.radioGroup}>
                                                {CONTACT_TIMES.map(t => (
                                                    <label key={t} className={styles.radioLabel}>
                                                        <input
                                                            type="radio"
                                                            name="contactTime"
                                                            value={t}
                                                            checked={form.contactTime === t}
                                                            onChange={e => set('contactTime', e.target.value)}
                                                            className={styles.radioInput}
                                                        />
                                                        <span className={styles.radioCustom} />
                                                        {t}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                        <div className={styles.field}>
                                            <label className={styles.label}>Preferred Contact Method</label>
                                            <div className={styles.radioGroup}>
                                                {CONTACT_METHODS.map(m => (
                                                    <label key={m} className={styles.radioLabel}>
                                                        <input
                                                            type="radio"
                                                            name="contactMethod"
                                                            value={m}
                                                            checked={form.contactMethod === m}
                                                            onChange={e => set('contactMethod', e.target.value)}
                                                            className={styles.radioInput}
                                                        />
                                                        <span className={styles.radioCustom} />
                                                        {m}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <button type="submit" className={styles.submitBtn} disabled={loading}>
                                        {loading ? 'Submitting...' : 'Get Career Advice'}
                                    </button>
                                </form>
                            )}
                        </div>

                        {/* Glassmorphic styled sidebar */}
                        <div className={styles.minimalAside}>
                            <div className={`${styles.glassCard} ${styles.asideInfoCard}`}>
                                <h3 className={styles.asideTitle}>What you get</h3>
                                {['Personalised career roadmap', '1-on-1 specialist call', 'Tailored job search strategy', 'Resume & LinkedIn review tips', 'Salary benchmarking insights'].map(item => (
                                    <div key={item} className={styles.asideItem}>
                                        <span className={styles.asideCheck}><Check size={14} /></span>
                                        <span>{item}</span>
                                    </div>
                                ))}
                            </div>
                            <div className={`${styles.glassCard} ${styles.asideStatsCard}`}>
                                <div className={styles.asideStatItem}>
                                    <div className={styles.asideStatVal}>500+</div>
                                    <div className={styles.asideStatLabel}>GUIDED</div>
                                </div>
                                <div className={styles.asideStatItem}>
                                    <div className={styles.asideStatVal}>94%</div>
                                    <div className={styles.asideStatLabel}>SUCCESS</div>
                                </div>
                                <div className={styles.asideStatItem}>
                                    <div className={styles.asideStatVal}>48hr</div>
                                    <div className={styles.asideStatLabel}>RESPONSE</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── 3. HOW IT WORKS SECTION ── */}
            <section className={styles.howSection}>
                <div className="premium-container">
                    <div className={styles.sectionHeader}>
                        <span className={styles.sectionTag}>Process</span>
                        <h2 className={styles.sectionTitle}>How It Works</h2>
                    </div>

                    <div className={styles.stepsGrid}>
                        <div className={styles.stepCard}>
                            <div className={styles.stepNumber}>1</div>
                            <h3 className={styles.stepTitle}>Share Your Question</h3>
                            <p className={styles.stepDesc}>Tell us about your career goals, challenges, or the advice you're looking for.</p>
                        </div>
                        <div className={styles.stepCard}>
                            <div className={styles.stepNumber}>2</div>
                            <h3 className={styles.stepTitle}>We Review Your Request</h3>
                            <p className={styles.stepDesc}>Our recruitment team evaluates your query and identifies the most relevant guidance.</p>
                        </div>
                        <div className={styles.stepCard}>
                            <div className={styles.stepNumber}>3</div>
                            <h3 className={styles.stepTitle}>Receive Personalized Advice</h3>
                            <p className={styles.stepDesc}>We'll respond with practical recommendations to help you take the next step in your career.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── 4. WHY ASK TALENTMESH SECTION ── */}
            <section
                ref={sectionRef}
                className={styles.whySection}
                style={{ minHeight: sectionHeight }}
            >
                <div className={styles.whySectionIntro} ref={whySectionIntroRef}>
                    <span className={styles.sectionTag}>WHY PROFESSIONALS CHOOSE TALENTMESH</span>
                    <h2 className={styles.sectionTitle}>Guidance that moves your career forward</h2>
                    <p className={styles.sectionSubtitle}>Personalized advice. Expert insights. Real opportunities.</p>
                </div>

                <div className={styles.valueLayout} ref={layoutRef}>
                    {/* Desktop Layout: Unified Card wrapper */}
                    <div className={styles.showcaseCard}>
                        {/* Left side: Illustration */}
                        <div className={styles.cardImageContainer}>
                            {VALUE_STEPS.map((step, idx) => (
                                <img
                                    key={idx}
                                    src={step.image}
                                    alt={`Showcase illustration ${idx + 1}`}
                                    className={`${styles.cardImage} ${
                                        activeIndex === idx ? styles.cardImageActive : styles.cardImageInactive
                                    }`}
                                />
                            ))}
                        </div>

                        {/* Right side: Content Panel */}
                        <div className={styles.cardContent}>
                            <div className={styles.cardContentTop}>
                                <div className={styles.cardHeaderRow}>
                                    <span className={styles.cardStepNumber}>{activeStep.num}</span>
                                    <div className={styles.cardIconWrapper}>
                                        {renderIcon(activeStep.iconName)}
                                    </div>
                                </div>

                                <div className={styles.cardTextContent}>
                                    <h3 className={styles.cardTitle}>{activeStep.title}</h3>
                                    <p className={styles.cardDesc}>{activeStep.desc}</p>
                                </div>

                                <ul className={styles.featuresList}>
                                    {activeStep.features.map((feat, fIdx) => (
                                        <li key={fIdx} className={styles.featureItem}>
                                            <span className={styles.checkIcon}>
                                                <Check size={12} strokeWidth={3} />
                                            </span>
                                            <span className={styles.featureText}>{feat}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Horizontal Progress Timeline */}
                            <div className={styles.progressBarWrapper}>
                                {VALUE_STEPS.map((step, idx) => {
                                    const isActive = idx === activeIndex;
                                    const isPassed = idx < activeIndex;
                                    return (
                                        <React.Fragment key={idx}>
                                            {idx > 0 && (
                                                <div 
                                                    className={`${styles.progressLineSegment} ${
                                                        isPassed ? styles.linePassed : ''
                                                    }`} 
                                                />
                                            )}
                                            <div 
                                                className={styles.timelineNode}
                                                onClick={() => scrollToStep(idx)}
                                            >
                                                <span className={`${styles.timelineNum} ${isActive ? styles.timelineNumActive : ''}`}>
                                                    {step.num}
                                                </span>
                                                <button
                                                    className={`${styles.progressDot} ${
                                                        isActive ? styles.dotActive : isPassed ? styles.dotPassed : ''
                                                    }`}
                                                    aria-label={`Go to step ${idx + 1}`}
                                                />
                                            </div>
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Mobile: horizontal snap-scroll track */}
                    <div className={styles.mobileValueRight}>
                        <div className={styles.valueScrollMask} ref={maskRef}>
                            <div
                                className={styles.valueScrollTrack}
                                ref={trackRef}
                            >
                                {VALUE_STEPS.map((step, idx) => {
                                    const isActive = idx === activeIndex;
                                    return (
                                        <div
                                            key={idx}
                                            className={styles.mobileCard}
                                            data-card-index={idx}
                                        >
                                            <div className={styles.cardHeaderRow}>
                                                <span className={styles.cardStepNumber}>{step.num}</span>
                                                <div className={styles.cardIconWrapperMobile}>
                                                    {renderIcon(step.iconName)}
                                                </div>
                                            </div>
                                            
                                            <h3 className={styles.valueTitle}>{step.title}</h3>
                                            <p className={styles.valueDesc}>{step.desc}</p>
                                            
                                            <div className={styles.mobileCardDots}>
                                                {VALUE_STEPS.map((_, dotIdx) => (
                                                    <span 
                                                        key={dotIdx} 
                                                        className={`${styles.mobileCardDot} ${
                                                            dotIdx === idx ? styles.mobileCardDotActive : ''
                                                        }`} 
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        {/* Dot indicators below swiper for navigation */}
                        <div className={styles.mobileDots}>
                            {VALUE_STEPS.map((_, idx) => (
                                <button
                                    key={idx}
                                    className={`${styles.valueDot} ${idx === activeIndex ? styles.valueDotActive : ''}`}
                                    onClick={() => scrollToStep(idx)}
                                    aria-label={`Go to card ${idx + 1}`}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── 5. FAQ SECTION ── */}
            <section className={styles.faqSection}>
                <div className="premium-container">
                    <div className={styles.sectionHeader}>
                        <span className={styles.sectionTag}>FAQs</span>
                        <h2 className={styles.sectionTitle}>Frequently Asked Questions</h2>
                    </div>

                    <div className={styles.faqLayout}>
                        {FAQS.map((faq, idx) => {
                            const isOpen = openFaq === idx;
                            return (
                                <div key={idx} className={`${styles.faqItem} ${isOpen ? styles.faqItemOpen : ''}`}>
                                    <button 
                                        className={styles.faqQuestionBtn} 
                                        onClick={() => toggleFaq(idx)}
                                        aria-expanded={isOpen}
                                    >
                                        <span>{faq.q}</span>
                                        <ChevronDown size={20} className={styles.faqChevron} />
                                    </button>
                                    <div className={`${styles.faqAnswerContainer} ${isOpen ? styles.faqAnswerOpen : ''}`}>
                                        <p className={styles.faqAnswer}>{faq.a}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ── 6. CTA SECTION ── */}
            <AnimateOnScroll animation="scaleUp">
                <CTA 
                    title="Ready to Take the Next Step in Your Career?"
                    description="Whether you're starting your career, preparing for interviews, or exploring new opportunities, we're here to help you make informed career decisions."
                    buttonText="Get Career Advice"
                    buttonLink="#advice-form"
                />
            </AnimateOnScroll>
        </main>
    );
}
