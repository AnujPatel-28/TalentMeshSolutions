'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import styles from './post-job.module.css';
import { CustomSelect } from '@/components/ui/CustomSelect';
import HeroBg from '@/components/ui/HeroBg/HeroBg';

const SparkleIco = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="m12 3 1.912 5.885L20 10.8l-5.088 1.912L13 18.6l-1.912-5.888L6 10.8l5.088-1.915Z" /></svg>;
const CheckIco = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>;
const SendIco = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>;

const JOB_TYPES = ['Full-Time', 'Part-Time', 'Remote', 'Hybrid', 'Contract'];
const INDUSTRIES = ['Technology', 'Product', 'Design', 'Finance', 'Sales & Marketing', 'HR & People', 'Operations', 'Customer Success'];
const EXP_LEVELS = ['Entry Level', 'Mid Level', 'Senior', 'Lead / Manager', 'Director+'];
const TagIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
        <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
);
const TargetIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
    </svg>
);
const BoardIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
);
const LightningIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
);

const VALUE_PROPS = [
    { icon: <TagIcon />, label: 'Post Jobs for Free', desc: 'Create and publish job listings at no cost.' },
    { icon: <TargetIcon />, label: 'Reach Qualified Candidates', desc: 'Connect with professionals actively searching for jobs.' },
    { icon: <BoardIcon />, label: 'Applicant Tracking', desc: 'Manage candidate applications from a single dashboard.' },
    { icon: <LightningIcon />, label: 'Faster Recruitment', desc: 'Simplify hiring workflows and fill positions more efficiently.' },
];

const PREVIEW_DEFAULTS = {
    title: 'Your Job Title', company: 'Your Company', location: 'Remote', type: 'Full-Time',
    salary: '$80k–$120k', skills: [] as string[], exp: 'Mid Level',
};

