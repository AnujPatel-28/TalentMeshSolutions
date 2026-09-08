'use client';

import { useCallback, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Target, Layers, LifeBuoy, Briefcase } from 'lucide-react';
import { WHY_TALENTMESH } from '@/content/home';
import SectionMarker from './SectionMarker';
import styles from './home.module.css';

const POINT_ICONS = {
    target: Target,
    layers: Layers,
    lifeBuoy: LifeBuoy,
    briefcase: Briefcase,
};

const headVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
    },
};

const imageVariants = {
    hidden: { opacity: 0, x: 30, scale: 0.95 },
    visible: {
        opacity: 1,
        x: 0,
        scale: 1,
        transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
    },
};

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
        },
    },
};

const pillarVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
    },
};

export default function WhyUs() {
    const reduceMotion = useReducedMotion();
    const rowRef = useRef<HTMLDivElement>(null);

    // Written straight to the node as custom properties rather than held in
    // state: pointermove fires constantly, and routing it through React would
    // re-render the whole row on every frame for a purely visual effect.
    const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        const el = rowRef.current;
        if (!el || e.pointerType !== 'mouse') return;
        const rect = el.getBoundingClientRect();
        el.style.setProperty('--spot-x', `${e.clientX - rect.left}px`);
        el.style.setProperty('--spot-y', `${e.clientY - rect.top}px`);
    }, []);

    return (
        <section className="relative" id="why-talentmesh">
            <SectionMarker label="What Sets Us Apart" index={3} />

            <div className={`${styles.section} ${styles.sectionTint} ${styles.whyTint}`}>
                <div className={styles.inner}>
                    <div className={styles.whyTopRow}>
                        <motion.div
                            className={`${styles.head} ${styles.headLeft} ${styles.whyHeadFull}`}
                            variants={reduceMotion ? undefined : headVariants}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, amount: 0.5 }}
                        >
                            <h2 className={styles.h2}>
                                More Than Recruitment.
                                <br />
                                A Hiring Partner.
                            </h2>
                            <p className={styles.lede}>
                                We build strategic talent relationships to support your long-term organizational growth.
                            </p>
                        </motion.div>
                    </div>

                    <motion.div
                        ref={rowRef}
                        onPointerMove={handlePointerMove}
                        className={styles.pillarRow}
                        variants={reduceMotion ? undefined : containerVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.3 }}
                    >
                        {WHY_TALENTMESH.points.map((pt) => {
                            const Icon = POINT_ICONS[pt.icon as keyof typeof POINT_ICONS] || Target;
                            return (
                                <motion.article
                                    key={pt.title}
                                    className={styles.pillar}
                                    variants={reduceMotion ? undefined : pillarVariants}
                                    whileHover={reduceMotion ? undefined : { y: -2, transition: { duration: 0.2 } }}
                                    whileTap={reduceMotion ? undefined : { scale: 0.97 }}
                                >
                                    <span className={styles.pillarIcon}>
                                        <Icon strokeWidth={2} aria-hidden="true" />
                                    </span>
                                    <div className={styles.pillarContent}>
                                        <h3 className={styles.pillarTitle}>{pt.title}</h3>
                                        <p className={styles.pillarDesc}>{pt.description}</p>
                                    </div>
                                </motion.article>
                            );
                        })}
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
