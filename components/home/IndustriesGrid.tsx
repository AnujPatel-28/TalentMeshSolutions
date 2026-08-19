'use client';

import React, { useState, useEffect } from 'react';
import {
    motion,
    AnimatePresence,
    useMotionValue,
    useSpring,
    useTransform,
    useVelocity,
    useReducedMotion,
} from 'framer-motion';
import {
    Monitor,
    Heart,
    Landmark,
    Factory,
    ShoppingBag,
    Truck,
    GraduationCap,
    Megaphone,
    Users,
    Headphones,
} from 'lucide-react';
import { INDUSTRY_ROWS } from '@/content/home';
import styles from './home.module.css';

const ICONS = {
    monitor: Monitor,
    heart: Heart,
    landmark: Landmark,
    factory: Factory,
    shoppingBag: ShoppingBag,
    truck: Truck,
    graduationCap: GraduationCap,
    megaphone: Megaphone,
    users: Users,
    headphones: Headphones,
};

const FLAT_INDUSTRIES = INDUSTRY_ROWS.flat();

export default function IndustriesGrid() {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [supportsHover, setSupportsHover] = useState(false);
    const reduceMotion = useReducedMotion();

    // The follower card is pointer-only; touch devices never get a hover state.
    useEffect(() => {
        const mq = window.matchMedia('(hover: hover)');
        setSupportsHover(mq.matches);
        const handler = (e: MediaQueryListEvent) => setSupportsHover(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    // Coordinates for the follower card, softened by a spring for lag/inertia.
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    const springConfig = { damping: 25, stiffness: 220, mass: 0.6 };
    const x = useSpring(mouseX, springConfig);
    const y = useSpring(mouseY, springConfig);

    // Tilt the card in the direction the cursor is travelling.
    const xVelocity = useVelocity(mouseX);
    const rotateRaw = useTransform(xVelocity, [-2000, 2000], [-10, 10]);
    const rotate = useSpring(rotateRaw, { damping: 20, stiffness: 200 });

    const handleMouseMove = (e: React.MouseEvent) => {
        mouseX.set(e.clientX - 160);
        mouseY.set(e.clientY - 210);
    };

    const showFollower = supportsHover && !reduceMotion;

    return (
        <section className={styles.section} id="industries" onMouseMove={handleMouseMove}>
            <div className={styles.inner}>
                <div className={`${styles.head} ${styles.industriesHead}`}>
                    <p className={styles.eyebrow}>Industries</p>
                    <h2 className={styles.h2}>Recruitment Solutions Across Multiple Industries</h2>
                    <p className={styles.lede}>
                        We recruit skilled professionals across a wide range of industries.
                    </p>
                </div>

                <div className={styles.industriesContainer}>
                    {INDUSTRY_ROWS.map((row, rowIndex) => (
                        <div key={rowIndex} className={styles.industryRow}>
                            {row.map((ind) => {
                                const Icon = ICONS[ind.icon as keyof typeof ICONS] || Monitor;
                                const flatIndex = FLAT_INDUSTRIES.indexOf(ind);
                                return (
                                    <div
                                        key={ind.name}
                                        className={styles.industryTag}
                                        style={{ '--hover-color': ind.color } as React.CSSProperties}
                                        onMouseEnter={() => setHoveredIndex(flatIndex)}
                                        onMouseLeave={() => setHoveredIndex(null)}
                                    >
                                        <span className={styles.tagIcon}>
                                            <Icon size={22} />
                                        </span>
                                        <span className={styles.tagName}>{ind.name}</span>
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>

            {/* Warm the browser cache so the follower card paints without a gap. */}
            {showFollower && (
                <div style={{ display: 'none' }} aria-hidden="true">
                    {FLAT_INDUSTRIES.map((ind) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={ind.name} src={ind.image} alt="" />
                    ))}
                </div>
            )}

            {/* Cursor-following preview card */}
            <AnimatePresence>
                {showFollower && hoveredIndex !== null && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 250 }}
                        style={{
                            position: 'fixed',
                            left: 0,
                            top: 0,
                            x,
                            y,
                            rotate,
                            width: 320,
                            height: 200,
                            pointerEvents: 'none',
                            zIndex: 9999,
                            overflow: 'hidden',
                            borderRadius: '16px',
                            boxShadow:
                                '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 8px 16px -8px rgba(0, 0, 0, 0.15)',
                            border: '1px solid rgba(255, 255, 255, 0.3)',
                            backgroundColor: 'rgba(255, 255, 255, 0.8)',
                            backdropFilter: 'blur(8px)',
                        }}
                    >
                        <motion.img
                            src={FLAT_INDUSTRIES[hoveredIndex].image}
                            alt={FLAT_INDUSTRIES[hoveredIndex].name}
                            initial={{ scale: 1.15 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 1.15 }}
                            transition={{ duration: 0.35, ease: 'easeOut' }}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
}
