'use client';

import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { Users, TrendingUp, CheckCircle } from 'lucide-react';
import { POSITIONING } from '@/content/home';
import styles from './home.module.css';

const ICONS = {
    users: Users,
    trendingUp: TrendingUp,
    checkCircle: CheckCircle,
};

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

    return (
        <section className={styles.trustSection} aria-label="Trust and positioning">
            <div className={styles.trustContainer}>
                <div className={styles.trustLayout}>
                    {/* Left Side: Cards */}
                    <div className={styles.trustCardsCol}>
                        <motion.div
                            className={styles.positioningStack}
                            variants={reduceMotion ? undefined : containerVariants}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, amount: 0.25 }}
                        >
                            {POSITIONING.columns.map((col) => {
                                const Icon = ICONS[col.icon as keyof typeof ICONS];
                                return (
                                    <motion.div
                                        key={col.title}
                                        className={styles.positioningCard}
                                        variants={reduceMotion ? undefined : cardVariants}
                                        whileHover={reduceMotion ? undefined : { y: -2, transition: { duration: 0.2 } }}
                                        whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                                    >
                                        <div className={styles.positioningIconBox}>
                                            <Icon strokeWidth={2} />
                                        </div>
                                        <div className={styles.positioningContent}>
                                            <h3 className={styles.positioningTitle}>{col.title}</h3>
                                            <p className={styles.positioningDesc}>{col.description}</p>
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


