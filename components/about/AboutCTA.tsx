import Link from 'next/link';
import { Phone, Mail, MapPin, ArrowRight } from 'lucide-react';
import { ABOUT_CTA } from '@/content/about';
import { CONTACT, STRONG_CTA } from '@/content/home';
import styles from './about.module.css';

export default function AboutCTA() {
  return (
    <div className={styles.inner}>
      <div className={styles.ctaCard}>
        <div>
          <h2 className={styles.ctaHeading}>
            {ABOUT_CTA.headingA} <span className={styles.accent}>{ABOUT_CTA.headingAccent}</span>
          </h2>
          <p className={styles.ctaDesc}>{ABOUT_CTA.subtext}</p>
          <Link href={ABOUT_CTA.buttonHref} className={styles.btnPrimary}>
            {ABOUT_CTA.buttonLabel}
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
        <address className={styles.ctaDetails}>
          <div className={styles.ctaBase}>
            <h3>{ABOUT_CTA.baseTitle}</h3>
            <p>{ABOUT_CTA.baseBody}</p>
          </div>
          <div className={styles.ctaRow}>
            <Phone size={18} aria-hidden="true" />
            <div>
              <span className={styles.ctaLabel}>Call us</span>
              <a href={STRONG_CTA.phoneHref}>{STRONG_CTA.phoneDisplay}</a>
            </div>
          </div>
          <div className={styles.ctaRow}>
            <Mail size={18} aria-hidden="true" />
            <div>
              <span className={styles.ctaLabel}>Email us</span>
              <a href={STRONG_CTA.emailHref}>{STRONG_CTA.email}</a>
            </div>
          </div>
          <div className={styles.ctaRow}>
            <MapPin size={18} aria-hidden="true" />
            <div>
              <span className={styles.ctaLabel}>Visit us</span>
              <strong>{CONTACT.legalName}</strong>
              {CONTACT.addressLines.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </div>
          </div>
        </address>
      </div>
    </div>
  );
}
