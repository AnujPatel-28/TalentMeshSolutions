"use client";
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { invokeFunction, insforge } from '@/lib/insforge';
import { HomeSkeleton } from '@/components/ui/DashboardSkeleton';
import styles from './pipeline.module.css';

const STAGES = [
    { id: 'applied',      label: 'Applied',      color: 'var(--status-info-text)',      bg: 'var(--status-info-bg)' },
    { id: 'reviewing',    label: 'Reviewing',    color: 'var(--status-info-text)',      bg: 'var(--status-info-bg)' },
    { id: 'shortlisted',  label: 'Shortlisted',  color: 'var(--status-purple-text)',   bg: 'var(--status-purple-bg)' },
    { id: 'interviewing', label: 'Interviewing', color: 'var(--status-warning-text)',    bg: 'var(--status-warning-bg)' },
    { id: 'offered',      label: 'Offered',      color: 'var(--status-success-text)',   bg: 'var(--status-success-bg)' },
    { id: 'hired',        label: 'Hired',        color: 'var(--status-success-text)', bg: 'var(--status-success-bg)' },
    { id: 'rejected',     label: 'Rejected',     color: 'var(--status-error-text)',     bg: 'var(--status-error-bg)' },
    { id: 'withdrawn',    label: 'Withdrawn',    color: 'var(--neutral-text-muted)', bg: 'var(--neutral-surface)' },
] as const;

type Stage = typeof STAGES[number]['id'];
type Card = { id: string; name: string; role: string; job: string; avatar: string; stage: Stage };

