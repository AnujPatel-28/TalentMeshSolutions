"use client";
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { insforge } from '@/lib/insforge';
import { getPublicStorageUrl } from '@/lib/utils/storage-url';
import { useAuth } from '@/lib/auth/AuthContext';
import { toast } from 'react-hot-toast';

// Simple SVG Icons
const Ico = {
    Building: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="2" width="16" height="20" rx="2" /><line x1="9" y1="6" x2="10" y2="6" /><line x1="14" y1="6" x2="15" y2="6" /><line x1="9" y1="10" x2="10" y2="10" /><line x1="14" y1="10" x2="15" y2="10" /></svg>,
    Location: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>,
    Globe: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>,
    Users: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
    ArrowLeft: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>,
    ArrowRight: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>,
    Star: ({ filled }: { filled?: boolean }) => <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? '#F59E0B' : 'none'} stroke={filled ? '#F59E0B' : '#cbd5e1'} strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
};

function StarRating({ rating }: { rating: number }) {
    return (
        <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
            {Array.from({ length: 5 }).map((_, idx) => {
                const filled = idx < Math.floor(rating);
                return <Ico.Star key={idx} filled={filled} />;
            })}
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginLeft: '6px' }}>{rating}</span>
        </div>
    );
}

function MorphText({ text }: { text: string }) {
    const [displayText, setDisplayText] = useState(text);
    const [opacity, setOpacity] = useState(1);
    const [translateY, setTranslateY] = useState(0);

    useEffect(() => {
        if (text !== displayText) {
            setOpacity(0);
            setTranslateY(-4);
            const t = setTimeout(() => {
                setDisplayText(text);
                setTranslateY(4);
                const t2 = setTimeout(() => {
                    setOpacity(1);
                    setTranslateY(0);
                }, 20);
            }, 150);
            return () => clearTimeout(t);
        }
    }, [text, displayText]);

    return (
        <span style={{ 
            display: 'inline-block',
            opacity, 
            transform: `translateY(${translateY}px)`, 
            transition: 'opacity 150ms cubic-bezier(0.16, 1, 0.3, 1), transform 150ms cubic-bezier(0.16, 1, 0.3, 1)' 
        }}>
            {displayText}
        </span>
    );
}

