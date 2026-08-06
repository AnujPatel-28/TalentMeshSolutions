"use client";
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { insforge } from '@/lib/insforge';
import { HomeSkeleton } from '@/components/ui/DashboardSkeleton';
import DataTable, { Column } from '@/components/dashboard/DataTable';
import FilterBar, { FilterDropdown } from '@/components/dashboard/FilterBar';
import StatusPill from '@/components/dashboard/StatusPill';
import DetailDrawer from '@/components/dashboard/DetailDrawer';
import { toast } from 'react-hot-toast';
import styles from './jobs.module.css';
import sharedStyles from '@/app/dashboard/shared-dashboard.module.css';

/* ─── Icons ─── */
const IC = {
    plus: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    edit: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    trash: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
    expire: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
};

type TabType = 'all' | 'published' | 'drafts' | 'expired';

export default function RecruiterJobsPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const roleId = params.role_id as string;
    const { user } = useAuth();

    // Tab state from URL query parameter or default to 'all'
    const [activeTab, setActiveTab] = useState<TabType>(() => {
        const tab = searchParams.get('tab');
        if (['all', 'published', 'drafts', 'expired'].includes(tab || '')) {
            return tab as TabType;
        }
        return 'all';
    });

    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedJob, setSelectedJob] = useState<any | null>(null);

    // Search and filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [locationFilter, setLocationFilter] = useState('');

    // Sync tab query param
    const handleTabChange = (tab: TabType) => {
        setActiveTab(tab);
        const url = new URL(window.location.href);
        url.searchParams.set('tab', tab);
        router.push(url.pathname + url.search);
    };

    const fetchJobs = useCallback(async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            const res = await fetch('/api/jobs?scope=company&limit=100');
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Failed to load jobs');
            const jobsList: any[] = json.jobs || [];

            // GET /api/jobs doesn't embed applicant counts — fetch them separately (RLS apps_company_view scopes the read).
            let counts: Record<string, number> = {};
            if (jobsList.length > 0) {
                const { data: apps } = await insforge.database
                    .from('applications')
                    .select('job_id')
                    .in('job_id', jobsList.map(j => j.id));
                (apps || []).forEach((a: any) => { counts[a.job_id] = (counts[a.job_id] || 0) + 1; });
            }

            setJobs(jobsList.map(j => ({ ...j, _applicantCount: counts[j.id] || 0 })));
        } catch (err: any) {
            console.error('Error fetching jobs:', err);
            toast.error(err.message || 'Failed to load jobs');
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        fetchJobs();
    }, [fetchJobs]);

    // Handle closing/expiring a job
    const handleExpireJob = async (e: React.MouseEvent, jobId: string) => {
        e.stopPropagation();
        try {
            const res = await fetch(`/api/jobs/${jobId}/close`, { method: 'POST' });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Failed to expire job');
            toast.success('Job expired successfully');
            fetchJobs();
        } catch (err: any) {
            console.error('Error expiring job:', err);
            toast.error(err.message || 'Failed to expire job');
        }
    };

    // Handle publishing a draft job
    const handlePublishJob = async (e: React.MouseEvent, jobId: string) => {
        e.stopPropagation();
        try {
            const res = await fetch(`/api/jobs/${jobId}/publish`, { method: 'POST' });
            const json = await res.json();
            if (!res.ok) {
                if (json.error === 'ACTIVE_JOB_LIMIT') {
                    toast.error(json.message || 'Active job limit reached. Close an active job to post another.');
                    return;
                }
                throw new Error(json.error || 'Failed to publish job');
            }
            toast.success('Job published successfully');
            fetchJobs();
        } catch (err: any) {
            console.error('Error publishing job:', err);
            toast.error(err.message || 'Failed to publish job');
        }
    };

    // Handle deleting a job
    const handleDeleteJob = async (e: React.MouseEvent, jobId: string) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this job posting? This cannot be undone.')) return;
        try {
            const { error } = await insforge.database
                .from('jobs')
                .delete()
                .eq('id', jobId);

            if (error) throw error;
            toast.success('Job deleted successfully');
            fetchJobs();
        } catch (err: any) {
            console.error('Error deleting job:', err);
            toast.error(err.message || 'Failed to delete job');
        }
    };

    // Client-side filtering & tab classification
    const filteredJobs = useMemo(() => {
        let list = jobs;

        // 1. Tab filter
        if (activeTab === 'published') {
            list = list.filter(j => j.status === 'active' || j.status === 'published');
        } else if (activeTab === 'drafts') {
            list = list.filter(j => j.status === 'draft');
        } else if (activeTab === 'expired') {
            list = list.filter(j => j.status === 'closed' || j.status === 'expired');
        }

        // 2. Search query (Matches Title, Department, Location)
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(j => 
                (j.title || '').toLowerCase().includes(q) ||
                (j.department || '').toLowerCase().includes(q) ||
                (j.location || '').toLowerCase().includes(q)
            );
        }

        // 3. Type Filter
        if (typeFilter) {
            list = list.filter(j => (j.type || '').toLowerCase() === typeFilter.toLowerCase());
        }

        // 4. Location Filter
        if (locationFilter) {
            list = list.filter(j => (j.location || '').toLowerCase() === locationFilter.toLowerCase());
        }

        return list;
    }, [jobs, activeTab, searchQuery, typeFilter, locationFilter]);

    // Unique options for dropdowns
    const uniqueLocations = useMemo(() => {
        return Array.from(new Set(jobs.map(j => j.location).filter(Boolean))) as string[];
    }, [jobs]);

    const uniqueTypes = useMemo(() => {
        return Array.from(new Set(jobs.map(j => j.type).filter(Boolean))) as string[];
    }, [jobs]);

    // Setup filter dropdowns config
    const filters: FilterDropdown[] = useMemo(() => [
        {
            key: 'type',
            label: 'Job Type',
            options: uniqueTypes.map(t => ({ value: t, label: t })),
            value: typeFilter,
            onChange: setTypeFilter
        },
        {
            key: 'location',
            label: 'Location',
            options: uniqueLocations.map(l => ({ value: l, label: l })),
            value: locationFilter,
            onChange: setLocationFilter
        }
    ], [typeFilter, locationFilter, uniqueTypes, uniqueLocations]);

    // Tab counts calculation
    const counts = useMemo(() => {
        return {
            all: jobs.length,
            published: jobs.filter(j => j.status === 'active' || j.status === 'published').length,
            drafts: jobs.filter(j => j.status === 'draft').length,
            expired: jobs.filter(j => j.status === 'closed' || j.status === 'expired').length,
        };
    }, [jobs]);

    const handleClearAll = () => {
        setSearchQuery('');
        setTypeFilter('');
        setLocationFilter('');
    };

    // Columns config for DataTable
    const columns: Column<any>[] = useMemo(() => [
        {
            header: 'Job Title',
            key: 'title',
            render: (j) => (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 700, color: 'var(--tm-text-primary)' }}>{j.title}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--tm-text-secondary)' }}>{j.department || 'General'} · {j.type || 'Full-time'}</span>
                </div>
            )
        },
        {
            header: 'Location',
            key: 'location',
            render: (j) => <span>{j.location || 'Remote'}</span>
        },
        {
            header: 'Status',
            key: 'status',
            render: (j) => <StatusPill status={j.status === 'active' ? 'published' : j.status} />
        },
        {
            header: 'Applicants',
            key: 'applications',
            render: (j) => {
                const count = j._applicantCount || 0;
                return (
                    <Link
                        href={`/dashboard/recruiter/${roleId}/candidates?tab=shortlisted&jobId=${j.id}`}
                        onClick={e => e.stopPropagation()}
                        style={{ color: 'var(--primary-blue)', fontWeight: 700, textDecoration: 'underline' }}
                    >
                        {count} applicant{count !== 1 ? 's' : ''}
                    </Link>
                );
            }
        },
        {
            header: 'Posted Date',
            key: 'created_at',
            render: (j) => <span>{new Date(j.created_at).toLocaleDateString()}</span>
        },
        {
            header: 'Actions',
            key: 'actions',
            align: 'right',
            render: (j) => (
                <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
                    <Link
                        href={`/dashboard/recruiter/${roleId}/jobs/post-job?edit=${j.id}`}
                        className={styles.editBtn}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        title="Edit posting"
                    >
                        {IC.edit} Edit
                    </Link>
                    {j.status === 'draft' && (
                        <button
                            onClick={(e) => handlePublishJob(e, j.id)}
                            className={styles.editBtn}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#eff6ff', color: '#1e88e5', border: '1px solid #dbeafe', padding: '0.4rem 0.8rem', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                            title="Publish job"
                        >
                            {IC.plus} Publish
                        </button>
                    )}
                    {(j.status === 'active' || j.status === 'published') && (
                        <button
                            onClick={(e) => handleExpireJob(e, j.id)}
                            className={styles.expireBtn}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#fef2f2', color: '#ef4444', border: '1px solid #fee2e2', padding: '0.4rem 0.8rem', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                            title="Close/expire job"
                        >
                            {IC.expire} Expire
                        </button>
                    )}
                    <button
                        onClick={(e) => handleDeleteJob(e, j.id)}
                        className={styles.deleteBtn}
                        style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#ef4444', borderRadius: 8, padding: '0.4rem 0.6rem', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                        title="Delete posting"
                    >
                        {IC.trash}
                    </button>
                </div>
            )
        }
    ], [roleId]);

    if (loading && jobs.length === 0) return <HomeSkeleton />;

    return (
        <div className={sharedStyles.dash}>
            {/* Page Header */}
            <div className={sharedStyles.pageHeader}>
                <div className={sharedStyles.pageHeaderContent}>
                    <h1 className={sharedStyles.pageHeaderTitle}>Job Postings</h1>
                    <p className={sharedStyles.pageHeaderSub}>Create, publish, and track recruitment postings across the company.</p>
                </div>
                <Link href={`/dashboard/recruiter/${roleId}/jobs/post-job`} className={styles.createBtn} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}>
                    {IC.plus} Post a New Job
                </Link>
            </div>

            {/* Folder Tab Strip */}
            <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--tm-border)', paddingBottom: '0.25rem', flexWrap: 'wrap' }}>
                {[
                    { key: 'all', label: 'All Jobs', count: counts.all },
                    { key: 'published', label: 'Published', count: counts.published },
                    { key: 'drafts', label: 'Drafts', count: counts.drafts },
                    { key: 'expired', label: 'Expired', count: counts.expired }
                ].map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => handleTabChange(tab.key as TabType)}
                        style={{
                            padding: '0.6rem 1.25rem',
                            borderBottom: activeTab === tab.key ? '3px solid var(--primary-blue)' : '3px solid transparent',
                            color: activeTab === tab.key ? 'var(--primary-blue)' : 'var(--tm-text-secondary)',
                            fontWeight: activeTab === tab.key ? 700 : 500,
                            fontSize: '0.85rem',
                            background: 'none',
                            borderLeft: 'none',
                            borderRight: 'none',
                            borderTop: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem'
                        }}
                    >
                        {tab.label}
                        <span style={{ 
                            fontSize: '0.72rem', 
                            background: activeTab === tab.key ? 'var(--status-info-bg)' : 'var(--tm-surface-muted)',
                            color: activeTab === tab.key ? 'var(--primary-blue)' : 'var(--tm-text-secondary)',
                            padding: '2px 6px',
                            borderRadius: '99px',
                            fontWeight: 700
                        }}>
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>

            {/* Table & Filtering */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--tm-surface)', border: '1px solid var(--tm-border)', borderRadius: 'var(--tm-card-radius)', padding: '1.5rem', marginTop: '0.5rem' }}>
                <FilterBar
                    search={searchQuery}
                    onSearchChange={setSearchQuery}
                    searchPlaceholder="Search jobs by title, department, or location..."
                    filters={filters}
                    onClearAll={handleClearAll}
                />

                <DataTable
                    columns={columns}
                    data={filteredJobs}
                    loading={loading}
                    onRowClick={(row) => setSelectedJob(row)}
                    emptyState={
                        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--tm-border)" strokeWidth="1.5" style={{ marginBottom: '1rem' }}>
                                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                            </svg>
                            <p style={{ fontWeight: 600, color: 'var(--tm-text-primary)' }}>No jobs found</p>
                            <p style={{ fontSize: '0.85rem', color: 'var(--tm-text-secondary)', marginTop: '0.25rem' }}>Start by posting a new job or adjusting filters.</p>
                        </div>
                    }
                />
            </div>

            {/* Details Drawer */}
            <DetailDrawer
                isOpen={!!selectedJob}
                onClose={() => setSelectedJob(null)}
                title="Job Details"
            >
                {selectedJob && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div>
                            <span style={{ textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 800, color: 'var(--tm-accent)', letterSpacing: '0.05em' }}>
                                {selectedJob.type || 'Full-time'} · {selectedJob.department || 'Recruitment'}
                            </span>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--tm-text-primary)', margin: '0.25rem 0 0.5rem' }}>
                                {selectedJob.title}
                            </h3>
                            <p style={{ color: 'var(--tm-text-secondary)', margin: 0, fontSize: '0.875rem' }}>
                                Location: <strong>{selectedJob.location || 'Remote'}</strong>
                            </p>
                        </div>

                        <hr style={{ border: 'none', borderTop: '1px solid var(--tm-border)', margin: 0 }} />

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                <span style={{ color: 'var(--tm-text-secondary)' }}>Status:</span>
                                <StatusPill status={selectedJob.status === 'active' ? 'published' : selectedJob.status} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                <span style={{ color: 'var(--tm-text-secondary)' }}>Salary Range:</span>
                                <span style={{ fontWeight: 600 }}>{selectedJob.salary_min && selectedJob.salary_max ? `₹${selectedJob.salary_min.toLocaleString()} - ₹${selectedJob.salary_max.toLocaleString()}` : 'Not Specified'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                <span style={{ color: 'var(--tm-text-secondary)' }}>Experience Needed:</span>
                                <span style={{ fontWeight: 600 }}>{selectedJob.experience_min != null ? `${selectedJob.experience_min} - ${selectedJob.experience_max || '5+'} yrs` : 'Any'}</span>
                            </div>
                        </div>

                        {selectedJob.description && (
                            <>
                                <hr style={{ border: 'none', borderTop: '1px solid var(--tm-border)', margin: 0 }} />
                                <div>
                                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem' }}>Description</h4>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--tm-text-secondary)', background: 'var(--tm-surface-muted)', padding: '0.75rem', borderRadius: '6px', whiteSpace: 'pre-wrap' }}>
                                        {selectedJob.description}
                                    </p>
                                </div>
                            </>
                        )}

                        <hr style={{ border: 'none', borderTop: '1px solid var(--tm-border)', margin: 0 }} />

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <Link 
                                href={`/dashboard/recruiter/${roleId}/jobs/post-job?edit=${selectedJob.id}`}
                                style={{
                                    display: 'block',
                                    textAlign: 'center',
                                    padding: '0.6rem',
                                    background: 'var(--tm-accent)',
                                    color: 'white',
                                    textDecoration: 'none',
                                    borderRadius: '6px',
                                    fontWeight: 600,
                                    fontSize: '0.875rem'
                                }}
                            >
                                Edit Job Details
                            </Link>
                            <Link 
                                href={`/dashboard/recruiter/${roleId}/candidates?tab=shortlisted&jobId=${selectedJob.id}`}
                                style={{
                                    display: 'block',
                                    textAlign: 'center',
                                    padding: '0.6rem',
                                    background: 'none',
                                    border: '1px solid var(--tm-accent)',
                                    color: 'var(--tm-accent)',
                                    textDecoration: 'none',
                                    borderRadius: '6px',
                                    fontWeight: 600,
                                    fontSize: '0.875rem'
                                }}
                            >
                                View Applicants
                            </Link>
                        </div>
                    </div>
                )}
            </DetailDrawer>
        </div>
    );
}
