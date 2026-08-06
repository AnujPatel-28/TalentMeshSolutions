'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { insforge, invokeFunction } from '@/lib/insforge';
import { useAuth } from '@/lib/auth/AuthContext';
import appStyles from '../applications.module.css';
import ApplicationTimeline, { RecentActivityTimeline } from '@/components/candidate/ApplicationTimeline';
import { getPublicStorageUrl } from '@/lib/utils/storage-url';
import { APPLICATION_STATUS_LABELS } from '@/lib/constants/application-status-map';

// ─── SVG Icons Dictionary ────────────────────────────────────────────────────────
const IC = {
  Back: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
    </svg>
  ),
  Location: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
    </svg>
  ),
  Briefcase: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 .621-.504 1.125-1.125 1.125H4.875A1.125 1.125 0 0 1 3.75 18.4V14.15m16.5 0c0-1.24-.316-2.427-.878-3.479m-.002 0a1.125 1.125 0 0 0-.973-.591H19.5m-.002 0H16.5a1.5 1.5 0 0 1-1.5-1.5V6a2.25 2.25 0 0 0-2.25-2.25h-1.5A2.25 2.25 0 0 0 9 6v3.75a1.5 1.5 0 0 1-1.5 1.5H4.5m-.002 0a1.125 1.125 0 0 0-.973.591m-.002 0A11.17 11.17 0 0 1 3 14.15m0 0a1.5 1.5 0 0 0 1.5 1.5h15a1.5 1.5 0 0 0 1.5-1.5" />
    </svg>
  ),
  Salary: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  ),
  Calendar: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  PDF: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  ),
  External: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
    </svg>
  ),
  CheckCircle: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  ),
  Warning: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  ),
  Download: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  ),
  Support: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m-13.5 3.01c0-.618.5-1.11 1.11-1.11h3c.619 0 1.11.492 1.11 1.11v3c0 .619-.491 1.11-1.11 1.11h-3a1.11 1.11 0 0 1-1.11-1.11v-3Zm12 0c0-.618.5-1.11 1.11-1.11h3c.619 0 1.11.492 1.11 1.11v3c0 .619-.491 1.11-1.11 1.11h-3a1.11 1.11 0 0 1-1.11-1.11v-3Zm-6-5.25c0-.618.5-1.11 1.11-1.11h3c.619 0 1.11.492 1.11 1.11v3c0 .619-.491 1.11-1.11 1.11h-3a1.11 1.11 0 0 1-1.11-1.11v-3Z" />
    </svg>
  ),
  Info: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 1 1 1.084 1.085l-.041.02H11.25Zm.75 3.75a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
};

// ─── Status Custom Configuration ──────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; title: string; desc: string; class: string }> = {
  applied: {
    label: APPLICATION_STATUS_LABELS.applied,
    title: 'Application Submitted',
    desc: 'Your profile has been successfully received by the recruiting team. We will notify you once review begins.',
    class: appStyles.statusApplied
  },
  reviewing: {
    label: APPLICATION_STATUS_LABELS.reviewing,
    title: 'Application Under Review',
    desc: 'A recruiter is currently reviewing your resume, experience, and profile details.',
    class: appStyles.statusReviewing
  },
  shortlisted: {
    label: APPLICATION_STATUS_LABELS.shortlisted,
    title: 'Shortlisted!',
    desc: "Great news — you have been shortlisted for this role. We'll be in touch shortly regarding next steps.",
    class: appStyles.statusShortlisted
  },
  interviewing: {
    label: APPLICATION_STATUS_LABELS.interviewing,
    title: 'Interview In Progress',
    desc: 'An interview session has been scheduled or is currently underway. Check your inbox for scheduling invites.',
    class: appStyles.statusInterviewing
  },
  offered: {
    label: APPLICATION_STATUS_LABELS.offered,
    title: 'Offer Extended',
    desc: "Congratulations! An official offer has been extended to you. Please review the offer package details sent via email.",
    class: appStyles.statusOffered
  },
  hired: {
    label: APPLICATION_STATUS_LABELS.hired,
    title: 'Congratulations!',
    desc: 'You have been hired! We are thrilled to welcome you to the team. Get ready for onboarding details.',
    class: appStyles.statusHired
  },
  rejected: {
    label: APPLICATION_STATUS_LABELS.rejected,
    title: 'Application Closed',
    desc: 'The company has decided to proceed with other candidates. We appreciate your interest and encourage you to apply to other roles.',
    class: appStyles.statusRejected
  },
  withdrawn: {
    label: APPLICATION_STATUS_LABELS.withdrawn,
    title: 'Application Withdrawn',
    desc: 'You have successfully withdrawn this application. You cannot submit another application for this role for 30 days.',
    class: appStyles.statusWithdrawn
  }
};

