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
            {/* 1280x720, audio stripped: 712KB webm / 1.2MB mp4. The 10s source
                plays forward then reversed (20s) so the loop has no visible jump.
                `preload="none"` keeps it off the critical path, and reduced-motion
                visitors get the poster frame instead of playback. */}
            <video
                ref={videoRef}
                className={styles.heroVideoBg}
                preload="none"
                poster="/images/hero-towers-poster.webp"
                loop
                muted
                playsInline
                aria-hidden="true"
            >
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
