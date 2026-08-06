import React from 'react';
import Image from 'next/image';
import styles from './HeroBg.module.css';

interface HeroBgProps {
    src: string;
    alt?: string;
    /** Delay the animation start so different pages feel distinct */
    animDelay?: number;
    fixed?: boolean;
}

/**
 * Drop-in animated background for hero sections or fixed full-page containers.
 * Place this as the first child of any position:relative hero container,
 * or at the root of a page with fixed={true}.
 * The Ken Burns effect (slow zoom + pan) makes the image feel alive.
 */
const HeroBg: React.FC<HeroBgProps> = ({ src, alt = 'Hero background', animDelay = 0, fixed }) => {
    return (
        <div className={`${styles.heroBgWrap} ${fixed ? styles.fixed : ''}`} aria-hidden="true">
            <Image
                src={src}
                alt={alt}
                fill
                sizes="100vw"
                priority
                className={styles.heroBgImg}
                style={{ animationDelay: animDelay ? `${animDelay}s` : undefined }}
                unoptimized
            />
            {/* Wave overlay effects */}
            <div className={styles.wavesContainer}>
                <svg className={styles.waveSvg} viewBox="0 24 150 28" preserveAspectRatio="none" shapeRendering="auto">
                    <defs>
                        <path id="gentle-wave" d="M-160 44c30 0 58-18 88-18s58 18 88 18 58-18 88-18 58 18 88 18v44h-352z" />
                    </defs>
                    <g className={styles.parallax}>
                        <use href="#gentle-wave" x="48" y="0" fill="rgba(255,255,255,0.06)" />
                        <use href="#gentle-wave" x="48" y="3" fill="rgba(255,255,255,0.04)" />
                        <use href="#gentle-wave" x="48" y="5" fill="rgba(255,255,255,0.03)" />
                        <use href="#gentle-wave" x="48" y="7" fill="rgba(255,255,255,0.09)" />
                    </g>
                </svg>
            </div>
            <div className={styles.heroBgFade} />
        </div>
    );
};

export default HeroBg;
