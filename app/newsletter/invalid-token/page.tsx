"use client";
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from '../../utility.module.css';

export default function NewsletterInvalidTokenPage() {
  return (
    <main className={styles.utilityPage}>
      <div className={`${styles.blob} ${styles.blob1}`}></div>
      <div className={`${styles.blob} ${styles.blob2}`}></div>

      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.spotlight}></div>
          <span className={styles.subtitle}>Authentication Error</span>
          <h1 className={styles.title} style={{ fontSize: '3.5rem', marginBottom: '1.5rem', fontWeight: 900 }}>
            Invalid Link
          </h1>
          <p className={styles.description}>
            This confirmation link is invalid or has already been used. Please subscribe again using the form in the website footer to get a new confirmation link.
          </p>
          <div className={styles.buttonGroup}>
            <Link href="/" className={styles.primaryButton}>
              Go to Home Page
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>
        </div>

        <div className={styles.visualSide}>
          <div className={styles.illustration}>
            <Image
              src="/404.png"
              alt="Invalid Token"
              width={600}
              height={600}
              priority
              style={{ objectFit: 'contain' }}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
