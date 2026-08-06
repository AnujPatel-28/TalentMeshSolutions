"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { insforge, invokeFunction } from '@/lib/insforge';
import styles from './billing.module.css';
import { 
  TrendingUp, 
  Users, 
  Clock, 
  Search, 
  MoreVertical, 
  ChevronLeft, 
  ChevronRight,
  AlertCircle,
  X,
  Building2,
  Mail,
  Calendar,
  CheckCircle2,
  ArrowUpRight
} from 'lucide-react';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { format, addDays, isBefore } from 'date-fns';
import { logAction } from '@/lib/admin/audit';

type SubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'trialing' | 'expired';
type PlanType = 'starter' | 'growth' | 'enterprise';
type BillingCycle = 'monthly' | 'annual';

interface Subscription {
  id: string;
  company_id: string;
  recruiter_id: string;
  plan: PlanType;
  status: SubscriptionStatus;
  billing_cycle: BillingCycle;
  amount_inr: number;
  trial_ends_at: string | null;
  current_period_start: string;
  current_period_end: string;
  cancelled_at: string | null;
  notes: string | null;
  created_at: string;
  company: {
    id: string;
    name: string;
    logo_url: string | null;
  };
  recruiter: {
    id: string;
    full_name: string;
    email: string;
  } | null;
}

const ITEMS_PER_PAGE = 20;

