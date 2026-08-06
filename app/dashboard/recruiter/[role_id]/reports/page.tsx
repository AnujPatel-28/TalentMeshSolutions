"use client";

import React, { useEffect, useState } from 'react';
import { insforge } from '@/lib/insforge';
import styles from '../../../shared-dashboard.module.css';

type Stage = { label: string; value: number; color: string };
type ReportData = { openJobs: number; totalApplicants: number; stages: Stage[]; hires: number };

export default function ReportsPage() {
    const [report, setReport] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function loadReport() {
            try {
                const [{ data: jobs, error: jobsError }, { data: applications, error: applicationsError }] = await Promise.all([
                    insforge.database.from('jobs').select('status'),
                    insforge.database.from('applications').select('status'),
                ]);

                if (jobsError) throw jobsError;
                if (applicationsError) throw applicationsError;

                const applicationStatuses = (applications || []).map((application: { status: string }) => application.status);
                const stages: Stage[] = [
                    { label: 'Applications Received', statuses: ['applied'], color: '#3b82f6' },
                    { label: 'Reviewing', statuses: ['reviewing'], color: '#60a5fa' },
                    { label: 'Shortlisted', statuses: ['shortlisted'], color: '#7c3aed' },
                    { label: 'Interviewing', statuses: ['interviewing'], color: '#f59e0b' },
                    { label: 'Offered', statuses: ['offered'], color: '#10b981' },
                    { label: 'Hired', statuses: ['hired'], color: '#059669' },
                ].map(({ label, statuses, color }) => ({
                    label,
                    value: applicationStatuses.filter(status => statuses.includes(status)).length,
                    color,
                }));

                if (!cancelled) {
                    setReport({
                        openJobs: (jobs || []).filter((job: { status: string }) => ['active', 'published'].includes(job.status)).length,
                        totalApplicants: applicationStatuses.length,
                        stages,
                        hires: stages.find(stage => stage.label === 'Hired')?.value || 0,
                    });
                }
            } catch (loadError) {
                console.error('Failed to load recruiter report:', loadError);
                if (!cancelled) setError('Reports are temporarily unavailable.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        loadReport();
        return () => { cancelled = true; };
    }, []);

    if (loading) return <div className={styles.dash}><div className={styles.card}><p>Loading reports…</p></div></div>;
    if (error) return <div className={styles.dash}><div className={styles.card}><p>{error}</p></div></div>;

    if (!report || (report.totalApplicants === 0 && report.openJobs === 0)) {
        return (
            <div className={styles.dash}>
                <div className={styles.greet}>
                    <h1 className={styles.greetTitle}>Reports</h1>
                    <p className={styles.greetSub}>Hiring metrics from your current jobs and applications.</p>
                </div>
                <div className={styles.card}><p>No recruiter activity to report yet.</p></div>
            </div>
        );
    }

    const maxStage = Math.max(...report.stages.map(stage => stage.value), 1);

    return (
        <div className={styles.dash}>
            <div className={styles.greet}>
                <h1 className={styles.greetTitle}>Reports</h1>
                <p className={styles.greetSub}>Hiring metrics from your current jobs and applications.</p>
            </div>

            <div className={styles.stats}>
                {[
                    ['Open Jobs', report.openJobs],
                    ['Applicants', report.totalApplicants],
                    ['Hired', report.hires],
                    ['Tracked Stages', report.stages.length],
                ].map(([label, value]) => (
                    <div className={styles.stat} key={label}>
                        <span className={styles.statLabel}>{label}</span>
                        <span className={styles.statVal}>{value}</span>
                    </div>
                ))}
            </div>

            <div className={styles.mainGrid}>
                <div className={styles.leftCol}>
                    <div className={styles.card}>
                        <h2 className={styles.cardTitle}>Hiring Funnel</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                            {report.stages.map(item => (
                                <div key={item.label} style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                                        <span style={{ color: '#475569' }}>{item.label}</span>
                                        <span style={{ fontWeight: 700, color: '#0f172a' }}>{item.value}</span>
                                    </div>
                                    <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3 }}>
                                        <div style={{ height: '100%', width: `${(item.value / maxStage) * 100}%`, background: item.color, borderRadius: 3 }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className={styles.rightCol}>
                    <div className={styles.card}>
                        <h2 className={styles.cardTitle}>Unavailable metrics</h2>
                        <p className={styles.greetSub}>Time-to-hire, cost-per-hire, conversion rate, and source attribution are not available in the current data model.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
