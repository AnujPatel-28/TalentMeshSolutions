"use client";
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Toast from '@/components/ui/Toast';
import { invokeFunction, insforge } from '@/lib/insforge';
import { useAuth } from '@/lib/auth/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { getPublicStorageUrl } from '@/lib/utils/storage-url';
import ApplyModal from '@/components/candidate/ApplyModal';
import { CandidateDashboardSkeleton } from '@/components/ui/DashboardSkeleton';
import { getCandidateAccessState } from '@/lib/auth/candidate-access';
import { useSavedJobs } from '@/hooks/useSavedJobs';
import SearchFilterDrawer, { EMPTY_JOB_FILTERS, type JobFilters } from '@/components/candidate/SearchFilterDrawer';
import AlertModal from '@/components/candidate/AlertModal';

import { motion, AnimatePresence } from 'framer-motion';

/* ─── Icons ─── */
const IC = {
    search: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
    ),
    mapPin: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
        </svg>
    ),
    dollar: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
    ),
    briefcase: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
    ),
    check: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    ),
    bookmark: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
        </svg>
    ),
    filter: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 3H2l8 9v7l4 2v-9L22 3z" />
        </svg>
    ),
    bookmarkFilled: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
        </svg>
    ),
    share: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
    ),
    star: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5" style={{ color: '#f59e0b' }}>
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
    ),
    user: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    ),
    pencil: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
    ),
};

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

const POPULAR_CITIES = [
    'Bangalore, KA',
    'Mumbai, MH',
    'Delhi, NCR',
    'Hyderabad, TS',
    'Pune, MH',
    'Chennai, TN',
    'Remote'
];

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: '#EFF6FF', color: '#007BFF', border: '1px solid #BFDBFE',
            borderRadius: '9999px', padding: '5px 8px 5px 12px', fontSize: '12.5px', fontWeight: 600
        }}>
            {label}
            <button
                onClick={onRemove}
                aria-label={`Remove ${label} filter`}
                style={{ background: 'none', border: 'none', color: '#007BFF', cursor: 'pointer', display: 'flex', padding: '2px' }}
            >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
        </span>
    );
}

export default function CandidateDashboardHome({ params }: { params: Promise<{ role_id: string }> }) {
    const { role_id } = React.use(params);
    return (
        <React.Suspense fallback={<CandidateDashboardSkeleton />}>
            <CandidateDashboardInner role_id={role_id} />
        </React.Suspense>
    );
}

