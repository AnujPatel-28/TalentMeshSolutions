'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Toast from '@/components/ui/Toast';
import styles from './jobDetail.module.css';
import { useAuth } from '@/lib/auth/AuthContext';
import { useSavedJobs } from '@/hooks/useSavedJobs';

import { invokeFunction } from '@/lib/insforge';
import AnimateOnScroll from '@/components/AnimateOnScroll';
import { getPublicStorageUrl } from '@/lib/utils/storage-url';

// ─── Icons ──────────────────────────────────────────────────────────────────────
const Ico = {
    Location: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>,
    Briefcase: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /></svg>,
    Sparkle: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="m12 3 1.912 5.885L20 10.8l-5.088 1.912L13 18.6l-1.912-5.888L6 10.8l5.088-1.915Z" /></svg>,
    Heart: ({ filled }: { filled?: boolean } = {}) => <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? "#ef4444" : "none"} stroke={filled ? "#ef4444" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>,
    Share: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>,
    Clock: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
    ArrowR: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14m-7-7 7 7-7 7" /></svg>,
    Check: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
    Star: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>,
    Salary: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>,
    Globe: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>,
    Building: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" /><line x1="9" y1="6" x2="10" y2="6" /><line x1="14" y1="6" x2="15" y2="6" /><line x1="9" y1="10" x2="10" y2="10" /><line x1="14" y1="10" x2="15" y2="10" /><line x1="9" y1="14" x2="10" y2="14" /><line x1="14" y1="14" x2="15" y2="14" /><line x1="9" y1="18" x2="15" y2="18" /></svg>,
    Award: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7" /><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" /></svg>,
    More: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="19" r="1.5" /></svg>,
    Copy: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>,
};

const BENEFIT_ICONS = ['💰', '🏖️', '📚', '💎', '🩺'];

