'use client';

import React from 'react';
import Link from 'next/link';
import { useSavedJobs } from '@/hooks/useSavedJobs';
import { useAuth } from '@/lib/auth/AuthContext';
import styles from './JobCard.module.css';

export interface JobCardProps {
  job: any;
  showActions?: boolean;
  compact?: boolean;
  showSave?: boolean;
}

const Ico = {
  Location: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>,
  Clock: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
  Sparkle: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="m12 3 1.912 5.885L20 10.8l-5.088 1.912L13 18.6l-1.912-5.888L6 10.8l5.088-1.915Z" /></svg>,
  ArrowR: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14m-7-7 7 7-7 7" /></svg>,
  Heart: ({ filled }: { filled: boolean }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? "#ef4444" : "none"} stroke={filled ? "#ef4444" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  )
};

export function JobCard({ job, showActions = true, compact = false, showSave = true }: JobCardProps) {
  const { user } = useAuth();
  const { isSaved, toggleSave } = useSavedJobs(user?.id || null);
  
  const matchColor = (s: number) => s >= 90 ? '#059669' : s >= 80 ? '#1E88E5' : '#475569';
  const company = job.company_profiles || job.companies || job.company || {};
  const initials = company.company_name ? company.company_name[0] : (job.company_name ? job.company_name[0] : 'J');

  const handleToggleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleSave(job.id);
  };

  const saved = isSaved(job.id);

  return (
    <div className={`${styles.card} ${compact ? styles.compact : ''}`}>
      {showSave && (
        <button
          className={`${styles.saveBtn} ${saved ? styles.saved : ''}`}
          onClick={handleToggleSave}
          title={saved ? "Remove from saved" : "Save job"}
          type="button"
        >
          <Ico.Heart filled={saved} />
        </button>
      )}

      <div className={styles.cardTop}>
        <div 
          className={styles.jobLogo} 
          style={{ background: company.color || '#0D47A1' }}
        >
          {company.initials || initials}
        </div>
        <div className={styles.jobInfo}>
          <div className={styles.jobTitle}>{job.title}</div>
          <div className={styles.jobMeta}>
            <span>{company.company_name || job.company_name}</span>
            <span className={styles.metaDot}>·</span>
            <Ico.Location /><span>{job.location}</span>
          </div>
        </div>
      </div>

      {!compact && (
        <div className={styles.badgeRow}>
          <span className={`${styles.typeBadge} ${styles[`type_${job.type?.replace(/[\s-]/g, '').toLowerCase() || 'other'}`]}`}>
            {job.type}
          </span>
          {job.salary && <span className={styles.salaryBadge}>{job.salary}</span>}
          {job.ai_match_rate >= 80 && (
            <span className={styles.matchBadge} style={{ color: matchColor(job.ai_match_rate) }}>
              <Ico.Sparkle /> {job.ai_match_rate}% Match
            </span>
          )}
        </div>
      )}

      {showActions && (
        <div className={styles.cardFooter}>
          <span className={styles.postedMeta}><Ico.Clock />{job.posted_days || 'Recently'} posted</span>
          {!compact && (
            <div className={styles.cardActions}>
              <Link href={`/browse-jobs/${job.id}`} className={styles.viewBtn}>
                View Details <Ico.ArrowR />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
