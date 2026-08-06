'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import styles from './candidates.module.css';
import { invokeFunction } from '@/lib/insforge';
import { useAuth } from '@/lib/auth/AuthContext';
import { useSelection } from '@/hooks/useSelection';
import { BulkConfirmModal } from '../_components/BulkConfirmModal';
import { mutationQueue } from '@/lib/mutationQueue';
import { canPerform, Role } from '@/lib/permissions';
import { recordMetric, startTrace, endTrace } from '@/lib/observability';
import { MapPin, Briefcase, FileText, Download, CheckCircle2, XCircle, Trash2, ShieldAlert } from 'lucide-react';
import DataTable, { Column } from '@/components/dashboard/DataTable';
import DetailDrawer from '@/components/dashboard/DetailDrawer';
import StatusPill from '@/components/dashboard/StatusPill';

type CandidateProfile = {
  headline?: string;
  skills?: string[];
  experience_years?: number | null;
  education?: string;
  resume_url?: string;
  profile_strength?: number;
  linkedin_url?: string;
  github_url?: string;
  portfolio_url?: string;
  primary_resume_id?: string;
};

type AdminCandidate = {
  id: string;
  email: string;
  name: string;
  phone?: string;
  location?: string;
  is_active: boolean;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  candidate_profiles: CandidateProfile | CandidateProfile[];
};

function CandidateCardSkeleton() {
  return (
    <article className={`${styles.candidateCard} ${styles.skeletonCard}`}>
      <div className={styles.cardHeader}>
        <div className={`${styles.initials} ${styles.skeletonPulse}`} />
        <div className={styles.mainInfo} style={{ display: 'grid', gap: '6px' }}>
          <div className={`${styles.name} ${styles.skeletonPulse}`} style={{ height: '18px', width: '120px' }} />
          <div className={`${styles.email} ${styles.skeletonPulse}`} style={{ height: '14px', width: '160px' }} />
        </div>
      </div>
      <div className={styles.body} style={{ display: 'grid', gap: '8px' }}>
        <div className={`${styles.headline} ${styles.skeletonPulse}`} style={{ height: '16px', width: '90%' }} />
        <div className={`${styles.meta} ${styles.skeletonPulse}`} style={{ height: '14px', width: '50%', marginTop: '6px' }} />
      </div>
    </article>
  );
}

