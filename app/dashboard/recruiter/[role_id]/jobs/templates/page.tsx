"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import styles from '../../../../shared-dashboard.module.css';

const TEMPLATES = [
    {
        id: 'software-engineer',
        title: 'Software Engineer',
        category: 'Engineering',
        description: 'Full-stack developer role with experience in React, Node.js, and cloud platforms.',
        tags: ['React', 'Node.js', 'AWS', 'TypeScript'],
        color: '#3b82f6',
    },
    {
        id: 'product-manager',
        title: 'Product Manager',
        category: 'Product',
        description: 'Own the product roadmap, work closely with engineering and design teams.',
        tags: ['Roadmapping', 'Agile', 'Analytics', 'User Research'],
        color: '#8b5cf6',
    },
    {
        id: 'ux-designer',
        title: 'UX / UI Designer',
        category: 'Design',
        description: 'Create intuitive user experiences for web and mobile applications.',
        tags: ['Figma', 'User Testing', 'Wireframing', 'Prototyping'],
        color: '#ec4899',
    },
    {
        id: 'data-scientist',
        title: 'Data Scientist',
        category: 'Analytics',
        description: 'Build ML models, analyse data pipelines, and surface actionable insights.',
        tags: ['Python', 'ML', 'SQL', 'TensorFlow'],
        color: '#f59e0b',
    },
    {
        id: 'sales-rep',
        title: 'Sales Representative',
        category: 'Sales',
        description: 'Drive revenue through outbound prospecting and inbound qualification.',
        tags: ['CRM', 'B2B', 'Cold Outreach', 'Negotiation'],
        color: '#10b981',
    },
    {
        id: 'devops-engineer',
        title: 'DevOps Engineer',
        category: 'Engineering',
        description: 'Maintain CI/CD pipelines, Kubernetes clusters, and infrastructure as code.',
        tags: ['Kubernetes', 'Terraform', 'CI/CD', 'Docker'],
        color: '#0ea5e9',
    },
];

export default function JobTemplatesPage() {
    const params = useParams();
    const roleId = params.role_id as string;
    const [search, setSearch] = useState('');

    const filtered = TEMPLATES.filter(t =>
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.category.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className={styles.dash}>
            <div className={styles.pageHeader}>
                <div>
                    <h1 className={styles.pageTitle}>Job Templates</h1>
                    <p className={styles.pageSubtitle}>Start from a template and customise it for your open role</p>
                </div>
                <input
                    type="text"
                    placeholder="Search templates…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{
                        padding: '0.6rem 1rem', border: '1px solid #e2e8f0', borderRadius: '10px',
                        fontSize: '0.875rem', width: 220, outline: 'none', background: '#f8fafc'
                    }}
                />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem', marginTop: '1.5rem' }}>
                {filtered.map(tpl => (
                    <div key={tpl.id} style={{
                        background: '#fff', borderRadius: '14px', border: '1px solid #e8edf3',
                        overflow: 'hidden', transition: 'box-shadow 0.2s',
                        boxShadow: '0 1px 8px rgba(0,0,0,0.04)'
                    }}>
                        <div style={{ height: 4, background: tpl.color }} />
                        <div style={{ padding: '1.25rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                <span style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>{tpl.title}</span>
                                <span style={{ fontSize: '0.72rem', fontWeight: 600, background: `${tpl.color}18`, color: tpl.color, padding: '2px 8px', borderRadius: '99px' }}>{tpl.category}</span>
                            </div>
                            <p style={{ fontSize: '0.8125rem', color: '#64748b', lineHeight: 1.618, marginBottom: '0.75rem' }}>{tpl.description}</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
                                {tpl.tags.map(tag => (
                                    <span key={tag} style={{ fontSize: '0.72rem', padding: '2px 8px', background: '#f1f5f9', color: '#475569', borderRadius: '6px', fontWeight: 500 }}>{tag}</span>
                                ))}
                            </div>
                            <Link
                                href={`/dashboard/recruiter/${roleId}/jobs/post-job?template=${tpl.id}`}
                                style={{
                                    display: 'block', textAlign: 'center', padding: '0.55rem 1rem',
                                    background: tpl.color, color: '#fff', borderRadius: '8px',
                                    fontSize: '0.8125rem', fontWeight: 600, textDecoration: 'none',
                                    transition: 'opacity 0.15s'
                                }}
                            >
                                Use This Template
                            </Link>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
