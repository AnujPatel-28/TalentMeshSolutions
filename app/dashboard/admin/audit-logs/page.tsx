'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import styles from './audit-logs.module.css';
import sharedStyles from '../../shared-dashboard.module.css';
import { invokeFunction } from '@/lib/insforge';
import DataTable, { Column } from '@/components/dashboard/DataTable';
import FilterBar, { FilterDropdown } from '@/components/dashboard/FilterBar';
import DetailDrawer from '@/components/dashboard/DetailDrawer';

type AuditLog = {
  id: string;
  actor_id: string;
  action: string;
  table_name: string;
  record_id: string;
  old_data: any;
  new_data: any;
  created_at: string;
  ip_address: string;
  actor: {
    name: string;
    email: string;
  };
};

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Additional local filters
  const [actionFilter, setActionFilter] = useState('');
  const [tableFilter, setTableFilter] = useState('');

  const fetchLogs = useCallback(async (q = search) => {
    setLoading(true);
    try {
      const { data, error } = await invokeFunction('admin-audit-logs', {
        method: 'GET',
        queries: { search: q, page: '0' }
      });
      if (!error) {
        setLogs(data.logs || []);
      }
    } catch (err) {
      setError('Failed to load audit trails');
    } finally {
      setLoading(false);
    }
  }, [search]);

  // Debounced search trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLogs(search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search, fetchLogs]);

  const getActionClass = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes('create') || act.includes('insert')) return styles.action_create;
    if (act.includes('update') || act.includes('approve') || act.includes('patch')) return styles.action_update;
    if (act.includes('delete') || act.includes('remove')) return styles.action_delete;
    return '';
  };

  // Dynamically build filter list
  const uniqueTables = useMemo(() => {
    return Array.from(new Set(logs.map(log => log.table_name).filter(Boolean))) as string[];
  }, [logs]);

  const uniqueActions = useMemo(() => {
    return Array.from(new Set(logs.map(log => log.action).filter(Boolean))) as string[];
  }, [logs]);

  const filters: FilterDropdown[] = useMemo(() => [
    {
      key: 'action',
      label: 'Filter Action',
      options: uniqueActions.map(a => ({ value: a, label: a })),
      value: actionFilter,
      onChange: setActionFilter
    },
    {
      key: 'table',
      label: 'Filter Resource',
      options: uniqueTables.map(t => ({ value: t, label: t })),
      value: tableFilter,
      onChange: setTableFilter
    }
  ], [actionFilter, tableFilter, uniqueActions, uniqueTables]);

  const handleClearFilters = () => {
    setSearch('');
    setActionFilter('');
    setTableFilter('');
  };

  const filteredLogs = useMemo(() => {
    let list = logs;
    if (actionFilter) {
      list = list.filter(log => log.action === actionFilter);
    }
    if (tableFilter) {
      list = list.filter(log => log.table_name === tableFilter);
    }
    return list;
  }, [logs, actionFilter, tableFilter]);

  const columns: Column<AuditLog>[] = useMemo(() => [
    {
      header: 'Timestamp',
      key: 'created_at',
      render: (log) => <span style={{ color: 'var(--tm-text-secondary)' }}>{new Date(log.created_at).toLocaleString()}</span>
    },
    {
      header: 'Administrator',
      key: 'actor.name',
      render: (log) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 700, color: 'var(--tm-text-primary)' }}>{log.actor?.name || 'System Admin'}</span>
          <span style={{ fontSize: '0.72rem', color: 'var(--tm-text-secondary)' }}>{log.actor?.email}</span>
        </div>
      )
    },
    {
      header: 'Action',
      key: 'action',
      render: (log) => (
        <span className={`${styles.statusBadge} ${getActionClass(log.action)}`}>
          {log.action}
        </span>
      )
    },
    {
      header: 'Resource',
      key: 'table_name',
      render: (log) => <span style={{ fontWeight: 700, color: 'var(--tm-text-primary)' }}>{log.table_name}</span>
    },
    {
      header: 'Identifier',
      key: 'record_id',
      render: (log) => <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--tm-text-secondary)' }}>{(log.record_id || '').slice(0, 8)}...</span>
    },
    {
      header: 'IP Origin',
      key: 'ip_address',
      render: (log) => <span style={{ color: 'var(--tm-text-secondary)' }}>{log.ip_address || '0.0.0.0'}</span>
    }
  ], []);

  return (
    <section className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>Governance & Oversight</p>
        <h1 className={styles.title}>System Audit Trail</h1>
        <p className={styles.subtitle}>A permanent, immutable record of all administrative interactions and data mutations.</p>
      </header>

      {error && (
        <div style={{ padding: '1rem', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '8px', color: '#b91c1c', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid var(--tm-border)', padding: '1.5rem', marginTop: '1.5rem' }}>
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search audit trails by action, table, or actor..."
          filters={filters}
          onClearAll={handleClearFilters}
        />

        <DataTable
          columns={columns}
          data={filteredLogs}
          loading={loading}
          onRowClick={(row) => setSelectedLog(row)}
          emptyState={
            <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--tm-border)" strokeWidth="1.5" style={{ marginBottom: '1rem' }}>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
              <p style={{ fontWeight: 600, color: 'var(--tm-text-primary)' }}>No audit logs found</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--tm-text-secondary)', marginTop: '0.25rem' }}>Modify your query or clear filters to view logs.</p>
            </div>
          }
        />
      </div>

      {/* Audit Log Detail Drawer */}
      <DetailDrawer
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Audit Mutation Details"
        width="640px"
      >
        {selectedLog && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <span style={{ textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 800, color: 'var(--tm-accent)', letterSpacing: '0.05em' }}>
                Resource: {selectedLog.table_name}
              </span>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--tm-text-primary)', margin: '0.25rem 0 0.5rem' }}>
                Action: {selectedLog.action}
              </h3>
              <p style={{ color: 'var(--tm-text-secondary)', margin: 0, fontSize: '0.875rem' }}>
                Admin: <strong>{selectedLog.actor?.name || 'System Admin'}</strong> ({selectedLog.actor?.email})
              </p>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--tm-border)', margin: 0 }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--tm-text-secondary)' }}>Record ID:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{selectedLog.record_id}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--tm-text-secondary)' }}>Timestamp:</span>
                <span style={{ fontWeight: 600 }}>{new Date(selectedLog.created_at).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--tm-text-secondary)' }}>IP Origin:</span>
                <span style={{ fontWeight: 600 }}>{selectedLog.ip_address || '0.0.0.0'}</span>
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--tm-border)', margin: 0 }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <h5 style={{ margin: '0 0 0.5rem', fontWeight: 700, fontSize: '0.85rem', color: 'var(--tm-text-primary)' }}>State Before Mutation</h5>
                <pre style={{ margin: 0, padding: '0.75rem', background: 'var(--tm-surface-muted)', border: '1px solid var(--tm-border)', borderRadius: '6px', overflowX: 'auto', fontSize: '0.78rem', color: 'var(--tm-text-secondary)', fontFamily: 'monospace' }}>
                  {selectedLog.old_data ? JSON.stringify(selectedLog.old_data, null, 2) : '// No prior state recorded'}
                </pre>
              </div>

              <div>
                <h5 style={{ margin: '0 0 0.5rem', fontWeight: 700, fontSize: '0.85rem', color: 'var(--tm-text-primary)' }}>State After Mutation</h5>
                <pre style={{ margin: 0, padding: '0.75rem', background: 'var(--tm-surface-muted)', border: '1px solid var(--tm-border)', borderRadius: '6px', overflowX: 'auto', fontSize: '0.78rem', color: 'var(--tm-text-secondary)', fontFamily: 'monospace' }}>
                  {selectedLog.new_data ? JSON.stringify(selectedLog.new_data, null, 2) : '// Record deleted'}
                </pre>
              </div>
            </div>
          </div>
        )}
      </DetailDrawer>
    </section>
  );
}
