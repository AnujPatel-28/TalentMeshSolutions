"use client";
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from '../../utility.module.css';

export default function NewsletterConfirmedPage() {
  return (
    <main className={styles.utilityPage}>
      <div className={`${styles.blob} ${styles.blob1}`}></div>
      <div className={`${styles.blob} ${styles.blob2}`}></div>

      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.spotlight}></div>
          <span className={styles.subtitle}>TalentMesh Insights</span>
          <h1 className={styles.title} style={{ fontSize: '3.5rem', marginBottom: '1.5rem', fontWeight: 900 }}>
            Subscription <span className="text-gradient">Active!</span>
          </h1>
          <p className={styles.description}>
            Welcome to TalentMesh Insights! Your subscription is now active. You will start receiving monthly recruitment trends, hiring best practices, AI updates, and career advice directly to your inbox.
          </p>
          <div className={styles.buttonGroup}>
            <Link href="/" className={styles.primaryButton}>
              Explore TalentMesh
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
              alt="Subscription Confirmed"
              width={600}
              height={400}
              priority
              style={{ objectFit: 'cover', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
