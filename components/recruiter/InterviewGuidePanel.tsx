"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './InterviewGuidePanel.module.css';
import { insforge } from '@/lib/insforge';
import { InterviewGuideRecord } from '@/types/recruiter';

interface InterviewGuidePanelProps {
  jobId: string;
}

const IC = {
  sparkles: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.912 5.813h6.112l-4.944 3.593 1.888 5.794-4.968-3.612-4.968 3.612 1.888-5.794-4.944-3.593h6.112z" />
    </svg>
  ),
  chevronRight: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
};

export default function InterviewGuidePanel({ jobId }: InterviewGuidePanelProps) {
  const [lastGuide, setLastGuide] = useState<InterviewGuideRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLastGuide() {
      try {
        const { data, error } = await insforge.database
          .from('interview_guides')
          .select('*')
          .eq('job_id', jobId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data) {
          setLastGuide(data);
        }
      } catch (err) {
        console.error('Error fetching last guide:', err);
      } finally {
        setLoading(false);
      }
    }

    if (jobId) {
      fetchLastGuide();
    }
  }, [jobId]);

  if (loading) {
    return (
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2 className={styles.title}>{IC.sparkles} AI Interview Guide</h2>
        </div>
        <div className={styles.emptyState}>Loading guide status...</div>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2 className={styles.title}>{IC.sparkles} AI Interview Guide</h2>
        <span className={styles.auraBadge}>✦ Aura AI</span>
      </div>

      <div className={styles.content}>
        {lastGuide ? (
          <>
            <div className={styles.summary}>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Type</span>
                <span className={styles.statValue}>{lastGuide.interview_type}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Questions</span>
                <span className={styles.statValue}>
                  {lastGuide.guide_data.sections?.reduce((acc, s) => acc + (s.questions?.length || 0), 0) || 0}
                </span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Generated</span>
                <span className={styles.statValue}>
                  {new Date(lastGuide.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Link 
                href={`./${jobId}/interview-guide`} 
                className={styles.viewFullLink}
              >
                View Full Guide {IC.chevronRight}
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className={styles.emptyState}>
              No interview guide generated yet. Create one to help you evaluate candidates.
            </div>
            <Link 
              href={`./${jobId}/interview-guide`} 
              className={styles.generateBtn}
            >
              {IC.sparkles} Generate Interview Guide
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
