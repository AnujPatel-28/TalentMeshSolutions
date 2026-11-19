'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ABOUT_PROCESS } from '@/content/about';
import AnimateOnScroll from '@/components/AnimateOnScroll';
import styles from './about.module.css';

// Pins only where the stage fits; must match the media query in about.module.css.
const PIN_QUERY = '(min-height: 600px)';
const COUNT = ABOUT_PROCESS.steps.length;

/**
 * Four photo panels, one per step. The open panel widens (desktop) or grows
 * taller (stacked) and shows its copy; the rest show a number and title.
 *
 * Where the screen is tall enough, the section pins while you scroll and
 * each stretch of scroll opens the next panel. Clicking (or tabbing to) a
 * panel opens it and scrolls the page to that panel's stretch, so scroll and
 * panel stay in step. Without script or on short screens it does not pin;
 * panels open on click. The first step is open on the server render, and
 * every step's copy stays in the DOM for search engines and screen readers.
 */
export default function AboutProcess() {
  const [open, setOpen] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const segRef = useRef(0); // px of scroll per step; 0 when not pinned
  const lockRef = useRef(0); // ignore scroll-driven updates until this time

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const stage = track.firstElementChild as HTMLElement;
    const mq = window.matchMedia(PIN_QUERY);

    const sync = () => {
      const seg = segRef.current;
      if (!seg || performance.now() < lockRef.current) return;
      const v = -track.getBoundingClientRect().top;
      setOpen(Math.min(COUNT - 1, Math.max(0, Math.floor(v / seg))));
    };
    const layout = () => {
      if (mq.matches) {
        track.dataset.pinned = '';
        // The stage's own height, not the window's, so the address bar
        // sliding away on a phone does not shift the steps.
        segRef.current = stage.offsetHeight * 0.6;
        track.style.setProperty('--pin-dist', `${segRef.current * COUNT}px`);
        sync();
      } else {
        segRef.current = 0;
        delete track.dataset.pinned;
        track.style.removeProperty('--pin-dist');
      }
    };

    layout();
    mq.addEventListener('change', layout);
    window.addEventListener('resize', layout);
    window.addEventListener('scroll', sync, { passive: true });
    return () => {
      mq.removeEventListener('change', layout);
      window.removeEventListener('resize', layout);
      window.removeEventListener('scroll', sync);
    };
  }, []);

  const go = (i: number) => {
    setOpen(i);
    const seg = segRef.current;
    const track = trackRef.current;
    if (!seg || !track) return;
    const top = window.scrollY + track.getBoundingClientRect().top + seg * (i + 0.5);
    if (Math.abs(top - window.scrollY) < seg / 2) return;
    // Hold the chosen panel while the page glides there, so it does not
    // flick through the panels in between.
    lockRef.current = performance.now() + 900;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' });
  };

  return (
    <div ref={trackRef} className={styles.processTrack}>
      <div className={`${styles.inner} ${styles.processStage}`}>
        <AnimateOnScroll className={styles.head} animation="fadeUp" once>
          <h2 className={styles.h2}>
            {ABOUT_PROCESS.headingA} <span className={styles.accent}>{ABOUT_PROCESS.headingAccent}</span>
          </h2>
          <p className={styles.lede}>{ABOUT_PROCESS.lede}</p>
        </AnimateOnScroll>
        <ol className={styles.doors}>
          {ABOUT_PROCESS.steps.map((step, i) => {
            const isOpen = i === open;
            const bodyId = `about-step-${step.num}`;
            return (
              <li key={step.num} className={styles.door} data-open={isOpen || undefined}>
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
                  onClick={() => go(i)}
                  onFocus={(e) => {
                    // Keyboard focus only; a click is handled above.
                    if (e.currentTarget.matches(':focus-visible')) go(i);
                  }}
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
      </div>
    </div>
  );
}
