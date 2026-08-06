'use client';

import { useEffect, useState } from 'react';
import styles from '../applications.module.css';
import { insforge } from '@/lib/insforge';
import { MapPin, Phone, FileText, Download } from 'lucide-react';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { useAdminApplicationStage } from '@/lib/hooks/useAdminApplicationStage';
import { APPLICATION_STATUSES, STATUS_LABELS as CANONICAL_STATUS_LABELS } from '@/lib/constants/applicationStatuses';

export type AdminApplication = {
  id: string;
  job_id: string;
  candidate_id: string;
  status: string;
  applied_at: string;
  updated_at: string;
  cover_letter?: string;
  ai_match_score?: number;
  apply_type?: string;
  resume_url?: string;
  resume_snapshot_key?: string;
  jobs: {
    id?: string;
    title: string;
    company_id?: string;
    companies: {
      name: string;
    };
  };
  profiles: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    location?: string;
    candidate_profiles?: Array<{
      headline?: string;
      experience_years?: number;
      skills?: string[];
      resume_url?: string;
      education?: string;
      linkedin_url?: string;
      github_url?: string;
      portfolio_url?: string;
    }>;
  };
};

const statusOptions = [
  APPLICATION_STATUSES.APPLIED,
  APPLICATION_STATUSES.REVIEWING,
  APPLICATION_STATUSES.SHORTLISTED,
  APPLICATION_STATUSES.INTERVIEWING,
  APPLICATION_STATUSES.OFFERED,
  APPLICATION_STATUSES.HIRED,
  APPLICATION_STATUSES.REJECTED,
  APPLICATION_STATUSES.WITHDRAWN,
];

const STATUS_LABELS: Record<string, string> = {
  ...CANONICAL_STATUS_LABELS,
  offered: 'Offer Sent',
  hired: 'Hired',
  rejected: 'Rejected',
};

interface Props {
  application: AdminApplication;
  onClose: () => void;
  onStatusChanged: (applicationId: string, status: string) => void;
}

