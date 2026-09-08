import Link from 'next/link';
import styles from './sections.module.css';

const Pricing = () => {
    return (
        <section className={styles.pricing}>
            <div className={styles.container}>
                <div className={styles.sectionHeader}>
                    <div className={styles.badge}>Flexible Plans</div>
                    <h2 className={styles.sectionTitle}>Simple, Transparent Pricing</h2>
                    <p className={styles.sectionDesc}>
                        Start for free and scale as you grow. No hidden fees.
                    </p>
                </div>

                <div className={styles.pricingGrid}>
                    <div className={styles.pricingCard}>
                        <div className={styles.planName}>Connect</div>
                        <div className={styles.planPrice}>Free</div>
                        <div className={styles.planPeriod}>Forever</div>
                        <ul className={styles.planFeatures}>
                            <li><span className={styles.checkIcon}>✓</span> Basic Profile</li>
                            <li><span className={styles.checkIcon}>✓</span> Browse Jobs</li>
                            <li><span className={styles.checkIcon}>✓</span> 1 AI Resume Scan</li>
                        </ul>
                        <Link href="/signup" className={styles.secondaryBtn}>Get Started</Link>
                    </div>

                    <div className={`${styles.pricingCard} ${styles.popular}`}>
                        <div className={styles.popularBadge}>Most Popular</div>
                        <div className={styles.planName}>Pro</div>
                        <div className={styles.planPrice}>$29</div>
                        <div className={styles.planPeriod}>per month</div>
                        <ul className={styles.planFeatures}>
                            <li><span className={styles.checkIcon}>✓</span> Everything in Free</li>
                            <li><span className={styles.checkIcon}>✓</span> Unlimited AI Scans</li>
                            <li><span className={styles.checkIcon}>✓</span> Priority Visibility</li>
                            <li><span className={styles.checkIcon}>✓</span> Salary Insights</li>
                        </ul>
                        <Link href="/signup" className={styles.primaryBtn}>Start Free Trial</Link>
                    </div>

                    <div className={styles.pricingCard}>
                        <div className={styles.planName}>Business</div>
                        <div className={styles.planPrice}>$99</div>
                        <div className={styles.planPeriod}>per month</div>
                        <ul className={styles.planFeatures}>
                            <li><span className={styles.checkIcon}>✓</span> For Hiring Teams</li>
                            <li><span className={styles.checkIcon}>✓</span> 5 Active Job Posts</li>
                            <li><span className={styles.checkIcon}>✓</span> Advanced Analytics</li>
                            <li><span className={styles.checkIcon}>✓</span> Candidate Filtering</li>
                        </ul>
                        <Link href="/contact" className={styles.secondaryBtn}>Contact Sales</Link>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Pricing;

