import { insforge } from '@/lib/insforge';

export interface Job {
  id: string;
  title: string;
  description?: string;
  type?: string;
  location?: string;
  salary_min?: number;
  salary_max?: number;
  industry?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  recruiter_id?: string;
  company_id?: string;
  companies?: {
    name?: string;
    logo_url?: string;
  };
}

export interface GetApprovedJobsOptions {
  search?: string;
  type?: string;
  location?: string;
  salary_min?: number;
  salary_max?: number;
  industry?: string;
  date_posted?: string; // '24h' | '7d' | '30d'
  limit?: number;
}

export async function getApprovedJobs(options: GetApprovedJobsOptions = {}): Promise<Job[]> {
  try {
    let query = insforge.database
      .from('jobs')
      .select('id,title,type,location,salary_min,salary_max,status,created_at,company_id,companies(name,logo_url,industry)')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(options.limit ?? 30);

    if (options.search) {
      // text search across title and description using ilike
      query = query.ilike('title', `%${options.search}%`);
    }
    if (options.type) {
      query = query.eq('type', options.type);
    }
    if (options.location) {
      query = query.ilike('location', `%${options.location}%`);
    }
    if (options.salary_min !== undefined) {
      query = query.gte('salary_min', options.salary_min);
    }
    if (options.salary_max !== undefined) {
      query = query.lte('salary_max', options.salary_max);
    }
    if (options.industry) {
      query = query.filter('companies.industry', 'eq', options.industry);
    }
    if (options.date_posted && options.date_posted !== 'all') {
      const now = new Date();
      let since: Date;
      if (options.date_posted === '24h') {
        since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      } else if (options.date_posted === '7d') {
        since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else {
        // 30d
        since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
      query = query.gte('created_at', since.toISOString());
    }

    const { data, error } = await query;
    if (error) {
      console.error('[getApprovedJobs] DB error:', error.message);
      return [];
    }
    const jobs = (data as any[]) ?? [];
    return jobs.map(job => ({
      ...job,
      industry: job.companies?.industry || undefined
    }));
  } catch (err) {
    console.error('[getApprovedJobs] Unexpected error:', err);
    return [];
  }
}
