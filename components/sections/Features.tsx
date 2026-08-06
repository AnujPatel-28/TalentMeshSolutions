"use client";
import Link from 'next/link';
import AutoFixHighOutlinedIcon from '@mui/icons-material/AutoFixHighOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import ChatBubbleOutlineOutlinedIcon from '@mui/icons-material/ChatBubbleOutlineOutlined';
import styles from './sections.module.css';

const Features = () => {
    return (
        <section className={styles.features}>
            <div className={styles.featureContainer}>
                {/* Header */}
                <div className={styles.featureHeader}>
                    <div className={styles.badge}>FOR EMPLOYERS</div>
                    <h2 className={styles.sectionTitle}>
                        Hire the best talent, faster.
                    </h2>
                    <p className={styles.sectionDesc}>
                        Automate your hiring pipeline with our Employer Dashboard. Post jobs, track applicants, and schedule interviews in one place.
                    </p>
                </div>

                {/* Features Grid */}
                <div className={styles.featureGrid}>
                    <div className={styles.featureCard}>
                        <div className={styles.featureIcon}>
                            <AutoFixHighOutlinedIcon sx={{ fontSize: 32 }} />
                        </div>
                        <h3>Job Post Generator</h3>
                        <p>Generate detailed job descriptions in seconds using just a title and keywords.</p>
                    </div>

                    <div className={styles.featureCard}>
                        <div className={styles.featureIcon}>
                            <SearchOutlinedIcon sx={{ fontSize: 32 }} />
                        </div>
                        <h3>Smart Screening</h3>
                        <p>Automatically rank candidates based on fit score. No more manual resume sifting.</p>
                    </div>

                    <div className={styles.featureCard}>
                        <div className={styles.featureIcon}>
                            <ChatBubbleOutlineOutlinedIcon sx={{ fontSize: 32 }} />
                        </div>
                        <h3>Direct Messaging</h3>
                        <p>Chat directly with top candidates. Schedule interviews with calendar integration.</p>
                    </div>
                </div>

                <div className={styles.featureAction}>
                    <Link href="/signup" className={styles.ctaBtn}>
                        Start Hiring Now
                    </Link>
                </div>
            </div>
        </section>
    );
};

export default Features;

