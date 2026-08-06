"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import styles from './messages.module.css';
import { useAuth } from '@/lib/auth/AuthContext';
import { useMessages } from '@/lib/hooks/useMessages';
import { invokeFunction, insforge } from '@/lib/insforge';
import { useParams } from 'next/navigation';
import { useCandidateApplicationsQuery } from '@/lib/queries/applications';

export type Conversation = {
    partner_id: string;
    partner_name: string;
    partner_avatar: string | null;
    last_message: string;
    last_message_time: string;
    unread_count: number;
};
import { formatDistanceToNow } from 'date-fns';

export default function MessagesPage() {
    const { user } = useAuth();
    const params = useParams();
    const roleId = params.role_id as string;
    const { data: applications = [] } = useCandidateApplicationsQuery(roleId, !!user);

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConvoId, setSelectedConvoId] = useState<string | null>(null);
    const [loadingConvos, setLoadingConvos] = useState(true);
    const [messageText, setMessageText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [searchText, setSearchText] = useState('');

    const { messages, loading: loadingMessages, sendMessage } = useMessages(selectedConvoId);
    const scrollRef = useRef<HTMLDivElement>(null);

    const loadConversations = async () => {
        if (!user) return;
        try {
            // Fetch all messages where current user is sender or receiver
            const { data: msgs, error: msgsError } = await insforge.database
                .from('messages')
                .select('*')
                .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

            if (msgsError) throw msgsError;

            if (!msgs || msgs.length === 0) {
                setConversations([]);
                return;
            }

            // Sort messages latest first
            const sortedMsgs = [...msgs].sort((a, b) => 
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );

            // Group by partner_id
            const partnerMap = new Map<string, { lastMessage: string; lastTime: string; unreadCount: number }>();
            
            sortedMsgs.forEach(msg => {
                const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
                if (!partnerId) return;

                const existing = partnerMap.get(partnerId);
                const isUnread = msg.receiver_id === user.id && !msg.is_read;

                if (!existing) {
                    partnerMap.set(partnerId, {
                        lastMessage: msg.content,
                        lastTime: msg.created_at,
                        unreadCount: isUnread ? 1 : 0
                    });
                } else {
                    if (isUnread) {
                        existing.unreadCount += 1;
                    }
                }
            });

            const partnerIds = Array.from(partnerMap.keys());
            if (partnerIds.length === 0) {
                setConversations([]);
                return;
            }

            // Fetch partner profiles
            const { data: profiles, error: profilesError } = await insforge.database
                .from('profiles')
                .select('id, name, avatar_url')
                .in('id', partnerIds);

            if (profilesError) throw profilesError;

            const profilesMap = new Map(profiles?.map(p => [p.id, p]) ?? []);

            const convoList: Conversation[] = partnerIds.map(pId => {
                const pInfo = partnerMap.get(pId)!;
                const profile = profilesMap.get(pId);
                return {
                    partner_id: pId,
                    partner_name: profile?.name || 'User',
                    partner_avatar: profile?.avatar_url || null,
                    last_message: pInfo.lastMessage,
                    last_message_time: pInfo.lastTime,
                    unread_count: pInfo.unreadCount
                };
            });

            // Sort conversations by last message time descending
            convoList.sort((a, b) => 
                new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime()
            );

            setConversations(convoList);
        } catch (err) {
            console.error('Error loading conversations:', err);
        } finally {
            setLoadingConvos(false);
        }
    };

    useEffect(() => {
        if (user) {
            loadConversations();
        }
    }, [user]);

    // Auto scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!messageText.trim() || isSending || !selectedConvoId) return;

        setIsSending(true);
        try {
            await sendMessage(messageText);
            setMessageText('');
            // Refresh conversation list to show new last message
            loadConversations();
        } catch (err) {
            console.error('Failed to send message:', err);
        } finally {
            setIsSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const selectedConvo = useMemo(() =>
        conversations.find(c => c.partner_id === selectedConvoId),
        [conversations, selectedConvoId]);

    const filteredConversations = useMemo(() => {
        if (!searchText.trim()) return conversations;
        return conversations.filter(c => 
            c.partner_name.toLowerCase().includes(searchText.toLowerCase()) ||
            c.last_message.toLowerCase().includes(searchText.toLowerCase())
        );
    }, [conversations, searchText]);

    if (!user) {
        return (
            <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>🔒</div>
                <h3>Access Denied</h3>
                <p>Please log in to view your messages.</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Sidebar */}
            <div className={styles.sidebar}>
                <div className={styles.sidebarHeader}>
                    <h2>Messages</h2>
                    <div className={styles.searchWrapper}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.5">
                            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search chats..."
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            className={styles.searchInput}
                        />
                    </div>
                </div>
                <div className={styles.convoList}>
                    {loadingConvos ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                            <div className={styles.typing}>Loading conversations...</div>
                        </div>
                    ) : filteredConversations.length === 0 ? (
                        <div className={styles.emptyState}>
                            <p>{searchText ? 'No matching conversations.' : 'No messages yet. Apply to jobs to start a conversation with recruiters!'}</p>
                        </div>
                    ) : (
                        filteredConversations.map(convo => (
                            <div
                                key={convo.partner_id}
                                className={`${styles.convoItem} ${selectedConvoId === convo.partner_id ? styles.convoItemActive : ''}`}
                                onClick={() => setSelectedConvoId(convo.partner_id)}
                            >
                                <div className={styles.avatar}>
                                    {convo.partner_avatar ? (
                                        <img src={convo.partner_avatar} alt={convo.partner_name} />
                                    ) : (
                                        convo.partner_name[0].toUpperCase()
                                    )}
                                </div>
                                <div className={styles.convoInfo}>
                                    <div className={styles.convoTop}>
                                        <span className={styles.convoName}>{convo.partner_name}</span>
                                        <span className={styles.convoTime}>
                                            {formatDistanceToNow(new Date(convo.last_message_time), { addSuffix: true })}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span className={styles.convoPreview}>{convo.last_message}</span>
                                        {convo.unread_count > 0 && (
                                            <span className={styles.unreadBadge}>{convo.unread_count}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className={styles.chatArea}>
                {selectedConvoId ? (
                    <>
                        <div className={styles.chatHeader}>
                            <div className={styles.avatar}>
                                {selectedConvo?.partner_avatar ? (
                                    <img src={selectedConvo.partner_avatar} alt={selectedConvo.partner_name} />
                                ) : (
                                    selectedConvo?.partner_name?.[0]?.toUpperCase() || '?'
                                )}
                            </div>
                            <span className={styles.chatPartnerName}>{selectedConvo?.partner_name}</span>
                        </div>

                        <div className={styles.messagesList} ref={scrollRef}>
                            {loadingMessages ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                                    <div className={styles.typing}>Updating thread...</div>
                                </div>
                            ) : messages.length === 0 ? (
                                <div className={styles.emptyState}>
                                    <p>Start a conversation with {selectedConvo?.partner_name}</p>
                                </div>
                            ) : (
                                messages.map(msg => {
                                    const isOwn = msg.sender_id === user.id;
                                    return (
                                        <div key={msg.id} className={`${styles.messageRow} ${isOwn ? styles.messageRowOwn : ''}`}>
                                            <div className={`${styles.bubble} ${isOwn ? styles.bubbleOwn : styles.bubbleTheirs}`}>
                                                {msg.content}
                                                <span className={`${styles.messageTime} ${isOwn ? styles.messageTimeOwn : ''}`}>
                                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        <div className={styles.inputArea}>
                            <form onSubmit={handleSend} className={styles.inputWrapper}>
                                <textarea
                                    className={styles.textarea}
                                    placeholder="Type your message..."
                                    value={messageText}
                                    onChange={(e) => setMessageText(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    rows={1}
                                    disabled={isSending}
                                />
                                <button type="submit" className={styles.sendBtn} disabled={!messageText.trim() || isSending}>
                                    {isSending ? (
                                        <div style={{ width: 12, height: 12, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                                    ) : (
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="22" y1="2" x2="11" y2="13"></line>
                                            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                                        </svg>
                                    )}
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}>💬</div>
                        <h3>TalentMesh Connect</h3>
                        <p>Select a recruiter or job contact to view messages and coordinate interviews.</p>
                    </div>
                )}
            </div>

            {/* Context Sidebar (Right Pane) */}
            <div className={styles.rightPanel}>
                {selectedConvoId && selectedConvo ? (
                    <>
                        <div className={styles.panelSection}>
                            <span className={styles.panelTitle}>Recruiter</span>
                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                <div className={styles.avatar} style={{ width: '36px', height: '36px' }}>
                                    {selectedConvo.partner_avatar ? (
                                        <img src={selectedConvo.partner_avatar} alt={selectedConvo.partner_name} />
                                    ) : (
                                        selectedConvo.partner_name[0].toUpperCase()
                                    )}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text)' }}>{selectedConvo.partner_name}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Hiring Contact</div>
                                </div>
                            </div>
                        </div>

                        {/* Mapped Application Context */}
                        {(() => {
                            const app = applications.find(
                                (a: any) =>
                                    a.jobs?.recruiter_id === selectedConvoId ||
                                    a.jobs?.companies?.name === selectedConvo.partner_name
                            );
                            if (app) {
                                return (
                                    <>
                                        <div className={styles.panelSection}>
                                            <span className={styles.panelTitle}>Job Context</span>
                                            <div className={styles.panelCard}>
                                                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-text)' }}>{app.jobs?.title}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.1rem' }}>{app.jobs?.companies?.name}</div>
                                                <div style={{ marginTop: '0.6rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '0.7rem', color: '#10b981', background: '#ecfdf5', padding: '2px 8px', borderRadius: '100px', fontWeight: 700 }}>
                                                        {(app.jobs as any)?.match_score ? `${(app.jobs as any).match_score}% Match` : '85% Match'}
                                                    </span>
                                                    <span style={{
                                                        background: '#eff6ff',
                                                        color: '#007BFF',
                                                        padding: '0.2rem 0.5rem',
                                                        borderRadius: '6px',
                                                        fontSize: '0.68rem',
                                                        fontWeight: 700,
                                                        textTransform: 'uppercase'
                                                    }}>
                                                        {app.status}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className={styles.panelSection}>
                                            <span className={styles.panelTitle}>Files & Attachments</span>
                                            <div className={styles.fileItem}>
                                                <span className={styles.fileName}>📄 resume_final.pdf</span>
                                                <span className={styles.fileAction}>View</span>
                                            </div>
                                        </div>
                                    </>
                                );
                            }
                            return (
                                <div className={styles.panelSection}>
                                    <span className={styles.panelTitle}>Job Context</span>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                                        No active job application linked to this conversation.
                                    </div>
                                </div>
                            );
                        })()}
                    </>
                ) : (
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', textAlign: 'center', paddingTop: '2rem' }}>
                        Select a conversation to see context details.
                    </div>
                )}
            </div>
        </div>
    );
}
