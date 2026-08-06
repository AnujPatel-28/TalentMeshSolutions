'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import styles from './AnnouncementBanner.module.css';
import { insforge } from '@/lib/insforge';

interface Announcement {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'critical';
    image_url?: string | null;
}

export default function AnnouncementBanner({ role }: { role: 'candidate' | 'recruiter' }) {
    const { user } = useAuth();
    const [announcement, setAnnouncement] = useState<Announcement | null>(null);
    const [isDismissed, setIsDismissed] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (!user) return;

        const fetchAnnouncement = async () => {
            try {
                const now = new Date().toISOString();

                // Fetch the most recent active banner for this role
                // Keep the filter simple to avoid PostgREST nested-AND quirks:
                // fetch candidates and filter scheduling client-side
                const { data, error } = await insforge.database
                    .from('announcements')
                    .select('id, title, message, type, image_url, scheduled_at, expires_at')
                    .eq('is_active', true)
                    .eq('show_as_banner', true)
                    .contains('target_roles', [role])
                    .order('created_at', { ascending: false })
                    .limit(10);

                if (error) throw error;
                if (!data || data.length === 0) return;

                // Client-side scheduling filter (safe, avoids PostgREST AND nesting issues)
                const validNow = data.filter((ann: any) => {
                    const scheduledOk = !ann.scheduled_at || ann.scheduled_at <= now;
                    const notExpired = !ann.expires_at || ann.expires_at > now;
                    return scheduledOk && notExpired;
                });

                if (validNow.length === 0) return;

                const ann = validNow[0];

                // Check local dismissal
                if (localStorage.getItem(`dismissed_announcement_${ann.id}`)) return;

                // Check DB dismissal
                const { data: dismissal } = await insforge.database
                    .from('announcement_dismissals')
                    .select('id')
                    .eq('announcement_id', ann.id)
                    .eq('user_id', user.id)
                    .single();

                if (dismissal) return;

                setAnnouncement(ann);
                setIsVisible(true);

                // Record one authenticated view; the database trigger updates the aggregate count.
                await insforge.database.from('announcement_views').insert({
                    announcement_id: ann.id,
                    user_id: user.id,
                });

            } catch {
                // Non-critical — banner errors are silent
            }
        };

        fetchAnnouncement();
    }, [user, role]);

    const handleDismiss = async () => {
        if (!announcement || !user) return;

        setIsDismissed(true);
        setTimeout(() => setIsVisible(false), 300);

        try {
            localStorage.setItem(`dismissed_announcement_${announcement.id}`, '1');

            await insforge.database.from('announcement_dismissals').insert({
                announcement_id: announcement.id,
                user_id: user.id,
            });

            // Dismissal insert drives the aggregate dismiss count via database trigger.
        } catch {
            // Silent
        }
    };

    if (!isVisible || !announcement) return null;



    const getIcon = (type: string) => {
        switch (type) {
            case 'success':
                return (
                    <svg className={styles.icon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                );
            case 'warning':
                return (
                    <svg className={styles.icon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                );
            case 'critical':
                return (
                    <svg className={styles.icon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                );
            default:
                return (
                    <svg className={styles.icon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                );
        }
    };

    return (
        <div className={`${styles.banner} ${styles[announcement.type]} ${isDismissed ? styles.fadeOut : ''}`}>
            <div className={styles.bannerContent}>
                {getIcon(announcement.type)}
                <div className={styles.text}>
                    <span className={styles.title}>{announcement.title}</span>
                    <span dangerouslySetInnerHTML={{ __html: announcement.message }} />
                </div>
            </div>
            {announcement.image_url && (
                <img
                    src={announcement.image_url}
                    alt=""
                    style={{
                        height: '36px',
                        borderRadius: '6px',
                        objectFit: 'cover',
                        flexShrink: 0,
                        border: '1px solid rgba(0,0,0,0.08)',
                    }}
                />
            )}
            <button className={styles.dismissBtn} onClick={handleDismiss} aria-label="Dismiss announcement">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
            </button>
        </div>
    );
}
