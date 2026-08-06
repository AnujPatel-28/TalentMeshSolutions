"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import styles from '../../utility.module.css';

export default function NewsletterTokenExpiredPage() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await fetch('/api/newsletter/resend-confirmation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message || 'Confirmation email sent! Please check your inbox.');
      } else {
        setError(data.error || 'Failed to resend confirmation. Please try again.');
      }
    } catch (err) {
      setError('Connection failed. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.utilityPage}>
      <div className={`${styles.blob} ${styles.blob1}`}></div>
      <div className={`${styles.blob} ${styles.blob2}`}></div>

      <div className={styles.container} style={{ gridTemplateColumns: '1fr' }}>
        <div className={styles.content} style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <div className={styles.spotlight}></div>
          <span className={styles.subtitle}>Link Expired</span>
          <h1 className={styles.title} style={{ fontSize: '3rem', marginBottom: '1.5rem', fontWeight: 900 }}>
            Link Has Expired
          </h1>
          <p className={styles.description} style={{ margin: '1.5rem auto', maxWidth: '100%' }}>
            For your security, confirmation links expire after 24 hours. Enter your email below to receive a new confirmation link.
          </p>

          <div style={{ background: 'rgba(255, 255, 255, 0.8)', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '2.5rem', marginTop: '2rem', backdropFilter: 'blur(8px)', width: '100%' }}>
            {message ? (
              <div style={{ color: '#22c55e', fontWeight: 600, fontSize: '1.1rem' }}>
                ✓ {message}
              </div>
            ) : (
              <form onSubmit={handleResend} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  style={{ width: '100%', padding: '1rem 1.5rem', borderRadius: '100px', border: '2px solid #cbd5e1', outline: 'none', fontSize: '1rem', background: '#ffffff', transition: 'border-color 0.2s' }}
                />
                
                {error && (
                  <div style={{ color: '#ef4444', fontSize: '0.9rem', textAlign: 'left', paddingLeft: '1rem' }}>
                    ⚠ {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  style={{ width: '100%', background: 'var(--primary-blue)', color: '#ffffff', border: 'none', borderRadius: '100px', padding: '1rem 2rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 10px 30px rgba(0, 123, 255, 0.15)' }}
                >
                  {loading ? 'Sending...' : 'Resend Confirmation Email'}
                </button>
              </form>
            )}
          </div>

          <div style={{ marginTop: '2.5rem' }}>
            <Link href="/" style={{ color: 'var(--primary-blue)', fontWeight: 700, textDecoration: 'none' }}>
              Return to Home Page
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
