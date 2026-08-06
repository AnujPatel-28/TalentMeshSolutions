'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import jobsStyles from '../../jobs/jobs.module.css';
import { AdminHeader } from '../../_components/AdminHeader';
import { AdminButton, AdminInput, AdminSelect, AdminTextArea } from '../../_components/AdminForm';
import DataTable, { Column } from '@/components/dashboard/DataTable';
import StatusPill from '@/components/dashboard/StatusPill';
import { invokeFunction } from '@/lib/insforge';
import { getPublicStorageUrl } from '@/lib/utils/storage-url';
import ApplicationDetailModal, { type AdminApplication } from '../../applications/_components/ApplicationDetailModal';
import { VerificationDecisionModal, type QueueItem } from '../../verification/_components/VerificationDecisionModal';

type Company = {
  id: string; name: string; gstin: string; cin: string | null; status: string;
  website: string | null; industry: string | null; size: string | null; location: string | null;
  description: string | null; logo_url: string | null; country_code: string;
  created_at: string; verified_at: string | null;
};
type Member = {
  id: string; user_id: string; member_role: 'admin' | 'recruiter' | 'coordinator';
  status: 'invited' | 'active' | 'suspended' | 'removed'; joined_at: string | null;
  name: string | null; email: string | null;
};
type JobsSummary = { total: number; byStatus: Record<string, number>; byApproval: Record<string, number>; activeJobsUsed: number };
type Subscription = { plan: string; status: string; max_active_jobs: number } | null;
type AuditRow = { id: string; action: string; created_at: string; reason?: string | null; metadata?: any; actor: { name: string; email: string } | null; from_state?: string; to_state?: string };

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'members', label: 'Members' },
  { id: 'jobs', label: 'Jobs' },
  { id: 'applications', label: 'Applications' },
  { id: 'verification', label: 'Verification' },
  { id: 'audit', label: 'Audit' },
] as const;
type TabId = typeof TABS[number]['id'];

const EDIT_FIELDS = ['name', 'website', 'industry', 'size', 'location', 'description', 'logo_url', 'country_code'] as const;

