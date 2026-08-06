import styles from './sections.module.css';

const HowItWorks = () => {
    return (
        <section className={styles.howItWorks}>
            <div className={styles.container}>
                <div className={styles.sectionHeader}>
                    {/* <div className={styles.badge}>Simple Process</div> */}
                    <h2 className={styles.sectionTitle}>How TalentMesh Works</h2>
                    <p className={styles.sectionDesc}>
                        Get hired 3x faster with our automated pipeline.
                    </p>
                </div>

                <div className={styles.stepsGrid}>
                    <div className={styles.stepCard}>
                        <div className={styles.stepNumber}>1</div>
                        <h3>Create Profile</h3>
                        <p>Sign up in seconds. Import your LinkedIn profile to get started instantly.</p>
                    </div>

                    <div className={styles.stepCard}>
                        <div className={styles.stepNumber}>2</div>
                        <h3>Upload Resume</h3>
                        <p>Our AI parses your resume and highlights your key skills and achievements.</p>
                    </div>

                    <div className={styles.stepCard}>
                        <div className={styles.stepNumber}>3</div>
                        <h3>AI Matching</h3>
                        <p>Smart algorithms match you with jobs that fit your experience and goals.</p>
                    </div>

                    <div className={styles.stepCard}>
                        <div className={styles.stepNumber}>4</div>
                        <h3>Get Hired</h3>
                        <p>Apply with one click. Track applications and schedule interviews easily.</p>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default HowItWorks;

