import Link from 'next/link';
import { Phone, Mail, MapPin } from 'lucide-react';
import { CONTACT, STRONG_CTA } from '@/content/home';
import SectionMarker from './SectionMarker';
import SplitText from '@/components/reactbits/SplitText';
import styles from './home.module.css';

export default function ContactCTA() {
    return (
        <section className="relative" id="contact">
            <SectionMarker label="Get Started" index={6} />
            <div className={styles.section}>
                <div className={styles.inner}>
                    <div className={styles.contactCard}>
                        <div>
                            {/* delay is the per-character stagger. At 28ms the
                                41-character heading took ~1.9s to finish — and
                                it only starts after document.fonts.ready. 12ms
                                lands the whole line in well under a second. */}
                            <SplitText tag="h2" text={STRONG_CTA.heading} className={styles.contactHeading} delay={12} duration={0.6} ease="power3.out" splitType="chars" from={{ opacity: 0, y: 24 }} to={{ opacity: 1, y: 0 }} threshold={0.1} rootMargin="-80px" textAlign="left" />
                            <p className={styles.contactDesc}>{STRONG_CTA.subtext}</p>
                            <Link href={STRONG_CTA.buttonHref} className={styles.btnPrimary}>
                                {STRONG_CTA.buttonLabel}
                            </Link>
                        </div>

                        {/* Second column of .contactCard's grid. The styles below
                            already existed in home.module.css but nothing rendered
                            them, so this card sat half empty while the phone and
                            email went unpublished. */}
                        <address className={styles.contactDetails}>
                            <div className={styles.contactRow}>
                                <Phone size={18} aria-hidden="true" />
                                <div>
                                    <span className={styles.contactMetaLabel}>Call us</span>
                                    <a href={STRONG_CTA.phoneHref} className={styles.contactLink}>
                                        {STRONG_CTA.phoneDisplay}
                                    </a>
                                </div>
                            </div>

                            <div className={styles.contactRow}>
                                <Mail size={18} aria-hidden="true" />
                                <div>
                                    <span className={styles.contactMetaLabel}>Email us</span>
                                    <a href={STRONG_CTA.emailHref} className={styles.contactLink}>
                                        {STRONG_CTA.email}
                                    </a>
                                </div>
                            </div>

                            <div className={styles.contactRow}>
                                <MapPin size={18} aria-hidden="true" />
                                <div>
                                    <span className={styles.contactMetaLabel}>Visit us</span>
                                    {CONTACT.addressLines.map((line) => (
                                        <span key={line} className={styles.contactAddressLine}>
                                            {line}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <p className={styles.contactResponse}>
                                Screened shortlist in 48–72 hours for most mandates.
                            </p>
                        </address>
                    </div>
                </div>
            </div>
        </section>
    );
}
