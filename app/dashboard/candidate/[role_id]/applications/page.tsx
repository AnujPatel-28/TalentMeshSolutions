"use client";
import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import Toast from '@/components/ui/Toast';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { useCandidateApplicationsQuery, useWithdrawApplicationMutation } from '@/lib/queries/applications';
import StatusPill from '@/components/dashboard/StatusPill';
import { insforge } from '@/lib/insforge';
import { motion, AnimatePresence } from 'framer-motion';
import ApplyModal from '@/components/candidate/ApplyModal';

/* ─── Icons ─── */
const IC = {
    building: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18M9 21V9" />
        </svg>
    ),
    clock: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
        </svg>
    ),
    dots: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
        </svg>
    ),
    info: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
    ),
    check: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    ),
};

type TabKey = 'saved' | 'applied' | 'interviews' | 'archived';

function getStatusLabel(status: string): string {
    switch (status) {
        case 'saved': return 'Saved';
        case 'applied': return 'Applied';
        case 'reviewing':
        case 'shortlisted': return 'Under review';
        case 'interviewing': return 'Interview scheduled';
        case 'offered': return 'Offer received';
        case 'hired': return 'Hired';
        case 'rejected': return 'Not selected by employer';
        case 'withdrawn': return 'Withdrawn';
        default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
}

function getStatusDescription(status: string): string {
    switch (status) {
        case 'applied': return 'Your profile has been successfully received by the recruiting team. We will notify you once review begins.';
        case 'reviewing': return 'A recruiter is currently reviewing your resume, experience, and profile details.';
        case 'shortlisted': return "Great news — you have been shortlisted for this role. We'll be in touch shortly regarding next steps.";
        case 'interviewing': return 'An interview has been scheduled. Check your messages or email for the invitation details.';
        case 'offered': return 'Congratulations! You have received a job offer. Please review the details.';
        case 'hired': return 'Welcome aboard! You have been marked as hired for this position.';
        case 'rejected': return 'This application is no longer active. We encourage you to keep applying to other open roles.';
        case 'withdrawn': return 'You withdrew this application.';
        default: return '';
    }
}

function getStatusStyle(status: string): React.CSSProperties {
    switch (status) {
        case 'saved':
            return { background: '#EFF6FF', color: '#007BFF', border: '1px solid #BFDBFE' };
        case 'applied':
            return { background: '#EFF6FF', color: '#007BFF', border: '1px solid #BFDBFE' };
        case 'reviewing':
        case 'shortlisted':
            return { background: '#FFF4E5', color: '#B4690E', border: '1px solid #FDE68A' };
        case 'interviewing':
            return { background: '#EFF6FF', color: '#1565c0', border: '1px solid #BFDBFE' };
        case 'offered':
        case 'hired':
            return { background: '#E7F7EE', color: '#157A45', border: '1px solid #A7F3D0' };
        case 'rejected':
            return { background: '#FEF2F2', color: '#C4302B', border: '1px solid #FECACA' };
        case 'withdrawn':
            return { background: '#F2F3F4', color: '#475569', border: '1px solid #E2E5EA' };
        default:
            return { background: '#F2F3F4', color: '#475569', border: '1px solid #E2E5EA' };
    }
}

function getCompanyStyles(companyName: string) {
    const name = companyName || 'TalentMesh';
    const cleanName = name.replace(/[^a-zA-Z0-9 ]/g, '').trim();
    const words = cleanName.split(/\s+/);
    let initials = '';
    if (words.length >= 2) {
        initials = (words[0][0] + words[1][0]).toUpperCase();
    } else if (words.length === 1 && words[0].length > 0) {
        initials = words[0].slice(0, 2).toUpperCase();
    } else {
        initials = 'TM';
    }

    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue1 = Math.abs(hash % 360);
    const hue2 = (hue1 + 45) % 360;
    const gradient = `linear-gradient(135deg, hsl(${hue1}, 75%, 50%), hsl(${hue2}, 80%, 40%))`;

    return { initials, gradient };
}

const formatSalary = (min: number | null, max: number | null, currency: string = 'INR') => {
    if (!min && !max) return 'Competitive';
    const symbol = currency === 'USD' ? '$' : '₹';
    const kMin = min ? `${(min / 100000).toFixed(1)}L` : '';
    const kMax = max ? `${(max / 100000).toFixed(1)}L` : '';
    if (kMin && kMax) return `${symbol}${kMin}–${symbol}${kMax} PA`;
    return kMin ? `${symbol}${kMin}+ PA` : `${symbol}${kMax} PA`;
};

const formatExperience = (min: number | null, max: number | null) => {
    if (min === null && max === null) return 'Not specified';
    if (min !== null && max !== null) return `${min}–${max} years`;
    return min !== null ? `${min}+ years` : `Up to ${max} years`;
};

export default function ApplicationsPage() {
    const { user } = useAuth();
    const params = useParams();
    const router = useRouter();
    const roleId = params.role_id as string;

    const [activeTab, setActiveTab] = useState<TabKey>('applied');
    const [prevTab, setPrevTab] = useState<TabKey>('applied');
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
    const [withdrawTarget, setWithdrawTarget] = useState<string | null>(null);
    const [exitingIds, setExitingIds] = useState<string[]>([]);

    const [savedJobs, setSavedJobs] = useState<any[]>([]);
    const [loadingSaved, setLoadingSaved] = useState(false);

    const [isMobile, setIsMobile] = useState(false);
    const [selectedDetailApp, setSelectedDetailApp] = useState<any | null>(null);
    const [applyTargetJob, setApplyTargetJob] = useState<any | null>(null);
    const [actionMenuApp, setActionMenuApp] = useState<any | null>(null);

    const handleTabChange = (tab: TabKey) => {
        setPrevTab(activeTab);
        setActiveTab(tab);
    };

    const { data: applications = [], isLoading: loading } = useCandidateApplicationsQuery(roleId, !!user);
    const withdrawMutation = useWithdrawApplicationMutation(roleId);

    useEffect(() => {
        const mql = window.matchMedia('(max-width: 1023px)');
        setIsMobile(mql.matches);
        const listener = (e: MediaQueryListEvent) => setIsMobile(e.matches);
        mql.addEventListener('change', listener);
        return () => mql.removeEventListener('change', listener);
    }, []);

    const triggerHapticFeedback = (ms: number) => {
        if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate(ms);
        }
    };

    const fetchSavedJobs = async () => {
        if (!user?.id) return;
        setLoadingSaved(true);
        try {
            const { data, error } = await insforge.database
                .from('saved_jobs')
                .select(`
                    id,
                    saved_at,
                    jobs:job_id (
                        id,
                        title,
                        description,
                        location,
                        type,
                        salary_min,
                        salary_max,
                        currency,
                        created_at,
                        skills_required,
                        experience_min,
                        experience_max,
                        companies (
                            id,
                            name,
                            logo_url
                        )
                    )
                `)
                .eq('candidate_id', user.id);

            if (error) throw error;
            setSavedJobs(data || []);
        } catch (err) {
            console.error('Failed to load saved jobs:', err);
        } finally {
            setLoadingSaved(false);
        }
    };

    useEffect(() => {
        if (user?.id) {
            fetchSavedJobs();
        }
    }, [user?.id]);

    const handleRemoveSaved = async (savedJobId: string, e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (!user?.id) return;
        triggerHapticFeedback(8);
        setExitingIds(prev => [...prev, savedJobId]);
        setTimeout(async () => {
            try {
                const jobId = savedJobs.find(j => j.id === savedJobId)?.jobs?.id;
                if (!jobId) throw new Error('Could not resolve job for saved entry.');

                const { error } = await insforge.database
                    .from('saved_jobs')
                    .delete()
                    .eq('candidate_id', user.id)
                    .eq('job_id', jobId);

                if (error) throw error;
                setSavedJobs(prev => prev.filter(j => j.id !== savedJobId));
                setToast({ message: 'Job removed from saved list.', type: 'info' });
            } catch (err) {
                console.error('Failed to remove saved job:', err);
                setToast({ message: 'Failed to remove saved job.', type: 'error' });
                setExitingIds(prev => prev.filter(x => x !== savedJobId));
            }
        }, 250);
    };

    /* ─── Tab Counts ─── */
    const counts = useMemo(() => ({
        saved: savedJobs.length,
        applied: applications.filter(a => ['applied', 'reviewing', 'shortlisted'].includes(a.status)).length,
        interviews: applications.filter(a => ['interviewing', 'offered', 'hired'].includes(a.status)).length,
        archived: applications.filter(a => ['rejected', 'withdrawn'].includes(a.status)).length,
    }), [applications, savedJobs]);

    /* ─── Filter by tab ─── */
    const filteredApps = useMemo(() => {
        switch (activeTab) {
            case 'saved':
                return savedJobs.map(sj => ({
                    id: sj.id,
                    isSavedJob: true,
                    status: 'saved',
                    applied_at: null,
                    savedAt: sj.saved_at,
                    jobs: sj.jobs,
                }));
            case 'applied':
                return applications.filter(a => ['applied', 'reviewing', 'shortlisted'].includes(a.status));
            case 'interviews':
                return applications.filter(a => ['interviewing', 'offered', 'hired'].includes(a.status));
            case 'archived':
                return applications.filter(a => ['rejected', 'withdrawn'].includes(a.status));
            default:
                return applications;
        }
    }, [applications, activeTab, savedJobs]);

    const handleWithdraw = async (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setWithdrawTarget(id);
    };

    const confirmWithdraw = async () => {
        if (!withdrawTarget) return;
        const id = withdrawTarget;
        setWithdrawTarget(null);
        setExitingIds(prev => [...prev, id]);
        setTimeout(() => {
            withdrawMutation.mutate(id, {
                onSuccess: () => {
                    setToast({ message: 'Application withdrawn successfully', type: 'success' });
                    setExitingIds(prev => prev.filter(x => x !== id));
                    setSelectedDetailApp(null);
                },
                onError: (err: any) => {
                    setToast({ message: err.message || 'Failed to withdraw application', type: 'error' });
                    setExitingIds(prev => prev.filter(x => x !== id));
                }
            });
        }, 250);
    };

    const suffixText = useMemo(() => {
        switch (activeTab) {
            case 'saved': return 'saved.';
            case 'applied': return 'applied for.';
            case 'interviews': return 'scheduled interviews for.';
            case 'archived': return 'archived.';
            default: return 'applied for.';
        }
    }, [activeTab]);

    const TABS: { key: TabKey; label: string }[] = [
        { key: 'saved', label: 'Saved' },
        { key: 'applied', label: 'Applied' },
        { key: 'interviews', label: 'Interviews' },
        { key: 'archived', label: 'Archived' },
    ];

    return (
        <div style={{ width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc', fontFamily: 'Inter, system-ui, sans-serif' }}>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            <ConfirmModal
                isOpen={!!withdrawTarget}
                title="Withdraw Application"
                message="Are you sure you want to withdraw this application? This action cannot be undone."
                confirmLabel="Yes, Withdraw"
                cancelLabel="Cancel"
                variant="danger"
                onConfirm={confirmWithdraw}
                onCancel={() => setWithdrawTarget(null)}
            />

            <div style={{ flex: 1, width: '100%', maxWidth: '900px', margin: '0 auto', padding: '2rem 2rem 4rem', display: 'flex', flexDirection: 'column' }}>
                <style>{`
                    @keyframes suffixFadeIn {
                        from { opacity: 0; transform: translateY(2px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    @keyframes checkScaleIn {
                        from { opacity: 0; transform: scale(0); width: 0; margin-right: 0; }
                        to { opacity: 1; transform: scale(1); width: 14px; margin-right: 6px; }
                    }
                    @keyframes countScalePop {
                        0% { transform: scale(1); }
                        50% { transform: scale(1.15); }
                        100% { transform: scale(1); }
                    }
                    @keyframes cardEntrance {
                        from { opacity: 0; transform: translateY(12px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    @keyframes cardExit {
                        0% { opacity: 1; max-height: 200px; margin-bottom: 16px; padding: 20px 24px; transform: scale(1); overflow: hidden; border-width: 1px; }
                        100% { opacity: 0; max-height: 0; margin-bottom: 0; padding: 0 24px; transform: scale(0.95); overflow: hidden; border-width: 0; }
                    }
                    @keyframes bannerEntrance {
                        from { opacity: 0; transform: translateY(-4px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    .no-scrollbar::-webkit-scrollbar {
                        display: none;
                    }
                    .tab-button {
                        outline: none;
                        transition: var(--transition-fast);
                    }
                    .tab-button:hover:not(.tab-active) {
                        background-color: var(--neutral-surface-hover, rgba(0, 0, 0, 0.03)) !important;
                    }
                    .tab-button:focus-visible {
                        outline: 2px solid var(--primary-blue, #007BFF) !important;
                        outline-offset: -2px;
                    }
                    .card-container {
                        transition: var(--transition-smooth);
                        cursor: pointer;
                        border: 1px solid var(--neutral-border, #E5EDF6);
                        box-shadow: var(--shadow-sm);
                    }
                    .card-container:hover:not(.card-exiting) {
                        transform: translateY(-2px) !important;
                        box-shadow: var(--shadow-md) !important;
                        border-color: var(--neutral-border-active, #cbd5e1) !important;
                    }
                    .card-container:active:not(.card-exiting) {
                        transform: scale(0.995) !important;
                        opacity: 0.95;
                    }
                    .card-actions {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        flex-shrink: 0;
                        margin-left: auto;
                        padding-top: 4px;
                    }
                    @media (max-width: 640px) {
                        .card-actions {
                            margin-left: 0 !important;
                            width: 100% !important;
                            justify-content: flex-start !important;
                            margin-top: 8px !important;
                        }
                    }
                    .card-btn {
                        min-height: 48px;
                        border-radius: 9999px;
                        font-size: var(--text-sm, 14px) !important;
                        font-weight: 600;
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        cursor: pointer;
                        transition: var(--transition-fast);
                        outline: none;
                    }
                    .card-btn:active {
                        transform: scale(0.96) !important;
                    }
                    .card-btn-primary {
                        background: var(--gradient-primary, linear-gradient(135deg, #007BFF, #0056b3)) !important;
                        color: #ffffff !important;
                        border: none;
                        padding: 0 20px;
                        box-shadow: 0 2px 4px rgba(0, 123, 255, 0.2);
                    }
                    .card-btn-primary:hover {
                        opacity: 0.9;
                        box-shadow: var(--shadow-glow-blue);
                    }
                    .card-btn-secondary {
                        background: var(--white) !important;
                        border: 1px solid var(--neutral-border, #E5EDF6) !important;
                        color: var(--neutral-text-secondary, #334155) !important;
                        padding: 0 16px;
                    }
                    .card-btn-secondary:hover {
                        border-color: var(--neutral-border-active, #007BFF) !important;
                        background-color: var(--neutral-surface, #f1f5f9) !important;
                    }
                    .card-btn-danger:hover {
                        border-color: var(--status-error-text, #ef4444) !important;
                        background-color: var(--status-error-bg, #fef2f2) !important;
                        color: var(--status-error-text, #ef4444) !important;
                    }
                    .card-btn-focus:focus-visible {
                        outline: 2px solid var(--primary-blue, #007BFF) !important;
                        outline-offset: 2px;
                    }
                    .footer-container {
                        border-top: 1px solid #e2e8f0;
                        padding: 2rem 1.5rem;
                        background-color: #f8fafc;
                    }
                    .footer-links-track {
                        max-width: 900px;
                        margin: 0 auto;
                        display: grid;
                        grid-template-columns: repeat(3, 1fr);
                        gap: 12px;
                    }
                    .footer-link {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        padding: 12px 16px;
                        border-radius: 12px;
                        background-color: #ffffff;
                        border: 1px solid #e2e8f0;
                        color: #334155;
                        font-size: 13px;
                        font-weight: 500;
                        text-decoration: none;
                        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
                        transition: all 0.2s ease-in-out;
                        min-height: 48px;
                        outline: none;
                    }
                    .footer-link:hover {
                        border-color: #cbd5e1;
                        background-color: #f8fafc;
                        transform: translateY(-1px);
                        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
                    }
                    .footer-link:active {
                        transform: translateY(0);
                        background-color: #f1f5f9;
                    }
                    .footer-link:focus-visible {
                        outline: 2px solid var(--primary-blue, #007BFF) !important;
                        outline-offset: 2px;
                    }
                    @media (max-width: 768px) {
                        .footer-links-track {
                            grid-template-columns: repeat(2, 1fr) !important;
                            gap: 10px !important;
                        }
                    }
                    @media (max-width: 480px) {
                        .footer-links-track {
                            grid-template-columns: 1fr !important;
                            gap: 8px !important;
                        }
                    }
                `}</style>

                {/* Page Title & Subtitle Area (Part 2) */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <h1 style={{ 
                        fontSize: 'var(--text-3xl, 30px)', 
                        fontWeight: 700, 
                        color: 'var(--neutral-text, #12263A)', 
                        margin: '0 0 4px', 
                        letterSpacing: '-0.02em' 
                    }}>
                        My Jobs
                    </h1>
                    <p style={{ 
                        fontSize: 'var(--text-sm, 14px)', 
                        color: 'var(--neutral-text-secondary, #334155)', 
                        margin: 0,
                        display: 'flex',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '4px'
                    }}>
                        <span>Manage and track the jobs you've</span>
                        <span 
                            key={activeTab} 
                            style={{ 
                                fontWeight: 600,
                                display: 'inline-block',
                                animation: 'suffixFadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards' 
                            }}
                        >
                            {suffixText}
                        </span>
                    </p>
                </div>

                {/* ─── Segmented Tab Bar (Interactive Filter - Part 3) ─── */}
                <div 
                    role="tablist"
                    aria-label="Filter job listings"
                    className="no-scrollbar"
                    style={{ 
                        display: 'flex', 
                        background: '#f1f5f9', 
                        padding: '6px', 
                        borderRadius: '9999px', 
                        position: 'relative', 
                        marginBottom: '1.75rem',
                        overflowX: 'auto',
                        WebkitOverflowScrolling: 'touch',
                        gap: '6px'
                    }}
                >
                    {TABS.map(tab => {
                        const count = counts[tab.key];
                        const isActive = activeTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => handleTabChange(tab.key)}
                                role="tab"
                                aria-selected={isActive}
                                aria-label={`${tab.label}, ${count} jobs`}
                                className={`tab-button ${isActive ? 'tab-active' : ''}`}
                                style={{
                                    flex: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '8px 16px',
                                    minHeight: '44px',
                                    borderRadius: '9999px',
                                    border: 'none',
                                    background: 'transparent',
                                    color: isActive ? '#1D4ED8' : 'var(--neutral-text-secondary, #334155)',
                                    fontWeight: isActive ? 600 : 500,
                                    cursor: 'pointer',
                                    zIndex: 1,
                                    position: 'relative',
                                    transition: 'color 0.25s ease'
                                }}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="activeTabIndicator"
                                        style={{
                                            position: 'absolute',
                                            inset: 0,
                                            borderRadius: '9999px',
                                            background: '#ffffff',
                                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.03)',
                                            zIndex: 0
                                        }}
                                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                    />
                                )}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%', zIndex: 1, position: 'relative' }}>
                                    {/* Selected Checkmark animation (M3 Chip spec) */}
                                    {isActive && (
                                        <motion.span 
                                            initial={{ scale: 0, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: '#1D4ED8',
                                                flexShrink: 0
                                            }}
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                        </motion.span>
                                    )}
                                    <span style={{ fontSize: '13px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                        {tab.label}
                                    </span>
                                    <span 
                                        key={`${tab.key}-${count}`}
                                        style={{
                                            fontSize: '11px',
                                            fontWeight: 600,
                                            padding: '1px 6px',
                                            borderRadius: '9999px',
                                            background: isActive ? 'rgba(29, 78, 216, 0.08)' : 'var(--neutral-surface-muted, #E5EDF6)',
                                            color: isActive ? '#1D4ED8' : 'var(--neutral-text-secondary, #334155)',
                                            transition: 'background-color 0.25s, color 0.25s',
                                            flexShrink: 0
                                        }}
                                    >
                                        {count}
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* ─── Application List ─── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0', overflow: 'hidden' }}>
                    {(() => {
                        const prevIndex = TABS.findIndex(t => t.key === prevTab);
                        const currentIndex = TABS.findIndex(t => t.key === activeTab);
                        const slideDirection = currentIndex >= prevIndex ? 1 : -1;

                        const listVariants = {
                            enter: (dir: number) => ({
                                x: dir > 0 ? 40 : -40,
                                opacity: 0
                            }),
                            center: {
                                x: 0,
                                opacity: 1,
                                transition: {
                                    x: { type: "spring" as const, stiffness: 380, damping: 33 },
                                    opacity: { duration: 0.2 }
                                }
                            },
                            exit: (dir: number) => ({
                                x: dir > 0 ? -40 : 40,
                                opacity: 0,
                                transition: {
                                    x: { type: "spring" as const, stiffness: 380, damping: 33 },
                                    opacity: { duration: 0.15 }
                                }
                            })
                        };

                        return (
                            <AnimatePresence mode="wait" custom={slideDirection}>
                                <motion.div
                                    key={activeTab + (loading || loadingSaved ? '-loading' : '-loaded')}
                                    custom={slideDirection}
                                    variants={listVariants}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    style={{ width: '100%' }}
                                >
                                    {loading || loadingSaved ? (
                                        Array.from({ length: 3 }).map((_, i) => (
                                            <div key={i} style={{ padding: '1.5rem 0', borderBottom: '1px solid #e2e5ea' }}>
                                                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                                    <div style={{ width: 48, height: 48, borderRadius: '6px', background: '#F2F3F4', flexShrink: 0 }} />
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                                                        <div style={{ height: '12px', width: '120px', background: '#F2F3F4', borderRadius: '4px' }} />
                                                        <div style={{ height: '16px', width: '200px', background: '#E2E5EA', borderRadius: '4px' }} />
                                                        <div style={{ height: '12px', width: '160px', background: '#F2F3F4', borderRadius: '4px' }} />
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : filteredApps.length === 0 ? (
                                        <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#6B7280' }}>
                                            {activeTab === 'saved' ? (
                                                <>
                                                    <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '1rem' }}>🔖</span>
                                                    <h3 style={{ margin: '0 0 0.5rem', color: '#12263A', fontSize: '18px', fontWeight: 700 }}>No saved jobs yet</h3>
                                                    <p style={{ fontSize: '14px', margin: '0 0 1.5rem' }}>Bookmark jobs you like and they'll show up here.</p>
                                                    <Link href="/candidate/dashboard" style={{ background: '#007BFF', color: '#ffffff', textDecoration: 'none', padding: '0.625rem 1.5rem', borderRadius: '8px', fontWeight: 600, fontSize: '14px' }}>
                                                        Browse Jobs
                                                    </Link>
                                                </>
                                            ) : activeTab === 'interviews' ? (
                                                <>
                                                    <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '1rem' }}>🎤</span>
                                                    <h3 style={{ margin: '0 0 0.5rem', color: '#12263A', fontSize: '18px', fontWeight: 700 }}>No interviews scheduled</h3>
                                                    <p style={{ fontSize: '14px', margin: 0 }}>When an employer invites you for an interview, it will appear here.</p>
                                                </>
                                            ) : activeTab === 'archived' ? (
                                                <>
                                                    <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '1rem' }}>📁</span>
                                                    <h3 style={{ margin: '0 0 0.5rem', color: '#12263A', fontSize: '18px', fontWeight: 700 }}>Nothing archived yet</h3>
                                                    <p style={{ fontSize: '14px', margin: 0 }}>Rejected or withdrawn applications will appear here.</p>
                                                </>
                                            ) : (
                                                <>
                                                    <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '1rem' }}>✉️</span>
                                                    <h3 style={{ margin: '0 0 0.5rem', color: '#12263A', fontSize: '18px', fontWeight: 700 }}>No applications yet</h3>
                                                    <p style={{ fontSize: '14px', margin: '0 0 1.5rem' }}>Start exploring jobs to submit your first application.</p>
                                                    <Link href="/candidate/dashboard" style={{ background: '#007BFF', color: '#ffffff', textDecoration: 'none', padding: '0.625rem 1.5rem', borderRadius: '8px', fontWeight: 600, fontSize: '14px' }}>
                                                        Find Jobs
                                                    </Link>
                                                </>
                                            )}
                                        </div>
                                    ) : (
                                        <div role="list" style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                                            {filteredApps.map((app: any, index: number) => {
                                                const isInactive = ['rejected', 'withdrawn'].includes(app.status);
                                                const isJobClosedOrExpired = app.jobs?.status === 'closed' || (app.jobs?.expires_at && new Date(app.jobs.expires_at) < new Date());
                                                const statusLabel = getStatusLabel(app.status);
                                                const statusStyle = getStatusStyle(app.status);
                                                const appliedDate = app.applied_at
                                                    ? new Date(app.applied_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                                                    : '';
                                                const isExiting = exitingIds.includes(app.id);
                                                const isHighlightStatus = ['reviewing', 'shortlisted', 'interviewing', 'offered', 'hired'].includes(app.status);

                                                return (
                                                    <motion.div
                                                        key={app.id}
                                                        role="listitem"
                                                        className={`card-container ${isExiting ? 'card-exiting' : ''}`}
                                                        whileTap={isMobile ? { scale: 0.975 } : {}}
                                                        onClick={() => {
                                                            if (app.isSavedJob) {
                                                                setSelectedDetailApp(app);
                                                            } else {
                                                                router.push(`/candidate/dashboard/applications/${app.id}`);
                                                            }
                                                        }}
                                                        style={{
                                                            background: 'var(--white)',
                                                            borderRadius: '16px',
                                                            boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.05)',
                                                            padding: isMobile ? '16px' : '20px 24px',
                                                            marginBottom: '12px',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            gap: '12px',
                                                            animationName: isExiting ? 'cardExit' : 'cardEntrance',
                                                            animationDuration: isExiting ? '0.25s' : '0.3s',
                                                            animationTimingFunction: isExiting 
                                                                ? 'cubic-bezier(0.36, 0.07, 0.19, 0.97)' 
                                                                : 'cubic-bezier(0.16, 1, 0.3, 1)',
                                                            animationFillMode: 'forwards',
                                                            animationDelay: isExiting ? '0s' : `${index * 0.05}s`,
                                                            opacity: isExiting ? 1 : 0,
                                                            transformOrigin: 'center center',
                                                            position: 'relative',
                                                            overflow: 'hidden'
                                                        }}
                                                    >
                                                        {/* Status left border indicator (Visual Design Master & HIG) */}
                                                        {isHighlightStatus && (
                                                            <div style={{
                                                                position: 'absolute',
                                                                left: 0,
                                                                top: 0,
                                                                bottom: 0,
                                                                width: '4px',
                                                                background: app.status === 'interviewing' || app.status === 'offered' || app.status === 'hired' ? '#10B981' : '#3B82F6',
                                                                borderRadius: '4px 0 0 4px'
                                                            }} />
                                                        )}

                                                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                                                            {/* Left: icon + info */}
                                                            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flex: 1, minWidth: '240px' }}>
                                                                {/* Company icon square/circle with initials */}
                                                                {(() => {
                                                                    const compName = app.jobs?.companies?.name || 'TalentMesh';
                                                                    const { initials, gradient } = getCompanyStyles(compName);
                                                                    return (
                                                                        <div style={{
                                                                            width: 48,
                                                                            height: 48,
                                                                            borderRadius: '14px',
                                                                            background: gradient,
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            color: '#ffffff',
                                                                            fontSize: '15px',
                                                                            fontWeight: 700,
                                                                            flexShrink: 0,
                                                                            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.08), inset 0 0 0 1px rgba(255, 255, 255, 0.15)'
                                                                        }}>
                                                                            {initials}
                                                                        </div>
                                                                    );
                                                                })()}

                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                                        {/* Job title — clickable */}
                                                                        <h3
                                                                            style={{ 
                                                                                margin: 0, 
                                                                                fontSize: '15px', 
                                                                                fontWeight: 600, 
                                                                                color: 'var(--neutral-text, #0f172a)', 
                                                                                cursor: 'pointer',
                                                                                transition: 'color 0.2s'
                                                                            }}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                if (app.isSavedJob) {
                                                                                    setSelectedDetailApp(app);
                                                                                } else {
                                                                                    router.push(`/candidate/dashboard/applications/${app.id}`);
                                                                                }
                                                                            }}
                                                                            onMouseOver={e => { e.currentTarget.style.color = '#1D4ED8'; }}
                                                                            onMouseOut={e => { e.currentTarget.style.color = 'var(--neutral-text, #0f172a)'; }}
                                                                        >
                                                                            {app.jobs?.title}
                                                                        </h3>
                                                                        {/* Status pill */}
                                                                        <span style={{
                                                                            display: 'inline-flex',
                                                                            alignItems: 'center',
                                                                            gap: '4px',
                                                                            fontSize: '10px',
                                                                            fontWeight: 600,
                                                                            padding: '2px 8px',
                                                                            borderRadius: '9999px',
                                                                            width: 'fit-content',
                                                                            textTransform: 'uppercase',
                                                                            letterSpacing: '0.03em',
                                                                            ...statusStyle
                                                                        }}>
                                                                            {statusLabel}
                                                                        </span>
                                                                    </div>

                                                                    <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--neutral-text-secondary, #475569)' }}>{app.jobs?.companies?.name}</span>
                                                                    <span style={{ fontSize: '13px', color: 'var(--neutral-text-secondary, #64748b)' }}>{app.jobs?.location}</span>
                                                                    {app.isSavedJob && app.savedAt && (
                                                                        <span style={{ fontSize: '11px', color: 'var(--neutral-text-secondary, #64748b)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                                                            <span style={{ display: 'inline-flex', color: '#94a3b8' }}>{IC.clock}</span> Saved on {new Date(app.savedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                                        </span>
                                                                    )}
                                                                    {appliedDate && (
                                                                        <span style={{ fontSize: '11px', color: 'var(--neutral-text-secondary, #64748b)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                                                            <span style={{ display: 'inline-flex', color: '#94a3b8' }}>{IC.clock}</span> Applied on TalentMesh on {appliedDate}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Right: action buttons */}
                                                            <div className="card-actions" onClick={(e) => e.stopPropagation()}>
                                                                {!isMobile ? (
                                                                    app.isSavedJob ? (
                                                                        (() => {
                                                                            const matchingApp = applications.find(a => a.jobs?.id === app.jobs?.id && !['withdrawn', 'rejected'].includes(a.status));
                                                                            return (
                                                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                                                    {matchingApp ? (
                                                                                        <button
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                router.push(`/candidate/dashboard/applications/${matchingApp.id}`);
                                                                                            }}
                                                                                            className="card-btn card-btn-secondary card-btn-focus"
                                                                                            style={{ height: '36px', minHeight: '36px', padding: '0 16px', borderRadius: '18px' }}
                                                                                        >
                                                                                            View Application
                                                                                        </button>
                                                                                    ) : (
                                                                                        <button
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                setApplyTargetJob(app.jobs);
                                                                                            }}
                                                                                            className="card-btn card-btn-primary card-btn-focus"
                                                                                            style={{ height: '36px', minHeight: '36px', padding: '0 16px', borderRadius: '18px' }}
                                                                                        >
                                                                                            Apply Now
                                                                                        </button>
                                                                                    )}
                                                                                    <button
                                                                                        onClick={(e) => handleRemoveSaved(app.id, e)}
                                                                                        className="card-btn card-btn-secondary card-btn-danger card-btn-focus"
                                                                                        style={{ height: '36px', minHeight: '36px', padding: '0 16px', borderRadius: '18px' }}
                                                                                    >
                                                                                        Remove
                                                                                    </button>
                                                                                </div>
                                                                            );
                                                                        })()
                                                                    ) : (
                                                                        ['applied', 'reviewing', 'shortlisted'].includes(app.status) && (
                                                                            <button
                                                                                onClick={(e) => handleWithdraw(app.id, e)}
                                                                                className="card-btn card-btn-secondary card-btn-danger card-btn-focus"
                                                                                style={{ height: '36px', minHeight: '36px', padding: '0 16px', borderRadius: '18px' }}
                                                                            >
                                                                                Withdraw Application
                                                                            </button>
                                                                        )
                                                                    )
                                                                ) : (
                                                                    /* Mobile Chevron CTA indicator */
                                                                    <div style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center', height: '100%', paddingRight: '4px' }}>
                                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                            <polyline points="9 18 15 12 9 6" />
                                                                        </svg>
                                                                    </div>
                                                                )}
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setActionMenuApp(app);
                                                                    }}
                                                                    className="tab-button"
                                                                    style={{ 
                                                                        background: 'none', 
                                                                        border: 'none', 
                                                                        cursor: 'pointer', 
                                                                        padding: '12px', 
                                                                        borderRadius: '50%',
                                                                        color: 'var(--neutral-text-secondary, #64748b)', 
                                                                        display: 'flex', 
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        minHeight: '44px',
                                                                        minWidth: '44px'
                                                                    }}
                                                                    title="More options"
                                                                    aria-label="More options"
                                                                    onMouseOver={e => { e.currentTarget.style.background = '#f1f5f9'; }}
                                                                    onMouseOut={e => { e.currentTarget.style.background = 'none'; }}
                                                                >
                                                                    {IC.dots}
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Part 5: Inline Banner Alert */}
                                                        {(isInactive || isJobClosedOrExpired) && (
                                                            <div 
                                                                role="note"
                                                                aria-label="Status notice"
                                                                onClick={(e) => e.stopPropagation()}
                                                                style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '8px',
                                                                    background: 'var(--neutral-surface, #f1f5f9)',
                                                                    padding: '10px 14px',
                                                                    borderRadius: '8px',
                                                                    fontSize: '13px',
                                                                    color: 'var(--neutral-text-secondary, #334155)',
                                                                    fontWeight: 500,
                                                                    marginTop: '4px',
                                                                    animation: 'bannerEntrance 0.25s ease-out forwards'
                                                                }}
                                                            >
                                                                <span style={{ display: 'inline-flex', color: 'var(--neutral-text-secondary, #334155)', flexShrink: 0 }}>
                                                                    {IC.info}
                                                                </span>
                                                                <span>
                                                                    {app.status === 'withdrawn' 
                                                                        ? 'You withdrew this application.' 
                                                                        : app.status === 'rejected'
                                                                        ? 'This application is no longer active.'
                                                                        : 'Job closed or expired on TalentMesh.'}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        );
                    })()}
                </div>

                {/* Footer issues note */}
                <p style={{ fontSize: '14px', color: '#475569', marginTop: '2rem' }}>
                    Having an issue with My Jobs?{' '}
                    <span 
                        onClick={() => setToast({ message: 'Thank you for your feedback! Our candidate support team has been notified.', type: 'success' })}
                        style={{ color: '#1D4ED8', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                    >
                        Tell us more
                    </span>
                </p>
            </div>

            {/* ─── Footer Links (matching Indeed bottom nav - Desktop Only) ─── */}
            {!isMobile && (
                <footer className="footer-container" role="contentinfo" aria-label="Secondary navigation footer">
                    <div className="footer-links-track">
                        {[
                            { label: 'Career advice', href: '/candidate/dashboard' },
                            { label: 'Browse jobs', href: '/candidate/dashboard' },
                            { label: 'Browse companies', href: '/candidate/dashboard/company-reviews' },
                            { label: 'Help', href: '/candidate/dashboard' },
                            { label: 'Settings', href: '/candidate/dashboard/settings' },
                        ].map(link => (
                            <Link
                                key={link.label}
                                href={link.href}
                                className="footer-link"
                            >
                                <span>{link.label}</span>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#94a3b8', marginLeft: '8px' }}>
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                    <polyline points="12 5 19 12 12 19"></polyline>
                                </svg>
                            </Link>
                        ))}
                    </div>
                </footer>
            )}

            {/* ─── Saved Jobs & Applications Detail Drawer (Option 1 Only) ─── */}
            <AnimatePresence>
                {selectedDetailApp && (
                    <>
                        {/* Backdrop overlay */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.4 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedDetailApp(null)}
                            style={{
                                position: 'fixed',
                                inset: 0,
                                backgroundColor: '#0f172a',
                                backdropFilter: 'blur(4px)',
                                zIndex: 999
                            }}
                        />

                        {/* Drawer content */}
                        {(() => {
                            const job = selectedDetailApp.jobs;
                            return (
                                <motion.div
                                    initial={isMobile ? { y: '100%' } : { x: '100%' }}
                                    animate={isMobile ? { y: 0 } : { x: 0 }}
                                    exit={isMobile ? { y: '100%' } : { x: '100%' }}
                                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                                    drag={isMobile ? "y" : false}
                                    dragConstraints={isMobile ? { top: 0, bottom: 0 } : false}
                                    dragElastic={isMobile ? { top: 0.1, bottom: 0.85 } : false}
                                    onDragEnd={isMobile ? (e, info) => {
                                        if (info.offset.y > 140) {
                                            setSelectedDetailApp(null);
                                        }
                                    } : undefined}
                                    style={{
                                        position: 'fixed',
                                        zIndex: 1000,
                                        backgroundColor: '#ffffff',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        boxShadow: isMobile ? '0 -8px 32px rgba(0,0,0,0.12)' : '-8px 0 32px rgba(0,0,0,0.12)',
                                        ...(isMobile ? {
                                            bottom: 0,
                                            left: 0,
                                            right: 0,
                                            height: '82vh',
                                            borderRadius: '28px 28px 0 0',
                                        } : {
                                            top: 0,
                                            right: 0,
                                            bottom: 0,
                                            width: '460px',
                                            height: '100vh',
                                        })
                                    }}
                                >
                                    {/* Drag handle for mobile */}
                                    {isMobile && (
                                        <div 
                                            style={{ 
                                                display: 'flex', 
                                                justifyContent: 'center', 
                                                padding: '12px 0 8px', 
                                                cursor: 'pointer' 
                                            }} 
                                            onClick={() => setSelectedDetailApp(null)}
                                        >
                                            <div style={{ width: '36px', height: '5px', background: '#cbd5e1', borderRadius: '99px' }} />
                                        </div>
                                    )}

                                    {/* Header */}
                                    <div style={{ 
                                        padding: isMobile ? '16px 24px' : '24px', 
                                        borderBottom: '1px solid #f1f5f9',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'flex-start',
                                        position: 'relative'
                                    }}>
                                        <div style={{ flex: 1, paddingRight: '24px' }}>
                                            <h2 style={{ 
                                                margin: 0, 
                                                fontSize: '18px', 
                                                fontWeight: 700, 
                                                color: '#12263A',
                                                lineHeight: 1.3
                                            }}>
                                                {job?.title}
                                            </h2>
                                            <p style={{ margin: '4px 0 0', fontSize: '13px', fontWeight: 500, color: '#64748b' }}>
                                                {job?.companies?.name}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setSelectedDetailApp(null)}
                                            style={{
                                                background: '#f1f5f9',
                                                border: 'none',
                                                borderRadius: '50%',
                                                width: '32px',
                                                height: '32px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                                color: '#64748b',
                                                transition: 'background 0.2s',
                                                outline: 'none'
                                            }}
                                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                        >
                                            ✕
                                        </button>
                                    </div>

                                    {/* Body */}
                                    <div style={{ 
                                        flex: 1, 
                                        overflowY: 'auto', 
                                        padding: '24px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '20px'
                                    }}>
                                        {/* Application Status Banner (for applied jobs) */}
                                        {!selectedDetailApp.isSavedJob && (
                                            <div style={{
                                                background: getStatusStyle(selectedDetailApp.status).background,
                                                color: getStatusStyle(selectedDetailApp.status).color,
                                                border: getStatusStyle(selectedDetailApp.status).border,
                                                padding: '16px',
                                                borderRadius: '12px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '8px'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{
                                                        fontSize: '10px',
                                                        fontWeight: 700,
                                                        padding: '2px 8px',
                                                        borderRadius: '9999px',
                                                        background: 'rgba(255, 255, 255, 0.4)',
                                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.03em',
                                                        width: 'fit-content'
                                                    }}>
                                                        {getStatusLabel(selectedDetailApp.status)}
                                                    </span>
                                                    {selectedDetailApp.applied_at && (
                                                        <span style={{ fontSize: '11px', fontWeight: 500 }}>
                                                            Applied on {new Date(selectedDetailApp.applied_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        </span>
                                                    )}
                                                </div>
                                                <div style={{ fontSize: '13px', lineHeight: 1.5, opacity: 0.95 }}>
                                                    {getStatusDescription(selectedDetailApp.status)}
                                                </div>
                                            </div>
                                        )}

                                        {/* Metadata grid */}
                                        <div style={{ 
                                            display: 'grid', 
                                            gridTemplateColumns: 'repeat(2, 1fr)', 
                                            gap: '16px',
                                            background: '#F4F8FD',
                                            padding: '16px',
                                            borderRadius: '16px'
                                        }}>
                                            <div style={{ fontSize: '12px', color: '#64748b' }}>
                                                📍 <strong style={{ color: '#334155' }}>Location:</strong>
                                                <div style={{ marginTop: '2px', fontWeight: 600, color: '#12263A' }}>{job?.location}</div>
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#64748b' }}>
                                                💼 <strong style={{ color: '#334155' }}>Job Type:</strong>
                                                <div style={{ marginTop: '2px', fontWeight: 600, color: '#12263A' }}>{job?.type || 'Full-time'}</div>
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#64748b' }}>
                                                💰 <strong style={{ color: '#334155' }}>Salary Range:</strong>
                                                <div style={{ marginTop: '2px', fontWeight: 600, color: '#12263A' }}>
                                                    {formatSalary(job?.salary_min, job?.salary_max, job?.currency)}
                                                </div>
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#64748b' }}>
                                                🎓 <strong style={{ color: '#334155' }}>Experience:</strong>
                                                <div style={{ marginTop: '2px', fontWeight: 600, color: '#12263A' }}>
                                                    {formatExperience(job?.experience_min, job?.experience_max)}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Description */}
                                        {job?.description && (
                                            <div>
                                                <h4 style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 600, color: '#12263A', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                    Job Description
                                                </h4>
                                                <div 
                                                    style={{ 
                                                        fontSize: '13px', 
                                                        color: '#334155', 
                                                        lineHeight: 1.6, 
                                                        whiteSpace: 'pre-line' 
                                                    }}
                                                >
                                                    {job.description}
                                                </div>
                                            </div>
                                        )}

                                        {/* Skills Required */}
                                        {job?.skills_required && job.skills_required.length > 0 && (
                                            <div>
                                                <h4 style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 600, color: '#12263A', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                    Skills Required
                                                </h4>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                    {job.skills_required.map((skill: string) => (
                                                        <span 
                                                            key={skill} 
                                                            style={{ 
                                                                background: '#EFF6FF', 
                                                                color: '#1D4ED8', 
                                                                border: '1px solid #BFDBFE', 
                                                                padding: '4px 10px', 
                                                                borderRadius: '9999px', 
                                                                fontSize: '11px', 
                                                                fontWeight: 500 
                                                            }}
                                                        >
                                                            {skill}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Footer */}
                                    <div style={{ 
                                        padding: '16px 24px', 
                                        borderTop: '1px solid #f1f5f9',
                                        display: 'flex',
                                        gap: '12px',
                                        background: '#ffffff',
                                        paddingBottom: isMobile ? 'calc(16px + env(safe-area-inset-bottom))' : '16px'
                                    }}>
                                        {selectedDetailApp.isSavedJob ? (
                                            (() => {
                                                const matchingApp = applications.find(a => a.jobs?.id === job.id && !['withdrawn', 'rejected'].includes(a.status));
                                                return (
                                                    <>
                                                        {matchingApp ? (
                                                            <button
                                                                onClick={() => {
                                                                    router.push(`/candidate/dashboard/applications/${matchingApp.id}`);
                                                                }}
                                                                style={{
                                                                    flex: 2,
                                                                    height: '48px',
                                                                    borderRadius: '24px',
                                                                    border: 'none',
                                                                    background: 'linear-gradient(135deg, #007BFF, #0056b3)',
                                                                    color: '#ffffff',
                                                                    fontWeight: 600,
                                                                    fontSize: '14px',
                                                                    cursor: 'pointer',
                                                                    transition: 'opacity 0.2s',
                                                                    outline: 'none',
                                                                    boxShadow: '0 2px 4px rgba(0, 123, 255, 0.2)'
                                                                }}
                                                                onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
                                                                onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                                                            >
                                                                View Application
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => {
                                                                    setApplyTargetJob(job);
                                                                }}
                                                                style={{
                                                                    flex: 2,
                                                                    height: '48px',
                                                                    borderRadius: '24px',
                                                                    border: 'none',
                                                                    background: 'linear-gradient(135deg, #007BFF, #0056b3)',
                                                                    color: '#ffffff',
                                                                    fontWeight: 600,
                                                                    fontSize: '14px',
                                                                    cursor: 'pointer',
                                                                    transition: 'opacity 0.2s',
                                                                    outline: 'none',
                                                                    boxShadow: '0 2px 4px rgba(0, 123, 255, 0.2)'
                                                                }}
                                                                onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
                                                                onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                                                            >
                                                                Apply Now
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={(e) => {
                                                                const savedItem = savedJobs.find(sj => sj.jobs?.id === job.id);
                                                                if (savedItem) {
                                                                    handleRemoveSaved(savedItem.id, e as any);
                                                                    setSelectedDetailApp(null);
                                                                }
                                                            }}
                                                            style={{
                                                                flex: 1,
                                                                height: '48px',
                                                                borderRadius: '24px',
                                                                border: '1px solid #e2e8f0',
                                                                background: '#ffffff',
                                                                color: '#ef4444',
                                                                fontWeight: 600,
                                                                fontSize: '14px',
                                                                cursor: 'pointer',
                                                                transition: 'background-color 0.2s, border-color 0.2s',
                                                                outline: 'none'
                                                            }}
                                                            onMouseOver={(e) => {
                                                                e.currentTarget.style.backgroundColor = '#fef2f2';
                                                                e.currentTarget.style.borderColor = '#ef4444';
                                                            }}
                                                            onMouseOut={(e) => {
                                                                e.currentTarget.style.backgroundColor = '#ffffff';
                                                                e.currentTarget.style.borderColor = '#e2e8f0';
                                                            }}
                                                        >
                                                            Remove
                                                        </button>
                                                    </>
                                                );
                                            })()
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => {
                                                        router.push(`/candidate/dashboard/applications/${selectedDetailApp.id}`);
                                                    }}
                                                    style={{
                                                        flex: 2,
                                                        height: '48px',
                                                        borderRadius: '24px',
                                                        border: 'none',
                                                        background: 'linear-gradient(135deg, #007BFF, #0056b3)',
                                                        color: '#ffffff',
                                                        fontWeight: 600,
                                                        fontSize: '14px',
                                                        cursor: 'pointer',
                                                        transition: 'opacity 0.2s',
                                                        outline: 'none',
                                                        boxShadow: '0 2px 4px rgba(0, 123, 255, 0.2)'
                                                    }}
                                                    onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
                                                    onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                                                >
                                                    View Detailed Timeline
                                                </button>
                                                {['applied', 'reviewing', 'shortlisted'].includes(selectedDetailApp.status) && (
                                                    <button
                                                        onClick={(e) => handleWithdraw(selectedDetailApp.id, e as any)}
                                                        style={{
                                                            flex: 1,
                                                            height: '48px',
                                                            borderRadius: '24px',
                                                            border: '1px solid #e2e8f0',
                                                            background: '#ffffff',
                                                            color: '#ef4444',
                                                            fontWeight: 600,
                                                            fontSize: '14px',
                                                            cursor: 'pointer',
                                                            transition: 'background-color 0.2s, border-color 0.2s',
                                                            outline: 'none'
                                                        }}
                                                        onMouseOver={(e) => {
                                                            e.currentTarget.style.backgroundColor = '#fef2f2';
                                                            e.currentTarget.style.borderColor = '#ef4444';
                                                        }}
                                                        onMouseOut={(e) => {
                                                            e.currentTarget.style.backgroundColor = '#ffffff';
                                                            e.currentTarget.style.borderColor = '#e2e8f0';
                                                        }}
                                                    >
                                                        Withdraw
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })()}
                    </>
                )}
            </AnimatePresence>

            {/* ─── Mobile Action Sheet Menu (Apple HIG & M3) ─── */}
            <AnimatePresence>
                {actionMenuApp && (
                    <>
                        {/* Backdrop overlay */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.4 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setActionMenuApp(null)}
                            style={{
                                position: 'fixed',
                                inset: 0,
                                backgroundColor: '#0f172a',
                                backdropFilter: 'blur(4px)',
                                zIndex: 999
                            }}
                        />

                        {/* Action Sheet content */}
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                            drag="y"
                            dragConstraints={{ top: 0, bottom: 0 }}
                            dragElastic={{ top: 0.1, bottom: 0.8 }}
                            onDragEnd={(e, info) => {
                                if (info.offset.y > 100) {
                                    setActionMenuApp(null);
                                }
                            }}
                            style={{
                                position: 'fixed',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                backgroundColor: '#ffffff',
                                borderRadius: '24px 24px 0 0',
                                boxShadow: '0 -8px 32px rgba(0,0,0,0.15)',
                                zIndex: 1000,
                                display: 'flex',
                                flexDirection: 'column',
                                paddingBottom: 'calc(16px + env(safe-area-inset-bottom))'
                            }}
                        >
                            {/* Drag handle */}
                            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px' }}>
                                <div style={{ width: '36px', height: '5px', background: '#cbd5e1', borderRadius: '99px' }} />
                            </div>

                            {/* Title area */}
                            <div style={{ padding: '16px 24px 8px', borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
                                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#12263A' }}>
                                    {actionMenuApp.jobs?.title}
                                </h3>
                                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
                                    {actionMenuApp.jobs?.companies?.name}
                                </p>
                            </div>

                            {/* Actions list */}
                            <div style={{ display: 'flex', flexDirection: 'column', padding: '8px' }}>
                                <button
                                    onClick={() => {
                                        const app = actionMenuApp;
                                        setActionMenuApp(null);
                                        if (app.isSavedJob) {
                                            setSelectedDetailApp(app);
                                        } else {
                                            router.push(`/candidate/dashboard/applications/${app.id}`);
                                        }
                                    }}
                                    style={{
                                        border: 'none',
                                        background: 'transparent',
                                        padding: '16px',
                                        fontSize: '15px',
                                        fontWeight: 600,
                                        color: '#334155',
                                        cursor: 'pointer',
                                        textAlign: 'center',
                                        borderRadius: '12px',
                                        width: '100%',
                                        minHeight: '48px'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    View Details
                                </button>

                                {actionMenuApp.isSavedJob ? (
                                    <>
                                        {(() => {
                                            const matchingApp = applications.find(a => a.jobs?.id === actionMenuApp.jobs?.id && !['withdrawn', 'rejected'].includes(a.status));
                                            return matchingApp ? (
                                                <button
                                                    onClick={() => {
                                                        setActionMenuApp(null);
                                                        router.push(`/candidate/dashboard/applications/${matchingApp.id}`);
                                                    }}
                                                    style={{
                                                        border: 'none',
                                                        background: 'transparent',
                                                        padding: '16px',
                                                        fontSize: '15px',
                                                        fontWeight: 600,
                                                        color: '#1D4ED8',
                                                        cursor: 'pointer',
                                                        textAlign: 'center',
                                                        borderRadius: '12px',
                                                        width: '100%',
                                                        minHeight: '48px'
                                                    }}
                                                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                >
                                                    View Application
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => {
                                                        setActionMenuApp(null);
                                                        setApplyTargetJob(actionMenuApp.jobs);
                                                    }}
                                                    style={{
                                                        border: 'none',
                                                        background: 'transparent',
                                                        padding: '16px',
                                                        fontSize: '15px',
                                                        fontWeight: 600,
                                                        color: '#1D4ED8',
                                                        cursor: 'pointer',
                                                        textAlign: 'center',
                                                        borderRadius: '12px',
                                                        width: '100%',
                                                        minHeight: '48px'
                                                    }}
                                                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                >
                                                    Apply Now
                                                </button>
                                            );
                                        })()}

                                        <button
                                            onClick={(e) => {
                                                const app = actionMenuApp;
                                                setActionMenuApp(null);
                                                handleRemoveSaved(app.id, e as any);
                                            }}
                                            style={{
                                                border: 'none',
                                                background: 'transparent',
                                                padding: '16px',
                                                fontSize: '15px',
                                                fontWeight: 600,
                                                color: '#EF4444',
                                                cursor: 'pointer',
                                                textAlign: 'center',
                                                borderRadius: '12px',
                                                width: '100%',
                                                minHeight: '48px'
                                            }}
                                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
                                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                        >
                                            Remove Saved Job
                                        </button>
                                    </>
                                ) : (
                                    ['applied', 'reviewing', 'shortlisted'].includes(actionMenuApp.status) && (
                                        <button
                                            onClick={(e) => {
                                                const app = actionMenuApp;
                                                setActionMenuApp(null);
                                                handleWithdraw(app.id, e as any);
                                            }}
                                            style={{
                                                border: 'none',
                                                background: 'transparent',
                                                padding: '16px',
                                                fontSize: '15px',
                                                fontWeight: 600,
                                                color: '#EF4444',
                                                cursor: 'pointer',
                                                textAlign: 'center',
                                                borderRadius: '12px',
                                                width: '100%',
                                                minHeight: '48px'
                                            }}
                                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
                                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                        >
                                            Withdraw Application
                                        </button>
                                    )
                                )}

                                <div style={{ height: '8px', backgroundColor: '#f1f5f9', margin: '8px -8px' }} />

                                <button
                                    onClick={() => setActionMenuApp(null)}
                                    style={{
                                        border: 'none',
                                        background: 'transparent',
                                        padding: '16px',
                                        fontSize: '15px',
                                        fontWeight: 700,
                                        color: '#64748b',
                                        cursor: 'pointer',
                                        textAlign: 'center',
                                        borderRadius: '12px',
                                        width: '100%',
                                        minHeight: '48px'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>


            {/* ─── Apply Modal for Saved Jobs ─── */}
            {applyTargetJob && (
                <ApplyModal
                    isOpen={!!applyTargetJob}
                    onClose={() => setApplyTargetJob(null)}
                    jobId={applyTargetJob.id}
                    jobTitle={applyTargetJob.title}
                    companyName={applyTargetJob.companies?.name || 'TalentMesh Company'}
                    jobSkills={applyTargetJob.skills_required}
                    onSuccess={() => {
                        setToast({ message: 'Application submitted successfully!', type: 'success' });
                        fetchSavedJobs();
                        setApplyTargetJob(null);
                        setSelectedDetailApp(null);
                    }}
                />
            )}
        </div>
    );
}
