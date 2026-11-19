'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useReducedMotion } from 'framer-motion';
import { HERO } from '@/content/home';
import { createScrub } from './scrub';
import styles from './home.module.css';

// The headline reveals line by line; a line ends after each of these words.
const LINE_ENDS = ['Businesses', 'the'];
const HEADLINE_LINES = HERO.headline.reduce<(typeof HERO.headline)[]>(
    (lines, word) => {
        lines[lines.length - 1].push(word);
        if (LINE_ENDS.includes(word.text)) lines.push([]);
        return lines;
    },
    [[]]
);

// Dark to light: the hero opens on the night cut. Once the headline, text
// and buttons have appeared (after the first-visit intro cover has lifted),
// it holds a moment, then turns to day over 3 seconds, so a first-time
// visitor reads the message on a dark city that then lights up. After that
// it loops day, night, day for as long as the page is open.
// All times in ms; each pair is [hold, fade into the next].
const OPEN_NIGHT_HOLD = 600;
const OPEN_FADE_TO_DAY = 3000;
const DAY = [9000, 5000] as const; // hold day, then fade to night
const NIGHT = [5000, 5000] as const; // hold night, then fade to day

export default function HomeHero() {
    const reduceMotion = useReducedMotion();
    const heroRef = useRef<HTMLElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const nightRef = useRef<HTMLVideoElement>(null);
    const innerRef = useRef<HTMLDivElement>(null);

    // Scroll exit: as the hero scrolls away the video scales up slightly and
    // the copy lifts and fades, while the page below slides over the pinned
    // hero (see `.hero` in home.module.css). One passive listener; the scrub
    // stops its frame loop as soon as it has caught up with the scroll.
    useEffect(() => {
        if (reduceMotion) return;
        const hero = heroRef.current;
        const video = videoRef.current;
        const night = nightRef.current;
        const inner = innerRef.current;
        if (!hero || !video || !night || !inner) return;

        // Smoothed, so a hard flick of the wheel glides rather than jumps.
        const scrub = createScrub(
            () => Math.min(hero.offsetHeight, Math.max(0, window.scrollY)),
            (y) => {
                const p = y / hero.offsetHeight;
                video.style.transform = night.style.transform = `scale(${1 + 0.08 * p})`;
                inner.style.transform = `translate3d(0, ${-90 * p}px, 0)`;
                inner.style.opacity = String(Math.max(0, 1 - 1.5 * p));
            }
        );

        scrub.snap();
        window.addEventListener('scroll', scrub.kick, { passive: true });
        return () => {
            window.removeEventListener('scroll', scrub.kick);
            scrub.stop();
            video.style.transform = night.style.transform = '';
            inner.style.transform = '';
            inner.style.opacity = '';
        };
    }, [reduceMotion]);

    // Magnetic primary CTA: the pill leans toward a mouse inside the padded
    // catch area around it and springs back on leave. Mouse only — a finger
    // has no hover to follow.
    const onMagnetMove = (e: React.PointerEvent<HTMLSpanElement>) => {
        if (reduceMotion || e.pointerType !== 'mouse') return;
        const pill = e.currentTarget.firstElementChild as HTMLElement;
        const r = e.currentTarget.getBoundingClientRect();
        pill.classList.add(styles.magnetTracking);
        pill.style.setProperty('--mx', `${((e.clientX - (r.left + r.width / 2)) * 0.22).toFixed(1)}px`);
        pill.style.setProperty('--my', `${((e.clientY - (r.top + r.height / 2)) * 0.3).toFixed(1)}px`);
    };
    const onMagnetLeave = (e: React.PointerEvent<HTMLSpanElement>) => {
        const pill = e.currentTarget.firstElementChild as HTMLElement;
        pill.classList.remove(styles.magnetTracking);
        pill.style.removeProperty('--mx');
        pill.style.removeProperty('--my');
    };

    // `preload="none"` alone stops the browser autoplaying at all, so playback
    // is kicked off by hand once the rest of the page has loaded, keeping the
    // loop off the critical path. Reduced-motion visitors never start it and
    // keep the poster frame.
    //
    // Two cuts of the same shot: night plays in step on top of day, and
    // fading the night layer in and out moves between them (see
    // `.heroVideoNight`). The tint over the video lightens at night so the
    // city lights show (`.hero[data-night]::after`). Both start at night,
    // matching the night poster, and stay within a frame of each other.
    useEffect(() => {
        if (reduceMotion) return;
        const hero = heroRef.current;
        const video = videoRef.current;
        const night = nightRef.current;
        if (!hero || !video || !night) return;
        let timer = 0;

        const show = (toNight: boolean, fadeMs: number) => {
            hero.style.setProperty('--hero-fade', `${fadeMs}ms`);
            if (toNight) {
                hero.dataset.night = '';
                night.dataset.on = '';
            } else {
                delete hero.dataset.night;
                delete night.dataset.on;
            }
        };
        // Day holds, fades to night; night holds, fades to day; repeat.
        const loop = (atNight: boolean) => {
            const [hold, fade] = atNight ? NIGHT : DAY;
            timer = window.setTimeout(() => {
                show(!atNight, fade);
                timer = window.setTimeout(() => loop(!atNight), fade);
            }, hold);
        };
        const begin = () => {
            window.clearTimeout(timer);
            timer = window.setTimeout(() => {
                show(false, OPEN_FADE_TO_DAY);
                timer = window.setTimeout(() => loop(false), OPEN_FADE_TO_DAY);
            }, OPEN_NIGHT_HOLD);
        };

        const keepInStep = () => {
            if (night.readyState < 2) return;
            if (Math.abs(night.currentTime - video.currentTime) > 0.08) {
                night.currentTime = video.currentTime;
            }
        };

        const start = () => {
            window.clearTimeout(timer);
            show(true, 0);
            video.load();
            night.load();
            // Reject when the tab is backgrounded or autoplay is blocked;
            // the night poster stands in either way.
            video.play().catch(() => {});
            night.play().catch(() => {});
            // Starts once both are actually playing, so the turn to day is
            // never spent on a poster, and once the copy has finished its
            // entrance (the buttons come last), so it is seen.
            const actions = hero.querySelector(`.${styles.heroActions}`);
            Promise.all([
                ...[video, night].map(
                    (v) => new Promise((done) => v.addEventListener('playing', done, { once: true }))
                ),
                ...(actions?.getAnimations() ?? []).map((a) => a.finished.catch(() => {})),
            ]).then(begin);
        };
        video.addEventListener('timeupdate', keepInStep);

        // The browser picks a <source> once, at load(). Pick again whenever the
        // viewport crosses the phone breakpoint (rotation, resize), or a page
        // opened wide keeps the landscape cut after it narrows.
        const phone = window.matchMedia('(max-width: 640px)');
        phone.addEventListener('change', start);

        if (document.readyState === 'complete') {
            start();
        } else {
            window.addEventListener('load', start, { once: true });
        }
        return () => {
            phone.removeEventListener('change', start);
            window.removeEventListener('load', start);
            video.removeEventListener('timeupdate', keepInStep);
            window.clearTimeout(timer);
        };
    }, [reduceMotion]);

    return (
        <section ref={heroRef} className={styles.hero} data-night="">
            {/* Two static-camera loops, audio stripped; the last 1.5s of each
                dissolve into the first for a seamless 8.5s loop. Phones get a
                720x1280 portrait cut (242KB webm / 399KB mp4), everything else
                the 1280x720 one (360KB webm / 567KB mp4). The breakpoint matches
                the 640px mobile block in home.module.css, which also swaps the
                poster: it is the hero's CSS background rather than a `poster`
                attribute, because `poster` cannot vary by viewport.
                `preload="none"` keeps the video off the critical path, and
                reduced-motion visitors keep the poster instead of playback. */}
            <video
                ref={videoRef}
                className={styles.heroVideoBg}
                preload="none"
                loop
                muted
                playsInline
                aria-hidden="true"
            >
                <source media="(max-width: 640px)" src="/images/hero-day-mobile.webm" type="video/webm" />
                <source media="(max-width: 640px)" src="/images/hero-day-mobile.mp4" type="video/mp4" />
                <source src="/images/hero-day.webm" type="video/webm" />
                <source src="/images/hero-day.mp4" type="video/mp4" />
            </video>
            {/* The same shot at night (restored from e54ba63), same cuts and
                length: 512KB / 297KB webm desktop, 606KB / 340KB webm phone.
                Shown first; see the effect above. */}
            <video
                ref={nightRef}
                className={`${styles.heroVideoBg} ${styles.heroVideoNight}`}
                data-on=""
                preload="none"
                loop
                muted
                playsInline
                aria-hidden="true"
            >
                <source media="(max-width: 640px)" src="/images/hero-night-mobile.webm" type="video/webm" />
                <source media="(max-width: 640px)" src="/images/hero-night-mobile.mp4" type="video/mp4" />
                <source src="/images/hero-night.webm" type="video/webm" />
                <source src="/images/hero-night.mp4" type="video/mp4" />
            </video>

            <div ref={innerRef} className={styles.heroInner}>

                {/* Each line sits in a clipping mask and carries `--l`, so
                    home.module.css can stagger the reveal without any of this
                    depending on JavaScript. */}
                <h1 className={styles.heroTitle} aria-label={HERO.headlinePlain}>
                    {HEADLINE_LINES.map((line, l) => (
                        <React.Fragment key={l}>
                            <span className={styles.heroLineMask} aria-hidden="true">
                                <span className={styles.heroLine} style={{ '--l': l } as React.CSSProperties}>
                                    {line.map((word) => (
                                        <span
                                            key={word.text}
                                            className={`${styles.heroWord} ${word.accent ? styles.accent : ''}`}
                                        >
                                            {word.text}
                                        </span>
                                    ))}
                                </span>
                            </span>
                            {l === 0 && <br />}
                            {l === 1 && <br className={styles.mobileBreak} />}
                        </React.Fragment>
                    ))}
                </h1>

                <p className={styles.heroDesc}>{HERO.description}</p>

                <div className={styles.heroActions}>
                    <span className={styles.heroMagnet} onPointerMove={onMagnetMove} onPointerLeave={onMagnetLeave}>
                        <Link href={HERO.primaryCta.href} className={styles.btnPrimary}>
                            {HERO.primaryCta.label}
                        </Link>
                    </span>
                    <Link href={HERO.secondaryCta.href} className={styles.btnSecondary}>
                        {HERO.secondaryCta.label}
                    </Link>
                </div>
            </div>
        </section>
    );
}
