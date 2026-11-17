import { ABOUT_PROCESS } from '@/content/about';
import AnimateOnScroll from '@/components/AnimateOnScroll';
import styles from './about.module.css';

/**
 * Four connected steps: a horizontal timeline on desktop, vertical on phones.
 * Owns its own entrance animation (heading, then each step staggered), so it
 * is not wrapped again in app/about/page.tsx.
 */
export default function AboutProcess() {
  return (
    <div className={styles.inner}>
      <AnimateOnScroll className={styles.head} animation="fadeUp" once>
        <h2 className={styles.h2}>
          {ABOUT_PROCESS.headingA} <span className={styles.accent}>{ABOUT_PROCESS.headingAccent}</span>
        </h2>
        <p className={styles.lede}>{ABOUT_PROCESS.lede}</p>
      </AnimateOnScroll>
      <ol className={styles.timeline}>
        {ABOUT_PROCESS.steps.map((step, i) => (
          <AnimateOnScroll
            key={step.num}
            as="li"
            className={styles.timelineStep}
            animation="fadeUp"
            delay={i * 90}
            once
          >
            <span className={styles.timelineNode} aria-hidden="true">
              {step.num}
            </span>
            <div>
              <h3 className={styles.timelineTitle}>{step.title}</h3>
              <p className={styles.timelineDesc}>{step.desc}</p>
            </div>
          </AnimateOnScroll>
        ))}
      </ol>
    </div>
  );
}
