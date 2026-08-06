"use client";

import React, { useState, useEffect } from 'react';
import styles from './notification-center.module.css';
import { formatDistanceToNow } from 'date-fns';
import { useRealTimeNotifications, NotificationData } from '@/lib/hooks/useRealTimeNotifications';
import EmptyState from '@/components/dashboard/EmptyState';


type Notification = {
    id: string;
    senderName: string;
    senderEmail: string;
    subject: string;
    snippet: string;
    body: string;
    timestamp: Date;
    read: boolean;
    folder: 'inbox' | 'archived';
};

// Map DB notification types to display-friendly sender names
const TYPE_SENDER_MAP: Record<string, { name: string; email: string }> = {
    application_update: { name: 'TalentMesh Solutions - HR', email: 'hr@talentmesh.com' },
    interview_scheduled: { name: 'TalentMesh Solutions - Recruiting', email: 'recruiting@talentmesh.com' },
    security_alert: { name: 'TalentMesh Solutions - Security', email: 'security@talentmesh.com' },
    system: { name: 'Platform Update', email: 'updates@talentmesh.com' },
    billing: { name: 'TalentMesh Solutions - Billing', email: 'billing@talentmesh.com' },
    welcome: { name: 'TalentMesh Solutions', email: 'noreply@talentmesh.com' },
};

function mapDbToNotification(n: NotificationData): Notification {
    const senderInfo = TYPE_SENDER_MAP[n.type] || { name: 'System Alerts', email: 'noreply@talentmesh.com' };
    return {
        id: n.id,
        senderName: senderInfo.name,
        senderEmail: senderInfo.email,
        subject: n.title,
        snippet: n.message.length > 100 ? n.message.slice(0, 100) + '...' : n.message,
        body: n.message,
        timestamp: new Date(n.created_at),
        read: n.is_read,
        folder: 'inbox',
    };
}

// Icons
const Icons = {
    inbox: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg>,
    archive: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>,
    back: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>,
    mailOpen: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.2 8.4c.5.38.8.97.8 1.6v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10a2 2 0 0 1 .8-1.6l8-6a2 2 0 0 1 2.4 0l8 6z"></path><line x1="22" y1="10" x2="12" y2="17"></line><line x1="2" y1="10" x2="12" y2="17"></line></svg>,
    check: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>,
    trash: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
    refresh: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>,
};