export default function AdminBillingPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await invokeFunction('admin-billing', {
        method: 'GET'
      });

      if (error) throw error;
      const formatted = (data || []).map((sub: any) => ({
        ...sub,
        recruiter: sub.recruiter ? {
          ...sub.recruiter,
          full_name: sub.recruiter.name
        } : null
      }));
      setSubscriptions(formatted);
    } catch (err) {
      console.error('Error fetching subscriptions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // KPI Calculations
  const metrics = useMemo(() => {
    const active = subscriptions.filter(s => s.status === 'active' || s.status === 'trialing');
    
    // MRR = Active Monthly + (Active Annual / 12)
    const mrr = subscriptions
      .filter(s => s.status === 'active')
      .reduce((acc, s) => {
        const monthly = s.billing_cycle === 'monthly' ? s.amount_inr : s.amount_inr / 12;
        return acc + monthly;
      }, 0);

    const arr = mrr * 12;
    const activeCount = active.length;
    
    const sevenDaysFromNow = addDays(new Date(), 7);
    const expiringSoonCount = subscriptions.filter(s => 
      s.status === 'trialing' && 
      s.trial_ends_at && 
      isBefore(new Date(s.trial_ends_at), sevenDaysFromNow) &&
      isBefore(new Date(), new Date(s.trial_ends_at))
    ).length;

    return { mrr, arr, activeCount, expiringSoonCount };
  }, [subscriptions]);

  // Plan Distribution
  const planDistribution = useMemo(() => {
    const total = subscriptions.length || 1;
    const getDist = (plan: PlanType) => {
      const count = subscriptions.filter(s => s.plan === plan).length;
      return { count, percent: Math.round((count / total) * 100) };
    };

    return {
      starter: getDist('starter'),
      growth: getDist('growth'),
      enterprise: getDist('enterprise')
    };
  }, [subscriptions]);

  // Filtering Logic
  const filteredSubs = useMemo(() => {
    return subscriptions.filter(sub => {
      const matchesSearch = sub.company.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
      const matchesPlan = planFilter === 'all' || sub.plan === planFilter;
      return matchesSearch && matchesStatus && matchesPlan;
    });
  }, [subscriptions, searchQuery, statusFilter, planFilter]);

  const paginatedSubs = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredSubs.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredSubs, currentPage]);

  const totalPages = Math.ceil(filteredSubs.length / ITEMS_PER_PAGE);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const pastDueSubs = subscriptions.filter(s => s.status === 'past_due');

  if (loading && subscriptions.length === 0) {
    return <div className={styles.container}>Loading dashboard...</div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Subscriptions & Billing</h1>
        <div className={styles.headerActions}>
          <p className={styles.pageInfo}>Last synced: {format(new Date(), 'hh:mm a')}</p>
        </div>
      </header>

      {/* Row 1: KPI Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Monthly Recurring Revenue</div>
          <div className={styles.kpiValue}>{formatCurrency(metrics.mrr)} <span className={styles.kpiSubtext}>MRR</span></div>
          <div className={styles.kpiSubtext}><ArrowUpRight size={14} /> +12% from last month</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Annual Run Rate</div>
          <div className={styles.kpiValue}>{formatCurrency(metrics.arr)} <span className={styles.kpiSubtext}>ARR</span></div>
          <div className={styles.kpiSubtext}>Projected annual revenue</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Active Subscriptions</div>
          <div className={styles.kpiValue}>{metrics.activeCount}</div>
          <div className={styles.kpiSubtext}>Active + Trialing</div>
        </div>
        <div className={`${styles.kpiCard} ${metrics.expiringSoonCount > 0 ? styles.warning : ''}`}>
          <div className={styles.kpiLabel}>Trials Expiring Soon</div>
          <div className={styles.kpiValue}>{metrics.expiringSoonCount}</div>
          <div className={styles.kpiSubtext}>{metrics.expiringSoonCount > 0 ? 'Action required soon' : 'All clear'}</div>
        </div>
      </div>

      {/* Row 2: Plan Distribution */}
      <div className={styles.distributionGrid}>
        <div className={styles.distCard}>
          <div className={styles.distHeader}>
            <span className={styles.planName}>Starter</span>
            <span className={styles.planCount}>{planDistribution.starter.count} ({planDistribution.starter.percent}%)</span>
          </div>
          <div className={styles.progressBarContainer}>
            <div className={styles.progressBar} style={{ width: `${planDistribution.starter.percent}%` }} />
          </div>
          <div className={styles.planPrice}>₹2,499 / mo per user</div>
        </div>
        <div className={styles.distCard}>
          <div className={styles.distHeader}>
            <span className={styles.planName}>Growth</span>
            <span className={styles.planCount}>{planDistribution.growth.count} ({planDistribution.growth.percent}%)</span>
          </div>
          <div className={styles.progressBarContainer}>
            <div className={styles.progressBar} style={{ width: `${planDistribution.growth.percent}%` }} />
          </div>
          <div className={styles.planPrice}>₹7,999 / mo flat</div>
        </div>
        <div className={styles.distCard}>
          <div className={styles.distHeader}>
            <span className={styles.planName}>Enterprise</span>
            <span className={styles.planCount}>{planDistribution.enterprise.count} ({planDistribution.enterprise.percent}%)</span>
          </div>
          <div className={styles.progressBarContainer}>
            <div className={styles.progressBar} style={{ width: `${planDistribution.enterprise.percent}%` }} />
          </div>
          <div className={styles.planPrice}>Custom Pricing</div>
        </div>
      </div>

      {/* Row 3: Table Section */}
      <div className={styles.tableSection}>
        <div className={styles.filterBar}>
          <div className={styles.searchWrapper}>
            <Search className={styles.searchIcon} size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
            <input 
              type="text" 
              placeholder="Search by company name..." 
              className={styles.searchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <CustomSelect
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { label: 'All Status', value: 'all' },
              { label: 'Active', value: 'active' },
              { label: 'Trialing', value: 'trialing' },
              { label: 'Past Due', value: 'past_due' },
              { label: 'Cancelled', value: 'cancelled' },
              { label: 'Expired', value: 'expired' }
            ]}
            className={styles.selectInput}
          />
          <CustomSelect
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            options={[
              { label: 'All Plans', value: 'all' },
              { label: 'Starter', value: 'starter' },
              { label: 'Growth', value: 'growth' },
              { label: 'Enterprise', value: 'enterprise' }
            ]}
            className={styles.selectInput}
          />
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Company</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Amount</th>
                <th>Billing Cycle</th>
                <th>Renews / Ends On</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {paginatedSubs.map(sub => (
                <tr key={sub.id}>
                  <td>
                    <div className={styles.companyCell}>
                      {sub.company.logo_url ? (
                        <img src={sub.company.logo_url} alt="" className={styles.logo} />
                      ) : (
                        <div className={styles.logo} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--secondary-background)' }}>
                          <Building2 size={16} />
                        </div>
                      )}
                      <div className={styles.companyInfo}>
                        <span className={styles.companyName}>{sub.company.name}</span>
                        {sub.recruiter && <span className={styles.recruiterEmail}>{sub.recruiter.email}</span>}
                      </div>
                    </div>
                  </td>
                  <td><span style={{ textTransform: 'capitalize' }}>{sub.plan}</span></td>
                  <td>
                    <span className={`${styles.statusBadge} ${styles[`status-${sub.status}`]}`}>
                      {sub.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td>{formatCurrency(sub.amount_inr)}</td>
                  <td><span style={{ textTransform: 'capitalize' }}>{sub.billing_cycle}</span></td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span>{format(new Date(sub.status === 'trialing' ? sub.trial_ends_at || sub.current_period_end : sub.current_period_end), 'MMM dd, yyyy')}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                        {sub.status === 'trialing' ? 'Trial ends' : 'Renews on'}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>
                      {sub.notes || '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={styles.pagination}>
          <div className={styles.pageInfo}>
            Showing {Math.min(filteredSubs.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)} to {Math.min(filteredSubs.length, currentPage * ITEMS_PER_PAGE)} of {filteredSubs.length}
          </div>
          <div className={styles.pageButtons}>
            <button 
              className={styles.pageBtn} 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
            >
              <ChevronLeft size={16} />
            </button>
            <button 
              className={styles.pageBtn} 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => prev + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
