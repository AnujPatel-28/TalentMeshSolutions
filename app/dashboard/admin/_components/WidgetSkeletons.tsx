"use client";
import React from 'react';
import Skeleton from '@/components/ui/Skeleton';
import styles from '../../shared-dashboard.module.css';

export function StatsSkeleton() {
  return (
    <div className={styles.stats}>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className={styles.stat} style={{ animationDelay: `${i * 100}ms` }}>
          <div className={styles.statTop}>
            <Skeleton width="45%" height="0.8rem" />
            <Skeleton width={32} height={32} circle />
          </div>
          <Skeleton width="60%" height="1.8rem" style={{ marginTop: '0.75rem' }} />
          <Skeleton width="35%" height="0.7rem" style={{ marginTop: '0.5rem' }} />
        </div>
      ))}
    </div>
  );
}

export function AlertsSkeleton() {
  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <Skeleton width={120} height="1.2rem" />
      </div>
      {[1, 2].map((i) => (
        <div key={i} className={styles.actItem} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 0' }}>
          <Skeleton width={16} height={16} circle />
          <div style={{ flex: 1 }}>
            <Skeleton width="80%" height="0.9rem" />
          </div>
          <Skeleton width={60} height="1.8rem" style={{ borderRadius: '6px' }} />
        </div>
      ))}
    </div>
  );
}

export function ActivitiesSkeleton() {
  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <Skeleton width={130} height="1.2rem" />
        <Skeleton width={20} height={20} circle />
      </div>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className={styles.actItem} style={{ display: 'flex', gap: '0.75rem', padding: '0.85rem 0' }}>
          <Skeleton width={16} height={16} circle style={{ marginTop: '3px' }} />
          <div style={{ flex: 1 }}>
            <Skeleton width="90%" height="0.85rem" />
            <Skeleton width="30%" height="0.65rem" style={{ marginTop: '0.4rem' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function QuickActionsSkeleton() {
  return (
    <div className={styles.card}>
      <Skeleton width={100} height="1.2rem" style={{ marginBottom: '1rem' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} width="100%" height="2.5rem" style={{ borderRadius: '8px' }} />
        ))}
      </div>
    </div>
  );
}
