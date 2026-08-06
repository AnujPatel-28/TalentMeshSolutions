"use client"
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from '@/app/utility.module.css';

export default function UnderConstructionPage() {
    return (
        <main className={styles.utilityPage}>
            {/* Background Depth */}
            <div className={`${styles.blob} ${styles.blob1}`}></div>
            <div className={`${styles.blob} ${styles.blob2}`}></div>

            <div className={styles.container}>
                <div className={styles.visualSide}>
                    <div className={styles.illustration}>
                        <Image
                            src="/under construction.png"
                            alt="Under Construction"
                            width={600}
                            height={600}
                            priority
                            style={{ objectFit: 'contain' }}
                        />
                    </div>
                </div>

                <div className={styles.content}>
                    <div className={styles.spotlight}></div>
                    <span className={styles.subtitle}>Coming Soon</span>
                    <h1 className={styles.title} style={{ fontSize: '4.5rem' }}>
                        We're under <br /> construction.
                    </h1>
                    <p className={styles.description}>
                        The talent protocol you're looking for is currently being upgraded.
                        Subscribe below to get notified when we launch.
                    </p>

                    <div style={{
                        display: 'flex',
                        background: '#ffffff',
                        border: '2px solid #e2e8f0',
                        borderRadius: '100px',
                        padding: '6px',
                        maxWidth: '600px',
                        margin: '0 auto',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.05)',
                        overflow: 'hidden'
                    }}>
                        <input
                            type="email"
                            placeholder="Enter Your Email..."
                            style={{
                                flexGrow: 1,
                                padding: '1rem 2rem',
                                border: 'none',
                                outline: 'none',
                                fontSize: '1.1rem',
                                color: 'var(--deep-navy)',
                                fontWeight: 500,
                                background: 'transparent'
                            }}
                        />
                        <button className={styles.primaryButton} style={{
                            padding: '1.25rem 3.5rem',
                            boxShadow: 'none',
                            margin: 0
                        }}>
                            Subscribe
                        </button>
                    </div>

                    <div style={{ marginTop: '4rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '1.5rem', opacity: 0.6 }}>
                            <Link href="/" style={{ color: 'var(--deep-navy)', fontWeight: 700, textDecoration: 'none' }}>Return Home</Link>
                            <span style={{ color: '#cbd5e1' }}>|</span>
                            <Link href="/portals/jobs/contact" style={{ color: 'var(--deep-navy)', fontWeight: 700, textDecoration: 'none' }}>Contact Support</Link>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
