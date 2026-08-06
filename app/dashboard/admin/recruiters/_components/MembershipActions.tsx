'use client';

import { useState } from 'react';
import { AdminButton, AdminTextArea } from '../../_components/AdminForm';
import type { CompanyMember } from '../lib/hooks/useAdminRecruiters';

// Doc 14 R-7 (c): membership lifecycle (suspend/reinstate/remove) is not a recruiters-resource
// action — it is the SAME staff on-behalf branch R-6 built on
// /api/company/[companyId]/members/[userId] (PATCH), reused verbatim here rather than
// duplicated as a parallel admin-recruiters action.
export function MembershipActions({
  userId,
  membership,
  onChanged,
}: {
  userId: string;
  membership: CompanyMember;
  onChanged: () => void;
}) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState('');

  const runTransition = async (status: 'active' | 'suspended' | 'removed') => {
    if (reason.trim().length < 10) {
      setError('A reason (at least 10 characters) is required for membership changes.');
      return;
    }
    setSaving(status);
    setError('');
    try {
      const res = await fetch(`/api/company/${membership.company_id}/members/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reason: reason.trim() }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.message || body?.error || 'Failed to update membership');
      }
      setReason('');
      onChanged();
    } catch (err: any) {
      setError(err.message || 'Failed to update membership');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div style={{ display: 'grid', gap: '0.75rem' }}>
      {error && <div style={{ background: '#fef2f2', color: '#991b1b', padding: '0.6rem 0.75rem', borderRadius: '8px', fontSize: '0.8rem', border: '1px solid #fee2e2' }}>{error}</div>}
      <AdminTextArea
        label="Reason (required, min 10 characters — the company's admins will be notified)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="e.g. Requested by the recruiter via support ticket #1234"
        rows={2}
      />
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {membership.status !== 'active' && (
          <AdminButton type="button" isLoading={saving === 'active'} disabled={!!saving} onClick={() => runTransition('active')} style={{ flex: 1 }}>
            Reinstate
          </AdminButton>
        )}
        {membership.status === 'active' && (
          <AdminButton type="button" variant="secondary" isLoading={saving === 'suspended'} disabled={!!saving} onClick={() => runTransition('suspended')} style={{ flex: 1 }}>
            Suspend Membership
          </AdminButton>
        )}
        <AdminButton type="button" variant="danger" isLoading={saving === 'removed'} disabled={!!saving} onClick={() => runTransition('removed')} style={{ flex: 1 }}>
          Remove from Company
        </AdminButton>
      </div>
    </div>
  );
}
