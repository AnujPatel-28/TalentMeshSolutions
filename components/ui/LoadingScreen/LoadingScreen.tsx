"use client";

import React from 'react';
import Image from 'next/image';
import styles from './LoadingScreen.module.css';

export default function LoadingScreen({ label }: { label?: string }) {
    return (
        <div className={styles.container}>
            <div className={styles.loaderContent}>
                <div className={styles.logoWrapper}>
                    <Image
                        src="/TalentMesh_page-0002-removebg-preview.png"
                        alt="TalentMesh"
                        width={200}
                        height={56}
                        priority
                        className={styles.logo}
                        unoptimized
                    />
                    <div className={styles.logoGlow} />
                </div>
                <div className={styles.spinnerWrapper}>
                    <div className={styles.spinner} />
                </div>
                {label && <p className={styles.label}>{label}</p>}
            </div>
        </div>
    );
}
