"use client";
import React from 'react';
import styles from './skeleton.module.css';

interface SkeletonProps {
    width?: string | number;
    height?: string | number;
    circle?: boolean;
    className?: string;
    style?: React.CSSProperties;
}

export default function Skeleton({ 
    width, 
    height, 
    circle, 
    className = '', 
    style = {} 
}: SkeletonProps) {
    const skeletonStyle: React.CSSProperties = {
        width: width ?? '100%',
        height: height ?? '1rem',
        borderRadius: circle ? '50%' : '8px',
        ...style
    };

    return (
        <div 
            className={`${styles.skeletonBase} ${className}`} 
            style={skeletonStyle}
            aria-hidden="true"
        />
    );
}
