"use client";
import React from 'react';
import Skeleton from './Skeleton';
import styles from '@/app/dashboard/shared-dashboard.module.css';

export function HomeSkeleton() {
    return (
        <div className={styles.dash}>
            <div className={styles.pageHeader}>
                <div className={styles.pageHeaderContent}>
                    <Skeleton width={200} height="2rem" />
                    <Skeleton width={300} height="1rem" style={{ marginTop: '0.5rem' }} />
                </div>
                <Skeleton width={120} height="2.5rem" />
            </div>

            <div className={styles.stats}>
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className={styles.stat}>
                        <div className={styles.statTop}>
                            <Skeleton width={80} height="0.8rem" />
                            <Skeleton width={32} height={32} circle />
                        </div>
                        <Skeleton width={100} height="1.8rem" style={{ marginTop: '0.5rem' }} />
                        <Skeleton width={60} height="0.7rem" style={{ marginTop: '0.3rem' }} />
                    </div>
                ))}
            </div>

            <div className={styles.mainGrid}>
                <div className={styles.leftCol}>
                    <div className={styles.card}>
                        <div className={styles.cardHead}>
                            <Skeleton width={150} height="1.2rem" />
                        </div>
                        {[1, 2, 3].map(i => (
                            <div key={i} className={styles.jobCard}>
                                <Skeleton width={42} height={42} />
                                <div style={{ flex: 1 }}>
                                    <Skeleton width="60%" height="1rem" />
                                    <Skeleton width="40%" height="0.7rem" style={{ marginTop: '0.4rem' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className={styles.rightCol}>
                    <div className={styles.card}>
                        <Skeleton width={120} height="1.1rem" />
                        {[1, 2, 3].map(i => (
                            <div key={i} style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
                                <Skeleton width={32} height={32} circle />
                                <div style={{ flex: 1 }}>
                                    <Skeleton width="100%" height="0.8rem" />
                                    <Skeleton width="50%" height="0.6rem" style={{ marginTop: '0.3rem' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export function ListSkeleton({ count = 5 }) {
    return (
        <div className={styles.dash}>
            <div className={styles.pageHeader}>
                <Skeleton width={250} height="2rem" />
                <Skeleton width={150} height="2.5rem" />
            </div>
            <div className={styles.card} style={{ gap: '1rem' }}>
                {Array.from({ length: count }).map((_, i) => (
                    <div key={i} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Skeleton width="40%" height="1.2rem" />
                            <Skeleton width={80} height="1.5rem" />
                        </div>
                        <Skeleton width="20%" height="0.8rem" style={{ marginTop: '0.5rem' }} />
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.8rem' }}>
                            <Skeleton width={60} height="1.2rem" />
                            <Skeleton width={60} height="1.2rem" />
                            <Skeleton width={60} height="1.2rem" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function FormSkeleton() {
    return (
        <div className={styles.dash}>
            <div className={styles.pageHeader}>
                <Skeleton width={200} height="1.8rem" />
            </div>
            <div className={styles.card}>
                {[1, 2, 3, 4].map(i => (
                    <div key={i} style={{ marginBottom: '1.5rem' }}>
                        <Skeleton width={120} height="0.9rem" style={{ marginBottom: '0.5rem' }} />
                        <Skeleton width="100%" height="2.8rem" />
                    </div>
                ))}
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <Skeleton width={120} height="2.5rem" />
                    <Skeleton width={120} height="2.5rem" />
                </div>
            </div>
        </div>
    );
}

export function CandidateDashboardSkeleton({ label = 'Loading jobs...' }: { label?: string }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#f8fafc', width: '100%', fontFamily: 'sans-serif' }}>
            <style>{`
                @keyframes skeleton-pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: .4; }
                }
                .sk-pulse {
                    animation: skeleton-pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                    background-color: #e2e8f0;
                }
                @media (max-width: 1023px) {
                    .sk-sidebar {
                        display: none !important;
                    }
                    .sk-list {
                        width: 100% !important;
                        flex: 1 !important;
                        padding: 1.25rem 1.0rem !important;
                    }
                    .sk-details {
                        display: none !important;
                    }
                }
            `}</style>

            {/* 3-Column Content Body */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden', width: '100%' }}>
                
                {/* Column 1: Left Profile Sidebar (250px) */}
                <div className="sk-sidebar" style={{ width: 250, borderRight: '1px solid #e2e8f0', background: '#f8fafc', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '16px', boxSizing: 'border-box', flexShrink: 0 }}>
                    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                        <div className="sk-pulse" style={{ width: 64, height: 64, borderRadius: '50%' }} />
                        <div className="sk-pulse" style={{ width: 100, height: 16, borderRadius: 4 }} />
                        <div className="sk-pulse" style={{ width: 140, height: 12, borderRadius: 4 }} />
                        <div className="sk-pulse" style={{ width: 80, height: 12, borderRadius: 4 }} />
                        <div style={{ width: '100%', borderTop: '1px solid #e2e8f0', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <div className="sk-pulse" style={{ width: 50, height: 10, borderRadius: 3 }} />
                                <div className="sk-pulse" style={{ width: 24, height: 10, borderRadius: 3 }} />
                            </div>
                            <div className="sk-pulse" style={{ width: '100%', height: 4, borderRadius: 9999 }} />
                        </div>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {[1, 2, 3].map(i => (
                            <div key={i} className="sk-pulse" style={{ width: '100%', height: 38, borderRadius: 8 }} />
                        ))}
                    </div>
                </div>

                {/* Column 2: Center Column welcome + list (440px) */}
                <div className="sk-list" style={{ width: 440, borderRight: '1px solid #e2e8f0', background: '#ffffff', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '16px', boxSizing: 'border-box', flexShrink: 0 }}>
                    {/* Search bar placeholder */}
                    <div className="sk-pulse" style={{ width: '100%', height: 48, borderRadius: 9999 }} />
                    
                    {/* Welcome message placeholder */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
                        <div className="sk-pulse" style={{ width: 140, height: 18, borderRadius: 4 }} />
                        <div className="sk-pulse" style={{ width: 220, height: 13, borderRadius: 4 }} />
                    </div>

                    {/* Status indicator */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '4px 0' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#007BFF' }} className="sk-pulse" />
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>{label}</span>
                    </div>

                    {/* Job Cards Placeholders */}
                    {[1, 2, 3].map(i => (
                        <div key={i} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div className="sk-pulse" style={{ width: 70, height: 18, borderRadius: 4 }} />
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <div className="sk-pulse" style={{ width: 28, height: 28, borderRadius: '50%' }} />
                                    <div className="sk-pulse" style={{ width: 28, height: 28, borderRadius: '50%' }} />
                                </div>
                            </div>
                            <div className="sk-pulse" style={{ width: '80%', height: 16, borderRadius: 4 }} />
                            <div className="sk-pulse" style={{ width: '50%', height: 12, borderRadius: 4 }} />
                            <div className="sk-pulse" style={{ width: '60%', height: 12, borderRadius: 4 }} />
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <div className="sk-pulse" style={{ width: 60, height: 18, borderRadius: 4 }} />
                                <div className="sk-pulse" style={{ width: 80, height: 18, borderRadius: 4 }} />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Column 3: Right Column details panel (flex 1) */}
                <div className="sk-details" style={{ flex: 1, background: '#ffffff', padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', boxSizing: 'border-box' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: 680 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div className="sk-pulse" style={{ width: '70%', height: 26, borderRadius: 4 }} />
                            <div className="sk-pulse" style={{ width: '40%', height: 16, borderRadius: 4 }} />
                            <div className="sk-pulse" style={{ width: '30%', height: 14, borderRadius: 4 }} />
                            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                                <div className="sk-pulse" style={{ width: 200, height: 44, borderRadius: 8 }} />
                                <div className="sk-pulse" style={{ width: 44, height: 44, borderRadius: 8 }} />
                                <div className="sk-pulse" style={{ width: 44, height: 44, borderRadius: 8 }} />
                                <div className="sk-pulse" style={{ width: 44, height: 44, borderRadius: 8 }} />
                            </div>
                        </div>
                        <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: 0 }} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div className="sk-pulse" style={{ width: 140, height: 18, borderRadius: 4 }} />
                            <div className="sk-pulse" style={{ width: '100%', height: 14, borderRadius: 4 }} />
                            <div className="sk-pulse" style={{ width: '95%', height: 14, borderRadius: 4 }} />
                            <div className="sk-pulse" style={{ width: '90%', height: 14, borderRadius: 4 }} />
                            <div className="sk-pulse" style={{ width: '40%', height: 14, borderRadius: 4 }} />
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

