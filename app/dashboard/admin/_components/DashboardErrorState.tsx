"use client";
import React from 'react';
import styles from '../../shared-dashboard.module.css';

// Controlled: `cooldown` is owned by the parent page. Retrying swaps this widget for a
// loading skeleton, so any backoff state held here would be discarded on unmount and the
// remounted widget would come back immediately clickable.
interface WidgetErrorStateProps {
  title?: string;
  errorMessage?: string;
  onRetry?: () => void;
  cooldown?: number;
}

export function WidgetErrorState({
  title = "Failed to load data",
  errorMessage = "An unexpected error occurred while fetching metrics.",
  onRetry,
  cooldown = 0
}: WidgetErrorStateProps) {
  const handleRetry = () => {
    if (cooldown > 0 || !onRetry) return;
    onRetry();
  };

  const isLocked = cooldown > 0;

  return (
    <div 
      className={styles.card} 
      style={{
        border: '1px solid #fee2e2',
        background: 'linear-gradient(135deg, #fef2f2 0%, #fff 100%)',
        padding: '1.25rem',
        borderRadius: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        animation: 'fadeIn 0.3s ease-in-out'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <svg 
          width="20" 
          height="20" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="#ef4444" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#991b1b' }}>{title}</span>
      </div>
      <p style={{ fontSize: '0.78rem', color: '#b91c1c', margin: 0, lineHeight: 1.4 }}>
        {errorMessage}
      </p>
      {onRetry && (
        <button
          onClick={handleRetry}
          disabled={isLocked}
          style={{
            alignSelf: 'flex-start',
            marginTop: '0.25rem',
            padding: '0.35rem 0.75rem',
            borderRadius: '6px',
            background: isLocked ? '#fca5a5' : '#ef4444',
            color: '#fff',
            border: 'none',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: isLocked ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s ease, transform 0.1s ease',
          }}
          onMouseOver={(e) => {
            if (!isLocked) e.currentTarget.style.background = '#dc2626';
          }}
          onMouseOut={(e) => {
            if (!isLocked) e.currentTarget.style.background = '#ef4444';
          }}
          onMouseDown={(e) => {
            if (!isLocked) e.currentTarget.style.transform = 'scale(0.97)';
          }}
          onMouseUp={(e) => {
            if (!isLocked) e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {isLocked ? `Wait ${cooldown.toFixed(1)}s` : 'Retry Load'}
        </button>
      )}
    </div>
  );
}

// Controlled for the same reason as WidgetErrorState above.
export function StatsErrorState({ onRetry, cooldown = 0 }: { onRetry?: () => void; cooldown?: number }) {
  const handleRetry = () => {
    if (cooldown > 0 || !onRetry) return;
    onRetry();
  };

  const isLocked = cooldown > 0;

  return (
    <div className={styles.stats}>
      {[1, 2, 3, 4].map((i) => (
        <div 
          key={i} 
          className={styles.stat} 
          style={{ 
            borderColor: '#fee2e2', 
            background: 'linear-gradient(135deg, #fdf2f2 0%, #fff 100%)',
            opacity: 0.95 
          }}
        >
          <div className={styles.statTop}>
            <span style={{ color: '#991b1b', fontWeight: 500, fontSize: '0.72rem' }}>Failed to Load</span>
            <span 
              className={styles.statIconBox} 
              style={{ background: '#fef2f2', color: '#ef4444' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            </span>
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ef4444', marginTop: '0.25rem' }}>—</span>
          {onRetry && (
            <button 
              onClick={handleRetry} 
              disabled={isLocked}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: isLocked ? '#fca5a5' : '#b91c1c', 
                fontSize: '0.65rem', 
                textAlign: 'left', 
                cursor: isLocked ? 'not-allowed' : 'pointer', 
                textDecoration: isLocked ? 'none' : 'underline',
                padding: 0,
                marginTop: '0.25rem',
                fontWeight: 600
              }}
            >
              {isLocked ? `${cooldown.toFixed(1)}s` : 'Retry'}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
