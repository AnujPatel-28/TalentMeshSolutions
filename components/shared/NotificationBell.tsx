"use client";

import React, { useState, useRef } from 'react';
import { Bell, Briefcase, UserCheck, Calendar, CheckCircle, XCircle, FileText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useRealTimeNotifications, NotificationData } from '@/lib/hooks/useRealTimeNotifications';
import { useClickOutside } from '@/lib/hooks/useClickOutside';
import styles from './NotificationBell.module.css';

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAllAsRead, markAsRead } = useRealTimeNotifications();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useClickOutside(dropdownRef, () => setIsOpen(false));

  const handleNotificationClick = async (notif: NotificationData) => {
    if (!notif.is_read) {
      await markAsRead(notif.id);
    }
    setIsOpen(false);

    const role_id = notif.metadata?.role_id || '';
    
    switch (notif.type) {
      case 'application_submitted':
      case 'application_shortlisted':
      case 'application_rejected':
      case 'interview_scheduled':
        router.push(`/dashboard/candidate/${role_id}/applications`);
        break;
      case 'recruiter_approved':
        router.push(`/dashboard/recruiter/${role_id}`);
        break;
      case 'job_approved':
        router.push(`/dashboard/recruiter/${role_id}/jobs`);
        break;
      case 'new_application':
        router.push(`/dashboard/admin/${role_id}/candidates`);
        break;
      default:
        // Generic fallback or specific metadata link
        if (notif.metadata?.link) {
          router.push(notif.metadata.link);
        }
        break;
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'application_submitted': return <FileText size={18} />;
      case 'application_shortlisted': return <UserCheck size={18} />;
      case 'application_rejected': return <XCircle size={18} />;
      case 'interview_scheduled': return <Calendar size={18} />;
      case 'recruiter_approved': return <CheckCircle size={18} />;
      case 'job_approved': return <CheckCircle size={18} />;
      case 'new_application': return <Briefcase size={18} />;
      default: return <Bell size={18} />;
    }
  };

  return (
    <div className={styles.container} ref={dropdownRef}>
      <button 
        className={styles.bellBtn} 
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className={styles.badge}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.header}>
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button className={styles.markAllBtn} onClick={markAllAsRead}>
                Mark all read
              </button>
            )}
          </div>

          <div className={styles.list}>
            {notifications.length > 0 ? (
              notifications.map((notif) => (
                <div 
                  key={notif.id} 
                  className={`${styles.item} ${!notif.is_read ? styles.itemUnread : ''}`}
                  onClick={() => handleNotificationClick(notif)}
                >
                  <div className={styles.iconWrapper}>
                    {getIcon(notif.type)}
                  </div>
                  <div className={styles.content}>
                    <span className={styles.title}>{notif.title}</span>
                    <span className={styles.message}>{notif.message}</span>
                    <span className={styles.time}>
                      {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  {!notif.is_read && <div className={styles.unreadDot} />}
                </div>
              ))
            ) : (
              <div className={styles.empty}>
                No notifications yet
              </div>
            )}
          </div>

          <div className={styles.footer}>
            <button className={styles.viewAll} onClick={() => setIsOpen(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