export default function AdminCandidatesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // URL State Synced Parameters
  const urlSearch = searchParams.get('search') || '';
  const urlPage = parseInt(searchParams.get('page') || '0');
  const urlSort = searchParams.get('sort') || 'newest';
  const urlStatus = searchParams.get('status') || 'all';

  const [candidates, setCandidates] = useState<AdminCandidate[]>([]);
  const [searchVal, setSearchVal] = useState(urlSearch);
  const [activeSearch, setActiveSearch] = useState(urlSearch);
  const [sort, setSort] = useState(urlSort);
  const [status, setStatus] = useState(urlStatus);
  const [page, setPage] = useState(urlPage);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Detail Drawer View
  const [previewUser, setPreviewUser] = useState<AdminCandidate | null>(null);

  // Background Export Queue State
  const [exportLoading, setExportLoading] = useState(false);
  const [exportProgress, setExportProgress] = useState('');

  // Bulk Action Confirmation Dialog State
  const [bulkActionTarget, setBulkActionTarget] = useState<{ action: string; impact: string } | null>(null);

  // Bulk Undo State
  const [pendingAction, setPendingAction] = useState<{
    action: string;
    ids: string[];
    backup: AdminCandidate[];
    timeLeft: number;
  } | null>(null);
  
  const pendingActionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingActionRef = useRef<typeof pendingAction>(null);

  // Permissions Guards
  const hasEditPerm = user?.role ? canPerform(user.role as Role, 'candidates', 'edit') : false;
  const hasDeletePerm = user?.role ? canPerform(user.role as Role, 'candidates', 'delete') : false;
  const hasApprovePerm = user?.role ? canPerform(user.role as Role, 'candidates', 'approve') : false;
  const hasExportPerm = user?.role ? canPerform(user.role as Role, 'candidates', 'export') : false;

  // page-scoped Selection hook reset dependency array
  const filterDeps = useMemo(() => [activeSearch, status, sort], [activeSearch, status, sort]);
  const {
    selectedIds,
    toggleSelect,
    selectAll,
    clearSelection,
    isSelected
  } = useSelection(filterDeps);

  // Request Deduplication and Abort references
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastFetchParamsRef = useRef<string>('');
  const internalNavRef = useRef(false);

  const fetchCandidates = useCallback(async (p = page, q = activeSearch, o = sort, s = status, force = false) => {
    const fetchKey = `${p}-${q}-${o}-${s}`;
    if (!force && lastFetchParamsRef.current === fetchKey) {
      return;
    }
    lastFetchParamsRef.current = fetchKey;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      recordMetric('abort', 1);
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError('');
    recordMetric('request', 1);

    const trace = startTrace('admin-candidates', user?.role);
    try {
      const { data, error: fetchError } = await invokeFunction('admin-candidates', {
        method: 'GET',
        queries: {
          search: q || undefined,
          page: p.toString(),
          limit: '25',
          sort: o,
          status: s !== 'all' ? s : undefined
        },
        signal: controller.signal
      });

      if (fetchError) throw new Error(fetchError.message);

      if (data) {
        setCandidates(data.items || data.candidates || []);
        setTotalCount(data.total || 0);
        setTotalPages(Math.ceil((data.total || 0) / 25));
        endTrace(trace, 'success');
        recordMetric('search', performance.now() - trace.startTime);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Failed to load candidates');
        endTrace(trace, 'error', err.message);
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [page, activeSearch, sort, status, user?.role]);

  // Synchronize component states when URL parameters change (back/forward history or mount)
  useEffect(() => {
    if (internalNavRef.current) {
      internalNavRef.current = false;
      return;
    }
    const q = searchParams.get('search') || '';
    const p = parseInt(searchParams.get('page') || '0');
    const s = searchParams.get('status') || 'all';
    const o = searchParams.get('sort') || 'newest';

    setPage(p);
    setActiveSearch(q);
    setSearchVal(q);
    setSort(o);
    setStatus(s);

    if (user) {
      fetchCandidates(p, q, o, s);
    }
  }, [searchParams, fetchCandidates, user]);

  // Keep ref in sync
  useEffect(() => {
    pendingActionRef.current = pendingAction;
  }, [pendingAction]);

  // Listen to background refresh events from layout (surviving navigation)
  useEffect(() => {
    const handleRefresh = () => {
      fetchCandidates(page, activeSearch, sort, status, true);
    };
    window.addEventListener('admin-candidates:refresh', handleRefresh);
    return () => {
      window.removeEventListener('admin-candidates:refresh', handleRefresh);
    };
  }, [fetchCandidates, page, activeSearch, sort, status]);

  const commitPendingAction = useCallback(async (action: string, ids: string[], backup: AdminCandidate[]) => {
    window.sessionStorage.removeItem('tm_pending_action_candidates');
    try {
      await mutationQueue.enqueue(
        async (idemKey) => {
          let error = null;
          if (action === 'approve' || action === 'reject') {
            const { error: patchError } = await invokeFunction('admin-candidates', {
              method: 'POST',
              body: { action: 'bulk-status', ids, status: action === 'approve' ? 'approved' : 'rejected' },
              idempotencyKey: idemKey
            });
            error = patchError;
          } else if (action === 'activate' || action === 'deactivate') {
            const { error: patchError } = await invokeFunction('admin-candidates', {
              method: 'POST',
              body: { action: 'bulk-active', ids, is_active: action === 'activate' },
              idempotencyKey: idemKey
            });
            error = patchError;
          }

          if (error) throw new Error(error.message);
          
          recordMetric('bulk_action', ids.length);
          fetchCandidates(page, activeSearch, sort, status, true);
        },
        () => {
          setCandidates(backup);
          alert('Bulk operation failed, rolled back changes.');
        },
        { key: `bulk_candidates_${action}_${Date.now()}` }
      );
    } catch (err: any) {
      setError(err.message || 'Bulk operation execution failed.');
    }
  }, [page, activeSearch, sort, status, fetchCandidates]);

  // Load initial pending action from sessionStorage on mount
  useEffect(() => {
    const stored = window.sessionStorage.getItem('tm_pending_action_candidates');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const timeLeft = Math.ceil((parsed.expiresAt - Date.now()) / 1000);
        if (timeLeft <= 0) {
          commitPendingAction(parsed.action, parsed.ids, parsed.backup);
          window.sessionStorage.removeItem('tm_pending_action_candidates');
        } else {
          setPendingAction({
            action: parsed.action,
            ids: parsed.ids,
            backup: parsed.backup,
            timeLeft
          });
        }
      } catch (e) {
        window.sessionStorage.removeItem('tm_pending_action_candidates');
      }
    }
  }, [commitPendingAction]);

  // Countdown timer logic
  useEffect(() => {
    if (!pendingAction) return;

    pendingActionTimerRef.current = setInterval(() => {
      setPendingAction(prev => {
        if (!prev) return null;
        if (prev.timeLeft <= 1) {
          commitPendingAction(prev.action, prev.ids, prev.backup);
          return null;
        }
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);

    return () => {
      if (pendingActionTimerRef.current) {
        clearInterval(pendingActionTimerRef.current);
      }
    };
  }, [pendingAction, commitPendingAction]);

  const handleUndoPending = () => {
    if (pendingActionTimerRef.current) {
      clearInterval(pendingActionTimerRef.current);
    }
    if (pendingAction) {
      setCandidates(pendingAction.backup);
    }
    setPendingAction(null);
    window.sessionStorage.removeItem('tm_pending_action_candidates');
  };

  const updateUrl = (p: number, q: string, s: string, o: string) => {
    const params = new URLSearchParams();
    if (q) params.set('search', q);
    if (p > 0) params.set('page', p.toString());
    if (s && s !== 'all') params.set('status', s);
    if (o && o !== 'newest') params.set('sort', o);
    internalNavRef.current = true;
    const searchString = params.toString();
    const newUrl = `${window.location.pathname}${searchString ? '?' + searchString : ''}`;
    window.history.pushState(null, '', newUrl);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearch(searchVal);
    setPage(0);
    updateUrl(0, searchVal, status, sort);
    fetchCandidates(0, searchVal, sort, status, true);
  };

  const handlePageChange = (newPageIdx: number) => {
    setPage(newPageIdx);
    updateUrl(newPageIdx, activeSearch, status, sort);
    fetchCandidates(newPageIdx, activeSearch, sort, status, true);
  };

  const handleSortChange = (newSort: string) => {
    setSort(newSort);
    setPage(0);
    updateUrl(0, activeSearch, status, newSort);
    fetchCandidates(0, activeSearch, newSort, status, true);
  };

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    setPage(0);
    updateUrl(0, activeSearch, newStatus, sort);
    fetchCandidates(0, activeSearch, sort, newStatus, true);
  };

  const handleClearFilters = () => {
    setSearchVal('');
    setActiveSearch('');
    setStatus('all');
    setSort('newest');
    setPage(0);
    updateUrl(0, '', 'all', 'newest');
    fetchCandidates(0, '', 'newest', 'all', true);
  };

  const getProfile = (candidate: AdminCandidate): CandidateProfile | null => {
    if (!candidate.candidate_profiles) return null;
    if (Array.isArray(candidate.candidate_profiles)) {
      return candidate.candidate_profiles[0] || null;
    }
    return candidate.candidate_profiles;
  };

  const currentProfile = previewUser ? getProfile(previewUser) : null;

  const columns = useMemo<Column<AdminCandidate>[]>(() => [
    {
      header: (
        <input
          type="checkbox"
          checked={candidates.length > 0 && selectedIds.length === candidates.length}
          onChange={() => {
            if (selectedIds.length === candidates.length) {
              clearSelection();
            } else {
              candidates.forEach(c => {
                if (!selectedIds.includes(c.id)) toggleSelect(c.id);
              });
            }
          }}
          style={{ cursor: 'pointer', width: '16px', height: '16px' }}
        />
      ),
      key: 'selection',
      width: '40px',
      render: (candidate) => (
        <input
          type="checkbox"
          checked={selectedIds.includes(candidate.id)}
          onChange={() => toggleSelect(candidate.id)}
          onClick={(e) => e.stopPropagation()}
          style={{ cursor: 'pointer', width: '16px', height: '16px' }}
        />
      ),
      align: 'center'
    },
    {
      header: 'Candidate',
      key: 'name',
      render: (candidate) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 600, color: 'var(--tm-text-primary)' }}>{candidate.name || 'Anonymous user'}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--tm-text-secondary)' }}>{candidate.email}</span>
        </div>
      )
    },
    {
      header: 'Headline',
      key: 'headline',
      render: (candidate) => {
        const profile = getProfile(candidate);
        return <span>{profile?.headline || 'Profile incomplete'}</span>;
      }
    },
    {
      header: 'Location',
      key: 'location',
      render: (candidate) => <span>{candidate.location || 'Remote'}</span>
    },
    {
      header: 'Experience',
      key: 'experience_years',
      render: (candidate) => {
        const profile = getProfile(candidate);
        return <span>{profile?.experience_years ? `${profile.experience_years} years` : 'Entry'}</span>;
      }
    },
    {
      header: 'Strength',
      key: 'profile_strength',
      render: (candidate) => {
        const profile = getProfile(candidate);
        return <span>{profile?.profile_strength || 0}%</span>;
      }
    },
    {
      header: 'Status',
      key: 'status',
      render: (candidate) => <StatusPill status={candidate.status} />
    },
    {
      header: 'Active',
      key: 'is_active',
      render: (candidate) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: candidate.is_active ? '#10b981' : '#cbd5e1' }} />
          <span style={{ fontSize: '0.8rem', color: 'var(--tm-text-secondary)' }}>
            {candidate.is_active ? 'Active' : 'Deactivated'}
          </span>
        </span>
      )
    }
  ], [candidates, selectedIds, toggleSelect, clearSelection]);

  // Single candidate mutation (optimistic with rollback) using Edge Function PATCH with Idempotency
  const updateCandidateStatus = async (targetUser: AdminCandidate, payload: Partial<AdminCandidate>) => {
    const backupCandidates = [...candidates];
    
    // Optimistic UI update
    setCandidates(prev => prev.map(c => c.id === targetUser.id ? { ...c, ...payload } : c));
    if (previewUser?.id === targetUser.id) {
      setPreviewUser({ ...previewUser, ...payload });
    }

    try {
      await mutationQueue.enqueue(
        async (idemKey) => {
          const { error } = await invokeFunction('admin-candidates', {
            method: 'PATCH',
            path: `/${targetUser.id}`,
            body: payload,
            idempotencyKey: idemKey
          });
          
          if (error) throw new Error(error.message);
          fetchCandidates(page, activeSearch, sort, status, true);
        },
        () => {
          setCandidates(backupCandidates);
          if (previewUser?.id === targetUser.id) {
            setPreviewUser(targetUser);
          }
          alert('Update failed, rolled back changes.');
        },
        { key: `update_candidate_${targetUser.id}` }
      );
    } catch (err: any) {
      setError(err.message || 'Failed to update candidate status');
    }
  };

  // Selection telemetry tracker
  useEffect(() => {
    recordMetric('selection', selectedIds.length);
  }, [selectedIds]);

  // Bulk Actions Handlers
  const handleBulkClick = (action: string) => {
    let impactText = '';
    if (action === 'approve') impactText = `This will set the status of ${selectedIds.length} selected candidate(s) to Approved.`;
    if (action === 'reject') impactText = `This will set the status of ${selectedIds.length} selected candidate(s) to Rejected.`;
    if (action === 'activate') impactText = `This will enable platform login access for ${selectedIds.length} candidate(s).`;
    if (action === 'deactivate') impactText = `This will suspend platform login access for ${selectedIds.length} candidate(s).`;
    if (action === 'delete') impactText = `This will PERMANENTLY delete accounts and resumes for ${selectedIds.length} selected candidate(s). THIS IS IRREVERSIBLE.`;

    setBulkActionTarget({ action, impact: impactText });
  };

  const executeBulkAction = async () => {
    if (!bulkActionTarget) return;
    const { action } = bulkActionTarget;
    setBulkActionTarget(null);

    const backupCandidates = [...candidates];
    
    // Optimistic updates
    if (action === 'delete') {
      setCandidates(prev => prev.filter(c => !selectedIds.includes(c.id)));
      setPreviewUser(null);
    } else {
      setCandidates(prev => prev.map(c => {
        if (selectedIds.includes(c.id)) {
          if (action === 'approve') return { ...c, status: 'approved' as const };
          if (action === 'reject') return { ...c, status: 'rejected' as const };
          if (action === 'activate') return { ...c, is_active: true };
          if (action === 'deactivate') return { ...c, is_active: false };
        }
        return c;
      }));
    }

    const idsToMutate = [...selectedIds];
    clearSelection();

    if (action === 'delete') {
      // Delete runs immediately without undo window
      try {
        await mutationQueue.enqueue(
          async (idemKey) => {
            const { error } = await invokeFunction('admin-candidates', {
              method: 'POST',
              body: { action: 'bulk-delete', ids: idsToMutate },
              idempotencyKey: idemKey
            });
            if (error) throw new Error(error.message);

            recordMetric('bulk_action', idsToMutate.length);
            fetchCandidates(page, activeSearch, sort, status, true);
          },
          () => {
            setCandidates(backupCandidates);
            alert('Bulk delete failed, rolled back list changes.');
          },
          { key: `bulk_candidates_${action}` }
        );
      } catch (err: any) {
        setError(err.message || 'Bulk operation execution failed.');
      }
    } else {
      // Approve/Reject/Activate/Deactivate has a 30s Undo Window
      const expiresAt = Date.now() + 30 * 1000;
      window.sessionStorage.setItem('tm_pending_action_candidates', JSON.stringify({
        action,
        ids: idsToMutate,
        backup: backupCandidates,
        expiresAt
      }));
      setPendingAction({
        action,
        ids: idsToMutate,
        backup: backupCandidates,
        timeLeft: 30
      });
    }
  };

  // Server-side export (admin-export edge fn, doc 14 R-8): start the job, then poll for
  // completion. Runs against the full filtered dataset, not just the loaded page.
  const pollExportJob = useCallback((jobId: string) => {
    window.sessionStorage.setItem('tm_active_export_candidates_job_id', jobId);

    const poll = async () => {
      const { data, error } = await invokeFunction('admin-export', {
        method: 'POST',
        body: { action: 'status', jobId }
      });

      if (error || !data) {
        setExportProgress('Failed to check export status.');
        setExportLoading(false);
        window.sessionStorage.removeItem('tm_active_export_candidates_job_id');
        return;
      }

      if (data.state === 'done') {
        setExportProgress('Export complete! Triggering file download...');
        const a = document.createElement('a');
        a.href = data.downloadUrl;
        a.download = `candidates-export-${jobId}.csv`;
        a.click();
        setExportLoading(false);
        window.sessionStorage.removeItem('tm_active_export_candidates_job_id');
      } else if (data.state === 'failed') {
        alert(`Export job failed: ${data.error}`);
        setExportLoading(false);
        window.sessionStorage.removeItem('tm_active_export_candidates_job_id');
      } else {
        setExportProgress(`Exporting ${Math.round((data.progress || 0) * 100)}%...`);
        setTimeout(poll, 1500);
      }
    };

    poll();
  }, []);

  // Resume polling an export that was still running before a page reload.
  useEffect(() => {
    const activeJobId = window.sessionStorage.getItem('tm_active_export_candidates_job_id');
    if (!activeJobId || !user) return;
    setExportLoading(true);
    setExportProgress('Checking status of active export job...');
    pollExportJob(activeJobId);
  }, [user, pollExportJob]);

  const handleExport = async () => {
    setExportLoading(true);
    setExportProgress('Starting export...');
    try {
      const { data, error } = await invokeFunction('admin-export', {
        method: 'POST',
        body: { action: 'start', entity: 'candidates', filters: { search: activeSearch, status, sort } }
      });
      if (error || !data?.jobId) throw new Error(error?.message || 'Failed to start export');
      pollExportJob(data.jobId);
    } catch (err: any) {
      alert('Failed to start export: ' + err.message);
      setExportLoading(false);
    }
  };

  const handleDownload = async (url: string, filename: string, resumeId?: string) => {
    try {
      const token = window.sessionStorage.getItem('tm_token');
      let targetUrl = url;
      let resolvedResumeId = resumeId;
      if (!resolvedResumeId && url) {
        try {
          const decoded = decodeURIComponent(url);
          const parts = decoded.split('/');
          const lastPart = parts[parts.length - 1].split('?')[0];
          const potentialId = lastPart.split('_')[0];
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (uuidRegex.test(potentialId)) {
            resolvedResumeId = potentialId;
          }
        } catch (err) {
          console.error('Failed to parse resumeId from URL:', err);
        }
      }

      if (resolvedResumeId) {
        targetUrl = `${window.location.origin}/api/v1/remote/functions/resume-proxy?resumeId=${resolvedResumeId}&accessType=downloaded`;
      } else {
        const insforgeUrl = process.env.NEXT_PUBLIC_INSFORGE_URL || '';
        if (url.startsWith(insforgeUrl)) {
          targetUrl = url.replace(insforgeUrl, `${window.location.origin}/api/v1/remote`);
        }
      }

      const response = await fetch(targetUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to download document');
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Failed to download document:', err);
      window.open(url, '_blank');
    }
  };

  const handleView = async (url: string, resumeId?: string) => {
    try {
      const token = window.sessionStorage.getItem('tm_token');
      let targetUrl = url;
      let resolvedResumeId = resumeId;
      if (!resolvedResumeId && url) {
        try {
          const decoded = decodeURIComponent(url);
          const parts = decoded.split('/');
          const lastPart = parts[parts.length - 1].split('?')[0];
          const potentialId = lastPart.split('_')[0];
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (uuidRegex.test(potentialId)) {
            resolvedResumeId = potentialId;
          }
        } catch (err) {
          console.error('Failed to parse resumeId from URL:', err);
        }
      }

      if (resolvedResumeId) {
        targetUrl = `${window.location.origin}/api/v1/remote/functions/resume-proxy?resumeId=${resolvedResumeId}&accessType=viewed`;
      } else {
        const insforgeUrl = process.env.NEXT_PUBLIC_INSFORGE_URL || '';
        if (url.startsWith(insforgeUrl)) {
          targetUrl = url.replace(insforgeUrl, `${window.location.origin}/api/v1/remote`);
        }
      }

      const response = await fetch(targetUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to view document');
      const blob = await response.blob();

      let mimeType = blob.type;
      try {
        const buffer = await blob.slice(0, 4).arrayBuffer();
        const arr = new Uint8Array(buffer);
        if (arr[0] === 0x25 && arr[1] === 0x50 && arr[2] === 0x44 && arr[3] === 0x46) {
          mimeType = 'application/pdf';
        } else if (arr[0] === 0x89 && arr[1] === 0x50 && arr[2] === 0x4E && arr[3] === 0x47) {
          mimeType = 'image/png';
        } else if (arr[0] === 0xFF && arr[1] === 0xD8 && arr[2] === 0xFF) {
          mimeType = 'image/jpeg';
        }
      } catch {}

      const fileBlob = new Blob([blob], { type: mimeType });
      const blobUrl = window.URL.createObjectURL(fileBlob);
      window.open(blobUrl, '_blank');
    } catch (err) {
      window.open(url, '_blank');
    }
  };

  return (
    <section className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Candidate Directory</p>
          <h1 className={styles.title}>Candidates</h1>
          <p className={styles.subtitle}>Manage and verify candidate profiles on the platform.</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <strong style={{ fontSize: '1.5rem', display: 'block' }}>{totalCount}</strong>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Total Candidates</span>
        </div>
      </header>

      {/* Toolbar / Filters Row */}
      <div className={styles.toolbarRow}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', width: '100%' }}>
          <form className={styles.toolbar} style={{ flex: 1 }} onSubmit={handleSearchSubmit}>
            <input
              className={styles.searchInput}
              value={searchVal}
              onChange={(event) => setSearchVal(event.target.value)}
              placeholder="Search candidate by name, email..."
            />
            <button type="submit" className={styles.primaryButton}>Search</button>
          </form>
          {/* Filter Status */}
          <select
            className={styles.searchInput}
            style={{ maxWidth: '160px' }}
            value={status}
            onChange={e => handleStatusChange(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>

          {/* Sorting */}
          <select
            className={styles.searchInput}
            style={{ maxWidth: '160px' }}
            value={sort}
            onChange={e => handleSortChange(e.target.value)}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="name_asc">Name (A-Z)</option>
            <option value="name_desc">Name (Z-A)</option>
          </select>

          {hasExportPerm && (
            <button
              onClick={handleExport}
              disabled={exportLoading}
              className={styles.exportBtn}
            >
              {exportLoading ? 'Exporting...' : '↓ Export CSV'}
            </button>
          )}
        </div>
      </div>

      {exportLoading && (
        <div id="export-progress-banner" style={{ background: '#f8fafc', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '12px', marginBottom: '1.5rem', fontSize: '0.875rem', color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '14px', height: '14px', border: '2px solid rgba(59,130,246,0.3)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
          <span>{exportProgress}</span>
        </div>
      )}

      {error && <div className={styles.errorBanner}>{error}</div>}

      <DataTable
        columns={columns}
        data={candidates}
        loading={authLoading || loading}
        onRowClick={(row) => setPreviewUser(row)}
        emptyState={
          <div className={styles.emptyState}>
            <h3>No candidates found</h3>
            <p style={{ margin: '8px 0 16px', color: '#64748b' }}>No candidate profiles matched your active search criteria.</p>
            <button onClick={handleClearFilters} className={styles.primaryButton} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
              Clear Search & Filters
            </button>
          </div>
        }
      />

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button disabled={page === 0} onClick={() => handlePageChange(page - 1)} className={styles.pageButton}>Prev</button>
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              className={`${styles.pageButton} ${page === i ? styles.pageActive : ''}`}
              onClick={() => handlePageChange(i)}
            >
              {i + 1}
            </button>
          ))}
          <button disabled={page === totalPages - 1} onClick={() => handlePageChange(page + 1)} className={styles.pageButton}>Next</button>
        </div>
      )}

      {/* Detail Drawer Modal */}
      <DetailDrawer
        isOpen={!!previewUser}
        onClose={() => setPreviewUser(null)}
        title="Candidate Details"
      >
        {previewUser && (
          <div className={styles.drawerContent} style={{ padding: 0 }}>
            <div className={styles.statusToggle} style={{ display: 'grid', gap: '0.75rem', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#f8fafc' }}>
              <div>
                <strong>Account Access</strong>
                <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                  {previewUser.is_active ? 'Candidate can apply and browse jobs.' : 'Candidate access is currently restricted.'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  disabled={!hasEditPerm}
                  onClick={() => updateCandidateStatus(previewUser, { is_active: !previewUser.is_active })}
                  style={{
                    flex: 1,
                    padding: '0.6rem',
                    background: previewUser.is_active ? '#fee2e2' : '#dcfce7',
                    color: previewUser.is_active ? '#991b1b' : '#166534',
                    border: '1px solid',
                    borderColor: previewUser.is_active ? '#fca5a5' : '#86efac',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: hasEditPerm ? 'pointer' : 'not-allowed',
                    opacity: hasEditPerm ? 1 : 0.6,
                    fontSize: '0.85rem'
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'center', width: '100%' }}>
                    {previewUser.is_active ? <XCircle size={15} /> : <CheckCircle2 size={15} />}
                    {previewUser.is_active ? 'Deactivate' : 'Activate'}
                  </span>
                </button>
                <button
                  type="button"
                  disabled={!hasDeletePerm}
                  onClick={async () => {
                    if (window.confirm(`Are you absolutely sure you want to PERMANENTLY delete candidate ${previewUser.name}?\n\nThis will delete their auth account and database records.`)) {
                      try {
                        const { error: delError } = await invokeFunction('admin-candidates', {
                          method: 'DELETE',
                          queries: { id: previewUser.id }
                        });
                        if (delError) throw new Error(delError.message);
                        alert('Candidate deleted successfully');
                        setPreviewUser(null);
                        fetchCandidates(page, activeSearch, sort, status, true);
                      } catch (err: any) {
                        alert('Failed to delete: ' + err.message);
                      }
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '0.6rem',
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: hasDeletePerm ? 'pointer' : 'not-allowed',
                    opacity: hasDeletePerm ? 1 : 0.6,
                    fontSize: '0.85rem'
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'center', width: '100%' }}>
                    <Trash2 size={15} /> Permanent Delete
                  </span>
                </button>
              </div>
            </div>

            <section className={styles.profileSection}>
              <h4>Basic Information</h4>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div className={styles.initials} style={{ width: '64px', height: '64px', fontSize: '1.5rem' }}>
                  {previewUser.name ? previewUser.name[0].toUpperCase() : '?'}
                </div>
                <div>
                  <h3 style={{ margin: 0 }}>{previewUser.name}</h3>
                  <p style={{ margin: '4px 0 0', color: '#64748b' }}>{previewUser.email}</p>
                </div>
              </div>
            </section>

            <section className={styles.profileSection}>
              <h4>Professional Summary</h4>
              <p style={{ fontSize: '0.9rem', lineHeight: '1.6', color: '#334155' }}>
                {currentProfile?.headline || 'No summary provided.'}
              </p>
              <div className={styles.meta} style={{ marginTop: '1rem' }}>
                <span><MapPin size={14} /> {previewUser.location || 'Not specified'}</span>
                <span><Briefcase size={14} /> {currentProfile?.experience_years || '0'} years of experience</span>
              </div>
            </section>

            {currentProfile?.skills && currentProfile.skills.length > 0 && (
              <section className={styles.profileSection}>
                <h4>Skills</h4>
                <div className={styles.skills}>
                  {currentProfile.skills.map((s, i) => (
                    <span key={i} className={styles.skillTag}>{s}</span>
                  ))}
                </div>
              </section>
            )}

            <section className={styles.profileSection}>
              <h4>Links & Resume</h4>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {currentProfile?.resume_url && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      className={styles.primaryButton}
                      style={{ flex: 1, padding: '0.6rem', fontSize: '0.85rem', cursor: 'pointer' }}
                      onClick={() => handleView(currentProfile.resume_url!, currentProfile.primary_resume_id)}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'center', width: '100%' }}>
                        <FileText size={15} /> View Resume
                      </span>
                    </button>
                    <button
                      type="button"
                      className={styles.pageButton}
                      style={{ flex: 1, padding: '0.6rem', fontSize: '0.85rem', cursor: 'pointer' }}
                      onClick={() => handleDownload(currentProfile.resume_url!, 'candidate_resume.pdf', currentProfile.primary_resume_id)}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'center', width: '100%' }}>
                        <Download size={15} /> Download
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </section>

            <section className={styles.profileSection} style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem', marginTop: 'auto' }}>
              <h4>Account Approval</h4>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button 
                  disabled={!hasApprovePerm}
                  className={styles.primaryButton} 
                  style={{ flex: 1, background: previewUser.status === 'approved' ? '#f0fdf4' : '#10b981', color: previewUser.status === 'approved' ? '#166534' : 'white', border: previewUser.status === 'approved' ? '1px solid #bbf7d0' : 'none', cursor: hasApprovePerm ? 'pointer' : 'not-allowed', opacity: hasApprovePerm ? 1 : 0.6 }}
                  onClick={() => updateCandidateStatus(previewUser, { status: 'approved' })}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'center', width: '100%' }}>
                    <CheckCircle2 size={15} /> {previewUser.status === 'approved' ? 'Approved' : 'Approve Candidate'}
                  </span>
                </button>
                <button 
                  disabled={!hasApprovePerm}
                  className={styles.pageButton} 
                  style={{ flex: 1, color: previewUser.status === 'rejected' ? '#dc2626' : '#64748b', borderColor: previewUser.status === 'rejected' ? '#fecaca' : '#e2e8f0', background: previewUser.status === 'rejected' ? '#fef2f2' : 'white', cursor: hasApprovePerm ? 'pointer' : 'not-allowed', opacity: hasApprovePerm ? 1 : 0.6 }}
                  onClick={() => updateCandidateStatus(previewUser, { status: 'rejected' })}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'center', width: '100%' }}>
                    <XCircle size={15} /> {previewUser.status === 'rejected' ? 'Rejected' : 'Reject'}
                  </span>
                </button>
              </div>
            </section>
          </div>
        )}
      </DetailDrawer>

      {/* Floating Bulk Action Selection Bar */}
      {selectedIds.length > 0 && (
        <div className={styles.bulkBar}>
          <span className={styles.bulkCount}>{selectedIds.length} candidates selected</span>
          <div className={styles.bulkActions}>
            {hasApprovePerm && (
              <>
                <button className={styles.bulkBtn} onClick={() => handleBulkClick('approve')}>Approve</button>
                <button className={styles.bulkBtn} onClick={() => handleBulkClick('reject')}>Reject</button>
              </>
            )}
            {hasEditPerm && (
              <>
                <button className={styles.bulkBtn} onClick={() => handleBulkClick('activate')}>Activate</button>
                <button className={styles.bulkBtn} onClick={() => handleBulkClick('deactivate')}>Deactivate</button>
              </>
            )}
            {hasDeletePerm && (
              <button className={`${styles.bulkBtn} ${styles.bulkBtnDanger}`} onClick={() => handleBulkClick('delete')}>Delete</button>
            )}
            {hasExportPerm && (
              <button className={styles.bulkBtn} onClick={handleExport}>Export</button>
            )}
            <button className={styles.bulkBtn} style={{ background: '#475569' }} onClick={clearSelection}>Clear</button>
          </div>
        </div>
      )}

      {/* Floating Bulk Action Undo Banner */}
      {pendingAction && (
        <div className={styles.undoBanner}>
          <div className={styles.undoContent}>
            <span className={styles.undoIcon}>⏳</span>
            <span>
              Bulk <strong>{pendingAction.action}</strong> pending... {pendingAction.timeLeft}s remaining
            </span>
          </div>
          <button onClick={handleUndoPending} className={styles.undoButton}>
            Undo
          </button>
        </div>
      )}

      {/* Reusable Bulk Action Confirmation Modal */}
      <BulkConfirmModal
        isOpen={!!bulkActionTarget}
        onClose={() => setBulkActionTarget(null)}
        onConfirm={executeBulkAction}
        selectedCount={selectedIds.length}
        actionName={bulkActionTarget?.action || ''}
        impactText={bulkActionTarget?.impact || ''}
      />
    </section>
  );
}
