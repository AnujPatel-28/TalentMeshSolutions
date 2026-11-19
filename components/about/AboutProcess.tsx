'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ABOUT_PROCESS } from '@/content/about';
import AnimateOnScroll from '@/components/AnimateOnScroll';
import { createScrub } from '@/components/home/scrub';
import styles from './about.module.css';

// Pins only where the stage fits; must match the media query in about.module.css.
const PIN_QUERY = '(min-height: 600px)';
const COUNT = ABOUT_PROCESS.steps.length;
// How long each step's stretch of scroll is, as a share of the stage height.
const SEG = 0.8;
// Share of each stretch that holds the step still before the next opens.
const HOLD = 0.4;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const smooth = (t: number) => t * t * (3 - 2 * t);

/**
 * Four photo panels, one per step. The open panel widens (desktop) or grows
 * taller (stacked) and shows its copy; the rest show a number and title.
 *
 * Where the screen is tall enough, the section pins while you scroll and the
 * panels follow the scroll: each step holds for a moment, then the next
 * panel widens as the current one narrows. The value behind it is eased
 * (see createScrub), so a hard flick of the wheel becomes a short glide
 * instead of a jump. Clicking (or tabbing to) a panel scrolls the page to
 * that step, and the panels glide there with it. Without script or on short
 * screens it does not pin; panels open on click. The first step is open on
 * the server render, and every step's copy stays in the DOM for search
 * engines and screen readers.
 */
export default function AboutProcess() {
  const [open, setOpen] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const segRef = useRef(0); // px of scroll per step; 0 when not pinned

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const stage = track.firstElementChild as HTMLElement;
    const doors = Array.from(stage.querySelectorAll<HTMLElement>(`.${styles.door}`));
    const mq = window.matchMedia(PIN_QUERY);

    // `v` is how far the track's top is above the viewport's top.
    const update = (v: number) => {
      const seg = segRef.current;
      if (!seg) return;
      const u = clamp01(v / (seg * COUNT)) * COUNT;
      const k = Math.min(COUNT - 1, Math.floor(u));
      const at = Math.min(COUNT - 1, k + smooth(clamp01((u - k - HOLD) / (1 - HOLD))));
      // --w: how open each panel is, 0 to 1. CSS turns it into a width.
      doors.forEach((el, i) => el.style.setProperty('--w', clamp01(1 - Math.abs(at - i)).toFixed(4)));
      setOpen(Math.round(at));
    };
    const scrub = createScrub(
      () => Math.min(segRef.current * COUNT, Math.max(0, -track.getBoundingClientRect().top)),
      update,
      120
    );
    const layout = () => {
      if (mq.matches) {
        track.dataset.pinned = '';
        // The stage's own height, not the window's, so the address bar
        // sliding away on a phone does not shift the steps.
        segRef.current = stage.offsetHeight * SEG;
        track.style.setProperty('--pin-dist', `${segRef.current * COUNT}px`);
        scrub.snap();
      } else {
        segRef.current = 0;
        delete track.dataset.pinned;
        track.style.removeProperty('--pin-dist');
        doors.forEach((el) => el.style.removeProperty('--w'));
      }
    };
    const onScroll = () => {
      if (segRef.current) scrub.kick();
    };

    layout();
    mq.addEventListener('change', layout);
    window.addEventListener('resize', layout);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      mq.removeEventListener('change', layout);
      window.removeEventListener('resize', layout);
      window.removeEventListener('scroll', onScroll);
      scrub.stop();
    };
  }, []);

  const go = (i: number) => {
    const seg = segRef.current;
    const track = trackRef.current;
    if (!seg || !track) {
      setOpen(i);
      return;
    }
    // Middle of step i's hold, so it rests fully open there.
    const top = window.scrollY + track.getBoundingClientRect().top + seg * (i + HOLD / 2);
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
