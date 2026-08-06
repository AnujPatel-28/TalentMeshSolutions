"use client";

import React, { useState, useEffect, useMemo } from 'react';
import styles from './ProfileStrengthWidget.module.css';

interface ProfileStrengthWidgetProps {
  candidate: {
    avatar_url?: string | null;
    resume_url?: string | null;
    bio?: string | null;
    skills?: string[] | null;
    experience?: any[] | null;
    education?: string | any[] | null;
    location?: string | null;
    linkedin_url?: string | null;
    profile_strength?: number | null;
  };
  variant?: 'compact' | 'full';
  hideWhenComplete?: boolean;
}

export default function ProfileStrengthWidget({ 
  candidate, 
  variant = 'full',
  hideWhenComplete = false // keep visible by default as requested
}: ProfileStrengthWidgetProps) {
  const [animated, setAnimated] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const totalScore = candidate.profile_strength || 0;

  if (isDismissed) return null;
  if (hideWhenComplete && totalScore >= 100) return null;

  const getTierDetails = (score: number) => {
    if (score < 40) {
      return {
        title: 'Beginner Profile',
        desc: 'Add a resume and skills to start showing up in recruiter searches.',
        color: '#ef4444',
        bg: '#fef2f2',
        border: '#fca5a5'
      };
    }
    if (score < 80) {
      return {
        title: 'Growing Profile',
        desc: 'Complete your experience and education details to get discovered by recruiters.',
        color: '#f97316',
        bg: '#fff7ed',
        border: '#ffedd5'
      };
    }
    if (score < 100) {
      return {
        title: 'Strong Profile',
        desc: 'Almost there! Add a profile photo or social links to reach 100%.',
        color: '#3b82f6',
        bg: '#eff6ff',
        border: '#dbeafe'
      };
    }
    return {
      title: 'Excellent Profile',
      desc: 'Recruiters can discover you. Your details are fully polished.',
      color: '#10b981',
      bg: '#ecfdf5',
      border: '#a7f3d0'
    };
  };

  const tier = getTierDetails(totalScore);

  return (
    <div 
      className={`${styles.strengthCard} ${animated ? styles.animated : ''}`}
      style={{ 
        borderColor: tier.border,
        background: tier.bg
      }}
    >
      <div className={styles.strengthHeader}>
        <div className={styles.titleCol}>
          <span className={styles.cardTitle}>Profile Strength</span>
          <h3 className={styles.tierName} style={{ color: tier.color }}>{tier.title}</h3>
        </div>
        <div className={styles.percentageCol} style={{ color: tier.color }}>
          {totalScore}%
        </div>
      </div>

      <div className={styles.barContainer}>
        <div 
          className={styles.barFill} 
          style={{ 
            width: animated ? `${totalScore}%` : '0%',
            backgroundColor: tier.color
          }}
        />
      </div>

      <div className={styles.strengthFooter}>
        <p className={styles.footerText}>{tier.desc}</p>
        {totalScore >= 100 && (
          <button 
            type="button" 
            className={styles.dismissBtn}
            onClick={() => setIsDismissed(true)}
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
