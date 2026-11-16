'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Target, Layers, LifeBuoy, Briefcase, Check } from 'lucide-react';
import { WHY_TALENTMESH, INDUSTRY_ROWS } from '@/content/home';
import styles from './home.module.css';

const POINT_ICONS = {
    target: Target,
    layers: Layers,
    lifeBuoy: LifeBuoy,
    briefcase: Briefcase,
};

// Grid placement per point, keyed like POINT_ICONS.
const TILE_CLASS = {
    target: styles.bentoHero,
    layers: styles.bentoFlex,
    lifeBuoy: styles.bentoSupport,
    briefcase: styles.bentoIndustry,
};

const MATCH_CHECKS = ['Skills', 'Experience', 'Notice period'];
const SUPPORT_STEPS = ['Coordinate', 'Verify', 'Onboard'];
const STAFFING_MODELS = ['Permanent', 'Contractual', 'Temporary', 'Remote', 'Volume'];
const INDUSTRY_NAMES = INDUSTRY_ROWS.flat().map((tag) => tag.name);
const half = Math.ceil(INDUSTRY_NAMES.length / 2);
const MARQUEE_ROWS = [INDUSTRY_NAMES.slice(0, half), INDUSTRY_NAMES.slice(half)];

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

const tileVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
    },
};

const EASE = [0.22, 1, 0.36, 1] as const;

// The tile pictures rest in their finished state in CSS; these only play the
// way in, once, as the grid scrolls into view.
const ringVariants = {
    hidden: { strokeDashoffset: 92.5 },
    visible: { strokeDashoffset: 0, transition: { duration: 1.2, delay: 0.3, ease: EASE } },
};

const lineVariants = {
    hidden: { scaleX: 0 },
    visible: { scaleX: 1, transition: { duration: 1.2, delay: 0.4, ease: EASE } },
};

const chipVariants = {
    hidden: { backgroundColor: '#FFFFFF', color: '#5A6B7C', borderColor: '#D9E2EC' },
    visible: (i: number) => ({
        backgroundColor: '#E0F0FF',
        color: '#0056B3',
        borderColor: '#9CC7F0',
        transition: { duration: 0.3, delay: 0.5 + i * 0.18 },
    }),
};

export default function WhyUs() {
    const reduceMotion = useReducedMotion();

    const visuals = {
        target: (
            <div className={styles.bentoMatch}>
                <div className={styles.bentoRing}>
                    <svg viewBox="0 0 40 40">
                        <circle className={styles.bentoRingTrack} cx="20" cy="20" r="16" />
                        <motion.circle
                            className={styles.bentoRingArc}
                            cx="20"
                            cy="20"
                            r="16"
                            variants={reduceMotion ? undefined : ringVariants}
                        />
                    </svg>
                    <span className={styles.bentoRingValue}>
                        92%
                        <small>match</small>
                    </span>
                </div>
                <div className={styles.bentoMatchBody}>
                    <div className={styles.bentoMatchRole}>Senior Backend Engineer</div>
                    <ul className={styles.bentoChecks}>
                        {MATCH_CHECKS.map((label) => (
                            <li key={label}>
                                <Check strokeWidth={2.5} />
                                {label}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        ),
        layers: (
            <div className={styles.bentoChips}>
                {STAFFING_MODELS.map((label, i) => (
                    <motion.span
                        key={label}
                        className={styles.bentoChip}
                        custom={i}
                        variants={reduceMotion ? undefined : chipVariants}
                    >
                        {label}
                    </motion.span>
                ))}
            </div>
        ),
        lifeBuoy: (
            <div className={styles.bentoSteps}>
                <span className={styles.bentoStepsTrack} />
                <motion.span
                    className={styles.bentoStepsLine}
                    variants={reduceMotion ? undefined : lineVariants}
                />
                {SUPPORT_STEPS.map((label) => (
                    <span key={label} className={styles.bentoStep}>
                        {label}
                    </span>
                ))}
            </div>
        ),
        briefcase: (
            <div className={styles.bentoMarquee}>
                {MARQUEE_ROWS.map((row, r) => (
                    <div key={r} className={styles.bentoMarqueeRow}>
                        {[...row, ...row].map((name, i) => (
                            <span key={i}>{name}</span>
                        ))}
                    </div>
                ))}
            </div>
        ),
    };

    return (
        <section className="relative" id="why-talentmesh">
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
                        className={styles.bento}
                        variants={reduceMotion ? undefined : containerVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.3 }}
                    >
                        {WHY_TALENTMESH.points.map((pt) => {
                            const Icon = POINT_ICONS[pt.icon];
                            return (
                                <motion.article
                                    key={pt.title}
                                    className={`${styles.bentoTile} ${TILE_CLASS[pt.icon]}`}
                                    variants={reduceMotion ? undefined : tileVariants}
                                >
                                    <div>
                                        <span className={styles.bentoIcon}>
                                            <Icon strokeWidth={2} aria-hidden="true" />
                                        </span>
                                        <h3 className={styles.bentoTitle}>{pt.title}</h3>
                                        <p className={styles.bentoDesc}>{pt.description}</p>
                                    </div>
                                    {/* Decorative: each picture restates the copy above it. */}
                                    <div className={styles.bentoVisual} aria-hidden="true">
                                        {visuals[pt.icon]}
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
