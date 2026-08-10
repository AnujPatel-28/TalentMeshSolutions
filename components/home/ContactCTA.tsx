import Link from 'next/link';
import { MapPin, Phone, Mail } from 'lucide-react';
import { CONTACT, CONTACT_BAND } from '@/content/home';
import styles from './home.module.css';

export default function ContactCTA() {
    return (
        <section className={styles.section} id="contact">
            <div className={styles.inner}>
                <div className={styles.contactCard}>
                    <div>
                        <h2 className={styles.contactHeading}>{CONTACT_BAND.heading}</h2>
                        <p className={styles.contactDesc}>{CONTACT_BAND.description}</p>
                        <Link href={CONTACT_BAND.cta.href} className={styles.btnPrimary}>
                            {CONTACT_BAND.cta.label}
                        </Link>
                    </div>

                    <address className={styles.contactDetails}>
                        <div className={styles.contactRow}>
                            <MapPin size={18} strokeWidth={1.75} aria-hidden="true" />
                            <span>
                                <strong>{CONTACT.legalName}</strong>
                                <br />
                                {CONTACT.addressLines.map((line) => (
                                    <span key={line}>
                                        {line}
                                        <br />
                                    </span>
                                ))}
                            </span>
                        </div>

                        <div className={styles.contactRow}>
                            <Phone size={18} strokeWidth={1.75} aria-hidden="true" />
                            <a href={CONTACT.phoneHref}>{CONTACT.phoneDisplay}</a>
                        </div>

                        <div className={styles.contactRow}>
                            <Mail size={18} strokeWidth={1.75} aria-hidden="true" />
                            <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
                        </div>
                    </address>
                </div>
            </div>
        </section>
    );
}
