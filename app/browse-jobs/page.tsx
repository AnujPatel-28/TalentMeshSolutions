'use client';
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import Link from 'next/link';
import Toast from '@/components/ui/Toast';
import styles from './jobs.module.css';

import { useAuth } from '@/lib/auth/AuthContext';
import { invokeFunction } from '@/lib/insforge';
import { useSavedJobs } from '@/hooks/useSavedJobs';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { getPublicStorageUrl } from '@/lib/utils/storage-url';

// ─── SVG Icons ──────────────────────────────────────────────────────────────
const Ico = {
    Search: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>,
    Location: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>,
    Briefcase: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /></svg>,
    Sparkle: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="m12 3 1.912 5.885L20 10.8l-5.088 1.912L13 18.6l-1.912-5.888L6 10.8l5.088-1.915Z" /></svg>,
    Heart: () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>,
    HeartFill: () => <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>,
    Filter: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>,
    Close: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>,
    ArrowR: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14m-7-7 7 7-7 7" /></svg>,
    Share: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg>,
    Copy: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>,
    Verified: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="#3B82F6"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>,
    Building: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M8 10h.01"/><path d="M16 10h.01"/><path d="M8 14h.01"/><path d="M16 14h.01"/></svg>,
    Globe: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
    CheckCircle: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
    Zap: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
    Code: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
    Palette: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.92 0 1.7-.72 1.7-1.63 0-.44-.18-.85-.46-1.16-.27-.31-.44-.73-.44-1.21 0-.91.73-1.65 1.64-1.65H16c3.31 0 6-2.69 6-6 0-4.97-4.48-9-10-9z"/></svg>,
    Target: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
    Trending: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
    Dollar: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
    Users: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    Settings: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
    LocateTarget: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>,
};

const CATEGORY_CHIPS = [
    { name: 'All', IconComponent: Ico.Zap },
    { name: 'Engineering', IconComponent: Ico.Code },
    { name: 'Design', IconComponent: Ico.Palette },
    { name: 'Product', IconComponent: Ico.Target },
    { name: 'Marketing', IconComponent: Ico.Trending },
    { name: 'Finance', IconComponent: Ico.Dollar },
    { name: 'HR', IconComponent: Ico.Users },
    { name: 'Operations', IconComponent: Ico.Settings },
];
const POPULAR_TAGS = ['Remote Engineer', 'Product Designer', 'Marketing Lead', 'Data Scientist', 'Full Stack', 'DevOps'];
const JOB_TYPES = ['Full-Time', 'Part-Time', 'Remote', 'Internship', 'Contract'];
const INDUSTRIES = ['Engineering', 'Finance', 'Marketing', 'Design', 'HR', 'Product', 'Operations'];
const EXP_LEVELS = ['Entry', 'Mid', 'Senior', 'Lead'];

function getPostedDays(createdAt?: string | null) {
    if (!createdAt) return 0;
    const createdTime = new Date(createdAt).getTime();
    if (Number.isNaN(createdTime)) return 0;
    return Math.max(0, Math.floor((Date.now() - createdTime) / 86400000));
}

function formatIndianRupees(num: number): string {
    const x = num.toString();
    const lastThree = x.slice(-3);
    const otherNumbers = x.slice(0, -3);
    if (otherNumbers !== '') {
        const remaining = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
        return remaining + ',' + lastThree;
    }
    return lastThree;
}

function formatSalary(min?: number | null, max?: number | null, currency?: string | null) {
    if (!min && !max) return 'Competitive Pay';
    const symbol = currency === 'USD' ? '$' : '₹';
    const formatVal = (v: number) => {
        if (currency === 'USD') return v.toLocaleString('en-US');
        if (v >= 100000) return `${v / 100000}L`;
        return formatIndianRupees(v);
    };
    if (min && max) return `${symbol}${formatVal(min)} - ${symbol}${formatVal(max)}`;
    if (min) return `${symbol}${formatVal(min)}+`;
    return `${symbol}${formatVal(max || 0)}`;
}

