"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import styles from '@/app/(auth)/login/login.module.css';

export default function AdminForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      // POST to the server-side API route — admin emails are NEVER checked client-side
      const res = await fetch('/api/admin/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (!res.ok) {
        throw new Error('Server error. Please try again.');
      }

      // Redirect to enter the OTP code
      router.push(`/admin/reset-password?email=${encodeURIComponent(email.trim())}`);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.bgGlow} />
      <div className={styles.gridOverlay} />

      <div className={styles.container}>
        <Link href="/" className={styles.logoWrap}>
          <Image
            src="/TalentMesh_page-0002-removebg-preview.png"
            alt="TalentMesh"
            width={160}
            height={44}
            unoptimized
            style={{ height: 'auto' }}
          />
        </Link>

        <div className={styles.card}>
          <div className={styles.badgeWrap}>
            <span className={styles.badge}>Admin Portal</span>
          </div>

          <div className={styles.header}>
            <h1 className={styles.title}>Forgot Password</h1>
            <p className={styles.subtitle}>Enter your admin email to receive a reset link</p>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          {message ? (
            <div style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              color: '#6ee7b7',
              fontSize: '0.83rem',
              padding: '12px 16px',
              borderRadius: '10px',
              marginBottom: '8px',
              textAlign: 'center',
              lineHeight: 1.5,
            }}>
              {message}
            </div>
          ) : (
            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="email">Admin Email Address</label>
                <div className={styles.inputWrap}>
                  <input
                    id="email"
                    type="email"
                    className={styles.input}
                    placeholder="admin@talentmesh.ai"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    autoComplete="email"
                  />
                </div>
              </div>

              <button
                type="submit"
                className={styles.submitBtn}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className={styles.spinner} />
                    Sending...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>
          )}

          <div className={styles.footer}>
            <Link href="/login" className={styles.backLink}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
