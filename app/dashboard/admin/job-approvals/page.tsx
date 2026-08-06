'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { invokeFunction } from '@/lib/insforge';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';
import { AdminHeader } from '../_components/AdminHeader';
import { AdminStatCard } from '../_components/AdminStatCard';
import { AdminButton } from '../_components/AdminForm';
import styles from './job-approvals.module.css';
import toast from 'react-hot-toast';

type AdminJob = {
  id: string;
  title: string;
  status: string;
  is_approved: boolean;
  // W5: primary moderation column (054 migration)
  approval_status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  description: string;
  requirements?: string[] | null;
  skills_required?: string[] | null;
  type?: string | null;
  location?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  currency?: string | null;
  experience_min?: number | null;
  experience_max?: number | null;
  department?: string | null;
  companies?: {
    name?: string | null;
    logo_url?: string | null;
    about?: string | null;
  } | null;
};

export default function JobApprovalsPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState('pending');
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedJob, setSelectedJob] = useState<AdminJob | null>(null);
  
  const [error, setError] = useState('');
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 });
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const fetchCounts = useCallback(async () => {
    try {
      // W5: fetch per approval_status from the edge function — no direct DB count queries.
      // Three parallel GET requests filtered by each approval_status value.
      const [pendingRes, approvedRes, rejectedRes] = await Promise.all([
        invokeFunction('admin-jobs', { method: 'GET', queries: { status: 'pending', page: '0', limit: '1' } }),
        invokeFunction('admin-jobs', { method: 'GET', queries: { status: 'approved', page: '0', limit: '1' } }),
        invokeFunction('admin-jobs', { method: 'GET', queries: { status: 'rejected', page: '0', limit: '1' } }),
      ]);

      setCounts({
        pending: pendingRes.data?.total ?? 0,
        approved: approvedRes.data?.total ?? 0,
        rejected: rejectedRes.data?.total ?? 0
      });
    } catch (err) {
      console.error('Failed to fetch counts:', err);
    }
  }, []);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: fetchError } = await invokeFunction('admin-jobs', {
        method: 'GET',
        queries: { status: activeTab, page: '0', limit: '100' }
      });
      
      if (fetchError) throw new Error(fetchError.message);
      
      if (data) {
        setJobs(data.items || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load jobs queue.');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    if (user) {
      fetchJobs();
      fetchCounts();
    }
  }, [fetchJobs, fetchCounts, user]);

  // Periodic counts check to sync badge (every 30 seconds as requested)
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, [fetchCounts, user]);

  // ESC Close Modal & Focus Trap logic
  useEffect(() => {
    if (!selectedJob) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedJob(null);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    // Auto focus the close button for accessibility
    setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedJob]);

  const handleAction = async (id: string, approve: boolean) => {
    setSubmitting(true);
    setError('');

    // OPTIMISTIC UI STATE UPDATE
    const prevJobs = [...jobs];
    const prevCounts = { ...counts };

    // Remove the job from the current tab list optimistically
    setJobs(prev => prev.filter(j => j.id !== id));
    
    // W5: count arithmetic keyed on approval_status tab IDs ('pending' / 'approved' / 'rejected')
    setCounts(prev => {
      const pendingDiff  = activeTab === 'pending'  ? -1 : 0;
      const approvedDiff = activeTab === 'approved' ? -1 : (approve  ? 1 : 0);
      const rejectedDiff = activeTab === 'rejected' ? -1 : (!approve ? 1 : 0);
      return {
        pending:  Math.max(0, prev.pending  + pendingDiff),
        approved: Math.max(0, prev.approved + approvedDiff),
        rejected: Math.max(0, prev.rejected + rejectedDiff)
      };
    });

    try {
      const action = approve ? 'approve' : 'reject';
      const { error: actionError } = await invokeFunction('admin-jobs', {
        method: 'POST',
        body: { id, action }
      });

      if (actionError) throw new Error(actionError.message);

      toast.success(`Job listing successfully ${approve ? 'approved' : 'rejected'}.`);
      setSelectedJob(null);
      
      // Background re-fetch to ensure sync
      fetchJobs();
      fetchCounts();
    } catch (err: any) {
      // ROLLBACK OPTIMISTIC UI ON FAILURE
      setJobs(prevJobs);
      setCounts(prevCounts);
      
      const errMsg = err.message || `Failed to ${approve ? 'approve' : 'reject'} job.`;
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const tabs = [
    { id: 'pending',  label: 'Pending Review' },
    // W5: tab ID is 'approved' (matches approval_status value), was 'active'
    { id: 'approved', label: 'Approved' },
    { id: 'rejected', label: 'Rejected' }
  ];

  return (
    <section className={styles.page}>
      <AdminHeader
        title="Job Approvals"
        eyebrow="Admin Portal"
        subtitle="Review, approve, and verify job postings before they go live on the platform."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard/admin' },
          { label: 'Manage Jobs', href: '/dashboard/admin/jobs' },
          { label: 'Job Approvals' }
        ]}
        actions={
          <AdminButton variant="secondary" onClick={() => router.push('/dashboard/admin/jobs')}>
            ← Back to Jobs
          </AdminButton>
        }
      />

      {error && (
        <div className={styles.errorBanner} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <AdminButton onClick={fetchJobs} style={{ padding: '6px 12px', fontSize: '0.8rem', background: '#dc2626' }}>
            Retry
          </AdminButton>
        </div>
      )}

      <div className={styles.stats}>
        <AdminStatCard
          label="Pending Review"
          value={counts.pending}
          color="amber"
          onClick={() => setActiveTab('pending')}
          isActive={activeTab === 'pending'}
        />
        <AdminStatCard
          label="Approved Postings"
          value={counts.approved}
          color="emerald"
          onClick={() => setActiveTab('approved')}
          isActive={activeTab === 'approved'}
        />
        <AdminStatCard
          label="Rejected Postings"
          value={counts.rejected}
          color="rose"
          onClick={() => setActiveTab('rejected')}
          isActive={activeTab === 'rejected'}
        />
      </div>

      <div className={styles.tabsContainer}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setError('');
            }}
            className={`${styles.tab} ${activeTab === tab.id ? styles.activeTab : ''}`}
            aria-selected={activeTab === tab.id}
            role="tab"
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={styles.panel}>
        <div className={styles.tableContainer}>
          {loading ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyStateContainer}>
                <div className={styles.loadingSpinner} />
                <span>Fetching listings queue...</span>
              </div>
            </div>
          ) : jobs.length === 0 ? (
            <div className={styles.emptyState} role="status">
              No {activeTab === 'pending' ? 'pending approvals' : activeTab === 'approved' ? 'approved postings' : 'rejected postings'} found in this queue.
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Job Title</th>
                  <th className={styles.th}>Company</th>
                  <th className={styles.th}>Submitted</th>
                  <th className={styles.th + ' ' + styles.actionsCell}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr
                    key={job.id}
                    className={styles.tr}
                    onClick={() => setSelectedJob(job)}
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setSelectedJob(job)}
                  >
                    <td className={styles.td}>
                      <span className={styles.jobTitle}>{job.title}</span>
                      <span className={styles.jobId}>ID: JOB-{(job.id || '').substring(0, 6).toUpperCase()}</span>
                    </td>
                    <td className={styles.td}>
                      <span className={styles.metaText}>{job.companies?.name || 'Unknown'}</span>
                    </td>
                    <td className={styles.td}>
                      <span className={styles.metaText}>{new Date(job.created_at).toLocaleDateString('en-IN')}</span>
                    </td>
                    <td className={styles.td + ' ' + styles.actionsCell} onClick={e => e.stopPropagation()}>
                      <div className={styles.actionGroup}>
                        <AdminButton
                          variant="secondary"
                          onClick={() => setSelectedJob(job)}
                          style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                        >
                          View Details
                        </AdminButton>
                        {/* W5: show approve/reject only when the job is in pending approval_status */}
                        {activeTab === 'pending' && (
                          <>
                            <AdminButton
                              onClick={() => handleAction(job.id, true)}
                              disabled={submitting}
                              style={{ padding: '8px 16px', fontSize: '0.85rem', background: '#10b981' }}
                            >
                              Approve
                            </AdminButton>
                            <AdminButton
                              variant="danger"
                              onClick={() => handleAction(job.id, false)}
                              disabled={submitting}
                              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                            >
                              Reject
                            </AdminButton>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedJob && (
        <div 
          className={styles.modalOverlay} 
          onClick={() => setSelectedJob(null)}
          role="presentation"
        >
          <div 
            className={styles.modal} 
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            {/* Modal Header */}
            <div className={styles.modalHeader}>
              <div>
                <span className={styles.modalTitleText}>Job Review Details</span>
                <h2 className={styles.modalTitle} id="modal-title">{selectedJob.title}</h2>
              </div>
              <button 
                ref={closeButtonRef}
                className={styles.modalClose} 
                onClick={() => setSelectedJob(null)}
                aria-label="Close review modal"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className={styles.modalBody}>
              <div className={styles.goldenGrid}>
                {/* Left Column (61.8% space) */}
                <div className={styles.leftColumn}>
                  {/* Full Description */}
                  <div className={styles.modalSection}>
                    <h3 className={styles.sectionLabel}>Description</h3>
                    <div className={styles.descCard}>
                      {selectedJob.description}
                    </div>
                  </div>

                  {/* Requirements List */}
                  {selectedJob.requirements && selectedJob.requirements.length > 0 && (
                    <div className={styles.modalSection}>
                      <h3 className={styles.sectionLabel}>Requirements</h3>
                      <ul className={styles.requirementsList}>
                        {selectedJob.requirements.map((req, index) => (
                          <li key={index} className={styles.requirementItem}>{req}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Right Column (38.2% space) */}
                <div className={styles.rightColumn}>
                  {/* Metadata Summary Grid */}
                  <div className={styles.metaGrid}>
                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}>Company</span>
                      <span className={styles.metaVal}>{selectedJob.companies?.name || 'Unknown'}</span>
                    </div>
                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}>Location</span>
                      <span className={styles.metaVal}>{selectedJob.location || 'Remote'}</span>
                    </div>
                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}>Job Type</span>
                      <span className={styles.metaVal} style={{ textTransform: 'capitalize' }}>
                        {selectedJob.type || 'Full-time'}
                      </span>
                    </div>
                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}>Department</span>
                      <span className={styles.metaVal}>{selectedJob.department || 'N/A'}</span>
                    </div>
                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}>Salary Range</span>
                      <span className={styles.metaVal}>
                        {selectedJob.salary_min || selectedJob.salary_max
                          ? `${selectedJob.currency || 'INR'} ${selectedJob.salary_min?.toLocaleString() || 0} - ${selectedJob.salary_max?.toLocaleString() || 'Max'}`
                          : 'Competitive'}
                      </span>
                    </div>
                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}>Experience Required</span>
                      <span className={styles.metaVal}>
                        {selectedJob.experience_min !== undefined && selectedJob.experience_min !== null
                          ? `${selectedJob.experience_min} - ${selectedJob.experience_max || '5+'} Years`
                          : 'Not specified'}
                      </span>
                    </div>
                  </div>

                  {/* Skills Tags */}
                  {selectedJob.skills_required && selectedJob.skills_required.length > 0 && (
                    <div className={styles.modalSection}>
                      <h3 className={styles.sectionLabel}>Skills Required</h3>
                      <div className={styles.skillTags}>
                        {selectedJob.skills_required.map((skill, index) => (
                          <span key={index} className={styles.skillTag}>
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className={styles.modalFooter}>
              <AdminButton
                variant="secondary"
                onClick={() => setSelectedJob(null)}
                disabled={submitting}
              >
                Dismiss
              </AdminButton>
              
              {/* W5: modal footer actions keyed on approval_status, not is_approved+status */}
              {selectedJob.approval_status === 'pending' ? (
                <>
                  <AdminButton
                    variant="danger"
                    onClick={() => handleAction(selectedJob.id, false)}
                    isLoading={submitting}
                    disabled={submitting}
                  >
                    Reject Post
                  </AdminButton>
                  <AdminButton
                    onClick={() => handleAction(selectedJob.id, true)}
                    isLoading={submitting}
                    disabled={submitting}
                    style={{ background: '#10b981' }}
                  >
                    Approve Post
                  </AdminButton>
                </>
              ) : selectedJob.approval_status === 'approved' ? (
                <AdminButton
                  variant="danger"
                  onClick={() => handleAction(selectedJob.id, false)}
                  isLoading={submitting}
                  disabled={submitting}
                >
                  Reject Job
                </AdminButton>
              ) : (
                // approval_status === 'rejected' — allow re-approval
                <AdminButton
                  onClick={() => handleAction(selectedJob.id, true)}
                  isLoading={submitting}
                  disabled={submitting}
                  style={{ background: '#10b981' }}
                >
                  Approve Post
                </AdminButton>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
