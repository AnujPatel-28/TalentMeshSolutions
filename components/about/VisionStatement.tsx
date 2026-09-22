'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import SplitText from '@/components/reactbits/SplitText';
import BlurText from '@/components/reactbits/BlurText';
import { ABOUT_VISION } from '@/content/about';
import styles from './about.module.css';

gsap.registerPlugin(ScrollTrigger);

/**
 * Full-viewport editorial statement.
 *
 * Kicker is static. Quote reveals once via SplitText (ink base, solid-blue
 * accent — same component as the homepage CTA heading); body and footnote
 * reveal once via BlurText. All trigger on scroll-into-view and settle fully,
 * unlike a continuous scroll-scrub. (The TextType typing variant is preserved
 * in git; TextType.jsx stays.)
 *
 * Side images: one-shot corner settle, same motion language as the text —
 * quote pair (top-left/top-right) and trust pair (bottom-left/bottom-right)
 * each fade + slide into their corner once when the section enters view,
 * lightly staggered top-then-bottom, then hold still. No exit animation:
 * they're `position: absolute` within the section, so scrolling the section
 * out of view carries them off naturally. Scoped via gsap.context so
 * neighbouring ScrollTrigger instances are never touched. On mobile/tablet
 * (<=1100px) the same four render in a 2x2 grid below the copy via
 * `.visionSides` with the identical settle tween. Reduced-motion and no-JS
 * render text-only static.
 */
