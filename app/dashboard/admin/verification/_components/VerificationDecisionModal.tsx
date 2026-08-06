'use client';

import React, { useRef, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { AdminButton, AdminTextArea } from '../../_components/AdminForm';
import styles from '../verification.module.css';

export type VerificationStatus =
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'needs_more_info';

export type Decision = 'approved' | 'rejected' | 'needs_more_info';

export interface QueueItem {
  id: string;
  company_id: string;
  submitted_by: string;
  channel: string;
  status: VerificationStatus;
  kyc_documents?: { label: string; ref: string }[] | null;
  review_notes?: string | null;
  created_at: string;
  decided_at?: string | null;
  companies?: {
    name?: string | null;
    gstin?: string | null;
    website?: string | null;
    status?: string | null;
  } | null;
}

interface Props {
  request: QueueItem;
  onClose: () => void;
  /** Called after a successful decision OR a 409 (both cases: remove/refresh the row). */
  onDecided: (id: string) => void;
}

const NOTES_REQUIRED: Decision[] = ['rejected', 'needs_more_info'];

export function VerificationDecisionModal({ request, onClose, onDecided }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [notes, setNotes] = useState(request.review_notes ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [inlineError, setInlineError] = useState('');

  // ESC to close + initial focus
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    setTimeout(() => closeRef.current?.focus(), 50);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const handleDecide = async (decision: Decision) => {
    setInlineError('');

    // Client-side notes guard for reject / needs_more_info
    if (NOTES_REQUIRED.includes(decision) && !notes.trim()) {
      setInlineError('Notes are required when rejecting or requesting more information.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/verification/decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id: request.id,
          decision,
          notes: notes.trim() || undefined,
        }),
      });

      if (res.status === 409) {
        toast('This request was already decided by another admin. Refreshing…', { icon: '⚠️' });
        onDecided(request.id);
        return;
      }

      if (res.status === 403) {
        setInlineError("You don't have permission to decide this request.");
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = body?.message || body?.error || 'Failed to record decision.';
        setInlineError(msg);
        toast.error(msg);
        return;
      }

      const label =
        decision === 'approved'
          ? 'approved'
          : decision === 'rejected'
          ? 'rejected'
          : 'sent back for more info';
      toast.success(`Verification request ${label}.`);
      onDecided(request.id);
    } catch {
      const msg = 'Network error. Please try again.';
      setInlineError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const companyName = request.companies?.name ?? '(unknown company)';
  const gstin = request.companies?.gstin ?? '—';
  const website = request.companies?.website ?? '—';
  const channel = request.channel ?? '—';
  const submitted = new Date(request.created_at).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const isPending = request.status === 'submitted' || request.status === 'under_review';

  return (
    <div
      className={styles.modalOverlay}
      onClick={onClose}
      role="presentation"
    >
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="vdm-title"
      >
        {/* Header */}
        <div className={styles.modalHeader}>
          <div>
            <span className={styles.modalTitleText}>Verification Review</span>
            <h2 className={styles.modalTitle} id="vdm-title">
              {companyName}
            </h2>
          </div>
          <button
            ref={closeRef}
            className={styles.modalClose}
            onClick={onClose}
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className={styles.modalBody}>
          {/* Company metadata */}
          <div className={styles.metaGrid}>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Company</span>
              <span className={styles.metaVal}>{companyName}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>GSTIN</span>
              <span className={styles.metaVal} style={{ fontFamily: 'monospace' }}>
                {gstin}
              </span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Channel</span>
              <span className={styles.metaVal} style={{ textTransform: 'capitalize' }}>
                {channel.replace(/_/g, ' ')}
              </span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Submitted</span>
              <span className={styles.metaVal}>{submitted}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Website</span>
              <span className={styles.metaVal}>
                {website !== '—' ? (
                  <a
                    href={website}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#2563eb', textDecoration: 'none' }}
                  >
                    {website}
                  </a>
                ) : (
                  '—'
                )}
              </span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Current Status</span>
              <span className={styles.metaVal} style={{ textTransform: 'capitalize' }}>
                {request.status.replace(/_/g, ' ')}
              </span>
            </div>
          </div>

          {/* Decision section — only shown for pending requests */}
          {isPending && (
            <div className={styles.decisionSection}>
              <p className={styles.decisionLabel}>Decision</p>

              <AdminTextArea
                label="Notes (required for Reject / Needs More Info)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter review notes, reason for rejection, or information requested…"
                rows={4}
                disabled={submitting}
              />

              {inlineError && (
                <div className={styles.inlineError} role="alert">
                  {inlineError}
                </div>
              )}

              <div className={styles.decisionButtons}>
                <AdminButton
                  onClick={() => handleDecide('approved')}
                  isLoading={submitting}
                  disabled={submitting}
                  style={{ background: '#059669', color: '#fff', border: 'none' }}
                  id="vdm-approve"
                >
                  Approve
                </AdminButton>
                <AdminButton
                  onClick={() => handleDecide('needs_more_info')}
                  isLoading={submitting}
                  disabled={submitting}
                  style={{ background: '#7c3aed', color: '#fff', border: 'none' }}
                  id="vdm-needs-more-info"
                >
                  Needs More Info
                </AdminButton>
                <AdminButton
                  variant="danger"
                  onClick={() => handleDecide('rejected')}
                  isLoading={submitting}
                  disabled={submitting}
                  id="vdm-reject"
                >
                  Reject
                </AdminButton>
              </div>
            </div>
          )}

          {/* Read-only view for already-decided requests */}
          {!isPending && request.review_notes && (
            <div className={styles.decisionSection}>
              <p className={styles.decisionLabel}>Review Notes</p>
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '1rem',
                  fontSize: '0.9rem',
                  color: '#334155',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {request.review_notes}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.modalFooter}>
          <AdminButton variant="secondary" onClick={onClose} disabled={submitting}>
            {isPending ? 'Cancel' : 'Close'}
          </AdminButton>
        </div>
      </div>
    </div>
  );
}
