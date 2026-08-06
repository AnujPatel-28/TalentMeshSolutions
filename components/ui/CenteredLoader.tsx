"use client";
import React from 'react';
import styles from '@/app/dashboard/shared-dashboard.module.css';

interface CenteredLoaderProps {
    label?: string;
    subLabel?: string;
    fullScreen?: boolean;
}

export default function CenteredLoader({ 
    label = "Loading", 
    subLabel, 
    fullScreen = false 
}: CenteredLoaderProps) {
    return (
        <div className={fullScreen ? styles.fullPageLoader : styles.centeredLoaderContainer}>
            <div className={styles.centeredLoaderContent}>
                <div className={styles.premiumSpinner}>
                    <div className={styles.spinnerCore}></div>
                    <div className={styles.spinnerRing}></div>
                </div>
                <div className={styles.loaderTexts}>
                    <span className={styles.loaderLabel}>{label}</span>
                    {subLabel && <span className={styles.loaderSubLabel}>{subLabel}</span>}
                </div>
            </div>
        </div>
    );
}
