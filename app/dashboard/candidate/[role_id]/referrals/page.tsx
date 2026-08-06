"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

type TabKey = 'reviews' | 'questions' | 'answers';

export default function MyReviewsPage() {
    const params = useParams();
    const roleId = params.role_id as string;
    const [activeTab, setActiveTab] = useState<TabKey>('reviews');

    const TABS: { key: TabKey; label: string; count: number }[] = [
        { key: 'reviews', label: 'Reviews', count: 0 },
        { key: 'questions', label: 'Questions', count: 0 },
        { key: 'answers', label: 'Answers', count: 0 },
    ];

    return (
        <div style={{ width: '100%', minHeight: '100vh', backgroundColor: '#ffffff', fontFamily: 'Inter, system-ui, sans-serif' }}>
            <div style={{ maxWidth: '760px', margin: '0 auto', padding: '2.5rem 2rem 4rem' }}>

                {/* Page title */}
                <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#12263A', margin: '0 0 0.5rem', letterSpacing: '-0.02em' }}>
                    My contributions
                </h1>
                <p style={{ fontSize: '14px', color: '#475569', margin: '0 0 2rem', maxWidth: '560px', lineHeight: 1.5 }}>
                    Your reviews, questions and answers will appear on the employer's Company Page. They are not associated with your name, CV or job applications.
                </p>

                {/* ─── Tab Strip ─── */}
                <div style={{ display: 'flex', borderBottom: '2px solid #e2e5ea', gap: '0', marginBottom: '0' }}>
                    {TABS.map(tab => {
                        const isActive = activeTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                style={{
                                    padding: '0 24px 14px',
                                    border: 'none',
                                    background: 'none',
                                    cursor: 'pointer',
                                    borderBottom: `2px solid ${isActive ? '#12263A' : 'transparent'}`,
                                    marginBottom: '-2px',
                                    fontSize: '14px',
                                    fontWeight: isActive ? 700 : 400,
                                    color: isActive ? '#12263A' : '#6B7280',
                                    outline: 'none',
                                    transition: 'all 0.15s'
                                }}
                            >
                                {tab.label} ({tab.count})
                            </button>
                        );
                    })}
                </div>

                {/* ─── Empty state ─── */}
                <div style={{ padding: '5rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    {/* Lock illustration (matching Indeed's lock-with-stars icon) */}
                    <div style={{ position: 'relative', width: 110, height: 110, marginBottom: '1.5rem' }}>
                        {/* Pink background blob */}
                        <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 90, height: 55, background: '#FBBCBB', borderRadius: '50% 50% 0 0' }} />
                        {/* Lock body */}
                        <div style={{ position: 'absolute', top: 28, left: '50%', transform: 'translateX(-50%)', width: 64, height: 52, background: '#C8942C', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                            <span style={{ color: '#ffffff', fontSize: '18px' }}>★</span>
                            <span style={{ color: '#ffffff', fontSize: '18px' }}>★</span>
                            <span style={{ color: '#ffffff', fontSize: '18px' }}>★</span>
                        </div>
                        {/* Lock shackle (arch) */}
                        <div style={{ position: 'absolute', top: 4, left: '50%', transform: 'translateX(-50%)', width: 42, height: 34, borderTop: '10px solid #1e5a87', borderLeft: '10px solid #1e5a87', borderRight: '10px solid #1e5a87', borderRadius: '999px 999px 0 0', background: 'transparent' }} />
                    </div>

                    <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#12263A', margin: '0 0 0.5rem' }}>
                        {activeTab === 'reviews' ? 'Unlock all reviews' : activeTab === 'questions' ? 'No questions yet' : 'No answers yet'}
                    </h2>
                    <p style={{ fontSize: '14px', color: '#475569', margin: '0 0 2rem' }}>
                        {activeTab === 'reviews'
                            ? 'Access all reviews by writing yours'
                            : activeTab === 'questions'
                                ? 'Ask a question about a company to help others'
                                : 'Answer a question to help fellow jobseekers'}
                    </p>

                    <Link
                        href="/candidate/dashboard/company-reviews"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: '#007BFF',
                            color: '#ffffff',
                            textDecoration: 'none',
                            padding: '0.75rem 2rem',
                            borderRadius: '8px',
                            fontWeight: 700,
                            fontSize: '15px',
                            transition: 'background 0.15s'
                        }}
                    >
                        {activeTab === 'reviews' ? 'Write a review' : activeTab === 'questions' ? 'Ask a question' : 'Answer a question'}
                        &nbsp;→
                    </Link>
                </div>

                {/* Footer note */}
                <p style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', marginTop: '2rem' }}>
                    Reviews are anonymous and not linked to your profile or job applications.
                </p>
            </div>
        </div>
    );
}
