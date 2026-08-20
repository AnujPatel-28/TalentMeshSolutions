'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { POSITIONING } from '@/content/home';
import styles from './home.module.css';

const CYCLE_DURATION = 4800; // Time in ms per card before switching to next

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.15,
        },
    },
};

const cardVariants = {
    hidden: { opacity: 0, y: 28 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
    },
};

function TypewriterText({
    text,
    isActive,
    reduceMotion,
}: {
    text: string;
    isActive: boolean;
    reduceMotion: boolean | null;
}) {
    const [displayedLength, setDisplayedLength] = useState(isActive ? 0 : text.length);

    useEffect(() => {
        if (!isActive || reduceMotion) {
            setDisplayedLength(text.length);
            return;
        }

        setDisplayedLength(0);
        let current = 0;
        const total = text.length;
        const timer = setInterval(() => {
            current += 1;
            setDisplayedLength(current);
            if (current >= total) {
                clearInterval(timer);
            }
        }, 22);

        return () => clearInterval(timer);
    }, [isActive, text, reduceMotion]);

    if (reduceMotion || !isActive) {
        return <span>{text}</span>;
    }

    const isComplete = displayedLength >= text.length;

    return (
        <span className={styles.typewriterWrapper}>
            <span>{text.slice(0, displayedLength)}</span>
            {!isComplete && <span className={styles.typewriterCursor} aria-hidden="true" />}
        </span>
    );
}

export default function TrustStrip() {
    const reduceMotion = useReducedMotion();
    const [activeIndex, setActiveIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const totalCards = POSITIONING.columns.length;

    const nextCard = useCallback(() => {
        setActiveIndex((prev) => (prev + 1) % totalCards);
    }, [totalCards]);

    useEffect(() => {
        if (reduceMotion || isPaused) return;

        const interval = setInterval(() => {
            nextCard();
        }, CYCLE_DURATION);

        return () => clearInterval(interval);
    }, [isPaused, nextCard, reduceMotion, activeIndex]);

    return (
        <section className={styles.trustSection} aria-label="Trust and positioning">
            <div className={styles.trustContainer}>
                <div className={styles.trustLayout}>
                    {/* Left Side: Cards with Auto-Cycle & Writing Animation */}
                    <div
                        className={styles.trustCardsCol}
                        onMouseEnter={() => setIsPaused(true)}
                        onMouseLeave={() => setIsPaused(false)}
                        onFocus={() => setIsPaused(true)}
                        onBlur={() => setIsPaused(false)}
                    >
                        <motion.div
                            className={styles.positioningStack}
                            variants={reduceMotion ? undefined : containerVariants}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, amount: 0.25 }}
                            role="tablist"
                            aria-label="TalentMesh strategic recruitment advantages"
                        >
                            {POSITIONING.columns.map((col, index) => {
                                const isActive = activeIndex === index;
                                const stepNumber = String(index + 1).padStart(2, '0');

                                return (
                                    <motion.div
                                        key={col.title}
                                        role="tab"
                                        aria-selected={isActive}
                                        aria-controls={`positioning-panel-${index}`}
                                        id={`positioning-tab-${index}`}
                                        tabIndex={0}
                                        className={`${styles.positioningCard} ${
                                            isActive
                                                ? styles.positioningCardActive
                                                : styles.positioningCardInactive
                                        }`}
                                        variants={reduceMotion ? undefined : cardVariants}
                                        onClick={() => setActiveIndex(index)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                setActiveIndex(index);
                                            } else if (e.key === 'ArrowDown') {
                                                e.preventDefault();
                                                setActiveIndex((index + 1) % totalCards);
                                            } else if (e.key === 'ArrowUp') {
                                                e.preventDefault();
                                                setActiveIndex((index - 1 + totalCards) % totalCards);
                                            }
                                        }}
                                        whileHover={
                                            reduceMotion
                                                ? undefined
                                                : { x: isActive ? 0 : -3, transition: { duration: 0.2 } }
                                        }
                                    >
                                        {/* Active Animated Progress Indicator */}
                                        {isActive && (
                                            <motion.div
                                                key={`progress-${activeIndex}-${isPaused}`}
                                                className={styles.cardProgressBar}
                                                initial={{ scaleY: 0 }}
                                                animate={{ scaleY: 1 }}
                                                transition={{
                                                    duration: isPaused ? 0 : CYCLE_DURATION / 1000,
                                                    ease: 'linear',
                                                }}
                                            />
                                        )}

                                        <div className={styles.positioningCardInner}>
                                            <div
                                                className={`${styles.positioningBadge} ${
                                                    isActive ? styles.positioningBadgeActive : ''
                                                }`}
                                            >
                                                <span
                                                    className={`${styles.positioningBadgeDot} ${
                                                        isActive ? styles.positioningBadgeDotActive : ''
                                                    }`}
                                                    aria-hidden="true"
                                                />
                                                <span>Step {stepNumber}</span>
                                            </div>
                                            <div className={styles.positioningContent}>
                                                <h3
                                                    className={`${styles.positioningTitle} ${
                                                        isActive ? styles.positioningTitleActive : ''
                                                    }`}
                                                >
                                                    {col.title}
                                                </h3>
                                                <p
                                                    className={`${styles.positioningDesc} ${
                                                        isActive ? styles.positioningDescActive : ''
                                                    }`}
                                                    id={`positioning-panel-${index}`}
                                                >
                                                    <TypewriterText
                                                        text={col.description}
                                                        isActive={isActive}
                                                        reduceMotion={reduceMotion}
                                                    />
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </motion.div>
                    </div>

                    {/* Right Side: Text + Illustration */}
                    <div className={styles.trustTextCol}>
                        <motion.div
                            className={styles.trustHead}
                            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.3 }}
                            transition={{ duration: 0.55, ease: [0.25, 1, 0.5, 1] }}
                        >
                            <p className={styles.trustEyebrow}>Why Talentmesh</p>
                            <h2 className={styles.trustH2}>
                                Your Hiring Needs.
                                <br />
                                Our Recruitment Expertise.
                            </h2>
                            <p className={styles.trustLede}>{POSITIONING.intro}</p>
                        </motion.div>
                        <motion.div
                            className={styles.trustImageWrap}
                            initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: 24 }}
                            whileInView={{ opacity: 1, scale: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.3 }}
                            transition={{ duration: 0.6, delay: 0.15, ease: [0.25, 1, 0.5, 1] }}
                        >
                            <Image
                                src="/cop2.png"
                                alt="TalentMesh hiring partner illustration with talent match platform features"
                                width={1900}
                                height={1425}
                                className={styles.whyImage}
                                priority
                            />
                        </motion.div>
                    </div>
                </div>
            </div>
        </section>
    );
}
