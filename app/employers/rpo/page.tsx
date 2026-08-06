"use client";
import React, { useState } from 'react';
import styles from './rpo.module.css';
import { CustomSelect } from '@/components/ui/CustomSelect';

// ─── Icons ────────────────────────────────────────────────────────────────────
const IconSparkle = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none">
        <path d="m12 3 1.912 5.885L20 10.8l-5.088 1.912L13 18.6l-1.912-5.888L6 10.8l5.088-1.915L12 3Z" />
    </svg>
);
const IconCheck = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);
const IconArrow = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14m-7-7 7 7-7 7" />
    </svg>
);
const IconUsers = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
);
const IconSearch = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
    </svg>
);
const IconShield = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
);
const IconClipboard = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <rect x="8" y="2" width="8" height="4" rx="1" />
    </svg>
);
const IconBarChart = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
);
const IconHandshake = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m5 8 6 6M9.5 3.5l1 1-2 2 1 1 3-3 1 1-3 3 1 1 2-2 1 1-3.5 3.5L6 9l3.5-5.5Z" />
        <path d="M14.5 20.5 18 17l-1-1-2 2-1-1 2-2-1-1-3 3-1-1 2-2-1-1-3.5 3.5L9 21l5.5-.5Z" />
        <path d="M20 12 12 4" /><path d="m4 12 8 8" />
    </svg>
);
const IconUser = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
);
const IconMail = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
);
const IconBuilding = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" />
    </svg>
);
const IconPhone = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.6 19.79 19.79 0 0 1 1.61 5 2 2 0 0 1 3.6 3h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.6a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
);
const IconTarget = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
);
const IconZap = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
);
const IconBriefcase = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
    </svg>
);

// ─── Data ─────────────────────────────────────────────────────────────────────
const RPO_INCLUDES = [
    { icon: <IconUsers />, title: "Dedicated recruiters", desc: "A named sourcing specialist embedded with your team, not a generic agency pool.", color: "#3b82f6" },
    { icon: <IconSearch />, title: "Sourcing strategy", desc: "Custom multi-channel approach tailored to your industry, roles, and culture fit.", color: "#8b5cf6" },
    { icon: <IconShield />, title: "Screening & shortlisting", desc: "Structured assessments, bias-free AI screening, and curated candidate reports.", color: "#10b981" },
    { icon: <IconHandshake />, title: "Offer management", desc: "We handle the full offer lifecycle — negotiations, documentation, and acceptance.", color: "#f59e0b" },
    { icon: <IconClipboard />, title: "Onboarding support", desc: "Smooth handoff from accepted offer to the first day — tracked and managed.", color: "#ef4444" },
    { icon: <IconBarChart />, title: "Reporting & analytics", desc: "Weekly pipeline dashboards with time-to-fill, cost-per-hire, and quality metrics.", color: "#06b6d4" },
];

const WHEN_IT_MAKES_SENSE = [
    { icon: <IconZap />, title: "Rapid scale-up", desc: "Post-Series A/B growth where you need to hire 20–100+ people in a short window.", color: "#3b82f6" },
    { icon: <IconTarget />, title: "Lean HR teams", desc: "Early-stage companies with no in-house recruiter who need expert capacity fast.", color: "#8b5cf6" },
    { icon: <IconBriefcase />, title: "High-volume hiring", desc: "Seasonal or project-based hiring bursts that overwhelm internal teams.", color: "#10b981" },
    { icon: <IconUsers />, title: "Multi-region expansion", desc: "Hiring across countries or markets simultaneously with different hiring norms.", color: "#f59e0b" },
];

