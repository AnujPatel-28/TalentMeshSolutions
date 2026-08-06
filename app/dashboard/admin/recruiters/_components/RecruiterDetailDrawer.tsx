'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FileText, Download } from 'lucide-react';
import DetailDrawer from '@/components/dashboard/DetailDrawer';
import StatusPill from '@/components/dashboard/StatusPill';
import styles from '../../candidates/candidates.module.css';
import { AdminButton } from '../../_components/AdminForm';
import { MembershipActions } from './MembershipActions';
import { ResetLinkButton } from './ResetLinkButton';
import DocViewerModal, { type DocViewerState } from './DocViewerModal';
import { getMembership, getRecruiterProfile, type AdminRecruiter } from '../lib/hooks/useAdminRecruiters';

const PROPOSAL_FEATURES = ['Unlimited Talent Search', 'Dedicated Account Manager', 'AI Candidate Matching', 'Featured Job Posts', 'API Integration'];

function resolveDocUrl(url: string): string {
  const insforgeUrl = process.env.NEXT_PUBLIC_INSFORGE_URL || '';
  if (url.includes('/recruiter_documents/')) {
    const parts = url.split('/recruiter_documents/');
    let key = parts[parts.length - 1];
    if (key.startsWith('objects/')) key = key.substring(8);
    return `${window.location.origin}/api/v1/remote/functions/recruiter-document-proxy?key=${encodeURIComponent(key)}`;
  }
  if (url.startsWith(insforgeUrl)) return url.replace(insforgeUrl, `${window.location.origin}/api/v1/remote`);
  return url;
}

