"use client";
import React, { useState } from 'react';
import Image from 'next/image';
import styles from './HoverImageList.module.css';

export interface HoverImageListItem {
    id: string;
    title: string;
    subtitle?: string;
    badge?: string;
    stat?: string;
    image: string;
}

interface HoverImageListProps {
    items: HoverImageListItem[];
}

export default function HoverImageList({ items }: HoverImageListProps) {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(0);

    return (
        <div className={styles.container}>
            {items.map((item, idx) => (
                <div
                    key={item.id || idx}
                    className={styles.item}
                    onMouseEnter={() => setHoveredIndex(idx)}
                >
                    <div>
                        <h4 className={styles.title}>{item.title}</h4>
                        {item.subtitle && <p className={styles.subtitle}>{item.subtitle}</p>}
                    </div>
                    {item.badge && <span className={styles.badge}>{item.badge}</span>}
                </div>
            ))}
        </div>
    );
}
