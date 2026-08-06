import Link from 'next/link';
import styles from './sections.module.css';

const UserSegments = () => {
    return (
        <section className={styles.userSegments}>
            <div className={styles.container}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>
                        Platform Built for <span className={styles.highlightText}>Everyone</span>
                    </h2>
                    <p className={styles.sectionDesc}>
                        Whether you're building a team or building your career, we have the tools you need to succeed.
                    </p>
                </div>

                <div className={styles.segmentsGrid}>
                    {/* Employers Card */}
                    <div className={`${styles.segmentCard} ${styles.employers}`}>
                        <div className={styles.segmentBadge}>For Employers</div>
                        <h3 className={styles.segmentTitle}>Transform Your Hiring Process</h3>
                        <p className={styles.segmentDesc}>
                            Post jobs, manage applications, and connect with qualified candidates—all from one recruitment platform.
                        </p>

                        <ul className={styles.segmentFeatures}>
                            <li className={styles.segmentFeatureItem}>
                                <span className={styles.segmentCheck}>
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </span>
                                Instant Candidate Matching
                            </li>
                            <li className={styles.segmentFeatureItem}>
                                <span className={styles.segmentCheck}>
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </span>
                                Bias-Free Screening
                            </li>
                            <li className={styles.segmentFeatureItem}>
                                <span className={styles.segmentCheck}>
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </span>
                                Automated Scheduling
                            </li>
                        </ul>

                        <button className={styles.segmentAction}>
                            Post a Job for Free
                        </button>

                        {/* Background Decoration */}
                        <div className={styles.segmentImageWrapper}>
                            <svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="100" cy="100" r="80" stroke="#007BFF" strokeWidth="10" strokeOpacity="0.2" />
                                <path d="M60 100L90 130L140 70" stroke="#007BFF" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.2" />
                            </svg>
                        </div>
                    </div>

                    {/* Candidates Card */}
                    <div className={`${styles.segmentCard} ${styles.candidates}`}>
                        <div className={styles.segmentBadge}>For Candidates</div>
                        <h3 className={styles.segmentTitle}>Accelerate Your Career Growth</h3>
                        <p className={styles.segmentDesc}>
                            Don't just apply—get noticed. Let our intelligent algorithms highlight your strengths to the world's best companies.
                        </p>

                        <ul className={styles.segmentFeatures}>
                            <li className={styles.segmentFeatureItem}>
                                <span className={styles.segmentCheck}>
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </span>
                                Smart Resume Optimization
                            </li>
                            <li className={styles.segmentFeatureItem}>
                                <span className={styles.segmentCheck}>
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </span>
                                Personalized Job Alerts
                            </li>
                            <li className={styles.segmentFeatureItem}>
                                <span className={styles.segmentCheck}>
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </span>
                                Salary Insights & Negotiation
                            </li>
                        </ul>

                        <button className={styles.segmentAction}>
                            Find Your Dream Job
                        </button>

                        {/* Background Decoration */}
                        <div className={styles.segmentImageWrapper}>
                            <svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="100" cy="100" r="80" stroke="#007BFF" strokeWidth="10" strokeOpacity="0.2" />
                                <circle cx="100" cy="100" r="40" stroke="#007BFF" strokeWidth="8" strokeOpacity="0.2" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default UserSegments;

