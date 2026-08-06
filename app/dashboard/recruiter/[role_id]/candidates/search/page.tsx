"use client";
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { invokeFunction } from '@/lib/insforge';
import { HomeSkeleton } from '@/components/ui/DashboardSkeleton';
import CandidateProfileDrawer from '@/components/recruiter/CandidateProfileDrawer';
import { CustomSelect } from '@/components/ui/CustomSelect';
import styles from '../../../../shared-dashboard.module.css';

/* ─── Icons ─── */
const IC = {
    search: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>,
    tag: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2H2v10l9.29 9.29c.39.39 1.02.39 1.41 0l7.59-7.59c.39-.39.39-1.02 0-1.41L12 2z"/><circle cx="7" cy="7" r="1" fill="currentColor"/></svg>,
    mapPin: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>,
    x: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>,
    sort: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M7 12h10M11 18h2"/></svg>,
    users: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.3" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
};

const EXP_OPTIONS = ['Any', '0-1 yrs', '1-3 yrs', '3-5 yrs', '5-10 yrs', '10+ yrs'];
const SORT_OPTIONS = [
    { label: 'Name A–Z',   value: 'name_asc' },
    { label: 'Name Z–A',   value: 'name_desc' },
];

/* ─── Rectangular keyword highlight ─── */
function Highlight({ text, keywords }: { text: string; keywords: string[] }) {
    if (!text) return <>{text}</>;
    const active = keywords.filter(k => k.length >= 1);
    if (active.length === 0) return <>{text}</>;

    const escaped = active.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex = new RegExp(`(${escaped.join('|')})`, 'gi');
    const parts = text.split(regex);

    return (
        <>
            {parts.map((part, i) =>
                regex.test(part) ? (
                    <span
                        key={i}
                        style={{
                            background: '#fde047',      /* amber-yellow fill */
                            color: '#000',               /* pure black text   */
                            borderRadius: '2px',         /* rectangle shape   */
                            padding: '0 2px',
                            outline: '1.5px solid #ca8a04',  /* dark amber border = rectangle */
                            outlineOffset: '0px',
                            fontWeight: 700,
                            display: 'inline',
                        }}
                    >
                        {part}
                    </span>
                ) : (
                    part
                )
            )}
        </>
    );
}

