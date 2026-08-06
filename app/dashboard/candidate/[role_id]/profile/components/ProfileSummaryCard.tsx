import React from 'react';
import styles from '../../../../shared-dashboard.module.css';
import { getPublicStorageUrl } from '@/lib/utils/storage-url';

interface ProfileSummaryCardProps {
  name: string;
  headline?: string;
  avatarUrl?: string | null;
  location?: string | null;
  experienceYears?: number;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  isVisible?: boolean;
  resumeUrl?: string | null;
  isEditing: boolean;
  uploadProgressAvatar: number;
  email: string;
  phone?: string | null;
  completionScore: number;
  updatedAt?: string | null;
  onAvatarClick: () => void;
  onResumePreview: () => void;
  onResumeDownload: () => void;
  onResumeUploadClick: () => void;
  onEditToggle: () => void;
}

export default React.memo(function ProfileSummaryCard({
  name,
  headline,
  avatarUrl,
  location,
  experienceYears = 0,
  salaryMin,
  salaryMax,
  currency = 'INR',
  isVisible = true,
  resumeUrl,
  isEditing,
  uploadProgressAvatar,
  email,
  phone,
  completionScore,
  updatedAt,
  onAvatarClick,
  onResumePreview,
  onResumeDownload,
  onResumeUploadClick,
  onEditToggle
}: ProfileSummaryCardProps) {
  
  const formattedSalary = React.useMemo(() => {
    if (!salaryMin && !salaryMax) return 'Salary not specified';
    const symbol = currency === 'INR' ? '₹' : (currency === 'USD' ? '$' : currency + ' ');
    const formattedMin = salaryMin ? salaryMin.toLocaleString('en-IN') : null;
    const formattedMax = salaryMax ? salaryMax.toLocaleString('en-IN') : null;
    if (formattedMin && formattedMax) return `${symbol}${formattedMin} - ${symbol}${formattedMax} Monthly`;
    if (formattedMin) return `${symbol}${formattedMin}+ Monthly`;
    return `${symbol}${formattedMax} max Monthly`;
  }, [salaryMin, salaryMax, currency]);

  const initials = React.useMemo(() => {
    return (name || 'User')
      .split(' ')
      .filter(Boolean)
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }, [name]);

  const lastUpdatedText = React.useMemo(() => {
    if (!updatedAt) return 'Updated recently';
    try {
      const diffTime = Math.abs(new Date().getTime() - new Date(updatedAt).getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays < 1) return 'Updated today';
      if (diffDays === 1) return 'Updated yesterday';
      return `Updated ${diffDays} days ago`;
    } catch {
      return 'Updated recently';
    }
  }, [updatedAt]);

  return (
    <div className={styles.summaryCard} id="profile-summary-header">
      {/* Column 1: Avatar / Photo */}
      <div className={styles.avatarCol}>
        <div
          className={styles.summaryAvatar}
          style={{ cursor: isEditing ? 'pointer' : 'default' }}
          onClick={onAvatarClick}
          role={isEditing ? 'button' : 'img'}
          aria-label={isEditing ? 'Change profile photo' : `${name}'s avatar`}
        >
          {avatarUrl ? (
            <img 
              src={getPublicStorageUrl('avatars', avatarUrl)} 
              alt={name} 
              className={styles.avatarImg} 
            />
          ) : (
            <span>{initials}</span>
          )}
          {isEditing && (
            <div className={styles.avatarOverlay} aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>
          )}
          <span className={styles.onlineDot} />
        </div>

        {uploadProgressAvatar > 0 && uploadProgressAvatar < 100 && (
          <div className={styles.uploadProgressSmall}>
            <div className={styles.progressFill} style={{ width: `${uploadProgressAvatar}%` }} />
          </div>
        )}
      </div>

      {/* Column 2: Info & Details */}
      <div className={styles.summaryDetails}>
        <div>
          <h1 className={styles.summaryName}>{name || 'Add your name'}</h1>
          <p className={styles.summaryHeadline}>{headline || 'Add professional headline'}</p>
        </div>

        {/* Integrated Contact Details Block */}
        <div className={styles.contactRow}>
          <span className={styles.contactRowItem} title="Email Address">
            <span className={styles.contactRowIcon}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            </span>
            {email}
          </span>
          <span className={styles.contactRowItem} title="Phone Number">
            <span className={styles.contactRowIcon}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            </span>
            {phone || 'Phone not added'}
          </span>
          <span className={styles.lastUpdatedText}>• {lastUpdatedText}</span>
        </div>

        {/* Metadata Badges */}
        <div className={styles.summaryMetaGrid}>
          <div className={styles.metaItem}>
            <span className={styles.metaIcon}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
            </span>
            <span>{experienceYears} Years Experience</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaIcon}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            </span>
            <span>{location || 'Location not set'}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaIcon}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </span>
            <span>{formattedSalary}</span>
          </div>
          <span className={isVisible ? styles.visibilityBadgeVisible : styles.visibilityBadgeHidden}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '2px' }}><polyline points="20 6 9 17 4 12"/></svg>
            {isVisible ? 'Open to Work' : 'Hidden'}
          </span>
          <span className={resumeUrl ? styles.visibilityBadgeVisible : styles.visibilityBadgeHidden}>
            {resumeUrl ? (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '2px' }}><polyline points="20 6 9 17 4 12"/></svg>
                Resume Uploaded
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '2px' }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                No Resume
              </>
            )}
          </span>
          <span className={styles.strengthBadgeCompact}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '2px' }}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
            Strength: {completionScore}%
          </span>
        </div>
      </div>

      {/* Column 3: Actions Stack */}
      <div className={styles.summaryActionsCol}>
        <div className={styles.summaryActionsVertical}>
          {resumeUrl ? (
            <div className={styles.resumeActionsGroup}>
              <button 
                type="button" 
                className={styles.previewResumeBtn} 
                onClick={onResumePreview}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                Preview
              </button>
              
              <button 
                type="button" 
                className={styles.downloadResumeBtn}
                onClick={onResumeDownload}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                Download
              </button>

              <button 
                type="button" 
                className={styles.replaceResumeBtn} 
                onClick={onResumeUploadClick}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                Replace
              </button>
            </div>
          ) : (
            <button 
              type="button" 
              className={styles.uploadResumeBtn} 
              onClick={onResumeUploadClick}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
              Upload Resume
            </button>
          )}

          <button
            type="button"
            className={isEditing ? styles.cancelEditProfileBtn : styles.editProfileBtn}
            onClick={onEditToggle}
          >
            {isEditing ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                Cancel Edit
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                Edit Profile
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
});