export function RecruiterDetailDrawer({
  recruiter,
  onClose,
  onChanged,
  hasEditPerm,
}: {
  recruiter: AdminRecruiter | null;
  onClose: () => void;
  onChanged: () => void;
  hasEditPerm: boolean;
}) {
  const [docViewer, setDocViewer] = useState<DocViewerState | null>(null);
  const [proposalFeatures, setProposalFeatures] = useState<string[]>([]);
  const [proposalPrice, setProposalPrice] = useState('');
  const [sendingProposal, setSendingProposal] = useState(false);

  const membership = recruiter ? getMembership(recruiter) : null;
  const profile = recruiter ? getRecruiterProfile(recruiter) : null;

  const handleDownload = async (url: string, filename: string) => {
    try {
      const targetUrl = resolveDocUrl(url);
      const token = window.sessionStorage.getItem('tm_token');
      const response = await fetch(targetUrl, { headers: { Authorization: `Bearer ${token}` } });
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, '_blank');
    }
  };

  const handleView = async (url: string, title = 'Verification Document', filename = 'document.pdf') => {
    if (!url) return;
    setDocViewer({ isOpen: true, title, filename, url, loading: true });
    try {
      const targetUrl = resolveDocUrl(url);
      const token = window.sessionStorage.getItem('tm_token');
      const response = await fetch(targetUrl, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error(`HTTP ${response.status}: Failed to fetch document`);
      const blob = await response.blob();

      let mimeType = blob.type;
      try {
        const buffer = await blob.slice(0, 4).arrayBuffer();
        const arr = new Uint8Array(buffer);
        if (arr[0] === 0x25 && arr[1] === 0x50 && arr[2] === 0x44 && arr[3] === 0x46) mimeType = 'application/pdf';
        else if (arr[0] === 0x89 && arr[1] === 0x50 && arr[2] === 0x4e && arr[3] === 0x47) mimeType = 'image/png';
        else if (arr[0] === 0xff && arr[1] === 0xd8 && arr[2] === 0xff) mimeType = 'image/jpeg';
        else if (arr[0] === 0x47 && arr[1] === 0x49 && arr[2] === 0x46 && arr[3] === 0x38) mimeType = 'image/gif';
      } catch { /* fall through to extension sniffing below */ }

      if (mimeType === 'application/octet-stream' || !mimeType) {
        if (url.toLowerCase().endsWith('.pdf')) mimeType = 'application/pdf';
        else if (url.toLowerCase().endsWith('.png')) mimeType = 'image/png';
        else if (url.toLowerCase().endsWith('.jpg') || url.toLowerCase().endsWith('.jpeg')) mimeType = 'image/jpeg';
        else mimeType = 'application/pdf';
      }

      const blobUrl = window.URL.createObjectURL(new Blob([blob], { type: mimeType }));
      setDocViewer({ isOpen: true, title, filename, url, blobUrl, mimeType, loading: false });
    } catch (err: any) {
      setDocViewer((prev) => (prev ? { ...prev, loading: false, error: err.message || 'Failed to load document preview' } : null));
    }
  };

  const sendCustomProposal = async () => {
    if (!recruiter) return;
    setSendingProposal(true);
    try {
      const res = await fetch('/api/admin/send-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recruiterId: recruiter.id,
          email: recruiter.email,
          name: recruiter.name,
          company: membership?.companies?.name || 'Your Company',
          features: proposalFeatures,
          price: Number(proposalPrice),
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || 'Failed to send proposal');
      alert('Proposal sent successfully!');
      setProposalFeatures([]);
      setProposalPrice('');
    } catch (err: any) {
      alert('Failed to send proposal: ' + err.message);
    } finally {
      setSendingProposal(false);
    }
  };

  const docs = [profile?.document_url, profile?.kyc_document_url].filter(Boolean) as string[];

  return (
    <>
      <DetailDrawer isOpen={!!recruiter} onClose={onClose} title={recruiter?.name || ''}>
        {recruiter && (
          <div style={{ display: 'grid', gap: '1.25rem' }}>
            <section className={styles.profileSection} style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ margin: '0 0 0.75rem', fontSize: '1rem', fontWeight: 700 }}>Recruiter</h4>
              <div style={{ display: 'grid', gap: '0.35rem', fontSize: '0.875rem' }}>
                <div><strong>Email:</strong> {recruiter.email}</div>
                <div><strong>Phone:</strong> {recruiter.phone || '—'}</div>
                <div><strong>Joined:</strong> {new Date(recruiter.created_at).toLocaleDateString()}</div>
                <div><strong>Job Title:</strong> {profile?.job_title || '—'}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <strong>Account:</strong> <StatusPill status={recruiter.is_active ? 'active' : 'inactive'} customLabel={recruiter.is_active ? 'Active' : 'Suspended'} />
                </div>
              </div>
            </section>

            <section className={styles.profileSection} style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ margin: '0 0 0.75rem', fontSize: '1rem', fontWeight: 700 }}>Company Membership</h4>
              {membership ? (
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  <div style={{ fontSize: '0.875rem', display: 'grid', gap: '0.35rem' }}>
                    <div>
                      <strong>Company:</strong>{' '}
                      {membership.companies ? (
                        <Link href={`/dashboard/admin/companies/${membership.companies.id}`} style={{ color: '#2563eb', fontWeight: 700 }}>
                          {membership.companies.name}
                        </Link>
                      ) : '—'}
                    </div>
                    <div><strong>GSTIN:</strong> {membership.companies?.gstin || '—'}</div>
                    <div><strong>Role:</strong> {membership.member_role}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <strong>Membership:</strong> <StatusPill status={membership.status} />
                    </div>
                  </div>
                  {hasEditPerm && <MembershipActions userId={recruiter.id} membership={membership} onChanged={onChanged} />}
                </div>
              ) : (
                <p style={{ fontSize: '0.85rem', color: '#64748b' }}>No company membership yet.</p>
              )}
            </section>

            {docs.length > 0 && (
              <section className={styles.profileSection} style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 0.75rem', fontSize: '1rem', fontWeight: 700 }}>Verification Documents</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {docs.map((docUrl, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FileText size={14} /> Document {i + 1}
                      </span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button type="button" onClick={() => handleView(docUrl, `Document ${i + 1}`, `document_${i + 1}.pdf`)} style={{ padding: '4px 10px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}>
                          View
                        </button>
                        <button type="button" onClick={() => handleDownload(docUrl, `document_${i + 1}.pdf`)} style={{ padding: '4px 10px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Download size={12} /> Download
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {hasEditPerm && (
              <section className={styles.profileSection} style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 0.5rem', fontSize: '1rem', fontWeight: 700 }}>Account Access</h4>
                <ResetLinkButton userId={recruiter.id} />
              </section>
            )}

            {hasEditPerm && (
              <section className={styles.profileSection} style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h4>Send Custom Price Plan</h4>
                <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem' }}>Send a custom pricing plan to this recruiter.</p>
                <div style={{ display: 'grid', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
                  {PROPOSAL_FEATURES.map((f) => (
                    <label key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={proposalFeatures.includes(f)}
                        onChange={() => setProposalFeatures((p) => (p.includes(f) ? p.filter((x) => x !== f) : [...p, f]))}
                      />
                      {f}
                    </label>
                  ))}
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '4px' }}>Custom Price (INR)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 50000"
                    value={proposalPrice}
                    onChange={(e) => setProposalPrice(e.target.value)}
                    className={styles.searchInput}
                    style={{ width: '100%' }}
                  />
                </div>
                <AdminButton
                  type="button"
                  isLoading={sendingProposal}
                  disabled={!proposalPrice || Number(proposalPrice) < 0}
                  onClick={sendCustomProposal}
                  style={{ width: '100%' }}
                >
                  Send Proposal
                </AdminButton>
              </section>
            )}
          </div>
        )}
      </DetailDrawer>

      {docViewer?.isOpen && <DocViewerModal docViewer={docViewer} onClose={() => setDocViewer(null)} onDownload={handleDownload} />}
    </>
  );
}
