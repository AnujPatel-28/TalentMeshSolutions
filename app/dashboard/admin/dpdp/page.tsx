'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';
import { AdminHeader } from '../_components/AdminHeader';
import { AdminStatCard } from '../_components/AdminStatCard';
import { AdminButton } from '../_components/AdminForm';
// Reused rather than duplicated — same table/pill/pagination look as the verification queue
// (doc 26 §4 L-4 admin queue, same visual family as app/dashboard/admin/verification).
import styles from '../verification/verification.module.css';
import toast from 'react-hot-toast';

type DpdpKind = 'access' | 'correction' | 'erasure' | 'grievance';
type DpdpStatus = 'open' | 'in_progress' | 'completed' | 'rejected';

interface DpdpRequestRow {
  id: string;
  user_id: string | null;
  email: string;
  kind: DpdpKind;
  status: DpdpStatus;
  details: string | null;
  response_notes: string | null;
  due_at: string;
  created_at: string;
  completed_at: string | null;
}

interface PaginatedResponse {
  data: DpdpRequestRow[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

const STATUS_LABELS: Record<DpdpStatus, string> = {
  open: 'Open', in_progress: 'In Progress', completed: 'Completed', rejected: 'Rejected',
};
const STATUS_PILL_CLASS: Record<DpdpStatus, string> = {
  open: styles.statusSubmitted,
  in_progress: styles.statusUnderReview,
  completed: styles.statusApproved,
  rejected: styles.statusRejected,
};

function StatusPill({ status }: { status: DpdpStatus }) {
  return <span className={`${styles.statusPill} ${STATUS_PILL_CLASS[status] ?? ''}`}>{STATUS_LABELS[status] ?? status}</span>;
}

type TabId = 'all' | DpdpStatus;
const TABS: { id: TabId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'completed', label: 'Completed' },
  { id: 'rejected', label: 'Rejected' },
];

export default function DpdpQueuePage() {
  const router = useRouter();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [items, setItems] = useState<DpdpRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [counts, setCounts] = useState({ open: 0, in_progress: 0, completed: 0, rejected: 0 });

  const fetchQueue = useCallback(async (targetPage: number, tab: TabId) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(targetPage) });
      if (tab !== 'all') params.set('status', tab);
      const res = await fetch(`/api/admin/dpdp/queue?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      const body: PaginatedResponse = await res.json();
      setItems(body.data ?? []);
      setTotal(body.pagination?.total ?? 0);
      setLimit(body.pagination?.limit ?? 20);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load DPDP request queue.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCounts = useCallback(async () => {
    try {
      const statuses: DpdpStatus[] = ['open', 'in_progress', 'completed', 'rejected'];
      const results = await Promise.all(
        statuses.map((s) => fetch(`/api/admin/dpdp/queue?page=1&status=${s}`).then((r) => (r.ok ? r.json() : { pagination: { total: 0 } })))
      );
      setCounts({
        open: results[0].pagination?.total ?? 0,
        in_progress: results[1].pagination?.total ?? 0,
        completed: results[2].pagination?.total ?? 0,
        rejected: results[3].pagination?.total ?? 0,
      });
    } catch {
      // Non-fatal — stat cards just show stale values
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    setPage(1);
    fetchQueue(1, activeTab);
    fetchCounts();
  }, [activeTab, user, fetchQueue, fetchCounts]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const goToPage = (p: number) => {
    const next = Math.min(Math.max(1, p), totalPages);
    setPage(next);
    fetchQueue(next, activeTab);
  };

  async function decide(item: DpdpRequestRow, decision: 'in_progress' | 'completed' | 'rejected') {
    if (decision === 'completed' && item.kind === 'erasure') {
      if (!window.confirm(`This will permanently anonymise ${item.email}'s profile and delete their résumé files. This cannot be undone. Continue?`)) {
        return;
      }
    }
    const notes = decision === 'rejected' ? window.prompt('Reason for rejecting this request (shown to the requester):') ?? undefined : undefined;
    if (decision === 'rejected' && notes === undefined) return; // cancelled

    setActingOn(item.id);
    try {
      const res = await fetch('/api/admin/dpdp/decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: item.id, decision, notes }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message || body?.error || `HTTP ${res.status}`);
      toast.success(`Request marked ${STATUS_LABELS[decision]}.`);
      fetchCounts();
      fetchQueue(page, activeTab);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to record decision.');
    } finally {
      setActingOn(null);
    }
  }

  return (
    <section className={styles.page}>
      <AdminHeader
        title="Data Principal Requests"
        eyebrow="Admin Portal"
        subtitle="Action access, correction, and erasure requests raised under DPDP (doc 26 §4 L-4)."
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard/admin' }, { label: 'DPDP Requests' }]}
        actions={
          <AdminButton variant="secondary" onClick={() => router.push('/dashboard/admin')} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
            ← Back to Dashboard
          </AdminButton>
        }
      />

      {error && (
        <div className={styles.errorBanner}>
          <span>{error}</span>
          <AdminButton onClick={() => fetchQueue(page, activeTab)} style={{ padding: '6px 12px', fontSize: '0.8rem', background: '#dc2626' }}>Retry</AdminButton>
        </div>
      )}

      <div className={styles.stats}>
        <AdminStatCard label="Open" value={counts.open} color="amber" onClick={() => setActiveTab('open')} isActive={activeTab === 'open'} />
        <AdminStatCard label="In Progress" value={counts.in_progress} color="indigo" onClick={() => setActiveTab('in_progress')} isActive={activeTab === 'in_progress'} />
        <AdminStatCard label="Completed" value={counts.completed} color="emerald" onClick={() => setActiveTab('completed')} isActive={activeTab === 'completed'} />
        <AdminStatCard label="Rejected" value={counts.rejected} color="rose" onClick={() => setActiveTab('rejected')} isActive={activeTab === 'rejected'} />
      </div>

      <div className={styles.tabsContainer}>
        {TABS.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`${styles.tab} ${activeTab === tab.id ? styles.activeTab : ''}`} aria-selected={activeTab === tab.id} role="tab">
            {tab.label}
          </button>
        ))}
      </div>

      <div className={styles.panel}>
        <div className={styles.tableContainer}>
          {loading ? (
            <div className={styles.emptyState}><div className={styles.emptyStateContainer}><div className={styles.loadingSpinner} /><span>Loading requests…</span></div></div>
          ) : items.length === 0 ? (
            <div className={styles.emptyState} role="status">No {activeTab === 'all' ? '' : STATUS_LABELS[activeTab as DpdpStatus] + ' '}requests found.</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Requester</th>
                  <th className={styles.th}>Type</th>
                  <th className={styles.th}>Details</th>
                  <th className={styles.th}>Due</th>
                  <th className={styles.th}>Status</th>
                  <th className={`${styles.th} ${styles.actionsCell}`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const overdue = item.status !== 'completed' && item.status !== 'rejected' && new Date(item.due_at) < new Date();
                  return (
                    <tr key={item.id} className={styles.tr}>
                      <td className={styles.td}><span className={styles.companyName}>{item.email}</span></td>
                      <td className={styles.td}><span className={styles.metaText} style={{ textTransform: 'capitalize' }}>{item.kind}</span></td>
                      <td className={styles.td}><span className={styles.metaText}>{item.details || '—'}</span></td>
                      <td className={styles.td}>
                        <span className={styles.metaText} style={overdue ? { color: '#e11d48', fontWeight: 700 } : undefined}>
                          {new Date(item.due_at).toLocaleDateString('en-IN')}{overdue ? ' (overdue)' : ''}
                        </span>
                      </td>
                      <td className={styles.td}><StatusPill status={item.status} /></td>
                      <td className={`${styles.td} ${styles.actionsCell}`}>
                        <div className={styles.actionGroup}>
                          {item.status === 'open' && (
                            <AdminButton variant="secondary" disabled={actingOn === item.id} onClick={() => decide(item, 'in_progress')} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Start</AdminButton>
                          )}
                          {(item.status === 'open' || item.status === 'in_progress') && (
                            <>
                              <AdminButton disabled={actingOn === item.id} onClick={() => decide(item, 'completed')} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Complete</AdminButton>
                              <AdminButton variant="danger" disabled={actingOn === item.id} onClick={() => decide(item, 'rejected')} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Reject</AdminButton>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {!loading && total > limit && (
          <div className={styles.pagination}>
            <span className={styles.paginationInfo}>Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}</span>
            <div className={styles.paginationActions}>
              <AdminButton variant="secondary" onClick={() => goToPage(page - 1)} disabled={page <= 1} style={{ padding: '6px 14px', fontSize: '0.85rem' }}>← Prev</AdminButton>
              <AdminButton variant="secondary" onClick={() => goToPage(page + 1)} disabled={page >= totalPages} style={{ padding: '6px 14px', fontSize: '0.85rem' }}>Next →</AdminButton>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
