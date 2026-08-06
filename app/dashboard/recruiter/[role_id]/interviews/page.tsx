"use client";
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { insforge, invokeFunction } from '@/lib/insforge';
import { useRouter } from 'next/navigation';
import styles from '@/app/dashboard/shared-dashboard.module.css';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { getPublicStorageUrl } from '@/lib/utils/storage-url';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

import { HomeSkeleton } from '@/components/ui/DashboardSkeleton';
import StatCard from '@/components/dashboard/StatCard';
import DataTable, { Column } from '@/components/dashboard/DataTable';
import FilterBar from '@/components/dashboard/FilterBar';
import DetailDrawer from '@/components/dashboard/DetailDrawer';
import StatusPill from '@/components/dashboard/StatusPill';

/* ─── Types ─── */
interface Interview {
    id: string; job_id: string; candidate_id: string; recruiter_id: string;
    scheduled_at: string; duration_mins: number;
    type: 'video' | 'phone' | 'in_person' | 'technical';
    status: 'scheduled' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled';
    meeting_link: string | null; location: string | null; notes: string | null;
    feedback: string | null; rating: number | null; created_at: string;
    job: { id: string; title: string } | null;
    candidate: { id: string; full_name: string; email: string; avatar_url: string | null } | null;
}

interface ScheduleFormData {
    application_id: string; type: Interview['type']; date: string; time: string;
    duration_minutes: number; meeting_link: string; location: string; notes: string;
    title: string;
    prospect_name: string;
    prospect_email: string;
}

type StatusFilter = 'all' | 'scheduled' | 'completed' | 'cancelled';
type DateFilter = 'today' | 'week' | 'month' | 'all';

/* ─── Icons ─── */
const IC = {
    plus: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
    video: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" /></svg>,
    phone: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 3.07 10.8a19.79 19.79 0 0 1-3.07-8.64A2 2 0 0 1 2 0h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L6.09 7.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 14.92v2z" /></svg>,
    map: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>,
    code: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>,
    calendar: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
    clock: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
};

function TypeIcon({ t }: { t: Interview['type'] }) {
    if (t === 'video') return IC.video;
    if (t === 'phone') return IC.phone;
    if (t === 'in_person') return IC.map;
    return IC.code;
}

function typeLabel(t: Interview['type']) {
    return { video: 'Video Call', phone: 'Phone', in_person: 'In Person', technical: 'Technical' }[t];
}

