"use client";
import React from 'react';
import styles from './PageHeader.module.css';
import HeroBg from '../HeroBg/HeroBg';

interface PageHeaderProps {
    title: string;
    description: string;
    breadcrumb?: string;
    highlight?: string;
    light?: boolean;
    bgImage?: string;
    animDelay?: number;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, description, breadcrumb, highlight, light, bgImage, animDelay }) => {
    return (
        <section className={`${styles.header} ${light ? styles.light : ''} ${bgImage ? styles.withBg : ''}`}>
            {bgImage && <HeroBg src={bgImage} animDelay={animDelay} />}
            <div className={styles.container}>
                {breadcrumb && <span className={styles.breadcrumb}>{breadcrumb}</span>}
                <h1 className={styles.title}>
                    {title} {highlight && <span className={styles.highlight}>{highlight}</span>}
                </h1>
                <p className={styles.description}>{description}</p>
            </div>
            <div className={styles.decor1}></div>
            <div className={styles.decor2}></div>
        </section>
    );
};

export default PageHeader;
