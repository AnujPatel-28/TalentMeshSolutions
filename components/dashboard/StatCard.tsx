"use client";
import React from 'react';
import styles from './StatCard.module.css';

interface StatCardProps {
    label: string;
    value: string | number;
    delta?: {
        value: string | number;
        isPositive?: boolean;
        type?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
    } | string | React.ReactNode;
    icon: React.ReactNode;
    onClick?: () => void;
    /** This metric's query failed — render "failed to load" instead of `value`/`delta`, distinct from a real 0. */
    error?: boolean;
}

export default function StatCard({
    label,
    value,
    delta,
    icon,
    onClick,
    error
}: StatCardProps) {
    const isClickable = !!onClick;

    const renderDelta = () => {
        if (!delta) return null;

        // If delta is a structured object
        if (typeof delta === 'object' && delta !== null && 'value' in delta) {
            const d = delta as { value: string | number; isPositive?: boolean; type?: 'success' | 'warning' | 'error' | 'info' | 'neutral' };
            let deltaClass = styles.deltaNeutral;
            if (d.type === 'success' || d.isPositive === true) {
                deltaClass = styles.deltaPositive;
            } else if (d.type === 'error' || d.isPositive === false) {
                deltaClass = styles.deltaNegative;
            } else if (d.type === 'warning') {
                deltaClass = styles.deltaWarning;
            } else if (d.type === 'info') {
                deltaClass = styles.deltaInfo;
            }
            return (
                <span className={`${styles.delta} ${deltaClass}`}>
                    {d.value}
                </span>
            );
        }

        // If delta is a string, check if it starts with +/- to apply color styling automatically
        if (typeof delta === 'string') {
            const trimmed = delta.trim();
            const isPos = trimmed.startsWith('+');
            const isNeg = trimmed.startsWith('-');
            const deltaClass = isPos ? styles.deltaPositive : isNeg ? styles.deltaNegative : styles.deltaNeutral;
            return (
                <span className={`${styles.delta} ${deltaClass}`}>
                    {delta}
                </span>
            );
        }

        // Otherwise (ReactNode)
        return <span className={styles.delta}>{delta}</span>;
    };

    return (
        <div 
            className={`${styles.card} ${isClickable ? styles.clickable : ''}`}
            onClick={onClick}
            role={isClickable ? 'button' : undefined}
            tabIndex={isClickable ? 0 : undefined}
            onKeyDown={
                isClickable 
                    ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }
                    : undefined
            }
        >
            <div className={styles.top}>
                <span className={styles.label} title={label}>{label}</span>
                <span className={styles.iconBox}>{icon}</span>
            </div>
            <div className={styles.bottom}>
                <div className={`${styles.value} ${error ? styles.valueError : ''}`}>{error ? '—' : value}</div>
                {error ? (
                    <div className={styles.deltaContainer}>
                        <span className={`${styles.delta} ${styles.deltaNegative}`}>Failed to load</span>
                    </div>
                ) : delta !== undefined && delta !== null && (
                    <div className={styles.deltaContainer}>{renderDelta()}</div>
                )}
            </div>
        </div>
    );
}
