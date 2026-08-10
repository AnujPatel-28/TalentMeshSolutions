'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { PROCESS_STEPS } from '@/content/home';
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
        <section className={styles.section} id="process">
            <div className={styles.inner}>
                <div className={styles.head}>
                    <p className={styles.eyebrow}>How we work</p>
                    <h2 className={styles.h2}>
                        A process built to <span className={styles.accent}>close the role</span>
                    </h2>
                    <p className={styles.lede}>
                        Five stages, one point of contact, and accountability that runs past the offer
                        letter — the mandate is closed when the candidate joins.
                    </p>
                </div>

                <div className={styles.processWrap} ref={ref}>
                    <div className={styles.processTrack} aria-hidden="true">
                        <motion.div
                            className={styles.processFill}
                            style={reduceMotion ? { scaleX: 1 } : { scaleX }}
                        />
                    </div>

                    {PROCESS_STEPS.map((step, i) => (
                        <motion.div
                            key={step.title}
                            className={styles.processStep}
                            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.5 }}
                            transition={{ duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                        >
                            <span className={styles.processNum}>{String(i + 1).padStart(2, '0')}</span>
                            <div>
                                <h3 className={styles.processTitle}>{step.title}</h3>
                                <p className={styles.processDesc}>{step.description}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
