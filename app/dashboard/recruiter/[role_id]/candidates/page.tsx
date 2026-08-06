"use client";
import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { insforge, invokeFunction } from '@/lib/insforge';
import { HomeSkeleton } from '@/components/ui/DashboardSkeleton';
import CandidateProfileDrawer from '@/components/recruiter/CandidateProfileDrawer';
import DataTable, { Column } from '@/components/dashboard/DataTable';
import FilterBar, { FilterDropdown } from '@/components/dashboard/FilterBar';
import StatusPill from '@/components/dashboard/StatusPill';
import { toast } from 'react-hot-toast';
import styles from './candidates.module.css';
import sharedStyles from '@/app/dashboard/shared-dashboard.module.css';

/* ─── Icons ─── */
const IC = {
    bookmark: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>,
    bookmarkFilled: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>,
};

type TabType = 'all' | 'shortlisted' | 'on_hold' | 'rejected' | 'saved';

export default function CandidatesPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const roleId = params.role_id as string;
    const { user } = useAuth();

    // Tab state from URL query parameter or default to 'all'
    const [activeTab, setActiveTab] = useState<TabType>(() => {
        const tab = searchParams.get('tab');
        if (['all', 'shortlisted', 'on_hold', 'rejected', 'saved'].includes(tab || '')) {
            return tab as TabType;
        }
        return 'all';
    });

    const [candidates, setCandidates] = useState<any[]>([]);
    const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);

    // Filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [experienceFilter, setExperienceFilter] = useState('');
    const [locationFilter, setLocationFilter] = useState('');
    const [jobFilter, setJobFilter] = useState('');

    // Unique locations and jobs for select filters
    const [locationOptions, setLocationOptions] = useState<string[]>([]);
    const [jobOptions, setJobOptions] = useState<{ id: string; title: string }[]>([]);

    // Tab counts
    const [counts, setCounts] = useState({
        all: 0,
        shortlisted: 0,
        on_hold: 0,
        rejected: 0,
        saved: 0
    });

    // Sync tab query param
    const handleTabChange = (tab: TabType) => {
        setActiveTab(tab);
        const url = new URL(window.location.href);
        url.searchParams.set('tab', tab);
        router.push(url.pathname + url.search);
    };

    // Load static filters and counts
    const loadMetadata = useCallback(async () => {
        if (!user?.id) return;
        try {
            // Shortlisted Applications count
            const { count: sCount } = await insforge.database
                .from('applications')
                .select('id, jobs!inner(company_id)', { count: 'exact', head: true })
                .eq('status', 'shortlisted');

            // On Hold Applications count
            const { count: hCount } = await insforge.database
                .from('applications')
                .select('id, jobs!inner(company_id)', { count: 'exact', head: true })
                .eq('status', 'reviewing');

            // Rejected Applications count
            const { count: rCount } = await insforge.database
                .from('applications')
                .select('id, jobs!inner(company_id)', { count: 'exact', head: true })
                .eq('status', 'rejected');

            // Saved Candidates count
            const { count: svCount } = await insforge.database
                .from('saved_candidates')
                .select('candidate_id', { count: 'exact', head: true })
                .eq('recruiter_id', user.id);

            setCounts(prev => ({
                ...prev,
                shortlisted: sCount || 0,
                on_hold: hCount || 0,
                rejected: rCount || 0,
                saved: svCount || 0
            }));

            // Load jobs posted by this recruiter for filtering
            const { data: jobsData } = await insforge.database
                .from('jobs')
                .select('id, title');
            if (jobsData) setJobOptions(jobsData);

            // Load saved candidate IDs set to render bookmark status
            const { data: savedList } = await insforge.database
                .from('saved_candidates')
                .select('candidate_id')
                .eq('recruiter_id', user.id);
            if (savedList) {
                setSavedIds(new Set(savedList.map((row: any) => row.candidate_id)));
            }

        } catch (e) {
            console.error('Failed to load candidate metadata:', e);
        }
    }, [user?.id]);

    // Main Fetch logic
    const fetchData = useCallback(async () => {
        if (!user?.id) return;
        setLoading(true);

        try {
            if (activeTab === 'all') {
                // Call global candidates search API
                const currentQuery: any = { page: '0', limit: '200' };
                const { data, error } = await invokeFunction('candidates', {
                    method: 'GET',
                    queries: currentQuery
                });
                if (error) throw error;
                const list = data?.data || [];
                setCandidates(list);
                setCounts(prev => ({ ...prev, all: list.length }));

                // Dynamically collect locations
                const locs = Array.from(new Set(list.map((c: any) => c.location).filter(Boolean))) as string[];
                setLocationOptions(locs);
            } 
            else if (['shortlisted', 'on_hold', 'rejected'].includes(activeTab)) {
                const dbStatus = activeTab === 'shortlisted' ? 'shortlisted' : activeTab === 'on_hold' ? 'reviewing' : 'rejected';
                const { data, error } = await insforge.database
                    .from('applications')
                    .select(`
                        id,
                        status,
                        applied_at,
                        candidate:profiles!candidate_id(
                            id,
                            name,
                            location,
                            avatar_url,
                            candidate_profiles(headline, skills, experience_years)
                        ),
                        jobs!inner(id, title, recruiter_id)
                    `)
                    .eq('status', dbStatus)
                    .order('applied_at', { ascending: false });

                if (error) throw error;

                const mapped = (data || []).map((row: any) => {
                    const p = row.candidate;
                    if (!p) return null;
                    const cp = Array.isArray(p.candidate_profiles) ? p.candidate_profiles[0] : p.candidate_profiles;
                    return {
                        id: p.id,
                        name: p.name,
                        location: p.location || 'Remote',
                        role: cp?.headline || 'Candidate',
                        skills: cp?.skills || [],
                        avatarUrl: p.avatar_url,
                        experience_years: cp?.experience_years || 0,
                        jobId: row.jobs?.id,
                        jobTitle: row.jobs?.title || '—',
                        appliedAt: row.applied_at
                    };
                }).filter(Boolean);

                setCandidates(mapped);
                setCounts(prev => ({ ...prev, [activeTab]: mapped.length }));
            }
            else if (activeTab === 'saved') {
                const { data, error } = await insforge.database
                    .from('saved_candidates')
                    .select('candidate_id, candidate:profiles!candidate_id(id, name, location, avatar_url, candidate_profiles(headline, skills, experience_years))')
                    .eq('recruiter_id', user.id)
                    .order('created_at', { ascending: false });

                if (error) throw error;

                const mapped = (data || []).map((row: any) => {
                    const p = row.candidate;
                    if (!p) return null;
                    const cp = Array.isArray(p.candidate_profiles) ? p.candidate_profiles[0] : p.candidate_profiles;
                    return {
                        id: p.id,
                        name: p.name,
                        location: p.location || 'Remote',
                        role: cp?.headline || 'Candidate',
                        skills: cp?.skills || [],
                        avatarUrl: p.avatar_url,
                        experience_years: cp?.experience_years || 0
                    };
                }).filter(Boolean);

                setCandidates(mapped);
                setCounts(prev => ({ ...prev, saved: mapped.length }));
            }
        } catch (e: any) {
            console.error('Fetch error:', e);
            toast.error(e.message || 'Failed to load candidates');
        } finally {
            setLoading(false);
        }
    }, [activeTab, user?.id]);

    useEffect(() => {
        loadMetadata();
    }, [loadMetadata]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Handle Bookmark toggle
    const toggleBookmark = async (e: React.MouseEvent, candidateId: string) => {
        e.stopPropagation();
        if (!user?.id) return;
        const isSaved = savedIds.has(candidateId);

        try {
            if (isSaved) {
                await insforge.database
                    .from('saved_candidates')
                    .delete()
                    .eq('recruiter_id', user.id)
                    .eq('candidate_id', candidateId);
                
                setSavedIds(prev => {
                    const next = new Set(prev);
                    next.delete(candidateId);
                    return next;
                });
                toast.success('Candidate removed from bookmarks');
                if (activeTab === 'saved') {
                    setCandidates(prev => prev.filter(c => c.id !== candidateId));
                }
            } else {
                await insforge.database
                    .from('saved_candidates')
                    .insert([{ recruiter_id: user.id, candidate_id: candidateId }]);

                setSavedIds(prev => {
                    const next = new Set(prev);
                    next.add(candidateId);
                    return next;
                });
                toast.success('Candidate bookmarked successfully');
            }
            loadMetadata();
        } catch (err) {
            console.error('Bookmark error:', err);
            toast.error('Failed to update bookmark');
        }
    };

    // Client-side filtering across candidates list
    const filteredCandidates = useMemo(() => {
        let list = candidates;

        // 1. Search Query (Matches Name, Role, Location, Skills, Job Title)
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(c => 
                (c.name || '').toLowerCase().includes(q) ||
                (c.role || '').toLowerCase().includes(q) ||
                (c.location || '').toLowerCase().includes(q) ||
                (c.jobTitle || '').toLowerCase().includes(q) ||
                (c.skills || []).some((s: string) => s.toLowerCase().includes(q))
            );
        }

        // 2. Experience Filter
        if (experienceFilter) {
            const [minStr] = experienceFilter.split('-');
            const min = parseInt(minStr);
            list = list.filter(c => {
                const exp = parseInt(c.experience_years || '0');
                if (experienceFilter === '10+') return exp >= 10;
                return exp >= min;
            });
        }

        // 3. Location Filter
        if (locationFilter) {
            list = list.filter(c => (c.location || '').toLowerCase() === locationFilter.toLowerCase());
        }

        // 4. Job Filter (For application tabs)
        if (jobFilter && ['shortlisted', 'on_hold', 'rejected'].includes(activeTab)) {
            list = list.filter(c => c.jobId === jobFilter);
        }

        return list;
    }, [candidates, searchQuery, experienceFilter, locationFilter, jobFilter, activeTab]);

    // Setup filter dropdowns configuration for FilterBar
    const filters: FilterDropdown[] = useMemo(() => {
        const result: FilterDropdown[] = [
            {
                key: 'experience',
                label: 'Experience',
                options: [
                    { value: '0-1', label: '0-1 yrs' },
                    { value: '1-3', label: '1-3 yrs' },
                    { value: '3-5', label: '3-5 yrs' },
                    { value: '5-10', label: '5-10 yrs' },
                    { value: '10+', label: '10+ yrs' }
                ],
                value: experienceFilter,
                onChange: setExperienceFilter
            },
            {
                key: 'location',
                label: 'Location',
                options: locationOptions.map(l => ({ value: l, label: l })),
                value: locationFilter,
                onChange: setLocationFilter
            }
        ];

        // Add Job filter if on application tabs
        if (['shortlisted', 'on_hold', 'rejected'].includes(activeTab)) {
            result.push({
                key: 'job',
                label: 'Job Position',
                options: jobOptions.map(j => ({ value: j.id, label: j.title })),
                value: jobFilter,
                onChange: setJobFilter
            });
        }

        return result;
    }, [experienceFilter, locationFilter, locationOptions, jobFilter, jobOptions, activeTab]);

    // Handle clearing all filters
    const handleClearAll = () => {
        setSearchQuery('');
        setExperienceFilter('');
        setLocationFilter('');
        setJobFilter('');
    };

    // Columns config for DataTable
    const columns: Column<any>[] = useMemo(() => {
        const cols: Column<any>[] = [
            {
                header: 'Candidate',
                key: 'name',
                render: (c) => (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {c.avatarUrl ? (
                            <img src={c.avatarUrl} alt="" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-blue), #2563eb)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 800 }}>
                                {(c.name || 'C').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 700, color: 'var(--tm-text-primary)' }}>{c.name}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--tm-text-secondary)' }}>{c.role}</span>
                        </div>
                    </div>
                )
            },
            {
                header: 'Location',
                key: 'location',
                render: (c) => <span>{c.location || 'Remote'}</span>
            },
            {
                header: 'Experience',
                key: 'experience_years',
                render: (c) => <span>{c.experience_years} yrs</span>
            }
        ];

        // Job Title column for specific stages
        if (['shortlisted', 'on_hold', 'rejected'].includes(activeTab)) {
            cols.push({
                header: 'Applied Position',
                key: 'jobTitle',
                render: (c) => <span style={{ fontWeight: 600, color: 'var(--primary-blue)' }}>{c.jobTitle}</span>
            });
        }

        // Skills demand chips
        cols.push({
            header: 'Top Skills',
            key: 'skills',
            render: (c) => (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    {(c.skills || []).slice(0, 4).map((s: string) => {
                        const isMatch = searchQuery && s.toLowerCase().includes(searchQuery.toLowerCase());
                        return (
                            <span 
                                key={s} 
                                style={{ 
                                    fontSize: '0.7rem', 
                                    padding: '2px 6px', 
                                    borderRadius: '4px',
                                    background: isMatch ? 'var(--status-warning-bg)' : 'var(--tm-surface-muted)',
                                    color: isMatch ? 'var(--status-warning-text)' : 'var(--tm-text-secondary)',
                                    border: isMatch ? '1px solid var(--status-warning-text)' : '1px solid var(--tm-border)',
                                    fontWeight: isMatch ? 700 : 500
                                }}
                            >
                                {s}
                            </span>
                        );
                    })}
                    {(c.skills || []).length > 4 && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--tm-text-secondary)', padding: '2px 4px' }}>
                            +{(c.skills || []).length - 4}
                        </span>
                    )}
                </div>
            )
        });

        // Actions
        cols.push({
            header: 'Actions',
            key: 'actions',
            align: 'right',
            render: (c) => (
                <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
                    <button
                        onClick={() => setSelectedCandidateId(c.id)}
                        className={styles.candViewBtn}
                    >
                        View Profile
                    </button>
                    <button
                        onClick={(e) => toggleBookmark(e, c.id)}
                        className={styles.candBookmarkBtn}
                        style={{ color: savedIds.has(c.id) ? '#eab308' : 'var(--tm-text-secondary)' }}
                        title={savedIds.has(c.id) ? "Remove Bookmark" : "Bookmark Candidate"}
                    >
                        {savedIds.has(c.id) ? IC.bookmarkFilled : IC.bookmark}
                    </button>
                </div>
            )
        });

        return cols;
    }, [savedIds, activeTab, searchQuery]);

    return (
        <div className={sharedStyles.dash}>
            {/* Page Header */}
            <div className={sharedStyles.pageHeader}>
                <div className={sharedStyles.pageHeaderContent}>
                    <h1 className={sharedStyles.pageHeaderTitle}>Candidate Database</h1>
                    <p className={sharedStyles.pageHeaderSub}>Review candidates, screen applications, and manage your shortlist.</p>
                </div>
            </div>

            {/* Folder Tab Strip */}
            <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--tm-border)', paddingBottom: '0.25rem', flexWrap: 'wrap' }}>
                {[
                    { key: 'all', label: 'All Candidates', count: counts.all || filteredCandidates.length },
                    { key: 'shortlisted', label: 'Shortlisted', count: counts.shortlisted },
                    { key: 'on_hold', label: 'On Hold', count: counts.on_hold },
                    { key: 'rejected', label: 'Rejected', count: counts.rejected },
                    { key: 'saved', label: 'Saved Searches', count: counts.saved }
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

            {/* FilterBar & DataTable wrapper */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--tm-surface)', border: '1px solid var(--tm-border)', borderRadius: 'var(--tm-card-radius)', padding: '1.5rem', marginTop: '0.5rem' }}>
                <FilterBar
                    search={searchQuery}
                    onSearchChange={setSearchQuery}
                    searchPlaceholder="Search candidates by name, role, location, or skill..."
                    filters={filters}
                    onClearAll={handleClearAll}
                />

                <DataTable
                    columns={columns}
                    data={filteredCandidates}
                    loading={loading}
                    onRowClick={(row) => setSelectedCandidateId(row.id)}
                    emptyState={
                        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--tm-border)" strokeWidth="1.5" style={{ marginBottom: '1rem' }}>
                                <circle cx="12" cy="12" r="10" />
                                <path d="m21 21-4.3-4.3" />
                            </svg>
                            <p style={{ fontWeight: 600, color: 'var(--tm-text-primary)' }}>No candidates found</p>
                            <p style={{ fontSize: '0.85rem', color: 'var(--tm-text-secondary)', marginTop: '0.25rem' }}>Try clearing filters or adjusting your search keywords.</p>
                        </div>
                    }
                />
            </div>

            {/* Candidate Details Drawer */}
            <CandidateProfileDrawer
                candidateId={selectedCandidateId}
                onClose={() => {
                    setSelectedCandidateId(null);
                    // Refresh data after drawer closes to sync status changes
                    fetchData();
                    loadMetadata();
                }}
            />
        </div>
    );
}
