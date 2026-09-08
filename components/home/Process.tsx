'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { PROCESS_REDESIGN_STEPS } from '@/content/home';
import SectionMarker from './SectionMarker';
import styles from './home.module.css';

export default function Process() {
    const ref = useRef<HTMLDivElement>(null);
    const reduceMotion = useReducedMotion();

    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ['start 0.85', 'end 0.55'],
    });
    const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);

    return (
        <section className="relative" id="process">
            <SectionMarker label="Process" index={5} />

            <div className={`${styles.section} ${styles.sectionTint}`}>
                <div className={styles.inner}>
                    <div className={`${styles.head} ${styles.headLeft}`}>
                        <h2 className={styles.h2}>
                            A Simple Approach to <span className={styles.accent}>Better Hiring</span>
                        </h2>
                        <p className={styles.lede}>
                            A transparent, step-by-step process designed to simplify candidate discovery and hiring coordination.
                        </p>
                    </div>

                    <div className={styles.processWrap} ref={ref}>
                        <div className={styles.processTrack} aria-hidden="true">
                            <motion.div
                                className={styles.processFill}
                                style={reduceMotion ? { scaleX: 1 } : { scaleX }}
                            />
                        </div>

                        {PROCESS_REDESIGN_STEPS.map((step, i) => (
                            <motion.div
                                key={step.title}
                                className={styles.processStep}
                                initial={reduceMotion ? false : { opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, amount: 0.5 }}
                                whileHover={reduceMotion ? undefined : { y: -2, transition: { duration: 0.2 } }}
                                whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                                transition={{ duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                            >
                                <span className={styles.processNum}>{step.step}</span>
                                <div>
                                    <h3 className={styles.processTitle}>{step.title}</h3>
                                    <p className={styles.processDesc}>{step.description}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

