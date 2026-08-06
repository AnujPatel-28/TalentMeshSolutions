"use client";
import React from 'react';
import ResumeManager from '@/components/candidate/ResumeManager';
import styles from '../../../shared-dashboard.module.css';

export default function ResumesPage({ params }: { params: Promise<{ role_id: string }> }) {
    const { role_id } = React.use(params) || {};
    
    return (
        <div className={styles.dash} style={{ maxWidth: '960px', margin: '0 auto' }}>
            <div className={styles.pageHeader} style={{ marginBottom: '1.5rem' }}>
                <div className={styles.pageHeaderContent}>
                    <h1 className={styles.pageHeaderTitle}>My Resumes</h1>
                    <p className={styles.pageHeaderSub}>Upload and manage your resumes for job applications. Your default resume will be pre-selected when applying to jobs.</p>
                </div>
            </div>
            
            <ResumeManager candidateId={role_id} />
        </div>
    );
}
