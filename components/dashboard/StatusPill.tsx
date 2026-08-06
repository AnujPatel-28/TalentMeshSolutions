"use client";
import React from 'react';
import styles from './StatusPill.module.css';

interface StatusPillProps {
    status: string;
    customLabel?: string;
}

export default function StatusPill({ status, customLabel }: StatusPillProps) {
    if (!status) return null;
    
    const normalized = status.toLowerCase().trim().replace(/[-_]/g, ' ');

    let type: 'success' | 'warning' | 'error' | 'info' = 'info';

    if (
        [
            'active', 'published', 'hired', 'shortlisted', 'approved', 
            'completed', 'success', 'offer', 'offered', 'hired', 
            'selected', 'accepted', 'completed'
        ].includes(normalized)
    ) {
        type = 'success';
    } else if (
        [
            'pending', 'draft', 'warning', 'on hold', 'hold', 
            'screening', 'screened', 'interview', 'interviewing', 
            'scheduled', 'in progress'
        ].includes(normalized)
    ) {
        type = 'warning';
    } else if (
        [
            'rejected', 'closed', 'expired', 'error', 'failed', 
            'cancelled', 'inactive'
        ].includes(normalized)
    ) {
        type = 'error';
    } else {
        type = 'info'; // default for applied, new, saved, etc.
    }

    const label = customLabel || normalized.charAt(0).toUpperCase() + normalized.slice(1);
    const typeClass = styles[type] || styles.info;

    return (
        <span className={`${styles.pill} ${typeClass}`}>
            {label}
        </span>
    );
}
