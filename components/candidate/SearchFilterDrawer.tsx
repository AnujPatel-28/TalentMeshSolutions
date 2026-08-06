'use client';
import React, { useEffect, useState } from 'react';
import { CustomSelect } from '@/components/ui/CustomSelect';
import styles from './SearchFilterDrawer.module.css';

export interface JobFilters {
    type: string;
    category: string;
    salary_min: string;
    salary_max: string;
    date_posted: string;
}

export const EMPTY_JOB_FILTERS: JobFilters = {
    type: '',
    category: '',
    salary_min: '',
    salary_max: '',
    date_posted: '',
};

const JOB_TYPES = ['Full-Time', 'Part-Time', 'Contract', 'Remote', 'Internship'];
const CATEGORIES = ['Engineering', 'Design', 'Product', 'Marketing', 'Finance', 'HR', 'Operations'];
const DATE_POSTED_OPTIONS = [
    { label: 'Any time', value: '' },
    { label: 'Last 24 hours', value: '24h' },
    { label: 'Last 7 days', value: '7d' },
    { label: 'Last 30 days', value: '30d' },
];

const IC = {
    Close: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>,
    Bell: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>,
};

interface SearchFilterDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    filters: JobFilters;
    onApply: (filters: JobFilters) => void;
    onSaveSearch: () => void;
}

export default function SearchFilterDrawer({ isOpen, onClose, filters, onApply, onSaveSearch }: SearchFilterDrawerProps) {
    const [draft, setDraft] = useState<JobFilters>(filters);

    useEffect(() => {
        if (isOpen) setDraft(filters);
    }, [isOpen, filters]);

    const handleApply = () => {
        onApply(draft);
        onClose();
    };

    const handleReset = () => setDraft(EMPTY_JOB_FILTERS);

    return (
        <>
            <div className={`${styles.backdrop} ${isOpen ? styles.backdropVisible : ''}`} onClick={onClose} />
            <div className={`${styles.drawer} ${isOpen ? styles.open : ''}`} role="dialog" aria-label="Job filters" aria-hidden={!isOpen}>
                <div className={styles.header}>
                    <h3 className={styles.title}>Filters</h3>
                    <button className={styles.closeBtn} onClick={onClose} aria-label="Close filters" type="button">
                        <IC.Close />
                    </button>
                </div>

                <div className={styles.body}>
                    <div className={styles.field}>
                        <label className={styles.label}>Job Type</label>
                        <CustomSelect
                            value={draft.type}
                            onChange={(e) => setDraft({ ...draft, type: e.target.value })}
                            options={[{ label: 'All Types', value: '' }, ...JOB_TYPES.map(t => ({ label: t, value: t }))]}
                        />
                    </div>

                    <div className={styles.field}>
                        <label className={styles.label}>Category</label>
                        <CustomSelect
                            value={draft.category}
                            onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                            options={[{ label: 'All Categories', value: '' }, ...CATEGORIES.map(c => ({ label: c, value: c }))]}
                        />
                    </div>

                    <div className={styles.field}>
                        <label className={styles.label}>Salary Range (₹ per annum)</label>
                        <div className={styles.salaryRow}>
                            <input
                                type="number"
                                min={0}
                                placeholder="Min"
                                className={styles.input}
                                value={draft.salary_min}
                                onChange={(e) => setDraft({ ...draft, salary_min: e.target.value })}
                            />
                            <span className={styles.salaryDash}>–</span>
                            <input
                                type="number"
                                min={0}
                                placeholder="Max"
                                className={styles.input}
                                value={draft.salary_max}
                                onChange={(e) => setDraft({ ...draft, salary_max: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className={styles.field}>
                        <label className={styles.label}>Date Posted</label>
                        <CustomSelect
                            value={draft.date_posted}
                            onChange={(e) => setDraft({ ...draft, date_posted: e.target.value })}
                            options={DATE_POSTED_OPTIONS}
                        />
                    </div>
                </div>

                <div className={styles.footer}>
                    <button className={styles.saveSearchBtn} onClick={onSaveSearch} type="button">
                        <IC.Bell /> Save This Search
                    </button>
                    <div className={styles.footerActions}>
                        <button className={styles.resetBtn} onClick={handleReset} type="button">Reset</button>
                        <button className={styles.applyBtn} onClick={handleApply} type="button">Apply Filters</button>
                    </div>
                </div>
            </div>
        </>
    );
}
