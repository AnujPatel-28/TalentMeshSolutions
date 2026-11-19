'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ABOUT_PROCESS } from '@/content/about';
import AnimateOnScroll from '@/components/AnimateOnScroll';
import styles from './about.module.css';

/**
 * Four photo panels, one per step. The open panel widens (desktop) or grows
 * taller (stacked) and shows its copy; the rest show a number and title.
 * Panels open on hover where the device has one, and on click or keyboard
 * focus everywhere. The first step is open on the server render, so the
 * section reads complete without script. Every step's copy stays in the
 * DOM for search engines and screen readers.
 */
export default function AboutProcess() {
  const [open, setOpen] = useState(0);

  const hoverOpen = (i: number) => {
    if (window.matchMedia('(hover: hover)').matches) setOpen(i);
  };

  return (
    <div className={styles.inner}>
      <AnimateOnScroll className={styles.head} animation="fadeUp" once>
        <h2 className={styles.h2}>
          {ABOUT_PROCESS.headingA} <span className={styles.accent}>{ABOUT_PROCESS.headingAccent}</span>
        </h2>
        <p className={styles.lede}>{ABOUT_PROCESS.lede}</p>
      </AnimateOnScroll>
      <AnimateOnScroll animation="fadeUp" delay={120} once>
        <ol className={styles.doors}>
          {ABOUT_PROCESS.steps.map((step, i) => {
            const isOpen = i === open;
            const bodyId = `about-step-${step.num}`;
            return (
              <li
                key={step.num}
                className={styles.door}
                data-open={isOpen || undefined}
                onPointerEnter={() => hoverOpen(i)}
              >
                <Image
                  src={step.image}
                  alt={step.alt}
                  fill
                  sizes="(max-width: 900px) 100vw, 60vw"
                  className={styles.doorPhoto}
                />
                <button
                  type="button"
                  className={styles.doorToggle}
                  aria-expanded={isOpen}
                  aria-controls={bodyId}
                  onClick={() => setOpen(i)}
                  onFocus={() => setOpen(i)}
                >
                  <span className={styles.doorTitle}>{step.title}</span>
                </button>
                <span className={styles.doorNum} aria-hidden="true">
                  {step.num}
                </span>
                <div id={bodyId} className={styles.doorBody}>
                  <h3>{step.title}</h3>
                  <p>{step.desc}</p>
                  <ul className={styles.doorTags}>
                    {step.tags.map((tag) => (
                      <li key={tag}>{tag}</li>
                    ))}
                  </ul>
                </div>
              </li>
            );
          })}
        </ol>
      </AnimateOnScroll>
    </div>
  );
}
