import Link from 'next/link';
import styles from './sections.module.css';

interface CTAProps {
    title?: string | React.ReactNode;
    description?: string;
    buttonText?: string;
    buttonLink?: string;
    glass?: boolean;
}

const CTA = ({
    title = 'Ready to Transform Your Hiring?',
    description = 'Join 10,000+ companies and job seekers using TalentMesh today. Start for free, no credit card required.',
    buttonText = 'Get Started Now',
    buttonLink = '/portals/jobs/contact',
    glass = false,
}: CTAProps) => {
    return (
        <section className={`${styles.cta} ${glass ? styles.ctaGlass : ''}`}>
            <div className={styles.container}>
                <div className={`${styles.ctaCard} ${glass ? styles.ctaCardGlass : ''}`}>
                    <div className={styles.ctaContent}>
                        <h2 className={`${styles.ctaTitle} ${glass ? styles.ctaTitleGlass : ''}`}>{title}</h2>
                        <p className={`${styles.ctaDesc} ${glass ? styles.ctaDescGlass : ''}`}>{description}</p>
                        <Link href={buttonLink} className={styles.ctaBtn}>
                            {buttonText}
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default CTA;
