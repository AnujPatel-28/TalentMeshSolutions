import Image from 'next/image';
import { ABOUT_WHO, ABOUT_WHO_IMAGE } from '@/content/about';
import AnimateOnScroll from '@/components/AnimateOnScroll';
import styles from './about.module.css';

/**
 * Statement on the left, one tall 4:5 photo on the right, and the proof row
 * underneath. Owns its own entrance animation, so it is not wrapped again in
 * app/about/page.tsx.
 */
export default function WhoWeAre() {
  return (
    <div className={styles.inner}>
      <div className={styles.whoGrid}>
        <AnimateOnScroll animation="fadeUp" once>
          <p className={styles.eyebrow}>{ABOUT_WHO.eyebrow}</p>
          <h2 id="about-who" className={`${styles.h2} ${styles.whoStatement}`}>
            {ABOUT_WHO.headingA} <span className={styles.accent}>{ABOUT_WHO.headingAccent}</span>
          </h2>
          <p className={styles.whoIntro}>{ABOUT_WHO.intro}</p>
          <p className={styles.whoBody}>{ABOUT_WHO.body}</p>
        </AnimateOnScroll>
        <AnimateOnScroll as="figure" className={styles.whoFigure} animation="fadeUp" delay={120} once>
          <Image
            src={ABOUT_WHO_IMAGE}
            alt={ABOUT_WHO.imageAlt}
            fill
            sizes="(max-width: 900px) 92vw, 480px"
            className={styles.coverImage}
          />
        </AnimateOnScroll>
      </div>

      <AnimateOnScroll className={styles.proofRow} animation="fadeUp" once>
        <p className={styles.proofLead}>{ABOUT_WHO.positioning}</p>
        <ul className={styles.proofList}>
          {ABOUT_WHO.proof.map((item) => (
            <li key={item.label}>
              <p className={styles.proofValue}>
                {item.value} <span>{item.label}</span>
              </p>
              <p className={styles.proofNote}>{item.note}</p>
            </li>
          ))}
        </ul>
      </AnimateOnScroll>
    </div>
  );
}
