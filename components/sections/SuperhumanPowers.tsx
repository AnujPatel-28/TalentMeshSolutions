"use client";
import React, { useState, useEffect, useRef } from 'react';
import styles from './sections.module.css';

const SuperhumanPowers = () => {
    const sectionRef = useRef<HTMLDivElement>(null);
    const [curvePercent, setCurvePercent] = useState(0.12);
    const [titleRevealProgress, setTitleRevealProgress] = useState(0);
    const [descRevealProgress, setDescRevealProgress] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            if (!sectionRef.current) return;
            const rect = sectionRef.current.getBoundingClientRect();
            const viewportHeight = window.innerHeight;

            const startTrigger = viewportHeight;
            const endTrigger = 150;
            const totalDistance = startTrigger - endTrigger;

            const currentDistance = viewportHeight - rect.top;
            const progress = Math.min(Math.max(currentDistance / totalDistance, 0), 1);

            const maxCurve = 0.12;
            setCurvePercent(maxCurve * (1 - progress));

            // Staggered reveal calculations (Title reveals first, Description follows)
            const titleProg = Math.min(Math.max((progress - 0.0) / 0.8, 0), 1);
            const descProg = Math.min(Math.max((progress - 0.15) / 0.85, 0), 1);

            setTitleRevealProgress(prev => Math.max(prev, titleProg));
            setDescRevealProgress(prev => Math.max(prev, descProg));
        };

        window.addEventListener('scroll', handleScroll);
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <section ref={sectionRef} className={styles.superhumanPowers} style={{ clipPath: 'url(#arch-clip)', WebkitClipPath: 'url(#arch-clip)' }}>
            <div className={styles.container}>
                <div className={styles.sectionHeader}>
                    <h2
                        className={styles.sectionTitle}
                        style={{
                            clipPath: `inset(${(1 - titleRevealProgress) * 100}% 0 0 0)`,
                            WebkitClipPath: `inset(${(1 - titleRevealProgress) * 100}% 0 0 0)`,
                            transform: `translateY(${(1 - titleRevealProgress) * 35}px)`,
                            opacity: titleRevealProgress,
                            transformOrigin: 'center center',
                            willChange: 'transform, clip-path, opacity',
                            transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), clip-path 0.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                    >
                        <span className={styles.highlightText}>Superhuman</span>{' '}
                        <span>Recruiting Powers.</span>
                    </h2>
                    <p
                        className={styles.sectionDesc}
                        style={{
                            clipPath: `inset(${(1 - descRevealProgress) * 100}% 0 0 0)`,
                            WebkitClipPath: `inset(${(1 - descRevealProgress) * 100}% 0 0 0)`,
                            transform: `translateY(${(1 - descRevealProgress) * 35}px)`,
                            opacity: descRevealProgress,
                            transformOrigin: 'center center',
                            willChange: 'transform, clip-path, opacity',
                            transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), clip-path 0.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                    >
                        Source talent, screen candidates, schedule interviews, and manage hiring workflows from one intelligent recruitment platform.
                    </p>
                </div>

                <div className={styles.powerGrid}>
                    {/* Card 1: Automated Video Screening (Large) */}
                    <div className={`${styles.powerCard} ${styles.cardLarge}`}>
                        <div className={styles.powerIconWrapper}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2a10 10 0 1 0 10 10H12V2z"></path>
                                <path d="M21.18 8.02c-.38-1-1.05-1.88-1.92-2.52"></path>
                                <circle cx="12" cy="12" r="2"></circle>
                            </svg>
                        </div>
                        <div>
                            <h3 className={styles.powerCardTitle}>Interview Scheduling</h3>
                            <p className={styles.powerCardDesc}>
                                Coordinate interviews with your hiring team and candidates using a simple scheduling workflow.
                            </p>
                        </div>
                        <div className={styles.recordingVisual}>
                            <div className={styles.recordingStatus}>
                                <div className={styles.recordingDot}></div>
                                Recording...
                            </div>
                            <div className={styles.audioWave}>
                                <div className={styles.bar}></div>
                                <div className={styles.bar}></div>
                                <div className={styles.bar}></div>
                                <div className={styles.bar}></div>
                                <div className={styles.bar}></div>
                            </div>
                        </div>
                    </div>

                    {/* Card 2: Unbiased Ranking (Small) */}
                    <div className={`${styles.powerCard} ${styles.cardSmall}`}>
                        <div className={styles.powerIconWrapper}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="20" x2="18" y2="10"></line>
                                <line x1="12" y1="20" x2="12" y2="4"></line>
                                <line x1="6" y1="20" x2="6" y2="14"></line>
                            </svg>
                        </div>
                        <div>
                            <h3 className={styles.powerCardTitle}>Unbiased Ranking</h3>
                            <p className={styles.powerCardDesc}>
                                Candidates are scored purely on skills and performance data, eliminating unconscious bias.
                            </p>
                        </div>
                        <div className={styles.rankingVisual}>
                            <div className={styles.rankItem}><div className={`${styles.rankFill} ${styles.rank1}`}></div></div>
                            <div className={styles.rankItem}><div className={`${styles.rankFill} ${styles.rank2}`}></div></div>
                            <div className={styles.rankItem}><div className={`${styles.rankFill} ${styles.rank3}`}></div></div>
                        </div>
                    </div>

                    {/* Card 3: Instant Scheduling (Small) */}
                    <div className={`${styles.powerCard} ${styles.cardSmall}`}>
                        <div className={styles.powerIconWrapper}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                        </div>
                        <div>
                            <h3 className={styles.powerCardTitle}>Instant Scheduling</h3>
                            <p className={styles.powerCardDesc}>
                                Top candidates are scheduled for final rounds with your team based on real-time availability.
                            </p>
                        </div>
                        <div style={{ marginTop: 'auto', display: 'flex', gap: '8px' }}>
                            <div style={{ width: '40px', height: '40px', background: 'rgba(165, 243, 252, 0.15)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a5f3fc', fontWeight: 'bold', border: '1px solid rgba(165, 243, 252, 0.3)' }}>12</div>
                            <div style={{ width: '40px', height: '40px', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', border: '1px solid rgba(255, 255, 255, 0.1)' }}>13</div>
                            <div style={{ width: '40px', height: '40px', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', border: '1px solid rgba(255, 255, 255, 0.1)' }}>14</div>
                        </div>
                    </div>

                    {/* Card 4: Global Sourcing (Large) */}
                    <div className={`${styles.powerCard} ${styles.cardLarge}`}>
                        <div className={styles.powerIconWrapper}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="2" y1="12" x2="22" y2="12"></line>
                                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                            </svg>
                        </div>
                        <div>
                            <h3 className={styles.powerCardTitle}>Global Sourcing</h3>
                            <p className={styles.powerCardDesc}>
                                Access a global talent pool. Chosen scans 50+ platforms to find candidates that match your exact stack and culture.
                            </p>
                        </div>
                        <div className={styles.globalVisual}>
                            <div className={`${styles.radarCircle} ${styles.c1}`}></div>
                            <div className={`${styles.radarCircle} ${styles.c2}`}></div>
                            <div className={`${styles.radarCircle} ${styles.c3}`}></div>
                            <div className={styles.radarSweep}></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* SVG ClipPath Definition */}
            <svg width="0" height="0" style={{ position: 'absolute', pointerEvents: 'none' }}>
                <defs>
                    <clipPath id="arch-clip" clipPathUnits="objectBoundingBox">
                        <path d={`M0,1 L1,1 L1,${curvePercent} Q0.5,${-curvePercent} 0,${curvePercent} Z`} />
                    </clipPath>
                </defs>
            </svg>
        </section>
    );
};

export default SuperhumanPowers;
