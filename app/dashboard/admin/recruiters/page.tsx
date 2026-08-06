'use client';

import { useMemo, useState } from 'react';
import styles from '../candidates/candidates.module.css';
import { useAuth } from '@/lib/auth/AuthContext';
import { AdminButton } from '../_components/AdminForm';
import { BulkConfirmModal } from '../_components/BulkConfirmModal';
import { RecruiterRegisterForm } from '../_components/RecruiterRegisterForm';
import { canPerform, Role } from '@/lib/permissions';
import DataTable, { Column } from '@/components/dashboard/DataTable';
import StatusPill from '@/components/dashboard/StatusPill';
import { RecruiterDetailDrawer } from './_components/RecruiterDetailDrawer';
import { useAdminRecruiters, getMembership, type AdminRecruiter } from './lib/hooks/useAdminRecruiters';

export default function AdminRecruitersPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [previewUser, setPreviewUser] = useState<AdminRecruiter | null>(null);
  const [showRecruiterRegister, setShowRecruiterRegister] = useState(false);

  const hasEditPerm = user?.role ? canPerform(user.role as Role, 'recruiters', 'edit') : false;
  const hasDeletePerm = user?.role ? canPerform(user.role as Role, 'recruiters', 'delete') : false;
  const hasExportPerm = user?.role ? canPerform(user.role as Role, 'recruiters', 'export') : false;

  const {
    recruiters, loading, error, totalPages, page,
    searchVal, setSearchVal, membershipStatus, sort,
    selectedIds, toggleSelect, clearSelection,
    bulkActionTarget, setBulkActionTarget, pendingAction, handleUndoPending,
    exportLoading, exportProgress, handleExport,
    handleSearchSubmit, handlePageChange, handleSortChange, handleMembershipStatusFilterChange, handleClearFilters,
    handleBulkClick, executeBulkAction, refresh,
  } = useAdminRecruiters();

  const columns = useMemo<Column<AdminRecruiter>[]>(() => [
    {
      header: (
        <input
          type="checkbox"
          checked={recruiters.length > 0 && selectedIds.length === recruiters.length}
          onChange={() => {
            if (selectedIds.length === recruiters.length) clearSelection();
            else recruiters.forEach((r) => { if (!selectedIds.includes(r.id)) toggleSelect(r.id); });
          }}
          style={{ cursor: 'pointer', width: '16px', height: '16px' }}
        />
      ),
      key: 'selection',
      width: '40px',
      align: 'center',
      render: (r) => (
        <input
          type="checkbox"
          checked={selectedIds.includes(r.id)}
          onChange={() => toggleSelect(r.id)}
          onClick={(e) => e.stopPropagation()}
          style={{ cursor: 'pointer', width: '16px', height: '16px' }}
        />
      ),
    },
    {
      header: 'Recruiter',
      key: 'name',
      render: (r) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 600 }}>{r.name}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--tm-text-secondary)' }}>{r.email}</span>
        </div>
      ),
    },
    {
      header: 'Company',
      key: 'company',
      render: (r) => <span style={{ fontWeight: 500 }}>{getMembership(r)?.companies?.name || '—'}</span>,
    },
    {
      header: 'Member Role',
      key: 'member_role',
      render: (r) => <span>{getMembership(r)?.member_role || '—'}</span>,
    },
    {
      header: 'Membership',
      key: 'membership_status',
      render: (r) => {
        const m = getMembership(r);
        return m ? <StatusPill status={m.status} /> : <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>None</span>;
      },
    },
    {
      header: 'Joined',
      key: 'created_at',
      render: (r) => <span style={{ fontSize: '0.8rem' }}>{new Date(r.created_at).toLocaleDateString()}</span>,
    },
    {
      header: 'Account',
      key: 'is_active',
      render: (r) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: r.is_active ? '#10b981' : '#cbd5e1' }} />
          <span style={{ fontSize: '0.8rem', color: 'var(--tm-text-secondary)' }}>{r.is_active ? 'Active' : 'Suspended'}</span>
        </span>
      ),
    },
  ], [recruiters, selectedIds, toggleSelect, clearSelection]);

  return (
    <section className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Employer Management</p>
          <h1 className={styles.title}>Recruiters</h1>
          <p className={styles.subtitle}>Manage recruiter accounts, company membership, and platform access.</p>
        </div>
      </header>

      <div className={styles.toolbarRow}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', width: '100%', alignItems: 'center' }}>
          <form className={styles.toolbar} style={{ flex: 1 }} onSubmit={handleSearchSubmit}>
            <input
              className={styles.searchInput}
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              placeholder="Search by name or email..."
            />
            <button type="submit" className={styles.primaryButton}>Search</button>
          </form>

          <select className={styles.searchInput} style={{ maxWidth: '200px' }} value={membershipStatus} onChange={(e) => handleMembershipStatusFilterChange(e.target.value)}>
            <option value="all">All Membership Statuses</option>
            <option value="invited">Invited</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="removed">Removed</option>
          </select>

          <select className={styles.searchInput} style={{ maxWidth: '160px' }} value={sort} onChange={(e) => handleSortChange(e.target.value)}>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="name_asc">Name (A-Z)</option>
            <option value="name_desc">Name (Z-A)</option>
          </select>

          {hasEditPerm && <AdminButton onClick={() => setShowRecruiterRegister(true)}>+ Add Recruiter</AdminButton>}

          {hasExportPerm && (
            <button onClick={handleExport} disabled={exportLoading} className={styles.exportBtn}>
              {exportLoading ? 'Exporting...' : '↓ Export CSV'}
            </button>
          )}
        </div>
      </div>

      {exportLoading && (
        <div style={{ background: '#f8fafc', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '12px', marginBottom: '1.5rem', fontSize: '0.875rem', color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '14px', height: '14px', border: '2px solid rgba(59,130,246,0.3)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
          <span>{exportProgress}</span>
        </div>
      )}

      {error && <div className={styles.errorBanner}>{error}</div>}

      <DataTable
        columns={columns}
        data={recruiters}
        loading={authLoading || loading}
        onRowClick={(row) => setPreviewUser(row)}
        emptyState={
          <div className={styles.emptyState}>
            <h3>No recruiters found</h3>
            <p style={{ margin: '8px 0 16px', color: '#64748b' }}>No recruiter accounts matched your active search criteria.</p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button onClick={handleClearFilters} className={styles.primaryButton} style={{ padding: '8px 16px', fontSize: '0.85rem', background: '#475569' }}>Clear Filters</button>
              {hasEditPerm && (
                <button onClick={() => setShowRecruiterRegister(true)} className={styles.primaryButton} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>Invite Recruiter</button>
              )}
            </div>
          </div>
        }
      />

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button disabled={page === 0} onClick={() => handlePageChange(page - 1)} className={styles.pageButton}>Prev</button>
          {Array.from({ length: totalPages }).map((_, i) => (
            <button key={i} className={`${styles.pageButton} ${page === i ? styles.pageActive : ''}`} onClick={() => handlePageChange(i)}>{i + 1}</button>
          ))}
          <button disabled={page === totalPages - 1} onClick={() => handlePageChange(page + 1)} className={styles.pageButton}>Next</button>
        </div>
      )}

      <RecruiterDetailDrawer
        recruiter={previewUser}
        onClose={() => setPreviewUser(null)}
        onChanged={() => { refresh(); setPreviewUser(null); }}
        hasEditPerm={hasEditPerm}
      />

      {showRecruiterRegister && (
        <div className={styles.drawerOverlay} onClick={() => setShowRecruiterRegister(false)}>
          <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
            <header className={styles.drawerHeader}>
              <h2>Add Recruiter Account</h2>
              <button className={styles.drawerClose} onClick={() => setShowRecruiterRegister(false)}>×</button>
            </header>
            <div className={styles.drawerContent} style={{ padding: '2rem' }}>
              <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '2rem' }}>
                Invite a recruiter on behalf of a company (identified by GSTIN). They receive a password-set link by
                email — no plaintext credentials are ever generated. New companies must still be approved through the
                Verification queue.
              </p>
              <RecruiterRegisterForm
                onSuccess={() => { setShowRecruiterRegister(false); refresh(); }}
                onCancel={() => setShowRecruiterRegister(false)}
              />
            </div>
          </div>
        </div>
      )}

      {selectedIds.length > 0 && (
        <div className={styles.bulkBar}>
          <span className={styles.bulkCount}>{selectedIds.length} recruiters selected</span>
          <div className={styles.bulkActions}>
            {hasEditPerm && (
              <>
                <button className={styles.bulkBtn} onClick={() => handleBulkClick('activate')}>Activate</button>
                <button className={styles.bulkBtn} onClick={() => handleBulkClick('deactivate')}>Deactivate</button>
              </>
            )}
            {hasDeletePerm && (
              <button className={`${styles.bulkBtn} ${styles.bulkBtnDanger}`} onClick={() => handleBulkClick('delete')}>Delete</button>
            )}
          </div>
        </div>
      )}

      {pendingAction && (
        <div className={styles.undoBanner}>
          <div className={styles.undoContent}>
            <span className={styles.undoIcon}>⏳</span>
            <span>Bulk <strong>{pendingAction.action}</strong> pending... {pendingAction.timeLeft}s remaining</span>
          </div>
          <button onClick={handleUndoPending} className={styles.undoButton}>Undo</button>
        </div>
      )}

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
