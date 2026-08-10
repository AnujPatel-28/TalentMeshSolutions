'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { TRUST_CLAIMS } from '@/content/home';
import styles from './home.module.css';

export default function TrustStrip() {
    const reduceMotion = useReducedMotion();

    return (
        <section className={styles.trust} aria-label="Why clients work with us">
            <motion.div
                className={styles.trustGrid}
                initial={reduceMotion ? false : { opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
                {TRUST_CLAIMS.map((claim) => (
                    <div key={claim.label} className={styles.trustItem}>
                        <div className={styles.trustValue}>{claim.value}</div>
                        <div className={styles.trustLabel}>{claim.label}</div>
                    </div>
                ))}
            </motion.div>
        </section>
    );
}
