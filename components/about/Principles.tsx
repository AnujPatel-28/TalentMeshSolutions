'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { ABOUT_PRINCIPLES } from '@/content/about';
import { createScrub } from '@/components/home/scrub';
import styles from './about.module.css';

// Same pinned-sequence rules as the home page's "What Sets Us Apart"
// (components/home/WhyUs.tsx). Must match the media query in about.module.css.
const PIN_QUERY = '(min-height: 640px) and (prefers-reduced-motion: no-preference)';

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

const HEAD_WORDS = [
  ABOUT_PRINCIPLES.headingA.split(' '),
  ABOUT_PRINCIPLES.headingB.split(' '),
  ABOUT_PRINCIPLES.lede.split(' '),
];
const WORD_COUNT = HEAD_WORDS.flat().length;

/**
 * Dark band, staged like the home page's photo sequence. Where PIN_QUERY
 * matches, scroll drives three things: the heading's words light up as it
 * comes up the screen, the photo stage opens from an inset frame to full
 * bleed as it pins (and closes again as it leaves), and each principle rides
 * up to its place while its photo fades in over the last. Elsewhere, and
 * without script, the three principles stack as plain photo panels.
 */
export default function Principles() {
  const bandRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const band = bandRef.current;
    if (!band) return;
    const track = band.querySelector(`.${styles.pinTrack}`) as HTMLElement;
    const stage = track.firstElementChild as HTMLElement;
    const items = Array.from(track.querySelectorAll('article'));
    const dots = Array.from(track.querySelectorAll(`.${styles.pinDots} i`));
    const mq = window.matchMedia(PIN_QUERY);
    let vh = 0;
    let seg = 0; // px of scroll each principle gets

    const clear = () => {
      delete band.dataset.pinned;
      ['--pin-dist', '--pin-fill', '--pin-grow'].forEach((name) => band.style.removeProperty(name));
      items.forEach((item) => {
        item.style.removeProperty('--pin-y');
        item.style.removeProperty('--pin-show');
      });
    };

    // `v` is how far the track's top is above the viewport's: negative while
    // the stage is still on its way up, then 0 to the pin's length.
    const update = (v: number) => {
      if (!seg) return;
      band.style.setProperty('--pin-fill', clamp01((v + vh + 240) / (vh * 0.45 + 240)).toFixed(3));
      const leaving = clamp01((v - seg * items.length) / vh);
      const grow = Math.min(clamp01(1 + v / vh), clamp01(1 - leaving * 1.4));
      band.style.setProperty('--pin-grow', grow.toFixed(3));

      // Each principle takes the first 60% of its stretch to arrive and rests
      // for the remainder. `at` is the one in place, fractional while two are
      // trading; it starts at -1 with the first one a stage below.
      const u = clamp01(v / (seg * items.length)) * items.length;
      const k = Math.min(items.length - 1, Math.floor(u));
      const q = clamp01((u - k) / 0.6);
      const at = k - 1 + q * q * (3 - 2 * q);
      items.forEach((item, i) => {
        item.style.setProperty('--pin-y', `${((i - at) * vh).toFixed(1)}px`);
        // The first photo is the stage's ground; the rest fade in over it.
        item.style.setProperty('--pin-show', i ? clamp01(at - i + 1).toFixed(3) : '1');
      });
      const active = Math.max(0, Math.round(at));
      dots.forEach((dot, i) => dot.classList.toggle(styles.isOn, i === active));
    };
    const scrub = createScrub(
      () => Math.min(seg * items.length + vh, Math.max(-vh - 400, -track.getBoundingClientRect().top)),
      update
    );
    const layout = () => {
      if (mq.matches) {
        band.dataset.pinned = '';
        // The stage's own height, not the window's, so the address bar
        // sliding away on a phone does not make the text jump.
        vh = stage.offsetHeight;
        seg = vh * 0.6;
        band.style.setProperty('--pin-dist', `${seg * items.length}px`);
        scrub.snap();
      } else {
        seg = 0;
        clear();
      }
    };
    const onScroll = () => {
      if (seg) scrub.kick();
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
      clear();
    };
  }, []);

  // Each word carries its index so CSS can light them in order from --pin-fill.
  let wordIndex = 0;
  const words = (list: string[]) =>
    list.map((w) => (
      <span key={wordIndex} className={styles.pinWord} style={{ '--i': wordIndex++ } as React.CSSProperties}>
        {w}{' '}
      </span>
    ));

  return (
    <div ref={bandRef}>
      <div
        className={`${styles.inner} ${styles.principlesHead}`}
        style={{ '--pin-words': WORD_COUNT } as React.CSSProperties}
      >
        <div>
          <p className={styles.eyebrow}>{ABOUT_PRINCIPLES.eyebrow}</p>
          <h2 className={styles.h2}>
            {words(HEAD_WORDS[0])}
            <br />
            <span className={styles.accent}>{words(HEAD_WORDS[1])}</span>
          </h2>
        </div>
        <p className={styles.lede}>{words(HEAD_WORDS[2])}</p>
      </div>

      <div className={styles.pinTrack}>
        <div className={styles.pinStage}>
          {ABOUT_PRINCIPLES.points.map((pt, i) => (
            <article key={pt.title} className={styles.pinItem}>
              <Image src={pt.image} alt={pt.imageAlt} fill sizes="100vw" className={styles.pinPhoto} />
              <div className={styles.pinText}>
                <span className={styles.principleNum} aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className={styles.principleTitle}>{pt.title}</h3>
                <p className={styles.principleDesc}>{pt.description}</p>
              </div>
            </article>
          ))}
          <div className={styles.pinDots} aria-hidden="true">
            {ABOUT_PRINCIPLES.points.map((pt, i) => (
              <i key={pt.title} className={i === 0 ? styles.isOn : ''} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
