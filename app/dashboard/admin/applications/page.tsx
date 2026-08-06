'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import styles from './applications.module.css';
import { invokeFunction } from '@/lib/insforge';
import { CheckCircle, XCircle } from 'lucide-react';
import { CustomSelect } from '@/components/ui/CustomSelect';
import ApplicationDetailModal, { type AdminApplication } from './_components/ApplicationDetailModal';
import { useAdminApplicationStage } from '@/lib/hooks/useAdminApplicationStage';

import { APPLICATION_STATUSES, STATUS_LABELS as CANONICAL_STATUS_LABELS } from '@/lib/constants/applicationStatuses';

const statusOptions = [
  'all',
  APPLICATION_STATUSES.APPLIED,
  APPLICATION_STATUSES.REVIEWING,
  APPLICATION_STATUSES.SHORTLISTED,
  APPLICATION_STATUSES.INTERVIEWING,
  APPLICATION_STATUSES.OFFERED,
  APPLICATION_STATUSES.HIRED,
  APPLICATION_STATUSES.REJECTED,
  APPLICATION_STATUSES.WITHDRAWN,
];

// Map internal status keys to display labels
const STATUS_LABELS: Record<string, string> = {
  ...CANONICAL_STATUS_LABELS,
  offered:      'Offer Sent',
  hired:        'Hired',
  rejected:     'Rejected',
};

function getRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export default function AdminApplicationsPage() {
  const [applications, setApplications] = useState<AdminApplication[]>([]);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detail View
  const [selectedApp, setSelectedApp] = useState<AdminApplication | null>(null);

  // Pagination
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  // Auto-dismiss toast after 4 seconds
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const fetchApplications = useCallback(async (currentStatus = status, p = page, q = search) => {
    setLoading(true);
    setError('');
    try {
      const { data, error } = await invokeFunction('admin-applications', {
        method: 'GET',
        queries: {
          status: currentStatus,
          search: q,
          page: p.toString(),
          limit: '20',
        }
      });

      if (!error) {
        setApplications(data.applications || []);
        setTotal(data.applications?.length || 0); 
      } else {
        setError(error.message || 'Failed to sync applications pipeline');
      }
    } catch (err: any) {
      setError('Failed to sync applications pipeline');
    } finally {
      setLoading(false);
    }
  }, [status, page, search]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const { changeStatus, updatingId } = useAdminApplicationStage((appId, nextStatus) => {
    setApplications(prev => prev.map(a => (a.id === appId ? { ...a, status: nextStatus } : a)));
    if (selectedApp?.id === appId) setSelectedApp(prev => (prev ? { ...prev, status: nextStatus } : null));
  });

  const handleStatusUpdate = async (appId: string, nextStatus: string) => {
    if (updatingId) return; // prevent double-click
    const result = await changeStatus(appId, nextStatus);
    if (!result.ok) {
      if (result.message) setToast({ message: result.message, type: 'error' });
      return;
    }
    setToast({ message: `Status updated to "${STATUS_LABELS[nextStatus] || nextStatus}"`, type: 'success' });
  };

  return (
    <section className={styles.page}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 9999,
          padding: '0.875rem 1.25rem',
          background: toast.type === 'success' ? '#f0fdf4' : toast.type === 'error' ? '#fef2f2' : '#eff6ff',
          border: `1px solid ${toast.type === 'success' ? '#bbf7d0' : toast.type === 'error' ? '#fecaca' : '#bfdbfe'}`,
          borderRadius: '14px',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.12)',
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          color: toast.type === 'success' ? '#166534' : toast.type === 'error' ? '#991b1b' : '#1e40af',
          fontWeight: 600, fontSize: '0.9rem',
          animation: 'fadeIn 0.3s ease',
          maxWidth: '360px',
        }}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />}
          {toast.message}
          <button
            onClick={() => setToast(null)}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.6, fontSize: '1rem', lineHeight: 1 }}
          >×</button>
        </div>
      )}
      <header className={styles.hero}>
        <p className={styles.eyebrow}>Platform Pipeline</p>
        <h1 className={styles.title}>Job Applications</h1>
        <p className={styles.subtitle}>Track, review, and process job applications submitted by candidates.</p>
      </header>

      <div className={styles.toolbarRow}>
        <div className={styles.toolbar}>
          <input
            className={styles.searchInput}
            placeholder="Search candidate, job, or company..."
            value={search}
            onChange={e => {
              const val = e.target.value;
              setSearch(val);
              if (searchDebounce.current) clearTimeout(searchDebounce.current);
              searchDebounce.current = setTimeout(() => {
                fetchApplications(status, 0, val);
              }, 400);
            }}
            onKeyDown={e => e.key === 'Enter' && fetchApplications()}
          />
          <CustomSelect
            className={styles.customSelectDropdown}
            style={{ width: '200px' }}
            value={status}
            onChange={(e: any) => { setStatus(e.target.value); setPage(0); }}
            options={statusOptions.map(o => ({
              label: o === 'all' ? 'All Statuses' : (STATUS_LABELS[o] || o.charAt(0).toUpperCase() + o.slice(1)),
              value: o
            }))}
          />
          <button className={styles.primaryButton} onClick={() => fetchApplications()}>Refresh List</button>
        </div>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      <div className={styles.list}>
        {loading ? (
          <div className={styles.emptyState}>Gathering pipeline data...</div>
        ) : applications.length === 0 ? (
          <div className={styles.emptyState}>No records found in this stage.</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Target Role</th>
                <th>Company</th>
                <th>Applied</th>
                <th>Stage</th>
                <th style={{ textAlign: 'right' }}>Review / Action</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => {
                const profile = Array.isArray(app.profiles?.candidate_profiles)
                  ? app.profiles.candidate_profiles[0]
                  : app.profiles?.candidate_profiles;
                return (
                  <tr key={app.id}>
                    <td>
                      <div className={styles.candidateCell}>
                        <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{app.profiles?.name}</strong>
                        <span style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px' }}>{app.profiles?.email}</span>
                        {profile?.headline && (
                          <span style={{ fontSize: '0.75rem', color: '#475569', fontStyle: 'italic' }}>
                            {profile.headline} {profile.experience_years ? `(${profile.experience_years}y exp)` : ''}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <button 
                        className={styles.viewBtn} 
                        style={{ fontWeight: 700, fontSize: '0.9rem', color: '#2563eb', textDecoration: 'none', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}
                        onClick={() => setSelectedApp(app)}
                      >
                        {app.jobs?.title}
                      </button>
                    </td>
                    <td style={{ fontWeight: 600, color: '#334155' }}>{app.jobs?.companies?.name}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 500 }}>{new Date(app.applied_at).toLocaleDateString()}</span>
                        <span style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 600 }}>{getRelativeTime(app.applied_at)}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`${styles.statusBadge} ${styles[`status_${app.status}`]}`}>
                        {app.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                        {app.status !== 'shortlisted' && app.status !== 'hired' && (
                          <button
                            title="Shortlist / Approve"
                            disabled={updatingId === app.id}
                            onClick={() => handleStatusUpdate(app.id, 'shortlisted')}
                            style={{
                              padding: '6px 12px',
                              background: '#dcfce7',
                              color: '#15803d',
                              border: '1px solid #bbf7d0',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontWeight: 700,
                              fontSize: '0.8rem',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#bbf7d0'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#dcfce7'; }}
                          >
                            ✓ Shortlist
                          </button>
                        )}
                        {app.status !== 'rejected' && (
                          <button
                            title="Reject"
                            disabled={updatingId === app.id}
                            onClick={() => handleStatusUpdate(app.id, 'rejected')}
                            style={{
                              padding: '6px 12px',
                              background: '#fee2e2',
                              color: '#b91c1c',
                              border: '1px solid #fecaca',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontWeight: 700,
                              fontSize: '0.8rem',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#fecaca'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#fee2e2'; }}
                          >
                            ✗ Reject
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedApp(app)}
                          style={{
                            padding: '6px 12px',
                            background: '#f1f5f9',
                            color: '#475569',
                            border: '1px solid #cbd5e1',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: 700,
                            fontSize: '0.8rem'
                          }}
                        >
                          Details
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {selectedApp && (
        <ApplicationDetailModal
          application={selectedApp}
          onClose={() => setSelectedApp(null)}
          onStatusChanged={(appId, nextStatus) => {
            setApplications(prev => prev.map(a => (a.id === appId ? { ...a, status: nextStatus } : a)));
            setSelectedApp(prev => (prev && prev.id === appId ? { ...prev, status: nextStatus } : prev));
          }}
        />
      )}
    </section>
  );
}
