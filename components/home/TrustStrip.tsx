'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { SCALE_GALLERY } from '@/content/home';
import styles from './home.module.css';

const STEPS = SCALE_GALLERY.steps;
const COUNT = STEPS.length;
const pad = (n: number) => String(n).padStart(2, '0');

// Pins only where the stage fits; must match the media query in home.module.css.
const PIN_QUERY = '(min-height: 600px)';
// Scroll per step, as a share of the stage height.
const SEG = 0.6;
// Least time between two steps, so a fast scroll plays each move in turn
// instead of jumping (a little shorter than the move itself).
const STEP_MS = 520;

// Where each photo sits relative to the step on show: the current one large,
// the previous one small at its top left, the next one small at its bottom
// right, and the rest waiting just past the small ones. No wrap: 01 has no
// previous photo and 05 has no next one.
type Role = 'main' | 'prev' | 'next' | 'outgoing' | 'incoming';
const roleOf = (i: number, at: number): Role => {
    const d = i - at;
    if (d === 0) return 'main';
    if (d === -1) return 'prev';
    if (d === 1) return 'next';
    return d < 0 ? 'outgoing' : 'incoming';
};

/**
 * "Hiring built for you": five steps as a photo gallery. One
 * photo is large with its caption beside it; the previous and next steps wait
 * as small photos at its corners.
 *
 * Where the screen is tall enough, the section pins and scrolling moves
 * through the steps: the next photo grows into the middle while the current
 * one shrinks into the corner, and the counter rolls. Scrolling back runs it
 * in reverse. A fast scroll still plays the moves one at a time. Clicking a
 * photo (or the arrow keys) scrolls the page to that step. Without script or
 * on short screens it does not pin; the photos then move on click.
 */
export default function TrustStrip() {
    const [at, setAt] = useState(0);
    const trackRef = useRef<HTMLDivElement>(null);
    const segRef = useRef(0); // px of scroll per step; 0 when not pinned
    const atRef = useRef(0);

    useEffect(() => {
        const track = trackRef.current;
        if (!track) return;
        const stage = track.firstElementChild as HTMLElement;
        const mq = window.matchMedia(PIN_QUERY);
        let target = 0;
        let last = 0;
        let timer = 0;

        // Walk one step at a time toward the scroll's step.
        const walk = () => {
            timer = 0;
            const cur = atRef.current;
            if (cur === target) return;
            const wait = STEP_MS - (performance.now() - last);
            if (wait > 0) {
                timer = window.setTimeout(walk, wait);
                return;
            }
            const next = cur + Math.sign(target - cur);
            atRef.current = next;
            last = performance.now();
            setAt(next);
            if (next !== target) timer = window.setTimeout(walk, STEP_MS);
        };
        const sync = () => {
            const seg = segRef.current;
            if (!seg) return;
            const v = -track.getBoundingClientRect().top;
            target = Math.min(COUNT - 1, Math.max(0, Math.floor(v / seg)));
            if (!timer) walk();
        };
        const layout = () => {
            if (mq.matches) {
                track.dataset.pinned = '';
                // The stage's own height, not the window's, so the address
                // bar sliding away on a phone does not shift the steps.
                segRef.current = stage.offsetHeight * SEG;
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
            window.clearTimeout(timer);
        };
    }, []);

    const go = (i: number) => {
        const step = Math.min(COUNT - 1, Math.max(0, i));
        const seg = segRef.current;
        const track = trackRef.current;
        if (!seg || !track) {
            atRef.current = step;
            setAt(step);
            return;
        }
        // Middle of that step's stretch of scroll; the steps follow the page.
        const top = window.scrollY + track.getBoundingClientRect().top + seg * (step + 0.5);
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' });
    };

    return (
        <section className="relative" aria-label={SCALE_GALLERY.sectionTitle}>
            <div ref={trackRef} className={styles.galleryTrack}>
                <div className={`${styles.section} ${styles.galleryPin}`}>
                    <div
                        className={`${styles.inner} ${styles.gallery}`}
                        role="group"
                        aria-roledescription="carousel"
                        aria-label="Five steps"
                        onKeyDown={(e) => {
                            if (e.key === 'ArrowRight') go(at + 1);
                            if (e.key === 'ArrowLeft') go(at - 1);
                        }}
                    >
                        <div className={styles.galleryCol}>
                            <h2 className={styles.galleryHeading}>
                                {SCALE_GALLERY.headingA}
                                <span>{SCALE_GALLERY.headingAccent}</span>
                            </h2>

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
                                                      ? at < COUNT - 1
                                                          ? `${step.label}. Show the next step`
                                                          : step.label
                                                      : `Next: ${step.label}`
                                            }
                                            onClick={() => go(role === 'prev' ? at - 1 : at + 1)}
                                        >
                                            <Image
                                                src={step.image}
                                                alt={step.alt}
                                                fill
                                                sizes="(max-width: 860px) 60vw, 400px"
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
                                    <ul className={styles.galleryChips}>
                                        {SCALE_GALLERY.proofPoints.map((point) => (
                                            <li key={point}>{point}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>

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
                            <small>/ {pad(COUNT)}</small>
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