/* ─── Main Component ─── */
export default function CandidateSearchPage() {
    const params = useParams();
    const roleId = params.role_id as string;

    const [allCandidates, setAllCandidates] = useState<any[]>([]);
    const [initialLoading, setInitialLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    /* Filter state */
    const [keyword, setKeyword]       = useState('');   // global — searches ALL fields
    const [skills, setSkills]         = useState('');
    const [location, setLocation]     = useState('');
    const [experience, setExperience] = useState('Any');
    const [sort, setSort]             = useState('name_asc');

    const inputRef = useRef<HTMLInputElement>(null);

    /* ── Load ALL candidates once on mount ── */
    useEffect(() => {
        const load = async () => {
            const { data } = await invokeFunction('candidates', {
                method: 'GET',
                queries: { page: '0', limit: '500' },
            });
            setAllCandidates(data?.data || []);
            setInitialLoading(false);
        };
        load();
        // autofocus keyword input
        setTimeout(() => inputRef.current?.focus(), 200);
    }, []);

    /* ── Build active keywords for highlighting ── */
    const keywords = useMemo(() => {
        const raw = [
            ...keyword.split(/[\s,]+/),
            ...skills.split(/[\s,]+/),
            ...location.split(/[\s,]+/),
        ].map(w => w.trim()).filter(w => w.length >= 1);
        return [...new Set(raw)];
    }, [keyword, skills, location]);

    /* ── Instant client-side filter ── */
    const filtered = useMemo(() => {
        let list = allCandidates;

        /* 1. Global keyword — match name, role, skills, location, summary, experience, education */
        if (keyword.trim()) {
            const kws = keyword.toLowerCase().split(/[\s,]+/).filter(Boolean);
            list = list.filter(c => {
                const eduList = c.education ? (Array.isArray(c.education) ? c.education : (c.education as any).history || []) : [];
                const certList = c.education && !Array.isArray(c.education) ? (c.education as any).certificates || [] : [];
                const experienceDesc = (c.work_history || []).map((exp: any) => `${exp.company || ''} ${exp.title || exp.role || ''} ${exp.description || ''}`).join(' ');
                const educationDesc = eduList.map((edu: any) => `${edu.institution || ''} ${edu.degree || ''} ${edu.field_of_study || edu.field || ''}`).join(' ');
                const certificateDesc = certList.map((cert: any) => `${cert.name || ''} ${cert.issuer || ''}`).join(' ');
                const haystack = [
                    c.name, c.role, c.location, c.summary || '',
                    ...(c.skills || []),
                    experienceDesc,
                    educationDesc,
                    certificateDesc
                ].join(' ').toLowerCase();
                return kws.every(kw => haystack.includes(kw));
            });
        }

        /* 2. Skills filter */
        if (skills.trim()) {
            const skw = skills.toLowerCase().split(/[\s,]+/).filter(Boolean);
            list = list.filter(c =>
                skw.some(kw => (c.skills || []).some((s: string) => s.toLowerCase().includes(kw)))
            );
        }

        /* 3. Location filter */
        if (location.trim()) {
            const loc = location.toLowerCase();
            list = list.filter(c => (c.location || '').toLowerCase().includes(loc));
        }

        /* 4. Experience filter */
        if (experience !== 'Any') {
            const [minStr] = experience.split('-');
            const min = parseInt(minStr);
            list = list.filter(c => {
                const exp = parseInt(c.experience_years || '0');
                if (experience === '10+ yrs') return exp >= 10;
                return exp >= min;
            });
        }

        /* 5. Sort */
        if (sort === 'name_asc')  list = [...list].sort((a, b) => a.name?.localeCompare(b.name));
        if (sort === 'name_desc') list = [...list].sort((a, b) => b.name?.localeCompare(a.name));
        return list;
    }, [allCandidates, keyword, skills, location, experience, sort]);

    const clearAll = useCallback(() => {
        setKeyword(''); setSkills(''); setLocation(''); setExperience('Any');
    }, []);

    const hasFilters = keyword || skills || location || experience !== 'Any';

    /* skill tag match check */
    const isSkillMatch = (skill: string) =>
        keywords.some(kw => skill.toLowerCase().includes(kw.toLowerCase()));

    if (initialLoading) return <HomeSkeleton />;

    return (
        <div className={styles.dash}>
            {/* ── Page header ── */}
            <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                    <h1 className={styles.pageTitle}>Candidate Search</h1>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 2 }}>
                        Type any keyword — matches are highlighted instantly across all fields
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {IC.sort}
                    <CustomSelect
                        value={sort}
                        onChange={e => setSort(e.target.value)}
                        options={SORT_OPTIONS}
                        style={{ width: '140px' }}
                    />
                </div>
            </div>

            {/* ── Global keyword bar (primary) ── */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                background: '#fff', border: '2px solid #2557a7', borderRadius: '14px',
                padding: '0.75rem 1rem', marginBottom: '1rem',
                boxShadow: '0 4px 20px rgba(37,87,167,0.12)',
            }}>
                <span style={{ color: '#2557a7', flexShrink: 0, display: 'flex' }}>{IC.search}</span>
                <input
                    ref={inputRef}
                    value={keyword}
                    onChange={e => setKeyword(e.target.value)}
                    placeholder="Search any keyword — name, role, skill, location… (highlights matches instantly)"
                    style={{
                        border: 'none', background: 'transparent', flex: 1,
                        fontSize: '0.9375rem', outline: 'none', color: '#0f172a',
                        fontWeight: keyword ? 500 : 400,
                    }}
                />
                {keyword && (
                    <button onClick={() => setKeyword('')} style={{ background: '#f1f5f9', border: 'none', borderRadius: '6px', padding: '3px 6px', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center' }}>
                        {IC.x}
                    </button>
                )}
                <span style={{
                    background: '#eff6ff', color: '#2557a7', fontWeight: 700,
                    fontSize: '0.8rem', padding: '3px 10px', borderRadius: '99px', flexShrink: 0,
                }}>
                    {filtered.length} / {allCandidates.length}
                </span>
            </div>

            {/* ── Additional filters ── */}
            <div style={{
                background: '#f8fafc', border: '1px solid #e8edf3', borderRadius: '12px',
                padding: '0.875rem 1rem', marginBottom: '1.5rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
                gap: '0.625rem',
            }}>
                {/* Skills filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '9px', padding: '0.45rem 0.75rem' }}>
                    <span style={{ color: '#94a3b8', flexShrink: 0, display: 'flex' }}>{IC.tag}</span>
                    <input
                        value={skills}
                        onChange={e => setSkills(e.target.value)}
                        placeholder="Filter by skill…"
                        style={{ border: 'none', background: 'transparent', fontSize: '0.8125rem', width: '100%', outline: 'none', color: '#0f172a' }}
                    />
                    {skills && <button onClick={() => setSkills('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', padding: 0 }}>{IC.x}</button>}
                </div>

                {/* Location filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '9px', padding: '0.45rem 0.75rem' }}>
                    <span style={{ color: '#94a3b8', flexShrink: 0, display: 'flex' }}>{IC.mapPin}</span>
                    <input
                        value={location}
                        onChange={e => setLocation(e.target.value)}
                        placeholder="Filter by location…"
                        style={{ border: 'none', background: 'transparent', fontSize: '0.8125rem', width: '100%', outline: 'none', color: '#0f172a' }}
                    />
                    {location && <button onClick={() => setLocation('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', padding: 0 }}>{IC.x}</button>}
                </div>

                {/* Experience */}
                <CustomSelect
                    value={experience}
                    onChange={e => setExperience(e.target.value)}
                    options={EXP_OPTIONS}
                />

                {/* Clear all */}
                {hasFilters && (
                    <button
                        onClick={clearAll}
                        style={{
                            background: '#fff1f2', border: '1px solid #fca5a5', borderRadius: '9px',
                            color: '#ef4444', fontSize: '0.8125rem', fontWeight: 600, padding: '0.45rem 1rem',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                        }}
                    >
                        {IC.x} Clear all
                    </button>
                )}
            </div>

            {/* ── Active keyword chips ── */}
            {keywords.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>Highlighting:</span>
                    {keywords.map(kw => (
                        <span key={kw} style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            background: '#fde047', color: '#000', fontWeight: 700,
                            fontSize: '0.75rem', padding: '2px 8px', borderRadius: '2px',
                            outline: '1.5px solid #ca8a04',
                        }}>
                            {kw}
                        </span>
                    ))}
                </div>
            )}

            {/* ── Results grid ── */}
            {filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '5rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                    {IC.users}
                    <p style={{ color: '#94a3b8', fontWeight: 600, fontSize: '0.9rem' }}>No candidates match your search.</p>
                    {hasFilters && <button onClick={clearAll} style={{ color: '#2557a7', fontWeight: 600, fontSize: '0.85rem', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Clear filters</button>}
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                    {filtered.map((c) => (
                        <div
                            key={c.id}
                            onClick={() => setSelectedId(c.id)}
                            style={{
                                background: '#fff', borderRadius: '13px',
                                border: '1px solid #e8edf3',
                                padding: '1.125rem 1.25rem',
                                cursor: 'pointer',
                                transition: 'box-shadow 0.18s, border-color 0.18s, transform 0.18s',
                                boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
                            }}
                            onMouseEnter={e => {
                                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 24px rgba(37,87,167,0.14)';
                                (e.currentTarget as HTMLDivElement).style.borderColor = '#93c5fd';
                                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={e => {
                                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 6px rgba(0,0,0,0.04)';
                                (e.currentTarget as HTMLDivElement).style.borderColor = '#e8edf3';
                                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                            }}
                        >
                            {/* Header row */}
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.875rem' }}>
                                <div style={{
                                    width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                                    background: 'linear-gradient(135deg,#2557a7,#7c3aed)',
                                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: 800, fontSize: '0.9rem',
                                }}>
                                    {c.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a', lineHeight: 1.3 }}>
                                        <Highlight text={c.name || ''} keywords={keywords} />
                                    </div>
                                    <div style={{ fontSize: '0.79rem', color: '#64748b', marginTop: '1px' }}>
                                        <Highlight text={c.role || ''} keywords={keywords} />
                                    </div>
                                </div>
                            </div>

                            {/* Skills */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.75rem' }}>
                                {(c.skills || []).slice(0, 5).map((s: string) => (
                                    <span
                                        key={s}
                                        style={{
                                            fontSize: '0.72rem', padding: '2px 7px',
                                            borderRadius: isSkillMatch(s) ? '2px' : '6px',
                                            fontWeight: isSkillMatch(s) ? 700 : 400,
                                            /* rectangle highlight on matched skill */
                                            background: isSkillMatch(s) ? '#fde047' : '#f1f5f9',
                                            color: isSkillMatch(s) ? '#000' : '#475569',
                                            outline: isSkillMatch(s) ? '1.5px solid #ca8a04' : 'none',
                                            lineHeight: 1.5,
                                        }}
                                    >
                                        <Highlight text={s} keywords={keywords} />
                                    </span>
                                ))}
                                {(c.skills || []).length > 5 && (
                                    <span style={{ fontSize: '0.72rem', padding: '2px 7px', background: '#f8fafc', color: '#94a3b8', borderRadius: '6px' }}>
                                        +{c.skills.length - 5}
                                    </span>
                                )}
                            </div>

                            {/* Footer */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.625rem', borderTop: '1px solid #f1f5f9' }}>
                                <span style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 3 }}>
                                    {IC.mapPin}
                                    <Highlight text={c.location || 'Remote'} keywords={keywords} />
                                </span>
                                <div style={{ display: 'flex', gap: '0.4rem' }}>
                                    <button
                                        onClick={e => { e.stopPropagation(); setSelectedId(c.id); }}
                                        style={{ fontSize: '0.75rem', fontWeight: 600, color: '#2557a7', background: '#eff6ff', border: 'none', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer' }}
                                    >
                                        Profile
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <CandidateProfileDrawer candidateId={selectedId} onClose={() => setSelectedId(null)} />
        </div>
    );
}
