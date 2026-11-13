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

        if (document.readyState === 'complete') {
            start();
            return;
        }
        window.addEventListener('load', start, { once: true });
        return () => window.removeEventListener('load', start);
    }, [reduceMotion]);

    return (
        <section className={styles.hero}>
            {/* Two static-camera loops, audio stripped; the last 1.5s of each
                dissolve into the first for a seamless 8.5s loop. Phones get a
                720x1280 portrait cut (332KB webm / 592KB mp4), everything else
                the 1280x720 one (291KB webm / 502KB mp4). The breakpoint matches
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
                <source media="(max-width: 640px)" src="/images/hero-towers-mobile.webm" type="video/webm" />
                <source media="(max-width: 640px)" src="/images/hero-towers-mobile.mp4" type="video/mp4" />
                <source src="/images/hero-towers.webm" type="video/webm" />
                <source src="/images/hero-towers.mp4" type="video/mp4" />
            </video>

            <div className={styles.heroInner}>

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
                            {word.text === 'Businesses' && <br />}
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
