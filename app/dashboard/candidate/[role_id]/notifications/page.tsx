"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { insforge } from '@/lib/insforge';
import { useAuth } from '@/lib/auth/AuthContext';

type Notif = {
    id: string;
    title: string;
    message: string;
    type: string;
    is_read: boolean;
    created_at: string;
    action_url?: string;
};

function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

export default function CandidateNotificationsPage() {
    const params = useParams();
    const roleId = params.role_id as string;
    const { user } = useAuth();

    const [notifications, setNotifications] = useState<Notif[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.id) return;
        async function fetchNotifications() {
            setLoading(true);
            try {
                const { data } = await insforge.database
                    .from('notifications')
                    .select('*')
                    .eq('user_id', user!.id)
                    .order('created_at', { ascending: false })
                    .limit(30);
                setNotifications(data || []);
            } catch (e) {
                console.error('Failed to load notifications:', e);
            } finally {
                setLoading(false);
            }
        }
        fetchNotifications();
    }, [user?.id]);

    const handleMarkRead = async (id: string) => {
        try {
            await insforge.database
                .from('notifications')
                .update({ is_read: true })
                .eq('id', id);
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, is_read: true } : n)
            );
        } catch (e) {
            console.error('Failed to mark read:', e);
        }
    };

    const handleMarkAllRead = async () => {
        if (!user?.id) return;
        try {
            await insforge.database
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', user.id)
                .eq('is_read', false);
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        } catch (e) {
            console.error('Failed to mark all read:', e);
        }
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <div style={{ width: '100%', minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'Inter, system-ui, sans-serif' }}>
            <div style={{ maxWidth: '680px', margin: '0 auto', padding: '2.5rem 2rem 4rem' }}>

                {/* Header row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#12263A', margin: 0 }}>
                        Notifications
                        {unreadCount > 0 && (
                            <span style={{ marginLeft: '10px', fontSize: '14px', background: '#007BFF', color: '#fff', borderRadius: '9999px', padding: '2px 10px', fontWeight: 700, verticalAlign: 'middle' }}>
                                {unreadCount}
                            </span>
                        )}
                    </h1>
                    {unreadCount > 0 && (
                        <button
                            onClick={handleMarkAllRead}
                            style={{ fontSize: '13px', color: '#007BFF', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}
                        >
                            Mark all as read
                        </button>
                    )}
                </div>

                {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} style={{ background: '#fff', borderRadius: '10px', padding: '1.25rem', height: '72px', border: '1px solid #e2e5ea' }} />
                        ))}
                    </div>
                ) : notifications.length === 0 ? (
                    /* ─── Empty state matching Indeed reference image ─── */
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem 2rem', textAlign: 'center' }}>
                        {/* Bell illustration (stacked SVGs mimicking Indeed's style) */}
                        <div style={{ position: 'relative', width: 120, height: 110, marginBottom: '1.5rem' }}>
                            {/* Background parchment/card shape */}
                            <svg style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)' }} width="100" height="70" viewBox="0 0 100 70" fill="none">
                                <rect x="5" y="10" width="90" height="60" rx="6" fill="#F5E6C8" />
                            </svg>
                            {/* Orange circle accent */}
                            <svg style={{ position: 'absolute', top: 4, right: 10 }} width="36" height="36" viewBox="0 0 36 36" fill="none">
                                <circle cx="18" cy="18" r="18" fill="#F97316" opacity="0.85" />
                            </svg>
                            {/* Bell */}
                            <svg style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-55%)' }} width="72" height="72" viewBox="0 0 24 24" fill="#1e4d7b" stroke="#1e4d7b" strokeWidth="0.3">
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                            </svg>
                        </div>

                        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#12263A', margin: '0 0 0.75rem' }}>
                            Nothing right now. Check back later!
                        </h2>
                        <p style={{ fontSize: '14px', color: '#475569', margin: '0 0 2rem', maxWidth: '380px', lineHeight: 1.6 }}>
                            This is where we'll notify you about your job applications and other useful information to help you with your job search.
                        </p>
                        <Link
                            href="/candidate/dashboard"
                            style={{
                                display: 'inline-block',
                                background: '#007BFF',
                                color: '#ffffff',
                                textDecoration: 'none',
                                padding: '0.75rem 3rem',
                                borderRadius: '8px',
                                fontWeight: 700,
                                fontSize: '15px',
                                transition: 'background 0.15s'
                            }}
                        >
                            Find jobs
                        </Link>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                        {notifications.map((notif) => (
                            <div
                                key={notif.id}
                                onClick={() => handleMarkRead(notif.id)}
                                style={{
                                    background: notif.is_read ? '#ffffff' : '#EFF6FF',
                                    borderBottom: '1px solid #e2e5ea',
                                    padding: '1rem 1.25rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    gap: '12px',
                                    alignItems: 'flex-start',
                                    transition: 'background 0.12s'
                                }}
                                onMouseOver={e => { if (notif.is_read) e.currentTarget.style.background = '#f8fafc'; }}
                                onMouseOut={e => { e.currentTarget.style.background = notif.is_read ? '#ffffff' : '#EFF6FF'; }}
                            >
                                {/* Unread dot */}
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: notif.is_read ? 'transparent' : '#007BFF', flexShrink: 0, marginTop: '6px' }} />

                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                        <span style={{ fontSize: '14px', fontWeight: notif.is_read ? 400 : 700, color: '#12263A', lineHeight: 1.4 }}>
                                            {notif.title}
                                        </span>
                                        <span style={{ fontSize: '12px', color: '#94a3b8', flexShrink: 0 }}>
                                            {timeAgo(notif.created_at)}
                                        </span>
                                    </div>
                                    {notif.message && (
                                        <p style={{ fontSize: '13px', color: '#475569', margin: '3px 0 0', lineHeight: 1.5 }}>{notif.message}</p>
                                    )}
                                    {notif.action_url && (
                                        <Link
                                            href={notif.action_url}
                                            style={{ fontSize: '13px', color: '#007BFF', fontWeight: 600, textDecoration: 'none', display: 'inline-block', marginTop: '6px' }}
                                            onClick={e => e.stopPropagation()}
                                        >
                                            View details →
                                        </Link>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* Footer note */}
                        <p style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', padding: '1.5rem 0 0' }}>
                            You've seen all your notifications
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
