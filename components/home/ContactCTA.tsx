import Link from 'next/link';
import { Phone, Mail } from 'lucide-react';
import { STRONG_CTA } from '@/content/home';
import styles from './home.module.css';

export default function ContactCTA() {
    return (
        <section className={styles.section} id="contact">
            <div className={styles.inner}>
                <div className={styles.contactCard}>
                    <div>
                        <h2 className={styles.contactHeading}>{STRONG_CTA.heading}</h2>
                        <p className={styles.contactDesc}>{STRONG_CTA.subtext}</p>
                        <Link href={STRONG_CTA.buttonHref} className={styles.btnPrimary}>
                            {STRONG_CTA.buttonLabel}
                        </Link>
                    </div>


                    <address className={styles.contactDetails}>
                        <div className={styles.contactRow}>
                            <Phone size={20} strokeWidth={2} aria-hidden="true" />
                            <div>
                                <span className={styles.contactMetaLabel}>Mobile:</span>
                                <a href={STRONG_CTA.phoneHref} className={styles.contactLink}>
                                    {STRONG_CTA.phoneDisplay}
                                </a>
                            </div>
                        </div>

                        <div className={styles.contactRow}>
                            <Mail size={20} strokeWidth={2} aria-hidden="true" />
                            <div>
                                <span className={styles.contactMetaLabel}>Email:</span>
                                <a href={STRONG_CTA.emailHref} className={styles.contactLink}>
                                    {STRONG_CTA.email}
                                </a>
                            </div>
                        </div>
                    </address>
                </div>
            </div>
        </section>
    );
}