export default function PostJobPage() {
    const [step, setStep] = useState(0);
    const [remote, setRemote] = useState(true);
    const [skills, setSkills] = useState<string[]>([]);
    const [skillInput, setSkillInput] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [aiGenerated, setAiGenerated] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [posting, setPosting] = useState(false);
    const [form, setForm] = useState({
        title: '', company: '', industry: '', location: '', salary: '', exp: '', description: '', deadline: ''
    });

    const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

    const addSkill = () => {
        const s = skillInput.trim();
        if (s && !skills.includes(s)) setSkills(p => [...p, s]);
        setSkillInput('');
    };

    const handleAiGenerate = () => {
        setAiLoading(true);
        setTimeout(() => {
            setForm(p => ({
                ...p, description:
                    `We are looking for a talented ${form.title || 'professional'} to join our growing team at ${form.company || 'our company'}.\n\nResponsibilities:\n• Design, develop and maintain robust solutions\n• Collaborate cross-functionally with product and design teams\n• Champion best practices and mentor junior team members\n• Drive outcomes through data-informed decision making\n\nRequirements:\n${skills.length ? skills.map(s => `• ${s}`).join('\n') : '• Relevant skills and experience'}\n• Strong communication and problem-solving skills\n• Passion for building impactful products\n\nWhat we offer:\n• Competitive compensation ${form.salary ? `(${form.salary})` : ''}\n• Flexible remote-first culture\n• Professional growth budget\n• Collaborative and inclusive team`
            }));
            setAiLoading(false); setAiGenerated(true);
        }, 1800);
    };

    // Job posting isn't live yet — this is a preview of the flow. We still capture the
    // draft as a lead via Web3Forms (same pattern as the rest of the site) so real interest
    // isn't lost, then point the employer to early access instead of pretending it posted.
    const handlePostJob = async () => {
        setPosting(true);
        try {
            await fetch('https://api.web3forms.com/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({
                    access_key: process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY || '',
                    job_title: form.title,
                    company: form.company,
                    industry: form.industry,
                    location: preview.location,
                    salary: form.salary,
                    experience_level: form.exp,
                    skills: skills.join(', '),
                    description: form.description,
                    subject: `New Job Post Draft — ${form.title || 'Untitled role'} @ ${form.company || 'Unknown company'}`,
                    from_name: 'TalentMesh Post-a-Job Preview',
                }),
            });
        } catch (err) {
            console.error('Job draft capture failed:', err);
        } finally {
            setPosting(false);
            setSubmitted(true);
        }
    };

    const preview = {
        title: form.title || PREVIEW_DEFAULTS.title,
        company: form.company || PREVIEW_DEFAULTS.company,
        location: remote ? 'Remote' : form.location || PREVIEW_DEFAULTS.location,
        type: form.exp || JOB_TYPES[0],
        salary: form.salary || PREVIEW_DEFAULTS.salary,
        skills,
        exp: form.exp || PREVIEW_DEFAULTS.exp,
    };

    const STEPS = ['Details', 'Description', 'Preview'];

    return (
        <main className={styles.page}>
            <HeroBg src="/bg2job.png" fixed />
            {/* ── HERO ── */}
            <section className={styles.hero}>
                <div className="premium-container">
                    <div className={styles.heroContent}>
                        <div className={styles.heroBadge}><SparkleIco /> Smart Job Postings</div>
                        <h1 className={styles.heroTitle}>
                            Post Jobs and<br />
                            <span className={styles.highlight}>Hire Top Talent Faster</span>
                        </h1>
                        <p className={styles.heroSub}>Create job listings, attract qualified candidates, manage applications, and streamline your hiring process with TalentMesh.</p>
                    </div>
                </div>
            </section>

            {/* ── FORM ── */}
            <section className={styles.formSection} id="post-form">
                <div className="premium-container" style={{ position: 'relative', zIndex: 2 }}>
                    <div className={styles.formWrap}>

                        {/* Progress */}
                        <div className={styles.progressBar}>
                            {STEPS.map((s, i) => (
                                <React.Fragment key={s}>
                                    <div className={`${styles.progressStep} ${i <= step ? styles.progressStepActive : ''}`} onClick={() => i < step && setStep(i)}>
                                        <div className={styles.progressDot}>{i < step ? <CheckIco /> : i + 1}</div>
                                        <span className={styles.progressLabel}>{s}</span>
                                    </div>
                                    {i < STEPS.length - 1 && <div className={`${styles.progressLine} ${i < step ? styles.progressLineFill : ''}`} />}
                                </React.Fragment>
                            ))}
                        </div>

                        {submitted ? (
                            <div className={styles.success}>
                                <div className={styles.successIco}><CheckIco /></div>
                                <h2 className={styles.successTitle}>You&apos;re ready to go live</h2>
                                <p className={styles.successDesc}>Job posting isn&apos;t open yet, but we&apos;ve saved your draft. Join early access and we&apos;ll notify you the moment you can publish it.</p>
                                <Link href="/login" className={styles.successBtn}>Join Early Access</Link>
                                <button className={styles.backBtn} style={{ marginTop: '0.75rem' }} onClick={() => { setSubmitted(false); setStep(0); }}>Start Another Draft</button>
                            </div>
                        ) : (
                            <>
                                {/* STEP 0 — Details */}
                                {step === 0 && (
                                    <div className={styles.formStep}>
                                        <h2 className={styles.stepHdr}>Job <span className={styles.highlight}>Details</span></h2>
                                        <div className={styles.fieldRow}>
                                            <div className={styles.field}>
                                                <label className={styles.lbl}>Job Title *</label>
                                                <input className={styles.input} placeholder="e.g. Senior Product Designer" value={form.title} onChange={e => set('title', e.target.value)} />
                                            </div>
                                            <div className={styles.field}>
                                                <label className={styles.lbl}>Company Name *</label>
                                                <input className={styles.input} placeholder="Your Company" value={form.company} onChange={e => set('company', e.target.value)} />
                                            </div>
                                        </div>
                                        <div className={styles.fieldRow}>
                                            <div className={styles.field}>
                                                <label className={styles.lbl}>Industry / Department</label>
                                                <CustomSelect
                                                    className={styles.select}
                                                    value={form.industry || ''}
                                                    onChange={e => set('industry', e.target.value)}
                                                    options={INDUSTRIES}
                                                    placeholder="Select industry"
                                                />
                                            </div>
                                            <div className={styles.field}>
                                                <label className={styles.lbl}>Experience Level</label>
                                                <CustomSelect
                                                    className={styles.select}
                                                    value={form.exp || ''}
                                                    onChange={e => set('exp', e.target.value)}
                                                    options={EXP_LEVELS}
                                                    placeholder="Select level"
                                                />
                                            </div>
                                        </div>

                                        {/* Location toggle */}
                                        <div className={styles.field}>
                                            <label className={styles.lbl}>Location</label>
                                            <div className={styles.locationToggle}>
                                                <button className={`${styles.toggleBtn} ${remote ? styles.toggleActive : ''}`} onClick={() => setRemote(true)}>Remote</button>
                                                <button className={`${styles.toggleBtn} ${!remote ? styles.toggleActive : ''}`} onClick={() => setRemote(false)}>Specific City</button>
                                            </div>
                                            {!remote && <input className={`${styles.input} ${styles.mt8}`} placeholder="e.g. Bangalore, KA" value={form.location} onChange={e => set('location', e.target.value)} />}
                                        </div>

                                        <div className={styles.fieldRow}>
                                            <div className={styles.field}>
                                                <label className={styles.lbl}>Salary Range <em className={styles.opt}>(optional)</em></label>
                                                <input className={styles.input} placeholder="e.g. $80k–$120k" value={form.salary} onChange={e => set('salary', e.target.value)} />
                                            </div>
                                            <div className={styles.field}>
                                                <label className={styles.lbl}>Application Deadline</label>
                                                <input className={styles.input} type="date" value={form.deadline} onChange={e => set('deadline', e.target.value)} />
                                            </div>
                                        </div>

                                        {/* Skills tag input */}
                                        <div className={styles.field}>
                                            <label className={styles.lbl}>Required Skills</label>
                                            <div className={styles.skillsWrap}>
                                                {skills.map(s => (
                                                    <span key={s} className={styles.skillTag}>{s}<button onClick={() => setSkills(p => p.filter(x => x !== s))}>×</button></span>
                                                ))}
                                                <input className={styles.skillInput} placeholder="Type skill + Enter"
                                                    value={skillInput} onChange={e => setSkillInput(e.target.value)}
                                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }} />
                                            </div>
                                        </div>

                                        <button className={styles.nextBtn} onClick={() => setStep(1)}>Continue to Description →</button>
                                    </div>
                                )}

                                {/* STEP 1 — Description */}
                                {step === 1 && (
                                    <div className={styles.formStep}>
                                        <h2 className={styles.stepHdr}>Job <span className={styles.highlight}>Description</span></h2>
                                        <div className={styles.aiRow}>
                                            <p className={styles.aiHint}>Let AI write your job description based on the details you filled in.</p>
                                            <button className={styles.aiBtn} onClick={handleAiGenerate} disabled={aiLoading}>
                                                {aiLoading ? <span className={styles.aiSpinner} /> : <SparkleIco />}
                                                {aiLoading ? 'Generating...' : '✦ AI Generate Description'}
                                            </button>
                                        </div>
                                        <textarea className={`${styles.textarea} ${aiGenerated ? styles.textareaAi : ''}`}
                                            rows={14} placeholder="Or write your job description here..."
                                            value={form.description} onChange={e => set('description', e.target.value)} />
                                        {aiGenerated && <div className={styles.aiNote}><SparkleIco /> AI-generated — review and edit before posting</div>}
                                        <div className={styles.stepBtns}>
                                            <button className={styles.backBtn} onClick={() => setStep(0)}>← Back</button>
                                            <button className={styles.nextBtn} onClick={() => setStep(2)}>Preview Job →</button>
                                        </div>
                                    </div>
                                )}

                                {/* STEP 2 — Preview */}
                                {step === 2 && (
                                    <div className={styles.formStep}>
                                        <h2 className={styles.stepHdr}>Preview Your <span className={styles.highlight}>Listing</span></h2>
                                        <div className={styles.finalPreview}>
                                            <div className={styles.fpHead}>
                                                <div className={styles.fpLogo}>{preview.company.slice(0, 2).toUpperCase()}</div>
                                                <div>
                                                    <div className={styles.fpTitle}>{preview.title}</div>
                                                    <div className={styles.fpMeta}>{preview.company} · {preview.location}</div>
                                                </div>
                                            </div>
                                            <div className={styles.fpBadges}>
                                                <span className={styles.fpBadge}>{preview.exp}</span>
                                                {preview.salary && <span className={styles.fpBadge}>{preview.salary}</span>}
                                                {skills.slice(0, 4).map(s => <span key={s} className={styles.fpSkill}>{s}</span>)}
                                            </div>
                                            <div className={styles.fpDesc}>{form.description || 'No description yet.'}</div>
                                        </div>
                                        <div className={styles.stepBtns}>
                                            <button className={styles.backBtn} onClick={() => setStep(1)}>← Edit</button>
                                            <button className={styles.postBtn} onClick={handlePostJob} disabled={posting}>
                                                <SendIco /> {posting ? 'Submitting...' : 'Post This Job'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </section>

            {/* ── VALUE PROPS ── */}
            <section className={styles.valueSection}>
                <div className="premium-container">
                    <div className={styles.valueSectionHeader}>
                        <span className={styles.valueBadge}>Benefits</span>
                        <h2 className={styles.valueSectionTitle}>Why Employers Choose <span className={styles.highlight}>TalentMesh</span></h2>
                        <p className={styles.valueSectionSub}>
                            Post jobs online, attract qualified candidates, manage applications, and streamline your hiring process with TalentMesh.
                        </p>
                    </div>
                    <div className={styles.valueGrid}>
                        {VALUE_PROPS.map(vp => (
                            <div key={vp.label} className={styles.valueProp}>
                                <div className={styles.valuePropIcoBg}>
                                    {vp.icon}
                                </div>
                                <h3 className={styles.valueLabel}>{vp.label}</h3>
                                <p className={styles.valueDesc}>{vp.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </main>
    );
}
