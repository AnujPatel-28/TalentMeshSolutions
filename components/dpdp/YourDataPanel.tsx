"use client";
import { useEffect, useState } from 'react';

// Doc 26 §4 L-4: "Your data" section in candidate + recruiter settings with the three request
// types and visible status. Shared between both settings pages rather than duplicated — same
// fetch/POST contract for both roles (app/api/dpdp/requests).
type DpdpKind = 'access' | 'correction' | 'erasure';
type DpdpStatus = 'open' | 'in_progress' | 'completed' | 'rejected';

interface DpdpRequest {
  id: string;
  kind: DpdpKind | 'grievance';
  status: DpdpStatus;
  details: string | null;
  response_notes: string | null;
  due_at: string;
  created_at: string;
  completed_at: string | null;
}

const REQUEST_TYPES: { kind: DpdpKind; label: string; desc: string; destructive?: boolean }[] = [
  { kind: 'access', label: 'Download my data', desc: 'Instantly download a machine-readable export of the personal data TalentMesh holds about you.' },
  { kind: 'correction', label: 'Request a correction', desc: 'Ask us to fix inaccurate personal data. Describe what needs correcting below.' },
  { kind: 'erasure', label: 'Request account erasure', desc: 'Permanently anonymise your profile and delete your résumé files. This cannot be undone.', destructive: true },
];

const STATUS_LABEL: Record<DpdpStatus, string> = {
  open: 'Open', in_progress: 'In progress', completed: 'Completed', rejected: 'Rejected',
};

export default function YourDataPanel({ onToast }: { onToast?: (message: string, type: 'success' | 'error') => void }) {
  const [requests, setRequests] = useState<DpdpRequest[]>([]);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState<DpdpKind | null>(null);

  async function load() {
    try {
      const res = await fetch('/api/dpdp/requests');
      if (!res.ok) return;
      const data = await res.json();
      setRequests(data.requests || []);
    } catch (err) {
      console.error('Error loading DPDP requests:', err);
    }
  }

  useEffect(() => { load(); }, []);

  // Access needs no staff judgment to fulfil (unlike correction/erasure), so it downloads
  // immediately via GET /api/dpdp/export rather than waiting on an admin queue action. The ticket
  // is still raised in the background as the auditable record that the right was exercised.
  async function handleDownload() {
    setSubmitting('access');
    try {
      const res = await fetch('/api/dpdp/export');
      if (!res.ok) throw new Error('Failed to generate export');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'talentmesh-data-export.json';
      a.click();
      URL.revokeObjectURL(url);
      onToast?.('Your data export has downloaded.', 'success');
      fetch('/api/dpdp/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'access' }),
      }).then(load).catch(() => {});
    } catch (err: any) {
      onToast?.(err.message || 'Failed to download your data', 'error');
    } finally {
      setSubmitting(null);
    }
  }

  async function handleRaise(kind: DpdpKind, destructive?: boolean) {
    if (destructive && !window.confirm('This permanently anonymises your profile and deletes your résumé files. Continue?')) {
      return;
    }
    setSubmitting(kind);
    try {
      const res = await fetch('/api/dpdp/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, details: details.trim() || undefined }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to submit request');
      onToast?.('Request submitted. Our team will respond within the stated SLA.', 'success');
      setDetails('');
      await load();
    } catch (err: any) {
      onToast?.(err.message || 'Failed to submit request', 'error');
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div style={{ marginTop: '24px' }}>
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#1e293b', margin: '0 0 4px' }}>Your data</h3>
        <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
          Exercise your DPDP rights to access, correct, or erase your personal data.
        </p>
      </div>

      <textarea
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        placeholder="Optional details (e.g. what to correct, or why you're requesting erasure)"
        rows={2}
        style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', marginBottom: '12px', resize: 'vertical' }}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {REQUEST_TYPES.map((rt) => (
          <div key={rt.kind} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: rt.destructive ? '#b91c1c' : '#1e293b' }}>{rt.label}</span>
              <span style={{ fontSize: '12px', color: '#64748b', maxWidth: '90%' }}>{rt.desc}</span>
            </div>
            <button
              onClick={() => (rt.kind === 'access' ? handleDownload() : handleRaise(rt.kind, rt.destructive))}
              disabled={!!submitting}
              style={{
                padding: '8px 14px', borderRadius: '8px', border: '1px solid',
                borderColor: rt.destructive ? '#fecaca' : '#bae6fd',
                backgroundColor: rt.destructive ? '#fef2f2' : '#e0f2fe',
                color: rt.destructive ? '#b91c1c' : '#0369a1',
                fontWeight: 600, fontSize: '13px', whiteSpace: 'nowrap',
                cursor: submitting ? 'wait' : 'pointer',
                opacity: submitting === rt.kind ? 0.6 : 1,
              }}
            >
              {submitting === rt.kind ? (rt.kind === 'access' ? 'Preparing…' : 'Submitting…') : rt.kind === 'access' ? 'Download' : 'Request'}
            </button>
          </div>
        ))}
      </div>

      {requests.length > 0 && (
        <div style={{ marginTop: '18px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#475569', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Request history</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {requests.map((r) => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: '#f8fafc', borderRadius: '8px', fontSize: '13px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontWeight: 600, color: '#1e293b', textTransform: 'capitalize' }}>{r.kind}</span>
                  <span style={{ color: '#94a3b8', fontSize: '12px' }}>Raised {new Date(r.created_at).toLocaleDateString()} · Due {new Date(r.due_at).toLocaleDateString()}</span>
                  {r.response_notes && <span style={{ color: '#64748b', fontSize: '12px' }}>Note: {r.response_notes}</span>}
                </div>
                <span style={{
                  fontSize: '12px', fontWeight: 700, padding: '3px 10px', borderRadius: '999px',
                  backgroundColor: r.status === 'completed' ? '#dcfce7' : r.status === 'rejected' ? '#fee2e2' : r.status === 'in_progress' ? '#fef9c3' : '#e0f2fe',
                  color: r.status === 'completed' ? '#166534' : r.status === 'rejected' ? '#991b1b' : r.status === 'in_progress' ? '#854d0e' : '#0369a1',
                }}>
                  {STATUS_LABEL[r.status]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
