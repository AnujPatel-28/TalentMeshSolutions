'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { insforge } from '@/lib/insforge';
import styles from '../../../../../shared-dashboard.module.css';
import { getPublicStorageUrl } from '@/lib/utils/storage-url';

// ─── Icons ──────────────────────────────────────────────────────────────────────
const IC = {
    Check: () => <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
    Briefcase: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /></svg>,
    MapPin: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>,
};

export default function ApplicationSuccessPage() {
    const params = useParams();
    const router = useRouter();
    const [application, setApplication] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchApp = async () => {
            try {
                const { data, error } = await insforge.database
                    .from('applications')
                    .select('id, jobs(title, location, companies(name, logo_url))')
                    .eq('id', params.app_id)
                    .single();
                
                if (data) setApplication(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchApp();
    }, [params.app_id]);

    if (loading) return <div style={{ padding: '100px 0', textAlign: 'center' }}>Optimizing your application details...</div>;

    const job = application?.jobs;
    const company = job?.companies;

    return (
        <div style={{ 
            maxWidth: '640px', margin: '2rem auto', textAlign: 'center', 
            display: 'flex', flexDirection: 'column', gap: '2rem',
            animation: 'fadeIn 0.6s ease-out'
        }}>
            <div style={{
                width: 80, height: 80, borderRadius: '50%', background: '#f0fdf4',
                color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto', border: '2px solid #bbf7d0', animation: 'scaleIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }}>
                <IC.Check />
            </div>

            <div>
                <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem' }}>Application Submitted!</h1>
                <p style={{ color: '#64748b', fontSize: '1.1rem' }}>Great job! Your application for <strong>{job?.title}</strong> has been sent to <strong>{company?.name}</strong>.</p>
            </div>

            <div style={{ 
                background: 'white', border: '1px solid #e2e8f0', borderRadius: '20px', 
                padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem',
                boxShadow: '0 10px 30px rgba(0,0,0,0.03)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', textAlign: 'left' }}>
                    <div style={{ 
                        width: '60px', height: '60px', borderRadius: '12px', background: '#f8fafc',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0'
                    }}>
                        {company?.logo_url ? <img src={getPublicStorageUrl('company-logos', company.logo_url)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🏢'}
                    </div>
                    <div style={{ flex: 1 }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{job?.title}</h3>
                        <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.9rem', display: 'flex', gap: '1rem' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><IC.Briefcase /> {company?.name}</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><IC.MapPin /> {job?.location}</span>
                        </p>
                    </div>
                </div>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem', textAlign: 'left' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155', marginBottom: '0.75rem' }}>What happens next?</h4>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {[
                            'The hiring team will review your profile and experience.',
                            'You will be notified immediately if you are shortlisted for an interview.',
                            'Keep your profile updated for better job matches.'
                        ].map((item, i) => (
                            <li key={i} style={{ display: 'flex', gap: '0.75rem', fontSize: '0.88rem', color: '#64748b', lineHeight: 1.5 }}>
                                <span style={{ color: '#10b981', fontWeight: 900 }}>•</span> {item}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <Link href={`/dashboard/candidate/${params.role_id}/applications/${params.app_id}`} style={{ 
                    background: 'var(--primary-blue)', color: 'white', padding: '1rem', 
                    borderRadius: '12px', textDecoration: 'none', fontWeight: 700, fontSize: '0.95rem',
                    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)'
                }}>
                    View Application Status
                </Link>
                <Link href={`/dashboard/candidate/${params.role_id}/jobs`} style={{ 
                    background: '#ffffff', color: '#475569', padding: '1rem', 
                    borderRadius: '12px', textDecoration: 'none', fontWeight: 700, fontSize: '0.95rem',
                    border: '1px solid #e2e8f0'
                }}>
                    Find More Jobs
                </Link>
            </div>
        </div>
    );
}
