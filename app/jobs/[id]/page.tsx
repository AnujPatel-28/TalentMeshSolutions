'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './jobDetail.module.css';
import { useAuth } from '@/lib/auth/AuthContext';
import { invokeFunction } from '@/lib/insforge';
import { SectionHeader } from '@/components/ui';

const Ico = {
  Building: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" /><line x1="9" y1="6" x2="10" y2="6" /><line x1="14" y1="6" x2="15" y2="6" /><line x1="9" y1="10" x2="10" y2="10" /><line x1="14" y1="10" x2="15" y2="10" /><line x1="9" y1="14" x2="10" y2="14" /><line x1="14" y1="14" x2="15" y2="14" /><line x1="9" y1="18" x2="15" y2="18" /></svg>,
  Location: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>,
  Clock: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
  Check: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
  Share: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg>,
  Sparkle: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3 1.912 5.885L20 10.8l-5.088 1.912L13 18.6l-1.912-5.888L6 10.8l5.088-1.915Z" /></svg>,
  ArrowR: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14m-7-7 7 7-7 7" /></svg>,
};

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (job?.title && typeof window !== 'undefined') {
      document.title = `${job.title} | TalentMesh`;
    }
  }, [job]);

  useEffect(() => {
    async function fetchJob() {
      try {
        const { data, error } = await invokeFunction('jobs-id', {
          method: 'GET',
          queries: { id: Array.isArray(params.id) ? params.id[0] : params.id }
        });
        if (!error) {
          setJob(data?.job || data);
        }
      } catch (err) {
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchJob();
  }, [params.id]);

  if (loading) return <div className={styles.page}><p style={{ textAlign: 'center', padding: '10rem' }}>Loading Job Details...</p></div>;
  if (!job) return <div className={styles.page}><p style={{ textAlign: 'center', padding: '10rem' }}>Job not found.</p></div>;

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div className="premium-container">
          <div className={styles.heroInner}>
            <div className={styles.companyLogo} style={{ background: job.company_profiles?.color || '#1e88e5' }}>
              {job.company_profiles?.company_name?.[0] || 'J'}
            </div>
            <div className={styles.heroInfo}>
              <h1 className={styles.heroTitle}>{job.title}</h1>
              <div className={styles.heroMeta}>
                <span className={styles.heroMetaItem}><Ico.Building /> {job.company_profiles?.company_name}</span>
                <span className={styles.heroMetaItem}><Ico.Location /> {job.location}</span>
                <span className={styles.heroMetaItem}><Ico.Clock /> {job.type}</span>
              </div>
              <div className={styles.heroBadges}>
                <span className={`${styles.badge} ${styles.badgeType}`}>{job.category || job.department}</span>
                <span className={`${styles.badge} ${styles.badgeSalary}`}>₹{job.salary_min / 100000}L - ₹{job.salary_max / 100000}L</span>
                {job.ai_match_rate >= 80 && (
                  <span className={`${styles.badge} ${styles.badgeMatch}`}><Ico.Sparkle /> High Match</span>
                )}
              </div>
            </div>
            <div className={styles.heroActions}>
              {user ? (
                <Link href={`/jobs/${job.id}/apply`} className={styles.applyBtn}>
                  Apply Now <Ico.ArrowR />
                </Link>
              ) : (
                <Link href={`/login?rd=${encodeURIComponent(`/jobs/${job.id}/apply`)}`} className={styles.applyBtn}>
                  Login to Apply <Ico.ArrowR />
                </Link>
              )}
              <div className={styles.shareToEarn}>
                <span className={styles.shareTitle}>Share & Earn</span>
                <span className={styles.shareDesc}>Earn points for every successful referral.</span>
                <button 
                  className={styles.shareBtn}
                  onClick={() => router.push(`/jobs/${job.id}/share`)}
                >
                  <Ico.Share /> Get Referral Link
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="premium-container">
        <div className={styles.body}>
          <div className={styles.leftCol}>
            <section className={styles.card}>
              <h2 className={styles.cardTitle}>About the Role</h2>
              <div className={styles.description}>{job.description}</div>
            </section>

            {job.requirements && job.requirements.length > 0 && (
              <section className={styles.card}>
                <h2 className={styles.cardTitle}>Requirements</h2>
                <div className={styles.requirementList}>
                  {job.requirements.map((req: string, i: number) => (
                    <div key={i} className={styles.requirementItem}>
                      <span className={styles.checkIcon}><Ico.Check /></span>
                      <span>{req}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {job.skills_required && job.skills_required.length > 0 && (
              <section className={styles.card}>
                <h2 className={styles.cardTitle}>Desired Skills</h2>
                <div className={styles.popularTags} style={{ justifyContent: 'flex-start', marginTop: 0 }}>
                  {job.skills_required.map((skill: string) => (
                    <span key={skill} className={styles.popularTag}>{skill}</span>
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className={styles.sidebar}>
            <div className={styles.sidebarCard}>
              <h3 className={styles.overviewTitle}>Job Overview</h3>
              <div className={styles.overviewRow}>
                <span className={styles.overviewLabel}>Posted Date</span>
                <span className={styles.overviewValue}>{new Date(job.created_at).toLocaleDateString()}</span>
              </div>
              <div className={styles.overviewRow}>
                <span className={styles.overviewLabel}>Location</span>
                <span className={styles.overviewValue}>{job.location}</span>
              </div>
              <div className={styles.overviewRow}>
                <span className={styles.overviewLabel}>Job Type</span>
                <span className={styles.overviewValue}>{job.type}</span>
              </div>
              <div className={styles.overviewRow}>
                <span className={styles.overviewLabel}>Experience</span>
                <span className={styles.overviewValue}>{job.experience_min}+ Years</span>
              </div>
              <div className={styles.overviewRow}>
                <span className={styles.overviewLabel}>Openings</span>
                <span className={styles.overviewValue}>{job.openings || 1}</span>
              </div>
              <div className={styles.overviewRow}>
                <span className={styles.overviewLabel}>Deadline</span>
                <span className={styles.overviewValue}>
                  {job.deadline ? new Date(job.deadline).toLocaleDateString() : 'Rolling'}
                </span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
