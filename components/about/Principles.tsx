'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ABOUT_PRINCIPLES } from '@/content/about';
import AnimateOnScroll from '@/components/AnimateOnScroll';
import styles from './about.module.css';

/**
 * Dark band: heading, then a pinned story. While the reader scrolls through
 * the tall wrapper, the stage stays on screen and the three principles take
 * turns, each with its own photo cross-fading behind a navy wash.
 *
 * Without scripting the stage is not pinned and all three principles show
 * stacked over the first photo (see `html.js-ready` rules in about.module.css).
 */
export default function Principles() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const count = ABOUT_PRINCIPLES.points.length;

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const stage = wrap.firstElementChild as HTMLElement | null;
      const r = wrap.getBoundingClientRect();
      const travel = r.height - (stage?.offsetHeight ?? 0);
      const progress = Math.min(0.999, Math.max(0, -r.top / Math.max(1, travel)));
      setStep(Math.floor(progress * count));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(frame);
    };
  }, [count]);

  const state = (i: number) => (i === step ? styles.isOn : i < step ? styles.isPast : '');

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

      <div ref={wrapRef} className={styles.pinWrap}>
        <div className={styles.pinStage}>
          <div className={styles.pinPhotos}>
            {ABOUT_PRINCIPLES.points.map((pt, i) => (
              <Image
                key={pt.image}
                src={pt.image}
                alt={pt.imageAlt}
                fill
                sizes="(max-width: 1248px) 100vw, 1200px"
                className={`${styles.pinPhoto} ${state(i)}`}
              />
            ))}
          </div>
          <div className={styles.pinWash} aria-hidden="true" />

          <ol className={styles.pinStory}>
            {ABOUT_PRINCIPLES.points.map((pt, i) => (
              <li key={pt.title} className={`${styles.pinItem} ${state(i)}`}>
                <span className={styles.principleNum} aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className={styles.principleTitle}>{pt.title}</h3>
                <p className={styles.principleDesc}>{pt.description}</p>
              </li>
            ))}
          </ol>

          <div className={styles.pinDots} aria-hidden="true">
            {ABOUT_PRINCIPLES.points.map((pt, i) => (
              <i key={pt.title} className={i === step ? styles.isOn : ''} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
