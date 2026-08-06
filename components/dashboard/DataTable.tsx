"use client";
import React from 'react';
import styles from './DataTable.module.css';

export interface Column<T> {
    header: React.ReactNode;
    key: string;
    render?: (row: T) => React.ReactNode;
    width?: string;
    align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T> {
    columns: Column<T>[];
    data: T[];
    loading?: boolean;
    onRowClick?: (row: T) => void;
    emptyState?: React.ReactNode;
    rowKeyField?: keyof T | ((row: T) => string | number);
}

export default function DataTable<T>({
    columns,
    data,
    loading = false,
    onRowClick,
    emptyState,
    rowKeyField
}: DataTableProps<T>) {
    const getRowKey = (row: T, index: number): string | number => {
        if (rowKeyField) {
            if (typeof rowKeyField === 'function') {
                return rowKeyField(row);
            }
            return (row[rowKeyField] as unknown) as string | number;
        }
        // Fallbacks
        const r = row as any;
        return r.id || r.role_id || r.job_id || index;
    };

    const getValue = (row: T, key: string) => {
        if (key.includes('.')) {
            const parts = key.split('.');
            let current: any = row;
            for (const part of parts) {
                if (current === null || current === undefined) return '';
                current = current[part];
            }
            return current;
        }
        return (row as any)[key];
    };

    const renderCell = (row: T, col: Column<T>) => {
        if (col.render) {
            return col.render(row);
        }
        const val = getValue(row, col.key);
        if (val === null || val === undefined) return '';
        return String(val);
    };

    return (
        <div className={styles.container}>
            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead className={styles.thead}>
                        <tr className={styles.headerRow}>
                            {columns.map((col, idx) => (
                                <th
                                    key={col.key || idx}
                                    style={{
                                        width: col.width,
                                        textAlign: col.align || 'left'
                                    }}
                                    className={styles.th}
                                >
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className={styles.tbody}>
                        {loading ? (
                            // Loading Skeleton
                            Array.from({ length: 5 }).map((_, rIdx) => (
                                <tr key={`skeleton-row-${rIdx}`} className={styles.row}>
                                    {columns.map((col, cIdx) => (
                                        <td
                                            key={`skeleton-cell-${cIdx}`}
                                            className={styles.td}
                                            style={{ textAlign: col.align || 'left' }}
                                        >
                                            <div className={styles.skeletonBar} style={{ width: cIdx === 0 ? '70%' : '85%' }} />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : data.length === 0 ? (
                            // Empty State
                            <tr>
                                <td colSpan={columns.length} className={styles.emptyCell}>
                                    {emptyState || (
                                        <div className={styles.defaultEmpty}>
                                            <svg className={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                <rect x="3" y="3" width="18" height="18" rx="2" />
                                                <path d="M9 17h6" />
                                                <path d="M12 7v6" />
                                            </svg>
                                            <p className={styles.emptyTitle}>No data found</p>
                                            <p className={styles.emptySub}>There are no items matching this criteria at the moment.</p>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ) : (
                            // Data Rows
                            data.map((row, rIdx) => {
                                const isClickable = !!onRowClick;
                                return (
                                    <tr
                                        key={getRowKey(row, rIdx)}
                                        onClick={() => onRowClick?.(row)}
                                        className={`${styles.row} ${isClickable ? styles.clickable : ''}`}
                                        role={isClickable ? 'button' : undefined}
                                        tabIndex={isClickable ? 0 : undefined}
                                        onKeyDown={
                                            isClickable
                                                ? (e) => {
                                                      if (e.key === 'Enter' || e.key === ' ') {
                                                          e.preventDefault();
                                                          onRowClick(row);
                                                      }
                                                  }
                                                : undefined
                                        }
                                    >
                                        {columns.map((col, cIdx) => (
                                            <td
                                                key={col.key || cIdx}
                                                style={{ textAlign: col.align || 'left' }}
                                                className={styles.td}
                                            >
                                                {renderCell(row, col)}
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
