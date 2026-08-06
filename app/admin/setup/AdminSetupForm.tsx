"use client";
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { insforge } from '@/lib/insforge';
import { validateNewPassword } from '@/lib/validation/auth';
import styles from '@/app/(auth)/login/login.module.css';

type Step = 'form' | 'otp' | 'success';

export default function AdminSetupForm() {
  const [step, setStep] = useState<Step>('form');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const [otpSentAt, setOtpSentAt] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(120);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // 2-minute OTP expiration timer
  useEffect(() => {
    if (!otpSentAt) return;
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - otpSentAt) / 1000);
      const remaining = Math.max(0, 120 - elapsed);
      setTimeLeft(remaining);
      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [otpSentAt]);

  const getPasswordStrength = (pass: string) => {
    let score = 0;
    if (!pass) return { score: 0, label: 'Weak', color: '#ef4444' };
    if (pass.length > 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 1) return { score: 25, label: 'Weak', color: '#ef4444' };
    if (score === 2) return { score: 50, label: 'Fair', color: '#f59e0b' };
    if (score === 3) return { score: 75, label: 'Good', color: '#10b981' };
    return { score: 100, label: 'Strong', color: '#059669' };
  };

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    const pwdError = validateNewPassword(password);
    if (pwdError) {
      setError(pwdError);
      setIsLoading(false);
      return;
    }

    try {
      const { error: signUpError, data } = await insforge.auth.signUp({
        email,
        password,
        name: fullName,
      });

      if (signUpError) {
        if (signUpError.message.includes('User already registered')) {
          setError('An account with this email already exists. Please use the login page.');
        } else {
          setError(signUpError.message);
        }
        setIsLoading(false);
        return;
      }

      // If email verification is required, show OTP step
      if (data?.requireEmailVerification) {
        setStep('otp');
        setOtpSentAt(Date.now());
        setTimeLeft(120);
        setResendCooldown(60);
        setIsLoading(false);
        return;
      }

      // No verification required — go straight to success
      setStep('success');
    } catch (err: any) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (timeLeft <= 0) {
      setError('Verification code has expired. Please click "Resend Code" to get a new one.');
      return;
    }
    setIsLoading(true);
    setError('');

    try {
      const { data, error: verifyError } = await insforge.auth.verifyEmail({
        email,
        otp,
      });

      if (verifyError) {
        if (verifyError.message?.includes('expired')) {
          setError('Code has expired. Please click "Resend Code" to get a new one.');
        } else {
          setError(verifyError.message || 'Invalid verification code. Please try again.');
        }
        setIsLoading(false);
        return;
      }

      if (!data?.user) {
        setError('Verification failed. Please try again.');
        setIsLoading(false);
        return;
      }

      // Email verified successfully — show success
      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = useCallback(async () => {
    if (resendCooldown > 0) return;
    setError('');

    try {
      await insforge.auth.resendVerificationEmail({ email });
      setOtpSentAt(Date.now());
      setTimeLeft(120);
      setResendCooldown(60);
    } catch (err: any) {
      setError('Failed to resend code. Please try again.');
    }
  }, [email, resendCooldown]);

  // ── SUCCESS STEP ──
  if (step === 'success') {
    return (
      <div className={styles.card}>
        <div className={styles.successCard}>
          <div className={styles.successIcon}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className={styles.title}>Admin Account Created!</h2>
          <p className={styles.subtitle} style={{ marginBottom: '32px' }}>
            Your email has been verified. You can now log in to the admin portal.
          </p>
          <Link href="/login" className={styles.submitBtn}>
            Go to Admin Login
          </Link>
        </div>
      </div>
    );
  }

  // ── OTP VERIFICATION STEP ──
  if (step === 'otp') {
    return (
      <div className={styles.card}>
        <div className={styles.badgeWrap}>
          <span className={styles.badge}>Email Verification</span>
        </div>

        <div className={styles.header}>
          <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
          <h1 className={styles.title}>Check your email</h1>
          <p className={styles.subtitle}>
            We sent a 6-digit verification code to<br /><strong>{email}</strong>
          </p>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <form className={styles.form} onSubmit={handleVerifyOtp}>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Verification Code</label>
            <input
              type="text"
              className={styles.input}
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
              maxLength={6}
              disabled={isLoading}
              style={{ textAlign: 'center', letterSpacing: '0.5em', fontSize: '1.2rem', fontWeight: 600 }}
              autoFocus
            />
          </div>
          <div style={{ textAlign: 'center', marginTop: '0.5rem', marginBottom: '1rem' }}>
            {timeLeft > 0 ? (
              <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Code expires in <span style={{ fontWeight: 600, color: '#6366f1' }}>{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
              </p>
            ) : (
              <p style={{ fontSize: '0.85rem', color: '#ef4444', fontWeight: 600 }}>
                Code has expired. Please click "Resend Code" to get a new one.
              </p>
            )}
          </div>

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={isLoading || otp.length < 6 || timeLeft <= 0}
          >
            {isLoading ? (
              <>
                <span className={styles.spinner} />
                Verifying...
              </>
            ) : (
              'Verify & Continue'
            )}
          </button>

          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <button
              type="button"
              onClick={handleResendCode}
              disabled={resendCooldown > 0}
              style={{
                background: 'none',
                border: 'none',
                color: resendCooldown > 0 ? '#9ca3af' : '#6366f1',
                cursor: resendCooldown > 0 ? 'default' : 'pointer',
                fontSize: '0.85rem',
                fontWeight: 500,
                textDecoration: resendCooldown > 0 ? 'none' : 'underline',
              }}
            >
              {resendCooldown > 0
                ? `Resend code in ${resendCooldown}s`
                : 'Resend Code'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ── SIGNUP FORM STEP ──
  return (
    <div className={styles.card}>
      <div className={styles.badgeWrap}>
        <span className={styles.badge}>System Setup</span>
      </div>

      <div className={styles.header}>
        <h1 className={styles.title}>Create Admin Account</h1>
        <p className={styles.subtitle}>Fill in the details to establish your profile</p>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Full Name</label>
          <input
            type="text"
            className={styles.input}
            placeholder="John Doe"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label}>Email Address</label>
          <input
            type="email"
            className={styles.input}
            placeholder="admin@talentmesh.ai"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label}>Password</label>
          <input
            type="password"
            className={styles.input}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
          />
          <div className={styles.strengthBar}>
            <div 
              className={styles.strengthIndicator} 
              style={{ width: `${strength.score}%`, background: strength.color }}
            />
          </div>
          <div className={styles.strengthText} style={{ color: strength.color }}>
            {strength.label}
          </div>
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label}>Confirm Password</label>
          <input
            type="password"
            className={styles.input}
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>

        <button
          type="submit"
          className={styles.submitBtn}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className={styles.spinner} />
              Creating Account...
            </>
          ) : (
            'Complete Setup'
          )}
        </button>
      </form>
    </div>
  );
}
