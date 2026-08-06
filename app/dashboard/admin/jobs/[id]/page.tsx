'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import jobsStyles from '../jobs.module.css';
import { AdminHeader } from '../../_components/AdminHeader';
import { AdminButton } from '../../_components/AdminForm';
import { CustomSelect } from '@/components/ui/CustomSelect';
import DataTable, { Column } from '@/components/dashboard/DataTable';
import StatusPill from '@/components/dashboard/StatusPill';
import { invokeFunction, insforge } from '@/lib/insforge';
import ApplicationDetailModal, { type AdminApplication } from '../../applications/_components/ApplicationDetailModal';
import { APPLICATION_STATUSES, STATUS_LABELS as APPLICATION_STATUS_LABELS } from '@/lib/constants/applicationStatuses';

type JobDetail = {
  id: string;
  title: string;
  description: string;
  requirements: string[] | null;
  skills_required: string[] | null;
  location: string;
  salary_min: number | null;
  salary_max: number | null;
  experience_min: number | null;
  experience_max: number | null;
  department: string | null;
  status: string;
  currency?: string | null;
};

type CompanyInfo = { id: string; name: string; gstin: string | null; status: string } | null;
type RecruiterInfo = { id: string; name: string; email: string } | null;

type JobDetailForm = {
  title: string;
  description: string;
  requirements: string;
  skills_required: string;
  location: string;
  salary_min: string;
  salary_max: string;
  experience_min: string;
  experience_max: string;
  department: string;
  status: string;
};

const JOB_STATUS_OPTIONS = [
  { label: 'Draft', value: 'draft' },
  { label: 'Active', value: 'active' },
  { label: 'Paused', value: 'paused' },
  { label: 'Closed', value: 'closed' },
];

const STAGE_ORDER = Object.values(APPLICATION_STATUSES);

const TABS: Array<{ id: 'details' | 'applicants' | 'history'; label: string }> = [
  { id: 'details', label: 'Details' },
  { id: 'applicants', label: 'Applicants' },
  { id: 'history', label: 'History' },
];

