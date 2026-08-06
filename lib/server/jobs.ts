import { insforgeAdmin } from '@/lib/insforge-admin';
import { getServerStorageUrl } from '@/lib/utils/storage-url';
import type { CreateJobInput, JobFilterInput, UpdateJobInput } from '@/lib/validation/jobs';

type JobRecord = {
  id: string;
  title: string;
  description: string;
  requirements?: string[] | null;
  skills_required?: string[] | null;
  type?: string | null;
  location?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  currency?: string | null;
  experience_min?: number | null;
  experience_max?: number | null;
  department?: string | null;
  status?: string | null;
  is_approved?: boolean | null;
  views_count?: number | null;
  applications_count?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  company_id?: string | null;
  recruiter_id?: string | null;
  companies?: {
    id?: string | null;
    name?: string | null;
    logo_url?: string | null;
    industry?: string | null;
    about?: string | null;
    website?: string | null;
  } | null;
};

function requireAdminClient() {
  if (!insforgeAdmin) {
    throw new Error('Admin client not initialized');
  }

  return insforgeAdmin;
}

function getPostedDays(createdAt?: string | null) {
  if (!createdAt) {
    return 0;
  }

  const createdTime = new Date(createdAt).getTime();
  if (Number.isNaN(createdTime)) {
    return 0;
  }

  return Math.max(0, Math.floor((Date.now() - createdTime) / 86400000));
}

function formatSalary(min?: number | null, max?: number | null, currency?: string | null) {
  if (!min && !max) {
    return 'Competitive';
  }

  const symbol = currency === 'USD' ? '$' : 'Rs';
  if (min && max) {
    return `${symbol}${min.toLocaleString()} - ${symbol}${max.toLocaleString()}`;
  }

  if (min) {
    return `${symbol}${min.toLocaleString()}+`;
  }

  return `${symbol}${(max || 0).toLocaleString()}`;
}

