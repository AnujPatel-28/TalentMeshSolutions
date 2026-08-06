"use client";
import React from 'react';
import styles from './Marquee.module.css';

const LOGOS = [
    "Google", "Microsoft", "Meta", "Amazon", "Netflix", "Tesla", "SpaceX", "Airbnb", "Stripe", "Uber"
];

const Marquee = () => {
    return (
        <div className={styles.wrapper}>
            <div className={styles.scroll}>
                {[...LOGOS, ...LOGOS].map((logo, i) => (
                    <div key={i} className={styles.logoItem}>
                        {logo}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Marquee;
