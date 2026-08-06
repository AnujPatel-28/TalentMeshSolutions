"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import styles from '../../../../shared-dashboard.module.css';
import { insforge } from '@/lib/insforge';
import { useAuth } from '@/lib/auth/AuthContext';
import StatusPill from '@/components/dashboard/StatusPill';
import CandidateProfileDrawer from '@/components/recruiter/CandidateProfileDrawer';

const APPLICATION_STAGES = [
    'applied',
    'reviewing',
    'shortlisted',
    'interviewing',
    'offered',
    'hired',
    'rejected',
] as const;

const IC = {
    chevronLeft: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>,
};

type Application = {
    id: string;
    candidate_id: string;
    status: string;
    applied_at: string;
    candidate?: {
        id: string;
        name?: string;
        email?: string;
        avatar_url?: string;
        candidate_profiles?: { headline?: string; skills?: string[] } | null;
    } | null;
};

export default function RecruiterJobDetails() {
    const { user } = useAuth();
    const { job_id, role_id } = useParams<{ job_id: string; role_id: string }>();
    const router = useRouter();
    const [job, setJob] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
    const [updatingApplicationId, setUpdatingApplicationId] = useState<string | null>(null);

    useEffect(() => {
        async function fetchJob() {
            setLoading(true);
            setError(null);
            try {
                const { data, error: queryError } = await insforge.database
                    .from('jobs')
                    .select('id, title, description, location, type, status, created_at, recruiter_id, company_id, applications(id, candidate_id, status, applied_at, candidate:profiles!candidate_id(id, name, email, avatar_url, candidate_profiles(headline, skills)))')
                    .eq('id', job_id)
                    .single();

                if (queryError) throw queryError;
                setJob(data);
            } catch (err: any) {
                console.error('Failed to load job details:', err);
                setError('We could not load this job or you do not have access to it.');
            } finally {
                setLoading(false);
            }
        }

        if (job_id) fetchJob();
    }, [job_id]);

    const updateApplicationStage = async (applicationId: string, nextStatus: string) => {
        if (!job || job.recruiter_id !== user?.id) return;

        const previousApplications = [...(job.applications || [])];
        setUpdatingApplicationId(applicationId);
        setJob((current: any) => ({
            ...current,
            applications: current.applications.map((application: Application) =>
                application.id === applicationId ? { ...application, status: nextStatus } : application
            ),
        }));

        try {
            const response = await fetch(`/api/applications/${applicationId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: nextStatus }),
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => null);
                throw new Error(payload?.message || payload?.error || 'Failed to update application stage');
            }
        } catch (err: any) {
            console.error('Failed to update application stage:', err);
            setJob((current: any) => ({ ...current, applications: previousApplications }));
            window.alert(err.message || 'Failed to update application stage');
        } finally {
            setUpdatingApplicationId(null);
        }
    };

    if (loading) return <div className={styles.loading}>Loading job details...</div>;

    if (error || !job) {
        return (
            <div style={{ padding: '3rem', textAlign: 'center', background: 'white', borderRadius: 20, border: '1px solid #eef0f2' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem' }}>Job unavailable</h2>
                <p style={{ color: '#64748b', marginBottom: '2rem' }}>{error || 'This job could not be found.'}</p>
                <button onClick={() => router.push(`/dashboard/recruiter/${role_id}/jobs`)} style={{ padding: '0.8rem 1.5rem', background: 'var(--primary-blue)', color: 'white', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>
                    Back to Jobs
                </button>
            </div>
        );
    }

    const applications = (job.applications || []) as Application[];
    const canUpdateStages = job.recruiter_id === user?.id;

    return (
        <div style={{ paddingBottom: '3rem' }}>
            <button onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', marginBottom: '1.5rem', fontWeight: 600 }}>
                {IC.chevronLeft} Back to Jobs
            </button>

            <div style={{ background: '#fff', padding: '2rem', borderRadius: 20, border: '1px solid #eef0f2', marginBottom: '1.5rem' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>{job.title}</h1>
                <div style={{ display: 'flex', gap: '1rem', color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                    <span>{job.location}</span> • <span>{job.type}</span> • <span>Posted {new Date(job.created_at).toLocaleDateString()}</span>
                </div>
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.75rem' }}>Job Description</h3>
                    <p style={{ color: '#475569', lineHeight: 1.6 }}>{job.description}</p>
                </div>
            </div>

            <div style={{ background: '#fff', padding: '2rem', borderRadius: 20, border: '1px solid #eef0f2' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                    <div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Applicants</h2>
                        <p style={{ color: '#64748b', margin: '0.35rem 0 0' }}>{applications.length} application{applications.length === 1 ? '' : 's'} received</p>
                    </div>
                    <Link href={`/jobs/${job.id}`} target="_blank" rel="noreferrer" style={{ color: 'var(--primary-blue)', fontWeight: 600 }}>View public posting</Link>
                </div>

                {applications.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem 1rem', background: '#f8fafc', borderRadius: 14 }}>
                        <h3 style={{ color: '#0f172a', marginBottom: '0.5rem' }}>No applications yet</h3>
                        <p style={{ color: '#64748b', marginBottom: '1rem' }}>Applications for this job will appear here.</p>
                        <Link href={`/jobs/${job.id}`} target="_blank" rel="noreferrer" style={{ color: 'var(--primary-blue)', fontWeight: 600 }}>Open public job posting</Link>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                                    {['Candidate', 'Headline', 'Applied', 'Current stage', 'Actions'].map((heading) => (
                                        <th key={heading} style={{ padding: '0.75rem', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{heading}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {applications.map((application) => {
                                    const candidate = application.candidate;
                                    const headline = candidate?.candidate_profiles?.headline || 'No headline provided';
                                    return (
                                        <tr key={application.id} onClick={() => setSelectedCandidateId(application.candidate_id)} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}>
                                            <td style={{ padding: '1rem 0.75rem' }}>
                                                <div style={{ fontWeight: 700, color: '#0f172a' }}>{candidate?.name || 'Unnamed candidate'}</div>
                                                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{candidate?.email || 'Email unavailable'}</div>
                                            </td>
                                            <td style={{ padding: '1rem 0.75rem', color: '#475569' }}>{headline}</td>
                                            <td style={{ padding: '1rem 0.75rem', color: '#475569' }}>{application.applied_at ? new Date(application.applied_at).toLocaleDateString() : '—'}</td>
                                            <td style={{ padding: '1rem 0.75rem' }} onClick={(event) => event.stopPropagation()}>
                                                <select value={application.status} disabled={!canUpdateStages || updatingApplicationId === application.id} onChange={(event) => updateApplicationStage(application.id, event.target.value)} style={{ padding: '0.45rem 0.6rem', borderRadius: 8, border: '1px solid #cbd5e1', background: 'white' }}>
                                                    {APPLICATION_STAGES.map((stage) => <option key={stage} value={stage}>{stage.replace('_', ' ')}</option>)}
                                                </select>
                                                {!canUpdateStages && <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.25rem' }}>Job owner only</div>}
                                            </td>
                                            <td style={{ padding: '1rem 0.75rem' }}><StatusPill status={application.status} /></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <CandidateProfileDrawer candidateId={selectedCandidateId} onClose={() => setSelectedCandidateId(null)} />
        </div>
    );
}