// R-5: extracted out of applications/page.tsx so the job-detail Applicants tab can reuse the
// same stage-change UI/drawer instead of duplicating it (doc 14 R-5 client-side spec).
export default function ApplicationDetailModal({ application, onClose, onStatusChanged }: Props) {
  const [statusHistory, setStatusHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const { changeStatus, updatingId } = useAdminApplicationStage((id, status) => {
    onStatusChanged(id, status);
  });

  useEffect(() => {
    let cancelled = false;
    setLoadingHistory(true);
    (async () => {
      try {
        const { data } = await insforge.database
          .from('application_status_history')
          .select('*')
          .eq('application_id', application.id)
          .order('changed_at', { ascending: true });
        if (!cancelled && data) setStatusHistory(data);
      } catch (err) {
        console.error('Failed to fetch status history:', err);
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [application.id]);

  const handleUpdate = async (nextStatus: string) => {
    const result = await changeStatus(application.id, nextStatus);
    if (!result.ok) {
      if (result.message) setFeedback({ message: result.message, type: 'error' });
      return;
    }
    setFeedback({ message: `Status updated to "${STATUS_LABELS[nextStatus] || nextStatus}"`, type: 'success' });
  };

  const handleDownload = async (appId: string, filename: string, fallbackUrl?: string) => {
    try {
      const token = window.sessionStorage.getItem('tm_token');
      const targetUrl = `${window.location.origin}/api/v1/remote/functions/resume-proxy?applicationId=${appId}&accessType=downloaded`;
      const response = await fetch(targetUrl, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error('Failed to fetch from proxy');
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Failed to download document:', err);
      if (fallbackUrl) window.open(fallbackUrl, '_blank');
    }
  };

  const handleView = async (appId: string, fallbackUrl?: string) => {
    try {
      const token = window.sessionStorage.getItem('tm_token');
      const targetUrl = `${window.location.origin}/api/v1/remote/functions/resume-proxy?applicationId=${appId}&accessType=viewed`;
      const response = await fetch(targetUrl, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error('Failed to fetch from proxy');
      const blob = await response.blob();
      const fileBlob = new Blob([blob], { type: 'application/pdf' });
      const blobUrl = window.URL.createObjectURL(fileBlob);
      window.open(blobUrl, '_blank');
    } catch (err) {
      console.error('Failed to view document:', err);
      if (fallbackUrl) window.open(fallbackUrl, '_blank');
    }
  };

  const profile = Array.isArray(application.profiles?.candidate_profiles)
    ? application.profiles.candidate_profiles[0]
    : application.profiles?.candidate_profiles;

  const renderEducation = (edu: any) => {
    if (!edu) return '';
    if (typeof edu === 'string') return edu;
    if (Array.isArray(edu)) {
      return edu.map((e: any) => (typeof e === 'object' ? `${e.degree || ''} (${e.school || ''})` : e)).join(', ');
    }
    if (typeof edu === 'object') {
      return `${edu.degree || edu.course || ''} ${edu.school || edu.institution || edu.university ? `at ${edu.school || edu.institution || edu.university}` : ''}`;
    }
    return String(edu);
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} style={{ maxWidth: '1000px' }} onClick={(e) => e.stopPropagation()}>
        <header className={styles.modalHeader}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Application Details</h2>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </header>

        <div className={styles.modalContent}>
          {feedback && (
            <div
              style={{
                marginBottom: '1rem',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '0.85rem',
                background: feedback.type === 'success' ? '#f0fdf4' : '#fef2f2',
                color: feedback.type === 'success' ? '#166534' : '#991b1b',
                border: `1px solid ${feedback.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
              }}
            >
              {feedback.message}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '20px', border: '1px solid #e2e8f0', display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                <div style={{ width: '64px', height: '64px', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: 'white', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.5rem', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)' }}>
                  {application.profiles.name[0]}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>{application.profiles.name}</h3>
                  <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#64748b' }}>{application.profiles.email}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '8px' }}>
                    {application.profiles.phone && <span style={{ fontSize: '0.8rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={13} /> {application.profiles.phone}</span>}
                    {application.profiles.location && <span style={{ fontSize: '0.8rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={13} /> {application.profiles.location}</span>}
                  </div>
                </div>
              </div>

              {application.ai_match_score !== undefined && application.ai_match_score !== null && (
                <div style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', padding: '1.25rem 1.5rem', borderRadius: '20px', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem' }}>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>🤖</span> AI Candidate Fit Match
                    </h4>
                    <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: '#1e40af', lineHeight: '1.4' }}>
                      Our algorithmic model evaluated this candidate's resume, headline, and experience against target job requirements.
                    </p>
                  </div>
                  <div style={{ position: 'relative', width: '72px', height: '72px', borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid #3b82f6', boxShadow: '0 4px 10px rgba(59, 130, 246, 0.15)', flexShrink: 0 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#2563eb' }}>{application.ai_match_score}%</span>
                      <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase' }}>Fit</span>
                    </div>
                  </div>
                </div>
              )}

              {profile ? (
                <div style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '20px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569' }}>Professional Details</h4>

                  {profile.headline && (
                    <div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Headline</span>
                      <span style={{ fontSize: '0.9rem', color: '#334155', fontWeight: 500 }}>{profile.headline}</span>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    {profile.experience_years !== undefined && (
                      <div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Experience</span>
                        <span style={{ fontSize: '0.9rem', color: '#334155', fontWeight: 600 }}>{profile.experience_years} Years</span>
                      </div>
                    )}

                    {profile.education && (
                      <div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Education</span>
                        <span style={{ fontSize: '0.9rem', color: '#334155', fontWeight: 600 }}>{renderEducation(profile.education)}</span>
                      </div>
                    )}
                  </div>

                  {profile.skills && profile.skills.length > 0 && (
                    <div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Skills & Keywords</span>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {profile.skills.map((skill: string, index: number) => (
                          <span key={index} style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '3px 8px', fontSize: '0.75rem', fontWeight: 600 }}>
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {(profile.linkedin_url || profile.github_url || profile.portfolio_url) && (
                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1rem', marginTop: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>External Links</span>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        {profile.linkedin_url && (
                          <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#0a66c2', color: 'white', textDecoration: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700 }}>
                            LinkedIn
                          </a>
                        )}
                        {profile.github_url && (
                          <a href={profile.github_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#24292e', color: 'white', textDecoration: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700 }}>
                            GitHub
                          </a>
                        )}
                        {profile.portfolio_url && (
                          <a href={profile.portfolio_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#10b981', color: 'white', textDecoration: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700 }}>
                            Portfolio
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '20px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '1rem', justifyContent: 'center', alignItems: 'center', minHeight: '120px' }}>
                  <span style={{ fontSize: '1.5rem' }}>📄</span>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>No detailed profile information available.</p>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 1rem', fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569' }}>Target Position</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.875rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b', fontWeight: 500 }}>Target Role:</span>
                    <strong style={{ color: '#0f172a' }}>{application.jobs.title}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b', fontWeight: 500 }}>Company Name:</span>
                    <strong style={{ color: '#0f172a' }}>{application.jobs.companies.name}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '8px', marginTop: '4px' }}>
                    <span style={{ color: '#64748b', fontWeight: 500 }}>Applied On:</span>
                    <span style={{ color: '#0f172a', fontWeight: 600 }}>{new Date(application.applied_at).toLocaleDateString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '8px', marginTop: '4px' }}>
                    <span style={{ color: '#64748b', fontWeight: 500 }}>Applied Through:</span>
                    <span style={{ color: '#0f172a', fontWeight: 600, textTransform: 'capitalize' }}>
                      {application.apply_type || 'Platform'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b', fontWeight: 500 }}>Current Status:</span>
                    <span className={`${styles.statusBadge} ${styles[`status_${application.status}`]}`}>{application.status}</span>
                  </div>
                </div>
              </div>

              <div style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '20px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569' }}>Application History Audit</h4>
                {loadingHistory ? (
                  <div style={{ padding: '1rem', fontSize: '0.8rem', color: '#64748b', textAlign: 'center' }}>Loading history log...</div>
                ) : statusHistory.length === 0 ? (
                  <div style={{ padding: '1rem', fontSize: '0.8rem', color: '#64748b', textAlign: 'center' }}>No log entries recorded.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                    {statusHistory.map((h, i) => (
                      <div key={h.id} style={{ display: 'flex', gap: '10px', fontSize: '0.825rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6', marginTop: '5px' }} />
                          {i < statusHistory.length - 1 && <div style={{ flex: 1, width: '2px', background: '#e2e8f0', margin: '4px 0' }} />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: '#1e293b' }}>
                            <span>{h.to_status.charAt(0).toUpperCase() + h.to_status.slice(1)}</span>
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400 }}>{new Date(h.changed_at).toLocaleDateString()}</span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                            {h.note || 'Status updated'} by <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{h.actor_type || 'user'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <span className={styles.sectionTitle}>Cover Letter / Statement</span>
                <div className={styles.coverLetterBox} style={{ fontSize: '0.85rem', padding: '1rem', maxHeight: '120px', overflowY: 'auto' }}>
                  {application.cover_letter || 'No cover letter provided for this application.'}
                </div>
              </div>

              {(() => {
                const resumeUrl = application.resume_url || profile?.resume_url;
                if (!resumeUrl && !application.resume_snapshot_key) return null;
                return (
                  <div>
                    <span className={styles.sectionTitle}>Assets & Resume</span>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button
                        onClick={() => handleView(application.id, resumeUrl || undefined)}
                        className={styles.primaryButton}
                        style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <FileText size={14} /> View Resume
                      </button>
                      <button
                        onClick={() => handleDownload(application.id, `${application.profiles.name.replace(/\s+/g, '_')}_resume.pdf`, resumeUrl || undefined)}
                        className={styles.primaryButton}
                        style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', cursor: 'pointer', background: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Download size={14} /> Download Resume
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        <footer className={styles.modalFooter}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <button
              className={styles.closeBtn}
              style={{ fontSize: '0.875rem', fontWeight: 700, padding: '0.5rem 1rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '10px' }}
              onClick={onClose}
            >
              Close
            </button>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                disabled={updatingId === application.id || application.status === 'shortlisted' || application.status === 'hired'}
                onClick={() => handleUpdate('shortlisted')}
                style={{ padding: '0.6rem 1.2rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', opacity: (updatingId === application.id || application.status === 'shortlisted' || application.status === 'hired') ? 0.5 : 1 }}
              >
                Shortlist
              </button>
              <button
                disabled={updatingId === application.id || application.status === 'rejected'}
                onClick={() => handleUpdate('rejected')}
                style={{ padding: '0.6rem 1.2rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', opacity: (updatingId === application.id || application.status === 'rejected') ? 0.5 : 1 }}
              >
                Reject
              </button>
              <CustomSelect
                className={styles.customSelectDropdown}
                style={{ width: '180px' }}
                value={application.status}
                disabled={updatingId === application.id}
                onChange={(e: any) => handleUpdate(e.target.value)}
                options={statusOptions.map((o) => ({
                  label: STATUS_LABELS[o] || o.charAt(0).toUpperCase() + o.slice(1),
                  value: o,
                }))}
                dropUp={true}
              />
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
