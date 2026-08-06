"use client";
import React from 'react';
import Link from 'next/link';
import styles from './ContentCard.module.css';

interface ContentCardProps {
    title: string;
    description: string;
    category: string;
    date: string;
    link: string;
    image?: string;
    icon?: React.ReactNode;
}

const ContentCard: React.FC<ContentCardProps> = ({ title, description, category, date, link, image, icon }) => {
    return (
        <div className={styles.card}>
            {image ? (
                <div className={styles.imageWrapper}>
                    <div style={{ background: 'var(--light-ice-blue)', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {icon || <span style={{ fontSize: '2rem' }}>📄</span>}
                    </div>
                </div>
            ) : null}
            <div className={styles.content}>
                <div className={styles.meta}>
                    <span className={styles.category}>{category}</span>
                    <span className={styles.dot}></span>
                    <span className={styles.date}>{date}</span>
                </div>
                <h3 className={styles.title}>{title}</h3>
                <p className={styles.description}>{description}</p>
                <Link href={link} className={styles.link}>
                    Read More <span>&rarr;</span>
                </Link>
            </div>
        </div>
    );
};

export default ContentCard;
