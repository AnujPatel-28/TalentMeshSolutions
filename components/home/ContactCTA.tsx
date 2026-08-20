import Link from 'next/link';
import { STRONG_CTA } from '@/content/home';
import SplitText from '@/components/reactbits/SplitText';
import styles from './home.module.css';

export default function ContactCTA() {
    return (
        <section className={styles.section} id="contact">
            <div className={styles.inner}>
                <div className={styles.contactCard}>
                    <div>
                        <SplitText tag="h2" text={STRONG_CTA.heading} className={styles.contactHeading} delay={28} duration={0.7} ease="power3.out" splitType="chars" from={{ opacity: 0, y: 24 }} to={{ opacity: 1, y: 0 }} threshold={0.1} rootMargin="-80px" textAlign="left" />
                        <p className={styles.contactDesc}>{STRONG_CTA.subtext}</p>
                        <Link href={STRONG_CTA.buttonHref} className={styles.btnPrimary}>
                            {STRONG_CTA.buttonLabel}
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}

