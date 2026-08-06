"use client";
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { insforge } from '@/lib/insforge';
import { useAuth } from '@/lib/auth/AuthContext';
import Link from 'next/link';
import styles from './interview-detail.module.css';
import { getPublicStorageUrl } from '@/lib/utils/storage-url';

/* ─── Types ─── */
interface Interview {
    id: string; job_id: string; candidate_id: string; recruiter_id: string;
    scheduled_at: string; duration_mins: number;
    type: 'video' | 'phone' | 'in_person' | 'technical';
    status: 'scheduled' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled';
    meeting_link: string | null; location: string | null;
    notes: string | null; feedback: string | null; rating: number | null; created_at: string;
    job: { id: string; title: string } | null;
    candidate: { id: string; full_name: string; email: string; avatar_url: string | null } | null;
}

/* ─── Icons ─── */
const IC = {
    arrow: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>,
    cal: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    clock: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    video: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>,
    phone: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8a19.79 19.79 0 01-3.07-8.64A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92v2z"/></svg>,
    map: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
    code: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
    link: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>,
    user: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    check: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>,
    x: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>,
};

/* ─── Helpers ─── */
function fmt(iso: string) {
    return new Date(iso).toLocaleString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: 'numeric', minute: '2-digit'
    });
}

function pillClass(s: Interview['status'], m: Record<string, string>) {
    return `${m.pill} ${
        s === 'scheduled' ? m.pillScheduled :
        s === 'completed' ? m.pillCompleted :
        s === 'cancelled' ? m.pillCancelled :
        s === 'no_show' ? m.pillNoShow :
        m.pillRescheduled
    }`;
}

function typeIcon(t: Interview['type']) {
    if (t === 'video') return IC.video;
    if (t === 'phone') return IC.phone;
    if (t === 'in_person') return IC.map;
    return IC.code;
}

/* ─── Toast ─── */
function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'error'; onClose: () => void }) {
    useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
    return (
        <div className={`${styles.toast} ${type === 'error' ? styles.toastError : ''}`}>
            {type === 'success' ? IC.check : IC.x} {msg}
        </div>
    );
}

/* ─── Star Rating Component ─── */
function StarRating({ value, onChange }: { value: number; onChange: (n: number) => void }) {
    const [hover, setHover] = useState(0);
    return (
        <div className={styles.stars}>
            {[1, 2, 3, 4, 5].map(n => (
                <button key={n} type="button"
                    className={`${styles.star} ${n <= (hover || value) ? styles.starFilled : ''}`}
                    onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
                    onClick={() => onChange(n)}>★</button>
            ))}
        </div>
    );
}

