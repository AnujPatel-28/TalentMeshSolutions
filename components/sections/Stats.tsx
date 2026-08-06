import Image from 'next/image';
import styles from './sections.module.css';

const Stats = () => {
    // Content to repeat. We repeat it enough times to fill screens and loop seamlessly.
    const items = [
        "Find Your Dream Job",
        "Hire Top Talent",
        "Recruitment Platform",
        "Applicant Tracking",
        "Candidate Screening",
        "Interview Scheduling",
        "Career Development",
        "Talent Acquisition",
    ];

    return (
        <section className={styles.statsMarquee}>
            <div className={styles.marqueeContainer}>
                <div className={styles.marqueeTrack}>
                    {[...items, ...items].map((text, i) => (
                        <div key={i} className={styles.marqueeItem}>
                            <div className={styles.marqueeLogoWrapper}>
                                <Image
                                    src="/TalentMesh White Logo.png"
                                    alt="TalentMesh"
                                    width={72}
                                    height={72}
                                    className={styles.marqueeLogo}
                                />
                            </div>
                            <span className={styles.marqueeText}>{text}</span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Stats;

