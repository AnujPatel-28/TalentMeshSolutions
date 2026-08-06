"use client";

import { useState, useEffect, useCallback } from 'react';
import { insforge, directInsforge } from '@/lib/insforge';
import { useAuth } from '@/lib/auth/AuthContext';
import { invokeFunction } from '@/lib/insforge';

export type Message = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  job_id?: string;
};

export function useMessages(receiverId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!user || !receiverId) {
      setMessages([]);
      return;
    }

    setLoading(true);
    try {
      const res = await invokeFunction('messages', { 
        method: 'GET', 
        queries: { receiverId } 
      });
      setMessages(res.data || []);
      // Auto mark as read
      await invokeFunction('messages-mark-read', { 
        method: 'POST', 
        body: { receiverId } 
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, receiverId]);

  useEffect(() => {
    if (!user || !receiverId) return;

    fetchMessages();

    const handleNewMessage = (payload: any) => {
      const newMsg = payload as Message;
      // Only add if it belongs to this conversation
      if (
        (newMsg.sender_id === receiverId && newMsg.receiver_id === user.id) ||
        (newMsg.sender_id === user.id && newMsg.receiver_id === receiverId)
      ) {
        setMessages(prev => {
          if (prev.find(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        
        if (newMsg.receiver_id === user.id) {
          invokeFunction('messages-mark-read', { 
            method: 'POST', 
            body: { receiverId } 
          }).catch(console.error);
        }
      }
    };

    const setupRealtime = async () => {
      try {
        await directInsforge.realtime.connect();
        await directInsforge.realtime.subscribe('messages:' + user.id);
        directInsforge.realtime.on('INSERT_messages', handleNewMessage);
      } catch (err) {
        console.error('Realtime setup error:', err);
      }
    };

    setupRealtime();

    return () => {
        directInsforge.realtime.off('INSERT_messages', handleNewMessage);
        directInsforge.realtime.unsubscribe('messages:' + user.id);
    };
  }, [user, receiverId, fetchMessages]);

  const sendMessage = async (content: string, jobId?: string) => {
    if (!user || !receiverId) return;

    try {
      const res = await invokeFunction('messages', {
        method: 'POST',
        body: { receiverId, content, jobId }
      });
      const newMsg = res.data;
      if (!newMsg) throw new Error('Failed to send message');
      
      setMessages(prev => {
        if (prev.find(m => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      return newMsg;
    } catch (err: any) {
      console.error('Send error:', err);
      throw err;
    }
  };

  return {
    messages,
    loading,
    error,
    sendMessage,
    markAsRead: () => user && receiverId && invokeFunction('messages-mark-read', { 
      method: 'POST', 
      body: { receiverId } 
    }),
    refresh: fetchMessages
  };
}
