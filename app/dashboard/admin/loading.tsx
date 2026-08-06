'use client';
import React from 'react';
import { StatsSkeleton, AlertsSkeleton, ActivitiesSkeleton, QuickActionsSkeleton } from './_components/WidgetSkeletons';
import styles from '../shared-dashboard.module.css';

export default function AdminDashboardLoading() {
  return (
    <div className={`${styles.dash} ${styles.dashPremium}`}>
      <StatsSkeleton />
      <div className={styles.mainGrid}>
        <div className={styles.leftCol}>
          <AlertsSkeleton />
          <ActivitiesSkeleton />
        </div>
        <div className={styles.rightCol}>
          <QuickActionsSkeleton />
        </div>
      </div>
    </div>
  );
}
