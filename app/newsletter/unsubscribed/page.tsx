"use client";
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from '../../utility.module.css';

export default function NewsletterUnsubscribedPage() {
  return (
    <main className={styles.utilityPage}>
      <div className={`${styles.blob} ${styles.blob1}`}></div>
      <div className={`${styles.blob} ${styles.blob2}`}></div>

      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.spotlight}></div>
          <span className={styles.subtitle}>TalentMesh Insights</span>
          <h1 className={styles.title} style={{ fontSize: '3.5rem', marginBottom: '1.5rem', fontWeight: 900 }}>
            Unsubscribed
          </h1>
          <p className={styles.description}>
            You've been unsubscribed. We're sorry to see you go, and we won't send you any more newsletter insights. If you unsubscribed by mistake, you can sign up again at any time using the footer form.
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
              src="/images/customer-support.jpg"
              alt="Unsubscribed"
              width={600}
              height={400}
              priority
              style={{ objectFit: 'cover', borderRadius: '24px', opacity: 0.8, filter: 'grayscale(50%)', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