export default function CompanyPublicPage() {
    const { user } = useAuth();
    const isAuthenticated = !!user;
    const params = useParams();
    const router = useRouter();
    const companyId = params.companyId as string;

    const [company, setCompany] = useState<any>(null);
    const [jobs, setJobs] = useState<any[]>([]);
    const [reviews, setReviews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'about' | 'jobs' | 'reviews'>('about');

    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [reviewRating, setReviewRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [reviewTitle, setReviewTitle] = useState('');
    const [reviewText, setReviewText] = useState('');
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);

    const handleSubmitReview = async () => {
        if (reviewRating === 0) {
            toast.error('Please select a star rating.');
            return;
        }
        if (!reviewTitle.trim()) {
            toast.error('Please enter a review title.');
            return;
        }
        if (!reviewText.trim()) {
            toast.error('Please write your review details.');
            return;
        }

        setIsSubmittingReview(true);
        const reviewData = {
            company_name: company.name,
            rating: reviewRating,
            title: reviewTitle,
            review_text: reviewText,
            candidate_id: user?.id,
            candidate_name: user?.name || 'Anonymous Candidate',
            candidate_avatar: user?.avatar_url || ''
        };

        const newLocalReview = {
            companyName: company.name,
            rating: reviewRating,
            title: reviewTitle,
            text: reviewText,
            candidateId: user?.id,
            candidateName: user?.name || 'Anonymous Candidate',
            candidateAvatar: user?.avatar_url || '',
            date: new Date().toISOString()
        };

        try {
            const { error: dbError } = await insforge.database
                .from('company_reviews')
                .insert([reviewData]);

            if (dbError) throw dbError;
            toast.success('Review submitted successfully!');
        } catch (err: any) {
            console.warn('DB write failed, falling back to localStorage:', err?.message || err);

            const stored = localStorage.getItem('talentmesh_reviews');
            const list = stored ? JSON.parse(stored) : [];
            list.push(newLocalReview);
            localStorage.setItem('talentmesh_reviews', JSON.stringify(list));
            toast.success('Review submitted successfully!');
        }

        setReviews(prev => [newLocalReview, ...prev]);

        setReviewRating(0);
        setReviewTitle('');
        setReviewText('');
        setIsReviewModalOpen(false);
        setIsSubmittingReview(false);
    };

    useEffect(() => {
        if (company?.company_name && typeof window !== 'undefined') {
            document.title = `${company.company_name} | TalentMesh`;
        }
    }, [company]);

    useEffect(() => {
        // Auto navigate to hash tab if present in URL
        const hash = window.location.hash;
        if (hash === '#jobs') setActiveTab('jobs');
        else if (hash === '#reviews' || hash === '#salaries' || hash === '#questions') setActiveTab('reviews');
    }, []);

    useEffect(() => {
        if (!companyId) return;

        async function loadCompanyData() {
            setLoading(true);
            try {
                // Query companies table
                const { data: compData } = await insforge.database
                    .from('companies')
                    .select('*')
                    .eq('id', companyId)
                    .maybeSingle();

                if (!compData) {
                    setCompany(null);
                    setLoading(false);
                    return;
                }

                const name = compData?.name || 'Company Profile';
                const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'CP';

                const mergedCompany = {
                    id: companyId,
                    name,
                    industry: compData?.industry || 'Technology',
                    size: compData?.size || '50–200 employees',
                    logo_url: compData?.logo_url || null,
                    logoInitials: initials,
                    about: compData?.description || 'No details provided yet.',
                    website: compData?.website || '',
                    location: compData?.location || 'Bengaluru, India'
                };

                setCompany(mergedCompany);

                // Fetch jobs for this company
                const { data: jobsData } = await insforge.database
                    .from('jobs')
                    .select('*')
                    .eq('company_id', companyId)
                    .eq('status', 'active');

                setJobs(jobsData || []);

                // Load reviews from localStorage
                const localReviews = localStorage.getItem('talentmesh_reviews');
                if (localReviews) {
                    try {
                        const parsed = JSON.parse(localReviews);
                        const filteredReviews = parsed.filter((r: any) => r.companyName.toLowerCase() === name.toLowerCase());
                        setReviews(filteredReviews);
                    } catch (e) {
                        console.error('Failed to parse local reviews:', e);
                    }
                }
            } catch (err) {
                console.error('Error loading company:', err);
            } finally {
                setLoading(false);
            }
        }

        loadCompanyData();
    }, [companyId]);

    if (loading) {
        return (
            <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', fontFamily: 'Inter, system-ui, sans-serif' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ border: '3px solid #e2e8f0', borderTop: '3px solid #007BFF', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
                    <span style={{ fontSize: '15px', color: '#64748b', fontWeight: 500 }}>Loading company profile...</span>
                    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                </div>
            </div>
        );
    }

    if (!company) {
        return (
            <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', fontFamily: 'Inter, system-ui, sans-serif', padding: '2rem' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>Company Not Found</h1>
                <p style={{ fontSize: '15px', color: '#64748b', marginBottom: '24px' }}>The company profile you are trying to view does not exist or has been removed.</p>
                <button onClick={() => router.back()} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', border: '1px solid #cbd5e1', padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, background: '#fff', cursor: 'pointer' }}>
                    <Ico.ArrowLeft /> Go Back
                </button>
            </div>
        );
    }

    // Average rating
    const avgRating = reviews.length > 0 ? parseFloat((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)) : 4.0;
    const reviewCount = reviews.length;

    const dashboardLink = user?.role === 'recruiter' 
        ? '/recruiter/dashboard' 
        : (user?.role === 'admin' || user?.role === 'super_admin')
            ? '/admin/dashboard'
            : '/candidate/dashboard';

    const dashboardLabel = user?.role === 'recruiter'
        ? 'Recruiter Hub'
        : (user?.role === 'admin' || user?.role === 'super_admin')
            ? 'Admin Panel'
            : 'Find Jobs';

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'Inter, system-ui, sans-serif', color: '#1e293b' }}>
            {/* Nav Header */}
            <header style={{ height: '64px', backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2rem', position: 'sticky', top: 0, zIndex: 100 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {isAuthenticated && (
                        <button onClick={() => router.back()} style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '6px', color: '#64748b' }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#f1f5f9'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                            <Ico.ArrowLeft />
                        </button>
                    )}
                    <Link href={isAuthenticated ? dashboardLink : "/"} style={{ textDecoration: 'none', color: '#0f172a', fontWeight: 850, fontSize: '19px', letterSpacing: '-0.03em' }}>
                        Talent<span style={{ color: '#007BFF' }}>Mesh</span>
                    </Link>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {isAuthenticated ? (
                        <>
                            <Link href={dashboardLink} style={{ textDecoration: 'none', fontSize: '14px', fontWeight: 600, color: '#475569', padding: '8px 16px', borderRadius: '6px' }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#f1f5f9'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                {dashboardLabel}
                            </Link>
                            <Link href={dashboardLink} style={{ textDecoration: 'none', fontSize: '14px', fontWeight: 600, color: '#007BFF', border: '1px solid #007BFF', padding: '8px 16px', borderRadius: '6px', backgroundColor: '#f0f7ff' }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#f0f7ff'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                Dashboard
                            </Link>
                        </>
                    ) : (
                        <>
                            <Link href="/browse-jobs" style={{ textDecoration: 'none', fontSize: '14px', fontWeight: 600, color: '#475569', padding: '8px 16px', borderRadius: '6px' }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#f1f5f9'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                Browse Jobs
                            </Link>
                            <Link href="/login" style={{ textDecoration: 'none', fontSize: '14px', fontWeight: 600, color: '#475569', padding: '8px 16px', borderRadius: '6px' }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#f1f5f9'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                Log In
                            </Link>
                            <Link href="/signup" style={{ textDecoration: 'none', fontSize: '14px', fontWeight: 700, color: '#ffffff', backgroundColor: '#007BFF', padding: '8px 16px', borderRadius: '6px', boxShadow: '0 2px 4px rgba(0, 123, 255, 0.2)' }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#0069d9'} onMouseOut={e => e.currentTarget.style.backgroundColor = '#007BFF'}>
                                Get Started
                            </Link>
                        </>
                    )}
                </div>
            </header>

            {/* Premium Hero Band */}
            <div style={{ background: 'linear-gradient(135deg, #12263A 0%, #1e3a5f 60%, #12263A 100%)', padding: '4rem 2rem 2.5rem', color: '#ffffff', position: 'relative' }}>
                <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', gap: '2rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    {/* Logo container */}
                    <div style={{ width: '96px', height: '96px', borderRadius: '16px', backgroundColor: '#ffffff', color: '#007BFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 800, border: '4px solid #ffffff', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', flexShrink: 0, overflow: 'hidden' }}>
                        {company.logo_url ? (
                            <img src={getPublicStorageUrl('company-logos', company.logo_url)} alt={company.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            company.logoInitials
                        )}
                    </div>
                    {/* Company info */}
                    <div style={{ flex: 1, minWidth: '280px' }}>
                        <h1 style={{ fontSize: '32px', fontWeight: 800, margin: '0 0 10px', letterSpacing: '-0.02em' }}>{company.name}</h1>
                        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '14px', color: '#cbd5e1', fontWeight: 500 }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Ico.Building /> {company.industry}</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Ico.Location /> {company.location}</span>
                            {company.website && (
                                <a href={company.website.startsWith('http') ? company.website : `https://${company.website}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#60a5fa', textDecoration: 'none' }} onMouseOver={e => e.currentTarget.style.textDecoration = 'underline'} onMouseOut={e => e.currentTarget.style.textDecoration = 'none'}>
                                    <Ico.Globe /> Website
                                </a>
                            )}
                        </div>
                        {/* Rating row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px' }}>
                            <div style={{ display: 'flex', gap: '2px' }}>
                                {Array.from({ length: 5 }).map((_, idx) => (
                                    <Ico.Star key={idx} filled={idx < Math.floor(avgRating)} />
                                ))}
                            </div>
                            <span style={{ fontSize: '14px', fontWeight: 700 }}>{avgRating} Rating</span>
                            <span style={{ color: '#cbd5e1' }}>|</span>
                            <span style={{ fontSize: '14px', color: '#93c5fd', fontWeight: 600 }}>{reviewCount} Candidate Reviews</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 2rem', display: 'flex', gap: '1.5rem' }}>
                    {(['about', 'jobs', 'reviews'] as const).map(tab => {
                        const isActive = activeTab === tab;
                        return (
                            <button key={tab} onClick={() => { setActiveTab(tab); window.location.hash = tab; }} style={{ border: 'none', background: 'none', padding: '16px 8px', fontSize: '15px', fontWeight: 600, color: isActive ? '#007BFF' : '#64748b', borderBottom: isActive ? '3px solid #007BFF' : '3px solid transparent', cursor: 'pointer', transition: 'all 0.2s', textTransform: 'capitalize' }}>
                                {tab === 'about' ? 'About Us' : tab === 'jobs' ? `Open Jobs (${jobs.length})` : `Reviews (${reviewCount})`}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Main Content Area */}
            <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '2.5rem 2rem' }}>
                {activeTab === 'about' && (
                    <div style={{ display: 'flex', gap: '2.5rem', flexWrap: 'wrap' }}>
                        {/* Left Column: About content */}
                        <div style={{ flex: 2, minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <section style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '2rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#12263A', marginBottom: '1rem' }}>About {company.name}</h2>
                                <p style={{ fontSize: '15px', color: '#475569', lineHeight: 1.7, whiteSpace: 'pre-line', margin: 0 }}>
                                    {company.about}
                                </p>
                            </section>
                        </div>
                        {/* Right Column: Sidebar Stats */}
                        <div style={{ flex: 1, minWidth: '260px' }}>
                            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#12263A', margin: 0 }}>Company Overview</h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ color: '#007BFF', display: 'flex', flexShrink: 0 }}><Ico.Building /></div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>Industry</span>
                                        <span style={{ fontSize: '14.5px', color: '#1e293b', fontWeight: 600 }}>{company.industry}</span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ color: '#007BFF', display: 'flex', flexShrink: 0 }}><Ico.Users /></div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>Company size</span>
                                        <span style={{ fontSize: '14.5px', color: '#1e293b', fontWeight: 600 }}>{company.size}</span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ color: '#007BFF', display: 'flex', flexShrink: 0 }}><Ico.Location /></div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>Headquarters</span>
                                        <span style={{ fontSize: '14.5px', color: '#1e293b', fontWeight: 600 }}>{company.location}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'jobs' && (
                    <div>
                        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#12263A', marginBottom: '1.5rem' }}>Open Positions at {company.name}</h2>
                        {jobs.length === 0 ? (
                            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '3rem 2rem', border: '1px solid #e2e8f0', textAlign: 'center', color: '#64748b' }}>
                                <span style={{ display: 'block', fontSize: '16px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>No active job openings</span>
                                <span style={{ fontSize: '14px' }}>We don&apos;t have any open roles right now. Check back again later!</span>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {jobs.map(job => (
                                    <div key={job.id} style={{ backgroundColor: '#ffffff', borderRadius: '14px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.01)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem', transition: 'box-shadow 0.2s' }} onMouseOver={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.04)'} onMouseOut={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.01)'}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#12263A', margin: 0 }}>{job.title}</h3>
                                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '13.5px', color: '#64748b', fontWeight: 500 }}>
                                                <span>{job.department || job.category || 'Engineering'}</span>
                                                <span>•</span>
                                                <span>{job.location}</span>
                                                <span>•</span>
                                                <span>{job.type || 'Full-time'}</span>
                                            </div>
                                            <div style={{ fontSize: '13.5px', color: '#0f766e', fontWeight: 600, display: 'inline-flex', marginTop: '4px' }}>
                                                ₹{(job.salary_min / 100000).toFixed(0)}L - ₹{(job.salary_max / 100000).toFixed(0)}L per annum
                                            </div>
                                        </div>
                                        <Link href={`/jobs/${job.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#007BFF', color: '#ffffff', padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 700, textDecoration: 'none', boxShadow: '0 2px 4px rgba(0, 123, 255, 0.2)' }}>
                                            View & Apply <Ico.ArrowRight />
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'reviews' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '12px' }}>
                            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#12263A', margin: 0 }}>Employee & Candidate Reviews</h2>
                            {isAuthenticated ? (
                                <button 
                                    onClick={() => setIsReviewModalOpen(true)}
                                    style={{ 
                                        display: 'inline-flex', 
                                        alignItems: 'center', 
                                        backgroundColor: '#007BFF', 
                                        color: '#ffffff', 
                                        border: 'none', 
                                        padding: '10px 20px', 
                                        borderRadius: '8px', 
                                        fontSize: '13.5px', 
                                        fontWeight: 700, 
                                        cursor: 'pointer',
                                        boxShadow: '0 2px 4px rgba(0, 123, 255, 0.2)',
                                        transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)' 
                                    }}
                                >
                                    <MorphText text="Write a Review" />
                                </button>
                            ) : (
                                <Link 
                                    href={`/login?rd=${encodeURIComponent(`/company/${company.id}#reviews`)}`}
                                    style={{ 
                                        display: 'inline-flex', 
                                        alignItems: 'center', 
                                        backgroundColor: '#f1f5f9', 
                                        color: '#475569', 
                                        border: '1px solid #cbd5e1', 
                                        padding: '10px 20px', 
                                        borderRadius: '8px', 
                                        fontSize: '13.5px', 
                                        fontWeight: 700, 
                                        textDecoration: 'none', 
                                        transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)' 
                                    }}
                                >
                                    <MorphText text="Login to Write Review" />
                                </Link>
                            )}
                        </div>
                        {reviews.length === 0 ? (
                            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '3rem 2rem', border: '1px solid #e2e8f0', textAlign: 'center', color: '#64748b' }}>
                                <span style={{ display: 'block', fontSize: '16px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>No reviews submitted yet</span>
                                <span style={{ fontSize: '14px' }}>Be the first to share your experience working with {company.name}!</span>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                {reviews.map((rev, index) => (
                                    <div key={index} style={{ backgroundColor: '#ffffff', borderRadius: '14px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.01)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                {rev.candidateAvatar ? (
                                                    <img src={rev.candidateAvatar} alt={rev.candidateName} style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                                                ) : (
                                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#f1f5f9', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>
                                                        {rev.candidateName?.[0] || 'A'}
                                                    </div>
                                                )}
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontSize: '14px', fontWeight: 650, color: '#1e293b' }}>{rev.candidateName}</span>
                                                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>{new Date(rev.date).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                            <StarRating rating={rev.rating} />
                                        </div>
                                        <div style={{ borderLeft: '3px solid #e2e8f0', paddingLeft: '12px', marginTop: '4px' }}>
                                            <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>&ldquo;{rev.title}&rdquo;</h4>
                                            <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6, margin: 0 }}>{rev.text}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Review Modal Dialog Overlay */}
            {isReviewModalOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.4)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '1rem',
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    <style>{`
                        @keyframes fadeIn {
                            from { opacity: 0; }
                            to { opacity: 1; }
                        }
                        @keyframes slideUp {
                            from { transform: translateY(20px); opacity: 0; }
                            to { transform: translateY(0); opacity: 1; }
                        }
                    `}</style>
                    <div style={{
                        background: '#ffffff',
                        borderRadius: '16px',
                        width: '100%',
                        maxWidth: '500px',
                        padding: '2.5rem 2rem 2rem 2rem',
                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1.25rem',
                        position: 'relative',
                        animation: 'slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    }}>
                        {/* Close button */}
                        <button 
                            onClick={() => {
                                setIsReviewModalOpen(false);
                                setReviewRating(0);
                                setReviewTitle('');
                                setReviewText('');
                            }}
                            style={{
                                position: 'absolute',
                                top: '1.25rem',
                                right: '1.25rem',
                                background: 'none',
                                border: 'none',
                                color: '#94a3b8',
                                cursor: 'pointer',
                                padding: '4px'
                            }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>

                        <div>
                            <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#12263A', margin: '0 0 4px 0' }}>Write a Company Review</h3>
                            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Share your employment experience to help other candidates.</p>
                        </div>

                        {/* Company (ReadOnly) */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Company</label>
                            <div style={{
                                padding: '0.75rem 14px',
                                borderRadius: '8px',
                                border: '1.5px solid #cbd5e1',
                                backgroundColor: '#f8fafc',
                                fontSize: '14px',
                                color: '#475569',
                                fontWeight: 600
                            }}>
                                {company.name}
                            </div>
                        </div>

                        {/* Rating */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Overall Rating *</label>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() => setReviewRating(star)}
                                        onMouseEnter={() => setHoverRating(star)}
                                        onMouseLeave={() => setHoverRating(0)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            padding: 0
                                        }}
                                    >
                                        <svg 
                                            width="32" 
                                            height="32" 
                                            viewBox="0 0 24 24" 
                                            fill={(hoverRating || reviewRating) >= star ? '#F59E0B' : '#E2E5EA'} 
                                            stroke={(hoverRating || reviewRating) >= star ? '#F59E0B' : '#CBD5E1'}
                                            strokeWidth="1.5"
                                        >
                                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                        </svg>
                                    </button>
                                ))}
                                {reviewRating > 0 && (
                                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#F59E0B', marginLeft: '6px' }}>
                                        {reviewRating}.0 / 5.0
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Title */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Review Title *</label>
                            <input 
                                type="text"
                                placeholder="Summarize your experience (e.g., Great growth opportunities)"
                                value={reviewTitle}
                                onChange={(e) => setReviewTitle(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    borderRadius: '8px',
                                    border: '1.5px solid #cbd5e1',
                                    outline: 'none',
                                    fontSize: '14px',
                                    color: '#12263A'
                                }}
                            />
                        </div>

                        {/* Details */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Review Details *</label>
                            <textarea 
                                placeholder="What is it like to work here? Pros, cons, management, culture..."
                                value={reviewText}
                                onChange={(e) => setReviewText(e.target.value)}
                                rows={4}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    borderRadius: '8px',
                                    border: '1.5px solid #cbd5e1',
                                    outline: 'none',
                                    fontSize: '14px',
                                    color: '#12263A',
                                    fontFamily: 'inherit',
                                    resize: 'vertical'
                                }}
                            />
                        </div>

                        {/* Action buttons */}
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsReviewModalOpen(false);
                                    setReviewRating(0);
                                    setReviewTitle('');
                                    setReviewText('');
                                }}
                                style={{
                                    padding: '0.625rem 1.25rem',
                                    borderRadius: '8px',
                                    border: '1px solid #cbd5e1',
                                    backgroundColor: '#ffffff',
                                    color: '#475569',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmitReview}
                                disabled={isSubmittingReview}
                                style={{
                                    padding: '0.625rem 1.25rem',
                                    borderRadius: '8px',
                                    border: 'none',
                                    backgroundColor: '#007BFF',
                                    color: '#ffffff',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    cursor: isSubmittingReview ? 'not-allowed' : 'pointer',
                                    opacity: isSubmittingReview ? 0.7 : 1
                                }}
                            >
                                {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
