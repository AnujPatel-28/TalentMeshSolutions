import React from 'react';
import styles from '../../../../shared-dashboard.module.css';

interface SectionStatusProps {
  title: string;
  icon?: React.ReactNode;
  count?: number;
  isComplete: boolean;
  required?: boolean;
}

export default React.memo(function SectionStatus({ 
  title, 
  icon, 
  count, 
  isComplete,
  required = false
}: SectionStatusProps) {
  return (
    <div className={styles.sectionHead}>
      <h2 className={styles.sectionTitle}>
        <span 
          className={styles.sectionStatusIcon} 
          data-status={isComplete ? "complete" : required ? "warning" : "optional"}
          title={isComplete ? "Completed" : required ? "Missing Action" : "Optional Section"}
        >
          {isComplete ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          ) : required ? (
            <span style={{ fontSize: '11px', fontWeight: 900 }}>!</span>
          ) : (
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8' }}>•</span>
          )}
        </span>
        {icon && <span className={styles.metaIcon} style={{ marginRight: '4px' }}>{icon}</span>}
        {title}
        {count !== undefined && (
          <span className={styles.sectionCounter}>({count})</span>
        )}
      </h2>
    </div>
  );
});
