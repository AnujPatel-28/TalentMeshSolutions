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

export default function HomeHero() {
    const reduceMotion = useReducedMotion();
    const heroRef = useRef<HTMLElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const innerRef = useRef<HTMLDivElement>(null);

    // Scroll exit: as the hero scrolls away the video scales up slightly and
    // the copy lifts and fades, while the page below slides over the pinned
    // hero (see `.hero` in home.module.css). One passive listener; the scrub
    // stops its frame loop as soon as it has caught up with the scroll.
    useEffect(() => {
        if (reduceMotion) return;
        const hero = heroRef.current;
        const video = videoRef.current;
        const inner = innerRef.current;
        if (!hero || !video || !inner) return;

        // Smoothed, so a hard flick of the wheel glides rather than jumps.
        const scrub = createScrub(
            () => Math.min(hero.offsetHeight, Math.max(0, window.scrollY)),
            (y) => {
                const p = y / hero.offsetHeight;
                video.style.transform = `scale(${1 + 0.08 * p})`;
                inner.style.transform = `translate3d(0, ${-90 * p}px, 0)`;
                inner.style.opacity = String(Math.max(0, 1 - 1.5 * p));
            }
        );

        scrub.snap();
        window.addEventListener('scroll', scrub.kick, { passive: true });
        return () => {
            window.removeEventListener('scroll', scrub.kick);
            scrub.stop();
            video.style.transform = '';
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
    useEffect(() => {
        if (reduceMotion) return;
        const video = videoRef.current;
        if (!video) return;

        const start = () => {
            video.load();
            // Rejects when the tab is backgrounded or autoplay is blocked;
            // the poster stands in either way.
            video.play().catch(() => {});
        };

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
        };
    }, [reduceMotion]);

    return (
        <section ref={heroRef} className={styles.hero}>
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
