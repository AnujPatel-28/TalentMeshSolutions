"use client";
import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { useAuth } from '@/lib/auth/AuthContext';
import { insforge } from '@/lib/insforge';
import { getPublicStorageUrl } from '@/lib/utils/storage-url';

// Mock fallback companies deleted to show only registered portal companies

function StarRating({ rating }: { rating: number }) {
    return (
        <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
            {Array.from({ length: 5 }).map((_, idx) => {
                const filled = idx < Math.floor(rating);
                const half = !filled && idx < rating;
                return (
                    <svg key={idx} width="13" height="13" viewBox="0 0 24 24" fill={filled ? '#F59E0B' : half ? 'url(#half)' : '#E2E5EA'} stroke={filled || half ? '#F59E0B' : '#E2E5EA'}>
                        <defs>
                            <linearGradient id="half">
                                <stop offset="50%" stopColor="#F59E0B" />
                                <stop offset="50%" stopColor="#E2E5EA" />
                            </linearGradient>
                        </defs>
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                );
            })}
        </div>
    );
}

function CompanyReviewsPageContent() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const companyParam = searchParams ? searchParams.get('company') : null;
    const roleId = params.role_id as string;
    const { user: authUser } = useAuth();
    const [search, setSearch] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [reviewCompany, setReviewCompany] = useState('');
    const [reviewRating, setReviewRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [reviewTitle, setReviewTitle] = useState('');
    const [reviewText, setReviewText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [companiesList, setCompaniesList] = useState<any[]>([]);
    const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);

    React.useEffect(() => {
        async function loadCompaniesAndReviews() {
            setIsLoadingCompanies(true);
            let dbCompanies: any[] = [];
            try {
                // Fetch companies from live database
                const { data: dbData, error: dbErr } = await insforge.database
                    .from('companies')
                    .select('id, name, logo_url, industry, size');
                
                if (dbData && dbData.length > 0) {
                    dbCompanies = dbData.map((c: any) => {
                        // Get initials for logo
                        const initials = c.name ? c.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'C';
                        return {
                            id: c.id,
                            name: c.name,
                            logo: c.logo_url ? getPublicStorageUrl('company-logos', c.logo_url) : initials,
                            logoColor: '#007BFF',
                            logoBg: '#EFF6FF',
                            rating: 4.0, // Default base rating
                            reviews: 0,  // Start with 0 base reviews (recalculated below)
                            industry: c.industry || 'Technology',
                            employees: c.size || '1K–5K'
                        };
                    });
                }
            } catch (err) {
                console.warn('Could not fetch companies from live database:', err);
            }

            // Recalculate review stats using stored localStorage reviews
            const storedReviews = localStorage.getItem('talentmesh_reviews');
            let updated = [...dbCompanies];
            if (storedReviews) {
                try {
                    const reviews = JSON.parse(storedReviews);
                    updated = dbCompanies.map(c => {
                        const companyReviews = reviews.filter((r: any) => r.companyName.toLowerCase() === c.name.toLowerCase());
                        if (companyReviews.length > 0) {
                            const totalRating = c.rating * c.reviews + companyReviews.reduce((sum: number, r: any) => sum + r.rating, 0);
                            const totalReviews = c.reviews + companyReviews.length;
                            return {
                                ...c,
                                rating: parseFloat((totalRating / totalReviews).toFixed(1)),
                                reviews: totalReviews
                            };
                        }
                        return c;
                    });
                } catch (err) {
                    console.error('Failed to parse reviews:', err);
                }
            }
            setCompaniesList(updated);
            setIsLoadingCompanies(false);
        }

        loadCompaniesAndReviews();
    }, []);

    useEffect(() => {
        if (companyParam) {
            setReviewCompany(companyParam);
            setIsModalOpen(true);
        }
    }, [companyParam]);

    useEffect(() => {
        const handleBack = (e: Event) => {
            if (isModalOpen) {
                e.preventDefault();
                setIsModalOpen(false);
            }
        };
        window.addEventListener('app:back', handleBack);
        return () => window.removeEventListener('app:back', handleBack);
    }, [isModalOpen]);

    const filtered = companiesList.filter(r =>
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.industry.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div style={{ width: '100%', minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'Inter, system-ui, sans-serif' }}>
            <style>{`
                .review-select-trigger {
                    width: 100%;
                    padding: 0.75rem 14px;
                    border-radius: 8px !important;
                    border: 1.5px solid #cbd5e1 !important;
                    outline: none;
                    font-size: 14px;
                    color: #12263A;
                    background-color: #ffffff !important;
                    transition: border-color 0.15s;
                }
                .review-select-trigger:hover {
                    border-color: #94a3b8 !important;
                }
            `}</style>

            {/* ─── Dark Hero Band ─── */}
            <div style={{
                background: 'linear-gradient(135deg, #12263A 0%, #1e3a5f 60%, #12263A 100%)',
                padding: '3.5rem 2rem 6.5rem',
                textAlign: 'center',
                position: 'relative',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
            }}>
                <h1 style={{ fontSize: '34px', fontWeight: 800, color: '#ffffff', marginBottom: '0.5rem', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                    Find great places to work
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '15px', margin: 0 }}>
                    Get access to millions of company reviews
                </p>
                <button
                    onClick={() => setIsModalOpen(true)}
                    style={{
                        marginTop: '1rem',
                        backgroundColor: 'transparent',
                        color: '#ffffff',
                        border: '1.5px solid #ffffff',
                        borderRadius: '9999px',
                        padding: '8px 20px',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease-in-out',
                        zIndex: 5
                    }}
                    onMouseOver={e => {
                        e.currentTarget.style.backgroundColor = '#ffffff';
                        e.currentTarget.style.color = '#12263A';
                    }}
                    onMouseOut={e => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = '#ffffff';
                    }}
                >
                    Write a Review
                </button>

                {/* ─── Search card overlapping hero bottom ─── */}
                <div style={{
                    position: 'absolute',
                    bottom: '-24px',
                    width: 'calc(100% - 4rem)',
                    maxWidth: '640px',
                    background: '#ffffff',
                    border: '1px solid #CBD2DB',
                    borderRadius: '9999px',
                    padding: '4px 4px 4px 18px',
                    boxShadow: '0 4px 18px rgba(0,0,0,0.08)',
                    display: 'flex',
                    gap: '10px',
                    alignItems: 'center',
                    zIndex: 10
                }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" style={{ flexShrink: 0 }}>
                        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Company name or job title"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ border: 'none', outline: 'none', flex: 1, fontSize: '15px', height: '40px', color: '#12263A', background: 'transparent' }}
                    />
                    <button
                        style={{
                            backgroundColor: '#007BFF',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '9999px',
                            padding: '0 24px',
                            height: '40px',
                            fontWeight: 700,
                            fontSize: '14px',
                            cursor: 'pointer',
                            flexShrink: 0,
                            transition: 'background 0.15s'
                        }}
                        onMouseOver={e => (e.currentTarget.style.background = '#006AE6')}
                        onMouseOut={e => (e.currentTarget.style.background = '#007BFF')}
                    >
                        Find Companies
                    </button>
                </div>
            </div>

            {/* ─── Content Area ─── */}
            <div style={{ maxWidth: '960px', margin: '4.5rem auto 3rem', padding: '0 2rem' }}>

                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#12263A', marginBottom: '1.25rem' }}>
                    Popular companies
                </h2>

                {/* 3-column grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
                    {isLoadingCompanies ? (
                        <>
                            <style>{`
                                @keyframes sk-pulse {
                                    0%, 100% { opacity: 0.6; }
                                    50% { opacity: 1; }
                                }
                                .sk-pulse {
                                    animation: sk-pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                                    background-color: #e2e8f0;
                                }
                            `}</style>
                            {[1, 2, 3].map(i => (
                                <div
                                    key={i}
                                    style={{
                                        background: '#ffffff',
                                        border: '1px solid #e2e5ea',
                                        borderRadius: '10px',
                                        padding: '1.25rem',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.75rem'
                                    }}
                                >
                                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                        <div className="sk-pulse" style={{ width: 46, height: 46, borderRadius: '10px' }} />
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                                            <div className="sk-pulse" style={{ width: '60%', height: 16, borderRadius: 4 }} />
                                            <div className="sk-pulse" style={{ width: '40%', height: 12, borderRadius: 4 }} />
                                        </div>
                                    </div>
                                    <div className="sk-pulse" style={{ width: '100px', height: 14, borderRadius: 4 }} />
                                    <div style={{ display: 'flex', gap: '10px', borderTop: '1px solid #e2e5ea', paddingTop: '0.75rem', marginTop: '4px' }}>
                                        <div className="sk-pulse" style={{ width: 50, height: 12, borderRadius: 3 }} />
                                        <div className="sk-pulse" style={{ width: 60, height: 12, borderRadius: 3 }} />
                                    </div>
                                </div>
                            ))}
                        </>
                    ) : filtered.length === 0 ? (
                        <div style={{ gridColumn: '1/-1', padding: '3rem', textAlign: 'center', color: '#6B7280', fontSize: '15px' }}>
                            {search ? `No companies found for "${search}"` : 'No registered companies found on the portal yet.'}
                        </div>
                    ) : (
                        <>
                            <style>{`
                                @keyframes fadeIn {
                                    from { opacity: 0; transform: translateY(6px); }
                                    to { opacity: 1; transform: translateY(0); }
                                }
                            `}</style>
                            {filtered.map(company => (
                                <div
                                    key={company.name}
                                    onClick={() => router.push(`/company/${company.id}`)}
                                    style={{
                                        background: '#ffffff',
                                        border: '1px solid #e2e5ea',
                                        borderRadius: '10px',
                                        padding: '1.25rem',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.75rem',
                                        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                                        transition: 'box-shadow 0.15s',
                                        cursor: 'pointer',
                                        animation: 'fadeIn 0.3s ease-out'
                                    }}
                                onMouseOver={e => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)')}
                                onMouseOut={e => (e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)')}
                            >
                                {/* Logo + name row */}
                                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                    <div style={{
                                        width: 46,
                                        height: 46,
                                        borderRadius: '10px',
                                        background: company.logoBg,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: (typeof company.logo === 'string' && company.logo.includes('/')) ? 'inherit' : (company.logo.length > 1 ? '0.75rem' : '1.25rem'),
                                        fontWeight: 800,
                                        color: company.logoColor,
                                        flexShrink: 0,
                                        border: '1px solid rgba(0,0,0,0.06)',
                                        overflow: 'hidden'
                                    }}>
                                        {(typeof company.logo === 'string' && company.logo.includes('/')) ? (
                                            <img src={company.logo} alt={company.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            company.logo
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#12263A' }}>{company.name}</h3>
                                        <span style={{ fontSize: '12px', color: '#6B7280', marginTop: '1px' }}>{company.industry}</span>
                                    </div>
                                </div>

                                {/* Stars + review count */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <StarRating rating={company.rating} />
                                    <span style={{ fontSize: '13px', color: '#007BFF', fontWeight: 500 }}>
                                        {company.reviews.toLocaleString()} reviews
                                    </span>
                                </div>

                                {/* Link row */}
                                <div style={{
                                    display: 'flex',
                                    gap: '10px',
                                    fontSize: '13px',
                                    color: '#475569',
                                    borderTop: '1px solid #e2e5ea',
                                    paddingTop: '0.75rem',
                                }}>
                                    <Link href={`/company/${company.id}#salaries`} onClick={e => e.stopPropagation()} style={{ color: '#475569', textDecoration: 'none' }}>Salaries</Link>
                                    <span style={{ color: '#e2e5ea' }}>|</span>
                                    <span onClick={e => { e.stopPropagation(); router.push(`/company/${company.id}#questions`); }} style={{ cursor: 'pointer' }}>Questions</span>
                                    <span style={{ color: '#e2e5ea' }}>|</span>
                                    <Link href={`/company/${company.id}#jobs`} onClick={e => e.stopPropagation()} style={{ color: '#007BFF', textDecoration: 'none', fontWeight: 600 }}>Open jobs</Link>
                                </div>
                                </div>
                            ))}</>
                    )}
                </div>
            </div>

            {/* ─── Write a Review Modal ─── */}
            {isModalOpen && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '1rem'
                }}>
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
                        position: 'relative'
                    }}>
                        {/* Close button */}
                        <button 
                            onClick={() => {
                                setIsModalOpen(false);
                                setReviewCompany('');
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

                        {/* Company select */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Select Company *</label>
                            <CustomSelect 
                                value={reviewCompany}
                                onChange={(e: any) => setReviewCompany(e.target.value)}
                                options={companiesList.map((c: any) => ({
                                    label: (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
                                            <div style={{
                                                width: '28px',
                                                height: '28px',
                                                borderRadius: '6px',
                                                backgroundColor: c.logoBg || '#EFF6FF',
                                                color: c.logoColor || '#007BFF',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '11px',
                                                fontWeight: 800,
                                                flexShrink: 0,
                                                border: '1px solid #cbd5e1',
                                                overflow: 'hidden'
                                            }}>
                                                {c.logo && typeof c.logo === 'string' && c.logo.includes('/') ? (
                                                    <img src={c.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    c.logo
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', lineHeight: 1.2 }}>
                                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{c.name}</span>
                                                <span style={{ fontSize: '10.5px', color: '#64748b' }}>{c.industry} • {c.employees}</span>
                                            </div>
                                        </div>
                                    ),
                                    value: c.name
                                }))}
                                placeholder="-- Choose a company --"
                                required
                                className="review-select-trigger"
                            />
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

                        {/* Description */}
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
                                    setIsModalOpen(false);
                                    setReviewCompany('');
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
                                onClick={async () => {
                                    if (!reviewCompany) {
                                        toast.error('Please select a company.');
                                        return;
                                    }
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
                                    
                                    setIsSubmitting(true);
                                    const reviewData = {
                                        company_name: reviewCompany,
                                        rating: reviewRating,
                                        title: reviewTitle,
                                        review_text: reviewText,
                                        candidate_id: roleId,
                                        candidate_name: authUser?.name || 'Anonymous Candidate',
                                        candidate_avatar: authUser?.avatar_url || ''
                                    };

                                    try {
                                        // 1. Try storing in live database
                                        const { error: dbError } = await insforge.database
                                            .from('company_reviews')
                                            .insert([reviewData]);

                                        if (dbError) throw dbError;
                                        toast.success('Review stored in live database successfully!');
                                    } catch (err: any) {
                                        console.warn('DB write failed, falling back to localStorage:', err?.message || err);

                                        // 2. Local storage fallback
                                        const newReview = {
                                            companyName: reviewCompany,
                                            rating: reviewRating,
                                            title: reviewTitle,
                                            text: reviewText,
                                            candidateId: roleId,
                                            candidateName: authUser?.name || 'Anonymous Candidate',
                                            candidateAvatar: authUser?.avatar_url || '',
                                            date: new Date().toISOString()
                                        };
                                        const stored = localStorage.getItem('talentmesh_reviews');
                                        const list = stored ? JSON.parse(stored) : [];
                                        list.push(newReview);
                                        localStorage.setItem('talentmesh_reviews', JSON.stringify(list));
                                        
                                        toast.success('Review submitted successfully (saved in local fallback).');
                                    }

                                    // Update UI stats in real-time
                                    setCompaniesList(prev => prev.map(c => {
                                        if (c.name === reviewCompany) {
                                            const totalRating = c.rating * c.reviews + reviewRating;
                                            const totalReviews = c.reviews + 1;
                                            return {
                                                ...c,
                                                rating: parseFloat((totalRating / totalReviews).toFixed(1)),
                                                reviews: totalReviews
                                            };
                                        }
                                        return c;
                                    }));

                                    setIsSubmitting(false);
                                    setIsModalOpen(false);
                                    setReviewCompany('');
                                    setReviewRating(0);
                                    setReviewTitle('');
                                    setReviewText('');
                                }}
                                disabled={isSubmitting}
                                style={{
                                    padding: '0.625rem 1.25rem',
                                    borderRadius: '8px',
                                    border: 'none',
                                    backgroundColor: '#007BFF',
                                    color: '#ffffff',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                    opacity: isSubmitting ? 0.7 : 1
                                }}
                            >
                                {isSubmitting ? 'Submitting...' : 'Submit Review'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function CompanyReviewsPage() {
    return (
        <Suspense fallback={
            <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', fontFamily: 'Inter, system-ui, sans-serif' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ border: '3px solid #e2e8f0', borderTop: '3px solid #007BFF', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
                    <span style={{ fontSize: '15px', color: '#64748b', fontWeight: 500 }}>Loading reviews...</span>
                    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                </div>
            </div>
        }>
            <CompanyReviewsPageContent />
        </Suspense>
    );
}
