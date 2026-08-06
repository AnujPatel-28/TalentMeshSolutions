"use client";
import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import AnimateOnScroll from '@/components/AnimateOnScroll';
import HeroBg from '@/components/ui/HeroBg/HeroBg';
import { CTA } from '@/components/sections';
import {
    Monitor,
    Lightbulb,
    Users,
    Globe,
    TrendingUp,
    HeartHandshake,
    ArrowUpRight,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import styles from './careers.module.css';

/* ─── DATA ──────────────────────────────────── */

const LEADERS = [
    {
        name: 'Isabella Martinez',
        role: 'Co-Founder, CEO',
        img: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&h=150&q=80'
    },
    {
        name: 'Mateo Rossi',
        role: 'Co-Founder, CPO',
        img: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=150&h=150&q=80'
    },
    {
        name: 'Claire Dubois',
        role: 'Co-Founder, CTO',
        img: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&h=150&q=80'
    },
    {
        name: 'Liam O’Connor',
        role: 'Head of Security',
        img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80'
    },
    {
        name: 'Jonas Schneider',
        role: 'Head of Product',
        img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80'
    },
    {
        name: 'Hannah Fischer',
        role: 'Head of Engineering',
        img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80'
    }
];

const OTHER_TEAM = [
    { name: 'Judha Maygustya', role: 'Security Analyst' },
    { name: 'Michael Chen', role: 'Lead Backend Engineer' },
    { name: 'Hannah Collins', role: 'People & Culture Lead' },
    { name: 'Natalie Brooks', role: 'Customer Experience Lead' },
    { name: 'Alexandra Reed', role: 'Lead Product Designer' },
    { name: 'Oliver Grant', role: 'Principal Software Engineer' },
    { name: 'Ryan O’Connor', role: 'Senior Frontend Engineer' },
    { name: 'Ethan Müller', role: 'Data Systems Engineer' },
    { name: 'Daniel Whitmore', role: 'DevOps Lead' },
    { name: 'Emily Parker', role: 'Product Marketing Lead' },
    { name: 'Aisha Rahman', role: 'Security Operations Manager' },
    { name: 'Isabella Rossi', role: 'Brand & Communications Lead' }
];

const BENEFITS = [
    {
        icon: <Monitor size={20} />,
        title: 'Meaningful Work',
        desc: 'Build infrastructure that powers real career matches and shapes the future of recruitment.'
    },
    {
        icon: <Lightbulb size={20} />,
        title: 'High Ownership',
        desc: 'Take full responsibility for your features, run experiments, and make real product decisions.'
    },
    {
        icon: <Users size={20} />,
        title: 'Focused Team',
        desc: 'Collaborate with a small, highly aligned group of engineers, designers, and recruiters.'
    },
    {
        icon: <Globe size={20} />,
        title: 'Remote by Default',
        desc: 'Work from anywhere with flexible schedules. We prioritize output over hours logged.'
    },
    {
        icon: <TrendingUp size={20} />,
        title: 'Room to Grow',
        desc: 'We support career development with a $2,500 annual learning budget and mentorship programs.'
    },
    {
        icon: <HeartHandshake size={20} />,
        title: 'Competitive Compensation',
        desc: 'Receive competitive market rates, global premium health coverage, and generous equity stock options.'
    }
];

const JOBS = [
    { title: 'Senior Frontend Engineer', team: 'Engineering', location: 'Remote • India' },
    { title: 'Backend Engineer (Platform)', team: 'Engineering', location: 'Remote • Global' },
    { title: 'Product Designer (Lead)', team: 'Product & Design', location: 'Remote • Global' },
    { title: 'Technical Sourcing Specialist', team: 'Recruiting', location: 'Remote • India' },
    { title: 'Growth Marketing Manager', team: 'Marketing', location: 'Remote • Global' },
    { title: 'Customer Success Lead', team: 'Customer Success', location: 'Remote • India' }
];

const FAQS = [
    {
        q: 'What is the hiring process like?',
        a: 'Our hiring process typically consists of three stages: an initial recruiter screen (30 mins), a practical technical or design assessment (1 hour), and a final culture alignment and values interview. We value transparency and aim to complete the entire cycle within 12 business days.'
    },
    {
        q: 'Can I work from anywhere?',
        a: 'Yes, we are remote-first! You are free to design your schedule and work from any location. We only ask that your core hours overlap by 3-4 hours with your immediate team members to support collaboration.'
    },
    {
        q: 'What benefits and perks do you offer?',
        a: 'We offer flexible working hours, remote office setup stipends ($500), an annual learning budget ($2,500), premium global medical and dental insurance, and generous parental leave policies. All full-time employees also receive stock equity options.'
    },
    {
        q: 'How does the training budget work?',
        a: 'Every employee has access to a $2,500 annual stipend to spend on courses, books, conferences, or specialized workshops. Simply submit your invoice for approval, and our finance team will handle the rest.'
    },
    {
        q: 'Do you offer relocation support?',
        a: 'While we are remote-first and do not require relocation, we support visa sponsorships and relocation stipends if you decide to join one of our global physical hubs in Mumbai, Bangalore, or London.'
    }
];

/* ─── PAGE ──────────────────────────────────── */

export default function CareersPage() {
    const [selectedTab, setSelectedTab] = useState('All Teams');
    const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

    // Filter jobs based on active tab
    const filteredJobs = JOBS.filter(job => {
        if (selectedTab === 'All Teams') return true;
        if (selectedTab === 'Engineering') return job.team === 'Engineering';
        if (selectedTab === 'Product & Design') return job.team === 'Product & Design';
        if (selectedTab === 'Marketing') return job.team === 'Marketing';
        if (selectedTab === 'Customer Success') return job.team === 'Customer Success' || job.team === 'Recruiting';
        return true;
    });

    const toggleFaq = (idx: number) => {
        setExpandedFaq(expandedFaq === idx ? null : idx);
    };

    return (
        /* Careers page is currently disabled. Uncomment the main block below when ready to use. */
        /*
        <main className={styles.page}>
            <HeroBg src="/wave-bg.png" fixed />

            <section className={styles.hero}>
                <div className="premium-container">
                    <div className={styles.heroInner}>
                        <h1 className={styles.heroTitle}>
                            Join TalentMesh and<br />
                            help create<br />
                            <span className={styles.highlight}>recruitment</span>
                        </h1>
                        <div className={styles.heroButtons}>
                            <button
                                onClick={() => document.getElementById('open-roles')?.scrollIntoView({ behavior: 'smooth' })}
                                className={styles.seeRolesBtn}
                            >
                                See Open Roles <ArrowUpRight size={16} />
                            </button>
                            <a href="mailto:info@talentmeshsolutions.com" className={styles.emailLink}>
                                <span className={styles.emailDot} /> info@talentmeshsolutions.com
                            </a>
                        </div>
                    </div>

                    <div className={styles.heroImageWrapper}>
                        <Image
                            src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&h=500&q=80"
                            alt="TalentMesh Team Group"
                            fill
                            className={styles.teamImg}
                            priority
                            unoptimized
                        />
                    </div>
                </div>
            </section>

            <AnimateOnScroll animation="fadeUp">
                <section className={styles.teamSection}>
                    <div className="premium-container">
                        <div className={styles.sectionHeader}>
                            <h2 className={styles.sectionTitle}>
                                The Team Behind <span className={styles.highlight}>TalentMesh</span>
                            </h2>
                            <p className={styles.sectionSubtitle}>
                                The people shaping TalentMesh through thoughtful design and solid engineering.
                            </p>
                        </div>

                        <div className={styles.leadersGrid}>
                            {LEADERS.map((leader, i) => (
                                <div key={i} className={`${styles.leaderCard} glass-card`}>
                                    <div className={styles.leaderAvatar}>
                                        <Image
                                            src={leader.img}
                                            alt={leader.name}
                                            fill
                                            className={styles.avatarImg}
                                            unoptimized
                                        />
                                    </div>
                                    <div className={styles.leaderMeta}>
                                        <h3 className={styles.leaderName}>{leader.name}</h3>
                                        <span className={styles.leaderRole}>{leader.role}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className={styles.teamTextGrid}>
                            {OTHER_TEAM.map((member, i) => (
                                <div key={i} className={styles.teamTextItem}>
                                    <h4 className={styles.textMemberName}>{member.name}</h4>
                                    <span className={styles.textMemberRole}>{member.role}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </AnimateOnScroll>

            <AnimateOnScroll animation="fadeUp">
                <section className={styles.benefitsSection}>
                    <div className="premium-container">
                        <div className={styles.sectionHeaderCentered}>
                            <div className={styles.sectionBadge}>Perks</div>
                            <h2 className={styles.sectionTitleCentered}>
                                Why You&apos;ll Love <span className={styles.highlight}>Working Here</span>
                            </h2>
                            <p className={styles.sectionSubtitleCentered}>
                                Build important recruitment infrastructure alongside people who value clarity, craftsmanship, and collaboration.
                            </p>
                        </div>

                        <div className={styles.benefitsGrid}>
                            {BENEFITS.map((b, i) => (
                                <div key={i} className={`${styles.benefitCard} glass-card`}>
                                    <div className={styles.benefitIcon}>{b.icon}</div>
                                    <h3 className={styles.benefitTitle}>{b.title}</h3>
                                    <p className={styles.benefitDesc}>{b.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </AnimateOnScroll>

            <AnimateOnScroll animation="fadeUp">
                <section className={styles.rolesSection} id="open-roles">
                    <div className="premium-container">
                        <div className={styles.sectionHeaderCentered}>
                            <h2 className={styles.sectionTitleCentered}>
                                Explore Our Open Roles <span className={styles.highlight}>and Join the Team</span>
                            </h2>
                            <p className={styles.sectionSubtitleCentered}>
                                All positions are remote-first, but we have hubs globally.
                            </p>
                        </div>

                        <div className={styles.tabsRow}>
                            {['All Teams', 'Engineering', 'Product & Design', 'Marketing', 'Customer Success'].map((tab) => (
                                <button
                                    key={tab}
                                    className={`${styles.tabBtn} ${selectedTab === tab ? styles.tabBtnActive : ''}`}
                                    onClick={() => setSelectedTab(tab)}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        <div className={styles.rolesList}>
                            {filteredJobs.length > 0 ? (
                                filteredJobs.map((job, idx) => (
                                    <div key={idx} className={`${styles.roleRow} glass-card`}>
                                        <div className={styles.roleLeft}>
                                            <h3 className={styles.roleJobTitle}>{job.title}</h3>
                                            <span className={styles.roleMeta}>{job.team} • {job.location}</span>
                                        </div>
                                        <Link href="/portals/jobs/contact" className={styles.roleApplyBtn}>
                                            Apply Now <ArrowUpRight size={14} />
                                        </Link>
                                    </div>
                                ))
                            ) : (
                                <div className={styles.noRoles}>
                                    No open roles found in this category. Check back soon!
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            </AnimateOnScroll>

            <AnimateOnScroll animation="fadeUp">
                <section className={styles.faqSection}>
                    <div className="premium-container">
                        <div className={styles.sectionHeaderCentered}>
                            <h2 className={styles.sectionTitleCentered}>
                                Frequently Asked <span className={styles.highlight}>Questions</span>
                            </h2>
                            <p className={styles.sectionSubtitleCentered}>
                                Got questions? We&apos;ve got answers. If you can&apos;t find what you are looking for, contact us.
                            </p>
                        </div>

                        <div className={styles.faqAccordion}>
                            {FAQS.map((faq, i) => (
                                <div key={i} className={`${styles.faqItem} glass-card`}>
                                    <button
                                        className={styles.faqHeader}
                                        onClick={() => toggleFaq(i)}
                                    >
                                        <span className={styles.faqQuestion}>{faq.q}</span>
                                        <span className={styles.faqToggle}>
                                            {expandedFaq === i ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                        </span>
                                    </button>
                                    <div className={`${styles.faqBody} ${expandedFaq === i ? styles.faqBodyExpanded : ''}`}>
                                        <p className={styles.faqAnswer}>{faq.a}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </AnimateOnScroll>

            <CTA
                glass
                title={<>Ready to Find Your Next <span className="text-gradient">Dream Role?</span></>}
                description="Join the mesh, explore open positions, and build the future of talent infrastructure."
                buttonText="Explore Open Roles"
                buttonLink="#open-roles"
            />
        </main>
        */
        null
    );
}
