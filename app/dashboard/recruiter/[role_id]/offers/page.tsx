"use client";
import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { insforge } from '@/lib/insforge';
import { HomeSkeleton } from '@/components/ui/DashboardSkeleton';
import styles from '@/app/dashboard/shared-dashboard.module.css';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';

import StatCard from '@/components/dashboard/StatCard';
import DataTable, { Column } from '@/components/dashboard/DataTable';
import DetailDrawer from '@/components/dashboard/DetailDrawer';
import StatusPill from '@/components/dashboard/StatusPill';

const IC = {
    check: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>,
    offer: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
};

export default function OffersPage() {
    const { user } = useAuth();
    const [offers, setOffers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');
    const [selectedOffer, setSelectedOffer] = useState<any | null>(null);

    const fetchOffers = () => {
        if (!user?.id) return;
        insforge.database
            .from('offers')
            .select('*, candidate:profiles!candidate_id(id, name, location, avatar_url, candidate_profiles(headline, skills)), jobs(title)')
            .eq('recruiter_id', user.id)
            .order('created_at', { ascending: false })
            .then(({ data, error }) => {
                if (error) {
                    console.error("Error fetching offers:", error);
                    toast.error("Failed to load offers");
                    return;
                }
                const list = (data || []).map((offer: any) => {
                    const p = offer.candidate;
                    const cp = p && (Array.isArray(p.candidate_profiles) ? p.candidate_profiles[0] : p.candidate_profiles);
                    return {
                        ...offer,
                        candidateName: p?.name || 'Candidate',
                        candidateRole: cp?.headline || '—',
                        avatarUrl: p?.avatar_url
                    };
                });
                setOffers(list);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchOffers();
    }, [user?.id]);

    const stats = useMemo(() => {
        return {
            total: offers.length,
            accepted: offers.filter(o => o.status === 'accepted').length,
            pending: offers.filter(o => ['sent', 'viewed'].includes(o.status)).length,
            declined: offers.filter(o => o.status === 'declined').length,
        };
    }, [offers]);

    const filteredOffers = useMemo(() => {
        return filterStatus === 'all' ? offers : offers.filter(o => o.status === filterStatus);
    }, [offers, filterStatus]);

    if (loading) return <HomeSkeleton />;

    const columns: Column<any>[] = [
        {
            header: 'Candidate',
            key: 'candidateName',
            render: (offer) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {offer.avatarUrl ? (
                        <img src={offer.avatarUrl} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--tm-surface-muted)', border: '1px solid var(--tm-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, color: 'var(--tm-accent)' }}>
                            {offer.candidateName?.[0]?.toUpperCase() || 'C'}
                        </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600, color: 'var(--tm-text-primary)' }}>{offer.candidateName}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--tm-text-secondary)' }}>{offer.candidateRole}</span>
                    </div>
                </div>
            )
        },
        {
            header: 'Job Title',
            key: 'jobs.title',
            render: (offer) => <span style={{ fontWeight: 500 }}>{offer.jobs?.title || '—'}</span>
        },
        {
            header: 'Salary Offered',
            key: 'salary_offered',
            render: (offer) => (
                <span>
                    {offer.salary_offered ? new Intl.NumberFormat('en-IN', {
                        style: 'currency',
                        currency: 'INR',
                        maximumFractionDigits: 0
                    }).format(offer.salary_offered) : '—'}
                </span>
            )
        },
        {
            header: 'Created Date',
            key: 'created_at',
            render: (offer) => <span>{new Date(offer.created_at).toLocaleDateString('en-IN')}</span>
        },
        {
            header: 'Status',
            key: 'status',
            render: (offer) => <StatusPill status={offer.status} />
        }
    ];

    return (
        <div className={cn(styles.dash, styles.dashPremium)}>
            {/* Header */}
            <div className={styles.pageHeader}>
                <div>
                    <h1 className={styles.pageHeaderTitle}>Offers</h1>
                    <p className={styles.pageHeaderSub}>Manage job offers and approval workflows</p>
                </div>
            </div>

            {/* Stats */}
            <div className={styles.stats}>
                <StatCard label="Total Offers" value={stats.total} icon={IC.offer} delta="Total created offers" />
                <StatCard label="Accepted" value={stats.accepted} icon={IC.check} delta="Offers accepted by candidates" />
                <StatCard label="Pending" value={stats.pending} icon={IC.offer} delta="Offers waiting for response" />
                <StatCard label="Declined" value={stats.declined} icon={IC.offer} delta="Offers declined by candidates" />
            </div>

            {/* Filter Tabs strip */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--tm-surface)', border: '1px solid var(--tm-border)', borderRadius: 'var(--tm-card-radius)', padding: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--tm-border)', paddingBottom: '0.75rem', flexWrap: 'wrap' }}>
                    {['all', 'draft', 'sent', 'viewed', 'accepted', 'declined', 'expired'].map(s => (
                        <button
                            key={s}
                            onClick={() => setFilterStatus(s)}
                            style={{
                                padding: '0.45rem 1rem', borderRadius: '99px', fontSize: '0.8rem', fontWeight: 600,
                                border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                                background: filterStatus === s ? 'var(--tm-accent)' : 'var(--tm-surface-muted)',
                                color: filterStatus === s ? '#fff' : 'var(--tm-text-secondary)',
                            }}
                        >
                            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                            <span style={{ marginLeft: 4, fontSize: '0.72rem', opacity: 0.8 }}>
                                ({offers.filter(o => s === 'all' || o.status === s).length})
                            </span>
                        </button>
                    ))}
                </div>

                <DataTable
                    columns={columns}
                    data={filteredOffers}
                    onRowClick={(row) => setSelectedOffer(row)}
                />
            </div>

            {/* Detail Drawer */}
            <DetailDrawer
                isOpen={!!selectedOffer}
                onClose={() => setSelectedOffer(null)}
                title="Offer Details"
            >
                {selectedOffer && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div>
                            <span style={{ textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 800, color: 'var(--tm-accent)', letterSpacing: '0.05em' }}>
                                Job Offer
                            </span>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--tm-text-primary)', margin: '0.25rem 0 0.5rem' }}>
                                {selectedOffer.candidateName}
                            </h3>
                            <p style={{ color: 'var(--tm-text-secondary)', margin: 0, fontSize: '0.875rem' }}>
                                Position: <strong>{selectedOffer.jobs?.title || selectedOffer.position_title}</strong>
                            </p>
                        </div>

                        <hr style={{ border: 'none', borderTop: '1px solid var(--tm-border)', margin: 0 }} />

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                <span style={{ color: 'var(--tm-text-secondary)' }}>Status:</span>
                                <StatusPill status={selectedOffer.status} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                <span style={{ color: 'var(--tm-text-secondary)' }}>Offered Salary:</span>
                                <span style={{ fontWeight: 600 }}>
                                    {selectedOffer.salary_offered ? new Intl.NumberFormat('en-IN', {
                                        style: 'currency',
                                        currency: 'INR',
                                        maximumFractionDigits: 0
                                    }).format(selectedOffer.salary_offered) : '—'}
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                <span style={{ color: 'var(--tm-text-secondary)' }}>Work Mode:</span>
                                <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{selectedOffer.work_mode || '—'}</span>
                            </div>
                            {selectedOffer.work_location && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                    <span style={{ color: 'var(--tm-text-secondary)' }}>Work Location:</span>
                                    <span style={{ fontWeight: 600 }}>{selectedOffer.work_location}</span>
                                </div>
                            )}
                            {selectedOffer.joining_date && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                    <span style={{ color: 'var(--tm-text-secondary)' }}>Joining Date:</span>
                                    <span style={{ fontWeight: 600 }}>{new Date(selectedOffer.joining_date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>
                                </div>
                            )}
                            {selectedOffer.offer_valid_until && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                    <span style={{ color: 'var(--tm-text-secondary)' }}>Offer Valid Until:</span>
                                    <span style={{ fontWeight: 600 }}>{new Date(selectedOffer.offer_valid_until).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>
                                </div>
                            )}
                        </div>

                        {selectedOffer.perks && (
                            <>
                                <hr style={{ border: 'none', borderTop: '1px solid var(--tm-border)', margin: 0 }} />
                                <div>
                                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem' }}>Perks & Benefits</h4>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--tm-text-secondary)', background: 'var(--tm-surface-muted)', padding: '0.75rem', borderRadius: '6px', whiteSpace: 'pre-wrap' }}>
                                        {selectedOffer.perks}
                                    </p>
                                </div>
                            </>
                        )}

                        {selectedOffer.additional_terms && (
                            <>
                                <hr style={{ border: 'none', borderTop: '1px solid var(--tm-border)', margin: 0 }} />
                                <div>
                                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem' }}>Additional Terms</h4>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--tm-text-secondary)', background: 'var(--tm-surface-muted)', padding: '0.75rem', borderRadius: '6px', whiteSpace: 'pre-wrap' }}>
                                        {selectedOffer.additional_terms}
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </DetailDrawer>
        </div>
    );
}