export default function NotificationCenter({ role }: { role: 'admin' | 'recruiter' | 'candidate' }) {
    const { notifications: dbNotifications, unreadCount: dbUnreadCount, isLoading, markAsRead, markAllAsRead, refresh } = useRealTimeNotifications();
    const [localNotifications, setLocalNotifications] = useState<Notification[]>([]);
    const [activeTab, setActiveTab] = useState<'inbox' | 'archived'>('inbox');
    const [selectedCategory, setSelectedCategory] = useState<'all' | 'application' | 'message' | 'interview' | 'offer' | 'system' | 'security'>('all');
    const [selectedId, setSelectedId] = useState<string | null>(null);

    // Sync DB notifications into local state
    useEffect(() => {
        setLocalNotifications(dbNotifications.map(mapDbToNotification));
    }, [dbNotifications]);

    const filteredNotifications = localNotifications.filter(n => {
        if (n.folder !== activeTab) return false;
        if (selectedCategory === 'all') return true;
        const dbN = dbNotifications.find(db => db.id === n.id);
        const type = dbN?.type || '';
        if (selectedCategory === 'application') return type.includes('application');
        if (selectedCategory === 'message') return type.includes('message') || type.includes('chat');
        if (selectedCategory === 'interview') return type.includes('interview');
        if (selectedCategory === 'offer') return type.includes('offer');
        if (selectedCategory === 'security') return type.includes('security');
        if (selectedCategory === 'system') return type.includes('system') || type.includes('welcome') || type.includes('billing');
        return true;
    });

    const selectedMessage = localNotifications.find(n => n.id === selectedId);
    
    const unreadCount = localNotifications.filter(n => !n.read && n.folder === 'inbox').length;

    const handleSelectMessage = (id: string) => {
        setSelectedId(id);
        // Mark as read locally + in DB
        setLocalNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        markAsRead(id);
    };

    const handleArchive = (id: string) => {
        setLocalNotifications(prev => prev.map(n => n.id === id ? { ...n, folder: 'archived' } : n));
        setSelectedId(null);
    };

    const handleDelete = (id: string) => {
        setLocalNotifications(prev => prev.filter(n => n.id !== id));
        setSelectedId(null);
    };

    const handleMarkAllRead = () => {
        setLocalNotifications(prev => prev.map(n => ({ ...n, read: true })));
        markAllAsRead();
    };

    return (
        <div className={`${styles.container} ${selectedId ? styles.viewingDetail : ''}`}>
            
            {/* ── Sidebar ── */}
            <div className={styles.sidebar}>
                <div className={styles.sidebarHeader}>
                    Notifications
                </div>
                
                <div 
                    className={`${styles.navItem} ${activeTab === 'inbox' ? styles.navItemActive : ''}`}
                    onClick={() => { setActiveTab('inbox'); setSelectedId(null); }}
                >
                    <div className={styles.navLabel}>
                        {Icons.inbox}
                        <span>Inbox</span>
                    </div>
                    {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
                </div>
                
                <div 
                    className={`${styles.navItem} ${activeTab === 'archived' ? styles.navItemActive : ''}`}
                    onClick={() => { setActiveTab('archived'); setSelectedId(null); }}
                >
                    <div className={styles.navLabel}>
                        {Icons.archive}
                        <span>Archived</span>
                    </div>
                </div>
            </div>

            {/* ── Message List ── */}
            <div className={styles.listContainer}>
                <div className={styles.listHeader}>
                    <span className={styles.listTitle}>
                        {activeTab === 'inbox' ? 'Inbox' : 'Archived'}
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {unreadCount > 0 && activeTab === 'inbox' && (
                            <button 
                                onClick={handleMarkAllRead}
                                style={{ 
                                    background: 'none', border: 'none', cursor: 'pointer', 
                                    color: '#2563eb', fontSize: '0.8rem', padding: '4px 8px',
                                    borderRadius: '4px',
                                }}
                                title="Mark all as read"
                            >
                                {Icons.check} Mark all read
                            </button>
                        )}
                        <button 
                            onClick={refresh}
                            style={{ 
                                background: 'none', border: 'none', cursor: 'pointer', 
                                color: '#64748b', padding: '4px',
                            }}
                            title="Refresh"
                        >
                            {Icons.refresh}
                        </button>
                    </div>
                </div>
                
                {/* Category Tabs Bar */}
                <div style={{
                    display: 'flex',
                    gap: '0.85rem',
                    borderBottom: '1px solid var(--color-border)',
                    padding: '0.5rem 1rem',
                    background: '#fafbfc',
                    overflowX: 'auto',
                    scrollbarWidth: 'none',
                    whiteSpace: 'nowrap'
                }}>
                    {(['all', 'application', 'message', 'interview', 'offer', 'system', 'security'] as const).map(cat => {
                        const isActive = selectedCategory === cat;
                        return (
                            <button
                                key={cat}
                                onClick={() => { setSelectedCategory(cat); setSelectedId(null); }}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    padding: '0.4rem 0.2rem',
                                    borderBottom: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
                                    color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
                                    fontWeight: isActive ? 700 : 600,
                                    fontSize: '0.78rem',
                                    cursor: 'pointer',
                                    textTransform: 'capitalize'
                                }}
                            >
                                {cat === 'all' ? 'All' : cat === 'application' ? 'Applications' : cat === 'message' ? 'Messages' : cat === 'interview' ? 'Interviews' : cat === 'offer' ? 'Offers' : cat}
                            </button>
                        );
                    })}
                </div>
                
                <div className={styles.scrollArea}>
                    {isLoading ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
                            Loading notifications...
                        </div>
                    ) : filteredNotifications.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
                            {activeTab === 'inbox' ? 'No new notifications' : 'No archived messages'}
                        </div>
                    ) : (
                        filteredNotifications.map(msg => (
                            <div 
                                key={msg.id} 
                                className={`${styles.messageItem} ${!msg.read ? styles.messageItemUnread : ''} ${selectedId === msg.id ? styles.messageItemActive : ''}`}
                                onClick={() => handleSelectMessage(msg.id)}
                            >
                                <div className={styles.avatar}>
                                    {msg.senderName.charAt(0).toUpperCase()}
                                </div>
                                <div className={styles.messageContent}>
                                    <div className={styles.messageTop}>
                                        <span className={styles.sender}>{msg.senderName}</span>
                                        <span className={styles.time}>
                                            {formatDistanceToNow(msg.timestamp, { addSuffix: true }).replace('about ', '')}
                                        </span>
                                    </div>
                                    <div className={styles.subject}>{msg.subject}</div>
                                    <div className={styles.snippet}>{msg.snippet}</div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* ── Detail Pane ── */}
            <div className={styles.detailContainer}>
                {selectedMessage ? (
                    <>
                        <div className={styles.detailHeader}>
                            <button className={styles.backBtn} onClick={() => setSelectedId(null)}>
                                {Icons.back}
                            </button>
                            <div className={styles.detailActions}>
                                {activeTab === 'inbox' && (
                                    <button className={styles.actionBtn} onClick={() => handleArchive(selectedMessage.id)} title="Archive">
                                        {Icons.archive} <span className="mobile-hide">Archive</span>
                                    </button>
                                )}
                                <button className={styles.actionBtn} onClick={() => handleDelete(selectedMessage.id)} title="Delete">
                                    {Icons.trash} <span className="mobile-hide">Delete</span>
                                </button>
                            </div>
                        </div>
                        
                        <div className={styles.detailScroll}>
                            <h2 className={styles.detailSubject}>{selectedMessage.subject}</h2>
                            
                            <div className={styles.detailMeta}>
                                <div className={styles.avatar}>
                                    {selectedMessage.senderName.charAt(0).toUpperCase()}
                                </div>
                                <div className={styles.detailSenderInfo}>
                                    <div className={styles.detailSenderName}>{selectedMessage.senderName}</div>
                                    <div className={styles.detailSenderEmail}>to me</div>
                                </div>
                                <div className={styles.detailTime}>
                                    {selectedMessage.timestamp.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                </div>
                            </div>
                            
                            <div className={styles.detailBody} style={{ whiteSpace: 'pre-wrap' }}>
                                {selectedMessage.body}
                            </div>
                        </div>
                    </>
                ) : (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        <EmptyState 
                            title="No notification selected"
                            description="Select a notification from the list on the left to view its details."
                            illustrationType="notifications"
                        />
                    </div>
                )}
            </div>

        </div>
    );
}
