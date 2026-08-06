"use client";
import { useState, useEffect, useRef } from 'react';
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import HandshakeOutlinedIcon from '@mui/icons-material/HandshakeOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import SavingsOutlinedIcon from '@mui/icons-material/SavingsOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import HeadsetMicOutlinedIcon from '@mui/icons-material/HeadsetMicOutlined';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform, useVelocity } from 'framer-motion';
import styles from './sections.module.css';

const industries = [
    { name: "Accounting", icon: <AccountBalanceOutlinedIcon sx={{ fontSize: 20 }} />, color: "#3b82f6", image: "/accounting.png" },
    { name: "Business & consulting", icon: <HandshakeOutlinedIcon sx={{ fontSize: 20 }} />, color: "#10b981", image: "/Business & consulting.png" },
    { name: "Human research", icon: <SearchOutlinedIcon sx={{ fontSize: 20 }} />, color: "#f59e0b", image: "/Human research.png" },
    { name: "Marketing and finance", icon: <CampaignOutlinedIcon sx={{ fontSize: 20 }} />, color: "#ef4444", image: "/Marketing and finance.png" },
    { name: "Design & development", icon: <EditOutlinedIcon sx={{ fontSize: 20 }} />, color: "#8b5cf6", image: "/Design & development.png" },
    { name: "Finance management", icon: <SavingsOutlinedIcon sx={{ fontSize: 20 }} />, color: "#06b6d4", image: "/Finance management.png" },
    { name: "Project management", icon: <DescriptionOutlinedIcon sx={{ fontSize: 20 }} />, color: "#ec4899", image: "/Project management.png" },
    { name: "Customer services", icon: <HeadsetMicOutlinedIcon sx={{ fontSize: 20 }} />, color: "#f97316", image: "/Customer services.png" }
];

const Industries = () => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [supportsHover, setSupportsHover] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Track touch device capability
    useEffect(() => {
        const mediaQuery = window.matchMedia('(hover: hover)');
        setSupportsHover(mediaQuery.matches);
        
        const handler = (e: MediaQueryListEvent) => setSupportsHover(e.matches);
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, []);

    // Coordinates for the follower card
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    // Spring configuration for smooth lag/inertia
    const springConfig = { damping: 25, stiffness: 220, mass: 0.6 };
    const x = useSpring(mouseX, springConfig);
    const y = useSpring(mouseY, springConfig);

    // Calculate velocity-based rotation
    const xVelocity = useVelocity(mouseX);
    const rotateRaw = useTransform(xVelocity, [-2000, 2000], [-10, 10]);
    const rotate = useSpring(rotateRaw, { damping: 20, stiffness: 200 });

    const handleMouseMove = (e: React.MouseEvent) => {
        // Offset coords so that the 320x200 card floats neatly above the cursor without blocking text
        mouseX.set(e.clientX - 160);
        mouseY.set(e.clientY - 210);
    };

    return (
        <section 
            className={styles.industries}
            ref={containerRef}
            onMouseMove={handleMouseMove}
        >
            <div className={styles.container}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>
                        Trusted by <span className={styles.highlightText}>industry-leading</span> teams.
                    </h2>
                </div>

                <div className={styles.industryFlex}>
                    {industries.map((ind, i) => (
                        <div
                            key={i}
                            className={styles.industryTag}
                            style={{ '--hover-color': ind.color } as React.CSSProperties}
                            onMouseEnter={() => setHoveredIndex(i)}
                            onMouseLeave={() => setHoveredIndex(null)}
                        >
                            <span className={styles.tagIcon}>{ind.icon}</span>
                            <span className={styles.tagName}>{ind.name}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Preload images in background to avoid rendering delay */}
            <div style={{ display: 'none' }} aria-hidden="true">
                {industries.map((ind, i) => (
                    <img key={i} src={ind.image} alt="" />
                ))}
            </div>

            {/* Hover Follower Image Card */}
            <AnimatePresence>
                {supportsHover && hoveredIndex !== null && (
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
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 8px 16px -8px rgba(0, 0, 0, 0.15)',
                            border: '1px solid rgba(255, 255, 255, 0.3)',
                            backgroundColor: 'rgba(255, 255, 255, 0.8)',
                            backdropFilter: 'blur(8px)',
                        }}
                    >
                        <motion.img
                            src={industries[hoveredIndex].image}
                            alt={industries[hoveredIndex].name}
                            initial={{ scale: 1.15 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 1.15 }}
                            transition={{ duration: 0.35, ease: 'easeOut' }}
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                            }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
};

export default Industries;


