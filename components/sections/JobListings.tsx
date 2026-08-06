"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import styles from './JobListings.module.css';

const categories = [
    {
        icon: (
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 7H6a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-3M9 7h6m-6 0V5a2 2 0 012-2h2a2 2 0 012 2v2M9 7h6m-3 4v4m0 0H9m3 0h3" />
            </svg>
        ),
        label: 'Accounting',
    },
    {
        icon: (
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
        ),
        label: 'Business & consulting',
    },
    {
        icon: (
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        ),
        label: 'Human research',
    },
    {
        icon: (
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
        ),
        label: 'Marketing and finance',
    },
    {
        icon: (
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
        ),
        label: 'Design & development',
    },
    {
        icon: (
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        label: 'Finance management',
    },
    {
        icon: (
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
        ),
        label: 'Project management',
    },
    {
        icon: (
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
        ),
        label: 'Customer services',
    },
];

type BadgeVariant = 'blue' | 'gray' | 'green' | 'orange' | 'purple';

interface Job {
    id: number;
    category: string;
    title: string;
    location: string;
    salary: string;
    posted: string;
    type: string;
    badge: BadgeVariant;
    logo: string;
    logoColor: string;
    logoBg: string;
}

const allJobs: Job[] = [
    // Accounting
    { id: 101, category: 'Accounting', title: 'Senior Tax Accountant', location: 'Mumbai, MH', salary: '$90k – $110k', posted: '1 day ago', type: 'Full-Time', badge: 'gray', logo: 'AC', logoColor: '#fff', logoBg: '#2ecc71' },
    { id: 102, category: 'Accounting', title: 'Audit Manager', location: 'Delhi, NCR', salary: '$85k – $100k', posted: '3 days ago', type: 'Full-Time', badge: 'gray', logo: 'AM', logoColor: '#fff', logoBg: '#3498db' },

    // Business & Consulting
    { id: 201, category: 'Business & consulting', title: 'Strategy Consultant', location: 'Pune, MH', salary: '$95k – $130k', posted: '2 days ago', type: 'Contract', badge: 'orange', logo: 'SC', logoColor: '#fff', logoBg: '#9b59b6' },
    { id: 202, category: 'Business & consulting', title: 'Business Analyst', location: 'Remote', salary: '$75k – $95k', posted: '5 days ago', type: 'Full-Time', badge: 'gray', logo: 'BA', logoColor: '#fff', logoBg: '#e67e22' },

    // Human Research
    { id: 301, category: 'Human research', title: 'UX Researcher', location: 'Bangalore, KA', salary: '$100k – $125k', posted: '1 day ago', type: 'Full-Time', badge: 'gray', logo: 'UX', logoColor: '#fff', logoBg: '#e74c3c' },
    { id: 302, category: 'Human research', title: 'Behavioral Scientist', location: 'Gurugram, HR', salary: '$70k – $90k', posted: '4 days ago', type: 'Part-Time', badge: 'purple', logo: 'BS', logoColor: '#fff', logoBg: '#f1c40f' },

    // Marketing & Finance (Default Active)
    { id: 1, category: 'Marketing and finance', title: 'Digital Marketing Manager', location: 'Kolkata, WB', salary: '$60k – $80k', posted: '2 days ago', type: 'Internship', badge: 'blue', logo: 'DM', logoColor: '#1a73e8', logoBg: '#e8f0fe' },
    { id: 2, category: 'Marketing and finance', title: 'Financial Analyst', location: 'Mumbai, India', salary: '$55k – $75k', posted: '1 day ago', type: 'Full-Time', badge: 'gray', logo: 'FA', logoColor: '#ffffff', logoBg: '#3d5a99' },
    { id: 3, category: 'Marketing and finance', title: 'SEO Specialist', location: 'Remote', salary: '$50k – $65k', posted: '3 days ago', type: 'Part-Time', badge: 'purple', logo: 'SE', logoColor: '#ffffff', logoBg: '#e05c2a' },

    // Design & Development
    { id: 401, category: 'Design & development', title: 'Senior Frontend Engineer', location: 'Kochi, KL', salary: '$110k – $140k', posted: '2 days ago', type: 'Freelance', badge: 'orange', logo: 'FE', logoColor: '#ffffff', logoBg: '#ff4500' },
    { id: 402, category: 'Design & development', title: 'Product Designer', location: 'Hyderabad, TS', salary: '$90k – $115k', posted: '5 days ago', type: 'Full-Time', badge: 'gray', logo: 'PD', logoColor: '#ffffff', logoBg: '#8e44ad' },

    // Finance Management
    { id: 501, category: 'Finance management', title: 'Chief Financial Officer', location: 'Mumbai, MH', salary: '$180k – $220k', posted: '1 day ago', type: 'Full-Time', badge: 'gray', logo: 'CF', logoColor: '#fff', logoBg: '#2c3e50' },
    { id: 502, category: 'Finance management', title: 'Investment Analyst', location: 'Chennai, TN', salary: '$80k – $100k', posted: '3 days ago', type: 'Internship', badge: 'blue', logo: 'IA', logoColor: '#fff', logoBg: '#16a085' },

    // Project Management
    { id: 601, category: 'Project management', title: 'Technical Program Manager', location: 'Noida, UP', salary: '$125k – $155k', posted: '2 days ago', type: 'Full-Time', badge: 'gray', logo: 'PM', logoColor: '#fff', logoBg: '#27ae60' },
    { id: 602, category: 'Project management', title: 'Scrum Master', location: 'Remote', salary: '$90k – $110k', posted: '6 days ago', type: 'Contract', badge: 'orange', logo: 'SM', logoColor: '#fff', logoBg: '#2980b9' },

    // Customer Services
    { id: 701, category: 'Customer services', title: 'Customer Success Manager', location: 'Chandigarh, CH', salary: '$65k – $80k', posted: '1 day ago', type: 'Full-Time', badge: 'gray', logo: 'CS', logoColor: '#fff', logoBg: '#d35400' },
    { id: 702, category: 'Customer services', title: 'Support Team Lead', location: 'Remote', salary: '$50k – $65k', posted: '4 days ago', type: 'Part-Time', badge: 'purple', logo: 'TL', logoColor: '#fff', logoBg: '#c0392b' },
];

const badgeClass: Record<BadgeVariant, string> = {
    blue: styles.badgeBlue,
    gray: styles.badgeGray,
    green: styles.badgeGreen,
    orange: styles.badgeOrange,
    purple: styles.badgePurple,
};

const JobListings = () => {
    const [activeCategory, setActiveCategory] = useState<string>('Marketing and finance');
    const filteredJobs = allJobs.filter(job => job.category === activeCategory);

    return (
        <section className={styles.section}>
            <div className={styles.container}>
                {/* Headline */}
                <div className={styles.headlineGroup}>
                    <h2 className={styles.title}>
                        Find your <span className={styles.highlight}>favorite job</span>
                    </h2>
                    <p className={styles.subtitle}>Explore curated roles that match your expertise.</p>
                </div>

                {/* Mock App Window */}
                <div className={styles.appWindow}>
                    {/* Window chrome dots */}
                    <div className={styles.windowBar}>
                        <span className={styles.dot} style={{ background: '#ff5f57' }} />
                        <span className={styles.dot} style={{ background: '#febc2e' }} />
                        <span className={styles.dot} style={{ background: '#28c840' }} />
                    </div>

                    <div className={styles.layout}>
                        {/* Sidebar */}
                        <aside className={styles.sidebar}>
                            <p className={styles.sidebarLabel}>Categories</p>
                            {categories.map((cat) => (
                                <button
                                    key={cat.label}
                                    className={`${styles.categoryItem} ${activeCategory === cat.label ? styles.categoryActive : ''}`}
                                    onClick={() => setActiveCategory(cat.label)}
                                >
                                    <span className={styles.categoryIcon}>{cat.icon}</span>
                                    <span className={styles.categoryLabel}>{cat.label}</span>
                                </button>
                            ))}
                        </aside>

                        {/* Job Cards */}
                        <div className={styles.jobsPanel}>
                            <div className={styles.jobList}>
                                {filteredJobs.length > 0 ? (
                                    filteredJobs.map((job) => (
                                        <div key={job.id} className={styles.jobCard}>
                                            {/* Left: logo + details */}
                                            <div className={styles.jobInfo}>
                                                <div
                                                    className={styles.jobLogo}
                                                    style={{ background: job.logoBg, color: job.logoColor }}
                                                >
                                                    {job.logo}
                                                </div>
                                                <div className={styles.jobDetails}>
                                                    <h3 className={styles.jobTitle}>{job.title}</h3>
                                                    <div className={styles.jobMeta}>
                                                        <span className={styles.metaItem}>
                                                            📍 {job.location}
                                                        </span>
                                                        <span className={styles.metaDot} />
                                                        <span className={styles.metaItem}>
                                                            💰 {job.salary}
                                                        </span>
                                                        <span className={styles.metaDot} />
                                                        <span className={styles.metaItem}>
                                                            🕒 {job.posted}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Right: badge + button */}
                                            <div className={styles.jobActions}>
                                                <span className={`${styles.badge} ${badgeClass[job.badge]}`}>
                                                    {job.type}
                                                </span>
                                                <Link href="/browse-jobs" className={styles.viewBtn}>
                                                    View Job
                                                </Link>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className={styles.emptyState}>No jobs found in this category.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* CTA */}
                <div className={styles.ctaWrapper}>
                    <Link href="/browse-jobs" className={styles.browseBtn}>
                        Browse all jobs
                        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                    </Link>
                </div>
            </div>
        </section>
    );
};

export default JobListings;