function getInitials(name?: string | null) {
  if (!name) {
    return 'TM';
  }

  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function getBrandColor(seed: string) {
  const palette = ['#0D47A1', '#1565C0', '#1E88E5', '#42A5F5', '#0F766E', '#D97706'];
  const index = seed.split('').reduce((total, char) => total + char.charCodeAt(0), 0) % palette.length;
  return palette[index];
}

function serializeJob(record: JobRecord) {
  const companyName = record.companies?.name || 'TalentMesh Company';
  const brandColor = getBrandColor(companyName);
  const resolvedLogoUrl = record.companies?.logo_url || null;

  return {
    ...record,
    type: record.type || 'Full-Time',
    location: record.location || 'Remote',
    currency: record.currency || 'INR',
    requirements: record.requirements || [],
    skills_required: record.skills_required || [],
    department: record.department || '',
    views_count: record.views_count || 0,
    applications_count: record.applications_count || 0,
    posted_days: getPostedDays(record.created_at),
    salary: formatSalary(record.salary_min, record.salary_max, record.currency),
    ai_match_rate: 85,
    company_profiles: {
      id: record.companies?.id || record.company_id || null,
      company_name: companyName,
      logo_url: resolvedLogoUrl,
      industry: record.companies?.industry || null,
      about: record.companies?.about || null,
      website: record.companies?.website || null,
      initials: getInitials(companyName),
      color: brandColor,
    },
    companies: {
      id: record.companies?.id || record.company_id || null,
      name: companyName,
      logo_url: resolvedLogoUrl,
      industry: record.companies?.industry || null,
      about: record.companies?.about || null,
      website: record.companies?.website || null,
    },
  };
}

export async function listPublicJobs(filters: Partial<JobFilterInput> = {}) {
  const client = requireAdminClient();
  const page = filters.page || 0;
  const limit = filters.limit || 20;
  const start = page * limit;
  const end = start + limit - 1;

  let query = client.database
    .from('jobs')
    .select('id, title, description, requirements, skills_required, type, location, salary_min, salary_max, currency, experience_min, experience_max, department, status, is_approved, views_count, applications_count, created_at, updated_at, company_id, recruiter_id, companies(id, name, logo_url, industry, about:description, website)', { count: 'exact' })
    .eq('is_approved', true)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (filters.search) {
    query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
  }

  if (filters.type) {
    query = query.eq('type', filters.type);
  }

  if (filters.location) {
    query = query.ilike('location', `%${filters.location}%`);
  }

  if (filters.salary_min) {
    query = query.gte('salary_min', filters.salary_min);
  }

  if (filters.salary_max) {
    query = query.lte('salary_max', filters.salary_max);
  }

  if (filters.industry) {
    // Note: This requires a join filter if supported by the client, 
    // or we can use the companies relation name. 
    // PostgREST syntax for nested filter: companies.industry.eq.value
    query = query.filter('companies.industry', 'eq', filters.industry);
  }

  if (filters.date_posted && filters.date_posted !== 'all') {
    const now = new Date();
    if (filters.date_posted === '24h') {
      now.setHours(now.getHours() - 24);
    } else if (filters.date_posted === '7d') {
      now.setDate(now.getDate() - 7);
    } else if (filters.date_posted === '30d') {
      now.setDate(now.getDate() - 30);
    }
    query = query.gte('created_at', now.toISOString());
  }

  const { data, error, count } = await query.range(start, end);
  if (error) {
    throw new Error(`Failed to fetch jobs: ${error.message}`);
  }

  return {
    jobs: (data || []).map((job) => serializeJob(job as JobRecord)),
    total: count || 0,
  };
}

export async function getPublicJobById(id: string) {
  const client = requireAdminClient();
  const { data, error } = await client.database
    .from('jobs')
    .select('id, title, description, requirements, skills_required, type, location, salary_min, salary_max, currency, experience_min, experience_max, department, status, is_approved, views_count, applications_count, created_at, updated_at, company_id, recruiter_id, companies(id, name, logo_url, industry, about:description, website)')
    .eq('id', id)
    .eq('is_approved', true)
    .eq('status', 'active')
    .single();

  if (error || !data) {
    throw new Error('Job not found');
  }

  return serializeJob(data as JobRecord);
}

export async function listAdminJobs(filters: Partial<JobFilterInput> = {}) {
  const client = requireAdminClient();
  const page = filters.page || 0;
  const limit = filters.limit || 20;
  const start = page * limit;
  const end = start + limit - 1;

  let query = client.database
    .from('jobs')
    .select('id, title, description, requirements, skills_required, type, location, salary_min, salary_max, currency, experience_min, experience_max, department, status, is_approved, views_count, applications_count, created_at, updated_at, company_id, recruiter_id, companies(id, name, logo_url, industry, about:description, website)', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (filters.search) {
    query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
  }

  if (filters.type) {
    query = query.eq('type', filters.type);
  }

  if (filters.location) {
    query = query.ilike('location', `%${filters.location}%`);
  }

  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  const { data, error, count } = await query.range(start, end);
  if (error) {
    throw new Error(`Failed to fetch admin jobs: ${error.message}`);
  }

  return {
    jobs: (data || []).map((job) => serializeJob(job as JobRecord)),
    total: count || 0,
  };
}

export async function getAdminJob(id: string) {
  const client = requireAdminClient();
  const { data, error } = await client.database
    .from('jobs')
    .select('id, title, description, requirements, skills_required, type, location, salary_min, salary_max, currency, experience_min, experience_max, department, status, is_approved, views_count, applications_count, created_at, updated_at, company_id, recruiter_id, companies(id, name, logo_url, industry, about:description, website)')
    .eq('id', id)
    .single();

  if (error || !data) {
    throw new Error('Job not found');
  }

  return serializeJob(data as JobRecord);
}

export async function createAdminJob(input: CreateJobInput, adminId: string) {
  const client = requireAdminClient();
  const payload = {
    ...input,
    recruiter_id: input.recruiter_id || adminId,
    requirements: input.requirements || [],
    skills_required: input.skills_required || [],
    is_approved: input.is_approved ?? (input.status === 'active'),
    status: input.status || 'active',
  };

  const { data, error } = await client.database
    .from('jobs')
    .insert([payload])
    .select('id, title, description, requirements, skills_required, type, location, salary_min, salary_max, currency, experience_min, experience_max, department, status, is_approved, views_count, applications_count, created_at, updated_at, company_id, recruiter_id, companies(id, name, logo_url, industry, about:description, website)')
    .single();

  if (error || !data) {
    throw new Error(`Failed to create job: ${error?.message || 'Unknown error'}`);
  }

  return serializeJob(data as JobRecord);
}

export async function updateAdminJob(id: string, input: UpdateJobInput) {
  const client = requireAdminClient();
  const payload: Record<string, unknown> = { ...input };

  if (payload.requirements === undefined) {
    delete payload.requirements;
  }

  if (payload.skills_required === undefined) {
    delete payload.skills_required;
  }

  const { data, error } = await client.database
    .from('jobs')
    .update(payload)
    .eq('id', id)
    .select('id, title, description, requirements, skills_required, type, location, salary_min, salary_max, currency, experience_min, experience_max, department, status, is_approved, views_count, applications_count, created_at, updated_at, company_id, recruiter_id, companies(id, name, logo_url, industry, about:description, website)')
    .single();

  if (error || !data) {
    throw new Error(`Failed to update job: ${error?.message || 'Unknown error'}`);
  }

  return serializeJob(data as JobRecord);
}

export async function setAdminJobState(id: string, action: 'publish' | 'unpublish' | 'close' | 'delete') {
  const client = requireAdminClient();
  const stateMap = {
    publish: { status: 'active', is_approved: true },
    unpublish: { status: 'draft', is_approved: false },
    close: { status: 'closed' },
    delete: { status: 'deleted' },
  } as const;

  const { data, error } = await client.database
    .from('jobs')
    .update(stateMap[action])
    .eq('id', id)
    .select('id, title, description, requirements, skills_required, type, location, salary_min, salary_max, currency, experience_min, experience_max, department, status, is_approved, views_count, applications_count, created_at, updated_at, company_id, recruiter_id, companies(id, name, logo_url, industry, about:description, website)')
    .single();

  if (error || !data) {
    throw new Error(`Failed to update job status: ${error?.message || 'Unknown error'}`);
  }

  return serializeJob(data as JobRecord);
}

export async function listCompaniesForAdmin() {
  const client = requireAdminClient();
  const { data, error } = await client.database
    .from('companies')
    .select('id, name')
    .order('name');

  if (error) {
    throw new Error(`Failed to fetch companies: ${error.message}`);
  }

  return data || [];
}
