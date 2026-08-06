import React from 'react';
import Skeleton from '@/components/ui/Skeleton';
import styles from '@/app/dashboard/shared-dashboard.module.css';

export default function AnalyticsLoading() {
  return (
    <div className={styles.dash}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderContent}>
          <Skeleton width={180} height="2rem" />
          <Skeleton width={260} height="1rem" style={{ marginTop: '0.5rem' }} />
        </div>
        <Skeleton width={130} height="2rem" />
      </div>

      {/* Row 1: 4 KPI stat cards */}
      <div className={styles.stats}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className={styles.stat}>
            <div className={styles.statTop}>
              <Skeleton width={90} height="0.8rem" />
              <Skeleton width={32} height={32} circle />
            </div>
            <Skeleton width={80} height="1.8rem" style={{ marginTop: '0.5rem' }} />
            <Skeleton width={140} height="0.7rem" style={{ marginTop: '0.3rem' }} />
          </div>
        ))}
      </div>

      {/* Row 2: Chart cards */}
      <div className={styles.mainGrid}>
        <div className={styles.leftCol}>
          <div className={styles.card}>
            <Skeleton width={160} height="1.2rem" style={{ marginBottom: '1rem' }} />
            <Skeleton width="100%" height="200px" style={{ borderRadius: '8px' }} />
          </div>
        </div>
        <div className={styles.rightCol}>
          <div className={styles.card}>
            <Skeleton width={130} height="1.2rem" style={{ marginBottom: '1rem' }} />
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
              <Skeleton width={100} height={100} circle />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} width="100%" height="0.8rem" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Table/breakdown card */}
      <div className={styles.card}>
        <Skeleton width={200} height="1.2rem" style={{ marginBottom: '1rem' }} />
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid #f1f5f9' }}>
            <Skeleton width="30%" height="0.9rem" />
            <Skeleton width={60} height="0.9rem" />
          </div>
        ))}
      </div>
    </div>
  );
}