export default function JobDetailPage() {
    const params = useParams();
    const jobId = params.id as string;
    const { user } = useAuth();
    const [job, setJob] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isApplying, setIsApplying] = useState(false);
    const [applied, setApplied] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const [menuOpen, setMenuOpen] = useState(false);

    // Database + LocalStorage saved-jobs fallback for guest candidates (same pattern as /browse-jobs)
    const { isSaved: isDbSaved, toggleSave: toggleDbSave } = useSavedJobs(user?.id || null);
    const [guestSavedIds, setGuestSavedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (typeof window !== 'undefined' && !user?.id) {
            try {
                const raw = localStorage.getItem('guest_saved_jobs');
                if (raw) setGuestSavedIds(new Set(JSON.parse(raw)));
            } catch (e) {
                console.error('Failed reading guest saved jobs', e);
            }
        }
    }, [user?.id]);

    const isSaved = useCallback((id: string) => {
        if (user?.id) return isDbSaved(id);
        return guestSavedIds.has(id);
    }, [user?.id, isDbSaved, guestSavedIds]);

    const handleToggleSave = useCallback(async () => {
        if (!job?.id) return;
        if (user?.id) {
            await toggleDbSave(job.id);
        } else {
            setGuestSavedIds(prev => {
                const next = new Set(prev);
                if (next.has(job.id)) next.delete(job.id);
                else next.add(job.id);
                if (typeof window !== 'undefined') {
                    localStorage.setItem('guest_saved_jobs', JSON.stringify(Array.from(next)));
                }
                return next;
            });
            setToast({
                message: guestSavedIds.has(job.id) ? 'Job removed from bookmarks' : 'Job saved to browser bookmarks!',
                type: 'info'
            });
        }
    }, [job?.id, user?.id, toggleDbSave, guestSavedIds]);

    useEffect(() => {
        async function fetchJob() {
            try {
                const { data, error } = await invokeFunction('jobs-id', {
                    method: 'GET',
                    queries: { id: jobId }
                });

                if (error) {
                    throw new Error(error.message || 'Failed to fetch job');
                }
                
                setJob(data?.job || data);

                if (user) {
                    const { data: appStatus } = await invokeFunction('candidate-applications', {
                        method: 'GET',
                        queries: { jobId }
                    });
                    if (appStatus?.status && appStatus.status !== 'withdrawn') setApplied(true);
                }
            } catch (err) {
                console.error('Error fetching job:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchJob();

        // Close menu on click outside
        const closeMenu = () => setMenuOpen(false);
        window.addEventListener('click', closeMenu);
        return () => window.removeEventListener('click', closeMenu);
    }, [jobId, user]);

    const handleApply = async () => {
        if (!user) {
            window.location.href = '/login';
            return;
        }
        setIsApplying(true);
        try {
            const { error: applyError } = await invokeFunction('candidate-applications', {
                method: 'POST',
                body: { jobId }
            });

            if (applyError) {
                throw new Error(applyError.message || 'Failed to apply.');
            }

            setApplied(true);
            alert('Application sent successfully!');
        } catch (err: any) {
            console.error(err);
            alert(err.message || 'Failed to apply. Please try again.');
        } finally {
            setIsApplying(false);
        }
    };

    const handleCopyLink = async () => {
        const url = window.location.href;
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(url);
                setToast({ message: 'Job link copied to clipboard!', type: 'success' });
            } else {
                const textArea = document.createElement('textarea');
                textArea.value = url;
                textArea.style.position = 'fixed';
                textArea.style.opacity = '0';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                if (successful) {
                    setToast({ message: 'Job link copied to clipboard!', type: 'success' });
                } else {
                    throw new Error('Copy command failed');
                }
            }
        } catch (err) {
            console.error('Copy link failed:', err);
            setToast({ message: `Share link: ${url}`, type: 'info' });
        }
        setMenuOpen(false);
    };

    const handleShare = async () => {
        const url = window.location.href;
        const companyName = job?.company_profiles?.company_name || 'TalentMesh Company';
        const shareData = { 
            title: job?.title || 'Job Opportunity', 
            text: `Check out this ${job?.title} position at ${companyName}`, 
            url 
        };

        if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
            try {
                await navigator.share(shareData);
                setToast({ message: 'Shared successfully!', type: 'success' });
                setMenuOpen(false);
                return;
            } catch (err: any) {
                if (err.name !== 'AbortError') {
                    console.warn('Native share failed:', err);
                } else {
                    setMenuOpen(false);
                    return;
                }
            }
        }

        // Fallback: copy to clipboard
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(url);
                setToast({ message: 'Job link copied to clipboard!', type: 'success' });
            } else {
                const textArea = document.createElement('textarea');
                textArea.value = url;
                textArea.style.position = 'fixed';
                textArea.style.opacity = '0';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                if (successful) {
                    setToast({ message: 'Job link copied to clipboard!', type: 'success' });
                } else {
                    throw new Error('Copy command failed');
                }
            }
        } catch (err) {
            console.error('Clipboard copy failed:', err);
            setToast({ message: `Share link: ${url}`, type: 'info' });
        }
        setMenuOpen(false);
    };

    if (loading) return <div className={styles.page}><p style={{ color: 'white', padding: '5rem', textAlign: 'center' }}>Loading Job Details...</p></div>;

    if (!job) {
        return (
            <main className={styles.page}>
                <div className="premium-container" style={{ padding: '120px 0', textAlign: 'center' }}>
                    <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#0D47A1', marginBottom: 12 }}>Job Not Found</h1>
                    <p style={{ color: '#475569', marginBottom: 24 }}>The job you&apos;re looking for doesn&apos;t exist or has been removed.</p>
                    <Link href="/browse-jobs" style={{ color: '#007BFF', fontWeight: 600, textDecoration: 'underline' }}>← Browse all jobs</Link>
                </div>
            </main>
        );
    }

    const matchColor = job.ai_match_rate >= 90 ? '#059669' : job.ai_match_rate >= 80 ? '#1E88E5' : '#475569';

    return (
        <main className={styles.page}>
            {/* Ken Burns Animated Background Layer */}
            <div className={styles.bgWrapper}>
                <div className={styles.bgImage} />
                <div className={styles.bgOverlay} />
            </div>

            {/* ── Hero ── */}
            <AnimateOnScroll animation="fadeUp">
                <section className={styles.hero}>
                    <div className="premium-container">
                        {/* Breadcrumb */}
                        <nav className={styles.breadcrumb}>
                            <Link href="/">Home</Link>
                            <span className={styles.breadcrumbSep}>›</span>
                            <Link href="/browse-jobs">Browse Jobs</Link>
                            <span className={styles.breadcrumbSep}>›</span>
                            <span>{job.title}</span>
                        </nav>

                        <div className={styles.heroInner}>
                            <div className={styles.companyLogo} style={{ background: job.color || '#0D47A1' }}>
                                {job.company_profiles?.logo_url ? (
                                    <img src={getPublicStorageUrl('company-logos', job.company_profiles.logo_url)} alt={job.company_profiles?.company_name} className={styles.logoImage} />
                                ) : (
                                    job.logo || job.company_profiles?.company_name?.[0]
                                )}
                            </div>

                            <div className={styles.heroInfo}>
                                <h1 className={styles.heroTitle}>{job.title}</h1>
                                <div className={styles.heroMeta}>
                                    <span className={styles.heroMetaItem}><Ico.Building /> {job.company_profiles?.company_name}</span>
                                    <span className={styles.heroMetaItem}><Ico.Location /> {job.location}</span>
                                    <span className={styles.heroMetaItem}><Ico.Clock /> {job.posted_days || 0} days ago</span>
                                </div>
                                <div className={styles.heroBadges}>
                                    <span className={`${styles.badge} ${styles.badgeType}`}>{job.type}</span>
                                    <span className={`${styles.badge} ${styles.badgeSalary}`}><Ico.Salary /> {job.salary}</span>
                                    {job.ai_match_rate >= 70 && (
                                        <span className={`${styles.badge} ${styles.badgeMatch}`}><Ico.Sparkle /> {job.ai_match_rate}% Match</span>
                                    )}
                                </div>
                            </div>

                            <div className={styles.heroActions}>
                                {user?.role === 'candidate' ? (
                                    <button 
                                        className={`${styles.applyBtnHero} ${applied ? styles.appliedBtn : ''}`}
                                        onClick={handleApply}
                                        disabled={applied || isApplying}
                                    >
                                        {isApplying ? 'Applying...' : applied ? 'Applied' : 'Quick Apply'} <Ico.ArrowR />
                                    </button>
                                ) : !user ? (
                                    <Link href="/login" className={styles.applyBtnHero}>
                                        Login to Apply <Ico.ArrowR />
                                    </Link>
                                ) : (
                                    <span className={styles.badge}>Recruiter View</span>
                                )}
                                <div className={styles.heroExtraActions}>
                                    <button
                                        className={styles.saveBtn}
                                        aria-label={isSaved(jobId) ? 'Remove from saved' : 'Save job'}
                                        title={isSaved(jobId) ? 'Remove from saved' : 'Save job'}
                                        onClick={handleToggleSave}
                                        type="button"
                                    >
                                        <Ico.Heart filled={isSaved(jobId)} />
                                    </button>
                                    <div className={styles.menuWrapper}>
                                        <button 
                                            className={styles.moreBtn} 
                                            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
                                            aria-label="More actions"
                                        >
                                            <Ico.More />
                                        </button>

                                        {menuOpen && (
                                            <div className={styles.dropdown} onClick={e => e.stopPropagation()}>
                                                <button className={styles.menuItem} onClick={handleShare}>
                                                    <Ico.Share /> Share Opportunity
                                                </button>
                                                <button className={styles.menuItem} onClick={handleCopyLink}>
                                                    <Ico.Copy /> Duplicate Link
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </AnimateOnScroll>

            {/* ── Body ── */}
            <div className="premium-container">
                <div className={styles.body}>
                    <div className={styles.leftCol}>
                        <AnimateOnScroll animation="fadeUp" delay={100}>
                            <div className={styles.contentCard}>
                                <h2 className={styles.cardTitle}>
                                    <Ico.Briefcase /> About this Role
                                </h2>
                                <p className={styles.description}>{job.description}</p>
                            </div>
                        </AnimateOnScroll>

                        {job.responsibilities && (
                            <AnimateOnScroll animation="fadeUp" delay={200}>
                                <div className={styles.contentCard}>
                                    <h2 className={styles.cardTitle}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
                                        Key Responsibilities
                                    </h2>
                                    <ul className={styles.itemList}>
                                        {(Array.isArray(job.responsibilities) ? job.responsibilities : []).map((r: string, i: number) => (
                                            <li key={i}><span className={styles.bullet} />{r}</li>
                                        ))}
                                    </ul>
                                </div>
                            </AnimateOnScroll>
                        )}

                        {job.requirements && (
                            <AnimateOnScroll animation="fadeUp" delay={300}>
                                <div className={styles.contentCard}>
                                    <h2 className={styles.cardTitle}>
                                        <Ico.Star /> Requirements
                                    </h2>
                                    <ul className={styles.itemList}>
                                        {(Array.isArray(job.requirements) ? job.requirements : []).map((r: string, i: number) => (
                                            <li key={i}><span className={styles.checkBullet}><Ico.Check /></span>{r}</li>
                                        ))}
                                    </ul>
                                </div>
                            </AnimateOnScroll>
                        )}
                    </div>

                    <aside className={styles.sidebar}>
                        <AnimateOnScroll animation="fadeUp" delay={400}>
                            <div className={styles.sidebarCard}>
                                <h3 className={styles.sidebarTitle}>Job Overview</h3>
                                <div className={styles.detailRow}>
                                    <span className={styles.detailLabel}><Ico.Briefcase /> Job Type</span>
                                    <span className={styles.detailValue}>{job.type}</span>
                                </div>
                                <div className={styles.detailRow}>
                                    <span className={styles.detailLabel}><Ico.Location /> Location</span>
                                    <span className={styles.detailValue}>{job.location}</span>
                                </div>
                                <div className={styles.detailRow}>
                                    <span className={styles.detailLabel}><Ico.Salary /> Salary Range</span>
                                    <span className={styles.detailValue}>{job.salary}</span>
                                </div>

                                {job.ai_match_rate >= 60 && (
                                    <div className={styles.matchBar}>
                                        <div className={styles.matchBarLabel}>
                                            <span className={styles.matchBarLabelText}><Ico.Sparkle /> AI Match Score</span>
                                            <span className={styles.matchBarValue} style={{ color: matchColor }}>{job.ai_match_rate}%</span>
                                        </div>
                                        <div className={styles.matchBarTrack}>
                                            <div className={styles.matchBarFill} style={{ width: `${job.ai_match_rate}%` }} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </AnimateOnScroll>

                        <AnimateOnScroll animation="fadeUp" delay={500}>
                            <div className={styles.sidebarCard}>
                                <h3 className={styles.sidebarTitle}>Company</h3>
                                <div className={styles.companyNameS}>{job.company_profiles?.company_name}</div>
                                <p className={styles.companyAboutS}>{job.company_profiles?.about || 'Leading innovators.'}</p>
                            </div>
                        </AnimateOnScroll>
                    </aside>
                </div>
            </div>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </main>
    );
}
