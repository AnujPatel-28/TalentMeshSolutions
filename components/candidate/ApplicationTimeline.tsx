'use client';
import React from 'react';
import { APPLICATION_STATUS_LABELS } from '@/lib/constants/application-status-map';
import styles from './ApplicationTimeline.module.css';

export interface StatusHistory {
  id: string;
  from_status: string | null;
  to_status: string;
  changed_at: string;
  note: string | null;
}

interface ApplicationTimelineProps {
  currentStatus: string;
  history: StatusHistory[];
  appliedAt: string;
}

const STAGES = [
  { key: 'applied', label: APPLICATION_STATUS_LABELS.applied },
  { key: 'reviewing', label: APPLICATION_STATUS_LABELS.reviewing },
  { key: 'shortlisted', label: APPLICATION_STATUS_LABELS.shortlisted },
  { key: 'interviewing', label: APPLICATION_STATUS_LABELS.interviewing },
  { key: 'offered', label: APPLICATION_STATUS_LABELS.offered },
  { key: 'hired', label: APPLICATION_STATUS_LABELS.hired },
];

const STAGE_ICONS: Record<string, () => React.JSX.Element> = {
  applied: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
      <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
      <path d="M10 9H8"/>
      <path d="M16 13H8"/>
      <path d="M16 17H8"/>
    </svg>
  ),
  reviewing: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  ),
  shortlisted: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  interviewing: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
      <line x1="16" x2="16" y1="2" y2="6"/>
      <line x1="8" x2="8" y1="2" y2="6"/>
      <line x1="3" x2="21" y1="10" y2="10"/>
      <path d="M8 14h.01"/>
      <path d="M12 14h.01"/>
      <path d="M16 14h.01"/>
    </svg>
  ),
  offered: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
      <path d="m9 12 2 2 4-4"/>
    </svg>
  ),
  hired: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
      <path d="M4 22h16"/>
      <path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34"/>
      <path d="M12 2a6 6 0 0 1 6 6v5a6 6 0 0 1-6 6 6 6 0 0 1-6-6V8a6 6 0 0 1 6-6z"/>
    </svg>
  )
};

const TERMINAL_STAGES: Record<string, { label: string, icon: string, class: string }> = {
  rejected: { label: APPLICATION_STATUS_LABELS.rejected, icon: '✕', class: styles.terminal },
  withdrawn: { label: APPLICATION_STATUS_LABELS.withdrawn, icon: '↩', class: styles.withdrawn },
};

const FRIENDLY_MESSAGES: Record<string, string> = {
  'applied': 'Application submitted successfully',
  'reviewing': 'Recruiter is reviewing your profile',
  'shortlisted': "You've been shortlisted for the next round!",
  'interviewing': 'Interview scheduled or in progress',
  'offered': 'Offer extended - congratulations!',
  'hired': 'Hired! Welcome to the team!',
  'rejected': 'Application closed',
  'withdrawn': 'Application withdrawn',
};

const STAGE_INDEX: Record<string, number> = {
  applied: 0,
  reviewing: 1,
  shortlisted: 2,
  interviewing: 3,
  offered: 4,
  hired: 5,
};