export default function AdminJobDetailPage() {
  const params = useParams<{ id: string }>();
  const jobId = params.id as string;

  const [activeTab, setActiveTab] = useState<'details' | 'applicants' | 'history'>('details');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [job, setJob] = useState<JobDetail | null>(null);
  const [company, setCompany] = useState<CompanyInfo>(null);
  const [recruiter, setRecruiter] = useState<RecruiterInfo>(null);
  const [approvalStatus, setApprovalStatus] = useState('pending');
  const [applicationsByStage, setApplicationsByStage] = useState<Record<string, number>>({});

  const [form, setForm] = useState<JobDetailForm | null>(null);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: fetchError } = await invokeFunction('admin-jobs', {
        method: 'GET',
        queries: { action: 'get-detail', id: jobId },
      });
      if (fetchError) {
        setError(fetchError.message || 'Failed to load job');
        return;
      }
      setJob(data.job);
      setCompany(data.company);
      setRecruiter(data.recruiter);
      setApprovalStatus(data.approval_status);
      setApplicationsByStage(data.applicationsByStage || {});
      setForm({
        title: data.job.title || '',
        description: data.job.description || '',
        requirements: (data.job.requirements || []).join('\n'),
        skills_required: (data.job.skills_required || []).join('\n'),
        location: data.job.location || '',
        salary_min: data.job.salary_min?.toString() ?? '',
        salary_max: data.job.salary_max?.toString() ?? '',
        experience_min: data.job.experience_min?.toString() ?? '',
        experience_max: data.job.experience_max?.toString() ?? '',
        department: data.job.department || '',
        status: data.job.status || 'draft',
      });
    } catch {
      setError('Failed to load job');
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleFormChange = (field: keyof JobDetailForm, value: string) => {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    if (reason.trim().length < 10) {
      setError('A reason (at least 10 characters) is required to save changes to a job.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        title: form.title,
        description: form.description,
        requirements: form.requirements.split('\n').map((s) => s.trim()).filter(Boolean),
        skills_required: form.skills_required.split('\n').map((s) => s.trim()).filter(Boolean),
        location: form.location,
        salary_min: form.salary_min === '' ? null : Number(form.salary_min),
        salary_max: form.salary_max === '' ? null : Number(form.salary_max),
        experience_min: form.experience_min === '' ? null : Number(form.experience_min),
        experience_max: form.experience_max === '' ? null : Number(form.experience_max),
        department: form.department || null,
        status: form.status,
        reason: reason.trim(),
      };
      const { error: saveError } = await invokeFunction('admin-jobs', {
        method: 'PATCH',
        queries: { id: jobId },
        body: payload,
      });
      if (saveError) {
        setError(saveError.message || 'Failed to save changes');
        return;
      }
      setSuccess('Job updated.');
      setReason('');
      fetchDetail();
    } catch {
      setError('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  // Applicants tab
  const [applications, setApplications] = useState<AdminApplication[]>([]);
  const [applicantsLoading, setApplicantsLoading] = useState(false);
  const [selectedApp, setSelectedApp] = useState<AdminApplication | null>(null);

  const fetchApplicants = useCallback(async (): Promise<AdminApplication[]> => {
    setApplicantsLoading(true);
    try {
      const { data, error: fetchError } = await invokeFunction('admin-applications', {
        method: 'GET',
        queries: { job_id: jobId, status: 'all', page: '0', limit: '100' },
      });
      const list: AdminApplication[] = !fetchError ? data.applications || [] : [];
      setApplications(list);
      return list;
    } finally {
      setApplicantsLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    if (activeTab === 'applicants' && applications.length === 0) fetchApplicants();
  }, [activeTab, applications.length, fetchApplicants]);

  // History tab
  const [auditRows, setAuditRows] = useState<any[]>([]);
  const [statusHistoryRows, setStatusHistoryRows] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const apps = applications.length > 0 ? applications : await fetchApplicants();
      const [auditRes, statusHistoryRes] = await Promise.all([
        invokeFunction('admin-audit-logs', { method: 'GET', queries: { record_id: jobId, limit: '50' } }),
        apps.length > 0
          ? insforge.database
              .from('application_status_history')
              .select('*')
              .in('application_id', apps.map((a) => a.id))
              .order('changed_at', { ascending: false })
          : Promise.resolve({ data: [] as any[] }),
      ]);
      setAuditRows(auditRes.data?.logs || []);
      setStatusHistoryRows((statusHistoryRes as any).data || []);
    } finally {
      setHistoryLoading(false);
      setHistoryLoaded(true);
    }
  }, [jobId, applications, fetchApplicants]);

  useEffect(() => {
    if (activeTab === 'history' && !historyLoaded) fetchHistory();
  }, [activeTab, historyLoaded, fetchHistory]);

  const applicantColumns: Column<AdminApplication>[] = [
    {
      header: 'Candidate',
      key: 'profiles.name',
      render: (app) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <strong>{app.profiles?.name}</strong>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{app.profiles?.email}</span>
        </div>
      ),
    },
    {
      header: 'Applied',
      key: 'applied_at',
      render: (app) => <span>{new Date(app.applied_at).toLocaleDateString()}</span>,
    },
    {
      header: 'Stage',
      key: 'status',
      render: (app) => <StatusPill status={app.status} customLabel={APPLICATION_STATUS_LABELS[app.status as keyof typeof APPLICATION_STATUS_LABELS] || app.status} />,
    },
  ];

  if (loading) {
    return (
      <section className={jobsStyles.page}>
        <div className={jobsStyles.emptyState}>Loading job…</div>
      </section>
    );
  }

  if (!job) {
    return (
      <section className={jobsStyles.page}>
        <div className={jobsStyles.errorBanner}>{error || 'Job not found.'}</div>
      </section>
    );
  }

  return (
    <section className={jobsStyles.page}>
      <AdminHeader
        title={job.title}
        eyebrow="Job Posting"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard/admin' },
          { label: 'Jobs', href: '/dashboard/admin/jobs' },
          { label: job.title },
        ]}
      />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginBottom: '24px' }}>
        {company && (
          <Link href={`/dashboard/admin/companies/${company.id}`} style={{ fontWeight: 700, color: '#2563eb', textDecoration: 'none' }}>
            {company.name}
          </Link>
        )}
        {recruiter && (
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Posted by {recruiter.name} ({recruiter.email})
          </span>
        )}
        <StatusPill status={job.status} />
        <StatusPill status={approvalStatus} customLabel={`Approval: ${approvalStatus}`} />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '24px' }}>
        {STAGE_ORDER.map((stage) => (
          <span
            key={stage}
            style={{
              padding: '6px 12px',
              borderRadius: '999px',
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#475569',
            }}
          >
            {APPLICATION_STATUS_LABELS[stage as keyof typeof APPLICATION_STATUS_LABELS] || stage}: {applicationsByStage[stage] || 0}
          </span>
        ))}
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '24px', gap: '1.5rem' }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                paddingBottom: '1rem',
                background: 'none',
                border: 'none',
                borderBottom: isActive ? '2px solid #2563eb' : '2px solid transparent',
                color: isActive ? '#2563eb' : '#64748b',
                fontWeight: isActive ? 700 : 600,
                fontSize: '0.9rem',
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {error && <div className={jobsStyles.errorBanner}>{error}</div>}
      {success && <div className={jobsStyles.successBanner}>{success}</div>}

      {activeTab === 'details' && form && (
        <form className={jobsStyles.form} onSubmit={handleSaveDetails} style={{ maxWidth: '640px' }}>
          <div className={jobsStyles.field}>
            <label className={jobsStyles.label}>Title</label>
            <input className={jobsStyles.input} value={form.title} onChange={(e) => handleFormChange('title', e.target.value)} />
          </div>
          <div className={jobsStyles.field}>
            <label className={jobsStyles.label}>Description</label>
            <textarea className={jobsStyles.textarea} value={form.description} onChange={(e) => handleFormChange('description', e.target.value)} />
          </div>
          <div className={jobsStyles.field}>
            <label className={jobsStyles.label}>Requirements (one per line)</label>
            <textarea className={jobsStyles.textareaSmall} value={form.requirements} onChange={(e) => handleFormChange('requirements', e.target.value)} />
          </div>
          <div className={jobsStyles.field}>
            <label className={jobsStyles.label}>Skills (one per line)</label>
            <textarea className={jobsStyles.textareaSmall} value={form.skills_required} onChange={(e) => handleFormChange('skills_required', e.target.value)} />
          </div>
          <div className={jobsStyles.field}>
            <label className={jobsStyles.label}>Location</label>
            <input className={jobsStyles.input} value={form.location} onChange={(e) => handleFormChange('location', e.target.value)} />
          </div>
          <div className={jobsStyles.twoColumn}>
            <div className={jobsStyles.field}>
              <label className={jobsStyles.label}>Salary Min</label>
              <input className={jobsStyles.input} type="number" value={form.salary_min} onChange={(e) => handleFormChange('salary_min', e.target.value)} />
            </div>
            <div className={jobsStyles.field}>
              <label className={jobsStyles.label}>Salary Max</label>
              <input className={jobsStyles.input} type="number" value={form.salary_max} onChange={(e) => handleFormChange('salary_max', e.target.value)} />
            </div>
          </div>
          <div className={jobsStyles.twoColumn}>
            <div className={jobsStyles.field}>
              <label className={jobsStyles.label}>Experience Min (years)</label>
              <input className={jobsStyles.input} type="number" value={form.experience_min} onChange={(e) => handleFormChange('experience_min', e.target.value)} />
            </div>
            <div className={jobsStyles.field}>
              <label className={jobsStyles.label}>Experience Max (years)</label>
              <input className={jobsStyles.input} type="number" value={form.experience_max} onChange={(e) => handleFormChange('experience_max', e.target.value)} />
            </div>
          </div>
          <div className={jobsStyles.field}>
            <label className={jobsStyles.label}>Department</label>
            <input className={jobsStyles.input} value={form.department} onChange={(e) => handleFormChange('department', e.target.value)} />
          </div>
          <div className={jobsStyles.field}>
            <label className={jobsStyles.label}>Status</label>
            <CustomSelect
              value={form.status}
              onChange={(e: any) => handleFormChange('status', e.target.value)}
              options={JOB_STATUS_OPTIONS}
            />
          </div>
          <div className={jobsStyles.field}>
            <label className={jobsStyles.label}>Reason for this change (required, min 10 characters)</label>
            <textarea className={jobsStyles.textareaSmall} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Company requested an updated salary range" />
          </div>
          <div className={jobsStyles.formActions}>
            <AdminButton type="submit" isLoading={saving}>Save Changes</AdminButton>
          </div>
        </form>
      )}

      {activeTab === 'applicants' && (
        <>
          <DataTable
            columns={applicantColumns}
            data={applications}
            loading={applicantsLoading}
            onRowClick={(row) => setSelectedApp(row)}
            emptyState={<div className={jobsStyles.emptyState}>No applicants for this job yet.</div>}
          />
          {selectedApp && (
            <ApplicationDetailModal
              application={selectedApp}
              onClose={() => setSelectedApp(null)}
              onStatusChanged={(appId, nextStatus) => {
                setApplications((prev) => prev.map((a) => (a.id === appId ? { ...a, status: nextStatus } : a)));
                setSelectedApp((prev) => (prev && prev.id === appId ? { ...prev, status: nextStatus } : prev));
              }}
            />
          )}
        </>
      )}

      {activeTab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '12px' }}>Audit Log</h3>
            {historyLoading ? (
              <div className={jobsStyles.emptyState}>Loading…</div>
            ) : auditRows.length === 0 ? (
              <div className={jobsStyles.emptyState}>No audit entries for this job.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {auditRows.map((row) => (
                  <div key={row.id} style={{ padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                      <span>{row.action}</span>
                      <span style={{ color: '#94a3b8', fontWeight: 400 }}>{new Date(row.created_at).toLocaleString()}</span>
                    </div>
                    <div style={{ color: '#64748b', marginTop: '4px' }}>
                      By {row.actor?.name || 'System'} {row.reason ? `— ${row.reason}` : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '12px' }}>Application Stage Changes</h3>
            {historyLoading ? (
              <div className={jobsStyles.emptyState}>Loading…</div>
            ) : statusHistoryRows.length === 0 ? (
              <div className={jobsStyles.emptyState}>No application stage changes recorded for this job.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {statusHistoryRows.map((row) => (
                  <div key={row.id} style={{ padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                      <span>{row.from_status || '—'} → {row.to_status}</span>
                      <span style={{ color: '#94a3b8', fontWeight: 400 }}>{new Date(row.changed_at).toLocaleString()}</span>
                    </div>
                    <div style={{ color: '#64748b', marginTop: '4px' }}>
                      {row.note || 'Status updated'} by {row.actor_type || 'user'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
