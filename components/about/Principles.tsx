import { Target, LifeBuoy, Layers } from 'lucide-react';
import { ABOUT_PRINCIPLES } from '@/content/about';
import AnimateOnScroll from '@/components/AnimateOnScroll';
import styles from './about.module.css';

const ICONS = {
  target: Target,
  lifeBuoy: LifeBuoy,
  layers: Layers,
} as const;

/**
 * Owns its own entrance animation (heading/lede, then each card staggered
 * ~90ms) instead of being wrapped externally — see the no-double-wrap note
 * on VisionStatement's usage in app/about/page.tsx.
 */
export default function Principles() {
  return (
    <div className={styles.inner}>
      <AnimateOnScroll animation="fadeUp" once>
        <h2 className={styles.h2}>
          {ABOUT_PRINCIPLES.headingA}
          <br />
          {ABOUT_PRINCIPLES.headingB}
        </h2>
        <p className={styles.lede}>{ABOUT_PRINCIPLES.lede}</p>
      </AnimateOnScroll>
      <div className={styles.cardGrid3}>
        {ABOUT_PRINCIPLES.points.map((pt, i) => {
          const Icon = ICONS[pt.icon as keyof typeof ICONS] ?? Target;
          return (
            <AnimateOnScroll
              key={pt.title}
              as="article"
              className={styles.card}
              animation="fadeUp"
              delay={i * 90}
              once
            >
              <span className={styles.cardIcon} aria-hidden="true">
                <Icon strokeWidth={2} />
              </span>
              <h3 className={styles.cardTitle}>{pt.title}</h3>
              <p className={styles.cardDesc}>{pt.description}</p>
            </AnimateOnScroll>
          );
        })}
      </div>
    </div>
  );
}