/* ─── Main ─── */
export default function InterviewDetailPage({ params }: { params: Promise<{ role_id: string; interview_id: string }> }) {
    const { role_id, interview_id } = React.use(params);
    const router = useRouter();
    useAuth(); // keeps AuthContext warm for session guard
    const [iv, setIv] = useState<Interview | null>(null);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [saving, setSaving] = useState(false);
    const [showReschedule, setShowReschedule] = useState(false);

    // Feedback state
    const [rating, setRating] = useState(0);
    const [feedback, setFeedback] = useState('');
    const [recommendation, setRecommendation] = useState('');

    // Notes
    const [notes, setNotes] = useState('');
    const notesSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Reschedule
    const [reDate, setReDate] = useState('');
    const [reTime, setReTime] = useState('');
    const [reReason, setReReason] = useState('');

    const fetchIv = useCallback(async () => {
        const { data } = await insforge.database
            .from('interviews')
            .select('*, job:jobs(id, title), candidate:profiles!candidate_id(id, full_name:name, email, avatar_url)')
            .eq('id', interview_id)
            .single();
        if (data) {
            const d = data as Interview;
            setIv(d);
            setRating(d.rating || 0);
            setFeedback(d.feedback || '');
            setNotes(d.notes || '');
        }
        setLoading(false);
    }, [interview_id]);

    useEffect(() => { fetchIv(); }, [fetchIv]);

    // Scroll to feedback section if hash present on mount
    useEffect(() => {
        if (typeof window !== 'undefined' && window.location.search.includes('tab=feedback')) {
            setTimeout(() => document.getElementById('feedback-section')?.scrollIntoView({ behavior: 'smooth' }), 300);
        }
    }, []);

    const updateStatus = async (status: Interview['status']) => {
        setSaving(true);
        const { error } = await insforge.database.from('interviews').update({ status }).eq('id', interview_id);
        if (!error) {
            setToast({ msg: `Interview marked as ${status.replace('_', ' ')}.`, type: 'success' });
            fetchIv();
        } else {
            setToast({ msg: 'Failed to update status.', type: 'error' });
        }
        setSaving(false);
    };

    const saveFeedback = async () => {
        if (!rating) return;
        setSaving(true);
        const { error } = await insforge.database.from('interviews')
            .update({ rating, feedback: feedback || null, notes: notes || null })
            .eq('id', interview_id);
        if (!error) {
            setToast({ msg: 'Feedback saved!', type: 'success' });
            fetchIv();
        } else {
            setToast({ msg: 'Failed to save feedback.', type: 'error' });
        }
        setSaving(false);
    };

    const autoSaveNotes = (val: string) => {
        setNotes(val);
        if (notesSaveTimer.current) clearTimeout(notesSaveTimer.current);
        notesSaveTimer.current = setTimeout(async () => {
            await insforge.database.from('interviews').update({ notes: val }).eq('id', interview_id);
        }, 1200);
    };

    const confirmReschedule = async () => {
        if (!reDate || !reTime) return;
        setSaving(true);
        const scheduled_at = new Date(`${reDate}T${reTime}`).toISOString();
        const { error } = await insforge.database.from('interviews')
            .update({ scheduled_at, status: 'rescheduled' })
            .eq('id', interview_id);
        if (!error) {
            setToast({ msg: 'Interview rescheduled!', type: 'success' });
            setShowReschedule(false);
            fetchIv();
        } else {
            setToast({ msg: 'Failed to reschedule.', type: 'error' });
        }
        setSaving(false);
    };

    if (loading) {
        return <div className={styles.page}><div className={styles.loadingWrap}><div className={styles.spinner} /></div></div>;
    }

    if (!iv) {
        return (
            <div className={styles.page}>
                <button className={styles.backBtn} onClick={() => router.back()}>{IC.arrow} Back</button>
                <div style={{ textAlign: 'center', padding: '4rem', color: '#6b7280' }}>Interview not found.</div>
            </div>
        );
    }

    const initials = (iv.candidate?.full_name || '?').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
    const isCompleted = iv.status === 'completed';
    const isScheduled = iv.status === 'scheduled';

    const recommendations = ['Strong Yes', 'Yes', 'Maybe', 'No'];

    return (
        <div className={styles.page}>
            {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

            <button className={styles.backBtn} onClick={() => router.push(`/dashboard/recruiter/${role_id}/interviews`)}>
                {IC.arrow} Back to Interviews
            </button>

            <div className={styles.grid}>
                {/* ── Left Column ── */}
                <div>
                    {/* Candidate Card */}
                    <div className={styles.card}>
                        <h2 className={styles.cardTitle}>Candidate</h2>
                        <div className={styles.candRow}>
                            {iv.candidate?.avatar_url
                                ? <img src={getPublicStorageUrl('avatars', iv.candidate.avatar_url)} alt="" className={styles.avatarImg} />
                                : <div className={styles.avatar}>{initials}</div>
                            }
                            <div>
                                <span className={styles.candName}>{iv.candidate?.full_name || 'Unknown'}</span>
                                <span className={styles.candEmail}>{iv.candidate?.email || '—'}</span>
                            </div>
                        </div>
                        {iv.job && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>Applying for:</span>
                                <Link href={`/dashboard/recruiter/${role_id}/jobs/${iv.job.id}`} className={styles.jobLink}>
                                    {IC.link} {iv.job.title}
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Interview Details Card */}
                    <div className={styles.card}>
                        <h2 className={styles.cardTitle}>Interview Details</h2>
                        <div className={styles.detailRow}>
                            <span className={styles.detailIcon}>{typeIcon(iv.type)}</span>
                            <span className={styles.detailLabel}>Type</span>
                            <span className={styles.detailValue}>{{ video: 'Video Call', phone: 'Phone Call', in_person: 'In Person', technical: 'Technical' }[iv.type]}</span>
                        </div>
                        <div className={styles.detailRow}>
                            <span className={styles.detailIcon}>{IC.cal}</span>
                            <span className={styles.detailLabel}>Scheduled</span>
                            <span className={styles.detailValue}>{fmt(iv.scheduled_at)}</span>
                        </div>
                        <div className={styles.detailRow}>
                            <span className={styles.detailIcon}>{IC.clock}</span>
                            <span className={styles.detailLabel}>Duration</span>
                            <span className={styles.detailValue}>{iv.duration_mins} minutes</span>
                        </div>
                        {iv.meeting_link && (
                            <div className={styles.detailRow}>
                                <span className={styles.detailIcon}>{IC.link}</span>
                                <span className={styles.detailLabel}>Meeting Link</span>
                                <a href={iv.meeting_link} target="_blank" rel="noopener noreferrer" className={styles.meetLink}>
                                    Join Call →
                                </a>
                            </div>
                        )}
                        {iv.location && (
                            <div className={styles.detailRow}>
                                <span className={styles.detailIcon}>{IC.map}</span>
                                <span className={styles.detailLabel}>Location</span>
                                <span className={styles.detailValue}>{iv.location}</span>
                            </div>
                        )}
                    </div>

                    {/* Feedback Form */}
                    {isCompleted && (
                        <div className={styles.card} id="feedback-section">
                            <h2 className={styles.cardTitle}>Feedback</h2>
                            <label className={styles.label}>Rating</label>
                            <StarRating value={rating} onChange={setRating} />
                            <div className={styles.formRow}>
                                <label className={styles.label}>Feedback Notes</label>
                                <textarea className={styles.textarea} rows={4} value={feedback}
                                    onChange={e => setFeedback(e.target.value)}
                                    placeholder="How did the interview go? Strengths, areas for improvement…" />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label className={styles.label}>Recommendation</label>
                                <div className={styles.recGrid}>
                                    {recommendations.map(r => (
                                        <button key={r} type="button"
                                            className={`${styles.recOption} ${recommendation === r ? styles.recActive : ''}`}
                                            onClick={() => setRecommendation(r)}>{r}</button>
                                    ))}
                                </div>
                            </div>
                            <button className={styles.btnPrimary} onClick={saveFeedback} disabled={saving || !rating}>
                                {saving ? 'Saving…' : 'Save Feedback'}
                            </button>
                        </div>
                    )}

                    {/* Notes */}
                    <div className={styles.card}>
                        <h2 className={styles.cardTitle}>Notes</h2>
                        <textarea className={styles.notesArea} value={notes}
                            onChange={e => autoSaveNotes(e.target.value)}
                            placeholder="Add private notes about this interview…" />
                        <span className={styles.notesHint}>Auto-saves on change</span>
                    </div>
                </div>

                {/* ── Right Column ── */}
                <div>
                    {/* Status Card */}
                    <div className={styles.card}>
                        <h2 className={styles.cardTitle}>Status</h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                            <span className={pillClass(iv.status, styles)}>
                                {iv.status.replace('_', ' ')}
                            </span>
                        </div>
                        {isScheduled && (
                            <>
                                <button className={styles.btnPrimary} onClick={() => updateStatus('completed')} disabled={saving}>
                                    {IC.check} Mark Complete
                                </button>
                                <button className={styles.btnSecondary} onClick={() => setShowReschedule(s => !s)}>
                                    Reschedule
                                </button>
                                <button className={styles.btnDanger} onClick={() => updateStatus('cancelled')} disabled={saving}>
                                    {IC.x} Cancel Interview
                                </button>
                            </>
                        )}
                        {isCompleted && (
                            <div style={{ padding: '0.75rem', background: '#f0fdf4', borderRadius: 8, textAlign: 'center' }}>
                                <span style={{ color: '#16a34a', fontWeight: 700, fontSize: '0.875rem' }}>
                                    {IC.check} Completed
                                </span>
                                {iv.rating && <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: '0.25rem 0 0' }}>
                                    Rating: {'★'.repeat(iv.rating)}{'☆'.repeat(5 - iv.rating)}
                                </p>}
                            </div>
                        )}
                        {iv.status === 'cancelled' && (
                            <div style={{ padding: '0.75rem', background: '#fef2f2', borderRadius: 8, textAlign: 'center' }}>
                                <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.875rem' }}>Cancelled</span>
                            </div>
                        )}

                        {/* Reschedule Form */}
                        {showReschedule && (
                            <div className={styles.rescheduleForm}>
                                <div className={styles.rowTwo}>
                                    <div className={styles.formRow}>
                                        <label className={styles.label}>New Date</label>
                                        <input type="date" className={styles.input} value={reDate}
                                            onChange={e => setReDate(e.target.value)} />
                                    </div>
                                    <div className={styles.formRow}>
                                        <label className={styles.label}>New Time</label>
                                        <input type="time" className={styles.input} value={reTime}
                                            onChange={e => setReTime(e.target.value)} />
                                    </div>
                                </div>
                                <div className={styles.formRow}>
                                    <label className={styles.label}>Reason <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional)</span></label>
                                    <textarea className={styles.textarea} rows={2} value={reReason}
                                        onChange={e => setReReason(e.target.value)}
                                        placeholder="Why are you rescheduling?" />
                                </div>
                                <button className={styles.btnPrimary} onClick={confirmReschedule} disabled={saving || !reDate || !reTime}>
                                    {saving ? 'Saving…' : 'Confirm Reschedule'}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Application History */}
                    <div className={styles.card}>
                        <h2 className={styles.cardTitle}>Application Timeline</h2>
                        <div className={styles.timeline}>
                            <div className={styles.timelineItem}>
                                <div className={styles.tlDot} />
                                <div className={styles.tlContent}>
                                    <span className={styles.tlStatus}>Interview Scheduled</span>
                                    <span className={styles.tlDate}>{fmt(iv.created_at)}</span>
                                </div>
                            </div>
                            {iv.status !== 'scheduled' && (
                                <div className={styles.timelineItem}>
                                    <div className={styles.tlDot} style={{ background: iv.status === 'completed' ? '#16a34a' : iv.status === 'cancelled' ? '#ef4444' : '#ca8a04' }} />
                                    <div className={styles.tlContent}>
                                        <span className={styles.tlStatus}>{iv.status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
                                        <span className={styles.tlDate}>{fmt(iv.scheduled_at)}</span>
                                    </div>
                                </div>
                            )}
                            {iv.feedback && (
                                <div className={styles.timelineItem}>
                                    <div className={styles.tlDot} style={{ background: '#7c3aed' }} />
                                    <div className={styles.tlContent}>
                                        <span className={styles.tlStatus}>Feedback Added</span>
                                        <span className={styles.tlDate}>Rating: {iv.rating}/5</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