export default function VisionStatement() {
  const [reduceMotion, setReduceMotion] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const aLeftRef = useRef<HTMLDivElement>(null);
  const aRightRef = useRef<HTMLDivElement>(null);
  const bLeftRef = useRef<HTMLDivElement>(null);
  const bRightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mqMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => {
      setReduceMotion(mqMotion.matches);
    };
    sync();
    mqMotion.addEventListener('change', sync);
    return () => {
      mqMotion.removeEventListener('change', sync);
    };
  }, []);

  const showSides = !reduceMotion;

  useEffect(() => {
    if (!showSides) return;
    const section = sectionRef.current;
    const aLeft = aLeftRef.current;
    const aRight = aRightRef.current;
    const bLeft = bLeftRef.current;
    const bRight = bRightRef.current;
    if (!section || !aLeft || !aRight || !bLeft || !bRight) return;

    const ctx = gsap.context(() => {
      // Fires once when the section is ~75% into the viewport — mirrors the
      // trigger point SplitText/BlurText use for the text, so the corners and
      // the words feel like one reveal rather than two mechanisms.
      const trigger = { trigger: section, start: 'top 75%', once: true };
      const base = { duration: 0.9, ease: 'power3.out' };

      // Quote pair (top corners), then trust pair (bottom corners) — a light
      // stagger so the four settle top-then-bottom instead of all at once.
      gsap.fromTo(
        aLeft,
        { xPercent: -60, opacity: 0, rotate: -5 },
        { xPercent: 0, opacity: 1, rotate: -1.5, ...base, scrollTrigger: trigger }
      );
      gsap.fromTo(
        aRight,
        { xPercent: 60, opacity: 0, rotate: 5 },
        { xPercent: 0, opacity: 1, rotate: 1.5, ...base, delay: 0.08, scrollTrigger: trigger }
      );
      gsap.fromTo(
        bLeft,
        { xPercent: -60, opacity: 0, rotate: -5 },
        { xPercent: 0, opacity: 1, rotate: -1.5, ...base, delay: 0.16, scrollTrigger: trigger }
      );
      gsap.fromTo(
        bRight,
        { xPercent: 60, opacity: 0, rotate: 5 },
        { xPercent: 0, opacity: 1, rotate: 1.5, ...base, delay: 0.24, scrollTrigger: trigger }
      );
    }, section);

    return () => ctx.revert();
  }, [showSides]);

  const [quoteLeft, quoteRight, trustLeft, trustRight] = ABOUT_VISION.sideImages;

  return (
    <section ref={sectionRef} className={styles.vision} aria-label="Our vision">
      {showSides && (
        <div className={styles.visionSides} aria-hidden="true">
          <div ref={aLeftRef} className={`${styles.visionSide} ${styles.visionSideLeft}`}>
            <Image
              src={quoteLeft.src}
              alt=""
              width={440}
              height={587}
              loading="lazy"
              sizes="(max-width: 640px) 45vw, 220px"
              className={styles.visionSideImage}
            />
          </div>
          <div ref={aRightRef} className={`${styles.visionSide} ${styles.visionSideRight}`}>
            <Image
              src={quoteRight.src}
              alt=""
              width={440}
              height={587}
              loading="lazy"
              sizes="(max-width: 640px) 45vw, 220px"
              className={styles.visionSideImage}
            />
          </div>
          <div ref={bLeftRef} className={`${styles.visionSide} ${styles.visionSideLeft} ${styles.visionSideLower}`}>
            <Image
              src={trustLeft.src}
              alt=""
              width={440}
              height={587}
              loading="lazy"
              sizes="(max-width: 640px) 45vw, 220px"
              className={styles.visionSideImage}
            />
          </div>
          <div ref={bRightRef} className={`${styles.visionSide} ${styles.visionSideRight} ${styles.visionSideLower}`}>
            <Image
              src={trustRight.src}
              alt=""
              width={440}
              height={587}
              loading="lazy"
              sizes="(max-width: 640px) 45vw, 220px"
              className={styles.visionSideImage}
            />
          </div>
        </div>
      )}
      <div className={styles.visionInner}>
        <p className={styles.visionKicker}>{ABOUT_VISION.kicker}</p>
        {reduceMotion ? (
          <>
            <p className={styles.visionQuote}>
              {ABOUT_VISION.quoteA} <em>{ABOUT_VISION.quoteAccent}</em>
            </p>
            <p className={styles.visionBody}>{ABOUT_VISION.body}</p>
            <p className={styles.visionPositioning}>{ABOUT_VISION.positioning}</p>
          </>
        ) : (
          <>
            <div className={styles.visionQuote}>
              <SplitText
                tag="span"
                text={ABOUT_VISION.quoteA}
                splitType="words"
                delay={40}
                duration={0.7}
                ease="power3.out"
                from={{ opacity: 0, y: 20 }}
                to={{ opacity: 1, y: 0 }}
                textAlign="center"
              />{' '}
              <SplitText
                tag="span"
                text={ABOUT_VISION.quoteAccent}
                className={styles.visionQuoteAccent}
                splitType="words"
                delay={40}
                duration={0.7}
                ease="power3.out"
                from={{ opacity: 0, y: 20 }}
                to={{ opacity: 1, y: 0 }}
                textAlign="center"
              />
            </div>
            <BlurText
              text={ABOUT_VISION.body}
              className={styles.visionBody}
              animateBy="words"
              delay={28}
              stepDuration={0.3}
              animationFrom={{ filter: 'blur(6px)', opacity: 0, y: 12 }}
              animationTo={[{ filter: 'blur(0px)', opacity: 1, y: 0 }]}
            />
            <BlurText
              text={ABOUT_VISION.positioning}
              className={styles.visionPositioning}
              animateBy="words"
              delay={24}
              stepDuration={0.25}
              animationFrom={{ filter: 'blur(6px)', opacity: 0, y: 12 }}
              animationTo={[{ filter: 'blur(0px)', opacity: 1, y: 0 }]}
            />
            <noscript>
              <p className={styles.visionQuote}>
                {ABOUT_VISION.quoteA} <em>{ABOUT_VISION.quoteAccent}</em>
              </p>
              <p className={styles.visionBody}>{ABOUT_VISION.body}</p>
              <p className={styles.visionPositioning}>{ABOUT_VISION.positioning}</p>
            </noscript>
          </>
        )}
      </div>
    </section>
  );
}
