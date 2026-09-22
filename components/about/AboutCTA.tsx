import Link from 'next/link';
import { Phone, Mail, MapPin } from 'lucide-react';
import { ABOUT_CTA } from '@/content/about';
import { CONTACT, STRONG_CTA } from '@/content/home';
import styles from './about.module.css';

export default function AboutCTA() {
  return (
    <div className={styles.inner}>
      <div className={styles.ctaCard}>
        <div>
          <h2 className={styles.ctaHeading}>{ABOUT_CTA.heading}</h2>
          <p className={styles.ctaDesc}>{ABOUT_CTA.subtext}</p>
          <Link href={ABOUT_CTA.buttonHref} className={styles.btnPrimary}>
            {ABOUT_CTA.buttonLabel}
          </Link>
        </div>
        <address className={styles.ctaDetails}>
          <div className={styles.ctaRow}>
            <Phone size={18} aria-hidden="true" />
            <div>
              <div>Call us</div>
              <a href={STRONG_CTA.phoneHref}>{STRONG_CTA.phoneDisplay}</a>
            </div>
          </div>
          <div className={styles.ctaRow}>
            <Mail size={18} aria-hidden="true" />
            <div>
              <div>Email us</div>
              <a href={STRONG_CTA.emailHref}>{STRONG_CTA.email}</a>
            </div>
          </div>
          <div className={styles.ctaRow}>
            <MapPin size={18} aria-hidden="true" />
            <div>
              <div>Visit us</div>
              {CONTACT.addressLines.map((line) => (
                <div key={line}>{line}</div>
              ))}
            </div>
          </div>
        </address>
      </div>
    </div>
  );
}