function CandidateDashboardInner({ role_id }: { role_id: string }) {
    const router = useRouter();
    const { user: authUser, isLoading: authLoading, refreshUser, updateUser } = useAuth();
    const [onboardingVerified, setOnboardingVerified] = useState(false);
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !authUser) return;

        // Size validation (Max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setToast({ message: 'File is too large. Max size is 5MB.', type: 'error' });
            return;
        }

        // Type validation
        const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            setToast({ message: 'Unsupported file type. Please upload a JPEG, PNG, or WebP image.', type: 'error' });
            return;
        }

        setIsUploadingAvatar(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${authUser.id}_${Date.now()}.${fileExt}`;

            const { error: uploadError } = await insforge.storage
                .from('avatars')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { error: dbErr } = await insforge.database
                .from('profiles')
                .update({ avatar_url: fileName })
                .eq('id', authUser.id);

            if (dbErr) throw dbErr;

            updateUser({
                ...authUser,
                avatar_url: fileName
            });

            setToast({ message: 'Avatar updated successfully!', type: 'success' });
        } catch (err: any) {
            console.error('Avatar upload failed:', err);
            setToast({ message: 'Avatar upload failed: ' + (err.message || err), type: 'error' });
        } finally {
            setIsUploadingAvatar(false);
            if (e.target) e.target.value = '';
        }
    };

    const handleShareJobClick = async () => {
        if (!selectedJob) return;
        const jobId = selectedJob.id;
        const jobTitle = selectedJob.title;
        const companyName = selectedJob.company_profiles?.company_name || selectedJob.company_profiles?.name || 'TalentMesh Company';
        
        const url = `${window.location.origin}/browse-jobs/${jobId}`;
        const shareData = {
            title: jobTitle,
            text: `Check out this job opportunity: ${jobTitle} at ${companyName}`,
            url: url
        };

        if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
            try {
                await navigator.share(shareData);
                setToast({ message: 'Shared successfully!', type: 'success' });
                return;
            } catch (err: any) {
                if (err.name !== 'AbortError') {
                    console.warn('Native share failed:', err);
                } else {
                    return; // User canceled
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
    };

    const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

    useEffect(() => {
        if (authLoading) return;
        if (!authUser) {
            router.replace('/login');
            return;
        }

        const userId = authUser.id;
        if (!role_id || role_id === ':role_id' || role_id === 'undefined') return;

        if ((!isUUID(role_id) || role_id !== userId) && isUUID(userId)) {
            router.replace(`/dashboard/candidate/${userId}`);
            return;
        }

        if (!isUUID(role_id)) return;

        async function verifyOnboarding() {
            const accessState = await getCandidateAccessState(userId);
            // An unauthenticated read tells us nothing about onboarding — bouncing an
            // onboarded candidate to /onboarding on a token failure is the bug in
            // 10_Auth_Token_Propagation_And_Subdomain_Fix.md §1. Let the session recover
            // (invokeFunction refresh / AuthContext) instead of redirecting.
            if (accessState.unauthenticated) return;
            if (!accessState.completedOnboarding) {
                router.replace('/onboarding/candidate');
                return;
            }
            setOnboardingVerified(true);
        }

        verifyOnboarding();
    }, [authLoading, authUser, role_id, router]);

    const [jobs, setJobs] = useState<any[]>([]);
    const [selectedJob, setSelectedJob] = useState<any | null>(null);
    const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
    const { isSaved: isJobSaved, toggleSave: toggleSavedJob, count: savedJobsCount, toast: savedJobsToast, clearToast: clearSavedJobsToast } = useSavedJobs(authUser?.id || null);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
    const [candidateProfile, setCandidateProfile] = useState<any | null>(null);

    const [activeTab, setActiveTab] = useState<'browse' | 'saved'>('browse');
    const [savedJobsList, setSavedJobsList] = useState<any[]>([]);
    const [loadingSaved, setLoadingSaved] = useState(false);

    const [search, setSearch] = useState('');
    const [location, setLocation] = useState('');
    const [searchFocused, setSearchFocused] = useState(false);
    const [locationFocused, setLocationFocused] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [isLocating, setIsLocating] = useState(false);
    const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
    const [isSearchOverlayOpen, setIsSearchOverlayOpen] = useState(false);
    const [overlayWhatFocused, setOverlayWhatFocused] = useState(false);
    const [overlayWhereFocused, setOverlayWhereFocused] = useState(false);

    const [filters, setFilters] = useState<JobFilters>(EMPTY_JOB_FILTERS);
    const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
    const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
    const activeFilterCount = Object.values(filters).filter(Boolean).length;

    const locationInputRef = useRef<HTMLInputElement>(null);
    const locationDropdownRef = useRef<HTMLDivElement>(null);
    const isMounted = useRef(false);

    useEffect(() => {
        const mql = window.matchMedia('(max-width: 1023px)');
        setIsMobile(mql.matches);
        const listener = (e: MediaQueryListEvent) => setIsMobile(e.matches);
        mql.addEventListener('change', listener);
        return () => mql.removeEventListener('change', listener);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (locationDropdownRef.current && !locationDropdownRef.current.contains(event.target as Node)) {
                setShowLocationSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const triggerHapticFeedback = (pattern: number | number[] = 15) => {
        if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate(pattern);
        }
    };

    const handleLocateMe = async (e: React.MouseEvent) => {
        e.stopPropagation();
        triggerHapticFeedback(10);
        if ('geolocation' in navigator) {
            setIsLocating(true);
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    try {
                        const { latitude, longitude } = position.coords;
                        const response = await fetch(
                            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
                        );
                        const data = await response.json();
                        if (data && (data.city || data.locality)) {
                            const city = data.city || data.locality;
                            const region = data.principalSubdivisionCode || '';
                            const formatted = region ? `${city}, ${region}` : city;
                            setLocation(formatted);
                        }
                    } catch (err) {
                        console.error('Error fetching location:', err);
                        setToast({ message: 'Failed to retrieve location details.', type: 'error' });
                    } finally {
                        setIsLocating(false);
                    }
                },
                (error) => {
                    console.log('Geolocation permission denied/failed:', error);
                    setToast({ message: 'Location permission denied or unavailable.', type: 'info' });
                    setIsLocating(false);
                }
            );
        } else {
            setToast({ message: 'Geolocation is not supported by your browser.', type: 'error' });
        }
    };

    const fetchSavedJobsList = async () => {
        if (!authUser) return;
        setLoadingSaved(true);
        try {
            const { data, error } = await insforge.database
                .from('saved_jobs')
                .select(`
                    job_id,
                    jobs (
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
                .eq('candidate_id', authUser.id);

            if (error) throw error;

            const normalized = (data || [])
                .map((row: any) => {
                    const job = row.jobs;
                    if (!job) return null;
                    return {
                        ...job,
                        company_profiles: job.companies || {},
                        salary: job.salary_min 
                            ? `${job.currency || '$'}${job.salary_min.toLocaleString()} - ${job.currency || '$'}${job.salary_max.toLocaleString()}`
                            : 'Salary not disclosed',
                        posted_days: job.created_at 
                            ? Math.max(0, Math.floor((Date.now() - new Date(job.created_at).getTime()) / (1000 * 60 * 60 * 24)))
                            : 0
                    };
                })
                .filter(Boolean);

            setSavedJobsList(normalized);
            if (normalized.length > 0) {
                setSelectedJob(isMobile ? null : normalized[0]);
            } else {
                setSelectedJob(null);
            }
        } catch (err: any) {
            console.error('Failed to fetch saved jobs list:', err);
        } finally {
            setLoadingSaved(false);
        }
    };

    const handleTabChange = (tab: 'browse' | 'saved') => {
        triggerHapticFeedback(8);
        setActiveTab(tab);
        const newUrl = `${window.location.pathname}?tab=${tab}`;
        window.history.pushState(null, '', newUrl);
        if (tab === 'saved') {
            fetchSavedJobsList();
        }
    };

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const querySearch = params.get('search');
            if (querySearch) {
                setSearch(querySearch);
            }
        }
    }, []);

    useEffect(() => {
        if (typeof window !== 'undefined' && onboardingVerified && authUser) {
            const params = new URLSearchParams(window.location.search);
            const tabParam = params.get('tab');
            if (tabParam === 'saved') {
                setActiveTab('saved');
                fetchSavedJobsList();
            }
        }
    }, [authUser, onboardingVerified]);

    /* ─── Fetch candidate profile ─── */
    const fetchCandidateProfile = async () => {
        if (!authUser) return;
        try {
            const { data } = await insforge.database
                .from('candidate_profiles')
                .select('*')
                .eq('id', authUser.id)
                .single();
            if (data) setCandidateProfile(data);
        } catch (err: any) {
            console.warn('Could not fetch candidate profile:', err?.message);
        }
    };

    /* ─── Fetch user applications ─── */
    const fetchAppliedIds = async () => {
        if (!authUser) return;
        try {
            const res = await invokeFunction('candidate-applications', { method: 'GET' });
            if (res.data?.applications) {
                const activeApps = res.data.applications.filter((a: any) => a.status !== 'withdrawn');
                setAppliedIds(new Set(activeApps.map((a: any) => a.job_id)));
            }
        } catch (err: any) {
            console.warn('Could not fetch applied IDs:', err?.message);
        }
    };

    const fetchJobsList = async (pageNum: number, isNewSearch: boolean = false) => {
        if (!onboardingVerified) return;
        if (pageNum === 0) setLoading(true);
        else setLoadingMore(true);
        setError(null);

        try {
            const res = await invokeFunction('jobs', {
                method: 'GET',
                queries: {
                    search: search || undefined,
                    location: location || undefined,
                    type: filters.type || undefined,
                    category: filters.category || undefined,
                    salary_min: filters.salary_min || undefined,
                    salary_max: filters.salary_max || undefined,
                    date_posted: filters.date_posted || undefined,
                    page: pageNum.toString()
                }
            });

            const results = res.data?.data || res.data?.jobs || (Array.isArray(res.data) ? res.data : []);

            if (isNewSearch) {
                setJobs(results);
                if (results.length > 0) {
                    setSelectedJob(isMobile ? null : results[0]);
                } else {
                    setSelectedJob(null);
                }
            } else {
                setJobs(prev => [...prev, ...results]);
                if (!selectedJob && results.length > 0 && !isMobile) {
                    setSelectedJob(results[0]);
                }
            }

            setHasMore(results.length === 20);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        if (onboardingVerified && authUser) {
            fetchAppliedIds();
            fetchCandidateProfile();
        }
    }, [authUser, onboardingVerified]);

    useEffect(() => {
        if (savedJobsToast) {
            setToast({ message: savedJobsToast.message, type: savedJobsToast.type });
            clearSavedJobsToast();
        }
    }, [savedJobsToast]);

    useEffect(() => {
        if (!onboardingVerified) return;

        if (!isMounted.current) {
            isMounted.current = true;
            fetchJobsList(0, true);
            return;
        }

        const timer = setTimeout(() => {
            setPage(0);
            fetchJobsList(0, true);
        }, 500);
        return () => clearTimeout(timer);
    }, [search, location, filters, onboardingVerified]);

    const handleApplyFilters = (newFilters: JobFilters) => {
        setFilters(newFilters);
    };

    const handleClearFilter = (key: keyof JobFilters) => {
        setFilters(prev => ({ ...prev, [key]: '' }));
    };

    const handleSaveAlert = async (formData: any) => {
        if (!authUser) return;
        try {
            const { error } = await insforge.database
                .from('job_alerts')
                .insert([{
                    ...formData,
                    candidate_id: authUser.id,
                    label: formData.label || `${formData.keywords || 'Jobs'} in ${formData.location || 'Anywhere'}`
                }]);

            if (error) throw error;
            setIsAlertModalOpen(false);
            setToast({ message: 'Job alert saved successfully!', type: 'success' });
        } catch (err) {
            console.error(err);
            setToast({ message: 'Failed to save alert', type: 'error' });
        }
    };

    const handleLoadMore = () => {
        const next = page + 1;
        setPage(next);
        fetchJobsList(next, false);
    };

    const handleToggleSave = async (jobId: string, e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (!authUser) return router.push('/login');
        const wasSaved = isJobSaved(jobId);
        await toggleSavedJob(jobId);

        if (wasSaved) {
            // Optimistic removal from saved jobs list
            setSavedJobsList(currentList => {
                const updated = currentList.filter(j => j.id !== jobId);
                if (selectedJob?.id === jobId) {
                    setSelectedJob(updated.length > 0 ? (isMobile ? null : updated[0]) : null);
                }
                return updated;
            });
        } else if (activeTab === 'saved') {
            // If on saved jobs tab, trigger list reload
            fetchSavedJobsList();
        }
    };

    const showInitialLoading = authLoading || !onboardingVerified;

    if (showInitialLoading) {
        return <CandidateDashboardSkeleton />;
    }

    const userName = authUser?.name ? authUser.name.split(' ')[0] : 'User';
    const userInitials = authUser?.name
        ? authUser.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
        : 'U';

    /* ─── Profile strength calculation ─── */
    const profileFields = [
        candidateProfile?.headline,
        candidateProfile?.location,
        candidateProfile?.bio,
        authUser?.avatar_url,
        candidateProfile?.skills?.length > 0,
        candidateProfile?.experience_years != null,
    ];
    const filledCount = profileFields.filter(Boolean).length;
    const profileStrength = Math.round((filledCount / profileFields.length) * 100);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: 'calc(100vh - 64px)', overflow: 'hidden', backgroundColor: '#f8fafc', fontFamily: 'Inter, system-ui, sans-serif' }}>
            <style>{`
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                button:focus-visible, a:focus-visible, div[tabindex="0"]:focus-visible {
                    outline: 2px solid #007BFF !important;
                    outline-offset: 2px !important;
                }

                @media (max-width: 1023px) {
                    .sidebar-column {
                        display: none !important;
                    }
                    .list-column {
                        width: 100% !important;
                        flex: 1 !important;
                    }
                    .details-column {
                        position: fixed !important;
                        bottom: 0 !important;
                        left: 0 !important;
                        right: 0 !important;
                        height: 80vh !important;
                        background: #ffffff !important;
                        z-index: 100 !important;
                        border-radius: 28px 28px 0 0 !important;
                        box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.15) !important;
                        padding: 1.5rem !important;
                    }
                    .mobile-drag-handle {
                        display: flex !important;
                    }
                    .mobile-close-btn {
                        display: flex !important;
                    }
                    .search-bar-wrapper {
                        padding: 0.75rem 1rem !important;
                    }
                }

                .search-bar-wrapper {
                    border-bottom: 1px solid #e2e5ea;
                    padding: 0.75rem 2rem;
                    background-color: #ffffff;
                    flex-shrink: 0;
                    transition: padding 0.15s ease;
                }

                @media (min-width: 1024px) {
                    .search-bar-wrapper {
                        padding-left: 280px !important;
                    }
                    .dashboard-search-container {
                        max-width: 800px !important;
                        margin: 0 !important;
                    }
                }

                @media (max-width: 767px) {
                    .dashboard-search-container {
                        flex-direction: column !important;
                        border-radius: 16px !important;
                        padding: 8px !important;
                        gap: 8px !important;
                    }
                    .search-divider {
                        display: none !important;
                    }
                    .dashboard-search-container > div {
                        width: 100% !important;
                        padding: 8px 8px !important;
                        border-bottom: 1px solid #f1f5f9;
                    }
                    .dashboard-search-container > div:last-of-type {
                        border-bottom: none !important;
                    }
                    .dashboard-search-container button {
                        width: 100% !important;
                        margin: 0 !important;
                        border-radius: 10px !important;
                        height: 44px !important;
                    }
                }
                @keyframes tm-spin-kf {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .tm-spin {
                    animation: tm-spin-kf 1s linear infinite;
                }
            `}</style>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* ─── Mobile Search Drawer Overlay ─── */}
            <AnimatePresence>
                {isMobile && isSearchOverlayOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(18, 38, 58, 0.4)',
                            backdropFilter: 'blur(4px)',
                            zIndex: 100000,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'flex-end',
                        }}
                        onClick={() => setIsSearchOverlayOpen(false)}
                    >
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
                            style={{
                                width: '100%',
                                background: '#ffffff',
                                borderTopLeftRadius: '24px',
                                borderTopRightRadius: '24px',
                                padding: '20px 20px 36px 20px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '16px',
                                boxShadow: '0 -8px 32px rgba(0,0,0,0.12)',
                                maxHeight: '90vh',
                                overflowY: 'auto'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Drawer Header */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px' }}>
                                <button 
                                    onClick={() => setIsSearchOverlayOpen(false)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#12263A', padding: '4px' }}
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                </button>
                                <span style={{ fontSize: '16px', fontWeight: 600, color: '#12263A' }}>Search Jobs</span>
                                <div style={{ width: '28px' }} />
                            </div>

                            {/* What Search Input */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>What (Keywords, Job Title)</label>
                                <div style={{ 
                                    position: 'relative', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    background: '#F8FAFC', 
                                    borderRadius: '12px', 
                                    border: overlayWhatFocused ? '1.5px solid #007BFF' : '1px solid #E2E5EA', 
                                    boxShadow: overlayWhatFocused ? '0 0 0 3px rgba(0, 123, 255, 0.12)' : 'none',
                                    padding: '0 12px', 
                                    height: '48px',
                                    transition: 'all 0.15s ease'
                                }}>
                                    <span style={{ color: overlayWhatFocused ? '#007BFF' : '#9CA3AF', marginRight: '8px', display: 'flex', alignItems: 'center', transition: 'color 0.15s' }}>{IC.search}</span>
                                    <input 
                                        type="text"
                                        placeholder="Job title, keywords, or company..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        onFocus={() => setOverlayWhatFocused(true)}
                                        onBlur={() => setOverlayWhatFocused(false)}
                                        style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', fontSize: '14px', color: '#12263A' }}
                                    />
                                    {search && (
                                        <button 
                                            onClick={() => setSearch('')}
                                            style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: '#9CA3AF', display: 'flex', alignItems: 'center' }}
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Where Search Input */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', position: 'relative' }}>
                                <label style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Where (City, Remote)</label>
                                <div style={{ 
                                    position: 'relative', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    background: '#F8FAFC', 
                                    borderRadius: '12px', 
                                    border: overlayWhereFocused ? '1.5px solid #007BFF' : '1px solid #E2E5EA', 
                                    boxShadow: overlayWhereFocused ? '0 0 0 3px rgba(0, 123, 255, 0.12)' : 'none',
                                    padding: '0 12px', 
                                    height: '48px', 
                                    paddingRight: '40px',
                                    transition: 'all 0.15s ease'
                                }}>
                                    <span style={{ color: overlayWhereFocused ? '#007BFF' : '#9CA3AF', marginRight: '8px', display: 'flex', alignItems: 'center', transition: 'color 0.15s' }}>{IC.mapPin}</span>
                                    <input 
                                        type="text"
                                        placeholder="City, state, or remote..."
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        onFocus={() => setOverlayWhereFocused(true)}
                                        onBlur={() => setOverlayWhereFocused(false)}
                                        style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', fontSize: '14px', color: '#12263A' }}
                                    />
                                    {location && (
                                        <button 
                                            onClick={() => setLocation('')}
                                            style={{ position: 'absolute', right: '32px', background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: '#9CA3AF', display: 'flex', alignItems: 'center' }}
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={handleLocateMe}
                                        disabled={isLocating}
                                        style={{
                                            position: 'absolute',
                                            right: '8px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: 'none',
                                            border: 'none',
                                            cursor: isLocating ? 'default' : 'pointer',
                                            color: isLocating ? '#007BFF' : '#6B7280',
                                            padding: '4px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        {isLocating ? (
                                            <svg className="tm-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeDasharray="32" /></svg>
                                        ) : (
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Popular Suggestions Chips */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Popular Cities</span>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {POPULAR_CITIES.map((city) => (
                                        <motion.button
                                            key={city}
                                            onClick={() => {
                                                setLocation(city);
                                                triggerHapticFeedback(8);
                                            }}
                                            whileHover={{ scale: 1.03 }}
                                            whileTap={{ scale: 0.97 }}
                                            style={{
                                                padding: '6px 12px',
                                                borderRadius: '9999px',
                                                background: location === city ? '#EFF6FF' : '#F1F5F9',
                                                border: location === city ? '1px solid #3B82F6' : '1px solid transparent',
                                                color: location === city ? '#2563EB' : '#4B5563',
                                                fontSize: '13px',
                                                fontWeight: 500,
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            {city}
                                        </motion.button>
                                    ))}
                                </div>
                            </div>

                            {/* Drawer CTA Action button */}
                            <motion.button
                                onClick={() => {
                                    fetchJobsList(0, true);
                                    setIsSearchOverlayOpen(false);
                                    triggerHapticFeedback(12);
                                }}
                                whileHover={{ background: '#0069D9' }}
                                whileTap={{ scale: 0.98 }}
                                style={{
                                    marginTop: '12px',
                                    height: '48px',
                                    background: '#007BFF',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '12px',
                                    fontWeight: 600,
                                    fontSize: '15px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 4px 12px rgba(0, 123, 255, 0.25)',
                                    transition: 'background 0.15s'
                                }}
                            >
                                Search Jobs
                            </motion.button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── Top Search Bar ─── */}
            <div className="search-bar-wrapper">
                {isMobile ? (
                    /* Mobile Trigger Pill */
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                        <div
                            onClick={() => setIsSearchOverlayOpen(true)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '10px 16px',
                                background: '#ffffff',
                                border: '1px solid #E2E5EA',
                                borderRadius: '9999px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                                cursor: 'pointer',
                                height: '46px',
                                flex: 1,
                                minWidth: 0,
                                transition: 'all 0.2s ease',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden', flex: 1 }}>
                                <span style={{ color: '#007BFF', display: 'flex', alignItems: 'center' }}>{IC.search}</span>
                                <span style={{ fontSize: '14px', color: (search || location) ? '#12263A' : '#9CA3AF', fontWeight: (search || location) ? 500 : 400, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                    {search && location ? `${search} • ${location}` : (search || location || "Search jobs, skills, or location...")}
                                </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6B7280' }}>
                                <span style={{ display: 'flex', alignItems: 'center' }}>{IC.mapPin}</span>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsFilterDrawerOpen(true)}
                            aria-label="Filters"
                            style={{
                                position: 'relative', flexShrink: 0, width: '46px', height: '46px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: activeFilterCount > 0 ? '#EFF6FF' : '#ffffff',
                                color: activeFilterCount > 0 ? '#007BFF' : '#475569',
                                border: `1px solid ${activeFilterCount > 0 ? '#BFDBFE' : '#E2E5EA'}`,
                                borderRadius: '9999px', cursor: 'pointer'
                            }}
                        >
                            {IC.filter}
                            {activeFilterCount > 0 && (
                                <span style={{ position: 'absolute', top: '4px', right: '4px', width: '8px', height: '8px', borderRadius: '50%', background: '#007BFF' }} />
                            )}
                        </button>
                    </div>
                ) : (
                    /* Desktop Layout (original, unmodified) */
                    <div className="dashboard-search-container" style={{ 
                        display: 'flex', 
                        gap: '0', 
                        width: '100%', 
                        background: '#ffffff', 
                        border: (searchFocused || locationFocused) ? '1px solid #007BFF' : '1px solid #CBD2DB', 
                        borderRadius: '9999px', 
                        boxShadow: (searchFocused || locationFocused) ? '0 4px 16px rgba(0, 123, 255, 0.12)' : '0 2px 8px rgba(0,0,0,0.06)', 
                        alignItems: 'center', 
                        overflow: 'hidden',
                        transition: 'all 0.2s ease'
                    }}>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '6px 1.25rem', justifyContent: 'center', position: 'relative', background: (searchFocused && isMobile) ? '#F4F8FD' : 'transparent', transition: 'background 0.2s', height: '52px' }}>
                            <span style={{ 
                                position: 'absolute',
                                top: '4px',
                                left: '2.8rem',
                                fontSize: '10px', 
                                color: (searchFocused || search) ? '#007BFF' : '#6B7280', 
                                fontWeight: 600, 
                                transition: 'all 0.15s ease', 
                                opacity: (searchFocused || search) ? 1 : 0, 
                                transform: (searchFocused || search) ? 'translateY(0)' : 'translateY(4px)', 
                                pointerEvents: 'none' 
                            }}>
                                What (Job title, keywords)
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: (searchFocused || search) ? '8px' : '0', transition: 'margin 0.15s ease' }}>
                                <span style={{ color: searchFocused ? '#007BFF' : '#6B7280', flexShrink: 0, transition: 'color 0.15s' }}>{IC.search}</span>
                                <input
                                    type="text"
                                    placeholder={(searchFocused || search) ? "" : isMobile ? "Search jobs or skills..." : "Job title, keywords, or company"}
                                    value={search}
                                    onFocus={() => setSearchFocused(true)}
                                    onBlur={() => setSearchFocused(false)}
                                    onChange={(e) => setSearch(e.target.value)}
                                    style={{ border: 'none', outline: 'none', width: '100%', fontSize: '15px', height: '32px', color: '#12263A', background: 'transparent' }}
                                  />
                            </div>
                        </div>
                        <div className="search-divider" style={{ width: '1px', background: '#E2E5EA', height: '28px', flexShrink: 0 }} />
                        <div 
                            onClick={() => locationInputRef.current?.focus()}
                            style={{ 
                                flex: 1, 
                                display: 'flex', 
                                flexDirection: 'column', 
                                padding: isMobile ? '8px 12px' : '6px 1.25rem', 
                                justifyContent: 'center', 
                                position: 'relative', 
                                background: (locationFocused && isMobile) ? '#F4F8FD' : 'transparent', 
                                transition: 'background 0.2s', 
                                height: '52px',
                                cursor: 'text'
                            }}
                        >
                            <span style={{ 
                                position: 'absolute',
                                top: '4px',
                                left: isMobile ? '2rem' : '2.8rem',
                                fontSize: '10px', 
                                color: (locationFocused || location) ? '#007BFF' : '#6B7280', 
                                fontWeight: 600, 
                                transition: 'all 0.15s ease', 
                                opacity: (locationFocused || location) ? 1 : 0, 
                                transform: (locationFocused || location) ? 'translateY(0)' : 'translateY(4px)', 
                                pointerEvents: 'none' 
                            }}>
                                Where (City, remote)
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: (locationFocused || location) ? '8px' : '0', transition: 'margin 0.15s ease', position: 'relative', width: '100%' }}>
                                <span style={{ color: locationFocused ? '#007BFF' : '#6B7280', flexShrink: 0, transition: 'color 0.15s' }}>{IC.mapPin}</span>
                                <input
                                    ref={locationInputRef}
                                    type="text"
                                    placeholder={(locationFocused || location) ? "" : isMobile ? "City, state, or remote" : 'City, state, zip code, or "remote"'}
                                    value={location}
                                    onFocus={() => {
                                        setLocationFocused(true);
                                        setShowLocationSuggestions(true);
                                    }}
                                    onBlur={() => {
                                        setTimeout(() => {
                                            setLocationFocused(false);
                                        }, 200);
                                    }}
                                    onChange={(e) => {
                                        setLocation(e.target.value);
                                        setShowLocationSuggestions(true);
                                    }}
                                    style={{ border: 'none', outline: 'none', width: '100%', fontSize: '15px', height: '32px', color: '#12263A', background: 'transparent', paddingRight: '28px' }}
                                />
                                {/* Locate Me GPS Button */}
                                <button
                                    type="button"
                                    onClick={handleLocateMe}
                                    disabled={isLocating}
                                    style={{
                                        position: 'absolute',
                                        right: '4px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        cursor: isLocating ? 'default' : 'pointer',
                                        color: isLocating ? '#007BFF' : '#9CA3AF',
                                        padding: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'color 0.2s',
                                        zIndex: 2
                                    }}
                                    title="Locate me"
                                >
                                    {isLocating ? (
                                        <svg className="tm-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="12" y1="2" x2="12" y2="6"></line>
                                            <line x1="12" y1="18" x2="12" y2="22"></line>
                                            <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                                            <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                                            <line x1="2" y1="12" x2="6" y2="12"></line>
                                            <line x1="18" y1="12" x2="22" y2="12"></line>
                                            <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                                            <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                                        </svg>
                                    ) : (
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
                                        </svg>
                                    )}
                                </button>
                            </div>
 
                            {/* Location Suggestions Dropdown */}
                            {showLocationSuggestions && (
                                <div 
                                    ref={locationDropdownRef}
                                    style={{
                                        position: 'absolute',
                                        top: '54px',
                                        left: 0,
                                        right: 0,
                                        background: '#ffffff',
                                        border: '1px solid #CBD2DB',
                                        borderRadius: '8px',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                        zIndex: 50,
                                        maxHeight: '200px',
                                        overflowY: 'auto',
                                        padding: '4px'
                                    }}
                                >
                                    {POPULAR_CITIES.filter(c => c.toLowerCase().includes(location.toLowerCase())).map((city, idx) => (
                                        <div
                                            key={idx}
                                            onMouseDown={() => {
                                                setLocation(city);
                                                setShowLocationSuggestions(false);
                                            }}
                                            style={{
                                                padding: '8px 12px',
                                                cursor: 'pointer',
                                                borderRadius: '6px',
                                                fontSize: '14px',
                                                color: '#12263A',
                                                transition: 'background 0.15s'
                                            }}
                                            onMouseOver={e => e.currentTarget.style.background = '#F4F8FD'}
                                            onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            {city}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <motion.button
                            onClick={() => fetchJobsList(0, true)}
                            whileHover={{ scale: 1.02, background: '#006AE6' }}
                            whileTap={{ scale: 0.98 }}
                            style={{ 
                                background: '#007BFF', 
                                color: '#ffffff', 
                                border: 'none', 
                                padding: '0 1.75rem', 
                                height: '44px', 
                                borderRadius: '9999px', 
                                fontWeight: 600, 
                                fontSize: '15px', 
                                cursor: 'pointer', 
                                margin: '4px', 
                                flexShrink: 0, 
                                transition: 'background 0.15s, transform 0.1s' 
                            }}
                        >
                            Find Jobs
                        </motion.button>
                        <button
                            onClick={() => setIsFilterDrawerOpen(true)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                background: activeFilterCount > 0 ? '#EFF6FF' : '#ffffff',
                                color: activeFilterCount > 0 ? '#007BFF' : '#475569',
                                border: `1px solid ${activeFilterCount > 0 ? '#BFDBFE' : '#E2E5EA'}`,
                                borderRadius: '9999px', height: '44px', padding: '0 1.25rem',
                                fontWeight: 600, fontSize: '14px', cursor: 'pointer', marginRight: '4px', flexShrink: 0
                            }}
                        >
                            {IC.filter} Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
                        </button>
                    </div>
                )}
            </div>

            {activeFilterCount > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: isMobile ? '10px 16px 0' : '10px 0 0' }}>
                    {filters.type && (
                        <FilterChip label={filters.type} onRemove={() => handleClearFilter('type')} />
                    )}
                    {filters.category && (
                        <FilterChip label={filters.category} onRemove={() => handleClearFilter('category')} />
                    )}
                    {(filters.salary_min || filters.salary_max) && (
                        <FilterChip
                            label={`₹${filters.salary_min || '0'} – ${filters.salary_max || 'Any'}`}
                            onRemove={() => setFilters(prev => ({ ...prev, salary_min: '', salary_max: '' }))}
                        />
                    )}
                    {filters.date_posted && (
                        <FilterChip
                            label={{ '24h': 'Last 24 hours', '7d': 'Last 7 days', '30d': 'Last 30 days' }[filters.date_posted] || filters.date_posted}
                            onRemove={() => handleClearFilter('date_posted')}
                        />
                    )}
                </div>
            )}

            <div className="dashboard-layout" style={{ display: 'flex', flex: 1, overflow: 'hidden', width: '100%' }}>

                {/* ─── Column 1: Left Profile Sidebar (280px) ─── */}
                <div 
                    className="sidebar-column no-scrollbar"
                    style={{ width: '280px', flexShrink: 0, borderRight: '1px solid #e2e5ea', background: '#f8fafc', padding: '1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}
                >
                    {/* Profile Summary Card (Vertical Short Card) */}
                    <div style={{ background: '#ffffff', borderRadius: '12px', boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '8px' }}>
                            {/* Avatar */}
                            <div 
                                onClick={() => !isUploadingAvatar && avatarInputRef.current?.click()}
                                onKeyDown={(e) => {
                                    if (!isUploadingAvatar && (e.key === 'Enter' || e.key === ' ')) {
                                        e.preventDefault();
                                        avatarInputRef.current?.click();
                                    }
                                }}
                                tabIndex={0}
                                role="button"
                                aria-label="Change avatar"
                                title="Change avatar"
                                style={{ 
                                    width: 64, 
                                    height: 64, 
                                    borderRadius: '50%', 
                                    background: '#EFF6FF', 
                                    color: '#007BFF', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    fontSize: '1.4rem', 
                                    fontWeight: 700, 
                                    border: '2px solid #BFDBFE', 
                                    overflow: 'hidden',
                                    cursor: isUploadingAvatar ? 'not-allowed' : 'pointer',
                                    position: 'relative',
                                    transition: 'all 0.2s ease',
                                }}
                                onMouseOver={e => {
                                    if (!isUploadingAvatar) e.currentTarget.style.opacity = '0.8';
                                }}
                                onMouseOut={e => {
                                    e.currentTarget.style.opacity = '1';
                                }}
                            >
                                {isUploadingAvatar ? (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                                        <svg className="animate-spin" style={{ width: '20px', height: '20px', color: '#007BFF' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                            <circle cx="12" cy="12" r="10" strokeDasharray="40 20" />
                                        </svg>
                                    </div>
                                ) : authUser?.avatar_url ? (
                                    <img src={getPublicStorageUrl('avatars', authUser.avatar_url)} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    userInitials
                                )}
                            </div>
                            <input 
                                type="file" 
                                ref={avatarInputRef} 
                                style={{ display: 'none' }} 
                                accept="image/jpeg,image/png,image/webp" 
                                onChange={handleAvatarChange} 
                            />
                            <div style={{ fontSize: '15px', fontWeight: 700, color: '#12263A' }}>
                                {userName || 'Candidate'}
                            </div>
                            <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.4 }}>
                                {candidateProfile?.headline || candidateProfile?.current_role || 'Add your headline'}
                            </div>
                            {candidateProfile?.location && (
                                <div style={{ fontSize: '12px', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                    <span style={{ width: 12, height: 12 }}>{IC.mapPin}</span>
                                    {candidateProfile.location}
                                </div>
                            )}

                            {/* Visibility Badge */}
                            <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                fontSize: '11px',
                                fontWeight: 600,
                                padding: '3px 8px',
                                borderRadius: '12px',
                                backgroundColor: candidateProfile?.is_visible ? '#e6f4ea' : '#f1f3f4',
                                color: candidateProfile?.is_visible ? '#137333' : '#5f6368',
                                marginTop: '2px'
                            }}>
                                <motion.span
                                    animate={candidateProfile?.is_visible ? {
                                        scale: [1, 1.25, 1],
                                        opacity: [0.6, 1, 0.6]
                                    } : {}}
                                    transition={{
                                        repeat: Infinity,
                                        duration: 2,
                                        ease: "easeInOut"
                                    }}
                                    style={{
                                        width: '6px',
                                        height: '6px',
                                        borderRadius: '50%',
                                        backgroundColor: candidateProfile?.is_visible ? '#137333' : '#5f6368'
                                    }}
                                />
                                {candidateProfile?.is_visible ? 'Open to opportunities' : 'Off-market'}
                            </div>

                            <Link
                                href="/candidate/dashboard/profile"
                                style={{ color: '#007BFF', fontSize: '12px', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '4px' }}
                            >
                                {IC.pencil} Edit Profile
                            </Link>
                        </div>

                        {/* Profile Strength */}
                        <div style={{ borderTop: '1px solid #e2e5ea', paddingTop: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span style={{ fontSize: '11px', color: '#6B7280', fontWeight: 500 }}>Strength</span>
                                <span style={{ fontSize: '11px', color: '#007BFF', fontWeight: 700 }}>{profileStrength}%</span>
                            </div>
                            <div style={{ height: '4px', background: '#E2E5EA', borderRadius: '9999px', overflow: 'hidden' }}>
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${profileStrength}%` }}
                                    transition={{ type: 'spring', stiffness: 80, damping: 15 }}
                                    style={{ height: '100%', background: profileStrength >= 80 ? '#10b981' : profileStrength >= 50 ? '#007BFF' : '#f59e0b', borderRadius: '9999px' }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Activity Stats Card */}
                    <div style={{ background: '#ffffff', borderRadius: '12px', boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#12263A', borderBottom: '1px solid #e2e5ea', paddingBottom: '6px' }}>
                            Activity Summary
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '12px', color: '#475569' }}>Applied Jobs</span>
                            <span style={{ fontSize: '13px', fontWeight: 750, color: '#007BFF', background: '#EFF6FF', padding: '2px 8px', borderRadius: '12px' }}>
                                {appliedIds.size}
                            </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '12px', color: '#475569' }}>Saved Jobs</span>
                            <span style={{ fontSize: '13px', fontWeight: 750, color: '#007BFF', background: '#EFF6FF', padding: '2px 8px', borderRadius: '12px' }}>
                                {savedJobsCount}
                            </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '12px', color: '#475569' }}>Profile Views</span>
                            <span style={{ fontSize: '13px', fontWeight: 750, color: '#10b981', background: '#ECFDF5', padding: '2px 8px', borderRadius: '12px' }}>
                                12
                            </span>
                        </div>
                    </div>

                    {/* Quick Links Vertical Menu Card */}
                    <div style={{ background: '#ffffff', borderRadius: '12px', boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)', padding: '8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <motion.div whileHover={{ x: 4 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }}>
                            <Link 
                                href="/candidate/dashboard/applications" 
                                style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#475569', textDecoration: 'none', borderRadius: '8px', padding: '10px 12px', fontWeight: 600, transition: 'all 0.15s' }} 
                                onMouseOver={e => e.currentTarget.style.background = '#F1F5F9'} 
                                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                                <span>My Applications</span>
                            </Link>
                        </motion.div>
                        <motion.div whileHover={{ x: 4 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }}>
                            <button
                                onClick={() => handleTabChange(activeTab === 'saved' ? 'browse' : 'saved')}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    width: '100%',
                                    textAlign: 'left',
                                    fontSize: '13px',
                                    color: activeTab === 'saved' ? '#007BFF' : '#475569',
                                    textDecoration: 'none',
                                    background: activeTab === 'saved' ? '#EFF6FF' : 'transparent',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '10px 12px',
                                    fontWeight: 600,
                                    transition: 'all 0.15s',
                                    cursor: 'pointer'
                                }}
                                onMouseOver={e => {
                                    if (activeTab !== 'saved') e.currentTarget.style.background = '#F1F5F9';
                                }}
                                onMouseOut={e => {
                                    if (activeTab !== 'saved') e.currentTarget.style.background = 'transparent';
                                }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
                                <span>Saved Jobs</span>
                            </button>
                        </motion.div>
                        <motion.div whileHover={{ x: 4 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }}>
                            <Link 
                                href="/candidate/dashboard/resumes" 
                                style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#475569', textDecoration: 'none', borderRadius: '8px', padding: '10px 12px', fontWeight: 600, transition: 'all 0.15s' }} 
                                onMouseOver={e => e.currentTarget.style.background = '#F1F5F9'} 
                                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                                <span>Resumes</span>
                            </Link>
                        </motion.div>
                        <motion.div whileHover={{ x: 4 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }}>
                            <Link 
                                href="/candidate/dashboard/interviews" 
                                style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#475569', textDecoration: 'none', borderRadius: '8px', padding: '10px 12px', fontWeight: 600, transition: 'all 0.15s' }} 
                                onMouseOver={e => e.currentTarget.style.background = '#F1F5F9'} 
                                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                <span>My Interviews</span>
                            </Link>
                        </motion.div>
                        <motion.div whileHover={{ x: 4 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }}>
                            <Link 
                                href="/candidate/dashboard/referrals" 
                                style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#475569', textDecoration: 'none', borderRadius: '8px', padding: '10px 12px', fontWeight: 600, transition: 'all 0.15s' }} 
                                onMouseOver={e => e.currentTarget.style.background = '#F1F5F9'} 
                                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                                <span>My Referrals</span>
                            </Link>
                        </motion.div>
                        <motion.div whileHover={{ x: 4 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }}>
                            <Link 
                                href="/candidate/dashboard/settings" 
                                style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#475569', textDecoration: 'none', borderRadius: '8px', padding: '10px 12px', fontWeight: 600, transition: 'all 0.15s' }} 
                                onMouseOver={e => e.currentTarget.style.background = '#F1F5F9'} 
                                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                                <span>Account Settings</span>
                            </Link>
                        </motion.div>
                    </div>
                </div>

                {/* ─── Column 2: Center Column Welcome + Job List (440px) ─── */}
                <div 
                    className="list-column" 
                    style={{ width: '440px', flexShrink: 0, overflowY: 'auto', borderRight: '1px solid #e2e5ea', height: '100%', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}
                >
                    <div style={{ padding: '1.25rem 1.0rem', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
                        {/* Section header */}
                        <div style={{ marginBottom: '2px', padding: '0 8px' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#12263A', margin: '0 0 8px' }}>Welcome, {userName}</h2>
                            
                            {/* Tab Switchers */}
                            <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid #e2e5ea', marginBottom: '4px' }}>
                                <button
                                    onClick={() => handleTabChange('browse')}
                                    style={{
                                        border: 'none',
                                        background: 'none',
                                        fontSize: '13px',
                                        fontWeight: activeTab === 'browse' ? 700 : 500,
                                        color: activeTab === 'browse' ? '#007BFF' : '#475569',
                                        paddingBottom: '12px',
                                        cursor: 'pointer',
                                        paddingLeft: 0,
                                        paddingRight: 0,
                                        position: 'relative'
                                    }}
                                  >
                                    Recommended Jobs
                                    {activeTab === 'browse' && (
                                        <motion.div 
                                            layoutId="activeTabUnderline" 
                                            style={{ position: 'absolute', bottom: '-1px', left: 0, right: 0, height: '2px', background: '#007BFF', zIndex: 1 }} 
                                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                        />
                                    )}
                                </button>
                                <button
                                    onClick={() => handleTabChange('saved')}
                                    style={{
                                        border: 'none',
                                        background: 'none',
                                        fontSize: '13px',
                                        fontWeight: activeTab === 'saved' ? 700 : 500,
                                        color: activeTab === 'saved' ? '#007BFF' : '#475569',
                                        paddingBottom: '12px',
                                        cursor: 'pointer',
                                        paddingLeft: 0,
                                        paddingRight: 0,
                                        position: 'relative'
                                    }}
                                  >
                                    Saved Jobs ({savedJobsCount})
                                    {activeTab === 'saved' && (
                                        <motion.div 
                                            layoutId="activeTabUnderline" 
                                            style={{ position: 'absolute', bottom: '-1px', left: 0, right: 0, height: '2px', background: '#007BFF', zIndex: 1 }} 
                                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                        />
                                    )}
                                </button>
                            </div>
                        </div>
 
                        <div style={{ position: 'relative', overflowX: 'hidden', flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <AnimatePresence mode="popLayout" initial={false}>
                                <motion.div
                                    key={activeTab}
                                    initial={{ opacity: 0, x: activeTab === 'saved' ? 60 : -60 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: activeTab === 'saved' ? -60 : 60 }}
                                    transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                                    style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px', padding: '4px 8px 12px 8px', boxSizing: 'border-box' }}
                                >
                                    {((activeTab === 'browse' && loading && jobs.length === 0) || (activeTab === 'saved' && loadingSaved)) ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
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
                                                        padding: '20px',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: '12px'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                        <div className="sk-pulse" style={{ width: 70, height: 18, borderRadius: 4 }} />
                                                        <div style={{ display: 'flex', gap: '6px' }}>
                                                            <div className="sk-pulse" style={{ width: 28, height: 28, borderRadius: '50%' }} />
                                                            <div className="sk-pulse" style={{ width: 28, height: 28, borderRadius: '50%' }} />
                                                        </div>
                                                    </div>
                                                    <div className="sk-pulse" style={{ width: '80%', height: 16, borderRadius: 4 }} />
                                                    <div className="sk-pulse" style={{ width: '50%', height: 12, borderRadius: 4 }} />
                                                    <div className="sk-pulse" style={{ width: '65%', height: 12, borderRadius: 4 }} />
                                                    <div style={{ display: 'flex', gap: '6px' }}>
                                                        <div className="sk-pulse" style={{ width: 60, height: 18, borderRadius: 4 }} />
                                                        <div className="sk-pulse" style={{ width: 80, height: 18, borderRadius: 4 }} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : activeTab === 'browse' && jobs.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '3rem 1.5rem', background: '#ffffff', borderRadius: '12px', boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)', width: '100%' }}>
                                            <span style={{ fontSize: '2.5rem' }}>🔍</span>
                                            <h3 style={{ margin: '1rem 0 0.5rem', color: '#12263A', fontSize: '16px', fontWeight: 700 }}>No jobs match your search</h3>
                                            <p style={{ color: '#475569', fontSize: '13px', margin: 0 }}>Try clearing filters or search terms.</p>
                                        </div>
                                    ) : activeTab === 'saved' && savedJobsList.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', background: '#ffffff', borderRadius: '12px', boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                            <span style={{ fontSize: '2.5rem' }}>🔖</span>
                                            <h3 style={{ margin: '1rem 0 0.5rem', color: '#12263A', fontSize: '15px', fontWeight: 700 }}>No saved jobs yet</h3>
                                            <p style={{ color: '#6B7280', fontSize: '13px', margin: '0 0 16px' }}>Jobs you save will appear in this tab.</p>
                                            <button
                                                onClick={() => handleTabChange('browse')}
                                                style={{
                                                    background: '#EFF6FF',
                                                    color: '#007BFF',
                                                    border: 'none',
                                                    padding: '8px 16px',
                                                    borderRadius: '8px',
                                                    fontSize: '13px',
                                                    fontWeight: 600,
                                                    cursor: 'pointer',
                                                    transition: 'all 0.15s'
                                                }}
                                                onMouseOver={e => e.currentTarget.style.background = '#DBEAFE'}
                                                onMouseOut={e => e.currentTarget.style.background = '#EFF6FF'}
                                            >
                                                Explore Recommended Jobs
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            {(activeTab === 'browse' ? jobs : savedJobsList).map((job) => {
                                                const isSelected = selectedJob?.id === job.id;
                                                const isApplied = appliedIds.has(job.id);
                                                const isSaved = isJobSaved(job.id);
                                                return (
                                                    <motion.div
                                                        key={job.id}
                                                        onClick={() => setSelectedJob(job)}
                                                        tabIndex={0}
                                                        role="button"
                                                        aria-selected={isSelected}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' || e.key === ' ') {
                                                                e.preventDefault();
                                                                setSelectedJob(job);
                                                            }
                                                        }}
                                                        whileHover={{ scale: 1.015, y: -2 }}
                                                        whileTap={{ scale: 0.99 }}
                                                        animate={{
                                                            backgroundColor: isSelected ? '#F4F8FD' : '#ffffff',
                                                            boxShadow: isSelected
                                                                ? 'inset 0 0 0 1.5px #007BFF, 0 4px 20px rgba(0, 123, 255, 0.12), 0 0px 0px rgba(0, 0, 0, 0)'
                                                                : 'inset 0 0 0 0px rgba(0, 123, 255, 0), 0 4px 16px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)'
                                                        }}
                                                        transition={{
                                                            scale: { type: 'spring', stiffness: 450, damping: 25 },
                                                            y: { type: 'spring', stiffness: 450, damping: 25 },
                                                            default: { duration: 0.15, ease: 'easeOut' }
                                                        }}
                                                        style={{
                                                            borderRadius: '10px',
                                                            padding: '20px',
                                                            cursor: 'pointer',
                                                            position: 'relative',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            gap: '8px'
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                                                            <span style={{ background: '#EFF6FF', color: '#007BFF', fontSize: '11px', padding: '3px 8px', borderRadius: '5px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                                                ⚡ Easily apply
                                                            </span>
                                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                                                                <button
                                                                    onClick={(e) => handleToggleSave(job.id, e)}
                                                                    style={{
                                                                        background: isSaved ? '#EFF6FF' : '#ffffff',
                                                                        border: `1px solid ${isSaved ? '#3B82F6' : '#e2e5ea'}`,
                                                                        borderRadius: '50%',
                                                                        width: '44px',
                                                                        height: '44px',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        cursor: 'pointer',
                                                                        color: isSaved ? '#007BFF' : '#475569',
                                                                        transition: 'all 0.2s ease',
                                                                        boxShadow: isSaved ? '0 2px 6px rgba(59, 130, 246, 0.15)' : 'none'
                                                                    }}
                                                                    onMouseOver={e => {
                                                                        e.currentTarget.style.borderColor = '#3B82F6';
                                                                        e.currentTarget.style.background = '#EFF6FF';
                                                                        e.currentTarget.style.color = '#007BFF';
                                                                        e.currentTarget.style.transform = 'scale(1.05)';
                                                                    }}
                                                                    onMouseOut={e => {
                                                                        e.currentTarget.style.borderColor = isSaved ? '#3B82F6' : '#e2e5ea';
                                                                        e.currentTarget.style.background = isSaved ? '#EFF6FF' : '#ffffff';
                                                                        e.currentTarget.style.color = isSaved ? '#007BFF' : '#475569';
                                                                        e.currentTarget.style.transform = 'none';
                                                                    }}
                                                                    title={isSaved ? 'Unsave job' : 'Save job'}
                                                                >
                                                                    {isSaved ? IC.bookmarkFilled : IC.bookmark}
                                                                </button>
                                                            </div>
                                                        </div>

                                                        <h3 style={{ margin: '2px 0 0', fontSize: '15px', fontWeight: 600, color: '#12263A', lineHeight: 1.3 }}>{job.title}</h3>

                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                                                            <span style={{ fontSize: '13px', color: '#475569' }}>{job.company_profiles?.company_name || job.company_profiles?.name || 'TalentMesh Company'}</span>
                                                            <span style={{ fontSize: '13px', color: '#475569' }}>{job.location}</span>
                                                        </div>

                                                        {/* Tags */}
                                                        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '2px' }}>
                                                            <span style={{ background: '#E7F7EE', color: '#157A45', fontSize: '11px', padding: '2px 8px', borderRadius: '5px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                                {IC.check} {formatSalary(job.salary_min, job.salary_max, job.currency)}
                                                            </span>
                                                            <span style={{ background: '#F2F3F4', color: '#475569', fontSize: '11px', padding: '2px 8px', borderRadius: '5px', fontWeight: 600 }}>
                                                                {job.type || 'Full-Time'}
                                                            </span>
                                                            {job.remote && (
                                                                <span style={{ background: '#F2F3F4', color: '#475569', fontSize: '11px', padding: '2px 8px', borderRadius: '5px', fontWeight: 600 }}>
                                                                    Work from home
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                                                            <span>{formatDistanceToNow(new Date(job.created_at))} ago</span>
                                                            {isApplied && (
                                                                <span style={{ background: '#E7F7EE', color: '#157A45', padding: '2px 8px', borderRadius: '5px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                                    {IC.check} Applied
                                                                </span>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                            {activeTab === 'browse' && hasMore && (
                                                <button
                                                    onClick={handleLoadMore}
                                                    disabled={loadingMore}
                                                    style={{ background: '#ffffff', color: '#007BFF', border: '1px solid #e2e5ea', padding: '0.75rem', borderRadius: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '14px', width: '100%', marginTop: '4px', transition: 'background 0.15s' }}
                                                    onMouseOver={e => (e.currentTarget.style.background = '#EFF6FF')}
                                                    onMouseOut={e => (e.currentTarget.style.background = '#ffffff')}
                                                >
                                                    {loadingMore ? 'Loading more...' : 'Load more jobs'}
                                                </button>
                                            )}
                                        </>
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                {/* ─── Right Column: Job Detail Panel ─── */}
                <motion.div 
                    className={`details-column ${selectedJob ? 'is-open' : ''}`}
                    drag={isMobile ? "y" : false}
                    dragConstraints={{ top: 0, bottom: 0 }}
                    dragElastic={{ top: 0.15, bottom: 0.85 }}
                    onDragEnd={(event, info) => {
                        if (isMobile && info.offset.y > 140) {
                            setSelectedJob(null);
                        }
                    }}
                    animate={isMobile ? { y: selectedJob ? 0 : '100%' } : { y: 0 }}
                    initial={isMobile ? { y: '100%' } : { y: 0 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem', height: '100%', backgroundColor: '#ffffff', zIndex: 100 }}
                >
                    {loading && !selectedJob ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: '680px' }}>
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
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div className="sk-pulse" style={{ width: '70%', height: 26, borderRadius: 4 }} />
                                <div className="sk-pulse" style={{ width: '40%', height: 16, borderRadius: 4 }} />
                                <div className="sk-pulse" style={{ width: '30%', height: 14, borderRadius: 4 }} />
                                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                                    <div className="sk-pulse" style={{ width: 200, height: 44, borderRadius: 8 }} />
                                    <div className="sk-pulse" style={{ width: 44, height: 44, borderRadius: 8 }} />
                                    <div className="sk-pulse" style={{ width: 44, height: 44, borderRadius: 8 }} />
                                </div>
                            </div>
                            <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: 0 }} />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div className="sk-pulse" style={{ width: 140, height: 18, borderRadius: 4 }} />
                                <div className="sk-pulse" style={{ width: '100%', height: 14, borderRadius: 4 }} />
                                <div className="sk-pulse" style={{ width: '95%', height: 14, borderRadius: 4 }} />
                                <div className="sk-pulse" style={{ width: '90%', height: 14, borderRadius: 4 }} />
                                <div className="sk-pulse" style={{ width: '40%', height: 14, borderRadius: 4 }} />
                            </div>
                        </div>
                    ) : selectedJob ? (
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={selectedJob.id}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -12 }}
                                transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                                style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: '680px' }}
                            >
                            {/* Mobile Drag Handle */}
                            <div className="mobile-drag-handle" style={{ display: 'none', justifyContent: 'center', paddingBottom: '4px', cursor: 'pointer' }} onClick={() => setSelectedJob(null)}>
                                <div style={{ width: '36px', height: '4px', background: '#e2e8f0', borderRadius: '99px' }} />
                            </div>
                            
                            {/* Detail Header */}
                            <div style={{ position: 'relative' }}>
                                <h2 style={{ margin: '0 40px 6px 0', fontSize: '22px', fontWeight: 600, color: '#12263A', lineHeight: 1.3 }}>{selectedJob.title}</h2>
                                <button 
                                    className="mobile-close-btn"
                                    onClick={() => setSelectedJob(null)}
                                    style={{ 
                                        display: 'none', 
                                        position: 'absolute', 
                                        top: '0', 
                                        right: '0', 
                                        background: '#f1f5f9', 
                                        border: 'none', 
                                        borderRadius: '50%', 
                                        width: '32px', 
                                        height: '32px', 
                                        alignItems: 'center', 
                                        justifyContent: 'center', 
                                        cursor: 'pointer', 
                                        color: '#64748b', 
                                        fontWeight: 700 
                                    }}
                                >
                                    ✕
                                </button>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                                    <Link
                                        href={`/dashboard/candidate/${role_id}/company-reviews`}
                                        style={{ fontSize: '14px', color: '#007BFF', textDecoration: 'underline', fontWeight: 500 }}
                                    >
                                        {selectedJob.companies?.name}
                                    </Link>
                                    <span style={{ color: '#e2e5ea' }}>·</span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                                        {selectedJob.companies?.rating || '4.0'} {IC.star}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                                    <span style={{ 
                                        display: 'inline-flex', 
                                        alignItems: 'center', 
                                        gap: '4px', 
                                        fontSize: '12px', 
                                        fontWeight: 600, 
                                        color: '#157A45', 
                                        background: '#E7F7EE', 
                                        padding: '4px 10px', 
                                        borderRadius: '6px',
                                        border: '1px solid #D1F2DE'
                                    }}>
                                        {formatSalary(selectedJob.salary_min, selectedJob.salary_max, selectedJob.currency)}
                                    </span>
                                    <span style={{ 
                                        display: 'inline-flex', 
                                        alignItems: 'center', 
                                        gap: '4px', 
                                        fontSize: '12px', 
                                        fontWeight: 500, 
                                        color: '#475569', 
                                        background: '#F1F5F9', 
                                        padding: '4px 10px', 
                                        borderRadius: '6px',
                                        border: '1px solid #E2E8F0'
                                    }}>
                                        📍 {selectedJob.location}
                                    </span>
                                    {selectedJob.job_type && (
                                        <span style={{ 
                                            display: 'inline-flex', 
                                            alignItems: 'center', 
                                            gap: '4px', 
                                            fontSize: '12px', 
                                            fontWeight: 500, 
                                            color: '#475569', 
                                            background: '#F1F5F9', 
                                            padding: '4px 10px', 
                                            borderRadius: '6px',
                                            border: '1px solid #E2E8F0'
                                        }}>
                                            💼 {selectedJob.job_type}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* CTA Row */}
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '18px' }}>
                                {appliedIds.has(selectedJob.id) ? (
                                    <div style={{ background: '#E7F7EE', color: '#157A45', padding: '0 2rem', borderRadius: '8px', fontWeight: 700, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px', height: '48px' }}>
                                        {IC.check} Applied
                                    </div>
                                ) : (
                                    <motion.button
                                        onClick={() => setIsApplyModalOpen(true)}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                                        style={{ background: '#007BFF', color: '#ffffff', border: 'none', padding: '0 2rem', borderRadius: '8px', fontWeight: 700, fontSize: '15px', cursor: 'pointer', height: '48px', outline: 'none' }}
                                    >
                                        Apply with TalentMesh
                                    </motion.button>
                                )}
                                <motion.button
                                    onClick={(e) => handleToggleSave(selectedJob.id, e)}
                                    whileHover={{ scale: 1.08 }}
                                    whileTap={{ scale: 0.92 }}
                                    animate={{ scale: isJobSaved(selectedJob.id) ? [1, 1.2, 1] : 1 }}
                                    transition={{
                                        default: { type: 'spring', stiffness: 500, damping: 15 },
                                        scale: { type: 'keyframes', duration: 0.3 }
                                    }}
                                    style={{
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: '8px',
                                        border: `1px solid ${isJobSaved(selectedJob.id) ? '#3B82F6' : '#e2e5ea'}`,
                                        background: isJobSaved(selectedJob.id) ? '#EFF6FF' : '#ffffff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        color: isJobSaved(selectedJob.id) ? '#007BFF' : '#475569',
                                        boxShadow: isJobSaved(selectedJob.id) ? '0 2px 8px rgba(59, 130, 246, 0.15)' : 'none',
                                        outline: 'none'
                                    }}
                                    title={isJobSaved(selectedJob.id) ? 'Unsave job' : 'Save job'}
                                >
                                    {isJobSaved(selectedJob.id) ? IC.bookmarkFilled : IC.bookmark}
                                </motion.button>
                                <motion.button
                                    onClick={handleShareJobClick}
                                    whileHover={{ scale: 1.08 }}
                                    whileTap={{ scale: 0.92 }}
                                    transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                                    style={{
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: '8px',
                                        border: '1px solid #e2e5ea',
                                        background: '#ffffff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        color: '#475569',
                                        outline: 'none'
                                    }}
                                    title="Share"
                                >
                                    {IC.share}
                                </motion.button>
                            </div>

                            <hr style={{ border: 'none', borderTop: '1px solid #e2e5ea', margin: 0 }} />

                            {/* Job Details Spec */}
                            <div>
                                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#12263A', margin: '0 0 16px' }}>Job details</h3>
                                <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 16px' }}>Here's how the job details align with your profile.</p>

                                <div style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                                    gap: '12px',
                                    background: '#F8FAFC',
                                    border: '1px solid #E2E8F0',
                                    borderRadius: '12px',
                                    padding: '16px',
                                    marginTop: '8px'
                                }}>
                                    {/* Pay Tile */}
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                        <span style={{ fontSize: '18px', filter: 'grayscale(100%)', opacity: 0.8 }}>💰</span>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pay</span>
                                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B' }}>
                                                {formatSalary(selectedJob.salary_min, selectedJob.salary_max, selectedJob.currency)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Job Type Tile */}
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                        <span style={{ fontSize: '18px', filter: 'grayscale(100%)', opacity: 0.8 }}>💼</span>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Job Type</span>
                                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B' }}>
                                                {selectedJob.type || 'Full-Time'} {selectedJob.remote ? '(Remote)' : ''}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Experience Tile */}
                                    {(selectedJob.experience_min != null || selectedJob.experience_max != null) && (
                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', gridColumn: 'span 2' }}>
                                            <span style={{ fontSize: '18px', filter: 'grayscale(100%)', opacity: 0.8 }}>👤</span>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Experience Required</span>
                                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B' }}>
                                                    {formatExperience(selectedJob.experience_min, selectedJob.experience_max)}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <hr style={{ border: 'none', borderTop: '1px solid #e2e5ea', margin: 0 }} />

                            {/* Job Description */}
                            <div>
                                <h4 style={{ margin: '0 0 0.75rem', fontSize: '16px', fontWeight: 700, color: '#12263A' }}>Job Description</h4>
                                <div style={{ color: '#334155', fontSize: '14px', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                                    {selectedJob.description}
                                </div>
                            </div>

                            {Array.isArray(selectedJob.requirements) && selectedJob.requirements.length > 0 && (
                                <div>
                                    <h4 style={{ margin: '0 0 0.75rem', fontSize: '16px', fontWeight: 700, color: '#12263A' }}>Requirements</h4>
                                    <ul style={{ paddingLeft: '1.25rem', margin: 0, color: '#334155', fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '0.4rem', lineHeight: 1.6 }}>
                                        {selectedJob.requirements.map((req: string, idx: number) => (
                                            <li key={idx}>{req}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {Array.isArray(selectedJob.skills_required) && selectedJob.skills_required.length > 0 && (
                                <div>
                                    <h4 style={{ margin: '0 0 0.75rem', fontSize: '16px', fontWeight: 700, color: '#12263A' }}>Skills Required</h4>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                        {selectedJob.skills_required.map((skill: string) => (
                                            <span key={skill} style={{ background: '#F2F3F4', color: '#334155', fontSize: '12px', padding: '5px 12px', borderRadius: '9999px', fontWeight: 500, border: '1px solid #E2E5EA' }}>
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            </motion.div>
                        </AnimatePresence>
                    ) : (
                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}>
                            <motion.span
                                animate={{ y: [0, -8, 0] }}
                                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                style={{ fontSize: '3rem', marginBottom: '1rem', display: 'inline-block' }}
                            >
                                💼
                            </motion.span>
                            <span style={{ fontSize: '15px', fontWeight: 500 }}>Select a job to view details</span>
                            <span style={{ fontSize: '13px', marginTop: '4px' }}>Click any job on the left to see full details here</span>
                        </div>
                    )}
                </motion.div>
            </div>

            {selectedJob && (
                <ApplyModal
                    isOpen={isApplyModalOpen}
                    onClose={() => setIsApplyModalOpen(false)}
                    jobId={selectedJob.id}
                    jobTitle={selectedJob.title}
                    companyName={selectedJob.companies?.name || 'Company'}
                    candidateProfile={null}
                    jobSkills={selectedJob.skills_required || []}
                    onSuccess={() => {
                        triggerHapticFeedback([30, 50, 30]);
                        setAppliedIds(prev => {
                            const next = new Set(prev);
                            next.add(selectedJob.id);
                            return next;
                        });
                        setToast({ message: 'Successfully applied for the job!', type: 'success' });
                    }}
                />
            )}

            <SearchFilterDrawer
                isOpen={isFilterDrawerOpen}
                onClose={() => setIsFilterDrawerOpen(false)}
                filters={filters}
                onApply={handleApplyFilters}
                onSaveSearch={() => {
                    setIsFilterDrawerOpen(false);
                    setIsAlertModalOpen(true);
                }}
            />

            {isAlertModalOpen && (
                <AlertModal
                    alert={{
                        keywords: search,
                        location: location,
                        job_type: filters.type ? [filters.type] : [],
                        experience_level: null,
                    }}
                    onClose={() => setIsAlertModalOpen(false)}
                    onSave={handleSaveAlert}
                />
            )}
        </div>
    );
}
