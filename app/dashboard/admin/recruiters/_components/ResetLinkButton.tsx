'use client';

import { useState } from 'react';
import { invokeFunction } from '@/lib/insforge';
import { AdminButton } from '../../_components/AdminForm';

// Doc 14 R-7 (d): replaces update-password/send-credentials. Never touches or displays a
// password — sends InsForge's built-in password-reset email. The underlying auth user id
// never changes.
export function ResetLinkButton({ userId }: { userId: string }) {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<'success' | 'error' | null>(null);

  const handleSend = async () => {
    if (!confirm('Send a password-reset link to this recruiter? They will need it to set a new password.')) return;
    setSending(true);
    setResult(null);
    try {
      const { error } = await invokeFunction('admin-recruiters', {
        method: 'POST',
        body: { action: 'send-reset-link', userId },
      });
      if (error) throw new Error(error.message);
      setResult('success');
    } catch {
      setResult('error');
    } finally {
      setSending(false);
      setTimeout(() => setResult(null), 4000);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <AdminButton type="button" variant="secondary" isLoading={sending} onClick={handleSend}>
        Send Password Reset Link
      </AdminButton>
      {result === 'success' && <span style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 600 }}>Sent.</span>}
      {result === 'error' && <span style={{ fontSize: '0.8rem', color: '#dc2626', fontWeight: 600 }}>Failed to send.</span>}
    </div>
  );
}
