'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './share.module.css';
import { useAuth } from '@/lib/auth/AuthContext';
import { insforge, invokeFunction } from '@/lib/insforge';

const Ico = {
  Copy: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>,
  Check: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
  WhatsApp: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>,
  Twitter: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>,
  LinkedIn: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>,
};

export default function ShareJobPage() {
  const params = useParams();
  const { user } = useAuth();
  const [job, setJob] = useState<any>(null);
  const [referral, setReferral] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (job?.title && typeof window !== 'undefined') {
      document.title = `Refer & Share ${job.title} | TalentMesh`;
    }
  }, [job]);

  useEffect(() => {
    async function init() {
      try {
        // Fetch Job
        const { data: jobData } = await invokeFunction('jobs-id', {
          method: 'GET',
          queries: { id: Array.isArray(params.id) ? params.id[0] : params.id }
        });
        setJob(jobData?.job || jobData);

        if (user) {
          // Check for existing referral
          const { data: refData } = await insforge.database
            .from('referrals')
            .select('*')
            .eq('job_id', params.id)
            .eq('referrer_id', user.id)
            .single();

          if (refData) {
            setReferral(refData);
          } else {
            // Create new referral
            const code = Math.random().toString(36).substring(2, 8).toUpperCase();
            const { data: newRef, error: createError } = await insforge.database
              .from('referrals')
              .insert([{
                job_id: params.id,
                referrer_id: user.id,
                referral_code: code
              }])
              .select()
              .single();

            if (!createError) setReferral(newRef);
          }
        }
      } catch (err) {
        console.error('Init error:', err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [params.id, user]);

  const referralLink = referral ? `${window.location.origin}/jobs/${params.id}?ref=${referral.referral_code}` : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareText = `Check out this ${job?.title} opportunity at ${job?.company_profiles?.company_name}!`;

  if (loading) return <div className={styles.page}><p style={{ textAlign: 'center' }}>Loading...</p></div>;
  if (!user) return <div className={styles.page}><p style={{ textAlign: 'center' }}>Please <Link href="/login" style={{ color: '#1e88e5' }}>login</Link> to share and earn.</p></div>;

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <div className={styles.card}>
          <h1 className={styles.title}>Spread the Word</h1>
          <p className={styles.subtitle}>
            Refer candidates for <strong>{job?.title}</strong> and earn rewards for every successful application.
          </p>

          <div className={styles.referralBox}>
            <span className={styles.referralLabel}>Your Unique Referral Link</span>
            <div className={styles.linkWrapper}>
              <input readOnly className={styles.linkInput} value={referralLink} />
              <button className={styles.copyBtn} onClick={handleCopy}>
                {copied ? <Ico.Check /> : <Ico.Copy />} {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <div className={styles.socialGrid}>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + referralLink)}`}
              target="_blank"
              className={styles.socialBtn}
            >
              <div className={styles.socialIcon} style={{ background: '#25D366' }}><Ico.WhatsApp /></div>
              <span className={styles.socialName}>WhatsApp</span>
            </a>
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(referralLink)}`}
              target="_blank"
              className={styles.socialBtn}
            >
              <div className={styles.socialIcon} style={{ background: '#000' }}><Ico.Twitter /></div>
              <span className={styles.socialName}>X (Twitter)</span>
            </a>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`}
              target="_blank"
              className={styles.socialBtn}
            >
              <div className={styles.socialIcon} style={{ background: '#0077B5' }}><Ico.LinkedIn /></div>
              <span className={styles.socialName}>LinkedIn</span>
            </a>
          </div>

          <div className={styles.statsGrid}>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{referral?.clicks || 0}</span>
              <span className={styles.statLabel}>Link Clicks</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{referral?.applications || 0}</span>
              <span className={styles.statLabel}>Applications</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>₹{referral?.earnings || 0}</span>
              <span className={styles.statLabel}>Total Earned</span>
            </div>
          </div>

          <div style={{ marginTop: '3rem' }}>
            <Link href={`/jobs/${params.id}`} className={styles.backLink}>
              ← Back to Job Details
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