// Formatting helpers
function formatBytes(bytes: number, decimals = 1) {
  if (!bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function formatRelativeTime(dateStr: string) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// AI Match score circular progress ring
function CircularProgress({ score }: { score: number }) {
  const radius = 26;
  const strokeWidth = 5;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  
  let strokeColor = '#10b981'; // Green (>= 80)
  if (score < 55) strokeColor = '#ef4444'; // Red
  else if (score < 80) strokeColor = '#f59e0b'; // Amber

  return (
    <div style={{ position: 'relative', width: '64px', height: '64px' }}>
      <svg width="64" height="64" viewBox="0 0 64 64" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="32" cy="32" r={radius} fill="transparent" stroke="#f1f5f9" strokeWidth={strokeWidth} />
        <circle 
          cx="32" 
          cy="32" 
          r={radius} 
          fill="transparent" 
          stroke={strokeColor} 
          strokeWidth={strokeWidth} 
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
        />
      </svg>
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.85rem', fontWeight: 800, color: '#0f172a'
      }}>
        {score}%
      </div>
    </div>
  );
}

export default function ApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const [application, setApplication] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [resume, setResume] = useState<any>(null);
  const [accessLogs, setAccessLogs] = useState<any[]>([]);
  const [aiMatch, setAiMatch] = useState<any>(null);
  
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      // 1. Fetch application details directly from database (using client SDK for performance)
      const { data: appData, error: appError } = await insforge.database
        .from('applications')
        .select(`
          id,
          job_id,
          resume_id,
          status,
          applied_at,
          updated_at,
          cover_letter,
          jobs (
            id,
            title,
            location,
            type,
            salary_min,
            salary_max,
            currency,
            companies (
              name,
              logo_url
            )
          )
        `)
        .eq('id', params.app_id as string)
        .single();

      if (appError || !appData) {
        setNotFound(true);
        return;
      }

      setApplication(appData);

      // 2. Fetch status history
      const { data: historyData } = await insforge.database
        .from('application_status_history')
        .select('*')
        .eq('application_id', appData.id)
        .order('changed_at', { ascending: true });

      if (historyData && historyData.length > 0) {
        setHistory(historyData);
      } else {
        // Fallback fallback log
        setHistory([
          { id: 'initial', from_status: null, to_status: 'applied', changed_at: appData.applied_at, note: 'Application submitted successfully' }
        ]);
      }

      // 3. Fetch resume details
      if (appData.resume_id) {
        try {
          const { data: resData } = await insforge.database
            .from('candidate_resumes')
            .select('id, label, file_name, file_url, file_size_bytes')
            .eq('id', appData.resume_id)
            .single();
          if (resData) setResume(resData);
        } catch (resErr) {
          console.error('Error loading resume details:', resErr);
        }
      }

      // 4. Fetch recruiter access logs (leveraging our new SELECT policy)
      try {
        const { data: logs } = await insforge.database
          .from('resume_access_log')
          .select('access_type, created_at')
          .eq('application_id', appData.id)
          .order('created_at', { ascending: false });
        if (logs) setAccessLogs(logs);
      } catch (logErr) {
        console.error('Error loading resume access logs:', logErr);
      }

      // 5. Fetch AI match score and insights from edge function
      try {
        const { data: matchData, error: matchError } = await invokeFunction('ai-match', {
          method: 'POST',
          body: {
            jobId: appData.job_id,
            candidateId: user?.id
          }
        });
        if (matchData && !matchError) {
          setAiMatch(matchData);
        }
      } catch (aiErr) {
        console.error('Error fetching AI match insights:', aiErr);
      }

    } catch (err: any) {
      setErrorMsg(err.message || 'Unexpected error loading application');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchData();
  }, [params.app_id, user]);

  const handleWithdraw = async () => {
    setWithdrawing(true);
    try {
      const { error } = await invokeFunction('candidate-applications-id', {
        method: 'PATCH',
        queries: { id: params.app_id as string },
        body: { status: 'withdrawn' }
      });

      if (error) {
        throw new Error(error.message || 'Failed to withdraw application');
      }

      // Success -> Reload data to update UI
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Error withdrawing application.');
    } finally {
      setWithdrawing(false);
      setShowWithdrawModal(false);
    }
  };

  const handleSecureView = async () => {
    try {
      const token = window.sessionStorage.getItem('tm_token');
      const targetUrl = `${window.location.origin}/api/v1/remote/functions/resume-proxy?applicationId=${application.id}&accessType=viewed`;
      
      const response = await fetch(targetUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch from proxy');
      const blob = await response.blob();
      const fileBlob = new Blob([blob], { type: 'application/pdf' });
      const blobUrl = window.URL.createObjectURL(fileBlob);
      window.open(blobUrl, '_blank');
    } catch (err: any) {
      console.error('Failed to view resume:', err);
      alert('Failed to view resume: ' + err.message);
    }
  };

  const handleSecureDownload = async () => {
    try {
      const token = window.sessionStorage.getItem('tm_token');
      const targetUrl = `${window.location.origin}/api/v1/remote/functions/resume-proxy?applicationId=${application.id}&accessType=downloaded`;
      
      const response = await fetch(targetUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to download resume');
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = resume.file_name || 'resume.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err: any) {
      console.error('Failed to download resume:', err);
      alert('Failed to download resume: ' + err.message);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div style={{ padding: '80px 0', textAlign: 'center', color: '#64748b' }}>
        <div className={appStyles.loadingSpinner} />
        <p style={{ marginTop: '1rem', fontWeight: 500 }}>Syncing your application profile...</p>
      </div>
    );
  }

  // Not Found
  if (notFound) {
    return (
      <div className={appStyles.errorState}>
        <div style={{ fontSize: '3rem', marginBottom: '1.25rem' }}>🔍</div>
        <h2>Application not found</h2>
        <p>This application may have been removed or does not belong to your account.</p>
        <Link href={`/dashboard/candidate/${params.role_id}/applications`} className={appStyles.primaryBtn}>
          Back to My Applications
        </Link>
      </div>
    );
  }

  // Error State
  if (errorMsg) {
    return (
      <div className={appStyles.errorState}>
        <div style={{ fontSize: '3rem', marginBottom: '1.25rem' }}>⚠️</div>
        <h2>Something went wrong</h2>
        <p>{errorMsg}</p>
        <button onClick={fetchData} className={appStyles.primaryBtn}>Try Again</button>
      </div>
    );
  }

  const job = application?.jobs;
  const company = job?.companies;
  const currentStatus = application?.status || 'applied';
  const isTerminal = ['hired', 'rejected', 'withdrawn'].includes(currentStatus);
  const statusInfo = STATUS_CONFIG[currentStatus] || {
    label: currentStatus,
    title: 'Status: ' + currentStatus,
    desc: 'Your application is currently: ' + currentStatus,
    class: appStyles.statusReviewing
  };

  const isWithdrawable = ['applied', 'reviewing', 'shortlisted', 'interviewing', 'offered'].includes(currentStatus);

  // Next steps calculator
  const nextSteps = [
    { label: 'Resume Review', active: currentStatus === 'applied', done: !['applied'].includes(currentStatus) },
    { label: 'Shortlisting', active: currentStatus === 'reviewing', done: !['applied', 'reviewing'].includes(currentStatus) },
    { label: 'Interview Rounds', active: currentStatus === 'shortlisted' || currentStatus === 'interviewing', done: !['applied', 'reviewing', 'shortlisted', 'interviewing'].includes(currentStatus) },
    { label: 'Offer Stage', active: currentStatus === 'offered', done: ['hired'].includes(currentStatus) }
  ];

  return (
    <div className={appStyles.pageContainer}>
      {/* Back to Applications Link */}
      <Link href={`/dashboard/candidate/${params.role_id}/applications`} className={appStyles.backButton}>
        <IC.Back /> Back to Applications
      </Link>

      {/* Header Profile Section */}
      <header className={appStyles.headerCard}>
        <div className={appStyles.logoWrapper}>
          {company?.logo_url ? (
            <img src={getPublicStorageUrl('company-logos', company.logo_url)} className={appStyles.logo} alt={company.name} />
          ) : (
            <div className={appStyles.defaultLogo}>🏢</div>
          )}
        </div>
        <div className={appStyles.titleBlock}>
          <h1 className={appStyles.jobTitle}>{job?.title}</h1>
          <p className={appStyles.companyName}>{company?.name}</p>
          <div className={appStyles.badgeRow}>
            {job?.location && (
              <span className={appStyles.badge}>
                <IC.Location /> {job.location}
              </span>
            )}
            {job?.type && (
              <span className={appStyles.badge}>
                <IC.Briefcase /> {job.type}
              </span>
            )}
            {job?.salary_min && (
              <span className={appStyles.badge}>
                <IC.Salary /> {job.currency || '$'}{job.salary_min.toLocaleString()}{job.salary_max ? ' – ' + job.salary_max.toLocaleString() : '+'}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Premium Status Banner */}
      <div className={`${appStyles.statusBanner} ${statusInfo.class}`}>
        <div className={appStyles.statusTextContainer}>
          <div className={appStyles.statusHeader}>
            <span className={appStyles.statusBadge}>{statusInfo.label}</span>
            <span className={appStyles.updatedText}>
              Last updated {formatRelativeTime(application.updated_at)}
            </span>
          </div>
          <h2 className={appStyles.statusTitle}>{statusInfo.title}</h2>
          <p className={appStyles.statusDescription}>{statusInfo.desc}</p>
        </div>
        
        {isWithdrawable && (
          <button 
            type="button" 
            onClick={() => setShowWithdrawModal(true)} 
            className={appStyles.withdrawBtn}
          >
            Withdraw Application
          </button>
        )}
      </div>

      {/* Two Column Grid Layout */}
      <div className={appStyles.twoColumnGrid}>
        
        {/* Left Column: Progress trackers and Insights */}
        <div className={appStyles.leftColumn}>
          
          {/* Card 1: Horizontal progress timeline */}
          <section className={appStyles.card}>
            <h3 className={appStyles.cardTitle}>Application Progress</h3>
            <ApplicationTimeline currentStatus={currentStatus} history={history} appliedAt={application.applied_at} />
          </section>

          {/* Card 2: Vertical history log */}
          <section className={appStyles.card}>
            <h3 className={appStyles.cardTitle}>Recent Activity</h3>
            <RecentActivityTimeline currentStatus={currentStatus} history={history} />
          </section>

          {/* Card 3: AI Match Score & Insights */}
          {aiMatch && (
            <section className={appStyles.card}>
              <h3 className={appStyles.cardTitle}>Application Insights</h3>
              <div className={appStyles.insightsWidget}>
                <CircularProgress score={aiMatch.score} />
                <div className={appStyles.insightsDetails}>
                  <div className={appStyles.insightsHeader}>
                    <span>AI Profile Match Score: <strong>{aiMatch.score}%</strong></span>
                    <span className={`
                      ${appStyles.matchLevelBadge} 
                      ${aiMatch.match_level === 'perfect' || aiMatch.match_level === 'high' ? appStyles.matchHigh : appStyles.matchMedium}
                    `}>
                      {aiMatch.match_level.toUpperCase()} MATCH
                    </span>
                  </div>
                  <ul className={appStyles.insightsList}>
                    {aiMatch.reasons?.map((reason: string, i: number) => {
                      const isWarning = reason.toLowerCase().includes('missing') || 
                                      reason.toLowerCase().includes('lacks') || 
                                      reason.toLowerCase().includes('require');
                      return (
                        <li key={i} className={appStyles.insightItem}>
                          {isWarning ? <IC.Warning /> : <IC.CheckCircle />}
                          <span>{reason}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </section>
          )}

          {/* Cover Letter Section (Optional) */}
          {application.cover_letter && (
            <section className={appStyles.card}>
              <h3 className={appStyles.cardTitle}>Submitted Cover Letter</h3>
              <div className={appStyles.coverLetterBox}>
                {application.cover_letter}
              </div>
            </section>
          )}
        </div>

        {/* Right Sidebar: Overview, Resume, Recruiter Actions, Help */}
        <div className={appStyles.rightColumn}>
          
          {/* Overview Details */}
          <section className={appStyles.card}>
            <h3 className={appStyles.cardTitle}>Overview</h3>
            <div className={appStyles.overviewGrid}>
              <div className={appStyles.overviewRow}>
                <span className={appStyles.overviewLabel}>Applied Date</span>
                <span className={appStyles.overviewValue}>
                  {new Date(application.applied_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>
              <div className={appStyles.overviewRow}>
                <span className={appStyles.overviewLabel}>Job Category</span>
                <span className={appStyles.overviewValue}>{job?.type || 'Full-time'}</span>
              </div>
              <div className={appStyles.overviewRow}>
                <span className={appStyles.overviewLabel}>Office Location</span>
                <span className={appStyles.overviewValue}>{job?.location || 'Remote'}</span>
              </div>
              <div className={appStyles.overviewRow}>
                <span className={appStyles.overviewLabel}>Application ID</span>
                <span className={appStyles.overviewValue} style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }}>
                  {application.id.slice(0, 8).toUpperCase()}
                </span>
              </div>
            </div>
          </section>

          {/* Next Steps Check Widget */}
          {!isTerminal && (
            <section className={appStyles.card}>
              <h3 className={appStyles.cardTitle}>What Happens Next?</h3>
              <div className={appStyles.nextStepsList}>
                {nextSteps.map((step, idx) => (
                  <div key={idx} className={`${appStyles.nextStepRow} ${step.done ? appStyles.nextStepDone : ''} ${step.active ? appStyles.nextStepActive : ''}`}>
                    <div className={appStyles.nextStepDot}>
                      {step.done ? '✓' : idx + 1}
                    </div>
                    <span className={appStyles.nextStepLabel}>{step.label}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Submitted Resume Info */}
          {resume && (
            <section className={appStyles.card}>
              <h3 className={appStyles.cardTitle}>Submitted Resume</h3>
              <div className={appStyles.resumeCardContent}>
                <div className={appStyles.resumeInfoRow}>
                  <IC.PDF />
                  <div className={appStyles.resumeTextDetails}>
                    <div className={appStyles.resumeFileName} title={resume.file_name}>
                      {resume.file_name}
                    </div>
                    <div className={appStyles.resumeFileSize}>
                      {formatBytes(resume.file_size_bytes)}
                    </div>
                  </div>
                </div>
                <div className={appStyles.resumeActions}>
                  <button 
                    type="button" 
                    onClick={handleSecureView} 
                    className={appStyles.resumeViewBtn}
                  >
                    <IC.External /> View
                  </button>
                  <button 
                    type="button" 
                    onClick={handleSecureDownload} 
                    className={appStyles.resumeDownloadBtn}
                  >
                    <IC.Download /> Download
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Recruiter Activity Tracking */}
          <section className={appStyles.card}>
            <h3 className={appStyles.cardTitle}>Recruiter Activity</h3>
            <div className={appStyles.recruiterLogs}>
              {accessLogs.length > 0 ? (
                <div className={appStyles.logsList}>
                  {accessLogs.map((log, i) => (
                    <div key={i} className={appStyles.logRow}>
                      <span className={appStyles.logBullet}>•</span>
                      <div className={appStyles.logInfo}>
                        <span className={appStyles.logActionText}>
                          {log.access_type === 'viewed' && 'Viewed your resume'}
                          {log.access_type === 'previewed' && 'Previewed your profile'}
                          {log.access_type === 'downloaded' && 'Downloaded your resume'}
                          {log.access_type === 'unlocked' && 'Unlocked your details'}
                          {!['viewed', 'previewed', 'downloaded', 'unlocked'].includes(log.access_type) && `Recruiter accessed: ${log.access_type}`}
                        </span>
                        <span className={appStyles.logTime}>{formatRelativeTime(log.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={appStyles.emptyLogsText}>
                  No recruiter activity logged yet. You will see updates here when the hiring team views your profile or downloads your resume.
                </p>
              )}
            </div>
          </section>

          {/* Need Help Card */}
          <section className={appStyles.card}>
            <h3 className={appStyles.cardTitle}>Need Help?</h3>
            <p className={appStyles.helpPromptText}>Have questions about the application or the hiring process?</p>
            <div className={appStyles.helpActionsList}>
              <Link href="/portals/jobs/contact" className={appStyles.helpActionButton}>
                <IC.Support /> Contact Recruiter
              </Link>
              <Link href="/portals/jobs/contact#faq" className={appStyles.helpActionButton}>
                <IC.Info /> Open FAQ
              </Link>
            </div>
          </section>

        </div>
      </div>

      {/* Confirmation Modal for Withdraw Application */}
      {showWithdrawModal && (
        <div className={appStyles.modalOverlay}>
          <div className={appStyles.modalContent}>
            <h3 className={appStyles.modalTitle}>Withdraw Application?</h3>
            <p className={appStyles.modalBody}>
              Are you sure you want to withdraw your application for <strong>{job?.title}</strong>? 
              This action is permanent and you will not be able to reapply for this role for the next 30 days.
            </p>
            <div className={appStyles.modalFooter}>
              <button 
                type="button" 
                onClick={() => setShowWithdrawModal(false)} 
                className={appStyles.modalCancelBtn}
                disabled={withdrawing}
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleWithdraw} 
                className={appStyles.modalConfirmBtn}
                disabled={withdrawing}
              >
                {withdrawing ? 'Withdrawing...' : 'Withdraw Application'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
