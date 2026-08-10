'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { HERO } from '@/content/home';
import styles from './home.module.css';

/**
 * Node positions for the decorative "mesh" backdrop, in a 1200x600 viewBox.
 * Named for the brand — TalentMesh — rather than being generic sparkle.
 */
const NODES = [
    [110, 120], [300, 70], [520, 150], [700, 60], [900, 130], [1080, 90],
    [180, 320], [420, 260], [640, 330], [860, 250], [1050, 320],
    [90, 500], [340, 470], [580, 530], [820, 460], [1010, 520],
] as const;

/** Index pairs into NODES that get a connecting line. */
const EDGES = [
    [0, 1], [1, 2], [2, 3], [3, 4], [4, 5],
    [0, 6], [1, 7], [2, 7], [3, 9], [4, 9], [5, 10],
    [6, 7], [7, 8], [8, 9], [9, 10],
    [6, 11], [7, 12], [8, 13], [9, 14], [10, 15],
    [11, 12], [12, 13], [13, 14], [14, 15],
] as const;

export default function HomeHero() {
    const reduceMotion = useReducedMotion();

    return (
        <section className={styles.hero}>
            <div className={styles.heroGlow} aria-hidden="true" />

            <svg
                className={styles.heroMesh}
                viewBox="0 0 1200 600"
                preserveAspectRatio="xMidYMid slice"
                aria-hidden="true"
                focusable="false"
            >
                <g stroke="var(--sky-blue)" strokeWidth="1" opacity="0.45">
                    {EDGES.map(([a, b]) => (
                        <line
                            key={`${a}-${b}`}
                            x1={NODES[a][0]}
                            y1={NODES[a][1]}
                            x2={NODES[b][0]}
                            y2={NODES[b][1]}
                        />
                    ))}
                </g>
                <g fill="var(--dodger-blue)">
                    {NODES.map(([cx, cy], i) => (
                        <motion.circle
                            key={`${cx}-${cy}`}
                            cx={cx}
                            cy={cy}
                            r={3}
                            initial={false}
                            animate={reduceMotion ? undefined : { r: [3, 5, 3], opacity: [0.5, 1, 0.5] }}
                            transition={{
                                duration: 3.6,
                                repeat: Infinity,
                                ease: 'easeInOut',
                                delay: (i % 6) * 0.45,
                            }}
                        />
                    ))}
                </g>
            </svg>

            <div className={styles.heroInner}>
                <motion.p
                    className={styles.eyebrow}
                    initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    {HERO.eyebrow}
                </motion.p>

                <h1 className={styles.heroTitle} aria-label={HERO.headlinePlain}>
                    {HERO.headline.map((word, i) => (
                        <motion.span
                            key={`${word.text}-${i}`}
                            className={`${styles.heroWord} ${word.accent ? styles.accent : ''}`}
                            aria-hidden="true"
                            initial={reduceMotion ? false : { opacity: 0, y: 22, filter: 'blur(6px)' }}
                            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                            transition={{ duration: 0.55, delay: 0.15 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                        >
                            {word.text}
                        </motion.span>
                    ))}
                </h1>

                <motion.p
                    className={styles.heroDesc}
                    initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, delay: 0.7 }}
                >
                    {HERO.description}
                </motion.p>

                <motion.div
                    className={styles.heroActions}
                    initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, delay: 0.85 }}
                >
                    <Link href={HERO.primaryCta.href} className={styles.btnPrimary}>
                        {HERO.primaryCta.label}
                    </Link>
                    <Link href={HERO.secondaryCta.href} className={styles.btnSecondary}>
                        {HERO.secondaryCta.label}
                    </Link>
                </motion.div>
            </div>
        </section>
    );
}
