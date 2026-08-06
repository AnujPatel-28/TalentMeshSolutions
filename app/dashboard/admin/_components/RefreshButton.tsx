"use client";
import React, { useEffect, useState, useTransition } from 'react';
import { mutationQueue } from '@/lib/mutationQueue';
import styles from '../../shared-dashboard.module.css';

interface RefreshButtonProps {
  onRefresh: () => Promise<void>;
  isRefreshing: boolean;
  lastUpdated: number | null; // Timestamp in ms
}

export default function RefreshButton({ onRefresh, isRefreshing, lastUpdated }: RefreshButtonProps) {
  const [freshnessText, setFreshnessText] = useState('Synced just now');
  const [localLoading, setLocalLoading] = useState(false);

  // Periodic ticker to update freshness text
  useEffect(() => {
    if (!lastUpdated) {
      setFreshnessText('Never synced');
      return;
    }

    const updateFreshness = () => {
      const diffSecs = Math.floor((Date.now() - lastUpdated) / 1000);
      if (diffSecs < 5) {
        setFreshnessText('Synced just now');
      } else if (diffSecs < 60) {
        setFreshnessText(`Synced ${diffSecs}s ago`);
      } else {
        const mins = Math.floor(diffSecs / 60);
        setFreshnessText(`Synced ${mins}m ago`);
      }
    };

    updateFreshness();
    const interval = setInterval(updateFreshness, 5000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  const handleRefresh = async () => {
    if (isRefreshing || localLoading) return;
    setLocalLoading(true);

    try {
      // Enqueue via mutationQueue to ensure request safety & deduplication
      await mutationQueue.enqueue(
        async () => {
          await onRefresh();
        },
        () => {}, // No rollback needed for read-only refresh
        { key: 'dashboard_refresh' }
      );
    } catch (err: any) {
      console.warn('[RefreshButton] Click ignored/deduplicated:', err.message);
    } finally {
      setLocalLoading(false);
    }
  };

  const loading = isRefreshing || localLoading;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{freshnessText}</span>
      <button
        onClick={handleRefresh}
        disabled={loading}
        className={styles.moreBtn}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          padding: '0.4rem 0.75rem',
          borderRadius: '6px',
          fontSize: '0.85rem',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1,
          border: '1px solid #cbd5e1',
          background: '#fff',
          fontWeight: 500
        }}
        aria-label="Refresh Dashboard Metrics"
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className={loading ? styles.spinnerSmall : ''}
          style={{
            animation: loading ? 'spin 1s linear infinite' : 'none',
            transition: 'transform 0.2s'
          }}
        >
          <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
        </svg>
        <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
      </button>
    </div>
  );
}
