'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@insforge/sdk';
import { useAuth } from '@/lib/auth/AuthContext';
import styles from './UniversalSearch.module.css';

const insforge = createClient({
    baseUrl: typeof window !== 'undefined' ? `${window.location.origin}/api/v1/remote` : (process.env.NEXT_PUBLIC_INSFORGE_URL || ''),
    anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || ''
});

interface SearchResult {
    type: 'candidate' | 'recruiter' | 'job' | 'company' | 'application';
    id: string;
    title: string;
    subtitle: string;
    avatar?: string;
    status?: string;
}

export default function UniversalSearch() {
    const router = useRouter();
    const { user } = useAuth();
    const isRecruiter = user?.role === 'recruiter';
    const roleId = user?.role_id || '';
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<{ [key: string]: SearchResult[] }>({});
    const [isFocused, setIsFocused] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Keyboard shortcut Cmd/Ctrl + K
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                inputRef.current?.focus();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) && !inputRef.current?.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const performSearch = useCallback(async (q: string) => {
        if (q.length < 2) {
            setResults({});
            setShowDropdown(false);
            return;
        }

        setIsLoading(true);
        setShowDropdown(true);

        try {
            const [candidates, recruiters, jobs, companies, applications] = await Promise.all([
                // Candidates
                insforge.database.from('profiles')
                    .select('id, name, email, avatar_url')
                    .eq('role', 'candidate')
                    .or(`name.ilike.%${q}%,email.ilike.%${q}%`)
                    .limit(3),
                
                // Recruiters
                insforge.database.from('profiles')
                    .select('id, name, email, recruiter_profiles(companies(name))')
                    .eq('role', 'recruiter')
                    .or(`name.ilike.%${q}%,email.ilike.%${q}%`)
                    .limit(3),
                
                // Jobs
                insforge.database.from('jobs')
                    .select('id, title, status, companies(name)')
                    .or(`title.ilike.%${q}%,companies.name.ilike.%${q}%`)
                    .limit(3),
                
                // Companies
                insforge.database.from('companies')
                    .select('id, name, logo_url')
                    .ilike('name', `%${q}%`)
                    .limit(2),
                
                // Applications
                insforge.database.from('applications')
                    .select('id, status, profiles(name), jobs(title)')
                    .or(`profiles.name.ilike.%${q}%,jobs.title.ilike.%${q}%`)
                    .limit(2)
            ]);

            const mappedResults: { [key: string]: SearchResult[] } = {
                Candidates: (candidates.data || []).map((c: any) => ({
                    type: 'candidate',
                    id: c.id,
                    title: c.name,
                    subtitle: c.email,
                    avatar: c.avatar_url
                })),
                Recruiters: (recruiters.data || []).map((r: any) => ({
                    type: 'recruiter',
                    id: r.id,
                    title: r.name,
                    subtitle: r.recruiter_profiles?.companies?.name || r.email
                })),
                Jobs: (jobs.data || []).map((j: any) => ({
                    type: 'job',
                    id: j.id,
                    title: j.title,
                    subtitle: j.companies?.name || 'Unknown Company',
                    status: j.status
                })),
                Companies: (companies.data || []).map((c: any) => ({
                    type: 'company',
                    id: c.id,
                    title: c.name,
                    avatar: c.logo_url,
                    subtitle: 'Company'
                })),
                Applications: (applications.data || []).map((a: any) => ({
                    type: 'application',
                    id: a.id,
                    title: a.profiles?.name || 'Applicant',
                    subtitle: a.jobs?.title || 'Job Application',
                    status: a.status
                }))
            };

            // Remove empty sections
            const filteredResults = Object.keys(mappedResults).reduce((acc: any, key) => {
                if (mappedResults[key].length > 0) acc[key] = mappedResults[key];
                return acc;
            }, {});

            setResults(filteredResults);
        } catch (error) {
            console.error('Universal Search Error:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (query) performSearch(query);
        }, 300);
        return () => clearTimeout(timer);
    }, [query, performSearch]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            if (isRecruiter && roleId) {
                router.push(`/dashboard/recruiter/${roleId}/candidates/search?search=${encodeURIComponent(query)}`);
            } else {
                router.push(`/dashboard/admin/search?q=${encodeURIComponent(query)}`);
            }
            setShowDropdown(false);
        }
    };

    const handleResultClick = (result: SearchResult) => {
        if (isRecruiter && roleId) {
            const paths: Record<string, string> = {
                candidate: `/dashboard/recruiter/${roleId}/candidates/search?search=${encodeURIComponent(result.title)}`,
                job: `/dashboard/recruiter/${roleId}/jobs`,
                company: `/dashboard/recruiter/${roleId}/company`,
                application: `/dashboard/recruiter/${roleId}/pipeline`
            };
            router.push(paths[result.type] || `/dashboard/recruiter/${roleId}`);
        } else {
            const paths: Record<string, string> = {
                candidate: `/dashboard/admin/candidates/${result.id}`,
                recruiter: `/dashboard/admin/recruiters/${result.id}`,
                job: `/dashboard/admin/jobs/${result.id}`,
                company: `/dashboard/admin/companies/${result.id}`,
                application: `/dashboard/admin/applications/${result.id}`
            };
            router.push(paths[result.type]);
        }
        setShowDropdown(false);
    };

    const totalCount = Object.values(results).reduce((sum, section) => sum + section.length, 0);

    return (
        <div className={`${styles.searchWrapper} ${isFocused ? styles.searchWrapperExpanded : ''}`}>
            <div className={styles.searchContainer}>
                <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                </svg>
                <input
                    ref={inputRef}
                    type="text"
                    className={styles.input}
                    placeholder="Search anything..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    onKeyDown={handleKeyDown}
                />
                <kbd className={styles.shortcut}>
                    <span>⌘</span>K
                </kbd>
            </div>

            {showDropdown && query.length >= 2 && (
                <div className={styles.dropdown} ref={dropdownRef}>
                    {isLoading ? (
                        <div className={styles.loading}>
                            <div className={styles.spinner}></div>
                            Searching...
                        </div>
                    ) : totalCount > 0 ? (
                        <>
                            {Object.entries(results).map(([section, items]) => (
                                <div key={section} className={styles.section}>
                                    <div className={styles.sectionHeader}>{section}</div>
                                    {items.map((item) => (
                                        <div 
                                            key={`${item.type}-${item.id}`} 
                                            className={styles.resultItem}
                                            onClick={() => handleResultClick(item)}
                                        >
                                            <div className={styles.avatar}>
                                                {item.avatar ? (
                                                    <img src={item.avatar} alt={item.title} />
                                                ) : (
                                                    item.title.charAt(0).toUpperCase()
                                                )}
                                            </div>
                                            <div className={styles.resultInfo}>
                                                <span className={styles.resultTitle}>{item.title}</span>
                                                <span className={styles.resultSubtitle}>{item.subtitle}</span>
                                            </div>
                                            {item.status && (
                                                <span className={styles.statusBadge} style={{ 
                                                    background: item.status === 'active' || item.status === 'open' ? '#ecfdf5' : '#fef2f2',
                                                    color: item.status === 'active' || item.status === 'open' ? '#059669' : '#dc2626'
                                                }}>
                                                    {item.status}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ))}
                            <div 
                                className={styles.footer}
                                onClick={() => router.push(`/dashboard/admin/search?q=${encodeURIComponent(query)}`)}
                            >
                                See all results for "{query}"
                            </div>
                        </>
                    ) : (
                        <div className={styles.empty}>
                            No results found for "{query}"
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
