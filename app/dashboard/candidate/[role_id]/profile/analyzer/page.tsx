"use client";
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { invokeFunction } from '@/lib/insforge';
import { FormSkeleton } from '@/components/ui/DashboardSkeleton';
import styles from '../../../../shared-dashboard.module.css';

const IC = {
    target: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>,
    check: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>,
    alert: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>,
    award: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 15l-2 5L12 18l2 2-2-5z" /><circle cx="12" cy="8" r="7" /></svg>
};

export default function ResumeAnalyzer() {
    const { user } = useAuth();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchAnalysis() {
            if (!user) return;
            try {
                const { data: profile } = await invokeFunction('candidate-profile', { method: 'GET' });
                setData(profile);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        fetchAnalysis();
    }, [user]);

    if (loading) return <FormSkeleton />;
    if (!data) return <div>No profile data found. Please upload your resume first.</div>;

    const profile = data.candidateProfile;
    const strength = profile?.profile_strength || 0;

    return (
        <div style={{ paddingBottom: '3rem' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>AI Resume Analyzer</h1>
                <p style={{ color: '#64748b' }}>Insights and optimizations for your professional profile</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Score Card */}
                    <div style={{ background: '#fff', borderRadius: 16, padding: '2rem', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '2rem' }}>
                        <div style={{ position: 'relative', width: 100, height: 100 }}>
                            <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                                <circle cx="50" cy="50" r="45" fill="none" stroke="#f1f5f9" strokeWidth="8" />
                                <circle cx="50" cy="50" r="45" fill="none" stroke="var(--primary-blue)" strokeWidth="8" strokeDasharray="283" strokeDashoffset={283 - (283 * strength) / 100} strokeLinecap="round" />
                            </svg>
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 800 }}>{strength}%</div>
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>Profile Match Strength</h3>
                            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Your profile is {strength < 70 ? 'getting there!' : 'looking strong!'} {strength < 90 ? 'Add more details to reach the top tier.' : 'Recruiters will love this.'}</p>
                        </div>
                    </div>

                    {/* Detected Skills */}
                    <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', border: '1px solid #e2e8f0' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>{IC.target} Detected Skills</h3>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {profile?.skills?.map((skill: string) => (
                                <span key={skill} style={{ padding: '0.4rem 0.8rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 100, fontSize: '0.85rem', color: '#475569' }}>{skill}</span>
                            ))}
                        </div>
                    </div>

                    {/* Optimization Tips */}
                    <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', border: '1px solid #e2e8f0' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>AI Optimization Tips</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {strength < 90 && (
                                <div style={{ display: 'flex', gap: '1rem', padding: '1rem', background: '#fff7ed', borderRadius: 12, border: '1px solid #ffedd5' }}>
                                    <span style={{ color: '#f97316' }}>{IC.alert}</span>
                                    <div>
                                        <p style={{ fontWeight: 600, fontSize: '0.9rem', color: '#9a3412' }}>Add more professional skills</p>
                                        <p style={{ fontSize: '0.85rem', color: '#c2410c' }}>We detected fewer than 10 skills. Adding specific tools (e.g. Docker, Figma, React) increases search visibility by 40%.</p>
                                    </div>
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: '1rem', padding: '1rem', background: '#f0fdf4', borderRadius: 12, border: '1px solid #dcfce7' }}>
                                <span style={{ color: '#22c55e' }}>{IC.check}</span>
                                <div>
                                    <p style={{ fontWeight: 600, fontSize: '0.9rem', color: '#166534' }}>Headline is well-formatted</p>
                                    <p style={{ fontSize: '0.85rem', color: '#15803d' }}>Your professional headline matches industry standards for searchability.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', borderRadius: 16, padding: '1.5rem', color: 'white' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: '1rem' }}>{IC.award} PRO INSIGHTS</span>
                        <p style={{ fontSize: '0.9rem', lineHeight: 1.5, color: '#cbd5e1' }}>Your profile has a <strong>High Match</strong> for <strong>Product Design</strong> and <strong>React Developer</strong> roles in <strong>Bengaluru</strong>.</p>
                    </div>

                    <button style={{ width: '100%', padding: '1rem', background: 'var(--primary-blue)', color: 'white', border: 'none', borderRadius: 12, fontWeight: 600, cursor: 'pointer' }} onClick={() => window.location.href = `/dashboard/candidate/${user?.id}/profile`}>
                        Edit Full Profile
                    </button>
                </div>
            </div>
        </div>
    );
}
