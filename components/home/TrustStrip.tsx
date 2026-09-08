'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import { Pause, Play } from 'lucide-react';
import { POSITIONING } from '@/content/home';
import SectionMarker from './SectionMarker';
import styles from './home.module.css';

// The right-hand intros run 27-32 words, which is roughly 7-9 seconds of
// reading. The previous 4800ms gave about half that, so the panel changed
// mid-sentence.
const CYCLE_DURATION = 8000; // Time in ms per card before switching to next

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


export default function TrustStrip() {
    const reduceMotion = useReducedMotion();
    const [activeIndex, setActiveIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    // Hover/focus pausing does not exist on touch, so any deliberate choice of a
    // card stops the rotation for good. This is what actually satisfies WCAG
    // 2.2.2 — a phone fires neither mouseenter nor focus.
    const [userStopped, setUserStopped] = useState(false);
    const tabRefs = useRef<(HTMLDivElement | null)[]>([]);
    const totalCards = POSITIONING.columns.length;

    const nextCard = useCallback(() => {
        setActiveIndex((prev) => (prev + 1) % totalCards);
    }, [totalCards]);

    useEffect(() => {
        if (reduceMotion || isPaused || userStopped) return;

        const interval = setInterval(() => {
            nextCard();
        }, CYCLE_DURATION);

        return () => clearInterval(interval);
    }, [isPaused, userStopped, nextCard, reduceMotion, activeIndex]);

    const selectCard = useCallback((index: number) => {
        setActiveIndex(index);
        setUserStopped(true);
    }, []);

    const moveFocus = useCallback((index: number) => {
        setActiveIndex(index);
        tabRefs.current[index]?.focus();
    }, []);

    return (
        <section className={`${styles.trustSection} relative`} aria-label="Why TalentMesh">
            <SectionMarker label="Why TalentMesh" index={2} />

            <div className={styles.trustContainer}>
                <div className={styles.trustLayout}>
                    {/* Left Side: Cards with Auto-Cycle */}
                    <div
                        className={styles.trustCardsCol}
                        onMouseEnter={() => setIsPaused(true)}
                        onMouseLeave={() => setIsPaused(false)}
                        onFocus={() => setIsPaused(true)}
                        onBlur={() => setIsPaused(false)}
                    >
                        {/* Header Intro */}
                        <div>
                            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-manrope">
                                Recruitment Engineered for Scale
                            </h2>
                            <p className="text-sm text-slate-500 mt-1 font-normal">
                                Select a capability to explore how our delivery models work.
                            </p>
                        </div>

                        {/* Interactive Feature Cards */}
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

                                return (
                                    <motion.div
                                        key={col.title}
                                        ref={(el: HTMLDivElement | null) => {
                                            tabRefs.current[index] = el;
                                        }}
                                        role="tab"
                                        aria-selected={isActive}
                                        aria-controls={`positioning-panel-${index}`}
                                        id={`positioning-tab-${index}`}
                                        // Roving tabindex: the tablist is one tab
                                        // stop and arrows move between tabs.
                                        tabIndex={isActive ? 0 : -1}
                                        className={`${styles.positioningCard} ${
                                            isActive
                                                ? styles.positioningCardActive
                                                : styles.positioningCardInactive
                                        }`}
                                        variants={reduceMotion ? undefined : cardVariants}
                                        onClick={() => selectCard(index)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                selectCard(index);
                                            } else if (e.key === 'ArrowDown') {
                                                e.preventDefault();
                                                moveFocus((index + 1) % totalCards);
                                            } else if (e.key === 'ArrowUp') {
                                                e.preventDefault();
                                                moveFocus((index - 1 + totalCards) % totalCards);
                                            }
                                        }}
                                        whileTap={reduceMotion ? undefined : { scale: 0.995 }}
                                    >
                                        <span className={styles.positioningNum} aria-hidden="true">
                                            {String(index + 1).padStart(2, '0')}
                                        </span>

                                        <div>
                                            <h3 className={styles.positioningTitle}>{col.title}</h3>
                                            <p className={styles.positioningDesc}>{col.description}</p>
                                        </div>

                                        <span className={styles.positioningMark} aria-hidden="true" />

                                        {isActive && !userStopped && (
                                            <span className={styles.positioningProgress} aria-hidden="true">
                                                <motion.span
                                                    key={`progress-${activeIndex}-${isPaused}`}
                                                    className={styles.positioningProgressFill}
                                                    initial={{ scaleX: 0 }}
                                                    animate={{ scaleX: 1 }}
                                                    transition={{
                                                        duration: isPaused ? 0 : CYCLE_DURATION / 1000,
                                                        ease: 'linear',
                                                    }}
                                                />
                                            </span>
                                        )}
                                    </motion.div>
                                );
                            })}
                        </motion.div>

                        {/* Bottom Metric Anchors */}
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-2 border-t border-slate-100 text-xs font-semibold text-slate-500">
                            <span className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-brand"></span>
                                48–72h Shortlists
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-brand"></span>
                                100% Vetted Talent
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-brand"></span>
                                Elastic Scaling
                            </span>

                            {!reduceMotion && (
                                <button
                                    type="button"
                                    onClick={() => setUserStopped((s) => !s)}
                                    className="ml-auto flex items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-1 text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
                                >
                                    {userStopped ? <Play size={12} /> : <Pause size={12} />}
                                    {userStopped ? 'Resume' : 'Pause'}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Right Side: Text + Illustration */}
                    <div
                        className={styles.trustTextCol}
                        id={`positioning-panel-${activeIndex}`}
                        role="tabpanel"
                        aria-labelledby={`positioning-tab-${activeIndex}`}
                    >
                        <AnimatePresence mode="wait">
                            {'rightBackground' in POSITIONING.columns[activeIndex] && (
                                <motion.div
                                    key={`bg-${activeIndex}`}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.5 }}
                                    style={{
                                        position: 'absolute',
                                        inset: 0,
                                        zIndex: 0,
                                        pointerEvents: 'none',
                                    }}
                                >
                                    <Image
                                        src={(POSITIONING.columns[activeIndex] as any).rightBackground}
                                        alt=""
                                        fill
                                        style={{ objectFit: 'cover' }}
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                        {/* Text Container with fixed height to prevent layout shift */}
                        <div className={styles.trustHeadWrap}>
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={`content-${activeIndex}`}
                                    className={styles.trustHead}
                                    initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
                                >
                                    <h2 className={styles.trustH2}>
                                        {POSITIONING.columns[activeIndex].rightHeading}
                                    </h2>
                                    <p className={styles.trustLede}>{POSITIONING.columns[activeIndex].rightIntro}</p>
                                </motion.div>
                            </AnimatePresence>
                        </div>
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={`image-${activeIndex}`}
                                className={styles.trustImageWrap}
                                initial={reduceMotion ? false : { opacity: 0, filter: 'blur(4px)', scale: 0.98 }}
                                animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
                                exit={{ opacity: 0, filter: 'blur(4px)', scale: 0.98 }}
                                transition={{ duration: 0.5, ease: [0.25, 1, 0.5, 1] }}
                            >
                                <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end' }}>
                                    <Image
                                        src={(POSITIONING.columns[activeIndex] as any).rightImage}
                                        alt={`Illustration for ${POSITIONING.columns[activeIndex].title}`}
                                        width={1900}
                                        height={1425}
                                        className={styles.whyImage}
                                    />
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </section>
    );
}
