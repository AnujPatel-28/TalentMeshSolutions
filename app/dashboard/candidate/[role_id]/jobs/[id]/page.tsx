'use client';
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { invokeFunction } from '@/lib/insforge';
import type { ApplicationStatus } from '@/types/user';
import { useAuth } from '@/lib/auth/AuthContext';
import { insforge } from '@/lib/insforge';
import ApplyModal from '@/components/candidate/ApplyModal';
import Toast from '@/components/ui/Toast';
import { useSavedJobs } from '@/hooks/useSavedJobs';
import styles from '@/app/browse-jobs/[id]/jobDetail.module.css';
import { getPublicStorageUrl } from '@/lib/utils/storage-url';

// ─── Icons ──────────────────────────────────────────────────────────────────────
const Ico = {
    Location: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>,
    Briefcase: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /></svg>,
    Sparkle: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="m12 3 1.912 5.885L20 10.8l-5.088 1.912L13 18.6l-1.912-5.888L6 10.8l5.088-1.915Z" /></svg>,
    Heart: ({ filled }: { filled?: boolean }) => <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>,
    Share: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>,
    Clock: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
    ArrowR: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14m-7-7 7 7-7 7" /></svg>,
    Check: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
    Star: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>,
    Salary: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>,
    Globe: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>,
    Building: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" /><line x1="9" y1="6" x2="10" y2="6" /><line x1="14" y1="6" x2="15" y2="6" /><line x1="9" y1="10" x2="10" y2="10" /><line x1="14" y1="10" x2="15" y2="10" /><line x1="9" y1="14" x2="10" y2="14" /><line x1="14" y1="14" x2="15" y2="14" /><line x1="9" y1="18" x2="15" y2="18" /></svg>,
    Award: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7" /><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" /></svg>,
};

const formatSalary = (min: number | null, max: number | null, currency: string = 'INR') => {
    if (!min && !max) return 'Competitive';
    const symbol = currency === 'USD' ? '$' : '₹';
    const kMin = min ? `${(min / 1000).toFixed(0)}K` : '';
    const kMax = max ? `${(max / 1000).toFixed(0)}K` : '';
    if (kMin && kMax) return `${symbol}${kMin}–${symbol}${kMax}`;
    return kMin ? `${symbol}${kMin}+` : `${symbol}${kMax}`;
};

const formatExperience = (min: number | null, max: number | null) => {
    if (min === null && max === null) return 'Not specified';
    if (min !== null && max !== null) return `${min}–${max} years`;
    return min !== null ? `${min}+ years` : `Up to ${max} years`;
};

interface Job {
    id: string;
    title: string;
    description: string;
    location: string;
    salary_min: number | null;
    salary_max: number | null;
    currency: string;
    experience_min: number | null;
    experience_max: number | null;
    skills_required: string[];
    requirements: string[];
    created_at: string;
    applications_count?: number;
    companies?: {
        name: string;
        logo_url: string | null;
    };
    type?: string;
    job_type?: string;
    work_mode?: string;
    department?: string;
}

interface CandidateProfile {
    name: string;
    email: string;
    phone: string;
    location: string;
    headline: string;
    skills: string[];
    experienceYears: number;
    education: string;
    resumeUrl: string;
    profileStrength: number;
    linkedinUrl: string;
    githubUrl: string;
    portfolioUrl: string;
}

