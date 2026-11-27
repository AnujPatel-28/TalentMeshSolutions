'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { ABOUT_PRINCIPLES } from '@/content/about';
import { createScrub } from '@/components/home/scrub';
import styles from './about.module.css';

// Pinned-sequence rules shared with the home page's "What Sets Us Apart"
// (components/home/WhyUs.tsx). Must match the media query in about.module.css.
const PIN_QUERY = '(min-height: 520px)';
// With reduced motion (an accessibility setting, but also switched on by many
// phones' battery savers) the sequence still runs, as a calm version: nothing
// slides, zooms, rolls or reframes; text and photos cross-fade in place.
const CALM_QUERY = '(prefers-reduced-motion: reduce)';

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const smooth = (t: number) => t * t * (3 - 2 * t);

const HEAD_WORDS = [
  ABOUT_PRINCIPLES.headingA.split(' '),
  ABOUT_PRINCIPLES.headingB.split(' '),
  ABOUT_PRINCIPLES.lede.split(' '),
];
const WORD_COUNT = HEAD_WORDS.flat().length;
const COUNT = ABOUT_PRINCIPLES.points.length;
const num = (i: number) => String(i + 1).padStart(2, '0');

/**
 * Dark band, staged like the home page's photo sequence, with one value
 * driving everything once the stage pins: `at`, the principle on show
 * (fractional while two trade places). From it, in step with each other:
 * the photo cross-fades and settles, the copy hands over in place, the
 * counter rolls by exactly one, and the progress bar fills. Before that,
 * the heading's words light up and the stage opens from an inset frame to
 * full bleed; it closes again as it leaves.
 *
 * Without script, or with reduced motion or a short screen, the stage does
 * not pin: the first photo shows with all three principles listed over it.
 */
export default function Principles() {
  const bandRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const band = bandRef.current;
    if (!band) return;
    const track = band.querySelector(`.${styles.pinTrack}`) as HTMLElement;
    const stage = track.firstElementChild as HTMLElement;
    const photos = Array.from(stage.querySelectorAll<HTMLElement>(`.${styles.pinPhoto}`));
    const texts = Array.from(stage.querySelectorAll<HTMLElement>(`.${styles.pinText}`));
    const bars = Array.from(stage.querySelectorAll<HTMLElement>(`.${styles.pinBars} i`));
    const mq = window.matchMedia(PIN_QUERY);
    const calmMq = window.matchMedia(CALM_QUERY);
    let calm = false;
    let vh = 0;
    let seg = 0; // px of scroll each principle gets

    const all = [band, stage, ...photos, ...texts, ...bars];
    const clear = () => {
      delete band.dataset.pinned;
      delete band.dataset.calm;
      all.forEach((el) =>
        ['--pin-dist', '--pin-fill', '--pin-grow', '--pin-at', '--pin-show', '--pin-o', '--pin-y', '--pin-bar'].forEach(
          (name) => el.style.removeProperty(name)
        )
      );
    };

    // `v` is how far the track's top is above the viewport's: negative while
    // the stage is still on its way up, then 0 to the pin's length.
    const update = (v: number) => {
      if (!seg) return;
      // The heading has fully lit by the time the stage is three-quarters up.
      band.style.setProperty('--pin-fill', clamp01((v + vh * 1.2) / (vh * 0.45)).toFixed(3));
      const leaving = clamp01((v - seg * COUNT) / vh);
      const grow = calm ? 1 : Math.min(clamp01(1 + v / vh), clamp01(1 - leaving * 1.4));
      band.style.setProperty('--pin-grow', grow.toFixed(3));

      // The first principle is already in place as the stage arrives. Each
      // stretch holds its principle for 35%, then hands over to the next.
      const u = clamp01(v / (seg * COUNT)) * COUNT;
      const k = Math.min(COUNT - 1, Math.floor(u));
      const at = Math.min(COUNT - 1, k + smooth(clamp01((u - k - 0.35) / 0.65)));

      // Calm: the counter changes digit with the hand-over instead of rolling.
      stage.style.setProperty('--pin-at', (calm ? Math.round(at) : at).toFixed(4));
      photos.forEach((el, i) => el.style.setProperty('--pin-show', i ? clamp01(at - i + 1).toFixed(3) : '1'));
      texts.forEach((el, i) => {
        const d = i - at;
        // Out, then in: the two never overlap, so the hand-over stays clean.
        el.style.setProperty('--pin-o', clamp01(1 - Math.abs(d) * 2.4).toFixed(3));
        el.style.setProperty('--pin-y', calm ? '0px' : `${(d * 32).toFixed(1)}px`);
      });
      bars.forEach((el, i) => el.style.setProperty('--pin-bar', (i ? clamp01(at - i + 1) : 1).toFixed(3)));
    };
    const scrub = createScrub(
      () => Math.min(seg * COUNT + vh, Math.max(-vh * 1.3, -track.getBoundingClientRect().top)),
      update
    );
    const layout = () => {
      if (mq.matches) {
        band.dataset.pinned = '';
        calm = calmMq.matches;
        if (calm) band.dataset.calm = '';
        else delete band.dataset.calm;
        // The stage's own height, not the window's, so the address bar
        // sliding away on a phone does not make the copy jump.
        vh = stage.offsetHeight;
        seg = vh * 0.7;
        band.style.setProperty('--pin-dist', `${seg * COUNT}px`);
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
    calmMq.addEventListener('change', layout);
    window.addEventListener('resize', layout);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      mq.removeEventListener('change', layout);
      calmMq.removeEventListener('change', layout);
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
        {/* data-nav-theme: the navbar turns transparent with the white logo
            while it sits over this stage. */}
        <div className={styles.pinStage} data-nav-theme="dark">
          <div className={styles.pinPhotos}>
            {ABOUT_PRINCIPLES.points.map((pt) => (
              <Image key={pt.image} src={pt.image} alt={pt.imageAlt} fill sizes="100vw" className={styles.pinPhoto} />
            ))}
          </div>

          <div className={styles.pinCopy}>
            {/* One counter for the whole sequence: the tens digit stays, the
                units digit rolls 1 → 2 → 3 with the hand-over. */}
            <span className={`${styles.principleNum} ${styles.pinCounter}`} aria-hidden="true">
              0
              <span className={styles.rollWindow}>
                <span className={styles.rollStrip}>
                  {ABOUT_PRINCIPLES.points.map((pt, i) => (
                    <span key={pt.title}>{i + 1}</span>
                  ))}
                </span>
              </span>
            </span>
            <ol className={styles.pinTexts}>
              {ABOUT_PRINCIPLES.points.map((pt, i) => (
                <li key={pt.title} className={styles.pinText}>
                  <span className={`${styles.principleNum} ${styles.pinItemNum}`} aria-hidden="true">
                    {num(i)}
                  </span>
                  <h3 className={styles.principleTitle}>{pt.title}</h3>
                  <p className={styles.principleDesc}>{pt.description}</p>
                </li>
              ))}
            </ol>
          </div>

          <div className={styles.pinBars} aria-hidden="true">
            {ABOUT_PRINCIPLES.points.map((pt) => (
              <i key={pt.title} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
