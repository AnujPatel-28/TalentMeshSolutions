// Shared dashboard/report metrics (R-9 / doc 14 D-21, D-15): single source for counts
// duplicated across admin-dashboard and admin-reports. Each metric reports failure as
// {error: true} instead of silently degrading to 0, so a StatCard tile can tell "query
// broke" from "really zero" (FR-1).

export type MetricResult<T> = { value: T } | { error: true };

export function unwrap<T>(metric: MetricResult<T>, fallback: T): T {
  return 'value' in metric ? metric.value : fallback;
}

// Wraps a single `.select('*', { count: 'exact', head: true })` query.
export async function toCountMetric(query: PromiseLike<{ count?: number | null; error: unknown }>): Promise<MetricResult<number>> {
  const res = await query;
  if (res.error) return { error: true };
  return { value: res.count ?? 0 };
}

export type CoreCounts = {
  totalJobs: MetricResult<number>;
  totalApplications: MetricResult<number>;
  totalCandidates: MetricResult<number>;
  totalRecruiters: MetricResult<number>;
};

// Counts shared by admin-dashboard (get-summary/get-reports) and admin-reports.
export async function getCoreCounts(db: any): Promise<CoreCounts> {
  const [totalJobs, totalApplications, totalCandidates, totalRecruiters] = await Promise.all([
    toCountMetric(db.database.from('jobs').select('*', { count: 'exact', head: true })),
    toCountMetric(db.database.from('applications').select('*', { count: 'exact', head: true })),
    toCountMetric(db.database.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'candidate')),
    toCountMetric(db.database.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'recruiter')),
  ]);
  return { totalJobs, totalApplications, totalCandidates, totalRecruiters };
}

const APPLICATION_STATUSES = ['applied', 'reviewing', 'shortlisted', 'interviewing', 'offered', 'hired', 'rejected', 'withdrawn'] as const;
export type StatusCounts = Record<(typeof APPLICATION_STATUSES)[number], number>;

// Per-status application counts shared by admin-dashboard get-reports and admin-reports.
export async function getApplicationStatusCounts(db: any): Promise<MetricResult<StatusCounts>> {
  const results = await Promise.all(
    APPLICATION_STATUSES.map((status) =>
      db.database.from('applications').select('*', { count: 'exact', head: true }).eq('status', status)
    )
  );
  if (results.some((r: any) => r.error)) return { error: true };
  const counts = {} as StatusCounts;
  APPLICATION_STATUSES.forEach((status, i) => { counts[status] = results[i].count ?? 0; });
  return { value: counts };
}

// Top candidate skills, padded with defaults — shared by admin-dashboard get-reports and admin-reports.
export async function getTopSkills(db: any, limit = 4): Promise<MetricResult<{ name: string; count: number }[]>> {
  const { data, error } = await db.database.from('candidate_profiles').select('skills');
  if (error) return { error: true };

  const skillCounts: Record<string, number> = {};
  for (const cand of data || []) {
    if (Array.isArray(cand.skills)) {
      for (const skill of cand.skills) {
        if (skill) {
          const normalized = skill.trim();
          skillCounts[normalized] = (skillCounts[normalized] || 0) + 1;
        }
      }
    }
  }

  const topSkills = Object.entries(skillCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);

  const defaultSkills = ['React', 'TypeScript', 'Node.js', 'Python'];
  while (topSkills.length < limit && defaultSkills.length > 0) {
    const nextDefault = defaultSkills.shift()!;
    if (!topSkills.some((s) => s.name === nextDefault)) {
      topSkills.push({ name: nextDefault, count: 0 });
    }
  }

  return { value: topSkills };
}

// --- Company-First KPIs (R-9) ---

// "Pending" = awaiting a decision (submitted or under review) — mirrors the verification
// queue page's own definition (app/dashboard/admin/verification/page.tsx).
export async function getPendingVerifications(db: any): Promise<MetricResult<number>> {
  return toCountMetric(
    db.database
      .from('company_verification_requests')
      .select('*', { count: 'exact', head: true })
      .in('status', ['submitted', 'under_review'])
  );
}

const COMPANY_STATUSES = ['pending', 'verified', 'suspended', 'deactivated'] as const;
export type CompaniesByStatus = Record<(typeof COMPANY_STATUSES)[number], number>;

export async function getCompaniesByStatus(db: any): Promise<MetricResult<CompaniesByStatus>> {
  const results = await Promise.all(
    COMPANY_STATUSES.map((status) =>
      db.database.from('companies').select('*', { count: 'exact', head: true }).eq('status', status)
    )
  );
  if (results.some((r: any) => r.error)) return { error: true };
  const breakdown = {} as CompaniesByStatus;
  COMPANY_STATUSES.forEach((status, i) => { breakdown[status] = results[i].count ?? 0; });
  return { value: breakdown };
}

export type ActiveJobSlots = { used: number; limit: number };

// Active jobs (status='active') vs the platform's total entitled capacity: each non-deactivated
// company contributes its current plan's max_active_jobs (defaulting to 'free', same fallback
// the enforce_active_job_limit() trigger uses — see migration 050).
export async function getActiveJobSlots(db: any): Promise<MetricResult<ActiveJobSlots>> {
  const [usedRes, plansRes, companiesRes] = await Promise.all([
    db.database.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    db.database.from('plan_limits').select('plan, max_active_jobs'),
    db.database.from('companies').select('id, subscriptions(plan, status)').neq('status', 'deactivated'),
  ]);
  if (usedRes.error || plansRes.error || companiesRes.error) return { error: true };

  const planLimits = new Map<string, number>((plansRes.data || []).map((p: any) => [p.plan, p.max_active_jobs]));
  const freeLimit = planLimits.get('free') ?? 0;
  const limit = (companiesRes.data || []).reduce((sum: number, company: any) => {
    const activeSub = (company.subscriptions || []).find((s: any) => s.status === 'trialing' || s.status === 'active');
    const plan = activeSub?.plan ?? 'free';
    return sum + (planLimits.get(plan) ?? freeLimit);
  }, 0);

  return { value: { used: usedRes.count ?? 0, limit } };
}
