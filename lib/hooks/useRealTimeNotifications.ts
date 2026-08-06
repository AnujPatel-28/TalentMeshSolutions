"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { insforge, directInsforge } from '@/lib/insforge';
import { useAuth } from '@/lib/auth/AuthContext';

export interface NotificationData {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  metadata: any;
  created_at: string;
}

// Generate/retrieve a session-specific ID to scope BroadcastChannel events
const getSessionId = () => {
  if (typeof window === 'undefined') return '';
  let sid = window.sessionStorage.getItem('tm_session_id');
  if (!sid) {
    sid = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
    window.sessionStorage.setItem('tm_session_id', sid);
  }
  return sid;
};

export function useRealTimeNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Memoize BroadcastChannel to avoid creating new channels on every render
  const broadcastChannel = useMemo(() => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      return new BroadcastChannel('tm_notifications_sync');
    }
    return null;
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await insforge.database
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data) {
        setNotifications(data);
        const unread = data.filter((n: NotificationData) => !n.is_read).length;
        setUnreadCount(unread);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Handle cross-tab actions
  useEffect(() => {
    if (!broadcastChannel || !user) return;

    const handleBroadcast = (event: MessageEvent) => {
      const msg = event.data;
      // Filter out events that do not match current user and session scope
      if (msg.userId !== user.id || msg.sessionId !== getSessionId()) {
        return;
      }

      if (msg.action === 'MARK_READ') {
        setNotifications(prev => prev.map(n => n.id === msg.id ? { ...n, is_read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } else if (msg.action === 'MARK_ALL_READ') {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
      }
    };

    broadcastChannel.addEventListener('message', handleBroadcast);
    return () => {
      broadcastChannel.removeEventListener('message', handleBroadcast);
    };
  }, [user, broadcastChannel]);

  useEffect(() => {
    if (!user) return;

    fetchNotifications();

    const handleNewNotification = (payload: any) => {
      const newNotif = payload as NotificationData;
      
      setNotifications(prev => {
        // Deduplicate using notification ID and metadata job ID
        const isDuplicate = prev.some(n => 
          n.id === newNotif.id || 
          (newNotif.metadata?.job_id && n.metadata?.job_id === newNotif.metadata?.job_id)
        );

        if (isDuplicate) return prev;

        setUnreadCount(uc => uc + 1);

        // Show browser notification if permission granted
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          new Notification(newNotif.title, {
            body: newNotif.message,
            icon: '/TalentMesh_page-0002-removebg-preview.png',
          });
        }

        const updated = [newNotif, ...prev];
        return updated.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 20);
      });
    };

    let retryCount = 0;
    let timeoutId: any = null;

    const setupRealtime = async () => {
      try {
        await directInsforge.realtime.connect();
        await directInsforge.realtime.subscribe('notifications:' + user.id);
        directInsforge.realtime.on('INSERT_notifications', handleNewNotification);
        retryCount = 0; // Reset retry count on successful connection
      } catch (err) {
        console.error('Realtime connection error:', err);
        if (retryCount < 5) {
          const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
          retryCount++;
          console.log(`Retrying realtime connection in ${Math.round(delay)}ms (attempt ${retryCount}/5)`);
          timeoutId = setTimeout(setupRealtime, delay);
        }
      }
    };

    setupRealtime();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      directInsforge.realtime.off('INSERT_notifications', handleNewNotification);
      directInsforge.realtime.unsubscribe('notifications:' + user.id);
    };
  }, [user, fetchNotifications]);

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const { error } = await insforge.database
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (!error) {
        // Fetch all non-read notifications to update their receipts in the background
        const unreadNotifs = notifications.filter(n => !n.is_read);
        for (const notif of unreadNotifs) {
          const jobId = notif.metadata?.job_id;
          if (jobId) {
            await insforge.database
              .from('notification_receipts')
              .update({ read_at: new Date().toISOString() })
              .eq('notification_job_id', jobId)
              .eq('user_id', user.id);
          }
        }

        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);

        if (broadcastChannel) {
          broadcastChannel.postMessage({
            userId: user.id,
            sessionId: getSessionId(),
            action: 'MARK_ALL_READ'
          });
        }
      }
    } catch (err) {
      console.error('Error marking notifications as read:', err);
    }
  };

  const markAsRead = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await insforge.database
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (!error) {
        // Also update corresponding receipt
        const notif = notifications.find(n => n.id === id);
        const jobId = notif?.metadata?.job_id;
        if (jobId) {
          await insforge.database
            .from('notification_receipts')
            .update({ read_at: new Date().toISOString() })
            .eq('notification_job_id', jobId)
            .eq('user_id', user.id);
        }

        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));

        if (broadcastChannel) {
          broadcastChannel.postMessage({
            userId: user.id,
            sessionId: getSessionId(),
            action: 'MARK_READ',
            id
          });
        }
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  return {
    notifications,
    unreadCount,
    isLoading,
    markAllAsRead,
    markAsRead,
    refresh: fetchNotifications,
  };
}
