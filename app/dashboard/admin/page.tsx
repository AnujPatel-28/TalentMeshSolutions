"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import styles from '../shared-dashboard.module.css';
import dynamic from 'next/dynamic';
const AnimateOnScroll = dynamic(() => import('@/components/AnimateOnScroll'), { ssr: false });
import { StatsSkeleton, AlertsSkeleton, ActivitiesSkeleton, QuickActionsSkeleton } from './_components/WidgetSkeletons';
import RefreshButton from './_components/RefreshButton';
import { useAdminDashboardSummary, useInvalidateAdminDashboard, metricValue, metricFailed } from '@/lib/queries/useAdminDashboardSummary';
import type { AdminDashboardData } from '@/lib/queries/useAdminDashboardSummary';
import { WidgetErrorState, StatsErrorState } from './_components/DashboardErrorState';
import { cn } from '@/lib/utils';

/* ─── Icons ─── */
const IC = {
  users: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  clipboard: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>,
  send: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /></svg>,
  alertCircle: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>,
  plus: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
  barChart: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" /></svg>,
  checkCircle: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>,
  eye: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>,
  settings: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>,
};

import StatCard from '@/components/dashboard/StatCard';

type DashboardData = AdminDashboardData;

export default function AdminDashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Shared React Query hook — same data the sidebar layout consumes
  const { data: dashboardData, isLoading: queryLoading, error: queryError, refetch } = useAdminDashboardSummary(!!user);
  const invalidateAdminDashboard = useInvalidateAdminDashboard();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  // Track when data was last successfully fetched
  useEffect(() => {
    if (dashboardData && !queryLoading) {
      setLastUpdated(Date.now());
    }
  }, [dashboardData, queryLoading]);

  // Manual refresh handler for RefreshButton
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      invalidateAdminDashboard();
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [invalidateAdminDashboard, refetch]);

  // Retry backoff for the error states. Owned here, not inside the error widgets: a retry
  // swaps them for loading skeletons, so state held in the widgets would be lost on unmount
  // and the backoff would never actually throttle anything.
  const [retryCount, setRetryCount] = useState(0);
  const [retryCooldown, setRetryCooldown] = useState(0);

  useEffect(() => {
    if (retryCooldown <= 0) return;
    const interval = setInterval(() => {
      setRetryCooldown((prev) => {
        const next = prev - 0.1;
        return next <= 0 ? 0 : next;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [retryCooldown]);

  // Retry handler (for error states)
  const handleRetry = useCallback(() => {
    if (retryCooldown > 0) return;
    setRetryCount((prev) => prev + 1);
    invalidateAdminDashboard();
    refetch();
  }, [retryCooldown, invalidateAdminDashboard, refetch]);

  const statsLoading = authLoading || queryLoading;
  const fetchError = queryError ? (queryError as Error).message : null;

  // The error widgets are swapped for skeletons while a retry is in flight (~1s), so a
  // cooldown started at click time expires off-screen and throttles nothing. Start it when
  // a user-initiated retry has failed and the error state is back on screen.
  useEffect(() => {
    if (retryCount === 0 || queryLoading || !fetchError) return;
    // Backoff schedule: 0.5s -> 1.0s -> 2.0s -> 2.0s ...
    setRetryCooldown(retryCount === 1 ? 0.5 : retryCount === 2 ? 1.0 : 2.0);
  }, [retryCount, queryLoading, fetchError]);

  if (authLoading) {
    return (
      <div className={cn(styles.dash, styles.dashPremium)}>
        <StatsSkeleton />
        <div className={styles.mainGrid}>
          <div className={styles.leftCol}>
            <AlertsSkeleton />
            <ActivitiesSkeleton />
          </div>
          <div className={styles.rightCol}>
            <QuickActionsSkeleton />
          </div>
        </div>
      </div>
    );
  }

  const candidatesFailed = metricFailed(dashboardData?.metrics.totalCandidates);
  const recruitersFailed = metricFailed(dashboardData?.metrics.totalRecruiters);
  const totalCandidates = metricValue(dashboardData?.metrics.totalCandidates, 0);
  const totalRecruiters = metricValue(dashboardData?.metrics.totalRecruiters, 0);
  const totalUsers = totalCandidates + totalRecruiters;

  return (
    <div className={cn(styles.dash, styles.dashPremium)}>
      <div className={styles.greet} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className={styles.greetTitle}>Welcome back, {user?.name || 'Admin'}!</h1>
          <p className={styles.greetSub}>Overview: Monitor, approve, and manage jobs, recruiters, and candidates.</p>
        </div>
        <RefreshButton onRefresh={handleRefresh} isRefreshing={isRefreshing} lastUpdated={lastUpdated} />
      </div>

      {/* Sub-Navigation Tabs */}
      <div style={{ borderBottom: '1px solid var(--sidebar-border)', marginBottom: '1.5rem', display: 'flex', gap: '1.25rem' }}>
        <button
          className={styles.viewAll}
          style={{ fontSize: '0.85rem', padding: '0.6rem 0.1rem', borderBottom: '2px solid var(--primary-blue)', color: 'var(--primary-blue)', fontWeight: 700, cursor: 'default' }}
        >
          Overview
        </button>
        <button
          onClick={() => router.push('/dashboard/admin/reports')}
          className={styles.viewAll}
          style={{ fontSize: '0.85rem', padding: '0.6rem 0.1rem', borderBottom: '2px solid transparent', color: 'var(--neutral-text-muted)', fontWeight: 600 }}
        >
          Reports
        </button>
        <button
          onClick={() => router.push('/dashboard/admin/recruiters')}
          className={styles.viewAll}
          style={{ fontSize: '0.85rem', padding: '0.6rem 0.1rem', borderBottom: '2px solid transparent', color: 'var(--neutral-text-muted)', fontWeight: 600 }}
        >
          Team & Access
        </button>
        <button
          onClick={() => router.push('/dashboard/admin/settings')}
          className={styles.viewAll}
          style={{ fontSize: '0.85rem', padding: '0.6rem 0.1rem', borderBottom: '2px solid transparent', color: 'var(--neutral-text-muted)', fontWeight: 600 }}
        >
          Settings
        </button>
      </div>

      {/* Stats Widgets */}
      <AnimateOnScroll animation="fadeUp" delay={100}>
        {statsLoading ? (
          <StatsSkeleton />
        ) : fetchError && !dashboardData ? (
          <StatsErrorState onRetry={handleRetry} cooldown={retryCooldown} />
        ) : (
          <div className={styles.stats}>
            <StatCard
              label="Total Users"
              value={totalUsers}
              icon={IC.users}
              delta={`${totalCandidates} cand. + ${totalRecruiters} rec.`}
              error={candidatesFailed || recruitersFailed}
            />
            <StatCard
              label="Active Jobs"
              value={metricValue(dashboardData?.metrics.activeJobs, 0)}
              icon={IC.clipboard}
              delta="Approved & live listings"
              error={metricFailed(dashboardData?.metrics.activeJobs)}
            />
            <StatCard
              label="Total Applications"
              value={metricValue(dashboardData?.metrics.totalApplications, 0)}
              icon={IC.send}
              delta="Across all active job posts"
              error={metricFailed(dashboardData?.metrics.totalApplications)}
            />
            <StatCard
              label="Recruiters"
              value={totalRecruiters}
              icon={IC.checkCircle}
              delta="Approved recruiter accounts"
              error={recruitersFailed}
            />
            <StatCard
              label="Companies"
              value={
                metricValue(dashboardData?.companyKpis.companiesByStatus, { pending: 0, verified: 0, suspended: 0, deactivated: 0 }).verified
              }
              icon={IC.checkCircle}
              delta={(() => {
                const s = metricValue(dashboardData?.companyKpis.companiesByStatus, { pending: 0, verified: 0, suspended: 0, deactivated: 0 });
                return `${s.verified} verified · ${s.pending} pending · ${s.suspended} suspended`;
              })()}
              error={metricFailed(dashboardData?.companyKpis.companiesByStatus)}
              onClick={() => router.push('/dashboard/admin/companies')}
            />
            <StatCard
              label="Job Slots Used"
              value={(() => {
                const slots = metricValue(dashboardData?.companyKpis.activeJobSlots, { used: 0, limit: 0 });
                return `${slots.used}/${slots.limit}`;
              })()}
              icon={IC.barChart}
              delta="Active jobs vs plan capacity"
              error={metricFailed(dashboardData?.companyKpis.activeJobSlots)}
            />
          </div>
        )}
      </AnimateOnScroll>

      {/* Main Grid */}
      <AnimateOnScroll animation="fadeUp" delay={200}>
        <div className={styles.mainGrid}>
          <div className={styles.leftCol}>
            {/* Alerts Panel */}
            {statsLoading ? (
              <AlertsSkeleton />
            ) : fetchError && !dashboardData ? (
              <WidgetErrorState 
                title="Review Queue Error" 
                errorMessage="Could not retrieve the review queue metrics." 
                onRetry={handleRetry}
                cooldown={retryCooldown}
              />
            ) : (
              dashboardData?.alerts && (
                <div className={styles.cardPremium}>
                  <div className={styles.cardHead}>
                    <h2 className={styles.cardTitlePremium}>Review Queue</h2>
                  </div>
                  {dashboardData.alerts.pendingRecruiters > 0 || dashboardData.alerts.pendingJobs > 0 || dashboardData.alerts.reportedJobs > 0 || dashboardData.alerts.pendingVerifications > 0 ? (
                    <>
                      {dashboardData.alerts.pendingVerifications > 0 && (
                        <div className={styles.actItem}>
                          <span className={styles.actIcon} style={{ color: '#f59e0b' }}>{IC.alertCircle}</span>
                          <div className={styles.actContent}>
                            <span className={styles.actText}><strong>{dashboardData.alerts.pendingVerifications} Company Verifications</strong> - Companies awaiting KYC decision</span>
                          </div>
                          <Link href="/dashboard/admin/verification" className={styles.actAction}>Review</Link>
                        </div>
                      )}
                      {dashboardData.alerts.pendingRecruiters > 0 && (
                        <div className={styles.actItem}>
                          <span className={styles.actIcon} style={{ color: '#f59e0b' }}>{IC.alertCircle}</span>
                          <div className={styles.actContent}>
                            <span className={styles.actText}><strong>{dashboardData.alerts.pendingRecruiters} Approval Requests</strong> - Recruiters waiting for access</span>
                          </div>
                          <Link href="/dashboard/admin/recruiters?status=pending" className={styles.actAction}>Review</Link>
                        </div>
                      )}
                      {dashboardData.alerts.pendingJobs > 0 && (
                        <div className={styles.actItem}>
                          <span className={styles.actIcon} style={{ color: '#f59e0b' }}>{IC.alertCircle}</span>
                          <div className={styles.actContent}>
                            <span className={styles.actText}><strong>{dashboardData.alerts.pendingJobs} Job Reviews</strong> - New listings requiring approval</span>
                          </div>
                          <Link href="/dashboard/admin/jobs?status=pending" className={styles.actAction}>Review</Link>
                        </div>
                      )}
                      {dashboardData.alerts.reportedJobs > 0 && (
                        <div className={styles.actItem}>
                          <span className={styles.actIcon} style={{ color: '#ef4444' }}>{IC.alertCircle}</span>
                          <div className={styles.actContent}>
                            <span className={styles.actText}><strong>{dashboardData.alerts.reportedJobs} Flagged Reports</strong> - Reported jobs requiring attention</span>
                          </div>
                          <Link href="/dashboard/admin/jobs?status=reported" className={styles.actAction}>Review</Link>
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem 0', textAlign: 'center', gap: '0.75rem' }}>
                      <div style={{ background: '#f0fdf4', color: '#10b981', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {IC.checkCircle}
                      </div>
                      <div>
                        <strong style={{ fontSize: '0.88rem', color: '#0f172a', display: 'block' }}>All Caught Up!</strong>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>No pending jobs, recruiter accounts, or company verifications require review.</span>
                      </div>
                    </div>
                  )}
                </div>
              )
            )}

            {/* Activities Panel */}
            {statsLoading ? (
              <ActivitiesSkeleton />
            ) : fetchError && !dashboardData ? (
              <WidgetErrorState 
                title="Recent Activity Error" 
                errorMessage="Could not retrieve the recent activity logs." 
                onRetry={handleRetry}
                cooldown={retryCooldown}
              />
            ) : (
              <div className={styles.cardPremium}>
                <div className={styles.cardHead}>
                  <h2 className={styles.cardTitlePremium}>Recent Activity</h2>
                </div>
                {(dashboardData?.activities?.length ?? 0) > 0 ? (
                  dashboardData!.activities.map((act) => (
                    <div key={act.id} className={styles.actItem}>
                      <span className={styles.actIcon}>{IC.eye}</span>
                      <div className={styles.actContent}>
                        <span className={styles.actText}><strong>{act.actor}</strong> {act.description}</span>
                        <span className={styles.actTime}>{new Date(act.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem 0', textAlign: 'center', gap: '0.75rem' }}>
                    <div style={{ background: '#f1f5f9', color: '#475569', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {IC.eye}
                    </div>
                    <div>
                      <strong style={{ fontSize: '0.88rem', color: '#0f172a', display: 'block' }}>No Recent Activity</strong>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Activities will appear here as candidates and recruiters register.</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className={styles.rightCol}>
            <div className={styles.cardPremium}>
              <h2 className={styles.cardTitlePremium}>Quick Actions</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <Link href="/dashboard/admin/jobs" style={{ textDecoration: 'none' }}>
                  <button className={styles.quickAction}>
                    <span className={styles.qaIcon}>{IC.plus}</span>
                    <span className={styles.qaLabel}>Post Job</span>
                  </button>
                </Link>
                <Link href="/dashboard/admin/blogs" style={{ textDecoration: 'none' }}>
                  <button className={styles.quickAction}>
                    <span className={styles.qaIcon}>{IC.barChart}</span>
                    <span className={styles.qaLabel}>Publish Article</span>
                  </button>
                </Link>
                <Link href="/dashboard/admin/reports" style={{ textDecoration: 'none' }}>
                  <button className={styles.quickAction}>
                    <span className={styles.qaIcon}>{IC.users}</span>
                    <span className={styles.qaLabel}>Reports</span>
                  </button>
                </Link>
                <Link href="/dashboard/admin/settings" style={{ textDecoration: 'none' }}>
                  <button className={styles.quickAction}>
                    <span className={styles.qaIcon}>{IC.settings}</span>
                    <span className={styles.qaLabel}>Settings</span>
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </AnimateOnScroll>
    </div>
  );
}
