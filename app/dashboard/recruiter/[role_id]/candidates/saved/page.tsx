"use client";
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { insforge } from '@/lib/insforge';
import CandidateProfileDrawer from '@/components/recruiter/CandidateProfileDrawer';
import { HomeSkeleton } from '@/components/ui/DashboardSkeleton';
import styles from '../candidates.module.css';
import sharedStyles from '../../../../shared-dashboard.module.css';

export default function SavedCandidatesPage() {
    const { user } = useAuth();
    const [candidates, setCandidates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const fetch = async () => {
        if (!user?.id) return;
        const { data } = await insforge.database
            .from('saved_candidates')
            .select('candidate_id, candidate:profiles!candidate_id(id, name, location, avatar_url, candidate_profiles(headline, skills))')
            .eq('recruiter_id', user.id)
            .order('created_at', { ascending: false });

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
                avatarUrl: p.avatar_url
            };
        }).filter(Boolean);
        setCandidates(list);
        setLoading(false);
    };

    useEffect(() => {
        fetch();
    }, [user?.id]);

    const unsave = async (candidateId: string) => {
        await insforge.database
            .from('saved_candidates')
            .delete()
            .eq('recruiter_id', user!.id)
            .eq('candidate_id', candidateId);
        setCandidates(prev => prev.filter(c => c.id !== candidateId));
    };

    if (loading) return <HomeSkeleton />;

    return (
        <div className={styles.candPage}>
            <div className={styles.pageHead}>
                <div>
                    <h1 className={styles.pageTitle}>Saved Candidates</h1>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>
                        {candidates.length} candidate{candidates.length !== 1 ? 's' : ''} bookmarked
                    </p>
                </div>
            </div>

            {candidates.length === 0 ? (
                <div className={sharedStyles.emptyState}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.3">
                        <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                    </svg>
                    <p>No saved candidates yet. Browse candidates and bookmark the ones you like.</p>
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
                                    <div className={styles.candFullAvatar}>
                                        {c.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                                    </div>
                                )}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div className={styles.candFullName}>{c.name}</div>
                                    <div className={styles.candFullRole}>{c.role}</div>
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
                            </div>
                            <div className={styles.candFullActions}>
                                <button 
                                    className={styles.candViewBtn}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedId(c.id);
                                    }}
                                >
                                    View Profile
                                </button>
                                <button
                                    onClick={e => { e.stopPropagation(); unsave(c.id); }}
                                    className={styles.candSaveBtn}
                                    title="Remove from saved"
                                    style={{ background: '#fef2f2', borderColor: '#fca5a5', color: '#ef4444' }}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="3 6 5 6 21 6"></polyline>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    </svg>
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
