"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { insforge } from '@/lib/insforge';
import { useAuth } from '@/lib/auth/AuthContext';
import styles from './analytics.module.css';

// ─── Icons ──────────────────────────────────────────────────────────────────────
const IC = {
    trending: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>,
    calendar: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
    check: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
    info: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>,
    send: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>,
    star: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>,
    eye: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>,
    briefcase: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>,
    alert: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
};

// ─── Components ───────────────────────────────────────────────────────────────

const LineChart = ({ data }: { data: { date: string; count: number }[] }) => {
    if (!data.length) return <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>No activity data for the last 30 days.</div>;

    const maxCount = Math.max(...data.map(d => d.count), 5);
    const width = 600;
    const height = 200;
    const padding = 30;

    const points = data.map((d, i) => {
        const x = (i / (data.length - 1)) * (width - padding * 2) + padding;
        const y = height - ((d.count / maxCount) * (height - padding * 2) + padding);
        return `${x},${y}`;
    }).join(' ');

    return (
        <div className={styles.chartContainer}>
            <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%">
                {/* Grid Lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
                    <line key={i} x1={padding} y1={height - (p * (height - padding * 2) + padding)} x2={width - padding} y2={height - (p * (height - padding * 2) + padding)} stroke="#f1f5f9" strokeWidth="1" />
                ))}
                {/* Area */}
                <path d={`M${padding},${height - padding} ${points} L${width - padding},${height - padding} Z`} fill="url(#gradient)" opacity="0.1" />
                <defs>
                    <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563eb" />
                        <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                    </linearGradient>
                </defs>
                {/* Line */}
                <polyline points={points} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                {/* Points */}
                {data.map((d, i) => {
                    const x = (i / (data.length - 1)) * (width - padding * 2) + padding;
                    const y = height - ((d.count / maxCount) * (height - padding * 2) + padding);
                    return (
                        <circle key={i} cx={x} cy={y} r="4" fill="white" stroke="#2563eb" strokeWidth="2">
                            <title>{`${d.date}: ${d.count} applications`}</title>
                        </circle>
                    );
                })}
            </svg>
        </div>
    );
};

const DonutChart = ({ data }: { data: { label: string; count: number; color: string }[] }) => {
    const total = data.reduce((acc, d) => acc + d.count, 0);
    if (total === 0) return <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>No data.</div>;

    let currentAngle = 0;
    const radius = 40;
    const center = 50;
    const circumference = 2 * Math.PI * radius;

    return (
        <div style={{ position: 'relative', width: 140, height: 140, margin: '0 auto' }}>
            <svg viewBox="0 0 100 100" width="100%" height="100%">
                {data.map((d, i) => {
                    const pct = d.count / total;
                    const dashArray = `${pct * circumference} ${circumference}`;
                    const offset = -currentAngle * circumference;
                    currentAngle += pct;
                    return (
                        <circle
                            key={i}
                            cx={center}
                            cy={center}
                            r={radius}
                            fill="none"
                            stroke={d.color}
                            strokeWidth="12"
                            strokeDasharray={dashArray}
                            strokeDashoffset={offset}
                            transform="rotate(-90 50 50)"
                        />
                    );
                })}
            </svg>
            <div className={styles.ringText} style={{ fontSize: '1rem' }}>{total}</div>
        </div>
    );
};

