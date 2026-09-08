import Image from 'next/image';
import { MapPin } from 'lucide-react';
import { ABOUT_INDUSTRIES } from '@/content/about';
import { CONTACT } from '@/content/home';
import AnimateOnScroll from '@/components/AnimateOnScroll';
import styles from './about.module.css';

/**
 * Owns its own entrance animation (heading/lede, then the pill list and the
 * base card staggered) instead of being wrapped externally — see the
 * no-double-wrap note on VisionStatement's usage in app/about/page.tsx.
 */
export default function AboutIndustries() {
  return (
    <div className={styles.inner}>
      <AnimateOnScroll animation="fadeUp" once>
        <h2 className={styles.h2}>{ABOUT_INDUSTRIES.heading}</h2>
        <p className={styles.lede}>{ABOUT_INDUSTRIES.lede}</p>
      </AnimateOnScroll>
      <div className={styles.splitGrid}>
        <AnimateOnScroll animation="fadeUp" delay={90} once>
          <ul className={styles.pillWrap} aria-label="Industries supported">
            {ABOUT_INDUSTRIES.industries.map((industry) => (
              <li key={industry} className={styles.pill}>
                {industry}
              </li>
            ))}
          </ul>
        </AnimateOnScroll>
        <AnimateOnScroll animation="fadeUp" delay={180} once>
          <aside className={styles.baseCard} aria-label="Company location">
            <Image
              src="/building bg.png"
              alt=""
              fill
              loading="lazy"
              sizes="(max-width: 1024px) 100vw, 400px"
              style={{ objectFit: 'cover', objectPosition: 'bottom' }}
            />
            <div className={styles.baseCardOverlay} />
            <div className={styles.baseCardContent}>
              <h3>{ABOUT_INDUSTRIES.baseTitle}</h3>
              <p>{ABOUT_INDUSTRIES.baseBody}</p>
              <div className={styles.baseMeta}>
                <span>
                  <MapPin size={14} aria-hidden="true" style={{ display: 'inline', verticalAlign: '-2px', marginRight: 6 }} />
                  <strong>{CONTACT.legalName}</strong>
                </span>
                {CONTACT.addressLines.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </div>
            </div>
          </aside>
        </AnimateOnScroll>
      </div>
    </div>
  );
}
