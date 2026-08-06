import React from 'react';
import styles from './interviews.module.css';

export default function InterviewsLoading() {
  return (
    <div className={styles.dash} style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style>{`
        @keyframes sk-pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        .sk-pulse {
          animation: sk-pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          background-color: #e2e8f0;
        }
      `}</style>
      <div className={styles.pageHeader}>
        <div className="sk-pulse" style={{ width: '200px', height: '28px', borderRadius: '4px' }} />
      </div>

      <div className={styles.mainLayout}>
        <div className={styles.contentCol} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Countdown card skeleton */}
          <div className="sk-pulse" style={{ width: '100%', height: '140px', borderRadius: '12px' }} />

          {/* Interviews List section header skeleton */}
          <div className="sk-pulse" style={{ width: '150px', height: '20px', borderRadius: '4px', marginTop: '10px' }} />

          {/* Interviews List card skeleton */}
          {[1, 2].map(i => (
            <div 
              key={i} 
              style={{ 
                background: '#ffffff', border: '1px solid #e2e5ea', borderRadius: '12px', 
                padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' 
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div className="sk-pulse" style={{ width: '35%', height: '16px', borderRadius: '4px' }} />
                <div className="sk-pulse" style={{ width: '15%', height: '14px', borderRadius: '4px' }} />
              </div>
              <div className="sk-pulse" style={{ width: '50%', height: '12px', borderRadius: '4px' }} />
              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <div className="sk-pulse" style={{ width: '100px', height: '32px', borderRadius: '6px' }} />
                <div className="sk-pulse" style={{ width: '120px', height: '32px', borderRadius: '6px' }} />
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar tips skeleton */}
        <div className={styles.sidebarCol} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="sk-pulse" style={{ width: '100%', height: '280px', borderRadius: '12px' }} />
        </div>
      </div>
    </div>
  );
}