/* ─── Schedule Modal ─── */
function ScheduleModal({ onClose, onSuccess, recruiterId }: {
    onClose: () => void; onSuccess: () => void; recruiterId: string;
}) {
    const [applications, setApplications] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState<ScheduleFormData>({
        application_id: '', type: 'video', date: '', time: '',
        duration_minutes: 30, meeting_link: '', location: '', notes: '',
        title: '', prospect_name: '', prospect_email: ''
    });
    const [selectedApp, setSelectedApp] = useState<any>(null);

    useEffect(() => {
        insforge.database
            .from('applications')
            .select(`
                id,
                status,
                job:jobs(
                    id,
                    title,
                    company_name,
                    logo_url,
                    skills_required,
                    type
                ),
                candidate:profiles!candidate_id(
                    id,
                    full_name:name,
                    email
                )
            `)
            .in('status', ['shortlisted', 'interviewing'])
            .then(({ data }) => setApplications(data || []));
    }, []);

    const set = (k: keyof ScheduleFormData, v: any) => setForm(f => ({ ...f, [k]: v }));

    const handleApplicationChange = (appId: string) => {
        const app = applications.find(a => a.id === appId);
        setSelectedApp(app || null);
        setForm(f => ({
            ...f,
            application_id: appId,
            title: app ? `${app.job?.title || 'Job'} Interview - ${app.candidate?.full_name || 'Candidate'} and Team` : '',
            prospect_name: app?.candidate?.full_name || '',
            prospect_email: app?.candidate?.email || '',
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.application_id || !form.date || !form.time) return;
        setLoading(true);
        try {
            const app = applications.find(a => a.id === form.application_id);
            if (!app) throw new Error('Application not found');
            const scheduled_at = new Date(`${form.date}T${form.time}`).toISOString();

            const combinedNotes = `Title: ${form.title || ''}\n\nNotes: ${form.notes || ''}`;

            const { error } = await insforge.database.from('interviews').insert([{
                job_id: app.job?.id,
                candidate_id: app.candidate?.id,
                recruiter_id: recruiterId,
                scheduled_at,
                duration_mins: form.duration_minutes,
                type: form.type,
                status: 'scheduled',
                meeting_link: form.type === 'video' ? form.meeting_link || null : null,
                location: form.type === 'in_person' ? form.location || null : null,
                notes: combinedNotes,
            }]);
            if (error) throw error;
            const { error: updateErr } = await invokeFunction('update-application', {
                body: { id: form.application_id, status: 'interviewing' }
            });
            if (updateErr) throw updateErr;
            onSuccess();
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || 'Failed to schedule interview');
        } finally {
            setLoading(false);
        }
    };

    const types: { v: Interview['type']; label: string; icon: React.ReactNode }[] = [
        { v: 'video', label: 'Video Call', icon: IC.video },
        { v: 'phone', label: 'Phone Call', icon: IC.phone },
        { v: 'in_person', label: 'In Person', icon: IC.map },
        { v: 'technical', label: 'Technical', icon: IC.code },
    ];

    return (
        <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
            <div className={styles.modal} style={{ background: 'var(--tm-surface)', border: '1px solid var(--tm-border)', borderRadius: 'var(--tm-card-radius)' }}>
                <div className={styles.modalHeader}>
                    <div>
                        <h2 className={styles.modalTitle} style={{ color: 'var(--tm-text-primary)' }}>Schedule new interview</h2>
                        <p className={styles.modalSubtitle} style={{ color: 'var(--tm-text-secondary)' }}>Fill in the correct information for this interview.</p>
                    </div>
                    <button className={styles.modalCloseCircle} onClick={onClose} style={{ color: 'var(--tm-text-secondary)' }}>✕</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className={styles.formRow}>
                        <label className={styles.label}>Select Candidate & Job</label>
                        <CustomSelect
                            className={styles.select}
                            value={form.application_id}
                            onChange={e => handleApplicationChange(e.target.value)}
                            required
                            placeholder="Select candidate & position…"
                            options={applications.map(a => ({
                                value: a.id,
                                label: `${a.candidate?.full_name} — ${a.job?.title}`
                            }))}
                        />
                    </div>

                    {selectedApp && (
                        <div className={styles.formRow}>
                            <label className={styles.label}>Interview Details</label>
                            <div className={styles.detailsCard} style={{ background: 'var(--tm-surface-muted)', border: '1px solid var(--tm-border)' }}>
                                <div className={styles.detailsCardHeader}>
                                    <div className={styles.companyAvatar}>
                                        {selectedApp.job?.logo_url ? (
                                            <img src={getPublicStorageUrl('company-logos', selectedApp.job.logo_url)} alt="" className={styles.companyLogoImg} />
                                        ) : (
                                            <span className={styles.companyLogoText}>
                                                {(selectedApp.job?.company_name || 'TM')[0].toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                    <div className={styles.detailsCardText}>
                                        <h4 className={styles.jobCardTitle} style={{ color: 'var(--tm-text-primary)' }}>{selectedApp.job?.title}</h4>
                                        <span className={styles.companyCardName} style={{ color: 'var(--tm-text-secondary)' }}>{selectedApp.job?.company_name || 'TalentMesh Company'}</span>
                                    </div>
                                </div>
                                <div className={styles.detailsCardDivider} style={{ borderColor: 'var(--tm-border)' }} />
                                <div className={styles.detailsCardSubGrid}>
                                    <div className={styles.detailsTagGroup}>
                                        <span className={styles.detailsTagLabel}>Skills</span>
                                        <div className={styles.detailsTags}>
                                            {(selectedApp.job?.skills_required || ['General']).slice(0, 3).map((sk: string) => (
                                                <span key={sk} className={styles.skillsTag} style={{ background: 'var(--tm-surface)', border: '1px solid var(--tm-border)', color: 'var(--tm-text-secondary)' }}>{sk}</span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className={styles.detailsTagGroup}>
                                        <span className={styles.detailsTagLabel}>Position type</span>
                                        <div className={styles.detailsTags}>
                                            <span className={styles.typeTag} style={{ background: 'var(--tm-surface)', border: '1px solid var(--tm-border)', color: 'var(--tm-text-secondary)' }}>{selectedApp.job?.type || 'Full-time'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className={styles.formRow}>
                        <label className={styles.label}>Interview Title</label>
                        <input
                            type="text"
                            className={styles.input}
                            value={form.title}
                            onChange={e => set('title', e.target.value)}
                            placeholder="e.g. UX Designer Interview - Jake and Aspect Team"
                            required
                        />
                    </div>

                    <div className={styles.formRow}>
                        <label className={styles.label}>Interview Type</label>
                        <div className={styles.typeGrid}>
                            {types.map(t => (
                                <button key={t.v} type="button"
                                    className={`${styles.typeOption} ${form.type === t.v ? styles.typeOptionActive : ''}`}
                                    onClick={() => set('type', t.v)}>
                                    {t.icon} {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {form.type === 'video' && (
                        <div className={styles.formRow}>
                            <label className={styles.label}>Meeting URL</label>
                            <input type="url" className={styles.input} value={form.meeting_link}
                                onChange={e => set('meeting_link', e.target.value)}
                                placeholder="https://zoom.us/j/1234567..." />
                        </div>
                    )}

                    {form.type === 'in_person' && (
                        <div className={styles.formRow}>
                            <label className={styles.label}>Location</label>
                            <input type="text" className={styles.input} value={form.location}
                                onChange={e => set('location', e.target.value)}
                                placeholder="Office address or room" />
                        </div>
                    )}

                    <div className={styles.rowTwo}>
                        <div className={styles.formRow}>
                            <label className={styles.label}>Interview date & time</label>
                            <div className={styles.inputWithIcon}>
                                <input type="date" className={styles.input}
                                    value={form.date} onChange={e => set('date', e.target.value)} required />
                                <span className={styles.inputIcon}>{IC.calendar}</span>
                            </div>
                        </div>
                        <div className={styles.formRow}>
                            <label className={styles.label}>Duration</label>
                            <div className={styles.durationSelector}>
                                {[30, 60, 90].map(d => (
                                    <button
                                        key={d}
                                        type="button"
                                        className={`${styles.durationBtn} ${form.duration_minutes === d ? styles.durationBtnActive : ''}`}
                                        onClick={() => set('duration_minutes', d)}
                                    >
                                        {d} min
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className={styles.rowTwo}>
                        <div className={styles.formRow}>
                            <label className={styles.label}>Time slot</label>
                            <div className={styles.inputWithIcon}>
                                <input type="time" className={styles.input}
                                    value={form.time} onChange={e => set('time', e.target.value)} required />
                                <span className={styles.inputIcon}>{IC.clock}</span>
                            </div>
                        </div>
                    </div>

                    <div className={styles.prospectSection}>
                        <h3 className={styles.prospectHeader}>Prospect Details</h3>
                        <div className={styles.rowTwo}>
                            <div className={styles.formRow}>
                                <label className={styles.label}>Name</label>
                                <input
                                    type="text"
                                    className={styles.input}
                                    value={form.prospect_name}
                                    onChange={e => set('prospect_name', e.target.value)}
                                    placeholder="Name"
                                />
                            </div>
                            <div className={styles.formRow}>
                                <label className={styles.label}>Email Address</label>
                                <input
                                    type="email"
                                    className={styles.input}
                                    value={form.prospect_email}
                                    onChange={e => set('prospect_email', e.target.value)}
                                    placeholder="Email Address"
                                />
                            </div>
                        </div>
                    </div>

                    <div className={styles.formRow}>
                        <label className={styles.label}>Notes <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional)</span></label>
                        <textarea className={styles.textarea} rows={3} value={form.notes}
                            onChange={e => set('notes', e.target.value)}
                            placeholder="Topics to cover, preparation notes…" />
                    </div>

                    <div className={styles.modalFooter}>
                        <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
                        <button type="submit" className={styles.submitBtn} disabled={loading}>
                            {loading ? 'Scheduling…' : 'Schedule Interview'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/* ─── Main Page ─── */
export default function InterviewsPage({ params }: { params: Promise<{ role_id: string }> }) {
    const { role_id } = React.use(params);
    const { user: authUser, isLoading: authLoading } = useAuth();
    const router = useRouter();

    const [interviews, setInterviews] = useState<Interview[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [dateFilter, setDateFilter] = useState<DateFilter>('all');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [search, setSearch] = useState('');
    const [selectedIv, setSelectedIv] = useState<Interview | null>(null);
    const fetching = useRef(false);

    const fetchInterviews = useCallback(async () => {
        if (!authUser?.id || fetching.current) return;
        fetching.current = true;
        try {
            const { data, error } = await insforge.database
                .from('interviews')
                .select('*, job:jobs(id, title), candidate:profiles!candidate_id(id, full_name:name, email, avatar_url)')
                .eq('recruiter_id', authUser.id)
                .order('scheduled_at', { ascending: true });
            if (!error) setInterviews((data as Interview[]) || []);
        } finally {
            setLoading(false);
            fetching.current = false;
        }
    }, [authUser?.id]);

    useEffect(() => {
        if (!authLoading && authUser) fetchInterviews();
    }, [authLoading, authUser, fetchInterviews]);

    /* ─── Stats ─── */
    const now = new Date();
    const todayStr = now.toDateString();
    const startWeek = new Date(now); startWeek.setDate(now.getDate() - now.getDay());
    const endWeek = new Date(startWeek); endWeek.setDate(startWeek.getDate() + 7);

    const stats = useMemo(() => {
        return {
            today: interviews.filter(i => new Date(i.scheduled_at).toDateString() === todayStr).length,
            week: interviews.filter(i => { const d = new Date(i.scheduled_at); return d >= startWeek && d < endWeek; }).length,
            pendingFeedback: interviews.filter(i => i.status === 'completed' && !i.feedback).length,
            completionRate: interviews.length
                ? Math.round((interviews.filter(i => i.status === 'completed').length / interviews.length) * 100)
                : 0,
        };
    }, [interviews, todayStr, startWeek, endWeek]);

    /* ─── Filter ─── */
    const filtered = useMemo(() => {
        return interviews.filter(iv => {
            if (statusFilter !== 'all' && iv.status !== statusFilter) return false;
            if (typeFilter !== 'all' && iv.type !== typeFilter) return false;
            if (dateFilter !== 'all') {
                const d = new Date(iv.scheduled_at);
                if (dateFilter === 'today' && d.toDateString() !== todayStr) return false;
                if (dateFilter === 'week' && (d < startWeek || d >= endWeek)) return false;
                if (dateFilter === 'month') {
                    const m = new Date(now.getFullYear(), now.getMonth(), 1);
                    const mEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
                    if (d < m || d >= mEnd) return false;
                }
            }
            if (search) {
                const q = search.toLowerCase();
                return (iv.candidate?.full_name || '').toLowerCase().includes(q) ||
                    (iv.job?.title || '').toLowerCase().includes(q);
            }
            return true;
        });
    }, [interviews, statusFilter, typeFilter, dateFilter, todayStr, startWeek, endWeek, search]);

    if (loading || authLoading) {
        return <HomeSkeleton />;
    }

    const filters = [
        {
            key: 'date',
            label: 'Time Filter',
            options: [
                { value: 'all', label: 'All Time' },
                { value: 'today', label: 'Today' },
                { value: 'week', label: 'This Week' },
                { value: 'month', label: 'This Month' }
            ],
            value: dateFilter,
            onChange: (val: string) => setDateFilter(val as DateFilter)
        },
        {
            key: 'type',
            label: 'Interview Type',
            options: [
                { value: 'all', label: 'All Types' },
                { value: 'video', label: 'Video Call' },
                { value: 'phone', label: 'Phone Call' },
                { value: 'in_person', label: 'In Person' },
                { value: 'technical', label: 'Technical' }
            ],
            value: typeFilter,
            onChange: setTypeFilter
        }
    ];

    const columns: Column<Interview>[] = [
        {
            header: 'Candidate',
            key: 'candidate.full_name',
            render: (iv) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {iv.candidate?.avatar_url ? (
                        <img src={getPublicStorageUrl('avatars', iv.candidate.avatar_url)} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--tm-surface-muted)', border: '1px solid var(--tm-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, color: 'var(--tm-accent)' }}>
                            {(iv.candidate?.full_name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600, color: 'var(--tm-text-primary)' }}>{iv.candidate?.full_name}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--tm-text-secondary)' }}>{iv.candidate?.email}</span>
                    </div>
                </div>
            )
        },
        {
            header: 'Job Role',
            key: 'job.title',
            render: (iv) => <span style={{ fontWeight: 500 }}>{iv.job?.title || '—'}</span>
        },
        {
            header: 'Type',
            key: 'type',
            render: (iv) => (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                    <TypeIcon t={iv.type} /> {typeLabel(iv.type)}
                </span>
            )
        },
        {
            header: 'Scheduled At',
            key: 'scheduled_at',
            render: (iv) => <span>{new Date(iv.scheduled_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
        },
        {
            header: 'Duration',
            key: 'duration_mins',
            render: (iv) => <span>{iv.duration_mins} min</span>
        },
        {
            header: 'Status',
            key: 'status',
            render: (iv) => <StatusPill status={iv.status} />
        }
    ];

    return (
        <div className={cn(styles.dash, styles.dashPremium)}>
            {/* Header */}
            <div className={styles.pageHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className={styles.pageHeaderTitle}>Interviews</h1>
                    <p className={styles.pageHeaderSub}>Manage and track all candidate interviews</p>
                </div>
                <button className={styles.primaryAction} style={{ width: 'auto', padding: '0.6rem 1.25rem', gap: '0.4rem' }} onClick={() => setShowModal(true)}>
                    {IC.plus} Schedule Interview
                </button>
            </div>

            {/* Stats */}
            <div className={styles.stats}>
                <StatCard label="Today" value={stats.today} icon={IC.calendar} delta="scheduled for today" />
                <StatCard label="This Week" value={stats.week} icon={IC.calendar} delta="in current week" />
                <StatCard label="Pending Feedback" value={stats.pendingFeedback} icon={IC.calendar} delta="completed, no feedback" />
                <StatCard label="Completion Rate" value={`${stats.completionRate}%`} icon={IC.calendar} delta="of total interviews" />
            </div>

            {/* Filter Bar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--tm-surface)', border: '1px solid var(--tm-border)', borderRadius: 'var(--tm-card-radius)', padding: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--tm-border)', paddingBottom: '0.75rem', flexWrap: 'wrap' }}>
                    {(['all', 'scheduled', 'completed', 'cancelled'] as StatusFilter[]).map(s => (
                        <button key={s}
                            style={{
                                padding: '0.45rem 1rem', borderRadius: '99px', fontSize: '0.8rem', fontWeight: 600,
                                border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                                background: statusFilter === s ? 'var(--tm-accent)' : 'var(--tm-surface-muted)',
                                color: statusFilter === s ? '#fff' : 'var(--tm-text-secondary)',
                            }}
                            onClick={() => setStatusFilter(s)}>
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                    ))}
                </div>

                <FilterBar
                    search={search}
                    onSearchChange={setSearch}
                    searchPlaceholder="Search by candidate or job..."
                    filters={filters}
                    onClearAll={() => {
                        setSearch('');
                        setDateFilter('all');
                        setTypeFilter('all');
                    }}
                />

                <DataTable
                    columns={columns}
                    data={filtered}
                    onRowClick={(row) => setSelectedIv(row)}
                />
            </div>

            {/* Detail Drawer */}
            <DetailDrawer
                isOpen={!!selectedIv}
                onClose={() => setSelectedIv(null)}
                title="Interview Details"
            >
                {selectedIv && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div>
                            <span style={{ textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 800, color: 'var(--tm-accent)', letterSpacing: '0.05em' }}>
                                {typeLabel(selectedIv.type)}
                            </span>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--tm-text-primary)', margin: '0.25rem 0 0.5rem' }}>
                                {selectedIv.candidate?.full_name}
                            </h3>
                            <p style={{ color: 'var(--tm-text-secondary)', margin: 0, fontSize: '0.875rem' }}>
                                Position: <strong>{selectedIv.job?.title}</strong>
                            </p>
                        </div>

                        <hr style={{ border: 'none', borderTop: '1px solid var(--tm-border)', margin: 0 }} />

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                <span style={{ color: 'var(--tm-text-secondary)' }}>Status:</span>
                                <StatusPill status={selectedIv.status} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                <span style={{ color: 'var(--tm-text-secondary)' }}>Scheduled At:</span>
                                <span style={{ fontWeight: 600 }}>{new Date(selectedIv.scheduled_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                <span style={{ color: 'var(--tm-text-secondary)' }}>Duration:</span>
                                <span style={{ fontWeight: 600 }}>{selectedIv.duration_mins} Minutes</span>
                            </div>
                            {selectedIv.meeting_link && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                    <span style={{ color: 'var(--tm-text-secondary)' }}>Meeting Link:</span>
                                    <a href={selectedIv.meeting_link} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--tm-accent)', textDecoration: 'underline', wordBreak: 'break-all' }}>
                                        Open Link
                                    </a>
                                </div>
                            )}
                            {selectedIv.location && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                    <span style={{ color: 'var(--tm-text-secondary)' }}>Location:</span>
                                    <span style={{ fontWeight: 600 }}>{selectedIv.location}</span>
                                </div>
                            )}
                        </div>

                        {selectedIv.notes && (
                            <>
                                <hr style={{ border: 'none', borderTop: '1px solid var(--tm-border)', margin: 0 }} />
                                <div>
                                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem' }}>Notes</h4>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--tm-text-secondary)', background: 'var(--tm-surface-muted)', padding: '0.75rem', borderRadius: '6px', whiteSpace: 'pre-wrap' }}>
                                        {selectedIv.notes}
                                    </p>
                                </div>
                            </>
                        )}

                        <hr style={{ border: 'none', borderTop: '1px solid var(--tm-border)', margin: 0 }} />

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {selectedIv.type === 'video' && selectedIv.meeting_link && selectedIv.status === 'scheduled' && (
                                <a
                                    href={selectedIv.meeting_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        display: 'block',
                                        textAlign: 'center',
                                        padding: '0.6rem',
                                        background: 'var(--tm-accent)',
                                        color: 'white',
                                        textDecoration: 'none',
                                        borderRadius: '6px',
                                        fontWeight: 600,
                                        fontSize: '0.875rem'
                                    }}
                                >
                                    Join Call
                                </a>
                            )}
                            {selectedIv.status === 'completed' && (
                                <button
                                    type="button"
                                    style={{
                                        padding: '0.6rem',
                                        background: 'var(--tm-accent)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        fontWeight: 600,
                                        fontSize: '0.875rem',
                                        cursor: 'pointer'
                                    }}
                                    onClick={() => router.push(`/dashboard/recruiter/${role_id}/interviews/${selectedIv.id}?tab=feedback`)}
                                >
                                    Add Feedback
                                </button>
                            )}
                            {selectedIv.status === 'scheduled' && (
                                <button
                                    type="button"
                                    style={{
                                        padding: '0.6rem',
                                        background: 'none',
                                        border: '1px solid var(--tm-status-error-text)',
                                        color: 'var(--tm-status-error-text)',
                                        borderRadius: '6px',
                                        fontWeight: 600,
                                        fontSize: '0.875rem',
                                        cursor: 'pointer'
                                    }}
                                    onClick={async () => {
                                        await insforge.database.from('interviews').update({ status: 'cancelled' }).eq('id', selectedIv.id);
                                        setSelectedIv(null);
                                        fetchInterviews();
                                        toast.success('Interview cancelled successfully');
                                    }}
                                >
                                    Cancel Interview
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </DetailDrawer>
        </div>
    );
}
