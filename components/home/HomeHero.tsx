'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useReducedMotion } from 'framer-motion';
import { HERO } from '@/content/home';
import styles from './home.module.css';

export default function HomeHero() {
    const reduceMotion = useReducedMotion();
    const videoRef = useRef<HTMLVideoElement>(null);

    // `preload="none"` alone stops the browser autoplaying at all, so playback
    // is kicked off by hand once the rest of the page has loaded. That is the
    // point: the source is large, and it used to compete with the hero for
    // bandwidth. Reduced-motion visitors never start it.
    useEffect(() => {
        if (reduceMotion) return;
        const video = videoRef.current;
        if (!video) return;

        const start = () => {
            video.load();
            // Rejects when the tab is backgrounded or autoplay is blocked;
            // the static .hero background stands in either way.
            video.play().catch(() => {});
        };

        if (document.readyState === 'complete') {
            start();
            return;
        }
        window.addEventListener('load', start, { once: true });
        return () => window.removeEventListener('load', start);
    }, [reduceMotion]);

    return (
        <section className={styles.hero}>
            {/* `preload="none"` keeps the 26MB source off the critical path — it
                used to download ahead of hydration and starve the hero — and
                reduced-motion visitors get the static navy ground (.hero's
                background) instead of playback.

                TODO(assets): drop in `/images/hero-loop.webm` (VP9, <=1280px,
                8-10s loop, <=2MB) plus `/images/hero-poster.webp` (frame 0,
                <=80KB), then add `poster="/images/hero-poster.webp"` here and a
                `<source src="/images/hero-loop.webm" type="video/webm" />`
                above the mp4. Deliberately not referenced yet: both would 404. */}
            <video
                ref={videoRef}
                className={styles.heroVideoBg}
                preload="none"
                loop
                muted
                playsInline
                aria-hidden="true"
            >
                <source src="/images/Video%20Project%205.mp4" type="video/mp4" />
            </video>

            <div className={styles.heroInner}>

                <p className={styles.eyebrow}>{HERO.eyebrow}</p>

                {/* Words carry `--i` so home.module.css can stagger the entrance
                    without any of this depending on JavaScript. */}
                <h1 className={styles.heroTitle} aria-label={HERO.headlinePlain}>
                    {HERO.headline.map((word, i) => (
                        <React.Fragment key={`${word.text}-${i}`}>
                            <span
                                className={`${styles.heroWord} ${word.accent ? styles.accent : ''}`}
                                aria-hidden="true"
                                style={{ '--i': i } as React.CSSProperties}
                            >
                                {word.text}
                            </span>
                            {(word.text === 'Connecting' || word.text === 'With') && (
                                <br className={styles.mobileBreak} />
                            )}
                        </React.Fragment>
                    ))}
                </h1>

                <p className={styles.heroDesc}>{HERO.description}</p>

                <div className={styles.heroActions}>
                    <Link href={HERO.primaryCta.href} className={styles.btnPrimary}>
                        {HERO.primaryCta.label}
                    </Link>
                    <Link href={HERO.secondaryCta.href} className={styles.btnSecondary}>
                        {HERO.secondaryCta.label}
                    </Link>
                </div>
            </div>
        </section>
    );
}
