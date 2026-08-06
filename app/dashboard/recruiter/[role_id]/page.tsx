"use client";
import React, { useEffect, useState, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from '../../shared-dashboard.module.css';
import AnimateOnScroll from '@/components/AnimateOnScroll';
import { HomeSkeleton } from '@/components/ui/DashboardSkeleton';
import { invokeFunction, insforge } from '@/lib/insforge';
import { useAuth } from '@/lib/auth/AuthContext';
import { formatTime, formatShortDate } from '@/lib/utils/date-utils';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';

import StatCard from '@/components/dashboard/StatCard';
import DataTable, { Column } from '@/components/dashboard/DataTable';
import FilterBar from '@/components/dashboard/FilterBar';
import CandidateProfileDrawer from '@/components/recruiter/CandidateProfileDrawer';

/* ─── Icons ─── */
const IC = {
    clipboard: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>,
    users: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>,
    calendar: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
    checkCircle: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>,
    trending: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>,
    alertCircle: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>,
    barChart: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" /></svg>,
    plus: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
    arrowRight: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>,
};

export default function RecruiterHome({ params }: { params: Promise<{ role_id: string }> }) {
    const { role_id } = React.use(params) || {};
    const router = useRouter();
    const { user: authUser, isLoading: authLoading } = useAuth();
    const fetching = useRef(false);
    
    const [jobs, setJobs] = useState<any[]>([]);
    const [interviews, setInterviews] = useState<any[]>([]);
    const [stats, setStats] = useState({ open: 0, applicants: 0, interviews: 0, hires: 0 });
    const [pipeline, setPipeline] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [applicationsQueue, setApplicationsQueue] = useState<any[]>([]);
    const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedJobId, setSelectedJobId] = useState('');
    const [selectedExperience, setSelectedExperience] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);

    const fetchApplicationsQueue = async () => {
        if (!authUser?.id) return;
        try {
            const { data, error } = await insforge.database
                .from('applications')
                .select(`
                    id, status, applied_at, updated_at,
                    job:jobs!inner(id, title, recruiter_id),
                    candidate:profiles!candidate_id(id, name, email, avatar_url),
                    candidate_profile:candidate_profiles!candidate_id(id, headline, location, skills, experience_years)
                `)
                .eq('job.recruiter_id', authUser.id)
                .eq('status', 'applied')
                .order('applied_at', { ascending: false });

            if (error) throw error;
            setApplicationsQueue(data || []);
        } catch (err) {
            console.error("Error fetching applications queue:", err);
        }
    };

    useEffect(() => {
        if (authLoading) return;
        if (!authUser) return;

        async function fetchData() {
            if (!authUser?.id) return;
            if (fetching.current) return;
            fetching.current = true;
            try {
                const [dashRes, interviewsRes] = await Promise.all([
                    invokeFunction('recruiter-dashboard'),
                    insforge.database
                        .from('interviews')
                        .select('*, job:jobs(id, title), candidate:profiles!candidate_id(id, full_name:name, email, avatar_url)')
                        .eq('recruiter_id', authUser.id)
                        .eq('status', 'scheduled')
                        .order('scheduled_at', { ascending: true })
                ]);
                
                if (dashRes.error) {
                    console.error('Dashboard fetch error:', dashRes.error.message);
                }

                const dash = dashRes.data;
                if (dash) {
                    setJobs(dash.recentJobs || []);
                    setStats({
                        open: dash.stats.openJobs || 0,
                        applicants: dash.stats.totalApplicants || 0,
                        interviews: dash.stats.interviewsThisWeek || 0,
                        hires: dash.stats.hires || 0
                    });
                    setPipeline(dash.pipeline || []);
                }

                if (!interviewsRes.error && interviewsRes.data) {
                    const mappedInterviews = (interviewsRes.data as any[]).map(iv => ({
                        id: iv.id,
                        scheduledAt: iv.scheduled_at,
                        role: `${iv.candidate?.full_name || 'Candidate'} — ${iv.job?.title || 'Position'}`,
                        type: iv.type.charAt(0).toUpperCase() + iv.type.slice(1),
                        meetingLink: iv.meeting_link
                    }));
                    setInterviews(mappedInterviews);

                    const now = new Date();
                    const startWeek = new Date(now); startWeek.setDate(now.getDate() - now.getDay());
                    const endWeek = new Date(startWeek); endWeek.setDate(startWeek.getDate() + 7);
                    const weekCount = (interviewsRes.data as any[]).filter(iv => {
                        const d = new Date(iv.scheduled_at);
                        return d >= startWeek && d < endWeek;
                    }).length;

                    setStats(prev => ({
                        ...prev,
                        interviews: weekCount
                    }));
                }

                await fetchApplicationsQueue();

            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
                fetching.current = false;
            }
        }
        fetchData();
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, [authLoading, authUser?.id]);

    const shortlistedCount = useMemo(() => {
        return pipeline.find(p => p.label === 'Shortlisted')?.count || 0;
    }, [pipeline]);

    const uniqueJobs = useMemo(() => {
        const jobMap: Record<string, string> = {};
        applicationsQueue.forEach(app => {
            if (app.job?.id && app.job?.title) {
                jobMap[app.job.id] = app.job.title;
            }
        });
        return Object.entries(jobMap).map(([id, title]) => ({ value: id, label: title }));
    }, [applicationsQueue]);

    const filteredApplications = useMemo(() => {
        return applicationsQueue.filter(app => {
            if (searchQuery.trim() !== '') {
                const query = searchQuery.toLowerCase();
                const nameMatch = app.candidate?.name?.toLowerCase().includes(query);
                const headlineMatch = app.candidate_profile?.headline?.toLowerCase().includes(query);
                if (!nameMatch && !headlineMatch) return false;
            }

            if (selectedJobId !== '') {
                if (app.job?.id !== selectedJobId) return false;
            }

            if (selectedExperience !== '') {
                const exp = app.candidate_profile?.experience_years || 0;
                if (selectedExperience === 'lt2' && exp >= 2) return false;
                if (selectedExperience === '2to5' && (exp < 2 || exp > 5)) return false;
                if (selectedExperience === 'gt5' && exp <= 5) return false;
            }

            return true;
        });
    }, [applicationsQueue, searchQuery, selectedJobId, selectedExperience]);

    const toggleSelectRow = (id: string) => {
        setSelectedRowIds(prev => 
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedRowIds.length === filteredApplications.length) {
            setSelectedRowIds([]);
        } else {
            setSelectedRowIds(filteredApplications.map(app => app.id));
        }
    };

    const handleBulkAction = async (status: string) => {
        if (selectedRowIds.length === 0) return;
        setIsUpdating(true);
        let successCount = 0;
        let failCount = 0;

        try {
            for (const appId of selectedRowIds) {
                const { error } = await invokeFunction('update-application', {
                    body: { id: appId, status }
                });
                if (error) {
                    console.error(`Failed to update application ${appId}:`, error);
                    failCount++;
                } else {
                    successCount++;
                }
            }

            if (successCount > 0) {
                toast.success(`Successfully updated ${successCount} application(s) to ${status}`);
            }
            if (failCount > 0) {
                toast.error(`Failed to update ${failCount} application(s)`);
            }

            setSelectedRowIds([]);
            await fetchApplicationsQueue();
        } catch (err) {
            console.error("Bulk action error:", err);
            toast.error("Failed to complete bulk action updates");
        } finally {
            setIsUpdating(false);
        }
    };

    if (authLoading || loading) {
        return <HomeSkeleton />;
    }

    const filters = [
        {
            key: 'job',
            label: 'Filter by Job',
            options: uniqueJobs,
            value: selectedJobId,
            onChange: setSelectedJobId
        },
        {
            key: 'experience',
            label: 'Filter by Experience',
            options: [
                { value: 'lt2', label: 'Under 2 years' },
                { value: '2to5', label: '2 to 5 years' },
                { value: 'gt5', label: 'Over 5 years' }
            ],
            value: selectedExperience,
            onChange: setSelectedExperience
        }
    ];

    const handleClearAll = () => {
        setSearchQuery('');
        setSelectedJobId('');
        setSelectedExperience('');
        setSelectedRowIds([]);
    };

    const columns: Column<any>[] = [
        {
            header: (
                <input
                    type="checkbox"
                    checked={filteredApplications.length > 0 && selectedRowIds.length === filteredApplications.length}
                    onChange={toggleSelectAll}
                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                />
            ),
            key: 'selection',
            width: '40px',
            render: (app) => (
                <input
                    type="checkbox"
                    checked={selectedRowIds.includes(app.id)}
                    onChange={() => toggleSelectRow(app.id)}
                    onClick={(e) => e.stopPropagation()}
                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                />
            ),
            align: 'center'
        },
        {
            header: 'Candidate',
            key: 'candidate.name',
            render: (app) => (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 600, color: 'var(--tm-text-primary)' }}>{app.candidate?.name}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--tm-text-secondary)' }}>{app.candidate?.email}</span>
                </div>
            )
        },
        {
            header: 'Applied Position',
            key: 'job.title',
            render: (app) => (
                <span style={{ fontWeight: 500 }}>{app.job?.title}</span>
            )
        },
        {
            header: 'Experience & Location',
            key: 'candidate_profile.experience_years',
            render: (app) => (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.85rem' }}>{app.candidate_profile?.experience_years ?? 0} Years</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--tm-text-secondary)' }}>📍 {app.candidate_profile?.location || 'Remote'}</span>
                </div>
            )
        },
        {
            header: 'Skills',
            key: 'candidate_profile.skills',
            render: (app) => (
                <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', maxWidth: '280px' }}>
                    {(app.candidate_profile?.skills || []).slice(0, 3).map((s: string) => (
                        <span key={s} style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', border: '1px solid var(--tm-border)', borderRadius: '4px', background: 'var(--tm-surface-muted)', color: 'var(--tm-text-secondary)' }}>
                            {s}
                        </span>
                    ))}
                    {(app.candidate_profile?.skills || []).length > 3 && (
                        <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', color: 'var(--tm-text-secondary)' }}>
                            +{app.candidate_profile.skills.length - 3} more
                        </span>
                    )}
                </div>
            )
        },
        {
            header: 'Applied Date',
            key: 'applied_at',
            render: (app) => (
                <span>
                    {new Date(app.applied_at).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                    })}
                </span>
            )
        }
    ];

    return (
        <div className={cn(styles.dash, styles.dashPremium)}>
            {/* Welcome Banner */}
            <div className={styles.greet}>
                <h1 className={styles.greetTitle}>Welcome back, {authUser?.name || 'Recruiter'}!</h1>
                <p className={styles.greetSub}>Here&apos;s your hiring pipeline overview for today.</p>
            </div>

            {/* Sub-Navigation Tabs */}
            <div style={{ borderBottom: '1px solid var(--sidebar-border)', marginBottom: '1.5rem', display: 'flex', gap: '1.25rem' }}>
                <button
                    className={styles.viewAll}
                    style={{ fontSize: '0.85rem', padding: '0.6rem 0.1rem', borderBottom: '2px solid var(--primary-blue)', color: 'var(--primary-blue)', fontWeight: 700, cursor: 'default' }}
                >
                    Overview
                </button>
                <button
                    onClick={() => router.push(`/dashboard/recruiter/${role_id}/jobs`)}
                    className={styles.viewAll}
                    style={{ fontSize: '0.85rem', padding: '0.6rem 0.1rem', borderBottom: '2px solid transparent', color: 'var(--neutral-text-muted)', fontWeight: 600 }}
                >
                    Jobs
                </button>
                <button
                    onClick={() => router.push(`/dashboard/recruiter/${role_id}/candidates`)}
                    className={styles.viewAll}
                    style={{ fontSize: '0.85rem', padding: '0.6rem 0.1rem', borderBottom: '2px solid transparent', color: 'var(--neutral-text-muted)', fontWeight: 600 }}
                >
                    Candidates
                </button>
                <button
                    onClick={() => router.push(`/dashboard/recruiter/${role_id}/interviews`)}
                    className={styles.viewAll}
                    style={{ fontSize: '0.85rem', padding: '0.6rem 0.1rem', borderBottom: '2px solid transparent', color: 'var(--neutral-text-muted)', fontWeight: 600 }}
                >
                    Interviews
                </button>
                <button
                    onClick={() => router.push(`/dashboard/recruiter/${role_id}/reports`)}
                    className={styles.viewAll}
                    style={{ fontSize: '0.85rem', padding: '0.6rem 0.1rem', borderBottom: '2px solid transparent', color: 'var(--neutral-text-muted)', fontWeight: 600 }}
                >
                    Reports
                </button>
            </div>

            {/* Stat Cards */}
            <AnimateOnScroll animation="fadeIn">
                <div className={styles.stats}>
                    <StatCard
                        label="Active Jobs"
                        value={stats.open}
                        icon={IC.clipboard}
                        delta="Positions currently active"
                        onClick={() => router.push(`/dashboard/recruiter/${role_id}/jobs`)}
                    />
                    <StatCard
                        label="New Applications"
                        value={applicationsQueue.length}
                        icon={IC.users}
                        delta={`${applicationsQueue.length} unprocessed applications`}
                    />
                    <StatCard
                        label="Shortlisted"
                        value={shortlistedCount}
                        icon={IC.checkCircle}
                        delta="Candidates shortlisted"
                        onClick={() => router.push(`/dashboard/recruiter/${role_id}/candidates?tab=shortlisted`)}
                    />
                    <StatCard
                        label="Interviews This Week"
                        value={stats.interviews}
                        icon={IC.calendar}
                        delta={interviews[0] ? `Next: ${formatShortDate(interviews[0].scheduledAt)}` : 'No upcoming interviews'}
                        onClick={() => router.push(`/dashboard/recruiter/${role_id}/interviews`)}
                    />
                </div>
            </AnimateOnScroll>

            {/* Queue Section (Naukri Response Manager Style) */}
            <AnimateOnScroll animation="fadeIn">
                <div className={styles.cardPremium} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem', background: 'var(--tm-surface)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--tm-text-primary)' }}>
                                Response Manager — New Applications Queue
                            </h2>
                            <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--tm-text-secondary)' }}>
                                Screen and update candidates in bulk.
                            </p>
                        </div>

                        {/* Bulk Action Buttons */}
                        {selectedRowIds.length > 0 && (
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'var(--tm-surface-muted)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--tm-border)' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--tm-text-secondary)', marginRight: '0.5rem' }}>
                                    {selectedRowIds.length} Selected:
                                </span>
                                <button
                                    type="button"
                                    disabled={isUpdating}
                                    onClick={() => handleBulkAction('shortlisted')}
                                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--tm-status-success-text)', background: 'var(--tm-status-success-bg)', border: '1px solid var(--tm-status-success-text)', borderRadius: '6px', cursor: 'pointer' }}
                                >
                                    Shortlist
                                </button>
                                <button
                                    type="button"
                                    disabled={isUpdating}
                                    onClick={() => handleBulkAction('reviewing')}
                                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--tm-status-warning-text)', background: 'var(--tm-status-warning-bg)', border: '1px solid var(--tm-status-warning-text)', borderRadius: '6px', cursor: 'pointer' }}
                                >
                                    Hold
                                </button>
                                <button
                                    type="button"
                                    disabled={isUpdating}
                                    onClick={() => handleBulkAction('rejected')}
                                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--tm-status-error-text)', background: 'var(--tm-status-error-bg)', border: '1px solid var(--tm-status-error-text)', borderRadius: '6px', cursor: 'pointer' }}
                                >
                                    Reject
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Filter Bar */}
                    <FilterBar
                        search={searchQuery}
                        onSearchChange={setSearchQuery}
                        searchPlaceholder="Search by name or headline..."
                        filters={filters}
                        onClearAll={handleClearAll}
                    />

                    {/* Queue Data Table */}
                    <DataTable
                        columns={columns}
                        data={filteredApplications}
                        loading={isUpdating}
                        onRowClick={(row) => setSelectedCandidateId(row.candidate?.id)}
                        emptyState={
                            <div style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
                                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎉</div>
                                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Applications Queue Empty</h3>
                                <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--tm-text-secondary)' }}>
                                    There are no un-screened applications waiting for your response at this time.
                                </p>
                            </div>
                        }
                    />
                </div>
            </AnimateOnScroll>

            {/* Candidate profile drawer for screening */}
            {selectedCandidateId && (
                <CandidateProfileDrawer
                    candidateId={selectedCandidateId}
                    onClose={() => setSelectedCandidateId(null)}
                />
            )}
        </div>
    );
}
