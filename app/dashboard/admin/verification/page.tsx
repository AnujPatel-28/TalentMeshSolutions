'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';
import { AdminHeader } from '../_components/AdminHeader';
import { AdminStatCard } from '../_components/AdminStatCard';
import { AdminButton } from '../_components/AdminForm';
import {
  VerificationDecisionModal,
  type QueueItem,
  type VerificationStatus,
} from './_components/VerificationDecisionModal';
import styles from './verification.module.css';
import toast from 'react-hot-toast';

// ─── Types ───────────────────────────────────────────────────────────────────

// Matches lib/api/pagination.ts formatPaginatedResponse — rows under `data`, counts under
// `pagination`. Not the flat { items, total, page, limit } shape doc 04 describes.
interface PaginatedResponse {
  data: QueueItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_LABELS: Record<VerificationStatus, string> = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
  needs_more_info: 'Needs More Info',
};

const STATUS_PILL_CLASS: Record<VerificationStatus, string> = {
  submitted: styles.statusSubmitted,
  under_review: styles.statusUnderReview,
  approved: styles.statusApproved,
  rejected: styles.statusRejected,
  needs_more_info: styles.statusNeedsMoreInfo,
};

function StatusPill({ status }: { status: VerificationStatus }) {
  return (
    <span className={`${styles.statusPill} ${STATUS_PILL_CLASS[status] ?? ''}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ─── Tab config ───────────────────────────────────────────────────────────────

type TabId = 'all' | VerificationStatus;

const TABS: { id: TabId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'submitted', label: 'Submitted' },
  { id: 'under_review', label: 'Under Review' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'needs_more_info', label: 'Needs More Info' },
];

// ─── Page ────────────────────────────────────────────────────────────────────

export default function VerificationQueuePage() {
  const router = useRouter();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);
  const [selectedRequest, setSelectedRequest] = useState<QueueItem | null>(null);

  // Stat counts (derived from the current full list of filtered items + separate totals)
  const [counts, setCounts] = useState({
    pending: 0,   // submitted + under_review
    approved: 0,
    rejected: 0,
    needsMoreInfo: 0,
  });

  // ─── Fetch ────────────────────────────────────────────────────────────────

  const fetchQueue = useCallback(async (targetPage: number, tab: TabId) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(targetPage) });
      if (tab !== 'all') params.set('status', tab);

      const res = await fetch(`/api/admin/verification/queue?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      const body: PaginatedResponse = await res.json();
      setItems(body.data ?? []);
      setTotal(body.pagination?.total ?? 0);
      setLimit(body.pagination?.limit ?? 20);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load verification queue.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch aggregate counts for the stat cards (always without status filter)
  const fetchCounts = useCallback(async () => {
    try {
      const [subRes, appRes, rejRes, nmiRes] = await Promise.all([
        fetch('/api/admin/verification/queue?page=1&status=submitted'),
        fetch('/api/admin/verification/queue?page=1&status=approved'),
        fetch('/api/admin/verification/queue?page=1&status=rejected'),
        fetch('/api/admin/verification/queue?page=1&status=needs_more_info'),
        // under_review is also "pending" but keep it simple: submitted is the primary state
      ]);

      const empty = { pagination: { total: 0 } };
      const [sub, app, rej, nmi] = await Promise.all([
        subRes.ok ? (subRes.json() as Promise<PaginatedResponse>) : Promise.resolve(empty),
        appRes.ok ? (appRes.json() as Promise<PaginatedResponse>) : Promise.resolve(empty),
        rejRes.ok ? (rejRes.json() as Promise<PaginatedResponse>) : Promise.resolve(empty),
        nmiRes.ok ? (nmiRes.json() as Promise<PaginatedResponse>) : Promise.resolve(empty),
      ]);

      setCounts({
        pending: (sub.pagination?.total ?? 0),
        approved: (app.pagination?.total ?? 0),
        rejected: (rej.pagination?.total ?? 0),
        needsMoreInfo: (nmi.pagination?.total ?? 0),
      });
    } catch {
      // Non-fatal — stat cards will just show stale values
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    setPage(1);
    fetchQueue(1, activeTab);
    fetchCounts();
  }, [activeTab, user, fetchQueue, fetchCounts]);

  // ─── Modal callbacks ──────────────────────────────────────────────────────

  /** Called on successful decision OR 409 (both remove the row and refresh). */
  const handleDecided = useCallback((id: string) => {
    setSelectedRequest(null);
    setItems((prev) => prev.filter((r) => r.id !== id));
    setTotal((prev) => Math.max(0, prev - 1));
    // Refresh counts in background
    fetchCounts();
    // Re-fetch the current page to fill any gap
    fetchQueue(page, activeTab);
  }, [page, activeTab, fetchCounts, fetchQueue]);

  // ─── Pagination ───────────────────────────────────────────────────────────

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const goToPage = (p: number) => {
    const next = Math.min(Math.max(1, p), totalPages);
    setPage(next);
    fetchQueue(next, activeTab);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <section className={styles.page}>
      <AdminHeader
        title="Verification Queue"
        eyebrow="Admin Portal"
        subtitle="Review company verification requests and record your decision."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard/admin' },
          { label: 'Verification Queue' },
        ]}
        actions={
          <AdminButton
            variant="secondary"
            onClick={() => router.push('/dashboard/admin')}
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            ← Back to Dashboard
          </AdminButton>
        }
      />

      {/* Error banner */}
      {error && (
        <div className={styles.errorBanner}>
          <span>{error}</span>
          <AdminButton
            onClick={() => fetchQueue(page, activeTab)}
            style={{ padding: '6px 12px', fontSize: '0.8rem', background: '#dc2626' }}
          >
            Retry
          </AdminButton>
        </div>
      )}

      {/* Stat cards */}
      <div className={styles.stats}>
        <AdminStatCard
          label="Pending (Submitted)"
          value={counts.pending}
          color="amber"
          onClick={() => setActiveTab('submitted')}
          isActive={activeTab === 'submitted'}
        />
        <AdminStatCard
          label="Approved"
          value={counts.approved}
          color="emerald"
          onClick={() => setActiveTab('approved')}
          isActive={activeTab === 'approved'}
        />
        <AdminStatCard
          label="Rejected"
          value={counts.rejected}
          color="rose"
          onClick={() => setActiveTab('rejected')}
          isActive={activeTab === 'rejected'}
        />
        <AdminStatCard
          label="Needs More Info"
          value={counts.needsMoreInfo}
          color="indigo"
          onClick={() => setActiveTab('needs_more_info')}
          isActive={activeTab === 'needs_more_info'}
        />
      </div>

      {/* Tabs */}
      <div className={styles.tabsContainer}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setError('');
            }}
            className={`${styles.tab} ${activeTab === tab.id ? styles.activeTab : ''}`}
            aria-selected={activeTab === tab.id}
            role="tab"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table panel */}
      <div className={styles.panel}>
        <div className={styles.tableContainer}>
          {loading ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyStateContainer}>
                <div className={styles.loadingSpinner} />
                <span>Loading verification queue…</span>
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className={styles.emptyState} role="status">
              No {activeTab === 'all' ? '' : STATUS_LABELS[activeTab as VerificationStatus] + ' '}
              verification requests found.
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Company</th>
                  <th className={styles.th}>GSTIN</th>
                  <th className={styles.th}>Channel</th>
                  <th className={styles.th}>Submitted</th>
                  <th className={styles.th}>Status</th>
                  <th className={`${styles.th} ${styles.actionsCell}`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className={styles.tr}
                    onClick={() => setSelectedRequest(item)}
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setSelectedRequest(item)}
                  >
                    <td className={styles.td}>
                      <span className={styles.companyName}>
                        {item.companies?.name ?? '(unknown)'}
                      </span>
                    </td>
                    <td className={styles.td}>
                      <span className={styles.companyGstin}>
                        {item.companies?.gstin ?? '—'}
                      </span>
                    </td>
                    <td className={styles.td}>
                      <span className={styles.metaText} style={{ textTransform: 'capitalize' }}>
                        {(item.channel ?? '—').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className={styles.td}>
                      <span className={styles.metaText}>
                        {new Date(item.created_at).toLocaleDateString('en-IN')}
                      </span>
                    </td>
                    <td className={styles.td}>
                      <StatusPill status={item.status} />
                    </td>
                    <td
                      className={`${styles.td} ${styles.actionsCell}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className={styles.actionGroup}>
                        <AdminButton
                          variant="secondary"
                          onClick={() => setSelectedRequest(item)}
                          style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                          id={`review-btn-${item.id}`}
                        >
                          {item.status === 'submitted' || item.status === 'under_review'
                            ? 'Review'
                            : 'View'}
                        </AdminButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {!loading && total > limit && (
          <div className={styles.pagination}>
            <span className={styles.paginationInfo}>
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
            </span>
            <div className={styles.paginationActions}>
              <AdminButton
                variant="secondary"
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                style={{ padding: '6px 14px', fontSize: '0.85rem' }}
              >
                ← Prev
              </AdminButton>
              <AdminButton
                variant="secondary"
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
                style={{ padding: '6px 14px', fontSize: '0.85rem' }}
              >
                Next →
              </AdminButton>
            </div>
          </div>
        )}
      </div>

      {/* Decision modal */}
      {selectedRequest && (
        <VerificationDecisionModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onDecided={handleDecided}
        />
      )}
    </section>
  );
}
