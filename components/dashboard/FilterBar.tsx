"use client";
import React from 'react';
import styles from './FilterBar.module.css';

export interface FilterOption {
    value: string;
    label: string;
}

export interface FilterDropdown {
    key: string;
    label: string;
    options: FilterOption[];
    value: string;
    onChange: (value: string) => void;
}

interface FilterBarProps {
    search: string;
    onSearchChange: (value: string) => void;
    searchPlaceholder?: string;
    filters: FilterDropdown[];
    onClearAll: () => void;
}

export default function FilterBar({
    search,
    onSearchChange,
    searchPlaceholder = 'Search...',
    filters,
    onClearAll
}: FilterBarProps) {
    const hasActiveFilters = search.trim() !== '' || filters.some(f => f.value !== '');

    const handleRemoveFilter = (filterKey: string) => {
        const filter = filters.find(f => f.key === filterKey);
        if (filter) {
            filter.onChange('');
        }
    };

    const handleRemoveSearch = () => {
        onSearchChange('');
    };

    return (
        <div className={styles.stickyWrapper}>
            <div className={styles.bar}>
                {/* Search Input */}
                <div className={styles.searchContainer}>
                    <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        type="text"
                        className={styles.searchInput}
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder={searchPlaceholder}
                    />
                </div>

                {/* Dropdowns */}
                <div className={styles.dropdownsContainer}>
                    {filters.map((filter) => (
                        <select
                            key={filter.key}
                            className={styles.select}
                            value={filter.value}
                            onChange={(e) => filter.onChange(e.target.value)}
                        >
                            <option value="">{filter.label}</option>
                            {filter.options.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    ))}
                </div>
            </div>

            {/* Active Filter Chips */}
            {hasActiveFilters && (
                <div className={styles.chipsContainer}>
                    <span className={styles.activeText}>Active Filters:</span>
                    <div className={styles.chipsList}>
                        {search.trim() !== '' && (
                            <span className={styles.chip}>
                                Search: {search}
                                <button type="button" className={styles.chipRemove} onClick={handleRemoveSearch}>×</button>
                            </span>
                        )}
                        {filters.map((filter) => {
                            if (!filter.value) return null;
                            const option = filter.options.find(o => o.value === filter.value);
                            const displayLabel = option ? option.label : filter.value;
                            return (
                                <span key={filter.key} className={styles.chip}>
                                    {filter.label}: {displayLabel}
                                    <button type="button" className={styles.chipRemove} onClick={() => handleRemoveFilter(filter.key)}>×</button>
                                </span>
                            );
                        })}
                        <button type="button" className={styles.clearAllBtn} onClick={onClearAll}>
                            Clear All
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
