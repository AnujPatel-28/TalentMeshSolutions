"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import styles from './nvite.module.css';
import { insforge } from '@/lib/insforge';
import { useAuth } from '@/lib/auth/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { getPublicStorageUrl } from '@/lib/utils/storage-url';

const IC = {
    plus: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
    more: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" /></svg>,
    empty: <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>,
    arrowLeft: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
};

export default function NViteDashboard() {
    const { user } = useAuth();
    const params = useParams();
    const roleId = params.role_id as string;
    const [nvites, setNvites] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        if (!user?.id) return;

        const fetchNvites = async () => {
            try {
                const { data, error } = await insforge.database
                    .from('nvites')
                    .select('*, candidate:profiles!candidate_id(id, name, email, avatar_url, candidate_profiles(headline)), job:jobs(id, title)')
                    .eq('recruiter_id', user.id)
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setNvites(data || []);
            } catch (err) {
                console.error('Error fetching nvites:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchNvites();
    }, [user?.id]);

    const stats = {
        total: nvites.length,
        pending: nvites.filter(n => n.status === 'sent' || n.status === 'viewed' || n.status === 'pending').length,
        accepted: nvites.filter(n => n.status === 'applied' || n.status === 'accepted').length,
        conversion: nvites.length > 0 ? Math.round((nvites.filter(n => n.status === 'applied' || n.status === 'accepted').length / nvites.length) * 100) : 0
    };

    const filteredNvites = nvites.filter(n => {
        if (filter === 'all') return true;
        if (filter === 'sent') return n.status === 'sent' || n.status === 'pending';
        if (filter === 'read') return n.status === 'viewed';
        if (filter === 'accepted') return n.status === 'applied' || n.status === 'accepted';
        return n.status === filter;
    });

    return (
        <div className={styles.nvitePage}>
            <Link href={`/dashboard/recruiter/${roleId}`} className={styles.backLink}>
                {IC.arrowLeft} Back to Dashboard
            </Link>

            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>NVite Outreach</h1>
                    <p style={{ color: '#64748b', marginTop: '0.5rem', fontSize: '0.875rem' }}>Personalized candidate job invitations</p>
                </div>
                <Link href={`/dashboard/recruiter/${roleId}/nvite/compose`} className={styles.composeBtn}>
                    {IC.plus} Compose NVite
                </Link>
            </header>

            <div className={styles.statsRow}>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Total Sent</span>
                    <span className={styles.statValue}>{stats.total}</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Pending Response</span>
                    <span className={styles.statValue}>{stats.pending}</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Accepted</span>
                    <span className={styles.statValue}>{stats.accepted}</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Conversion Rate</span>
                    <span className={styles.statValue}>{stats.conversion}%</span>
                </div>
            </div>

            <div className={styles.filters}>
                {['all', 'sent', 'read', 'accepted', 'declined', 'expired'].map(f => (
                    <button 
                        key={f}
                        className={`${styles.filterTab} ${filter === f ? styles.activeTab : ''}`}
                        onClick={() => setFilter(f)}
                    >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
            </div>

            <div className={styles.contentCard}>
                {loading ? (
                    <div className={styles.emptyState}>Loading NVites...</div>
                ) : filteredNvites.length > 0 ? (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Candidate</th>
                                <th>Job Position</th>
                                <th>Sent</th>
                                <th>Status</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredNvites.map(n => (
                                <tr key={n.id}>
                                    <td>
                                        <div className={styles.candidateCell}>
                                            <div className={styles.avatar}>
                                                {n.candidate?.avatar_url ? (
                                                    <img src={getPublicStorageUrl('avatars', n.candidate.avatar_url)} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                                ) : (
                                                    n.candidate?.name?.split(' ').map((nm: string) => nm[0]).join('').slice(0, 2).toUpperCase() || '?'
                                                )}
                                            </div>
                                            <div>
                                                <span className={styles.candName}>{n.candidate?.name || 'Candidate'}</span>
                                                <span className={styles.candEmail}>{n.candidate?.email || '—'}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{n.job?.title || 'General Invite'}</span>
                                    </td>
                                    <td>
                                        <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                                            {formatDistanceToNow(new Date(n.sent_at || n.created_at), { addSuffix: true })}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`${styles.status} ${styles[`status_${n.status}`] || styles.status_sent}`}>
                                            {n.status === 'viewed' ? 'Read' : n.status === 'applied' ? 'Accepted' : n.status.charAt(0).toUpperCase() + n.status.slice(1)}
                                        </span>
                                    </td>
                                    <td>
                                        <button className={styles.actionBtn}>{IC.more}</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}>{IC.empty}</div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>No NVites Found</h3>
                        <p style={{ fontSize: '0.85rem' }}>Start personalizing job invites to attract top talent.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
