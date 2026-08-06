import React from 'react';
import styles from '../../../../shared-dashboard.module.css';
import { getPublicStorageUrl } from '@/lib/utils/storage-url';
import { useProfileCompletion } from '../hooks/useProfileCompletion';

interface CandidateInsightsCardProps {
  candidate: {
    avatar_url?: string | null;
    resume_url?: string | null;
    bio?: string | null;
    skills?: string[] | null;
    experience?: any[] | null;
    education?: string | any[] | null;
    location?: string | null;
    linkedin_url?: string | null;
  };
  onEnterEdit: () => void;
}

export default React.memo(function CandidateInsightsCard({
  candidate,
  onEnterEdit
}: CandidateInsightsCardProps) {
  
  const completionParams = React.useMemo(() => ({
    avatar_url: candidate.avatar_url,
    resume_url: candidate.resume_url,
    bio: candidate.bio,
    skills: candidate.skills,
    experience: candidate.experience,
    education: candidate.education,
    location: candidate.location,
    linkedin_url: candidate.linkedin_url
  }), [candidate]);

  const { score, fields } = useProfileCompletion(completionParams);

  const incompleteCount = React.useMemo(() => {
    return fields.filter(c => !c.completed).length;
  }, [fields]);

  const rating = React.useMemo(() => {
    if (score <= 35) return { label: 'Beginner Profile', color: '#ef4444' };
    if (score <= 65) return { label: 'Growing Profile', color: '#f97316' };
    if (score <= 90) return { label: 'Strong Profile', color: '#3b82f6' };
    return { label: 'Excellent Profile', color: '#10b981' };
  }, [score]);

  const visibility = React.useMemo(() => {
    if (score >= 80) return { label: 'High Visibility', color: '#10b981', bg: '#ecfdf5', border: '#a7f3d0' };
    if (score >= 55) return { label: 'Medium Visibility', color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' };
    return { label: 'Low Visibility', color: '#ef4444', bg: '#fef2f2', border: '#fca5a5' };
  }, [score]);

  const nextStep = React.useMemo(() => {
    const next = fields.find(c => !c.completed);
    if (!next) return null;
    return {
      label: next.label,
      anchor: next.anchor
    };
  }, [fields]);


  const handleActionClick = () => {
    onEnterEdit();
    if (!nextStep) return;
    
    // Smooth scroll to the corresponding section anchor after opening edit mode
    setTimeout(() => {
      let targetId = '';
      if (nextStep.anchor === 'photo' || nextStep.anchor === 'resume' || nextStep.anchor === 'bio') {
        targetId = 'profile-summary-header';
      } else if (nextStep.anchor === 'experience') {
        targetId = 'experience';
      } else if (nextStep.anchor === 'education') {
        targetId = 'education';
      } else if (nextStep.anchor === 'skills') {
        targetId = 'skills';
      } else if (nextStep.anchor === 'linkedin') {
        targetId = 'socials-presence';
      }

      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
  };

  // Circular progress calculations
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - score / 100);

  return (
    <div className={styles.insightsCard}>
      <span className={styles.insightsTitle}>Profile Completion</span>

      {/* Progress & Tier Section */}
      <div className={styles.progressCircleContainer}>
        <div className={styles.sidebarCircleWrapper}>
          <svg width="84" height="84" viewBox="0 0 84 84" className={styles.circularSvg}>
            <circle 
              cx="42" cy="42" r={radius} 
              fill="none" 
              stroke="#e2e8f0" 
              strokeWidth="6" 
            />
            <circle 
              cx="42" cy="42" r={radius} 
              fill="none" 
              stroke={rating.color} 
              strokeWidth="6" 
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform="rotate(-90 42 42)"
              style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
            />
          </svg>
          <div className={styles.circleCenterText}>
            <span className={styles.circlePercentage}>{score}%</span>
            <span className={styles.circleLabelText}>Complete</span>
          </div>
        </div>

        <div className={styles.ratingInfoBlock}>
          <h4 className={styles.insightsRatingLabel} style={{ color: rating.color }}>
            {rating.label}
          </h4>
          <span className={styles.insightsTasksRemaining}>
            {incompleteCount > 0 
              ? `${incompleteCount} task${incompleteCount === 1 ? '' : 's'} remaining`
              : 'All caught up!'}
          </span>
        </div>
      </div>

      {/* Recruiter Visibility Status */}
      <div className={styles.insightsVisibilityRow}>
        <span className={styles.insightsLabelText}>Recruiter Visibility:</span>
        <span 
          className={styles.insightsBadge}
          style={{ 
            color: visibility.color,
            background: visibility.bg,
            borderColor: visibility.border
          }}
        >
          ● {visibility.label}
        </span>
      </div>

      {/* Recommended Next Task */}
      {nextStep && (
        <div className={styles.nextStepBox}>
          <span className={styles.nextStepBadge}>Next Recommended Task</span>
          <h4 className={styles.nextStepTitle}>{nextStep.label}</h4>
        </div>
      )}

      {/* Checklist items */}
      <div className={styles.insightsChecklist}>
        {fields.map((item, idx) => (
          <div key={idx} className={styles.insightsCheckItem}>
            <span 
              className={styles.insightsCheckCircle}
              style={{
                background: item.completed ? '#ecfdf5' : '#f8fafc',
                borderColor: item.completed ? '#10b981' : '#cbd5e1'
              }}
            >
              {item.completed ? (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              ) : (
                <span className={styles.insightsCheckDot} />
              )}
            </span>
            <span 
              className={styles.insightsCheckLabel}
              style={{
                color: item.completed ? '#94a3b8' : '#334155',
                textDecoration: item.completed ? 'line-through' : 'none'
              }}
            >
              {item.label}
            </span>
          </div>
        ))}
      </div>

      {score < 100 && (
        <button 
          type="button" 
          className={styles.nextStepBtn}
          onClick={handleActionClick}
          style={{ width: '100%', marginTop: '8px' }}
        >
          Complete Profile
        </button>
      )}
    </div>
  );
});
