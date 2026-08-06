"use client";

import React from 'react';
import Link from 'next/link';
import styles from './CTA.module.css';
import { DottedGlowBackground } from '../dotted-glow-background';
import AnimateOnScroll from '@/components/AnimateOnScroll';

interface CTAProps {
  title: React.ReactNode;
  description: string;
  buttonText: string;
  buttonLink?: string;
  buttonAction?: () => void;
  className?: string;
}

export default function CTA({
  title,
  description,
  buttonText,
  buttonLink,
  buttonAction,
  className = '',
}: CTAProps) {
  const content = (
    <div className={styles.ctaContent}>
      <h2 className={styles.ctaTitle}>{title}</h2>
      <p className={styles.ctaDesc}>{description}</p>
      {buttonAction ? (
        <button onClick={buttonAction} className={styles.ctaBtn}>
          {buttonText}
        </button>
      ) : buttonLink ? (
        <Link href={buttonLink} className={styles.ctaBtn}>
          {buttonText}
        </Link>
      ) : (
        <button className={styles.ctaBtn}>{buttonText}</button>
      )}
    </div>
  );

  return (
    <AnimateOnScroll animation="scaleUp">
      <section className={`${styles.ctaSection} ${className}`}>
        <div className={styles.outerContainer}>
          <DottedGlowBackground 
            opacity={0.3} 
            gap={14} 
            radius={1.2} 
            color="rgba(255,255,255,0.12)" 
            glowColor="rgba(59, 130, 246, 0.55)" 
          />
          <div className={styles.ctaCard}>
            {content}
          </div>
        </div>
      </section>
    </AnimateOnScroll>
  );
}
