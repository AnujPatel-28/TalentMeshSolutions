'use client';

import React from 'react';
import * as Ico from 'lucide-react';
import styles from '../announcements.module.css';
import { 
  Announcement, 
  AnnouncementType, 
  getAudienceLabel 
} from '@/lib/hooks/useAdminAnnouncements';

interface AnnouncementCardProps {
  item: Announcement;
  fmtDate: (iso: string | null | undefined) => string;
  toggleActive: (item: Announcement) => void;
  openEdit: (item: Announcement) => void;
  handleDelete: (id: string) => void;
}

const TypeIcon = ({ type, size = 20 }: { type: AnnouncementType; size?: number }) => {
  switch (type) {
    case 'success':  return <Ico.CheckCircle size={size} />;
    case 'warning':  return <Ico.AlertTriangle size={size} />;
    case 'critical': return <Ico.AlertCircle size={size} />;
    default:         return <Ico.Info size={size} />;
  }
};

export default function AnnouncementCard({
  item,
  fmtDate,
  toggleActive,
  openEdit,
  handleDelete,
}: AnnouncementCardProps) {
  const fanoutPct = item.fanout_job && item.fanout_job.total_count 
    ? Math.min(100, Math.max(0, (item.fanout_job.processed_count / item.fanout_job.total_count) * 100))
    : 0;

  return (
    <div className={`${styles.card} ${!item.is_active ? styles.inactive : ''}`}>
      {/* Type icon */}
      <div className={`${styles.typeIcon} ${styles[item.type]}`}>
        <TypeIcon type={item.type} size={20} />
      </div>

      {/* Body */}
      <div className={styles.cardBody}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>{item.title}</span>
          <div className={styles.cardMeta}>
            <span className={styles.cardDate}>{fmtDate(item.created_at)}</span>
          </div>
        </div>

        <div className={styles.cardMessage} dangerouslySetInnerHTML={{ __html: item.message }} />

        {/* Image thumbnail */}
        {item.image_url && (
          <div className={styles.cardImageWrapper}>
            <img
              src={item.image_url}
              alt="Announcement image"
              className={styles.cardImageThumb}
            />
          </div>
        )}

        {item.fanout_job && (
          <div className={styles.fanoutProgressContainer}>
            <div className={styles.fanoutProgressHeader}>
              <span className={styles.fanoutStatusSpan}>
                {item.fanout_job.status === 'delivered' ? (
                  <span className={styles.fanoutStatusDelivered}>
                    <Ico.CheckCircle2 size={12} /> Fan-out Complete
                  </span>
                ) : item.fanout_job.status === 'failed' ? (
                  <span className={styles.fanoutStatusFailed}>
                    <Ico.AlertCircle size={12} /> Fan-out Failed
                  </span>
                ) : (
                  <span className={styles.fanoutStatusPending}>
                    <Ico.Loader2 size={12} className="animate-spin" /> Fanning out...
                  </span>
                )}
              </span>
              <span className={styles.fanoutCountSpan}>
                {item.fanout_job.processed_count} / {item.fanout_job.total_count || '?'} users
              </span>
            </div>
            <div className={styles.fanoutProgressBarTrack}>
              <div 
                className={`${styles.fanoutProgressBarFill} ${styles[item.fanout_job.status] || styles.pending}`} 
                style={{ width: `${fanoutPct}%` }} 
              />
            </div>
          </div>
        )}

        <div className={styles.cardFooter}>
          {/* Status badge: Published vs Draft */}
          {item.is_active ? (
            <span className={`${styles.badge} ${styles.badgePublished}`}>
              <Ico.CheckCircle size={10} /> Published
            </span>
          ) : (
            <span className={`${styles.badge} ${styles.badgeDraft}`}>
              <Ico.FileText size={10} /> Draft
            </span>
          )}

          {/* Type badge */}
          <span className={`${styles.badge} ${styles[item.type]}`}>
            <TypeIcon type={item.type} size={10} />
            {item.type}
          </span>

          {/* Audience badge */}
          <span className={`${styles.badge} ${styles.audience}`}>
            <Ico.Users size={10} />
            {getAudienceLabel(item.target_roles)}
          </span>

          {/* Banner badge */}
          {item.show_as_banner && (
            <span className={`${styles.badge} ${styles.banner}`}>
              <Ico.Layout size={10} /> Banner
            </span>
          )}

          {/* Scheduled badge */}
          {item.scheduled_at && (
            <span className={`${styles.badge} ${styles.scheduled}`}>
              <Ico.Clock size={10} /> {fmtDate(item.scheduled_at)}
            </span>
          )}

          {/* View / dismiss counts */}
          {(item.view_count > 0 || item.dismiss_count > 0) && (
            <>
              <span className={styles.statBadge}>
                <Ico.Eye size={10} /> {item.view_count ?? 0}
              </span>
              <span className={styles.statBadge}>
                <Ico.X size={10} /> {item.dismiss_count ?? 0}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className={styles.cardActions}>
        {/* Active toggle */}
        <label className={styles.toggle} title={item.is_active ? 'Deactivate' : 'Activate'}>
          <input
            type="checkbox"
            checked={item.is_active}
            onChange={() => toggleActive(item)}
          />
          <div className={styles.toggleTrack} />
          <div className={styles.toggleThumb} />
        </label>

        <button
          className={styles.iconBtn}
          onClick={() => openEdit(item)}
          title="Edit"
          type="button"
        >
          <Ico.Edit3 size={15} />
        </button>
        <button
          className={`${styles.iconBtn} ${styles.danger}`}
          onClick={() => handleDelete(item.id)}
          title="Delete"
          type="button"
        >
          <Ico.Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}