// Horizontal Compact Progress Timeline
export default function ApplicationTimeline({ currentStatus, history, appliedAt }: ApplicationTimelineProps) {
  const isTerminal = !!TERMINAL_STAGES[currentStatus];
  const currentIdx = STAGE_INDEX[currentStatus] ?? 0;

  const isStageCompleted = (stageKey: string) => {
    if (isTerminal) {
      const lastActiveEntry = [...history].reverse().find(h => STAGE_INDEX[h.to_status] !== undefined);
      if (!lastActiveEntry) return stageKey === 'applied';
      const lastActiveIdx = STAGE_INDEX[lastActiveEntry.to_status] ?? 0;
      return STAGE_INDEX[stageKey] <= lastActiveIdx;
    }
    return STAGE_INDEX[stageKey] < currentIdx;
  };

  const isStageCurrent = (stageKey: string) => {
    if (isTerminal) return false;
    return stageKey === currentStatus;
  };

  const getStageDate = (stageKey: string) => {
    const completed = isStageCompleted(stageKey);
    const current = isStageCurrent(stageKey);
    if (!completed && !current) return null;

    const entry = history.find(h => h.to_status === stageKey);
    if (!entry && stageKey === 'applied' && appliedAt) {
      return new Date(appliedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
    return entry ? new Date(entry.changed_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : null;
  };

  const isSegmentCompleted = (index: number) => {
    if (isTerminal) {
      const lastActiveEntry = [...history].reverse().find(h => STAGE_INDEX[h.to_status] !== undefined);
      if (!lastActiveEntry) return false;
      const lastActiveIdx = STAGE_INDEX[lastActiveEntry.to_status] ?? 0;
      return index < lastActiveIdx;
    }
    return index < currentIdx;
  };

  return (
    <div className={styles.timelineContainer}>
      <div className={styles.timeline}>
        {STAGES.map((stage, idx) => {
          const completed = isStageCompleted(stage.key);
          const current = isStageCurrent(stage.key);
          const date = getStageDate(stage.key);
          const RenderIcon = STAGE_ICONS[stage.key];
          
          return (
            <React.Fragment key={stage.key}>
              <div className={styles.stageNode}>
                <div className={`
                  ${styles.nodeCircle} 
                  ${completed ? styles.completed : ''} 
                  ${current ? styles.current : ''}
                  ${!completed && !current ? styles.pending : ''}
                `}>
                  <RenderIcon />
                </div>
                <div className={styles.stageInfo}>
                  <div className={styles.stageLabel}>{stage.label}</div>
                  {date && <div className={styles.stageDate}>{date}</div>}
                </div>
              </div>
              
              {idx < STAGES.length - 1 && (
                <div className={`
                  ${styles.connectorLine} 
                  ${isSegmentCompleted(idx) ? styles.connectorCompleted : ''}
                `} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// Vertical Recent Activity Timeline
export function RecentActivityTimeline({ currentStatus, history }: Omit<ApplicationTimelineProps, 'appliedAt'>) {
  const isTerminal = !!TERMINAL_STAGES[currentStatus];
  const currentIdx = STAGE_INDEX[currentStatus] ?? 0;

  const getStageStatusInfo = (stageKey: string) => {
    const isCompleted = isTerminal 
      ? (STAGE_INDEX[stageKey] <= (STAGE_INDEX[[...history].reverse().find(h => STAGE_INDEX[h.to_status] !== undefined)?.to_status || ''] ?? 0))
      : STAGE_INDEX[stageKey] <= currentIdx;
    const isCurrent = !isTerminal && stageKey === currentStatus;

    const entry = history.find(h => h.to_status === stageKey);
    const dateStr = entry 
      ? new Date(entry.changed_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      : null;

    return {
      isCompleted,
      isCurrent,
      date: isCompleted ? dateStr : null,
      note: isCompleted ? (entry?.note || FRIENDLY_MESSAGES[stageKey]) : 'Pending'
    };
  };

  return (
    <div className={styles.verticalTimelineContainer}>
      <div className={styles.verticalTimeline}>
        {STAGES.map((stage, index) => {
          const { isCompleted, isCurrent, date, note } = getStageStatusInfo(stage.key);
          const RenderIcon = STAGE_ICONS[stage.key];
          
          return (
            <div 
              key={stage.key} 
              className={`
                ${styles.verticalNode} 
                ${isCompleted ? styles.vCompleted : ''} 
                ${isCurrent ? styles.vCurrent : ''}
                ${!isCompleted ? styles.vPending : ''}
              `}
            >
              {index < STAGES.length - 1 && <div className={styles.verticalLine} />}
              
              <div className={styles.verticalDot}>
                {isCurrent && <span className={styles.pulseDot} />}
              </div>
              
              <div className={styles.verticalContent}>
                <div className={styles.verticalHeaderRow}>
                  <div className={styles.verticalTitleGroup}>
                    <div className={styles.verticalIconWrapper}>
                      <RenderIcon />
                    </div>
                    <h4 className={styles.verticalStageTitle}>{stage.label}</h4>
                  </div>
                  {date && <span className={styles.verticalDate}>{date}</span>}
                </div>
                <p className={styles.verticalDesc}>{note}</p>
              </div>
            </div>
          );
        })}

        {isTerminal && (
          <div className={`${styles.verticalNode} ${styles.vTerminal}`}>
            <div className={styles.verticalLine} style={{ display: 'none' }} />
            <div className={styles.verticalContent} style={{ paddingLeft: '32px' }}>
              <div className={styles.verticalHeaderRow}>
                <div className={styles.verticalTitleGroup}>
                  <div className={`${styles.verticalIconWrapper} ${styles.vTerminalIcon}`}>
                    ✕
                  </div>
                  <h4 className={styles.verticalStageTitle} style={{ color: currentStatus === 'rejected' ? '#e11d48' : '#64748b' }}>
                    {TERMINAL_STAGES[currentStatus].label}
                  </h4>
                </div>
                <span className={styles.verticalDate}>
                  {new Date(history.find(h => h.to_status === currentStatus)?.changed_at || '').toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className={styles.verticalDesc} style={{ paddingLeft: '28px' }}>
                {currentStatus === 'rejected' ? 'This application has concluded.' : 'You withdrew this application.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
