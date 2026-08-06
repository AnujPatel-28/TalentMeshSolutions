'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { invokeFunction } from '@/lib/insforge';
import { useSelection } from '@/hooks/useSelection';
import { mutationQueue } from '@/lib/mutationQueue';
import { recordMetric, startTrace, endTrace } from '@/lib/observability';

export type CompanyMember = {
  id: string;
  status: 'invited' | 'active' | 'suspended' | 'removed';
  member_role: 'admin' | 'recruiter' | 'coordinator';
  company_id: string;
  joined_at: string | null;
  companies: { id: string; name: string; gstin: string | null; status: string } | null;
};

export type RecruiterProfileFields = {
  job_title?: string | null;
  about?: string | null;
  is_approved?: boolean | null;
  document_url?: string | null;
  kyc_document_url?: string | null;
  pan_number?: string | null;
  aadhaar_number?: string | null;
};

export type AdminRecruiter = {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  is_active: boolean;
  created_at: string;
  company_members: CompanyMember[] | null;
  recruiter_profiles: RecruiterProfileFields | RecruiterProfileFields[] | null;
};

export function getRecruiterProfile(recruiter: AdminRecruiter): RecruiterProfileFields | null {
  if (!recruiter.recruiter_profiles) return null;
  return Array.isArray(recruiter.recruiter_profiles) ? recruiter.recruiter_profiles[0] || null : recruiter.recruiter_profiles;
}

// A recruiter can have at most one non-`removed` membership (company_members_one_active_per_user).
export function getMembership(recruiter: AdminRecruiter): CompanyMember | null {
  const members = recruiter.company_members || [];
  return members.find((m) => m.status !== 'removed') || null;
}

