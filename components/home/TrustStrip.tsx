'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { SCALE_GALLERY } from '@/content/home';
import styles from './home.module.css';

const STEPS = SCALE_GALLERY.steps;
const COUNT = STEPS.length;
const pad = (n: number) => String(n).padStart(2, '0');

// Where each photo sits relative to the step on show: the current one large,
// the previous one small at its top left, the next one small at its bottom
// right, and the two beyond those hidden just past the small ones.
const ROLE = ['main', 'next', 'incoming', 'outgoing', 'prev'] as const;
type Role = (typeof ROLE)[number];
const roleOf = (i: number, at: number): Role => ROLE[(((i - at) % COUNT) + COUNT) % COUNT];

/**
 * "Recruitment Engineered for Scale": five steps as a photo gallery. One
 * photo is large in the middle with its caption beside it; the previous and
 * next steps wait as small photos at its corners. Clicking the large photo or
 * the next one moves forward (the next photo grows into the middle while the
 * current one shrinks into the corner); the previous one moves back. The
 * counter rolls with it, and after 05 it comes round to 01. Arrow keys and a
 * sideways swipe work too. Nothing moves on a timer.
 */
export default function TrustStrip() {
    const [at, setAt] = useState(0);
    const swipeX = useRef<number | null>(null);
    const go = (step: number) => setAt((a) => (((a + step) % COUNT) + COUNT) % COUNT);

    return (
        <section className="relative" aria-label={SCALE_GALLERY.sectionTitle}>
            <div className={styles.section}>
                <div className={styles.inner}>
                    <div className={styles.scaleHead}>
                        <h2 className={styles.h2}>
                            {SCALE_GALLERY.headingA} <span className={styles.accent}>{SCALE_GALLERY.headingAccent}</span>
                        </h2>
                        <ul className={styles.scaleChips}>
                            {SCALE_GALLERY.proofPoints.map((point) => (
                                <li key={point}>{point}</li>
                            ))}
                        </ul>
                    </div>

                    <div
                        className={styles.gallery}
                        role="group"
                        aria-roledescription="carousel"
                        aria-label="Five steps"
                        onKeyDown={(e) => {
                            if (e.key === 'ArrowRight') go(1);
                            if (e.key === 'ArrowLeft') go(-1);
                        }}
                        onPointerDown={(e) => {
                            if (e.pointerType !== 'mouse') swipeX.current = e.clientX;
                        }}
                        onPointerUp={(e) => {
                            if (swipeX.current === null) return;
                            const dx = e.clientX - swipeX.current;
                            swipeX.current = null;
                            if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
                        }}
                    >
                        {/* Counter: the tens digit stays, the units digit rolls. */}
                        <p className={styles.galleryCount} aria-hidden="true">
                            0
                            <span className={styles.galleryRoll}>
                                <span style={{ transform: `translateY(${-at}em)` }}>
                                    {STEPS.map((_, i) => (
                                        <span key={i}>{i + 1}</span>
                                    ))}
                                </span>
                            </span>
                            <small>/{pad(COUNT)}</small>
                        </p>

                        <div className={styles.galleryStage}>
                            {STEPS.map((step, i) => {
                                const role = roleOf(i, at);
                                const live = role === 'main' || role === 'next' || role === 'prev';
                                return (
                                    <button
                                        key={step.image}
                                        type="button"
                                        className={styles.galleryPhoto}
                                        data-role={role}
                                        tabIndex={live ? 0 : -1}
                                        aria-hidden={!live}
                                        aria-label={
                                            role === 'prev'
                                                ? `Previous: ${step.label}`
                                                : role === 'main'
                                                  ? `${step.label}. Show the next step`
                                                  : `Next: ${step.label}`
                                        }
                                        onClick={() => go(role === 'prev' ? -1 : 1)}
                                    >
                                        <Image
                                            src={step.image}
                                            alt={step.alt}
                                            fill
                                            sizes="(max-width: 860px) 60vw, 380px"
                                        />
                                    </button>
                                );
                            })}

                            <div className={styles.galleryCaptions} aria-live="polite">
                                {STEPS.map((step, i) => (
                                    <div
                                        key={step.label}
                                        className={styles.galleryCaption}
                                        data-on={i === at || undefined}
                                        aria-hidden={i !== at}
                                    >
                                        <h3>{step.label}</h3>
                                        <p>
                                            {step.lead} <strong>{step.emphasis}</strong>
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