export default function DashboardJobDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const jobId = params.id as string;

    const [job, setJob] = useState<Job | null>(null);
    const [loading, setLoading] = useState(true);
    const [appStatus, setAppStatus] = useState<ApplicationStatus | null>(null);
    const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
    const [candidateProfile, setCandidateProfile] = useState<CandidateProfile | null>(null);
    const { isSaved: isJobSaved, toggleSave, toast, clearToast } = useSavedJobs(user?.id || null);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [jobRes, statusRes] = await Promise.all([
                invokeFunction('jobs-id', { method: 'GET', queries: { id: jobId } }),
                invokeFunction('candidate-applications', { method: 'GET', queries: { jobId } })
            ]);
            
            if (jobRes.data) setJob(jobRes.data.job || jobRes.data);
            if (statusRes.data?.status && statusRes.data.status !== 'withdrawn') {
                setAppStatus(statusRes.data.status);
            } else {
                setAppStatus(null);
            }

            if (user) {
                const profileResponse = await insforge.database
                    .from('candidate_profiles')
                    .select('*, profiles(name, email, phone, location)')
                    .eq('id', user.id)
                    .maybeSingle();

                if (profileResponse.data) {
                    setCandidateProfile({
                        name: profileResponse.data.profiles?.name || user.name || 'User',
                        email: profileResponse.data.profiles?.email || user.email || '',
                        phone: profileResponse.data.profiles?.phone || '',
                        location: profileResponse.data.profiles?.location || '',
                        headline: profileResponse.data.headline || '',
                        skills: profileResponse.data.skills || [],
                        experienceYears: profileResponse.data.experience_years || 0,
                        education: profileResponse.data.education || '',
                        resumeUrl: profileResponse.data.resume_url || '',
                        profileStrength: profileResponse.data.profile_strength || 0,
                        linkedinUrl: profileResponse.data.linkedin_url || '',
                        githubUrl: profileResponse.data.github_url || '',
                        portfolioUrl: profileResponse.data.portfolio_url || ''
                    });
                }
            }
        } catch (err) {
            console.error('Failed to fetch job data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (jobId) fetchData();
    }, [jobId, user]);

    const handleToggleSave = () => {
        if (!user) return router.push('/login');
        toggleSave(jobId);
    };

    if (loading) {
        return <div style={{ padding: '80px 0', textAlign: 'center' }}>Loading job details...</div>;
    }

    if (!job) {
        return (
            <div style={{ padding: '80px 0', textAlign: 'center' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>Job Not Found</h1>
                <p style={{ color: '#64748b', marginBottom: 24 }}>The job you&apos;re looking for doesn&apos;t exist or has been removed.</p>
                <Link href="/dashboard/candidate/jobs" style={{ color: 'var(--primary-blue)', fontWeight: 600, textDecoration: 'underline' }}>← Back to Jobs</Link>
            </div>
        );
    }

    const brandColor = '#3b82f6'; // Fallback blue

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '-0.5rem' }}>
            {/* Breadcrumb */}
            <nav style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <Link href="/dashboard/candidate" style={{ color: '#475569', textDecoration: 'none' }}>Dashboard</Link>
                <span>›</span>
                <Link href="/dashboard/candidate/jobs" style={{ color: '#475569', textDecoration: 'none' }}>Jobs</Link>
                <span>›</span>
                <span style={{ color: '#0f172a', fontWeight: 500 }}>{job.title}</span>
            </nav>

            {/* ── Hero Banner ── */}
            <div style={{
                background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '2rem',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
            }}>
                <div style={{
                    position: 'absolute', top: 0, right: 0, width: '400px', height: '100%',
                    background: `linear-gradient(90deg, transparent, ${brandColor}10)`,
                    clipPath: 'polygon(20% 0, 100% 0, 100% 100%, 0% 100%)'
                }} />

                <div style={{ display: 'flex', gap: '1.5rem', position: 'relative', zIndex: 2, alignItems: 'center' }}>
                    <div style={{
                        width: '80px', height: '80px', borderRadius: '16px',
                        background: brandColor + '15', color: brandColor,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '2rem', fontWeight: 800, flexShrink: 0,
                        border: `1px solid ${brandColor}30`, overflow: 'hidden'
                    }}>
                        {job.companies?.logo_url ? (
                            <img src={getPublicStorageUrl('company-logos', job.companies.logo_url)} alt={job.companies.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            job.companies?.name[0]
                        )}
                    </div>

                    <div style={{ flex: 1 }}>
                        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>{job.title}</h1>
                        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem', flexWrap: 'wrap', color: '#475569', fontSize: '0.9rem', fontWeight: 500 }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Ico.Building /> {job.companies?.name}</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Ico.Location /> {job.location}</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Ico.Clock /> Posted {new Date(job.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'flex-end' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                onClick={handleToggleSave}
                                title={isJobSaved(jobId) ? 'Remove from saved' : 'Save job'}
                                style={{
                                    background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px',
                                    width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', color: isJobSaved(jobId) ? '#ef4444' : '#94a3b8'
                                }}
                            >
                                <Ico.Heart filled={isJobSaved(jobId)} />
                            </button>
                            {appStatus ? (
                                <span className={styles.matchBadge} style={{ background: '#f0fdf4', color: '#10b981', padding: '0.8rem 1.5rem', borderRadius: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <Ico.Check /> {appStatus.charAt(0).toUpperCase() + appStatus.slice(1)}
                                </span>
                            ) : (
                                <button
                                    onClick={() => setIsApplyModalOpen(true)}
                                    style={{
                                        background: 'var(--primary-blue)', color: 'white', border: 'none',
                                        padding: '0.8rem 2rem', borderRadius: '12px', fontSize: '1rem',
                                        fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                                        boxShadow: '0 4px 14px rgba(0, 123, 255, 0.35)',
                                        transition: 'transform 0.2s, box-shadow 0.2s'
                                    }}
                                >
                                    Apply Now
                                </button>
                            )}
                        </div>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>{job.applications_count || 0} people applied</span>
                    </div>
                </div>
            </div>

            {/* ── Body ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem' }}>
                {/* Main Content */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Description */}
                    <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Ico.Briefcase /> Job Description
                        </h2>
                        <div style={{ color: '#475569', lineHeight: 1.7, fontSize: '0.95rem', whiteSpace: 'pre-wrap' }}>
                            {job.description}
                        </div>
                    </div>

                    {/* Requirements */}
                    {Array.isArray(job.requirements) && job.requirements.length > 0 && (
                        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Ico.Star /> Requirements
                            </h2>
                            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {job.requirements.map((r, i) => (
                                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', color: '#475569', fontSize: '0.95rem', lineHeight: 1.6 }}>
                                        <span style={{ color: 'var(--primary-blue)', marginTop: 2, flexShrink: 0 }}><Ico.Check /></span>
                                        {r}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Skills */}
                    {Array.isArray(job.skills_required) && job.skills_required.length > 0 && (
                        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Ico.Award /> Skills Required
                            </h2>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                {job.skills_required.map((s) => (
                                    <span key={s} style={{ background: '#f1f5f9', color: '#475569', padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600 }}>
                                        {s}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Match Panel (Mock Score) */}
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '16px', padding: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#166534', margin: 0 }}><Ico.Sparkle /> AI Match Score</h3>
                            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#166534' }}>85%</span>
                        </div>
                        <div style={{ width: '100%', height: '8px', background: '#dcfce7', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `85%`, height: '100%', background: '#166534', borderRadius: '4px' }} />
                        </div>
                        <p style={{ fontSize: '0.8rem', color: '#15803d', marginTop: '1rem', lineHeight: 1.5, fontWeight: 500 }}>
                            Your profile is a strong match. Your skills perfectly align with the core requirements of this role.
                        </p>
                    </div>

                    {/* Job Overview */}
                    <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.2rem' }}>Job Overview</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#64748b', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Ico.Briefcase /> Type</span>
                                <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.9rem' }}>{job.job_type || job.type}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#64748b', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Ico.Salary /> Salary</span>
                                <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.9rem' }}>{formatSalary(job.salary_min, job.salary_max, job.currency)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#64748b', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Ico.Award /> Experience</span>
                                <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.9rem' }}>{formatExperience(job.experience_min, job.experience_max)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#64748b', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Ico.Building /> Department</span>
                                <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.9rem' }}>{job.department || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <ApplyModal
                isOpen={isApplyModalOpen}
                onClose={() => setIsApplyModalOpen(false)}
                jobId={job.id}
                jobTitle={job.title}
                companyName={job.companies?.name || 'Company'}
                candidateProfile={candidateProfile}
                jobSkills={job.skills_required || []}
                onSuccess={(appId) => {
                    setAppStatus('applied');
                    if (appId) {
                        router.push(`/dashboard/candidate/${params.role_id}/applications/${appId}/success`);
                    }
                }}
            />

            {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
        </div>
    );
}