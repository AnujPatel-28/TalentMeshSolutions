import Image from 'next/image';
import { ABOUT_PROCESS } from '@/content/about';
import AnimateOnScroll from '@/components/AnimateOnScroll';
import styles from './about.module.css';

/**
 * Owns its own entrance animation (heading/lede, then each step staggered
 * ~90ms) instead of being wrapped externally — see the no-double-wrap note
 * on Principles' usage in app/about/page.tsx.
 */
export default function AboutProcess() {
  return (
    <div className={styles.inner}>
      <AnimateOnScroll animation="fadeUp" once>
        <h2 className={styles.h2}>{ABOUT_PROCESS.heading}</h2>
        <p className={styles.lede}>{ABOUT_PROCESS.lede}</p>
      </AnimateOnScroll>
      <div className={styles.processGrid}>
        <Image
          src={ABOUT_PROCESS.imageSrc}
          alt={ABOUT_PROCESS.imageAlt}
          width={1536}
          height={1152}
          loading="lazy"
          sizes="(max-width: 1024px) 100vw, 480px"
          className={styles.processImage}
        />
        <ol className={styles.stepList}>
          {ABOUT_PROCESS.steps.map((step, i) => (
            <AnimateOnScroll
              key={step.num}
              as="li"
              className={styles.step}
              animation="fadeUp"
              delay={i * 90}
              once
            >
              <span className={styles.stepNum}>{step.num}</span>
              <div>
                <p className={styles.stepTitle}>{step.title}</p>
                <p className={styles.stepDesc}>{step.desc}</p>
              </div>
            </AnimateOnScroll>
          ))}
        </ol>
      </div>
    </div>
  );
}