const ENGAGEMENT_MODELS = [
    {
        name: "Project RPO",
        tagline: "One-time hiring burst",
        desc: "Perfect for a specific hiring push — a product launch, funding milestone, or seasonal ramp. We manage one defined hiring project from brief to close.",
        features: ["Fixed scope & timeline", "Named dedicated recruiter", "Full sourcing & screen", "Shortlist + offer management"],
        highlight: false,
        color: "#3b82f6",
    },
    {
        name: "Selective RPO",
        tagline: "Specific roles, ongoing",
        desc: "Outsource only the hard-to-fill or specialist roles while your internal team handles the rest. We plug in exactly where you need depth.",
        features: ["Role-specific sourcing", "Works alongside your HR team", "Flexible capacity month-to-month", "Detailed candidate scorecards"],
        highlight: true,
        color: "#7c3aed",
    },
    {
        name: "Full RPO",
        tagline: "Complete ownership",
        desc: "We become your recruitment function. From strategy to reporting, we own the full hiring lifecycle end-to-end so your team can focus on the business.",
        features: ["End-to-end ownership", "Embedded team of specialists", "ATS & workflow management", "Executive reporting & analytics"],
        highlight: false,
        color: "#10b981",
    },
];

const INDUSTRIES = [
    { emoji: "💻", label: "Technology" },
    { emoji: "📈", label: "Finance" },
    { emoji: "🏥", label: "Healthcare" },
    { emoji: "🛒", label: "FMCG" },
    { emoji: "⚖️", label: "Professional Services" },
];

const STATS = [
    { value: "3×", label: "Faster time-to-hire" },
    { value: "40%", label: "Lower cost-per-hire" },
    { value: "98%", label: "Client retention rate" },
    { value: "24hr", label: "Specialist assigned" },
];

const DEFAULTS = {
    name: "",
    company: "",
    email: "",
    phone: "",
    hiringVolume: "",
    timeline: "",
    notes: "",
};

