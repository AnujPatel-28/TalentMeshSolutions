"use client";
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { insforge } from '@/lib/insforge';
import CandidateProfileDrawer from '@/components/recruiter/CandidateProfileDrawer';
import { HomeSkeleton } from '@/components/ui/DashboardSkeleton';
import styles from '../candidates.module.css';
import sharedStyles from '../../../../shared-dashboard.module.css';

export default function ShortlistedCandidatesPage() {
    const { user } = useAuth();
    const [candidates, setCandidates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    useEffect(() => {
        if (!user?.id) return;
        insforge.database
            .from('applications')
            .select('id, candidate:profiles!candidate_id(id, name, location, avatar_url, candidate_profiles(headline, skills)), jobs!inner(title, recruiter_id), status, applied_at')
            .eq('status', 'shortlisted')
            .order('applied_at', { ascending: false })
            .then(({ data }) => {
                const list = (data || []).map((row: any) => {
                    const p = row.candidate;
                    if (!p) return null;
                    const cp = Array.isArray(p.candidate_profiles) ? p.candidate_profiles[0] : p.candidate_profiles;
                    return {
                        id: p.id,
                        name: p.name,
                        location: p.location,
                        role: cp?.headline || 'Candidate',
                        skills: cp?.skills || [],
                        avatarUrl: p.avatar_url,
                        jobTitle: row.jobs?.title || '—'
                    };
                }).filter(Boolean);
                setCandidates(list);
                setLoading(false);
            });
    }, [user?.id]);

    if (loading) return <HomeSkeleton />;

    return (
        <div className={styles.candPage}>
            <div className={styles.pageHead}>
                <div>
                    <h1 className={styles.pageTitle}>Shortlisted Candidates</h1>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>
                        {candidates.length} candidate{candidates.length !== 1 ? 's' : ''} shortlisted
                    </p>
                </div>
            </div>

            {candidates.length === 0 ? (
                <div className={sharedStyles.emptyState}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.3">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                    <p>No shortlisted candidates. Mark candidates as shortlisted from the pipeline.</p>
                </div>
            ) : (
                <div className={styles.candGrid}>
                    {candidates.map((c: any) => (
                        <div 
                            key={c.id} 
                            className={styles.candFullCard}
                            onClick={() => setSelectedId(c.id)}
                            style={{ cursor: 'pointer' }}
                        >
                            <div className={styles.candFullHead}>
                                {c.avatarUrl ? (
                                    <img src={c.avatarUrl} alt="" className={styles.candFullAvatar} style={{ objectFit: 'cover' }} />
                                ) : (
                                    <div className={styles.candFullAvatar} style={{ background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff' }}>
                                        {c.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                                    </div>
                                )}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div className={styles.candFullName}>{c.name}</div>
                                    <div className={styles.candFullRole}>{c.role}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#8b5cf6', fontWeight: 600, marginTop: '2px' }}>
                                        Applying for: {c.jobTitle}
                                    </div>
                                </div>
                            </div>
                            <div className={styles.candFullTags}>
                                {(c.skills || []).slice(0, 4).map((s: string) => (
                                    <span key={s} className={styles.candFullTag}>{s}</span>
                                ))}
                                {(c.skills || []).length > 4 && (
                                    <span className={styles.candFullTag} style={{ background: '#f1f5f9', borderStyle: 'dashed' }}>
                                        +{(c.skills || []).length - 4} more
                                    </span>
                                )}
                            </div>
                            <div className={styles.candFullFoot}>
                                <span className={styles.candFullLoc}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                        <circle cx="12" cy="10" r="3" />
                                    </svg>
                                    {c.location || 'Remote'}
                                </span>
                                <span style={{ background: '#f0fdf4', color: '#16a34a', fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: '99px' }}>
                                    Shortlisted
                                </span>
                            </div>
                            <div className={styles.candFullActions}>
                                <button 
                                    className={styles.candViewBtn}
                                    style={{ gridColumn: '1 / -1' }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedId(c.id);
                                    }}
                                >
                                    View Profile
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <CandidateProfileDrawer candidateId={selectedId} onClose={() => setSelectedId(null)} />
        </div>
    );
}
