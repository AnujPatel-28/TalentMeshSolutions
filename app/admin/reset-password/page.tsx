"use client";
import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { insforge } from '@/lib/insforge';
import { validateNewPassword } from '@/lib/validation/auth';
import styles from '@/app/(auth)/login/login.module.css';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(5);

  const [otp, setOtp] = useState('');
  const [isResending, setIsResending] = useState(false);

  const emailParam = searchParams.get('email');
  const tokenParam = searchParams.get('token');

  // If token is in URL (magic link fallback), pre-fill the OTP state
  useEffect(() => {
    if (tokenParam && !otp) {
      setOtp(tokenParam);
    }
  }, [tokenParam, otp]);

  // Auto-redirect to login after successful reset
  useEffect(() => {
    if (!message) return;
    if (countdown <= 0) {
      router.push('/login');
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [message, countdown, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const pwdError = validateNewPassword(password);
    if (pwdError) {
      setError(pwdError);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!otp) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      let finalToken = otp.trim();

      // If the user entered a 6-digit code, we must exchange it for a proper reset token first
      if (finalToken.length === 6 && emailParam) {
        const exchangeRes = await fetch(`${process.env.NEXT_PUBLIC_INSFORGE_URL}/api/auth/email/exchange-reset-password-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: emailParam,
            code: finalToken,
          }),
        });

        if (!exchangeRes.ok) {
          throw new Error('Verification code is invalid or has expired.');
        }

        const exchangeData = await exchangeRes.json();
        if (!exchangeData.token) {
          throw new Error('Failed to retrieve secure reset token.');
        }
        finalToken = exchangeData.token;
      }

      // Now use the secure token to reset the password
      const { error: resetError } = await insforge.auth.resetPassword({
        newPassword: password,
        otp: finalToken,
      });

      if (resetError) {
        // Provide friendlier messages for common errors
        const msg = resetError.message || '';
        if (msg.toLowerCase().includes('expired') || msg.toLowerCase().includes('invalid')) {
          setError('This reset link or code has expired/invalid. Please request a new one.');
        } else {
          setError(msg || 'Failed to reset password. Please try again.');
        }
      } else {
        setMessage('Password updated successfully! Redirecting to login...');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!emailParam) {
      setError('Email is missing from the URL. Please go back to Request a New Link.');
      return;
    }

    setIsResending(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/admin/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailParam }),
      });

      if (!res.ok) {
        throw new Error('Failed to resend code');
      }

      setMessage('A new verification code has been sent to your email.');
    } catch (err: any) {
      setError('Failed to resend the code. Please try again later.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.badgeWrap}>
        <span className={styles.badge}>Admin Security</span>
      </div>

      <div className={styles.header}>
        <h1 className={styles.title}>Reset Password</h1>
        <p className={styles.subtitle}>
          {emailParam 
            ? `Enter the 6-digit code sent to ${emailParam}`
            : 'Enter your verification code and new password'}
        </p>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {message ? (
        <div className={styles.successCard}>
          <div className={styles.successIcon}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <p style={{ color: '#d1d5db', textAlign: 'center', fontSize: '0.88rem', margin: 0 }}>
            {message}
          </p>
          <p style={{ color: '#6b6b8a', fontSize: '0.78rem', margin: 0 }}>
            Redirecting in {countdown}s...
          </p>
          <Link href="/login" className={styles.submitBtn} style={{ marginTop: '0.5rem' }}>
            Go to Login Now
          </Link>
        </div>
      ) : (
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="otp">Verification Code</label>
            <div className={styles.inputWrap}>
              <input
                id="otp"
                type="text"
                className={styles.input}
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="one-time-code"
              />
            </div>
            {emailParam && (
               <button
                 type="button"
                 onClick={handleResendCode}
                 disabled={isResending}
                 style={{
                   background: 'none',
                   border: 'none',
                   color: '#6366f1',
                   fontSize: '0.8rem',
                   padding: 0,
                   marginTop: '0.5rem',
                   cursor: isResending ? 'not-allowed' : 'pointer',
                   opacity: isResending ? 0.6 : 1,
                 }}
               >
                 {isResending ? 'Resending...' : 'Resend Code'}
               </button>
            )}
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="password">New Password</label>
            <div className={styles.inputWrap}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className={styles.input}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="new-password"
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            <span className={styles.strengthHint}>Minimum 8 characters</span>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="confirmPassword">Confirm New Password</label>
            <div className={styles.inputWrap}>
              <input
                id="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                className={styles.input}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="new-password"
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowConfirm(!showConfirm)}
                aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
              >
                {showConfirm ? (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={isLoading || !otp}
          >
            {isLoading ? (
              <>
                <span className={styles.spinner} />
                Updating...
              </>
            ) : (
              'Update Password'
            )}
          </button>
        </form>
      )}

      {!message && (
        <div className={styles.footer}>
          <Link href="/admin/forgot-password" className={styles.backLink}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Request a new link
          </Link>
        </div>
      )}
    </div>
  );
}

export default function AdminResetPasswordPage() {
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

        <Suspense fallback={
          <div className={styles.card}>
            <p style={{ color: '#6b6b8a', textAlign: 'center' }}>Loading...</p>
          </div>
        }>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