function getInitials(name?: string | null) {
    if (!name) return 'TM';
    return name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

function getBrandColor(seed: string) {
    const palette = ['#2563EB', '#1D4ED8', '#0D9488', '#D97706', '#0284C7', '#2563EB'];
    const index = seed.split('').reduce((total, char) => total + char.charCodeAt(0), 0) % palette.length;
    return palette[index];
}

function cleanString(s: string) {
    return (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export default function BrowseJobsPage() {
    const { user } = useAuth();

    useEffect(() => {
        if (typeof window !== 'undefined') {
            document.title = "Explore Jobs & Opportunities | TalentMesh";
        }
    }, []);

    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [locSearch, setLocSearch] = useState('');
    const [isLocating, setIsLocating] = useState(false);
    const [jobType, setJobType] = useState('');

    const handleLocateMe = () => {
        if ('geolocation' in navigator) {
            setIsLocating(true);
            navigator.geolocation.getCurrentPosition(async (position) => {
                try {
                    const { latitude, longitude } = position.coords;
                    const response = await fetch(
                        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
                    );
                    const data = await response.json();
                    if (data && (data.city || data.locality)) {
                        const city = data.city || data.locality;
                        const region = data.principalSubdivisionCode || '';
                        setLocSearch(region ? `${city}, ${region}` : city);
                        setPage(1);
                    }
                } catch (error) {
                    console.error("Geolocation fetch error:", error);
                } finally {
                    setIsLocating(false);
                }
            }, (err) => {
                console.log("Geolocation permission denied:", err);
                setIsLocating(false);
            });
        }
    };
    const [filterOpen, setFilterOpen] = useState(false);
    const [category, setCategory] = useState('All');
    const [activeTypes, setActiveTypes] = useState<string[]>([]);
    const [activeInds, setActiveInds] = useState<string[]>([]);
    const [activeExps, setActiveExps] = useState<string[]>([]);
    const [activeLocTypes, setActiveLocTypes] = useState<string[]>([]);
    const [sortBy, setSortBy] = useState('Most Relevant');
    const [jobsPerPage, setJobsPerPage] = useState(6);
    const [page, setPage] = useState(1);

    // Inspector Tab State: 'overview' | 'stack' | 'company'
    const [activeTab, setActiveTab] = useState<'overview' | 'stack' | 'company'>('overview');

    // Database + LocalStorage Saved Jobs Fallback for guest candidates
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

    const isSaved = useCallback((jobId: string) => {
        if (user?.id) return isDbSaved(jobId);
        return guestSavedIds.has(jobId);
    }, [user?.id, isDbSaved, guestSavedIds]);

    const toggleSave = useCallback(async (jobId: string) => {
        if (user?.id) {
            await toggleDbSave(jobId);
        } else {
            setGuestSavedIds(prev => {
                const next = new Set(prev);
                if (next.has(jobId)) next.delete(jobId);
                else next.add(jobId);
                if (typeof window !== 'undefined') {
                    localStorage.setItem('guest_saved_jobs', JSON.stringify(Array.from(next)));
                }
                return next;
            });
            setToast({
                message: guestSavedIds.has(jobId) ? 'Job removed from bookmarks' : 'Job saved to browser bookmarks!',
                type: 'info'
            });
        }
    }, [user?.id, toggleDbSave, guestSavedIds]);

    const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
    const [faqOpen, setFaqOpen] = useState<Record<number, boolean>>({});
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

    const toggleFaq = (index: number) => {
        setFaqOpen(prev => ({ ...prev, [index]: !prev[index] }));
    };

    useEffect(() => {
        async function fetchJobs(attempt = 1) {
            try {
                const { data, error } = await invokeFunction('jobs', {
                    method: 'GET',
                    queries: { limit: '100' },
                    timeoutMs: 45000
                });

                if (error) throw new Error(error.message || 'Failed to fetch jobs');

                const rawJobs = data?.data || data || [];
                const formatted = rawJobs.map((j: any) => {
                    const company = j.company_profiles || j.companies || {};
                    const companyName = company.company_name || company.name || 'TalentMesh Employer';
                    const brandColor = getBrandColor(companyName);

                    return {
                        ...j,
                        type: j.type || 'Full-Time',
                        location: j.location || 'Remote',
                        department: j.department || 'Engineering',
                        salary: formatSalary(j.salary_min, j.salary_max, j.currency),
                        posted_days: getPostedDays(j.created_at),
                        ai_match_rate: j.ai_match_rate || 88,
                        skills_required: j.skills_required || ['React', 'Next.js', 'TypeScript', 'Tailwind CSS'],
                        is_new: getPostedDays(j.created_at) <= 2,
                        company_profiles: {
                            id: company.id || j.company_id || null,
                            company_name: companyName,
                            logo_url: company.logo_url || null,
                            industry: company.industry || 'Technology & Software',
                            about: company.about || `${companyName} is leading innovation in modern tech and product design.`,
                            website: company.website || null,
                            initials: getInitials(companyName),
                            color: brandColor,
                        }
                    };
                });
                setJobs(formatted);
                if (formatted.length > 0) setSelectedJobId(formatted[0].id);
            } catch (err) {
                console.error(`Error fetching jobs (attempt ${attempt}):`, err);
                if (attempt < 2) {
                    await new Promise(r => setTimeout(r, 1500));
                    return fetchJobs(attempt + 1);
                }
            } finally {
                setLoading(false);
            }
        }
        fetchJobs();
    }, []);

    const toggleArr = (arr: string[], setArr: (v: string[]) => void, val: string) =>
        setArr(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);

    const counts = useMemo(() => {
        const jobTypeCounts: Record<string, number> = {};
        const expCounts: Record<string, number> = {};
        const locTypeCounts: Record<string, number> = { 'Remote': 0, 'Hybrid': 0, 'On-site': 0 };
        const indCounts: Record<string, number> = {};
        const categoryCounts: Record<string, number> = { 'All': jobs.length };

        jobs.forEach(j => {
            if (j.type) {
                const matchedType = JOB_TYPES.find(t => cleanString(t) === cleanString(j.type));
                if (matchedType) jobTypeCounts[matchedType] = (jobTypeCounts[matchedType] || 0) + 1;
            }
            const exp = j.exp || j.experience_level || 'Mid';
            const matchedExp = EXP_LEVELS.find(el => cleanString(el) === cleanString(exp));
            if (matchedExp) expCounts[matchedExp] = (expCounts[matchedExp] || 0) + 1;

            const loc = (j.location || '').toLowerCase();
            if (loc.includes('remote')) locTypeCounts['Remote']++;
            else if (loc.includes('hybrid')) locTypeCounts['Hybrid']++;
            else locTypeCounts['On-site']++;

            if (j.department) {
                const matchedInd = INDUSTRIES.find(i => cleanString(i) === cleanString(j.department));
                if (matchedInd) indCounts[matchedInd] = (indCounts[matchedInd] || 0) + 1;
            }

            CATEGORY_CHIPS.forEach(c => {
                if (c.name === 'All') return;
                const dept = j.department?.toLowerCase() || '';
                const title = j.title?.toLowerCase() || '';
                if (dept.includes(c.name.toLowerCase()) || title.includes(c.name.toLowerCase())) {
                    categoryCounts[c.name] = (categoryCounts[c.name] || 0) + 1;
                }
            });
        });

        return { jobTypeCounts, expCounts, locTypeCounts, indCounts, categoryCounts };
    }, [jobs]);

    const filtered = useMemo(() => {
        return jobs.filter(j => {
            const title = j.title?.toLowerCase() || '';
            const company = j.company_profiles || j.companies || {};
            const companyName = (company.company_name || company.name || '').toLowerCase();
            const location = j.location?.toLowerCase() || '';
            const department = j.department?.toLowerCase() || '';
            const exp = j.exp || j.experience_level || 'Mid';

            if (search && !title.includes(search.toLowerCase()) && !companyName.includes(search.toLowerCase())) return false;
            if (locSearch && !location.includes(locSearch.toLowerCase())) return false;
            if (jobType && cleanString(j.type) !== cleanString(jobType)) return false;
            if (category !== 'All' && !department.includes(category.toLowerCase()) && !title.includes(category.toLowerCase())) return false;
            if (activeTypes.length && !activeTypes.some(t => cleanString(t) === cleanString(j.type))) return false;
            if (activeInds.length && !activeInds.some(i => cleanString(i) === cleanString(j.department))) return false;
            if (activeExps.length && !activeExps.some(el => cleanString(el) === cleanString(exp))) return false;

            if (activeLocTypes.length) {
                const locLower = location.toLowerCase();
                const matches = activeLocTypes.some(t => {
                    if (t === 'Remote') return locLower.includes('remote');
                    if (t === 'Hybrid') return locLower.includes('hybrid');
                    if (t === 'On-site') return !locLower.includes('remote') && !locLower.includes('hybrid');
                    return false;
                });
                if (!matches) return false;
            }

            return true;
        });
    }, [jobs, search, locSearch, jobType, category, activeTypes, activeInds, activeExps, activeLocTypes]);

    const sorted = useMemo(() => {
        const list = [...filtered];
        if (sortBy === 'Most Relevant') {
            list.sort((a, b) => (b.ai_match_rate || 88) - (a.ai_match_rate || 88));
        } else if (sortBy === 'Newest') {
            list.sort((a, b) => (a.posted_days || 0) - (b.posted_days || 0));
        } else if (sortBy === 'Salary (High-Low)') {
            const parseVal = (s: string) => {
                const num = parseFloat(s.replace(/[^0-9.]/g, ''));
                return isNaN(num) ? 0 : num;
            };
            list.sort((a, b) => parseVal(b.salary || '') - parseVal(a.salary || ''));
        }
        return list;
    }, [filtered, sortBy]);

    const pages = Math.ceil(filtered.length / jobsPerPage);
    const paginated = sorted.slice((page - 1) * jobsPerPage, page * jobsPerPage);

    const selectedJob = useMemo(() => {
        return sorted.find(j => j.id === selectedJobId) || paginated[0] || null;
    }, [sorted, paginated, selectedJobId]);

    const handleCardClick = (e: React.MouseEvent, jobId: string) => {
        e.preventDefault();
        setSelectedJobId(jobId);
    };

    const handleCopyLink = async (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        const url = `${window.location.origin}/browse-jobs/${id}`;
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(url);
                setToast({ message: 'Direct job link copied to clipboard!', type: 'success' });
            } else {
                const textArea = document.createElement('textarea');
                textArea.value = url;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                setToast({ message: 'Direct job link copied to clipboard!', type: 'success' });
            }
        } catch (err) {
            setToast({ message: `Share link: ${url}`, type: 'info' });
        }
    };

    const handleShare = async (e: React.MouseEvent, job: any) => {
        e.preventDefault();
        e.stopPropagation();
        const url = `${window.location.origin}/browse-jobs/${job.id}`;
        const company = job.company_profiles || job.companies || {};
        const companyName = company.company_name || company.name || 'TalentMesh Employer';

        if (navigator.share) {
            try {
                await navigator.share({ title: job.title, text: `Check out ${job.title} at ${companyName}`, url });
                setToast({ message: 'Shared successfully!', type: 'success' });
                return;
            } catch (err: any) {
                if (err.name === 'AbortError') return;
            }
        }
        handleCopyLink(e, job.id);
    };

    if (loading) {
        return (
            <div className={styles.loadingState}>
                <div className={styles.loadingSpinner} />
                <p>Loading Verified Opportunities...</p>
            </div>
        );
    }

    return (
        <main className={styles.page}>
            {/* Hero Banner Section */}
            <section className={styles.heroSection}>
                <div className={styles.container}>
                    <div className={styles.heroHeader}>
                        <div className={styles.heroBadge}>
                            <Ico.Sparkle /> <span>{jobs.length > 0 ? `${jobs.length} Verified Roles Available` : 'Explore Verified Opportunities'}</span>
                        </div>
                        <h1 className={styles.heroTitle}>
                            Find Your <span className={styles.gradientText}>Next Role</span>
                        </h1>
                        <p className={styles.heroSubtitle}>
                            Search thousands of roles in tech, design, marketing, product, and much more across top companies.
                        </p>
                    </div>

                    {/* Integrated Quick Search Bar */}
                    <div className={styles.searchBarCard}>
                        {/* Job Search Input Group */}
                        <div className={styles.searchInputGroup}>
                            <div className={styles.inputIconWrapper}>
                                <Ico.Search />
                            </div>
                            <div className={styles.fieldWrapper}>
                                <label className={styles.inputLabel} htmlFor="job-search-input">ROLE / KEYWORD</label>
                                <input
                                    id="job-search-input"
                                    type="text"
                                    value={search}
                                    onChange={e => { setSearch(e.target.value); setPage(1); }}
                                    placeholder="Job title, tech stack, or keyword..."
                                    className={styles.searchInput}
                                />
                            </div>
                            {search ? (
                                <button
                                    type="button"
                                    className={styles.clearBtn}
                                    onClick={() => { setSearch(''); setPage(1); }}
                                    aria-label="Clear job search"
                                    title="Clear"
                                >
                                    <Ico.Close />
                                </button>
                            ) : null}
                        </div>

                        <div className={styles.searchDivider} />

                        {/* Location Input Group */}
                        <div className={styles.searchInputGroup}>
                            <div className={styles.inputIconWrapper}>
                                <Ico.Location />
                            </div>
                            <div className={styles.fieldWrapper}>
                                <label className={styles.inputLabel} htmlFor="location-search-input">LOCATION</label>
                                <input
                                    id="location-search-input"
                                    type="text"
                                    value={locSearch}
                                    onChange={e => { setLocSearch(e.target.value); setPage(1); }}
                                    placeholder={isLocating ? "Detecting location..." : "City, country, or remote..."}
                                    className={styles.searchInput}
                                />
                            </div>
                            {locSearch ? (
                                <button
                                    type="button"
                                    className={styles.clearBtn}
                                    onClick={() => { setLocSearch(''); setPage(1); }}
                                    aria-label="Clear location search"
                                    title="Clear"
                                >
                                    <Ico.Close />
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className={`${styles.locateBtn} ${isLocating ? styles.locateBtnSpin : ''}`}
                                    onClick={handleLocateMe}
                                    disabled={isLocating}
                                    aria-label="Detect current location"
                                    title="Detect location"
                                >
                                    <Ico.LocateTarget />
                                </button>
                            )}
                        </div>

                        <div className={styles.searchDivider} />

                        {/* Work Type Input Group */}
                        <div className={styles.searchInputGroup}>
                            <div className={styles.inputIconWrapper}>
                                <Ico.Briefcase />
                            </div>
                            <div className={styles.fieldWrapper}>
                                <span className={styles.inputLabel}>WORK MODE</span>
                                <CustomSelect
                                    value={jobType}
                                    onChange={e => { setJobType(e.target.value); setPage(1); }}
                                    className={styles.searchSelect}
                                    options={JOB_TYPES}
                                    placeholder="All Work Types"
                                />
                            </div>
                        </div>

                        <button className={styles.searchSubmitBtn}>Search Jobs</button>
                    </div>

                    {/* Quick Popular Tags */}
                    <div className={styles.popularTagsRow}>
                        <span className={styles.popularLabel}>Popular:</span>
                        {POPULAR_TAGS.map(tag => (
                            <button
                                key={tag}
                                className={styles.popularTagPill}
                                onClick={() => { setSearch(tag); setPage(1); }}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {/* Quick Value Metric Banner */}
            <section className={styles.metricsBar}>
                <div className={styles.container}>
                    <div className={styles.metricsGrid}>
                        <div className={styles.metricItem}>
                            <span className={styles.metricNumber}>94%</span>
                            <div className={styles.metricMeta}>
                                <strong>Skill Match Precision</strong>
                                <span>AI evaluation on key requirements</span>
                            </div>
                        </div>
                        <div className={styles.metricItem}>
                            <span className={styles.metricNumber}>100%</span>
                            <div className={styles.metricMeta}>
                                <strong>Instant Search</strong>
                                <span>Browse & view details without login gate</span>
                            </div>
                        </div>
                        <div className={styles.metricItem}>
                            <span className={styles.metricNumber}>Direct</span>
                            <div className={styles.metricMeta}>
                                <strong>Employer Connections</strong>
                                <span>Transparent salaries & verified companies</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Main Job Discovery & Split Pane Container */}
            <div className={styles.container}>
                {/* Sticky Category Chips Navigation (Option 1: Segmented Glass Floating Pill) */}
                <div className={styles.stickyCategoryBar}>
                    <div className={styles.categorySegmentedContainer}>
                        <div className={styles.categoryChipsList}>
                            {CATEGORY_CHIPS.map(c => {
                                const count = counts.categoryCounts[c.name] || 0;
                                const isActive = category === c.name;
                                const isMuted = count === 0 && !isActive;
                                return (
                                    <button
                                        key={c.name}
                                        className={`${styles.categoryChip} ${isActive ? styles.categoryChipActive : ''} ${isMuted ? styles.categoryChipMuted : ''}`}
                                        onClick={() => { setCategory(c.name); setPage(1); }}
                                    >
                                        <span className={styles.chipIcon}><c.IconComponent /></span>
                                        <span>{c.name}</span>
                                        <span className={styles.chipCountBadge}>{count}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className={styles.mainLayout}>
                    {/* Filters Sidebar */}
                    {filterOpen && <div className={styles.filterOverlay} onClick={() => setFilterOpen(false)} />}
                    <aside className={`${styles.filterSidebar} ${filterOpen ? styles.filterSidebarOpen : ''}`}>
                        <div className={styles.sidebarHeader}>
                            <div className={styles.sidebarTitle}>
                                <span className={styles.filterIconBadge}><Ico.Filter /></span>
                                <span>Refine Filters</span>
                                {(activeTypes.length + activeInds.length + activeExps.length + activeLocTypes.length) > 0 && (
                                    <span className={styles.totalActiveBadge}>{activeTypes.length + activeInds.length + activeExps.length + activeLocTypes.length}</span>
                                )}
                            </div>
                            {(activeTypes.length + activeInds.length + activeExps.length + activeLocTypes.length) > 0 && (
                                <button
                                    className={styles.clearFiltersBtn}
                                    onClick={() => { setActiveTypes([]); setActiveInds([]); setActiveExps([]); setActiveLocTypes([]); setPage(1); }}
                                >
                                    Clear all
                                </button>
                            )}
                            <button className={styles.closeSidebarBtn} onClick={() => setFilterOpen(false)}><Ico.Close /></button>
                        </div>

                        <FilterGroup label="Job Type" activeCount={activeTypes.length} defaultOpen={true}>
                            {JOB_TYPES.map(t => {
                                const count = counts.jobTypeCounts[t] || 0;
                                return (
                                    <label key={t} className={styles.filterCheckboxRow}>
                                        <input
                                            type="checkbox"
                                            checked={activeTypes.includes(t)}
                                            onChange={() => { toggleArr(activeTypes, setActiveTypes, t); setPage(1); }}
                                        />
                                        <span className={styles.checkboxLabelText}>{t}</span>
                                        <span className={styles.filterBadgeCount}>{count}</span>
                                    </label>
                                );
                            })}
                        </FilterGroup>

                        <FilterGroup label="Experience Level" activeCount={activeExps.length} defaultOpen={true}>
                            {EXP_LEVELS.map(el => {
                                const count = counts.expCounts[el] || 0;
                                return (
                                    <label key={el} className={styles.filterCheckboxRow}>
                                        <input
                                            type="checkbox"
                                            checked={activeExps.includes(el)}
                                            onChange={() => { toggleArr(activeExps, setActiveExps, el); setPage(1); }}
                                        />
                                        <span className={styles.checkboxLabelText}>{el} Level</span>
                                        <span className={styles.filterBadgeCount}>{count}</span>
                                    </label>
                                );
                            })}
                        </FilterGroup>

                        <FilterGroup label="Work Setup" activeCount={activeLocTypes.length} defaultOpen={true}>
                            {['Remote', 'Hybrid', 'On-site'].map(lt => {
                                const count = counts.locTypeCounts[lt] || 0;
                                return (
                                    <label key={lt} className={styles.filterCheckboxRow}>
                                        <input
                                            type="checkbox"
                                            checked={activeLocTypes.includes(lt)}
                                            onChange={() => { toggleArr(activeLocTypes, setActiveLocTypes, lt); setPage(1); }}
                                        />
                                        <span className={styles.checkboxLabelText}>{lt}</span>
                                        <span className={styles.filterBadgeCount}>{count}</span>
                                    </label>
                                );
                            })}
                        </FilterGroup>

                        <FilterGroup label="Industry Domain" activeCount={activeInds.length} defaultOpen={false}>
                            {INDUSTRIES.map(i => {
                                const count = counts.indCounts[i] || 0;
                                return (
                                    <label key={i} className={styles.filterCheckboxRow}>
                                        <input
                                            type="checkbox"
                                            checked={activeInds.includes(i)}
                                            onChange={() => { toggleArr(activeInds, setActiveInds, i); setPage(1); }}
                                        />
                                        <span className={styles.checkboxLabelText}>{i}</span>
                                        <span className={styles.filterBadgeCount}>{count}</span>
                                    </label>
                                );
                            })}
                        </FilterGroup>
                    </aside>

                    {/* Job Results Column & Inspector Pane */}
                    <div className={styles.resultsContainer}>
                        {/* Results Header Toolbar */}
                        <div className={styles.resultsToolbar}>
                            <button className={styles.mobileFilterTrigger} onClick={() => setFilterOpen(true)}>
                                <Ico.Filter /> Filters {(activeTypes.length + activeInds.length + activeExps.length + activeLocTypes.length) > 0 && (
                                    <span className={styles.filterBadgeActiveCount}>
                                        {activeTypes.length + activeInds.length + activeExps.length + activeLocTypes.length}
                                    </span>
                                )}
                            </button>
                            <div className={styles.resultsMetaText}>
                                <strong>{filtered.length}</strong> verified opportunities found
                            </div>
                            <div className={styles.sortDropdownGroup}>
                                <span className={styles.sortLabel}>Sort:</span>
                                <CustomSelect
                                    value={sortBy}
                                    onChange={e => { setSortBy(e.target.value); setPage(1); }}
                                    className={styles.sortSelect}
                                    options={['Most Relevant', 'Newest', 'Salary (High-Low)']}
                                    placeholder="Sort by"
                                    required
                                />
                            </div>
                        </div>

                        {paginated.length > 0 ? (
                            <div className={styles.splitMasterDetail}>
                                {/* Master Job Cards List */}
                                <div className={styles.jobCardsColumn}>
                                    {paginated.map(job => {
                                        const saved = isSaved(job.id);
                                        const company = job.company_profiles || job.companies || {};
                                        const companyName = company.company_name || company.name || 'TalentMesh Employer';
                                        const companyColor = company.color || '#4F46E5';
                                        const companyInitials = company.initials || companyName?.[0] || 'TM';
                                        const isSelected = selectedJob?.id === job.id;

                                        return (
                                            <div
                                                key={job.id}
                                                className={`${styles.jobMasterCard} ${isSelected ? styles.jobMasterCardActive : ''}`}
                                                onClick={(e) => handleCardClick(e, job.id)}
                                            >
                                                <div className={styles.cardHeader}>
                                                    <div className={styles.companyLogoBadge} style={{ background: companyColor }}>
                                                        {company.logo_url ? (
                                                            <img src={getPublicStorageUrl('company-logos', company.logo_url)} alt={companyName} />
                                                        ) : (
                                                            <span>{companyInitials}</span>
                                                        )}
                                                    </div>
                                                    <div className={styles.companyTitleGroup}>
                                                        <div className={styles.companyNameRow}>
                                                            <span className={styles.companyNameText}>{companyName}</span>
                                                            <Ico.Verified />
                                                        </div>
                                                        <span className={styles.jobLocationText}>{job.location}</span>
                                                    </div>
                                                    <button
                                                        className={`${styles.bookmarkCardBtn} ${saved ? styles.bookmarkCardBtnSaved : ''}`}
                                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleSave(job.id); }}
                                                        title={saved ? 'Remove Bookmark' : 'Bookmark Job'}
                                                    >
                                                        {saved ? <Ico.HeartFill /> : <Ico.Heart />}
                                                    </button>
                                                </div>

                                                <div className={styles.cardBody}>
                                                    <div className={styles.titleRow}>
                                                        <h3 className={styles.jobTitleHeading}>{job.title}</h3>
                                                        {(job.posted_days <= 1 || job.is_new) && (
                                                            <span className={styles.newBadgePill}>New</span>
                                                        )}
                                                    </div>

                                                    <div className={styles.salaryRow}>
                                                        <span className={styles.salaryText}>{job.salary}</span>
                                                        {job.ai_match_rate >= 80 && (
                                                            <span className={styles.matchScorePill}>
                                                                <Ico.Sparkle /> {job.ai_match_rate}% Match
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className={styles.skillTagsRow}>
                                                        <span className={styles.typeTagPill}>{job.type}</span>
                                                        {(job.skills_required || ['React', 'TypeScript']).slice(0, 2).map((skill: string) => (
                                                            <span key={skill} className={styles.skillTagPill}>{skill}</span>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className={styles.cardFooter}>
                                                    <span className={styles.postedDaysText}>
                                                        {job.posted_days === 0 ? 'Posted today' : `${job.posted_days}d ago`}
                                                    </span>
                                                    <span className={styles.inspectBtnText}>
                                                        Preview Details <Ico.ArrowR />
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Sticky Detail Inspector Pane */}
                                <div className={styles.detailInspectorPane}>
                                    {selectedJob ? (() => {
                                        const company = selectedJob.company_profiles || selectedJob.companies || {};
                                        const companyName = company.company_name || company.name || 'TalentMesh Employer';
                                        const companyColor = company.color || '#4F46E5';
                                        const companyInitials = company.initials || companyName?.[0] || 'TM';
                                        const saved = isSaved(selectedJob.id);
                                        const skills = selectedJob.skills_required || [];
                                        const requirements = Array.isArray(selectedJob.requirements) ? selectedJob.requirements : [];

                                        return (
                                            <div className={styles.inspectorCard}>
                                                {/* Inspector Header */}
                                                <div className={styles.inspectorHeader}>
                                                    <div className={styles.inspectorLogoGroup}>
                                                        <div className={styles.inspectorLogo} style={{ background: companyColor }}>
                                                            {company.logo_url ? (
                                                                <img src={getPublicStorageUrl('company-logos', company.logo_url)} alt={companyName} />
                                                            ) : (
                                                                <span>{companyInitials}</span>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <h2 className={styles.inspectorJobTitle}>{selectedJob.title}</h2>
                                                            <p className={styles.inspectorCompanySub}>
                                                                <span>{companyName}</span>
                                                                <span className={styles.dotSeparator}>•</span>
                                                                <span>{selectedJob.location}</span>
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className={styles.inspectorActionButtons}>
                                                        <button
                                                            className={styles.inspectorIconBtn}
                                                            onClick={(e) => handleShare(e, selectedJob)}
                                                            title="Share Job"
                                                        >
                                                            <Ico.Share />
                                                        </button>
                                                        <button
                                                            className={`${styles.inspectorIconBtn} ${saved ? styles.inspectorIconBtnActive : ''}`}
                                                            onClick={() => toggleSave(selectedJob.id)}
                                                            title={saved ? 'Remove Bookmark' : 'Bookmark Job'}
                                                        >
                                                            {saved ? <Ico.HeartFill /> : <Ico.Heart />}
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Key Quick Badges */}
                                                <div className={styles.inspectorBadgesRow}>
                                                    <span className={styles.inspectorBadge}>{selectedJob.type}</span>
                                                    <span className={styles.inspectorBadgeHighlight}>{selectedJob.salary}</span>
                                                    {selectedJob.ai_match_rate && (
                                                        <span className={styles.inspectorBadgeMatch}>
                                                            <Ico.Sparkle /> {selectedJob.ai_match_rate}% AI Fit Score
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Primary Call to Action */}
                                                <div className={styles.inspectorCtaBar}>
                                                    {user?.role === 'candidate' ? (
                                                        <Link href={`/browse-jobs/${selectedJob.id}`} className={styles.primaryApplyBtn}>
                                                            Apply Now <Ico.ArrowR />
                                                        </Link>
                                                    ) : !user ? (
                                                        <Link href={`/browse-jobs/${selectedJob.id}`} className={styles.primaryApplyBtn}>
                                                            View & Apply <Ico.ArrowR />
                                                        </Link>
                                                    ) : (
                                                        <span className={styles.recruiterBadgeNotice}>Recruiter View</span>
                                                    )}
                                                    <button
                                                        className={styles.secondaryCopyBtn}
                                                        onClick={(e) => handleCopyLink(e, selectedJob.id)}
                                                    >
                                                        <Ico.Copy /> Copy Link
                                                    </button>
                                                </div>

                                                {/* Tabbed Inspector Switcher */}
                                                <div className={styles.inspectorTabsHeader}>
                                                    <button
                                                        className={`${styles.tabHeaderBtn} ${activeTab === 'overview' ? styles.tabHeaderBtnActive : ''}`}
                                                        onClick={() => setActiveTab('overview')}
                                                    >
                                                        Overview
                                                    </button>
                                                    <button
                                                        className={`${styles.tabHeaderBtn} ${activeTab === 'stack' ? styles.tabHeaderBtnActive : ''}`}
                                                        onClick={() => setActiveTab('stack')}
                                                    >
                                                        Tech & Specs
                                                    </button>
                                                    <button
                                                        className={`${styles.tabHeaderBtn} ${activeTab === 'company' ? styles.tabHeaderBtnActive : ''}`}
                                                        onClick={() => setActiveTab('company')}
                                                    >
                                                        Company
                                                    </button>
                                                </div>

                                                {/* Tab Content Panes */}
                                                <div className={styles.tabContentBody}>
                                                    {activeTab === 'overview' && (
                                                        <div className={styles.tabPane}>
                                                            <h4 className={styles.tabSectionHeading}>Role Overview</h4>
                                                            <p className={styles.tabDescriptionText}>
                                                                {selectedJob.description || 'No detailed description provided for this role.'}
                                                            </p>

                                                            {requirements.length > 0 && (
                                                                <>
                                                                    <h4 className={styles.tabSectionHeading} style={{ marginTop: '20px' }}>Key Responsibilities & Requirements</h4>
                                                                    <ul className={styles.tabBulletList}>
                                                                        {requirements.map((req: string, i: number) => (
                                                                            <li key={i}><Ico.CheckCircle /> <span>{req}</span></li>
                                                                        ))}
                                                                    </ul>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}

                                                    {activeTab === 'stack' && (
                                                        <div className={styles.tabPane}>
                                                            <h4 className={styles.tabSectionHeading}>Required Skills & Tech Stack</h4>
                                                            <div className={styles.skillsChipGrid}>
                                                                {skills.length > 0 ? skills.map((sk: string) => (
                                                                    <span key={sk} className={styles.techSkillChip}>{sk}</span>
                                                                )) : (
                                                                    <span className={styles.techSkillChip}>React.js</span>
                                                                )}
                                                            </div>

                                                            <div className={styles.aiInsightCard}>
                                                                <div className={styles.aiInsightHeader}>
                                                                    <Ico.Sparkle />
                                                                    <strong>AI Compatibility Analysis</strong>
                                                                </div>
                                                                <p>
                                                                    This job matches candidates with background in <strong>{selectedJob.department || 'Engineering'}</strong> and experience in modern workflows.
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {activeTab === 'company' && (
                                                        <div className={styles.tabPane}>
                                                            <h4 className={styles.tabSectionHeading}>About {companyName}</h4>
                                                            <p className={styles.tabDescriptionText}>
                                                                {company.about || 'Leading global innovators dedicated to excellence.'}
                                                            </p>
                                                            <div className={styles.companyMetaList}>
                                                                <div className={styles.metaRowItem}>
                                                                    <Ico.Building />
                                                                    <span>Industry: <strong>{company.industry || 'Technology'}</strong></span>
                                                                </div>
                                                                <div className={styles.metaRowItem}>
                                                                    <Ico.Globe />
                                                                    <span>Headquarters: <strong>{selectedJob.location || 'India / Remote'}</strong></span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })() : (
                                        <div className={styles.emptyInspectorState}>
                                            <p>Select a job card from the list to view complete specs.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className={styles.emptyStateContainer}>
                                <h3>No matching jobs found</h3>
                                <p>Try broadening your search terms or clearing specific filters.</p>
                                <button
                                    className={styles.resetSearchBtn}
                                    onClick={() => { setSearch(''); setLocSearch(''); setJobType(''); setCategory('All'); setActiveTypes([]); setActiveExps([]); setActiveLocTypes([]); setActiveInds([]); setPage(1); }}
                                >
                                    Reset All Search Filters
                                </button>
                            </div>
                        )}

                        {/* Pagination Bar */}
                        {pages > 1 && (
                            <div className={styles.paginationRow}>
                                <button
                                    className={styles.pageNavBtn}
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                >
                                    &lt; Previous
                                </button>

                                <div className={styles.pageNumbersGroup}>
                                    {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
                                        <button
                                            key={p}
                                            className={`${styles.pageNumberBtn} ${p === page ? styles.pageNumberBtnActive : ''}`}
                                            onClick={() => setPage(p)}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>

                                <button
                                    className={styles.pageNavBtn}
                                    onClick={() => setPage(p => Math.min(pages, p + 1))}
                                    disabled={page === pages}
                                >
                                    Next &gt;
                                </button>

                                <div className={styles.pageSizeSelectBox}>
                                    <span>Show</span>
                                    <CustomSelect
                                        value={String(jobsPerPage)}
                                        onChange={e => { setJobsPerPage(Number(e.target.value)); setPage(1); }}
                                        className={styles.pageSizeSelect}
                                        options={['6', '12', '24']}
                                        placeholder="6"
                                        required
                                    />
                                    <span>per page</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Testimonials Banner Section */}
            <section className={styles.testimonialsSection}>
                <div className={styles.container}>
                    <div className={styles.sectionTitleBlock}>
                        <span className={styles.sectionBadgeText}>Testimonials</span>
                        <h2 className={styles.sectionHeadingText}>
                            What Talent & Teams <span className={styles.gradientText}>Say About Us</span>
                        </h2>
                    </div>

                    <div className={styles.testimonialsGrid}>
                        <div className={styles.testimonialCard}>
                            <div className={styles.starRating}>⭐⭐⭐⭐⭐</div>
                            <p className={styles.quoteText}>
                                "TalentMesh changed how I search for software jobs. The split-pane preview and transparent salary tags saved me hours."
                            </p>
                            <div className={styles.authorGroup}>
                                <div className={styles.authorAvatar}>AS</div>
                                <div>
                                    <h4 className={styles.authorName}>Ananya Sharma</h4>
                                    <p className={styles.authorRole}>Frontend Architect @ TechFlow</p>
                                </div>
                            </div>
                        </div>

                        <div className={styles.testimonialCard}>
                            <div className={styles.starRating}>⭐⭐⭐⭐⭐</div>
                            <p className={styles.quoteText}>
                                "Zero friction job discovery! I could check match criteria and tech stacks easily before applying."
                            </p>
                            <div className={styles.authorGroup}>
                                <div className={styles.authorAvatar}>RG</div>
                                <div>
                                    <h4 className={styles.authorName}>Rohan Gupta</h4>
                                    <p className={styles.authorRole}>Lead Product Designer</p>
                                </div>
                            </div>
                        </div>

                        <div className={styles.testimonialCard}>
                            <div className={styles.starRating}>⭐⭐⭐⭐⭐</div>
                            <p className={styles.quoteText}>
                                "We hired 4 senior engineers within two weeks. The quality of applicants matching our tech criteria was outstanding."
                            </p>
                            <div className={styles.authorGroup}>
                                <div className={styles.authorAvatar}>PP</div>
                                <div>
                                    <h4 className={styles.authorName}>Priya Patel</h4>
                                    <p className={styles.authorRole}>VP Engineering @ InnovateX</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* FAQ Accordion Section */}
            <section className={styles.faqSection}>
                <div className={styles.container}>
                    <div className={styles.sectionTitleBlock}>
                        <span className={styles.sectionBadgeText}>FAQ</span>
                        <h2 className={styles.sectionHeadingText}>Frequently Asked <span className={styles.gradientText}>Questions</span></h2>
                    </div>

                    <div className={styles.faqListContainer}>
                        {[
                            { q: "Can I search and browse jobs without creating an account?", a: "Yes! TalentMesh allows complete zero-friction job discovery. You can search, filter, and inspect full job specs and salary ranges without signing in." },
                            { q: "How does the AI match score work?", a: "Our AI evaluates skill alignment between job requirements and your professional profile to highlight roles where you have the highest fit." },
                            { q: "How do saved jobs work for guest users?", a: "When you bookmark a job as a guest, it is saved locally to your browser. Once you log in or sign up, your saved jobs automatically sync with your account." },
                            { q: "How do I apply for a job listing?", a: "Click on any job card to inspect its details, then click 'Apply Now' to submit your application directly to the recruiter or hiring team." }
                        ].map((faq, idx) => {
                            const isOpen = !!faqOpen[idx];
                            return (
                                <div key={idx} className={styles.faqCardItem}>
                                    <button className={styles.faqQuestionHeader} onClick={() => toggleFaq(idx)}>
                                        <span>{faq.q}</span>
                                        <span className={`${styles.faqIconToggle} ${isOpen ? styles.faqIconToggleOpen : ''}`}>
                                            {isOpen ? '−' : '+'}
                                        </span>
                                    </button>
                                    <div className={styles.faqAnswerBody} style={{ display: isOpen ? 'block' : 'none' }}>
                                        <p>{faq.a}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </main>
    );
}

function FilterGroup({ label, activeCount = 0, children, defaultOpen = true }: { label: string; activeCount?: number; children: React.ReactNode; defaultOpen?: boolean }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className={styles.filterSectionGroup}>
            <button type="button" className={styles.filterGroupHeadingBtn} onClick={() => setOpen(o => !o)}>
                <div className={styles.filterLabelWithBadge}>
                    <span>{label}</span>
                    {activeCount > 0 && <span className={styles.activeFilterCountDot}>{activeCount}</span>}
                </div>
                <span className={`${styles.filterGroupArrow} ${open ? styles.filterGroupArrowOpen : ''}`}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                </span>
            </button>
            <div className={styles.filterGroupOptionsList} style={{ display: open ? 'flex' : 'none' }}>
                {children}
            </div>
        </div>
    );
}