export default function AnalyticsPage() {
    const router = useRouter();
    const { user, isLoading: authLoading } = useAuth();
    const [loading, setLoading] = useState(true);

    const [metrics, setMetrics] = useState({
        totalApplications: 0,
        statusBreakdown: [] as { status: string; count: number }[],
        activity: [] as { date: string; count: number }[],
        responseRate: 0,
        interviewRate: 0,
        offersCount: 0,
        skills: [] as string[],
        completeness: 0,
        missingItems: [] as { label: string; link: string }[],
        savedJobsCount: 0,
        jobTypeBreakdown: [] as { label: string; count: number; color: string }[]
    });

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.push('/login');
            return;
        }

        async function fetchMetrics() {
            setLoading(true);
            try {
                const userId = user!.id;

                // 1. Total & Status Breakdown & Jobs
                const { data: apps, error: appsError } = await insforge.database
                    .from('applications')
                    .select('status, created_at, jobs(type)')
                    .eq('candidate_id', userId);

                if (appsError) throw appsError;

                const total = apps?.length || 0;

                const statusCounts: Record<string, number> = {};
                const typeCounts: Record<string, number> = {};
                const activityMap: Record<string, number> = {};

                // Init last 30 days activity
                for (let i = 29; i >= 0; i--) {
                    const d = new Date();
                    d.setDate(d.getDate() - i);
                    activityMap[d.toISOString().split('T')[0]] = 0;
                }

                let respondedCount = 0;
                let interviewPotentialCount = 0;
                let offers = 0;

                apps?.forEach(app => {
                    statusCounts[app.status] = (statusCounts[app.status] || 0) + 1;

                    if (!['applied', 'withdrawn'].includes(app.status)) respondedCount++;
                    if (['interviewing', 'offered', 'hired'].includes(app.status)) interviewPotentialCount++;
                    if (app.status === 'offered') offers++;

                    const dateStr = new Date(app.created_at).toISOString().split('T')[0];
                    if (activityMap[dateStr] !== undefined) {
                        activityMap[dateStr]++;
                    }

                    const type = (app.jobs as any)?.type || 'Other';
                    typeCounts[type] = (typeCounts[type] || 0) + 1;
                });

                const responseRate = total > 0 ? (respondedCount / total) * 100 : 0;
                const interviewRate = total > 0 ? (interviewPotentialCount / total) * 100 : 0;

                // 2. Profile Data
                const { data: profile, error: profileError } = await insforge.database
                    .from('profiles')
                    .select('*, candidate_profiles(*)')
                    .eq('id', userId)
                    .single();

                if (profileError) throw profileError;

                const cp = profile.candidate_profiles?.[0] || {};
                const skills = cp.skills || [];

                let score = 0;
                const missing = [];

                if (profile.avatar_url) score += 20;
                else missing.push({ label: "Add a profile photo", link: "profile" });

                if (cp.resume_url) score += 20;
                else missing.push({ label: "Upload your resume", link: "profile" });

                if (profile.about && profile.about.length >= 100) score += 15;
                else missing.push({ label: "Write a detailed bio (100+ chars)", link: "profile" });

                if (skills.length >= 5) score += 15;
                else missing.push({ label: "Add at least 5 skills", link: "profile" });

                if (profile.location) score += 15;
                else missing.push({ label: "Set your location", link: "profile" });

                if (cp.experience_years > 0) score += 15;
                else missing.push({ label: "Add work experience", link: "profile" });

                // 3. Saved Jobs
                const { count: savedCount, error: savedError } = await insforge.database
                    .from('saved_jobs')
                    .select('*', { count: 'exact', head: true })
                    .eq('candidate_id', userId);

                if (savedError) throw savedError;

                const statusList = ['applied', 'reviewing', 'shortlisted', 'interviewing', 'offered', 'hired', 'rejected', 'withdrawn'].map(s => ({
                    status: s.charAt(0).toUpperCase() + s.slice(1),
                    count: statusCounts[s] || 0
                }));

                const colors = ['#2563eb', '#10b981', '#f59e0b', '#7c3aed', '#ec4899'];
                const typeList = Object.entries(typeCounts).map(([label, count], i) => ({
                    label: label.charAt(0).toUpperCase() + label.slice(1),
                    count,
                    color: colors[i % colors.length]
                }));

                const activityList = Object.entries(activityMap).map(([date, count]) => ({ date, count }));

                setMetrics({
                    totalApplications: total,
                    statusBreakdown: statusList,
                    activity: activityList,
                    responseRate: Math.round(responseRate),
                    interviewRate: Math.round(interviewRate),
                    offersCount: offers,
                    skills,
                    completeness: score,
                    missingItems: missing,
                    savedJobsCount: savedCount || 0,
                    jobTypeBreakdown: typeList
                });

            } catch (error) {
                console.error("Failed to fetch analytics:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchMetrics();
    }, [user, authLoading, router]);

    const recommendations = useMemo(() => {
        const recs = [];
        if (metrics.responseRate < 20 && metrics.totalApplications > 3) {
            recs.push({
                id: 1,
                title: "Optimize Your Resume",
                text: "Your response rate is lower than average (20%). Tailoring your resume to job descriptions can help.",
                cta: "Update Resume",
                link: "profile",
                icon: IC.briefcase
            });
        }
        if (metrics.completeness < 80) {
            recs.push({
                id: 2,
                title: "Profile Strength",
                text: "Complete your profile to get up to 3x more recruiter views and better job matches.",
                cta: "Edit Profile",
                link: "profile",
                icon: IC.star
            });
        }
        if (metrics.totalApplications === 0) {
            recs.push({
                id: 3,
                title: "Get Started",
                text: "You haven't applied to any jobs yet. Start your journey by browsing open roles.",
                cta: "Browse Jobs",
                link: "jobs",
                icon: IC.send
            });
        }
        if (metrics.interviewRate > 30) {
            recs.push({
                id: 4,
                title: "🎉 High Performance",
                text: "Great interview rate! You're clearly a strong candidate. Keep applying to similar roles.",
                icon: IC.check
            });
        }
        return recs;
    }, [metrics]);

    if (loading || authLoading) {
        return <div className={styles.dash}>Loading your analytics...</div>;
    }

    return (
        <div className={styles.dash}>
            <div className={styles.headerRow}>
                <div className={styles.greet}>
                    <h1 className={styles.greetTitle}>My Analytics</h1>
                </div>
                <div className={styles.chip}>
                    {IC.calendar} Last 30 days
                </div>
            </div>

            {/* Row 1: KPI Cards */}
            <div className={styles.stats}>
                <div className={styles.stat}>
                    <div className={styles.statTop}>
                        <span className={styles.statLabel}>Applications Sent</span>
                        <div className={styles.actionIcon} style={{ background: '#eff6ff', color: '#2563eb' }}>{IC.send}</div>
                    </div>
                    <span className={styles.statVal}>{metrics.totalApplications}</span>
                    <span className={styles.statDesc}>Total applications submitted</span>
                </div>
                <div className={styles.stat}>
                    <div className={styles.statTop}>
                        <span className={styles.statLabel}>Response Rate</span>
                        <div className={styles.actionIcon} style={{ background: '#f0fdf4', color: '#10b981' }}>{IC.trending}</div>
                    </div>
                    <span className={styles.statVal}>{metrics.responseRate}%</span>
                    <span className={styles.statDesc}>Applications with responses</span>
                </div>
                <div className={styles.stat}>
                    <div className={styles.statTop}>
                        <span className={styles.statLabel}>Interview Rate</span>
                        <div className={styles.actionIcon} style={{ background: '#fef3c7', color: '#f59e0b' }}>{IC.star}</div>
                    </div>
                    <span className={styles.statVal}>{metrics.interviewRate}%</span>
                    <span className={styles.statDesc}>Conversion to interviewing</span>
                </div>
                <div className={styles.stat}>
                    <div className={styles.statTop}>
                        <span className={styles.statLabel}>Offers Received</span>
                        <div className={styles.actionIcon} style={{ background: '#fae8ff', color: '#d946ef' }}>{IC.check}</div>
                    </div>
                    <span className={styles.statVal}>{metrics.offersCount}</span>
                    <span className={styles.statDesc}>Direct job offers received</span>
                </div>
            </div>

            {/* Row 2: Charts */}
            <div className={styles.mainGrid}>
                <div className={styles.card}>
                    <h2 className={styles.cardTitle}>Application Activity</h2>
                    <LineChart data={metrics.activity} />
                </div>
                <div className={styles.card}>
                    <h2 className={styles.cardTitle}>Profile Strength</h2>
                    <div className={styles.profileWidget}>
                        <div className={styles.ringContainer}>
                            <svg className={styles.ringSvg} viewBox="0 0 100 100">
                                <circle className={styles.ringBg} cx="50" cy="50" r="45" />
                                <circle
                                    className={styles.ringBar}
                                    cx="50" cy="50" r="45"
                                    strokeDasharray="283"
                                    style={{ strokeDashoffset: 283 - (283 * metrics.completeness) / 100 }}
                                />
                            </svg>
                            <span className={styles.ringText}>{metrics.completeness}%</span>
                        </div>
                        <div className={styles.checklist}>
                            {metrics.missingItems.map((item, i) => (
                                <div key={i} className={styles.checkItem}>
                                    <div style={{ color: '#cbd5e1' }}>{IC.check}</div>
                                    <span>{item.label}</span>
                                    <button
                                        className={styles.checkLink}
                                        onClick={() => router.push(`/dashboard/candidate/${user?.id}/${item.link}`)}
                                    >
                                        Fix →
                                    </button>
                                </div>
                            ))}
                            {metrics.completeness === 100 && (
                                <div className={styles.checkItem} style={{ color: '#10b981', fontWeight: 600 }}>
                                    {IC.check} Your profile is fully complete!
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Row 3: Application Status Breakdown */}
            <div className={styles.card}>
                <h2 className={styles.cardTitle}>Application Status Breakdown</h2>
                <div className={styles.statusBars}>
                    {metrics.statusBreakdown.map((item, i) => {
                        const pct = metrics.totalApplications > 0 ? (item.count / metrics.totalApplications) * 100 : 0;
                        return (
                            <div key={i} className={styles.statusBarItem}>
                                <div className={styles.statusLabelRow}>
                                    <span>{item.status}</span>
                                    <span>{item.count}</span>
                                </div>
                                <div className={styles.barBg}>
                                    <div
                                        className={styles.barFill}
                                        style={{
                                            width: `${pct}%`,
                                            background: item.status === 'Hired' ? '#10b981' :
                                                item.status === 'Rejected' ? '#ef4444' :
                                                    item.status === 'Offered' ? '#d946ef' : '#2563eb'
                                        }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Row 4: Job Types & Skills */}
            <div className={styles.splitGrid}>
                <div className={styles.card}>
                    <h2 className={styles.cardTitle}>Jobs Applied By Type</h2>
                    <DonutChart data={metrics.jobTypeBreakdown} />
                    <div style={{ marginTop: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center' }}>
                        {metrics.jobTypeBreakdown.map((d, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#64748b' }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }} />
                                {d.label}: {d.count}
                            </div>
                        ))}
                    </div>
                </div>
                <div className={styles.card}>
                    <h2 className={styles.cardTitle}>Your Skills</h2>
                    <div className={styles.skillsCloud}>
                        {metrics.skills.map((skill, i) => (
                            <span key={i} className={styles.skillPill}>{skill}</span>
                        ))}
                        {metrics.skills.length === 0 && <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>No skills added yet.</span>}
                    </div>
                    <button
                        className={styles.editLink}
                        onClick={() => router.push(`/dashboard/candidate/${user?.id}/profile`)}
                    >
                        Edit Skills →
                    </button>
                </div>
            </div>

            {/* Row 5: Recommended Actions */}
            {recommendations.length > 0 && (
                <div className={`${styles.card} ${styles.actionCard}`}>
                    <h2 className={styles.cardTitle}>{IC.alert} Recommended Actions</h2>
                    <div className={styles.actionList}>
                        {recommendations.map((action, i) => (
                            <div key={i} className={styles.actionItem}>
                                <div className={styles.actionIcon}>{action.icon}</div>
                                <div className={styles.actionBody}>
                                    <span className={styles.actionTitle}>{action.title}</span>
                                    <p className={styles.actionText}>{action.text}</p>
                                    {action.cta && (
                                        <button
                                            className={styles.actionCTA}
                                            onClick={() => router.push(`/dashboard/candidate/${user?.id}/${action.link}`)}
                                        >
                                            {action.cta}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
