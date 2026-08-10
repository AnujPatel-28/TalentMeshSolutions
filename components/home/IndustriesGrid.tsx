'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion, useMotionValue, useSpring } from 'framer-motion';
import { INDUSTRIES } from '@/content/home';
import styles from './home.module.css';

/**
 * Pills for all ten sectors. On pointer devices, hovering a pill that has a
 * photo floats a preview card that follows the cursor — same spring idiom as
 * components/sections/Industries.tsx. Touch devices get the plain pill grid.
 */
export default function IndustriesGrid() {
    const [active, setActive] = useState<number | null>(null);

    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    const x = useSpring(mouseX, { stiffness: 260, damping: 26, mass: 0.6 });
    const y = useSpring(mouseY, { stiffness: 260, damping: 26, mass: 0.6 });

    // Resolved after mount so the server and first client render agree.
    const [canHover, setCanHover] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia('(hover: hover)');
        setCanHover(mq.matches);
        const onChange = (e: MediaQueryListEvent) => setCanHover(e.matches);
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, []);

    const handleMove = (event: React.MouseEvent) => {
        mouseX.set(event.clientX + 24);
        mouseY.set(event.clientY - 95);
    };

    const preview = active !== null ? INDUSTRIES[active] : null;

    return (
        <section className={`${styles.section} ${styles.sectionDark}`} id="industries">
            <div className={styles.inner}>
                <div className={styles.head}>
                    <p className={styles.eyebrow}>Industries we serve</p>
                    <h2 className={styles.h2}>
                        Hiring expertise across <span className={styles.accent}>ten sectors</span>
                    </h2>
                    <p className={styles.lede}>
                        Consultants who know the roles they recruit for — so screening is a real
                        conversation about the work, not keyword matching against a job description.
                    </p>
                </div>

                <div className={styles.industryWrap} onMouseMove={canHover ? handleMove : undefined}>
                    <ul className={styles.industryList}>
                        {INDUSTRIES.map((industry, i) => (
                            <li
                                key={industry.name}
                                className={styles.industryPill}
                                onMouseEnter={() => industry.image && canHover && setActive(i)}
                                onMouseLeave={() => setActive(null)}
                            >
                                <span className={styles.industryDot} aria-hidden="true" />
                                {industry.name}
                            </li>
                        ))}
                    </ul>

                    <AnimatePresence>
                        {preview?.image && (
                            <motion.div
                                key={preview.name}
                                className={styles.industryPreview}
                                style={{ x, y }}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.18, ease: 'easeOut' }}
                                aria-hidden="true"
                            >
                                <Image
                                    src={preview.image}
                                    alt=""
                                    width={300}
                                    height={190}
                                    sizes="300px"
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </section>
    );
}