export default function HiringPipelinePage() {
    const { user } = useAuth();
    const [pipeline, setPipeline] = useState<Record<Stage, Card[]>>({
        applied: [], reviewing: [], shortlisted: [], interviewing: [], offered: [], hired: [], rejected: [], withdrawn: [],
    });
    const [loading, setLoading] = useState(true);
    const dragging = useRef<{ card: Card; fromStage: Stage } | null>(null);

    const load = useCallback(async () => {
        if (!user?.id) return;
        try {
            const { data, error } = await insforge.database
                .from('applications')
                .select('id, candidate:profiles!candidate_id(id, name, location, avatar_url, candidate_profiles(headline, skills)), jobs!inner(title, company_id), status, applied_at');

            if (error) {
                console.error('Failed to load applications:', error);
                return;
            }

            if (data) {
                const grouped: any = { applied: [], reviewing: [], shortlisted: [], interviewing: [], offered: [], hired: [], rejected: [], withdrawn: [] };
                (data as any[]).forEach((item: any) => {
                    const stageKey = item.status?.toLowerCase() as Stage;
                    if (grouped[stageKey]) {
                        const p = item.candidate;
                        const cp = p?.candidate_profiles ? (Array.isArray(p.candidate_profiles) ? p.candidate_profiles[0] : p.candidate_profiles) : null;
                        grouped[stageKey].push({
                            id: item.id,
                            name: p?.name || 'Candidate',
                            role: cp?.headline || '—',
                            job: item.jobs?.title || '—',
                            avatar: (p?.name || 'C').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase(),
                            stage: stageKey,
                        });
                    }
                });
                setPipeline(grouped);
            }
        } catch (err) {
            console.error('Unexpected error loading pipeline:', err);
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        if (!user?.id) return;
        
        load();

        const channel = (insforge.realtime as any).channel('pipeline_changes');
        
        channel
            .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, async (payload: any) => {
                const { eventType, new: newRow, old: oldRow } = payload;
                
                if (eventType === 'UPDATE') {
                    const newStage = newRow.status?.toLowerCase() as Stage;
                    const appId = newRow.id;
                    
                    setPipeline(prev => {
                        let foundCard: Card | null = null;
                        let fromStage: Stage | null = null;
                        
                        for (const stage of Object.keys(prev) as Stage[]) {
                            const match = prev[stage].find(c => c.id === appId);
                            if (match) {
                                foundCard = match;
                                fromStage = stage;
                                break;
                            }
                        }
                        
                        if (foundCard && fromStage && fromStage !== newStage) {
                            return {
                                ...prev,
                                [fromStage]: prev[fromStage].filter(c => c.id !== appId),
                                [newStage]: [...prev[newStage], { ...foundCard, stage: newStage }]
                            };
                        }
                        return prev;
                    });
                } else if (eventType === 'INSERT') {
                    // Fetch details of the newly inserted application
                    const { data: item, error } = await insforge.database
                        .from('applications')
                        .select('id, candidate:profiles!candidate_id(id, name, location, avatar_url, candidate_profiles(headline, skills)), jobs!inner(title, recruiter_id), status, applied_at')
                        .eq('id', newRow.id)
                        .single();
                        
                    if (!error && item) {
                        const rawItem = item as any;
                        const stageKey = rawItem.status?.toLowerCase() as Stage;
                        const p = rawItem.candidate;
                        const cp = p?.candidate_profiles ? (Array.isArray(p.candidate_profiles) ? p.candidate_profiles[0] : p.candidate_profiles) : null;
                        
                        const newCard: Card = {
                            id: rawItem.id,
                            name: p?.name || 'Candidate',
                            role: cp?.headline || '—',
                            job: rawItem.jobs?.title || '—',
                            avatar: (p?.name || 'C').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase(),
                            stage: stageKey,
                        };
                        
                        setPipeline(prev => {
                            if (prev[stageKey].some(c => c.id === newCard.id)) return prev;
                            return {
                                ...prev,
                                [stageKey]: [...prev[stageKey], newCard]
                            };
                        });
                    }
                } else if (eventType === 'DELETE') {
                    const appId = oldRow.id;
                    setPipeline(prev => {
                        const next = { ...prev };
                        for (const stage of Object.keys(next) as Stage[]) {
                            next[stage] = next[stage].filter(c => c.id !== appId);
                        }
                        return next;
                    });
                }
            })
            .subscribe();

        return () => {
            (insforge.realtime as any).removeChannel(channel);
        };
    }, [user?.id, load]);

    const handleDragStart = (card: Card, fromStage: Stage) => {
        dragging.current = { card, fromStage };
    };

    const handleDrop = (toStage: Stage) => {
        if (!dragging.current) return;
        const { card, fromStage } = dragging.current;
        if (fromStage === toStage) return;

        const originalPipeline = { ...pipeline };

        // Optimistic UI update
        setPipeline(prev => ({
            ...prev,
            [fromStage]: prev[fromStage].filter(c => c.id !== card.id),
            [toStage]: [...prev[toStage], { ...card, stage: toStage }],
        }));
        dragging.current = null;

        // Persist status change in DB
        invokeFunction('update-application', { body: { id: card.id, status: toStage } }).then(({ error }) => {
            if (error) {
                console.error('Failed to update stage in DB:', error.message);
                setPipeline(originalPipeline);
            }
        }).catch((err) => {
            console.error('Unexpected error updating stage:', err);
            setPipeline(originalPipeline);
        });
    };

    if (loading) return <HomeSkeleton />;

    const total = Object.values(pipeline).flat().length;

    return (
        <div className={styles.pipelineWrapper}>
            <div className={styles.pipelineHeader}>
                <h1 className={styles.pageTitle}>Hiring Pipeline</h1>
                <p className={styles.pageSub}>{total} candidates across all stages · drag cards to move them</p>
            </div>

            <div className={styles.kanbanScroll}>
                {STAGES.map(stage => {
                    const cards = pipeline[stage.id] || [];
                    return (
                        <div
                            key={stage.id}
                            onDragOver={e => e.preventDefault()}
                            onDrop={() => handleDrop(stage.id)}
                            className={styles.stageCol}
                        >
                            {/* Column header */}
                            <div 
                                className={styles.stageHeader} 
                                style={{ 
                                    background: stage.bg, 
                                    borderBottomColor: stage.color 
                                }}
                            >
                                <span className={styles.stageLabel} style={{ color: stage.color }}>{stage.label}</span>
                                <span className={styles.stageBadge} style={{ background: stage.color }}>{cards.length}</span>
                            </div>

                            {/* Cards */}
                            <div className={styles.stageBody}>
                                {cards.length === 0 && (
                                    <div className={styles.emptyHint}>Drop here</div>
                                )}
                                {cards.map(card => (
                                    <div
                                        key={card.id}
                                        draggable
                                        onDragStart={() => handleDragStart(card, stage.id)}
                                        className={styles.candCard}
                                    >
                                        <div className={styles.cardHead}>
                                            <div className={styles.avatar} style={{ background: stage.color }}>
                                                {card.avatar}
                                            </div>
                                            <div className={styles.metaInfo}>
                                                <div className={styles.name}>{card.name}</div>
                                                <div className={styles.role}>{card.role}</div>
                                            </div>
                                        </div>
                                        {card.job && (
                                            <div className={styles.jobLabel}>
                                                {card.job}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
