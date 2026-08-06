"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { insforge } from '@/lib/insforge';
import { useAuth } from '@/lib/auth/AuthContext';
import { useSavedJobs } from '@/hooks/useSavedJobs';
import Toast from '@/components/ui/Toast';
import { ListSkeleton } from '@/components/ui/LoadingSkeletons';

export default function SavedJobsPage() {
    const router = useRouter();
    const params = useParams();
    const roleId = params.role_id as string;
    const { user, isLoading: authLoading } = useAuth();
    const { toggleSave } = useSavedJobs(user?.id || null);

    const [savedJobs, setSavedJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

    const fetchSavedJobs = async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            const { data: savedData, error: savedError } = await insforge.database
                .from('saved_jobs')
                .select('id, job_id')
                .eq('candidate_id', user.id);

            if (savedError) throw savedError;

            if (!savedData || savedData.length === 0) {
                setSavedJobs([]);
                return;
            }

            const jobIds = savedData.map(item => item.job_id);

            const { data: jobsData, error: jobsError } = await insforge.database
                .from('jobs')
                .select('id, title, location, type, salary_min, salary_max, status, companies(name, logo_url)')
                .in('id', jobIds);

            if (jobsError) throw jobsError;

            const jobsMap = new Map(
                jobsData?.map((j: any) => {
                    const company = Array.isArray(j.companies) ? j.companies[0] : j.companies;
                    return [
                        j.id,
                        {
                            ...j,
                            company_name: company?.name || 'Company',
                            logo_url: company?.logo_url || null
                        }
                    ];
                }) ?? []
            );
            
            const merged = savedData.map(item => ({
                ...item,
                job: jobsMap.get(item.job_id) || null
            })).filter(item => item.job !== null);

            setSavedJobs(merged);
        } catch (err: any) {
            console.error("Error fetching saved jobs:", err.message || err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.id) fetchSavedJobs();
    }, [user?.id]);

    const handleRemove = async (jobId: string, savedItemId: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            await toggleSave(jobId);
            setSavedJobs(prev => prev.filter(item => item.id !== savedItemId));
            setToast({ message: 'Job removed from saved list.', type: 'info' });
        } catch (err) {
            console.error("Failed to remove saved job:", err);
        }
    };

    if (authLoading || (loading && savedJobs.length === 0)) {
        return <ListSkeleton title={true} action={false} count={3} />;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: '960px', margin: '2rem auto', padding: '0 2rem', fontFamily: 'Inter, system-ui, sans-serif' }}>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <div style={{ marginBottom: '0.5rem' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--tm-text-primary)', margin: 0, letterSpacing: '-0.02em' }}>Saved Jobs</h1>
            </div>

            {/* Tab strip - matches TAB STRIP + LIST layout */}
            <div style={{ display: 'flex', borderBottom: '1px solid #E2E5EA', gap: '32px' }}>
                <button
                    style={{
                        padding: '0 0 12px 0',
                        border: 'none',
                        background: 'none',
                        cursor: 'default',
                        borderBottom: '2px solid var(--tm-accent)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '2px',
                        outline: 'none'
                    }}
                >
                    <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--tm-text-primary)' }}>
                        {savedJobs.length}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--tm-text-secondary)' }}>
                        Saved
                    </span>
                </button>
            </div>

            {/* List with 1px dividers */}
            <div style={{ display: 'flex', flexDirection: 'column', marginTop: '1rem' }}>
                {savedJobs.length === 0 ? (
                    <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--tm-text-secondary)' }}>
                        <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '1rem' }}>🔖</span>
                        <h3 style={{ margin: '0 0 0.25rem', color: 'var(--tm-text-primary)' }}>No saved jobs yet</h3>
                        <p style={{ fontSize: '14px', margin: '0 0 1.5rem' }}>Start exploring jobs to bookmark roles that interest you.</p>
                        <Link 
                            href={`/dashboard/candidate/${roleId}`}
                            style={{ background: 'var(--tm-accent)', color: 'var(--white)', border: 'none', padding: '0.625rem 1.5rem', borderRadius: '8px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', textDecoration: 'none', display: 'inline-block' }}
                        >
                            Browse Jobs
                        </Link>
                    </div>
                ) : (
                    savedJobs.map((item: any) => {
                        const job = item.job;
                        if (!job) return null;
                        const isExpired = job.status !== 'active';
                        return (
                            <div 
                                key={item.id} 
                                style={{ 
                                    display: 'flex', 
                                    flexDirection: 'column',
                                    padding: '1.5rem 0', 
                                    borderBottom: '1px solid var(--tm-border)',
                                    cursor: 'pointer'
                                }}
                                onClick={() => router.push(`/dashboard/candidate/${roleId}?search=${encodeURIComponent(job.title)}`)}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                        {/* Small square company icon placeholder */}
                                        <div style={{ width: 48, height: 48, borderRadius: '4px', background: 'var(--tm-surface-muted)', border: '1px solid var(--tm-border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 800, color: 'var(--tm-accent)', flexShrink: 0 }}>
                                            {job.company_name?.[0] || 'J'}
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--tm-text-primary)' }}>
                                                {job.title}
                                            </h4>
                                            <span style={{ fontSize: '14px', color: 'var(--tm-text-secondary)' }}>
                                                {job.company_name}
                                            </span>
                                            <span style={{ fontSize: '14px', color: 'var(--tm-text-secondary)' }}>
                                                {job.location}
                                            </span>
                                            <span style={{ fontSize: '14px', color: 'var(--tm-text-secondary)' }}>
                                                {job.type}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                                        <button
                                            onClick={(e) => handleRemove(job.id, item.id, e)}
                                            style={{
                                                background: 'none',
                                                border: '1px solid var(--tm-border-strong)',
                                                padding: '0.5rem 1rem',
                                                borderRadius: '8px',
                                                fontSize: '14px',
                                                fontWeight: 600,
                                                color: 'var(--tm-status-error-text)',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s'
                                            }}
                                        >
                                            Remove
                                        </button>
                                        <button
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                padding: '4px',
                                                color: 'var(--tm-text-secondary)'
                                            }}
                                            title="More options"
                                        >
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" /></svg>
                                        </button>
                                    </div>
                                </div>

                                {/* Inline gray info banner below the row content if expired */}
                                {isExpired && (
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--tm-surface-muted)', padding: '12px 16px', borderRadius: '8px', marginTop: '12px', fontSize: '13px', color: 'var(--tm-text-secondary)' }}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                                        <span>Job closed or expired</span>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