export default function RPOPage() {
    const [form, setForm] = useState(DEFAULTS);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitted, setSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    React.useEffect(() => {
        if (typeof window !== 'undefined') {
            document.title = "Fully Managed Recruitment (RPO) | TalentMesh for Employers";
        }
    }, []);

    const set = (k: keyof typeof DEFAULTS, v: string) => {
        setForm(p => ({ ...p, [k]: v }));
        setErrors(p => ({ ...p, [k]: "" }));
    };

    const validate = () => {
        const e: Record<string, string> = {};
        if (!form.name.trim()) e.name = "Your name is required.";
        if (!form.company.trim()) e.company = "Company name is required.";
        if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "A valid email is required.";
        return e;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length > 0) { setErrors(errs); return; }
        
        setIsSubmitting(true);
        try {
            const response = await fetch('https://api.web3forms.com/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    access_key: process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY || '',
                    subject: `New RPO Strategy Call Request from ${form.name}`,
                    from_name: 'TalentMesh RPO',
                    name: form.name,
                    email: form.email,
                    company: form.company,
                    phone: form.phone,
                    hiringVolume: form.hiringVolume,
                    timeline: form.timeline,
                    message: form.notes
                }),
            });

            if (response.ok) {
                setSubmitted(true);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                alert('Something went wrong. Please try again later.');
            }
        } catch (error) {
            console.error(error);
            alert('Something went wrong. Please check your connection.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <main className={styles.page}>
                <div className={styles.successScreen}>
                    <div className={styles.successIcon}><IconCheck /></div>
                    <h1 className={styles.successTitle}>Strategy Call Booked!</h1>
                    <p className={styles.successDesc}>
                        Thanks, <strong>{form.name}</strong>. An RPO specialist from TalentMesh will reach out to <strong>{form.email}</strong> within <strong>24 hours</strong> to schedule your strategy call.
                    </p>
                    <div className={styles.successDetails}>
                        <p><strong>Company:</strong> {form.company}</p>
                        {form.hiringVolume && <p><strong>Hiring volume:</strong> {form.hiringVolume}</p>}
                        {form.timeline && <p><strong>Timeline:</strong> {form.timeline}</p>}
                    </div>
                    <button className={styles.backBtn} onClick={() => { setSubmitted(false); setForm(DEFAULTS); }}>
                        Submit Another Enquiry
                    </button>
                </div>
            </main>
        );
    }

    return (
        <main className={styles.page}>

            {/* ─── HERO ───────────────────────────────────────────────────── */}
            <section className={styles.hero}>
                <div className={styles.heroGrid} aria-hidden="true" />
                <div className={styles.heroOrb1} aria-hidden="true" />
                <div className={styles.heroOrb2} aria-hidden="true" />
                <div className={`premium-container ${styles.heroInner}`}>
                    <div className={styles.heroBadge}><IconSparkle /> Enterprise RPO</div>
                    <h1 className={styles.heroTitle}>
                        Outsource Your Entire{" "}
                        <span className={styles.heroHighlight}>Hiring Function to Us.</span>
                    </h1>
                    <p className={styles.heroSub}>
                        TalentMesh RPO embeds seamlessly with your business to manage end-to-end recruitment — so your team can focus on building, not hiring.
                    </p>
                    <div className={styles.heroCtas}>
                        <button
                            className={styles.primaryCta}
                            onClick={() => document.getElementById('rpo-contact')?.scrollIntoView({ behavior: 'smooth' })}>
                            Talk to an RPO Specialist <IconArrow />
                        </button>
                        <div className={styles.ctaTrust}><IconCheck /> Specialist assigned within 24 hours</div>
                    </div>
                </div>
            </section>

            {/* ─── STATS STRIP ────────────────────────────────────────────── */}
            <div className={styles.statsStrip}>
                <div className="premium-container">
                    <div className={styles.statsRow}>
                        {STATS.map((s, i) => (
                            <div key={i} className={styles.statItem}>
                                <span className={styles.statValue}>{s.value}</span>
                                <span className={styles.statLabel}>{s.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ─── WHAT IS RPO ─────────────────────────────────────────────── */}
            <section className={styles.explainerSection}>
                <div className="premium-container">
                    <div className={styles.explainerGrid}>
                        <div className={styles.explainerText}>
                            <div className={styles.sectionBadge}><IconSparkle /> What is RPO?</div>
                            <h2 className={styles.sectionTitle}>Your hiring function, fully managed.</h2>
                            <p className={styles.explainerBody}>
                                RPO (Recruitment Process Outsourcing) means handing over your recruiting to a specialist partner — not just a recruiter, but a whole function. We manage strategy, sourcing, screening, offers, and analytics.
                            </p>
                            <p className={styles.explainerBody}>
                                Unlike a staffing agency that sends you CVs, TalentMesh RPO works inside your business, uses your voice, and is accountable for outcomes — not just activity.
                            </p>
                            <ul className={styles.explainerPoints}>
                                <li><span className={styles.pointDot}><IconCheck /></span> No long-term lock-in — engagement models to suit your stage</li>
                                <li><span className={styles.pointDot}><IconCheck /></span> Cheaper than in-house when you need surge capacity</li>
                                <li><span className={styles.pointDot}><IconCheck /></span> All the expertise, none of the overhead</li>
                            </ul>
                        </div>
                        <div className={styles.explainerVisual}>
                            <div className={styles.flowDiagram}>
                                {["Hiring brief", "Sourcing strategy", "Screening & shortlist", "Interviews managed", "Offer & close", "Analytics report"].map((step, i) => (
                                    <React.Fragment key={step}>
                                        <div className={styles.flowStep}>
                                            <span className={styles.flowNum}>{String(i + 1).padStart(2, '0')}</span>
                                            <span className={styles.flowLabel}>{step}</span>
                                        </div>
                                        {i < 5 && <div className={styles.flowArrow}>↓</div>}
                                    </React.Fragment>
                                ))}
                            </div>
                            <div className={styles.flowOwner}>
                                <span className={styles.flowOwnerLabel}>All managed by TalentMesh RPO team</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── WHEN DOES RPO MAKE SENSE ────────────────────────────────── */}
            <section className={styles.whenSection}>
                <div className="premium-container">
                    <div className={styles.sectionHeader}>
                        <div className={styles.sectionBadge}><IconSparkle /> When Does RPO Make Sense?</div>
                        <h2 className={styles.sectionTitle}>Built for businesses that can't afford hiring bottlenecks</h2>
                    </div>
                    <div className={styles.whenGrid}>
                        {WHEN_IT_MAKES_SENSE.map((item, i) => (
                            <div key={i} className={styles.whenCard}>
                                <div className={styles.whenIcon} style={{ background: `${item.color}15`, color: item.color }}>{item.icon}</div>
                                <h3 className={styles.whenTitle}>{item.title}</h3>
                                <p className={styles.whenDesc}>{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── RPO INCLUDES ────────────────────────────────────────────── */}
            <section className={styles.includesSection}>
                <div className="premium-container">
                    <div className={styles.sectionHeader}>
                        <div className={styles.sectionBadge}><IconSparkle /> What's Included</div>
                        <h2 className={styles.sectionTitle}>Everything your hiring function needs, built in.</h2>
                    </div>
                    <div className={styles.includesGrid}>
                        {RPO_INCLUDES.map((item, i) => (
                            <div key={i} className={styles.includesCard}>
                                <div className={styles.includesIcon} style={{ background: `${item.color}12`, color: item.color, border: `1px solid ${item.color}25` }}>
                                    {item.icon}
                                </div>
                                <div>
                                    <h3 className={styles.includesTitle}>{item.title}</h3>
                                    <p className={styles.includesDesc}>{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── ENGAGEMENT MODELS ───────────────────────────────────────── */}
            <section className={styles.modelsSection}>
                <div className="premium-container">
                    <div className={styles.sectionHeader}>
                        <div className={styles.sectionBadge}><IconSparkle /> Engagement Models</div>
                        <h2 className={styles.sectionTitle}>Pick the level of support that fits your stage.</h2>
                        <p className={styles.sectionSub}>Each model can be scaled up or down as your needs change.</p>
                    </div>
                    <div className={styles.modelsGrid}>
                        {ENGAGEMENT_MODELS.map((model, i) => (
                            <div key={i} className={`${styles.modelCard} ${model.highlight ? styles.modelHighlight : ''}`}>
                                {model.highlight && <div className={styles.modelBadge}>Most Popular</div>}
                                <div className={styles.modelAccent} style={{ background: model.color }} />
                                <h3 className={styles.modelName} style={{ color: model.highlight ? '#fff' : '#0f172a' }}>{model.name}</h3>
                                <p className={styles.modelTagline} style={{ color: model.highlight ? 'rgba(255,255,255,0.7)' : '#64748b' }}>{model.tagline}</p>
                                <p className={styles.modelDesc} style={{ color: model.highlight ? 'rgba(255,255,255,0.75)' : '#475569' }}>{model.desc}</p>
                                <ul className={styles.modelFeatures}>
                                    {model.features.map((f, j) => (
                                        <li key={j} className={styles.modelFeature} style={{ color: model.highlight ? 'rgba(255,255,255,0.85)' : '#334155' }}>
                                            <span className={styles.modelCheck} style={{ background: `${model.color}20`, color: model.color }}><IconCheck /></span>
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                                <button
                                    className={`${styles.modelCta} ${model.highlight ? styles.modelCtaLight : ''}`}
                                    style={!model.highlight ? { borderColor: model.color, color: model.color } : undefined}
                                    onClick={() => document.getElementById('rpo-contact')?.scrollIntoView({ behavior: 'smooth' })}>
                                    Get started <IconArrow />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── INDUSTRIES ──────────────────────────────────────────────── */}
            <section className={styles.industriesSection}>
                <div className="premium-container">
                    <div className={styles.industriesInner}>
                        <div className={styles.sectionBadge}><IconSparkle /> Industries We Serve</div>
                        <h2 className={styles.industriesTitle}>Deep expertise where it counts.</h2>
                        <div className={styles.industryPills}>
                            {INDUSTRIES.map((ind, i) => (
                                <div key={i} className={styles.industryPill}>
                                    <span>{ind.emoji}</span>
                                    <span>{ind.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── CONTACT / BOOK CALL ─────────────────────────────────────── */}
            <section className={styles.contactSection} id="rpo-contact">
                <div className="premium-container">
                    <div className={styles.contactGrid}>

                        {/* Left */}
                        <div className={styles.contactCopy}>
                            <div className={styles.sectionBadge}><IconSparkle /> Book a Strategy Call</div>
                            <h2 className={styles.contactTitle}>Let's design your RPO engagement.</h2>
                            <p className={styles.contactDesc}>
                                Tell us about your hiring goals and team size. An RPO specialist will reach out within 24 hours to walk you through options and build a custom proposal.
                            </p>
                            <ul className={styles.contactTrustList}>
                                <li><IconCheck /> No commitment required on your first call</li>
                                <li><IconCheck /> Custom proposal delivered within 48 hours</li>
                                <li><IconCheck /> Strict NDA and confidentiality from day one</li>
                                <li><IconCheck /> Dedicated specialist — not a call centre</li>
                            </ul>
                        </div>

                        {/* Form */}
                        <form className={styles.contactForm} onSubmit={handleSubmit} noValidate>
                            <div className={styles.fieldRow}>
                                <div className={styles.field}>
                                    <label className={styles.label}>Your Name *</label>
                                    <div className={`${styles.inputWrap} ${errors.name ? styles.hasError : ''}`}>
                                        <IconUser />
                                        <input type="text" placeholder="Full name" value={form.name} onChange={e => set('name', e.target.value)} />
                                    </div>
                                    {errors.name && <span className={styles.err}>{errors.name}</span>}
                                </div>
                                <div className={styles.field}>
                                    <label className={styles.label}>Company *</label>
                                    <div className={`${styles.inputWrap} ${errors.company ? styles.hasError : ''}`}>
                                        <IconBuilding />
                                        <input type="text" placeholder="Company name" value={form.company} onChange={e => set('company', e.target.value)} />
                                    </div>
                                    {errors.company && <span className={styles.err}>{errors.company}</span>}
                                </div>
                            </div>

                            <div className={styles.fieldRow}>
                                <div className={styles.field}>
                                    <label className={styles.label}>Work Email *</label>
                                    <div className={`${styles.inputWrap} ${errors.email ? styles.hasError : ''}`}>
                                        <IconMail />
                                        <input type="email" placeholder="you@company.com" value={form.email} onChange={e => set('email', e.target.value)} />
                                    </div>
                                    {errors.email && <span className={styles.err}>{errors.email}</span>}
                                </div>
                                <div className={styles.field}>
                                    <label className={styles.label}>Phone <span className={styles.opt}>(Optional)</span></label>
                                    <div className={styles.inputWrap}>
                                        <IconPhone />
                                        <input type="tel" placeholder="+1 (555) 000-0000" value={form.phone} onChange={e => set('phone', e.target.value)} />
                                    </div>
                                </div>
                            </div>

                            <div className={styles.fieldRow}>
                                <div className={styles.field}>
                                    <label className={styles.label}>Hiring volume</label>
                                    <CustomSelect 
                                        className={styles.select} 
                                        value={form.hiringVolume} 
                                        onChange={e => set('hiringVolume', e.target.value)}
                                        options={[
                                            { label: 'Select range…', value: '' },
                                            { label: '1–5 hires', value: '1–5 hires' },
                                            { label: '6–20 hires', value: '6–20 hires' },
                                            { label: '21–50 hires', value: '21–50 hires' },
                                            { label: '50–100 hires', value: '50–100 hires' },
                                            { label: '100+ hires', value: '100+ hires' }
                                        ]}
                                    />
                                </div>
                                <div className={styles.field}>
                                    <label className={styles.label}>Timeline</label>
                                    <CustomSelect 
                                        className={styles.select} 
                                        value={form.timeline} 
                                        onChange={e => set('timeline', e.target.value)}
                                        options={[
                                            { label: 'Select timeline…', value: '' },
                                            { label: 'ASAP (within 1 month)', value: 'ASAP (within 1 month)' },
                                            { label: '1–3 months', value: '1–3 months' },
                                            { label: '3–6 months', value: '3–6 months' },
                                            { label: 'Ongoing / no fixed timeline', value: 'Ongoing / no fixed timeline' }
                                        ]}
                                    />
                                </div>
                            </div>

                            <div className={styles.field}>
                                <label className={styles.label}>Anything else we should know? <span className={styles.opt}>(Optional)</span></label>
                                <textarea className={styles.textarea} rows={4}
                                    placeholder="Roles you need to fill, team size, challenges you're facing…"
                                    value={form.notes} onChange={e => set('notes', e.target.value)} />
                            </div>

                            <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                                {isSubmitting ? 'Submitting...' : <><IconSparkle /> Book My Strategy Call</>}
                            </button>
                            <p className={styles.submitNote}>Our team will be in touch within <strong>24 hours.</strong></p>
                        </form>
                    </div>
                </div>
            </section>

        </main>
    );
}