export function useAdminRecruiters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlSearch = searchParams.get('search') || '';
  const urlMembershipStatus = searchParams.get('membership_status') || 'all';
  const urlPage = parseInt(searchParams.get('page') || '0');
  const urlSort = searchParams.get('sort') || 'newest';

  const [recruiters, setRecruiters] = useState<AdminRecruiter[]>([]);
  const [searchVal, setSearchVal] = useState(urlSearch);
  const [activeSearch, setActiveSearch] = useState(urlSearch);
  const [membershipStatus, setMembershipStatus] = useState(urlMembershipStatus);
  const [sort, setSort] = useState(urlSort);
  const [page, setPage] = useState(urlPage);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const totalPages = Math.ceil(totalCount / 25);

  const [bulkActionTarget, setBulkActionTarget] = useState<{ action: string; impact: string } | null>(null);
  const [pendingAction, setPendingAction] = useState<{ action: string; ids: string[]; backup: AdminRecruiter[]; timeLeft: number } | null>(null);
  const pendingActionTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [exportLoading, setExportLoading] = useState(false);
  const [exportProgress, setExportProgress] = useState('');

  const filterDeps = useMemo(() => [activeSearch, membershipStatus, sort], [activeSearch, membershipStatus, sort]);
  const { selectedIds, toggleSelect, clearSelection } = useSelection(filterDeps);

  const abortControllerRef = useRef<AbortController | null>(null);
  const lastFetchParamsRef = useRef<string>('');
  const internalNavRef = useRef(false);

  const fetchRecruiters = useCallback(async (p = page, q = activeSearch, ms = membershipStatus, o = sort, force = false) => {
    const fetchKey = `${p}-${q}-${ms}-${o}`;
    if (!force && lastFetchParamsRef.current === fetchKey) return;
    lastFetchParamsRef.current = fetchKey;

    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError('');
    const trace = startTrace('admin-recruiters');
    try {
      const { data, error: fetchError } = await invokeFunction('admin-recruiters', {
        method: 'GET',
        queries: {
          search: q || undefined,
          membership_status: ms !== 'all' ? ms : undefined,
          page: p.toString(),
          limit: '25',
          sort: o,
        },
        signal: controller.signal,
      });
      if (fetchError) throw new Error(fetchError.message);
      if (data) {
        setRecruiters(data.recruiters || []);
        setTotalCount(data.total || 0);
        endTrace(trace, 'success');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError('Failed to load recruiters');
        endTrace(trace, 'error', err.message);
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [page, activeSearch, membershipStatus, sort]);

  useEffect(() => {
    if (internalNavRef.current) {
      internalNavRef.current = false;
      return;
    }
    const q = searchParams.get('search') || '';
    const p = parseInt(searchParams.get('page') || '0');
    const ms = searchParams.get('membership_status') || 'all';
    const o = searchParams.get('sort') || 'newest';
    setPage(p);
    setActiveSearch(q);
    setSearchVal(q);
    setMembershipStatus(ms);
    setSort(o);
    fetchRecruiters(p, q, ms, o);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const updateUrl = (p: number, q: string, ms: string, o: string) => {
    const params = new URLSearchParams();
    if (q) params.set('search', q);
    if (p > 0) params.set('page', p.toString());
    if (ms && ms !== 'all') params.set('membership_status', ms);
    if (o && o !== 'newest') params.set('sort', o);
    internalNavRef.current = true;
    const searchString = params.toString();
    window.history.pushState(null, '', `${window.location.pathname}${searchString ? '?' + searchString : ''}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearch(searchVal);
    setPage(0);
    updateUrl(0, searchVal, membershipStatus, sort);
    fetchRecruiters(0, searchVal, membershipStatus, sort, true);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    updateUrl(newPage, activeSearch, membershipStatus, sort);
    fetchRecruiters(newPage, activeSearch, membershipStatus, sort, true);
  };

  const handleSortChange = (newSort: string) => {
    setSort(newSort);
    setPage(0);
    updateUrl(0, activeSearch, membershipStatus, newSort);
    fetchRecruiters(0, activeSearch, membershipStatus, newSort, true);
  };

  const handleMembershipStatusFilterChange = (newStatus: string) => {
    setMembershipStatus(newStatus);
    setPage(0);
    updateUrl(0, activeSearch, newStatus, sort);
    fetchRecruiters(0, activeSearch, newStatus, sort, true);
  };

  const handleClearFilters = () => {
    setSearchVal('');
    setActiveSearch('');
    setMembershipStatus('all');
    setSort('newest');
    setPage(0);
    updateUrl(0, '', 'all', 'newest');
    fetchRecruiters(0, '', 'all', 'newest', true);
  };

  const refresh = useCallback(() => fetchRecruiters(page, activeSearch, membershipStatus, sort, true), [fetchRecruiters, page, activeSearch, membershipStatus, sort]);

  const commitPendingAction = useCallback(async (action: string, ids: string[], backup: AdminRecruiter[]) => {
    window.sessionStorage.removeItem('tm_pending_action_recruiters');
    try {
      await mutationQueue.enqueue(
        async (idemKey) => {
          const { error } = await invokeFunction('admin-recruiters', {
            method: 'POST',
            body: { action: 'bulk-active', ids, is_active: action === 'activate' },
            idempotencyKey: idemKey,
          });
          if (error) throw new Error(error.message);
          recordMetric('bulk_action', ids.length);
          fetchRecruiters(page, activeSearch, membershipStatus, sort, true);
        },
        () => {
          setRecruiters(backup);
          alert('Bulk operation failed, rolled back changes.');
        },
        { key: `bulk_recruiters_${action}_${Date.now()}` }
      );
    } catch (err: any) {
      setError(err.message || 'Bulk operation execution failed.');
    }
  }, [page, activeSearch, membershipStatus, sort, fetchRecruiters]);

  useEffect(() => {
    const stored = window.sessionStorage.getItem('tm_pending_action_recruiters');
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      const timeLeft = Math.ceil((parsed.expiresAt - Date.now()) / 1000);
      if (timeLeft <= 0) {
        commitPendingAction(parsed.action, parsed.ids, parsed.backup);
        window.sessionStorage.removeItem('tm_pending_action_recruiters');
      } else {
        setPendingAction({ action: parsed.action, ids: parsed.ids, backup: parsed.backup, timeLeft });
      }
    } catch {
      window.sessionStorage.removeItem('tm_pending_action_recruiters');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!pendingAction) return;
    pendingActionTimerRef.current = setInterval(() => {
      setPendingAction((prev) => {
        if (!prev) return null;
        if (prev.timeLeft <= 1) {
          commitPendingAction(prev.action, prev.ids, prev.backup);
          return null;
        }
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);
    return () => {
      if (pendingActionTimerRef.current) clearInterval(pendingActionTimerRef.current);
    };
  }, [pendingAction, commitPendingAction]);

  const handleUndoPending = () => {
    if (pendingActionTimerRef.current) clearInterval(pendingActionTimerRef.current);
    if (pendingAction) setRecruiters(pendingAction.backup);
    setPendingAction(null);
    window.sessionStorage.removeItem('tm_pending_action_recruiters');
  };

  const handleBulkClick = (action: 'activate' | 'deactivate' | 'delete') => {
    const impact =
      action === 'activate' ? `This will restore access for ${selectedIds.length} recruiter(s).` :
      action === 'deactivate' ? `This will suspend access for ${selectedIds.length} recruiter(s).` :
      `This will PERMANENTLY delete accounts for ${selectedIds.length} selected recruiter(s). THIS IS IRREVERSIBLE.`;
    setBulkActionTarget({ action, impact });
  };

  const executeBulkAction = async () => {
    if (!bulkActionTarget) return;
    const { action } = bulkActionTarget;
    setBulkActionTarget(null);

    const backup = [...recruiters];
    if (action === 'delete') {
      setRecruiters((prev) => prev.filter((r) => !selectedIds.includes(r.id)));
    } else {
      setRecruiters((prev) => prev.map((r) => (selectedIds.includes(r.id) ? { ...r, is_active: action === 'activate' } : r)));
    }

    const idsToMutate = [...selectedIds];
    clearSelection();

    if (action === 'delete') {
      try {
        await mutationQueue.enqueue(
          async (idemKey) => {
            const { error } = await invokeFunction('admin-recruiters', {
              method: 'POST',
              body: { action: 'bulk-delete', ids: idsToMutate },
              idempotencyKey: idemKey,
            });
            if (error) throw new Error(error.message);
            recordMetric('bulk_action', idsToMutate.length);
            fetchRecruiters(page, activeSearch, membershipStatus, sort, true);
          },
          () => {
            setRecruiters(backup);
            alert('Bulk delete failed, rolled back list changes.');
          },
          { key: `bulk_recruiters_${action}` }
        );
      } catch (err: any) {
        setError(err.message || 'Bulk operation execution failed.');
      }
      return;
    }

    const expiresAt = Date.now() + 30 * 1000;
    window.sessionStorage.setItem('tm_pending_action_recruiters', JSON.stringify({ action, ids: idsToMutate, backup, expiresAt }));
    setPendingAction({ action, ids: idsToMutate, backup, timeLeft: 30 });
  };

  const pollExportJob = useCallback((jobId: string) => {
    window.sessionStorage.setItem('tm_active_export_recruiters_job_id', jobId);
    const poll = async () => {
      const { data, error } = await invokeFunction('admin-export', { method: 'POST', body: { action: 'status', jobId } });
      if (error || !data) {
        setExportProgress('Failed to check export status.');
        setExportLoading(false);
        window.sessionStorage.removeItem('tm_active_export_recruiters_job_id');
        return;
      }
      if (data.state === 'done') {
        setExportProgress('Export complete! Triggering file download...');
        const a = document.createElement('a');
        a.href = data.downloadUrl;
        a.download = `recruiters-export-${jobId}.csv`;
        a.click();
        setExportLoading(false);
        window.sessionStorage.removeItem('tm_active_export_recruiters_job_id');
      } else if (data.state === 'failed') {
        alert(`Export job failed: ${data.error}`);
        setExportLoading(false);
        window.sessionStorage.removeItem('tm_active_export_recruiters_job_id');
      } else {
        setExportProgress(`Exporting ${Math.round((data.progress || 0) * 100)}%...`);
        setTimeout(poll, 1500);
      }
    };
    poll();
  }, []);

  useEffect(() => {
    const activeJobId = window.sessionStorage.getItem('tm_active_export_recruiters_job_id');
    if (!activeJobId) return;
    setExportLoading(true);
    setExportProgress('Checking status of active export job...');
    pollExportJob(activeJobId);
  }, [pollExportJob]);

  const handleExport = async () => {
    setExportLoading(true);
    setExportProgress('Starting export...');
    try {
      const { data, error } = await invokeFunction('admin-export', {
        method: 'POST',
        body: { action: 'start', entity: 'recruiters', filters: { search: activeSearch, membership_status: membershipStatus, sort } },
      });
      if (error || !data?.jobId) throw new Error(error?.message || 'Failed to start export');
      pollExportJob(data.jobId);
    } catch (err: any) {
      alert('Failed to start export: ' + err.message);
      setExportLoading(false);
    }
  };

  return {
    recruiters, loading, error, totalCount, totalPages, page,
    searchVal, setSearchVal, activeSearch, membershipStatus, sort,
    selectedIds, toggleSelect, clearSelection,
    bulkActionTarget, setBulkActionTarget, pendingAction, handleUndoPending,
    exportLoading, exportProgress, handleExport,
    handleSearchSubmit, handlePageChange, handleSortChange, handleMembershipStatusFilterChange, handleClearFilters,
    handleBulkClick, executeBulkAction, refresh,
  };
}
