'use client';

import { useState, useCallback } from 'react';
import { invokeFunction } from '@/lib/insforge';

// R-5: admin-applications PATCH now requires a `reason` (min 10 chars) on every staff-initiated
// stage change (it notifies the owning company's admins). Shared by the applications list and
// the job-detail Applicants tab so both call sites collect the reason the same way.
export function useAdminApplicationStage(onUpdated?: (applicationId: string, status: string) => void) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const changeStatus = useCallback(
    async (applicationId: string, nextStatus: string): Promise<{ ok: true } | { ok: false; message: string }> => {
      const reason = window.prompt(
        'Reason for this stage change (min 10 characters) — the company will be notified:'
      );
      if (reason === null) return { ok: false, message: '' };
      if (reason.trim().length < 10) {
        return { ok: false, message: 'Reason must be at least 10 characters.' };
      }

      setUpdatingId(applicationId);
      try {
        const { error } = await invokeFunction('admin-applications', {
          method: 'PATCH',
          body: { id: applicationId, status: nextStatus, reason: reason.trim() },
        });
        if (error) {
          if (error.status === 409 || error.message?.includes('withdrawn')) {
            return { ok: false, message: 'Cannot update a withdrawn application.' };
          }
          return { ok: false, message: error.message || 'Status update failed' };
        }
        onUpdated?.(applicationId, nextStatus);
        return { ok: true };
      } catch {
        return { ok: false, message: 'Status update failed' };
      } finally {
        setUpdatingId(null);
      }
    },
    [onUpdated]
  );

  return { changeStatus, updatingId };
}
