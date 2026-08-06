import { useQuery, useQueryClient } from '@tanstack/react-query';
import { invokeFunction } from '@/lib/insforge';
import { queryKeys } from './queryKeys';

// Per-metric result (R-9 / doc 14 D-15): a failed query reports {error: true} instead of
// silently degrading to 0, so a StatCard tile can show "this metric failed to load" as
// distinct from a real zero.
export type MetricResult<T> = { value: T } | { error: true };

export function metricValue<T>(m: MetricResult<T> | T | undefined, fallback: T): T {
  if (m === undefined || m === null) return fallback;
  if (typeof m === 'object' && m !== null && 'value' in m) {
    return (m as any).value;
  }
  if (typeof m === 'object' && m !== null && 'error' in m) {
    return fallback;
  }
  return m as T;
}

export function metricFailed<T>(m: MetricResult<T> | T | undefined): boolean {
  if (m === undefined || m === null) return false;
  if (typeof m === 'object' && m !== null && 'error' in m) {
    return true;
  }
  return false;
}


export type CompaniesByStatus = { pending: number; verified: number; suspended: number; deactivated: number };
export type ActiveJobSlots = { used: number; limit: number };

export type AdminDashboardData = {
  metrics: {
    totalJobs: MetricResult<number>;
    activeJobs: MetricResult<number>;
    totalApplications: MetricResult<number>;
    totalCandidates: MetricResult<number>;
    totalRecruiters: MetricResult<number>;
  };
  companyKpis: {
    companiesByStatus: MetricResult<CompaniesByStatus>;
    activeJobSlots: MetricResult<ActiveJobSlots>;
  };
  activities: Array<{
    id: string;
    actor: string;
    actor_avatar?: string;
    type: string;
    description: string;
    created_at: string;
  }>;
  alerts: {
    pendingRecruiters: number;
    pendingJobs: number;
    reportedJobs: number;
    newUsers24h: number;
    pendingVerifications: number;
  };
};

const FALLBACK_DASHBOARD: AdminDashboardData = {
  metrics: {
    totalJobs: { value: 0 }, activeJobs: { value: 0 }, totalApplications: { value: 0 },
    totalCandidates: { value: 0 }, totalRecruiters: { value: 0 },
  },
  companyKpis: {
    companiesByStatus: { value: { pending: 0, verified: 0, suspended: 0, deactivated: 0 } },
    activeJobSlots: { value: { used: 0, limit: 0 } },
  },
  activities: [],
  alerts: { pendingRecruiters: 0, pendingJobs: 0, reportedJobs: 0, newUsers24h: 0, pendingVerifications: 0 },
};

async function fetchAdminDashboardSummary(): Promise<AdminDashboardData> {
  const { data, error } = await invokeFunction('admin-dashboard', {
    method: 'POST',
    body: { action: 'get-summary', limit: 10 },
  });

  if (error) {
    throw new Error(error.message || 'Failed to fetch admin dashboard summary');
  }

  if (!data) {
    throw new Error('No data received from admin-dashboard');
  }

  return {
    metrics: data.metrics || FALLBACK_DASHBOARD.metrics,
    companyKpis: data.companyKpis || FALLBACK_DASHBOARD.companyKpis,
    activities: data.activities || [],
    alerts: data.alerts || FALLBACK_DASHBOARD.alerts,
  };
}

/**
 * Shared React Query hook for admin dashboard summary data.
 * Both the sidebar layout and admin page consume this hook.
 * React Query automatically deduplicates concurrent requests
 * to the same query key, preventing the duplicate API call problem.
 *
 * staleTime = 5 minutes: summary counts don't need real-time freshness.
 * gcTime = 10 minutes: keep cached data in memory across navigations.
 * refetchOnWindowFocus = false: admin summary doesn't need aggressive refetch.
 */
export function useAdminDashboardSummary(enabled: boolean) {
  return useQuery<AdminDashboardData>({
    queryKey: queryKeys.adminDashboardSummary,
    queryFn: fetchAdminDashboardSummary,
    enabled,
    staleTime: 5 * 60 * 1000,       // 5 minutes
    gcTime: 10 * 60 * 1000,          // 10 minutes
    refetchOnWindowFocus: false,
    retry: 1,
    placeholderData: FALLBACK_DASHBOARD,
  });
}

/**
 * Hook to get the invalidation function for admin dashboard summary.
 * Call this when admin actions (job approval, recruiter approval, etc.)
 * change the counts and the dashboard needs to refresh.
 */
export function useInvalidateAdminDashboard() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.adminDashboardSummary });
  };
}
