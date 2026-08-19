'use client';

import React from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { HERO } from '@/content/home';
import styles from './home.module.css';

const MotionLink = motion(Link);

export default function HomeHero() {
    const reduceMotion = useReducedMotion();

    return (
        <section className={styles.hero}>
            <video
                className={styles.heroVideoBg}
                autoPlay
                loop
                muted
                playsInline
                aria-hidden="true"
            >
                <source src="/images/Video%20Project%205.mp4" type="video/mp4" />
            </video>

            <div className={styles.heroInner}>

                <motion.p
                    className={styles.eyebrow}
                    initial={reduceMotion ? false : { opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.5, ease: [0.25, 1, 0.5, 1] }}
                >
                    {HERO.eyebrow}
                </motion.p>

                <h1 className={styles.heroTitle} aria-label={HERO.headlinePlain}>
                    {HERO.headline.map((word, i) => (
                        <React.Fragment key={`${word.text}-${i}`}>
                            <motion.span
                                className={`${styles.heroWord} ${word.accent ? styles.accent : ''}`}
                                aria-hidden="true"
                                initial={reduceMotion ? false : { opacity: 0, y: 22, scale: 0.96, filter: 'blur(8px)' }}
                                animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                                transition={{ duration: 0.6, delay: 0.12 + i * 0.065, ease: [0.25, 1, 0.5, 1] }}
                            >
                                {word.text}
                            </motion.span>
                            {(word.text === 'Connecting' || word.text === 'With') && (
                                <br className={styles.mobileBreak} />
                            )}
                        </React.Fragment>
                    ))}
                </h1>

                <motion.p
                    className={styles.heroDesc}
                    initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.55, ease: [0.25, 1, 0.5, 1] }}
                >
                    {HERO.description}
                </motion.p>

                <motion.div
                    className={styles.heroActions}
                    initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.68, ease: [0.25, 1, 0.5, 1] }}
                >
                    <MotionLink
                        href={HERO.primaryCta.href}
                        className={styles.btnPrimary}
                        whileHover={reduceMotion ? undefined : { scale: 1.03, y: -2 }}
                        whileTap={reduceMotion ? undefined : { scale: 0.96 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    >
                        {HERO.primaryCta.label}
                    </MotionLink>
                    <MotionLink
                        href={HERO.secondaryCta.href}
                        className={styles.btnSecondary}
                        whileHover={reduceMotion ? undefined : { scale: 1.03, y: -2 }}
                        whileTap={reduceMotion ? undefined : { scale: 0.96 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    >
                        {HERO.secondaryCta.label}
                    </MotionLink>
                </motion.div>
            </div>
        </section>
    );
}
