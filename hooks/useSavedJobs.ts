'use client';

import { useState, useEffect, useCallback } from 'react';
import { insforge } from '@/lib/insforge';

export interface SavedJobsToast {
  message: string;
  type: 'success' | 'error';
}

interface UseSavedJobsReturn {
  savedJobIds: Set<string>;
  toggleSave: (jobId: string) => Promise<void>;
  isSaved: (jobId: string) => boolean;
  loading: boolean;
  count: number;
  toast: SavedJobsToast | null;
  clearToast: () => void;
}

export function useSavedJobs(candidateId: string | null): UseSavedJobsReturn {
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<SavedJobsToast | null>(null);

  const fetchSavedJobs = useCallback(async () => {
    if (!candidateId) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await insforge.database
        .from('saved_jobs')
        .select('job_id')
        .eq('candidate_id', candidateId);

      setSavedJobIds(new Set(data?.map((r: any) => r.job_id) ?? []));
    } catch (err) {
      console.error('Error fetching saved jobs:', err);
    } finally {
      setLoading(false);
    }
  }, [candidateId]);

  useEffect(() => {
    fetchSavedJobs();
  }, [fetchSavedJobs]);

  const toggleSave = useCallback(async (jobId: string) => {
    if (!candidateId) return;

    const wasSaved = savedJobIds.has(jobId);

    // Optimistic update
    setSavedJobIds(prev => {
      const next = new Set(prev);
      if (wasSaved) next.delete(jobId);
      else next.add(jobId);
      return next;
    });

    try {
      if (wasSaved) {
        await insforge.database
          .from('saved_jobs')
          .delete()
          .eq('candidate_id', candidateId)
          .eq('job_id', jobId);
      } else {
        await insforge.database
          .from('saved_jobs')
          .insert([{ candidate_id: candidateId, job_id: jobId }]);
      }
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
      setToast({
        message: wasSaved ? 'Job removed from saved list.' : 'Job saved successfully!',
        type: 'success',
      });
    } catch (err) {
      console.error('Error toggling save:', err);
      // Rollback on error
      setSavedJobIds(prev => {
        const next = new Set(prev);
        if (wasSaved) next.add(jobId);
        else next.delete(jobId);
        return next;
      });
      setToast({ message: 'Something went wrong. Please try again.', type: 'error' });
    }
  }, [candidateId, savedJobIds]);

  return {
    savedJobIds,
    toggleSave,
    isSaved: (id) => savedJobIds.has(id),
    loading,
    count: savedJobIds.size,
    toast,
    clearToast: () => setToast(null),
  };
}
