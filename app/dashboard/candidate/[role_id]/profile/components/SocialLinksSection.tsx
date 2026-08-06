import React from 'react';
import styles from '../../../../shared-dashboard.module.css';
import SectionStatus from './SectionStatus';

interface SocialLinksSectionProps {
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  portfolioUrl?: string | null;
  isEditing: boolean;
  onUpdate: (fields: {
    linkedin_url?: string;
    github_url?: string;
    portfolio_url?: string;
  }) => void;
  onEnterEdit?: () => void;
}

export default React.memo(function SocialLinksSection({
  linkedinUrl,
  githubUrl,
  portfolioUrl,
  isEditing,
  onUpdate,
  onEnterEdit
}: SocialLinksSectionProps) {
  
  const isComplete = !!linkedinUrl && (!!githubUrl || !!portfolioUrl);

  const handleConnectClick = () => {
    if (onEnterEdit) onEnterEdit();
  };

  return (
    <div className={styles.profileSection} id="socials-presence">
      <SectionStatus 
        title="Online Presence" 
        icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary-blue)' }}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>} 
        isComplete={isComplete} 
        required={false}
      />

      {isEditing ? (
        <div className={styles.editGrid}>
          <div className={styles.field}>
            <label className={styles.formLabel}>LinkedIn Profile URL</label>
            <input
              type="text"
              className={styles.formInput}
              placeholder="e.g. linkedin.com/in/username"
              value={linkedinUrl || ''}
              onChange={(e) => onUpdate({ linkedin_url: e.target.value })}
            />
            {linkedinUrl && !/^https?:\/\//i.test(linkedinUrl) && (
              <span className={styles.socialValidationWarning}>
                ⚠️ Omitted 'https://'. It will be added automatically on save.
              </span>
            )}
          </div>
          
          <div className={styles.field}>
            <label className={styles.formLabel}>GitHub Profile URL</label>
            <input
              type="text"
              className={styles.formInput}
              placeholder="e.g. github.com/username"
              value={githubUrl || ''}
              onChange={(e) => onUpdate({ github_url: e.target.value })}
            />
            {githubUrl && !/^https?:\/\//i.test(githubUrl) && (
              <span className={styles.socialValidationWarning}>
                ⚠️ Omitted 'https://'. It will be added automatically on save.
              </span>
            )}
          </div>

          <div className={styles.fieldFull}>
            <label className={styles.formLabel}>Portfolio or Personal Website URL</label>
            <input
              type="text"
              className={styles.formInput}
              placeholder="e.g. portfolio.com/username"
              value={portfolioUrl || ''}
              onChange={(e) => onUpdate({ portfolio_url: e.target.value })}
            />
            {portfolioUrl && !/^https?:\/\//i.test(portfolioUrl) && (
              <span className={styles.socialValidationWarning}>
                ⚠️ Omitted 'https://'. It will be added automatically on save.
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className={styles.socialRowsList}>
          {/* LinkedIn Row */}
          <div className={styles.socialRow}>
            <div className={styles.socialRowInfo}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className={`${styles.socialRowIconBranded} ${styles.iconLinkedIn}`}><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
              <span className={styles.socialRowName}>LinkedIn</span>
            </div>
            <div className={styles.socialRowStatus}>
              {linkedinUrl ? (
                <>
                  <span className={styles.socialConnectedBadge}>Connected ✓</span>
                  <a 
                    href={linkedinUrl.startsWith('http') ? linkedinUrl : `https://${linkedinUrl}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className={styles.socialViewBtn}
                  >
                    View URL
                  </a>
                </>
              ) : (
                <>
                  <span className={styles.socialNotConnectedBadge}>Not Added</span>
                  <button 
                    type="button"
                    onClick={handleConnectClick}
                    className={styles.socialActionBtn}
                  >
                    Connect
                  </button>
                </>
              )}
            </div>
          </div>

          {/* GitHub Row */}
          <div className={styles.socialRow}>
            <div className={styles.socialRowInfo}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className={`${styles.socialRowIconBranded} ${styles.iconGitHub}`}><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              <span className={styles.socialRowName}>GitHub</span>
            </div>
            <div className={styles.socialRowStatus}>
              {githubUrl ? (
                <>
                  <span className={styles.socialConnectedBadge}>Connected ✓</span>
                  <a 
                    href={githubUrl.startsWith('http') ? githubUrl : `https://${githubUrl}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className={styles.socialViewBtn}
                  >
                    View URL
                  </a>
                </>
              ) : (
                <>
                  <span className={styles.socialNotConnectedBadge}>Not Added</span>
                  <button 
                    type="button"
                    onClick={handleConnectClick}
                    className={styles.socialActionBtn}
                  >
                    Connect
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Portfolio Row */}
          <div className={styles.socialRow}>
            <div className={styles.socialRowInfo}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`${styles.socialRowIconBranded} ${styles.iconPortfolio}`}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              <span className={styles.socialRowName}>Portfolio</span>
            </div>
            <div className={styles.socialRowStatus}>
              {portfolioUrl ? (
                <>
                  <span className={styles.socialConnectedBadge}>Connected ✓</span>
                  <a 
                    href={portfolioUrl.startsWith('http') ? portfolioUrl : `https://${portfolioUrl}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className={styles.socialViewBtn}
                  >
                    View URL
                  </a>
                </>
              ) : (
                <>
                  <span className={styles.socialNotConnectedBadge}>Not Added</span>
                  <button 
                    type="button"
                    onClick={handleConnectClick}
                    className={styles.socialActionBtn}
                  >
                    Connect
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
