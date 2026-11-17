import { ABOUT_PRINCIPLES } from '@/content/about';
import AnimateOnScroll from '@/components/AnimateOnScroll';
import styles from './about.module.css';

/**
 * Dark band: the three principles as numbered editorial rows, not cards.
 * Owns its own entrance animation (heading, then each row staggered), so it
 * is not wrapped again in app/about/page.tsx.
 */
export default function Principles() {
  return (
    <div className={styles.inner}>
      <AnimateOnScroll className={styles.principlesHead} animation="fadeUp" once>
        <div>
          <p className={styles.eyebrow}>{ABOUT_PRINCIPLES.eyebrow}</p>
          <h2 className={styles.h2}>
            {ABOUT_PRINCIPLES.headingA}
            <br />
            <span className={styles.accent}>{ABOUT_PRINCIPLES.headingB}</span>
          </h2>
        </div>
        <p className={styles.lede}>{ABOUT_PRINCIPLES.lede}</p>
      </AnimateOnScroll>
      <ol className={styles.principleList}>
        {ABOUT_PRINCIPLES.points.map((pt, i) => (
          <AnimateOnScroll
            key={pt.title}
            as="li"
            className={styles.principle}
            animation="fadeUp"
            delay={i * 90}
            once
          >
            <span className={styles.principleNum} aria-hidden="true">
              {String(i + 1).padStart(2, '0')}
            </span>
            <h3 className={styles.principleTitle}>{pt.title}</h3>
            <p className={styles.principleDesc}>{pt.description}</p>
          </AnimateOnScroll>
        ))}
      </ol>
    </div>
  );
}