export default function AdminCompanyDetailPage() {
  const params = useParams<{ id: string }>();
  const companyId = params.id as string;

  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [company, setCompany] = useState<Company | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [jobsSummary, setJobsSummary] = useState<JobsSummary | null>(null);
  const [verification, setVerification] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<Subscription>(null);
  const [auditLog, setAuditLog] = useState<{ verification: AuditRow[]; platform: AuditRow[] }>({ verification: [], platform: [] });

  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [editReason, setEditReason] = useState('');
  const [saving, setSaving] = useState(false);

  const [lifecycleReason, setLifecycleReason] = useState('');
  const [lifecycleBusy, setLifecycleBusy] = useState(false);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: fetchError } = await invokeFunction('admin-companies', {
        method: 'GET',
        queries: { action: 'get-detail', id: companyId },
      });
      if (fetchError) {
        setError(fetchError.message || 'Failed to load company');
        return;
      }
      setCompany(data.company);
      setMembers(data.members || []);
      setJobsSummary(data.jobs);
      setVerification(data.verification || []);
      setSubscription(data.subscription);
      setAuditLog(data.auditLog || { verification: [], platform: [] });
      const form: Record<string, string> = {};
      for (const f of EDIT_FIELDS) form[f] = data.company?.[f] || (f === 'country_code' ? 'IN' : '');
      setEditForm(form);
    } catch {
      setError('Failed to load company');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editReason.trim().length < 10) {
      setError('A reason (at least 10 characters) is required to save changes.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload: Record<string, any> = { reason: editReason.trim() };
      for (const f of EDIT_FIELDS) {
        if (editForm[f]) payload[f] = editForm[f];
      }
      const { error: saveError } = await invokeFunction('admin-companies', {
        method: 'PATCH',
        queries: { id: companyId },
        body: payload,
      });
      if (saveError) {
        setError(saveError.message || 'Failed to save changes');
        return;
      }
      setSuccess('Company profile updated.');
      setEditReason('');
      fetchDetail();
    } catch {
      setError('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const runLifecycleAction = async (action: 'suspend' | 'reinstate' | 'deactivate') => {
    if (lifecycleReason.trim().length < 10) {
      setError('A reason (at least 10 characters) is required for this action.');
      return;
    }
    setLifecycleBusy(true);
    setError('');
    setSuccess('');
    try {
      const { error: actionError } = await invokeFunction('admin-companies', {
        method: 'POST',
        body: { action, id: companyId, reason: lifecycleReason.trim() },
      });
      if (actionError) {
        setError(actionError.message || `Failed to ${action} company`);
        return;
      }
      setSuccess(`Company ${action === 'deactivate' ? 'deactivated' : action + 'd'}.`);
      setLifecycleReason('');
      fetchDetail();
    } catch {
      setError(`Failed to ${action} company`);
    } finally {
      setLifecycleBusy(false);
    }
  };

  // ── Members tab ──
  const [memberReason, setMemberReason] = useState('');
  const [memberBusy, setMemberBusy] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'recruiter' | 'coordinator'>('recruiter');

  const requireMemberReason = () => {
    if (memberReason.trim().length < 10) {
      setError('A reason (at least 10 characters) is required for member changes.');
      return null;
    }
    return memberReason.trim();
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const reason = requireMemberReason();
    if (!reason) return;
    setMemberBusy('invite');
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/company/${companyId}/members/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, member_role: inviteRole, reason }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.message || body.error || 'Failed to invite member');
        return;
      }
      setSuccess('Member invited.');
      setInviteEmail('');
      setMemberReason('');
      fetchDetail();
    } catch {
      setError('Failed to invite member');
    } finally {
      setMemberBusy(null);
    }
  };

  const handleMemberUpdate = async (userId: string, body: Record<string, any>) => {
    const reason = requireMemberReason();
    if (!reason) return;
    setMemberBusy(userId);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/company/${companyId}/members/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, reason }),
      });
      const resBody = await res.json();
      if (!res.ok) {
        if (res.status === 422 && resBody.error === 'last_admin') {
          setError('Cannot update this member: promote another admin first.');
        } else {
          setError(resBody.message || resBody.error || 'Failed to update member');
        }
        return;
      }
      setSuccess('Member updated.');
      setMemberReason('');
      fetchDetail();
    } catch {
      setError('Failed to update member');
    } finally {
      setMemberBusy(null);
    }
  };

  const handleAcceptOnBehalf = async (userId: string) => {
    const reason = requireMemberReason();
    if (!reason) return;
    setMemberBusy(userId);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/company/${companyId}/members/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, reason }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.message || body.error || 'Failed to accept invite on behalf');
        return;
      }
      setSuccess('Invite accepted on behalf of the member.');
      setMemberReason('');
      fetchDetail();
    } catch {
      setError('Failed to accept invite on behalf');
    } finally {
      setMemberBusy(null);
    }
  };

  const memberColumns: Column<Member>[] = [
    { header: 'Name', key: 'name', render: (m) => <div><strong>{m.name || '—'}</strong><div style={{ fontSize: '0.75rem', color: '#64748b' }}>{m.email}</div></div> },
    { header: 'Role', key: 'member_role' },
    { header: 'Status', key: 'status', render: (m) => <StatusPill status={m.status} /> },
    { header: 'Joined', key: 'joined_at', render: (m) => <span>{m.joined_at ? new Date(m.joined_at).toLocaleDateString() : '—'}</span> },
    {
      header: 'Actions',
      key: 'actions',
      render: (m) => (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {m.status === 'invited' && (
            <AdminButton type="button" variant="secondary" disabled={memberBusy === m.user_id} onClick={() => handleAcceptOnBehalf(m.user_id)} style={{ padding: '6px 10px', fontSize: '0.75rem' }}>
              Accept on behalf
            </AdminButton>
          )}
          {m.status === 'active' && (
            <AdminButton type="button" variant="secondary" disabled={memberBusy === m.user_id} onClick={() => handleMemberUpdate(m.user_id, { status: 'suspended' })} style={{ padding: '6px 10px', fontSize: '0.75rem' }}>
              Suspend
            </AdminButton>
          )}
          {m.status === 'suspended' && (
            <AdminButton type="button" variant="secondary" disabled={memberBusy === m.user_id} onClick={() => handleMemberUpdate(m.user_id, { status: 'active' })} style={{ padding: '6px 10px', fontSize: '0.75rem' }}>
              Reinstate
            </AdminButton>
          )}
          {(m.status === 'active' || m.status === 'suspended') && (
            <AdminButton type="button" variant="danger" disabled={memberBusy === m.user_id} onClick={() => handleMemberUpdate(m.user_id, { status: 'removed' })} style={{ padding: '6px 10px', fontSize: '0.75rem' }}>
              Remove
            </AdminButton>
          )}
          {m.member_role !== 'admin' && m.status === 'active' && (
            <AdminButton type="button" variant="secondary" disabled={memberBusy === m.user_id} onClick={() => handleMemberUpdate(m.user_id, { member_role: 'admin' })} style={{ padding: '6px 10px', fontSize: '0.75rem' }}>
              Make admin
            </AdminButton>
          )}
        </div>
      ),
    },
  ];

  // ── Jobs tab ──
  const [jobs, setJobs] = useState<any[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsLoaded, setJobsLoaded] = useState(false);

  const fetchJobs = useCallback(async () => {
    setJobsLoading(true);
    try {
      const { data, error: fetchError } = await invokeFunction('admin-jobs', {
        method: 'GET',
        queries: { company_id: companyId, limit: '100' },
      });
      setJobs(!fetchError ? data.items || [] : []);
    } finally {
      setJobsLoading(false);
      setJobsLoaded(true);
    }
  }, [companyId]);

  useEffect(() => {
    if (activeTab === 'jobs' && !jobsLoaded) fetchJobs();
  }, [activeTab, jobsLoaded, fetchJobs]);

  const jobColumns: Column<any>[] = [
    { header: 'Title', key: 'title', render: (j) => <Link href={`/dashboard/admin/jobs/${j.id}`} style={{ color: '#2563eb', fontWeight: 700, textDecoration: 'none' }}>{j.title}</Link> },
    { header: 'Status', key: 'status', render: (j) => <StatusPill status={j.status} /> },
    { header: 'Approval', key: 'approval_status', render: (j) => <StatusPill status={j.approval_status} customLabel={j.approval_status} /> },
    { header: 'Posted', key: 'created_at', render: (j) => <span>{new Date(j.created_at).toLocaleDateString()}</span> },
  ];

  // ── Applications tab ──
  const [applications, setApplications] = useState<AdminApplication[]>([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [applicationsLoaded, setApplicationsLoaded] = useState(false);
  const [selectedApp, setSelectedApp] = useState<AdminApplication | null>(null);

  const fetchApplications = useCallback(async () => {
    setApplicationsLoading(true);
    try {
      const { data, error: fetchError } = await invokeFunction('admin-applications', {
        method: 'GET',
        queries: { company_id: companyId, status: 'all', limit: '100' },
      });
      setApplications(!fetchError ? data.applications || [] : []);
    } finally {
      setApplicationsLoading(false);
      setApplicationsLoaded(true);
    }
  }, [companyId]);

  useEffect(() => {
    if (activeTab === 'applications' && !applicationsLoaded) fetchApplications();
  }, [activeTab, applicationsLoaded, fetchApplications]);

  const applicationColumns: Column<AdminApplication>[] = [
    { header: 'Candidate', key: 'profiles.name', render: (a) => <div><strong>{a.profiles?.name}</strong><div style={{ fontSize: '0.75rem', color: '#64748b' }}>{a.profiles?.email}</div></div> },
    { header: 'Job', key: 'jobs.title', render: (a: any) => a.jobs?.title || '—' },
    { header: 'Stage', key: 'status', render: (a) => <StatusPill status={a.status} /> },
    { header: 'Applied', key: 'applied_at', render: (a) => <span>{new Date(a.applied_at).toLocaleDateString()}</span> },
  ];

  const funnelByStage: Record<string, number> = {};
  for (const a of applications) funnelByStage[a.status] = (funnelByStage[a.status] || 0) + 1;

  // ── Verification tab ──
  const [selectedVerification, setSelectedVerification] = useState<QueueItem | null>(null);

  if (loading) {
    return <section className={jobsStyles.page}><div className={jobsStyles.emptyState}>Loading company…</div></section>;
  }
  if (!company) {
    return <section className={jobsStyles.page}><div className={jobsStyles.errorBanner}>{error || 'Company not found.'}</div></section>;
  }

  return (
    <section className={jobsStyles.page}>
      <AdminHeader
        title={company.name}
        eyebrow="Company"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard/admin' },
          { label: 'Companies', href: '/dashboard/admin/companies' },
          { label: company.name },
        ]}
      />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginBottom: '24px' }}>
        {company.logo_url && (
          <img src={getPublicStorageUrl('company-logos', company.logo_url)} alt={company.name} style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
        )}
        <StatusPill status={company.status} />
        <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#64748b' }}>GSTIN: {company.gstin}</span>
        {company.cin && <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#64748b' }}>CIN: {company.cin}</span>}
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '24px', gap: '1.5rem' }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                paddingBottom: '1rem', background: 'none', border: 'none',
                borderBottom: isActive ? '2px solid #2563eb' : '2px solid transparent',
                color: isActive ? '#2563eb' : '#64748b', fontWeight: isActive ? 700 : 600,
                fontSize: '0.9rem', cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {error && <div className={jobsStyles.errorBanner}>{error}</div>}
      {success && <div className={jobsStyles.successBanner}>{success}</div>}

      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gap: '2rem' }}>
          {jobsSummary && (
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ padding: '1rem 1.25rem', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#f8fafc' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Active jobs</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
                  {jobsSummary.activeJobsUsed} / {subscription?.max_active_jobs ?? '—'}
                </div>
              </div>
              <div style={{ padding: '1rem 1.25rem', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#f8fafc' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Plan</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', textTransform: 'capitalize' }}>{subscription?.plan ?? 'None'}</div>
              </div>
              <div style={{ padding: '1rem 1.25rem', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#f8fafc' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total jobs</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>{jobsSummary.total}</div>
              </div>
            </div>
          )}

          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '12px' }}>Lifecycle</h3>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: '1 1 320px' }}>
                <AdminTextArea label="Reason (required, min 10 characters)" value={lifecycleReason} onChange={(e) => setLifecycleReason(e.target.value)} rows={2} placeholder="e.g. Reported fraudulent job postings" />
              </div>
              {company.status === 'verified' && (
                <AdminButton type="button" variant="secondary" isLoading={lifecycleBusy} onClick={() => runLifecycleAction('suspend')}>Suspend</AdminButton>
              )}
              {company.status === 'suspended' && (
                <AdminButton type="button" variant="secondary" isLoading={lifecycleBusy} onClick={() => runLifecycleAction('reinstate')}>Reinstate</AdminButton>
              )}
              {(company.status === 'verified' || company.status === 'suspended') && (
                <AdminButton type="button" variant="danger" isLoading={lifecycleBusy} onClick={() => runLifecycleAction('deactivate')}>Deactivate</AdminButton>
              )}
              {company.status === 'pending' && (
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Not yet verified — use the Verification tab to approve or reject.</span>
              )}
            </div>
          </div>

          <form onSubmit={handleSaveDetails} style={{ maxWidth: '640px', display: 'grid', gap: '0' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '4px' }}>Company Profile</h3>
            <AdminInput label="Name" value={editForm.name || ''} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} />
            <AdminInput label="Website" value={editForm.website || ''} onChange={(e) => setEditForm((p) => ({ ...p, website: e.target.value }))} />
            <AdminInput label="Industry" value={editForm.industry || ''} onChange={(e) => setEditForm((p) => ({ ...p, industry: e.target.value }))} />
            <AdminSelect
              label="Size"
              value={editForm.size || ''}
              onChange={(e: any) => setEditForm((p) => ({ ...p, size: e.target.value }))}
              options={[{ value: '', label: 'Select size' }, { value: '1-10', label: '1-10' }, { value: '11-50', label: '11-50' }, { value: '51-200', label: '51-200' }, { value: '201-500', label: '201-500' }, { value: '501-1000', label: '501-1000' }, { value: '1000+', label: '1000+' }]}
            />
            <AdminInput label="Location" value={editForm.location || ''} onChange={(e) => setEditForm((p) => ({ ...p, location: e.target.value }))} />
            <AdminTextArea label="Description" value={editForm.description || ''} onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))} rows={3} />
            <AdminInput label="Country code" value={editForm.country_code || 'IN'} onChange={(e) => setEditForm((p) => ({ ...p, country_code: e.target.value }))} maxLength={2} />
            <AdminTextArea label="Reason for this change (required, min 10 characters)" value={editReason} onChange={(e) => setEditReason(e.target.value)} rows={2} placeholder="e.g. Company requested updated contact details" />
            <div className={jobsStyles.formActions}>
              <AdminButton type="submit" isLoading={saving}>Save Changes</AdminButton>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'members' && (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          <form onSubmit={handleInvite} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem', background: '#f8fafc' }}>
            <div style={{ flex: '1 1 220px' }}>
              <AdminInput label="Invite by email" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="recruiter@company.com" required />
            </div>
            <div style={{ flex: '0 1 160px' }}>
              <AdminSelect label="Role" value={inviteRole} onChange={(e: any) => setInviteRole(e.target.value)} options={[{ value: 'recruiter', label: 'Recruiter' }, { value: 'coordinator', label: 'Coordinator' }, { value: 'admin', label: 'Admin' }]} />
            </div>
            <AdminButton type="submit" isLoading={memberBusy === 'invite'} disabled={!inviteEmail}>Invite</AdminButton>
          </form>

          <div style={{ maxWidth: '480px' }}>
            <AdminTextArea label="Reason for member actions (required, min 10 characters)" value={memberReason} onChange={(e) => setMemberReason(e.target.value)} rows={2} placeholder="Applies to invite, role change, suspend, reinstate, remove, and accept-on-behalf below" />
          </div>

          <DataTable columns={memberColumns} data={members} emptyState={<div className={jobsStyles.emptyState}>No members yet.</div>} rowKeyField="id" />
        </div>
      )}

      {activeTab === 'jobs' && (
        <DataTable columns={jobColumns} data={jobs} loading={jobsLoading} emptyState={<div className={jobsStyles.emptyState}>No job postings yet.</div>} rowKeyField="id" />
      )}

      {activeTab === 'applications' && (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {Object.entries(funnelByStage).map(([stage, count]) => (
              <span key={stage} style={{ padding: '6px 12px', borderRadius: '999px', background: '#f1f5f9', border: '1px solid #e2e8f0', fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>
                {stage}: {count}
              </span>
            ))}
          </div>
          <DataTable columns={applicationColumns} data={applications} loading={applicationsLoading} onRowClick={(row) => setSelectedApp(row)} emptyState={<div className={jobsStyles.emptyState}>No applications yet.</div>} rowKeyField="id" />
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
        </div>
      )}

      {activeTab === 'verification' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {verification.length === 0 ? (
            <div className={jobsStyles.emptyState}>No verification requests yet.</div>
          ) : (
            verification.map((v: any) => (
              <div
                key={v.id}
                onClick={() => setSelectedVerification({ ...v, company_id: companyId, submitted_by: '', companies: { name: company.name, gstin: company.gstin, website: company.website, status: company.status } })}
                style={{ padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '0.85rem', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <StatusPill status={v.status} />
                  <span style={{ color: '#94a3b8' }}>{new Date(v.created_at).toLocaleString()}</span>
                </div>
                {v.review_notes && <div style={{ marginTop: '6px', color: '#64748b' }}>{v.review_notes}</div>}
              </div>
            ))
          )}
          {selectedVerification && (
            <VerificationDecisionModal
              request={selectedVerification}
              onClose={() => setSelectedVerification(null)}
              onDecided={() => {
                setSelectedVerification(null);
                fetchDetail();
              }}
            />
          )}
        </div>
      )}

      {activeTab === 'audit' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '12px' }}>Verification &amp; Lifecycle Log</h3>
            {auditLog.verification.length === 0 ? (
              <div className={jobsStyles.emptyState}>No verification lifecycle events.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {auditLog.verification.map((row) => (
                  <div key={row.id} style={{ padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                      <span>{row.action} {row.from_state ? `(${row.from_state} → ${row.to_state})` : ''}</span>
                      <span style={{ color: '#94a3b8', fontWeight: 400 }}>{new Date(row.created_at).toLocaleString()}</span>
                    </div>
                    <div style={{ color: '#64748b', marginTop: '4px' }}>By {row.actor?.name || 'System'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '12px' }}>Staff Interventions (on behalf of this company)</h3>
            {auditLog.platform.length === 0 ? (
              <div className={jobsStyles.emptyState}>No staff interventions recorded.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {auditLog.platform.map((row) => (
                  <div key={row.id} style={{ padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                      <span>{row.action}</span>
                      <span style={{ color: '#94a3b8', fontWeight: 400 }}>{new Date(row.created_at).toLocaleString()}</span>
                    </div>
                    <div style={{ color: '#64748b', marginTop: '4px' }}>By {row.actor?.name || 'System'} {row.reason ? `— ${row.reason}` : ''}</div>
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
