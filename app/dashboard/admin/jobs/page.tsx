"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import styles from './jobs.module.css';
import { JobCard } from '@/components/jobs/JobCard';
import { AdminHeader } from '../_components/AdminHeader';
import { AdminStatCard } from '../_components/AdminStatCard';
import { AdminInput, AdminSelect, AdminButton } from '../_components/AdminForm';
import { invokeFunction } from '@/lib/insforge';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';
import { CompanyRegisterForm } from '../_components/CompanyRegisterForm';
import DataTable, { Column } from '@/components/dashboard/DataTable';
import DetailDrawer from '@/components/dashboard/DetailDrawer';
import StatusPill from '@/components/dashboard/StatusPill';
import { CustomSelect } from '@/components/ui/CustomSelect';


type CompanyOption = {
  id: string;
  name: string;
};

type AdminJob = {
  id: string;
  title: string;
  location: string;
  type: string;
  status: string;
  is_approved: boolean;
  approval_status: 'pending' | 'approved' | 'rejected';
  salary: string;
  created_at?: string;
  description: string;
  department?: string;
  company_id?: string;
  salary_min?: number | null;
  salary_max?: number | null;
  currency?: string;
  experience_min?: number | null;
  experience_max?: number | null;
  requirements?: string[];
  skills_required?: string[];
  companies?: {
    name?: string | null;
  };
};

type JobFormState = {
  company_id: string;
  title: string;
  description: string;
  requirements: string;
  skills_required: string;
  type: string;
  location: string;
  salary_min: string;
  salary_max: string;
  currency: string;
  experience_min: string;
  experience_max: string;
  department: string;
  status: string;
};

const defaultFormState: JobFormState = {
  company_id: '',
  title: '',
  description: '',
  requirements: '',
  skills_required: '',
  type: 'full-time',
  location: '',
  salary_min: '',
  salary_max: '',
  currency: 'INR',
  experience_min: '',
  experience_max: '',
  department: '',
  status: 'active',
};

const typeOptions = [
  { label: 'Full-Time', value: 'full-time' },
  { label: 'Part-Time', value: 'part-time' },
  { label: 'Contract', value: 'contract' },
  { label: 'Freelance', value: 'freelance' },
  { label: 'Internship', value: 'internship' },
  { label: 'Remote', value: 'remote' },
  { label: 'Hybrid', value: 'hybrid' }
];

const statusOptions = [
  { label: 'Active', value: 'active' },
  { label: 'Draft', value: 'draft' },
  { label: 'Paused', value: 'paused' },
  { label: 'Closed', value: 'closed' },
  { label: 'Reported', value: 'reported' }
];

function toFormState(job?: AdminJob | null): JobFormState {
  if (!job) return defaultFormState;
  return {
    company_id: job.company_id || '',
    title: job.title || '',
    description: job.description || '',
    requirements: (job.requirements || []).join('\n'),
    skills_required: (job.skills_required || []).join('\n'),
    type: (job.type || 'full-time').toLowerCase(),
    location: job.location || '',
    salary_min: job.salary_min?.toString() || '',
    salary_max: job.salary_max?.toString() || '',
    currency: job.currency || 'INR',
    experience_min: job.experience_min?.toString() || '',
    experience_max: job.experience_max?.toString() || '',
    department: job.department || '',
    status: job.status || 'active',
  };
}

const ALL_SKILLS = [
  // Frontend
  'React', 'Next.js', 'TypeScript', 'JavaScript', 'HTML5', 'CSS3', 'Sass', 'Tailwind CSS', 'Bootstrap', 'Vue.js', 'Angular', 'Svelte', 'Webpack', 'Vite', 'Redux', 'Zustand', 'GraphQL', 'Apollo Client',
  // Backend & APIs
  'Node.js', 'Express', 'NestJS', 'Python', 'Django', 'Flask', 'FastAPI', 'Ruby on Rails', 'Ruby', 'PHP', 'Laravel', 'Java', 'Spring Boot', 'Go (Golang)', 'Rust', 'C++', 'C#', '.NET Core', 'REST APIs', 'GraphQL APIs', 'gRPC', 'WebSockets',
  // Databases & Caching
  'PostgreSQL', 'MySQL', 'SQLite', 'MongoDB', 'Redis', 'Elasticsearch', 'DynamoDB', 'Cassandra', 'MariaDB', 'Firebase', 'Supabase',
  // Cloud & DevOps
  'Docker', 'Kubernetes', 'AWS (Amazon Web Services)', 'AWS Lambda', 'EC2', 'S3', 'Google Cloud Platform (GCP)', 'Microsoft Azure', 'Terraform', 'CI/CD', 'GitHub Actions', 'Jenkins', 'Nginx', 'Linux', 'Serverless',
  // Mobile Development
  'React Native', 'Flutter', 'Swift', 'iOS Development', 'Kotlin', 'Android Development', 'Dart', 'Objective-C',
  // Data Science & AI
  'Machine Learning', 'Deep Learning', 'Data Science', 'Data Analytics', 'Pandas', 'NumPy', 'Scikit-Learn', 'TensorFlow', 'PyTorch', 'SQL', 'R programming', 'Tableau', 'PowerBI', 'Data Engineering', 'Apache Spark',
  // Design & Product
  'Figma', 'UI/UX Design', 'Wireframing', 'Prototyping', 'Adobe Photoshop', 'Adobe Illustrator', 'Product Management', 'Agile Methodologies', 'Scrum', 'Jira', 'Confluence',
  // Marketing & Sales
  'SEO (Search Engine Optimization)', 'SEM', 'Google Analytics', 'Content Writing', 'Copywriting', 'Social Media Marketing', 'Email Marketing', 'Salesforce', 'CRM', 'Lead Generation', 'Business Development',
  // Finance & HR
  'Financial Analysis', 'Accounting', 'Bookkeeping', 'Excel (Advanced)', 'Recruiting', 'Talent Acquisition', 'Onboarding', 'HR Policies',
  // Soft Skills & Management
  'Leadership', 'Team Management', 'Project Management', 'Communication', 'Problem Solving', 'Public Speaking', 'Customer Support', 'Technical Writing'
];

const filterStatusOptions = [
  { label: 'All Statuses', value: 'all' },
  { label: 'Pending Approval', value: 'pending' },
  { label: 'Active', value: 'active' },
  { label: 'Draft', value: 'draft' },
  { label: 'Paused', value: 'paused' },
  { label: 'Closed', value: 'closed' },
  { label: 'Reported', value: 'reported' }
];

const filterDepartmentOptions = [
  { label: 'All Departments', value: 'all' },
  { label: 'Engineering', value: 'Engineering' },
  { label: 'Product Management', value: 'Product Management' },
  { label: 'Design', value: 'Design' },
  { label: 'Marketing', value: 'Marketing' },
  { label: 'Sales', value: 'Sales' },
  { label: 'Finance & Accounts', value: 'Finance & Accounts' },
  { label: 'Human Resources', value: 'Human Resources' },
  { label: 'Operations', value: 'Operations' },
  { label: 'Customer Success & Support', value: 'Customer Success & Support' }
];

const filterJobTitleOptions = [
  { label: 'All Job Titles', value: 'all' },
  { label: 'Software Engineer', value: 'Software Engineer' },
  { label: 'Senior Software Engineer', value: 'Senior Software Engineer' },
  { label: 'Lead Developer', value: 'Lead Developer' },
  { label: 'Frontend Developer', value: 'Frontend Developer' },
  { label: 'Backend Developer', value: 'Backend Developer' },
  { label: 'Full Stack Engineer', value: 'Full Stack Engineer' },
  { label: 'DevOps Engineer', value: 'DevOps Engineer' },
  { label: 'QA Engineer', value: 'QA Engineer' },
  { label: 'Product Manager', value: 'Product Manager' },
  { label: 'Project Manager', value: 'Project Manager' },
  { label: 'UI/UX Designer', value: 'UI/UX Designer' },
  { label: 'Data Scientist', value: 'Data Scientist' },
  { label: 'HR Generalist', value: 'HR Generalist' },
  { label: 'Recruiter', value: 'Recruiter' },
  { label: 'Sales Executive', value: 'Sales Executive' },
  { label: 'Marketing Manager', value: 'Marketing Manager' }
];

const filterLocationOptions = [
  { label: 'All Locations', value: 'all' },
  { label: 'Remote', value: 'Remote' },
  { label: 'Bangalore, India', value: 'Bangalore, India' },
  { label: 'Mumbai, India', value: 'Mumbai, India' },
  { label: 'Delhi NCR, India', value: 'Delhi NCR, India' },
  { label: 'Hyderabad, India', value: 'Hyderabad, India' },
  { label: 'Pune, India', value: 'Pune, India' },
  { label: 'Chennai, India', value: 'Chennai, India' },
  { label: 'San Francisco, CA, USA', value: 'San Francisco, CA, USA' },
  { label: 'New York, NY, USA', value: 'New York, NY, USA' },
  { label: 'London, UK', value: 'London, UK' },
  { label: 'Singapore', value: 'Singapore' },
  { label: 'Sydney, Australia', value: 'Sydney, Australia' },
  { label: 'Berlin, Germany', value: 'Berlin, Germany' },
  { label: 'Toronto, Canada', value: 'Toronto, Canada' }
];

const filterExperienceOptions = [
  { label: 'All Experience Levels', value: 'all' },
  { label: 'Entry Level (0-1 Yrs)', value: '0-1' },
  { label: 'Junior (1-3 Yrs)', value: '1-3' },
  { label: 'Mid Level (3-5 Yrs)', value: '3-5' },
  { label: 'Senior (5-8 Yrs)', value: '5-8' },
  { label: 'Lead / Director (8+ Yrs)', value: '8+' }
];

const filterSalaryOptions = [
  { label: 'All Salaries', value: 'all' },
  { label: 'Under ₹5L / $60k', value: 'under-500000' },
  { label: '₹5L - ₹10L / $60k-$100k', value: '500000-1000000' },
  { label: '₹10L - ₹20L / $100k-$150k', value: '1000000-2000000' },
  { label: '₹20L - ₹40L / $150k-$250k', value: '2000000-4000000' },
  { label: '₹40L+ / $250k+', value: '4000000+' }
];

export default function AdminJobsPage() {
  const router = useRouter();
  // CSV Export Utility
  const downloadCSV = (rows: string[][], filename: string) => {
    const csv = rows.map(r => r.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportJobsCSV = (data: AdminJob[]) => {
    const headers = ['Title', 'Company', 'Location', 'Type', 'Status', 'Approved', 'Salary Min', 'Salary Max', 'Currency', 'Joined Date']
    const rows = data.map(j => [
      j.title,
      (j as any).companies?.name || 'Unknown',
      j.location,
      j.type,
      j.status,
      j.is_approved ? 'Yes' : 'No',
      j.salary_min?.toString() || '',
      j.salary_max?.toString() || '',
      j.currency || 'INR',
      j.created_at ? new Date(j.created_at).toLocaleDateString('en-IN') : 'N/A'
    ])
    downloadCSV([headers, ...rows], `jobs-export-${Date.now()}.csv`)
  }
  const { user, isLoading: authLoading } = useAuth();
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterSkill, setFilterSkill] = useState('all');
  const [filterJobTitle, setFilterJobTitle] = useState('all');
  const [filterLocation, setFilterLocation] = useState('all');
  const [filterExperience, setFilterExperience] = useState('all');
  const [filterSalary, setFilterSalary] = useState('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedJob, setSelectedJob] = useState<AdminJob | null>(null);
  const [previewJob, setPreviewJob] = useState<AdminJob | null>(null);
  const [form, setForm] = useState<JobFormState>(defaultFormState);
  const [editReason, setEditReason] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showJobForm, setShowJobForm] = useState(false);
  const [showCompanyForm, setShowCompanyForm] = useState(false);

  const [skillQuery, setSkillQuery] = useState('');
  const [showSkillDropdown, setShowSkillDropdown] = useState(false);
  const skillContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (skillContainerRef.current && !skillContainerRef.current.contains(e.target as Node)) {
        setShowSkillDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addSkill = (skill: string) => {
    const current = form.skills_required.split('\n').filter(s => s.trim());
    if (!current.includes(skill)) {
      handleChange('skills_required', [...current, skill].join('\n'));
    }
  };

  const removeSkill = (skill: string) => {
    const current = form.skills_required.split('\n').filter(s => s.trim());
    handleChange('skills_required', current.filter(s => s !== skill).join('\n'));
  };

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const summary = useMemo(() => ({
    total: totalCount,
    active: jobs.filter(j => j.status === 'active').length,
    pending: jobs.filter(j => j.approval_status === 'pending').length,
  }), [jobs, totalCount]);

  const columns = useMemo<Column<AdminJob>[]>(() => [
    {
      header: (
        <input
          type="checkbox"
          checked={jobs.length > 0 && selectedIds.size === jobs.length}
          onChange={() => {
            if (selectedIds.size === jobs.length) {
              setSelectedIds(new Set());
            } else {
              setSelectedIds(new Set(jobs.map(j => j.id)));
            }
          }}
          style={{ cursor: 'pointer', width: '16px', height: '16px' }}
        />
      ),
      key: 'selection',
      width: '40px',
      render: (job) => (
        <input
          type="checkbox"
          checked={selectedIds.has(job.id)}
          onChange={() => {
            setSelectedIds(prev => {
              const next = new Set(prev);
              if (next.has(job.id)) next.delete(job.id);
              else next.add(job.id);
              return next;
            });
          }}
          onClick={(e) => e.stopPropagation()}
          style={{ cursor: 'pointer', width: '16px', height: '16px' }}
        />
      ),
      align: 'center'
    },
    {
      header: 'Job Title',
      key: 'title',
      render: (job) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <Link
            href={`/dashboard/admin/jobs/${job.id}`}
            onClick={(e) => e.stopPropagation()}
            style={{ fontWeight: 600, color: 'var(--tm-text-primary)', textDecoration: 'none' }}
          >
            {job.title}
          </Link>
          <span style={{ fontSize: '0.75rem', color: 'var(--tm-text-secondary)' }}>
            {job.companies?.name || 'Unknown Company'} • {job.type}
          </span>
        </div>
      )
    },
    {
      header: 'Department',
      key: 'department',
      render: (job) => <span>{job.department || 'General'}</span>
    },
    {
      header: 'Location',
      key: 'location',
      render: (job) => <span>{job.location}</span>
    },
    {
      header: 'Status',
      key: 'status',
      render: (job) => <StatusPill status={job.status as any} />
    },
    {
      header: 'Approved',
      key: 'approval_status',
      // Reads approval_status, not is_approved: the boolean cannot express 'rejected', so a
      // rejected job used to render here as 'Pending'.
      render: (job) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: job.approval_status === 'approved' ? '#10b981'
              : job.approval_status === 'rejected' ? '#ef4444' : '#f59e0b'
          }} />
          <span style={{ fontSize: '0.8rem', color: 'var(--tm-text-secondary)' }}>
            {job.approval_status === 'approved' ? 'Approved'
              : job.approval_status === 'rejected' ? 'Rejected' : 'Pending'}
          </span>
        </span>
      )
    },
    {
      header: 'Date Posted',
      key: 'created_at',
      render: (job) => <span>{job.created_at ? new Date(job.created_at).toLocaleDateString('en-IN') : '—'}</span>
    }
  ], [jobs, selectedIds]);

  const fetchJobs = useCallback(async (
    p = page,
    s = filterStatus,
    q = search,
    dept = filterDepartment,
    sk = filterSkill,
    title = filterJobTitle,
    loc = filterLocation,
    exp = filterExperience,
    sal = filterSalary
  ) => {
    setLoading(true);
    try {
      const { data, error: fetchError } = await invokeFunction('admin-jobs', {
        method: 'GET',
        queries: {
          includeMeta: 'true',
          search: q || undefined,
          status: s !== 'all' ? s : undefined,
          department: dept !== 'all' ? dept : undefined,
          skill: sk !== 'all' ? sk : undefined,
          title: title !== 'all' ? title : undefined,
          location: loc !== 'all' ? loc : undefined,
          experience: exp !== 'all' ? exp : undefined,
          salary: sal !== 'all' ? sal : undefined,
          page: p.toString(),
          limit: '20',
        }
      });

      if (fetchError) throw new Error(fetchError.message);

      if (data) {
        setJobs(data.items || []);
        setTotalCount(data.total);
        setTotalPages(Math.ceil(data.total / 20));
        if (data.companies) setCompanies(data.companies);
      }
    } catch (err) {
      setError('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, [
    page,
    filterStatus,
    search,
    filterDepartment,
    filterSkill,
    filterJobTitle,
    filterLocation,
    filterExperience,
    filterSalary
  ]);

  const handleStatusChange = (val: string) => {
    setFilterStatus(val);
    setPage(0);
    fetchJobs(0, val, search, filterDepartment, filterSkill, filterJobTitle, filterLocation, filterExperience, filterSalary);
  };

  const handleDepartmentChange = (val: string) => {
    setFilterDepartment(val);
    setPage(0);
    fetchJobs(0, filterStatus, search, val, filterSkill, filterJobTitle, filterLocation, filterExperience, filterSalary);
  };

  const handleSkillChange = (val: string) => {
    setFilterSkill(val);
    setPage(0);
    fetchJobs(0, filterStatus, search, filterDepartment, val, filterJobTitle, filterLocation, filterExperience, filterSalary);
  };

  const handleJobTitleChange = (val: string) => {
    setFilterJobTitle(val);
    setPage(0);
    fetchJobs(0, filterStatus, search, filterDepartment, filterSkill, val, filterLocation, filterExperience, filterSalary);
  };

  const handleLocationChange = (val: string) => {
    setFilterLocation(val);
    setPage(0);
    fetchJobs(0, filterStatus, search, filterDepartment, filterSkill, filterJobTitle, val, filterExperience, filterSalary);
  };

  const handleExperienceChange = (val: string) => {
    setFilterExperience(val);
    setPage(0);
    fetchJobs(0, filterStatus, search, filterDepartment, filterSkill, filterJobTitle, filterLocation, val, filterSalary);
  };

  const handleSalaryChange = (val: string) => {
    setFilterSalary(val);
    setPage(0);
    fetchJobs(0, filterStatus, search, filterDepartment, filterSkill, filterJobTitle, filterLocation, filterExperience, val);
  };

  useEffect(() => {
    if (user) {
      fetchJobs();
    }
  }, [fetchJobs, user]);

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleApprove = async (id: string) => {
    setLoading(true);
    try {
      const { error: approveError } = await invokeFunction('admin-jobs', {
        method: 'POST',
        body: { id, action: 'approve' }
      });
      if (approveError) throw new Error(approveError.message);
      setSuccess('Job approved and is now active');
      fetchJobs();
    } catch (err) {
      setError('Failed to approve job');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAction = async (action: 'approve' | 'reject' | 'delete') => {
    if (selectedIds.size === 0) return;
    setLoading(true);
    try {
      if (action === 'delete') {
        const { error: bulkError } = await invokeFunction('admin-jobs', {
          method: 'POST',
          body: { ids: Array.from(selectedIds), action: 'bulk-delete' }
        });
        if (bulkError) throw new Error(bulkError.message);
      } else {
        // Bulk approve/reject fans out to the same single-job 'approve'/'reject' action the
        // moderation queue uses. That action writes approval_status AND is_approved together,
        // requires the jobs:approve permission, and writes an audit_log entry — none of which
        // the old 'bulk-update' path did: it wrote { is_approved } only, under jobs:edit, with
        // no audit trail, which is what let a job go public while still queued as 'pending'.
        // ponytail: N requests instead of 1; add a bulk-approve edge action if admins ever
        // select enough jobs at once for the round-trips to matter.
        const results = await Promise.all(
          Array.from(selectedIds).map((id) =>
            invokeFunction('admin-jobs', { method: 'POST', body: { id, action } })
          )
        );
        const failed = results.find((r) => r.error);
        if (failed?.error) throw new Error(failed.error.message);
      }

      setSuccess(`Successfully ${action}d ${selectedIds.size} jobs`);
      setSelectedIds(new Set());
      fetchJobs();
    } catch (err) {
      setError('Bulk action failed');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedJob(null);
    setForm(defaultFormState);
    setEditReason('');
    setSuccess('');
    setError('');
    setShowJobForm(true);
  };

  const handleEdit = (job: AdminJob) => {
    setSelectedJob(job);
    setForm(toFormState(job));
    setEditReason('');
    setPreviewJob(null);
    setShowJobForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[Job Creation] Submission triggered');
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      if (!form.company_id) {
        setError('Company is required.');
        setSaving(false);
        return;
      }

      if (!form.title.trim()) {
        setError('Job Title is required.');
        setSaving(false);
        return;
      }

      if (!form.location.trim()) {
        setError('Location is required.');
        setSaving(false);
        return;
      }

      if (form.description.length < 50) {
        setError(`Description must be at least 50 characters long (Current: ${form.description.length}).`);
        setSaving(false);
        return;
      }

      const payload: any = {
        ...form,
        requirements: form.requirements.split('\n').filter(r => r.trim()),
        skills_required: form.skills_required.split('\n').filter(s => s.trim()),
      };

      if (form.salary_min) payload.salary_min = Number(form.salary_min);
      else delete payload.salary_min;

      if (form.salary_max) payload.salary_max = Number(form.salary_max);
      else delete payload.salary_max;

      if (form.experience_min) payload.experience_min = Number(form.experience_min);
      else delete payload.experience_min;

      if (form.experience_max) payload.experience_max = Number(form.experience_max);
      else delete payload.experience_max;

      // console.log('[Job Creation] Payload ready:', payload);

      // D-16: admin-jobs PATCH only accepts the allowlisted fields + a reason (min 10 chars).
      // `payload` above also carries company_id/type/currency (POST-only fields the server
      // now rejects on PATCH), so PATCH gets its own trimmed body.
      let savePayload = payload;
      if (selectedJob) {
        if (editReason.trim().length < 10) {
          setError('A reason (at least 10 characters) is required to save changes to a job.');
          setSaving(false);
          return;
        }
        const {
          title, description, requirements, location,
          salary_min, salary_max, experience_min, experience_max,
          department, skills_required, status,
        } = payload;
        savePayload = {
          title, description, requirements, location,
          salary_min, salary_max, experience_min, experience_max,
          department, skills_required, status,
          reason: editReason.trim(),
        };
      }

      const { data, error: saveError } = await invokeFunction('admin-jobs', {
        method: selectedJob ? 'PATCH' : 'POST',
        body: savePayload,
        queries: selectedJob ? { id: selectedJob.id } : undefined
      });

      if (saveError) throw new Error(saveError.message);

      if (data) {
        console.log('[Job Creation] Success');
        setSuccess('Job successfully saved');
        resetForm();
        fetchJobs();
      }
    } catch (err: any) {
      console.error('[Job Creation] Critical error:', err);
      setError(err.message || 'An error occurred while saving the job.');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof JobFormState, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <section className={styles.page}>
      <AdminHeader
        title="Manage Jobs"
        eyebrow="Admin Portal"
        subtitle="Manage, approve, and delete job listings on the platform."
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard/admin' }, { label: 'Jobs' }]}
        actions={
          <>
            <AdminButton variant="secondary" onClick={() => router.push('/dashboard/admin/job-approvals')} style={{ position: 'relative' }}>
              Job Approvals
              {summary.pending > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '-8px',
                  background: '#ef4444',
                  color: 'white',
                  fontSize: '0.7rem',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  border: '2px solid white'
                }}>
                  {summary.pending}
                </span>
              )}
            </AdminButton>
            <AdminButton variant="secondary" onClick={() => exportJobsCSV(jobs)}>Export CSV</AdminButton>
            <AdminButton onClick={() => setShowCompanyForm(true)}>+ Add Company</AdminButton>
            <AdminButton onClick={resetForm}>+ Post Job</AdminButton>
          </>
        }
      />

      <div className={styles.stats}>
        <AdminStatCard 
          label="Total Listings" 
          value={totalCount} 
          color="primary"
          onClick={() => { setFilterStatus('all'); setPage(0); }}
          isActive={filterStatus === 'all'}
        />
        <AdminStatCard 
          label="Pending Review" 
          value={summary.pending} 
          color="primary"
          onClick={() => { setFilterStatus('pending'); setPage(0); }}
          isActive={filterStatus === 'pending'}
        />
        <AdminStatCard 
          label="Active Now" 
          value={summary.active} 
          color="primary"
          onClick={() => { setFilterStatus('active'); setPage(0); }}
          isActive={filterStatus === 'active'}
        />
        <AdminStatCard 
          label="Flagged" 
          value={jobs.filter(j => j.status === 'reported').length} 
          color="primary"
          onClick={() => { setFilterStatus('reported'); setPage(0); }}
          isActive={filterStatus === 'reported'}
        />
      </div>

      <div className={styles.grid}>
        <div className={styles.listPanel}>
          <div className={styles.toolbar}>
            <div className={styles.searchContainer} style={{ flex: 1 }}>
              <input
                className={styles.searchInput}
                placeholder="Search by title, location..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchJobs(0)}
              />
            </div>
            <CustomSelect
              value={filterStatus}
              onChange={e => handleStatusChange(e.target.value)}
              options={filterStatusOptions}
              style={{ width: '180px' }}
            />
            <CustomSelect
              value={filterDepartment}
              onChange={e => handleDepartmentChange(e.target.value)}
              options={filterDepartmentOptions}
              style={{ width: '200px' }}
            />
            <CustomSelect
              value={filterSkill}
              onChange={e => handleSkillChange(e.target.value)}
              options={[
                { label: 'All Skills', value: 'all' },
                ...ALL_SKILLS.map(skill => ({ label: skill, value: skill }))
              ]}
              style={{ width: '200px' }}
            />
            <CustomSelect
              value={filterJobTitle}
              onChange={e => handleJobTitleChange(e.target.value)}
              options={filterJobTitleOptions}
              style={{ width: '200px' }}
            />
            <CustomSelect
              value={filterLocation}
              onChange={e => handleLocationChange(e.target.value)}
              options={filterLocationOptions}
              style={{ width: '200px' }}
            />
            <CustomSelect
              value={filterExperience}
              onChange={e => handleExperienceChange(e.target.value)}
              options={filterExperienceOptions}
              style={{ width: '200px' }}
            />
            <CustomSelect
              value={filterSalary}
              onChange={e => handleSalaryChange(e.target.value)}
              options={filterSalaryOptions}
              style={{ width: '200px' }}
            />
            <AdminButton onClick={() => fetchJobs(0)}>Apply</AdminButton>
          </div>

          <div className={styles.listBody} style={{ padding: 0, border: 'none', background: 'transparent' }}>
            <DataTable
              columns={columns}
              data={jobs}
              loading={authLoading || loading}
              onRowClick={(row) => setPreviewJob(row)}
              emptyState={
                <div className={styles.emptyState}>No jobs found matching the criteria.</div>
              }
            />
          </div>

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button disabled={page === 0} onClick={() => { setPage(page - 1); fetchJobs(page - 1); }} className={styles.pageButton}>Prev</button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  className={`${styles.pageButton} ${page === i ? styles.pageActive : ''}`}
                  onClick={() => { setPage(i); fetchJobs(i); }}
                >
                  {i + 1}
                </button>
              ))}
              <button disabled={page === totalPages - 1} onClick={() => { setPage(page + 1); fetchJobs(page + 1); }} className={styles.pageButton}>Next</button>
            </div>
          )}
        </div>
      </div>

      {showJobForm && (
        <div className={styles.drawerOverlay} onClick={() => setShowJobForm(false)}>
          <div className={styles.drawer} onClick={e => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
                {selectedJob ? 'Edit Job' : 'Post Job'}
              </h2>
              <button className={styles.drawerClose} onClick={() => setShowJobForm(false)}>×</button>
            </div>
            <div className={styles.drawerContent}>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.5rem' }}>
                Fill in the details below to create or edit the job listing.
              </p>

              <div>
            {error && (
              <div className={styles.errorBanner} style={{ marginTop: '1rem' }}>
                {error}
              </div>
            )}
            {success && (
              <div className={styles.successBanner} style={{ marginTop: '1rem' }}>
                {success}
              </div>
            )}
          </div>

          <form className={styles.form} onSubmit={handleSave}>
            <AdminSelect
              label="Company"
              options={[
                { label: 'Select a company...', value: '' },
                ...companies.map(c => ({ label: c.name, value: c.id }))
              ]}
              value={form.company_id}
              onChange={e => handleChange('company_id', e.target.value)}
            />

            <AdminInput
              label="Job Title"
              value={form.title}
              onChange={e => handleChange('title', e.target.value)}
              placeholder="e.g. Lead Dev-Ops Architect"
              listOptions={[
                'Software Engineer',
                'Senior Software Engineer',
                'Frontend Engineer',
                'Backend Engineer',
                'Full Stack Engineer',
                'DevOps Engineer',
                'QA Engineer',
                'Data Scientist',
                'Product Manager',
                'Project Manager',
                'UI/UX Designer',
                'HR Manager',
                'Sales Executive',
                'Marketing Specialist',
                'Operations Manager'
              ]}
            />

            <div className={styles.twoColumn}>
              <AdminSelect
                label="Job Type"
                options={typeOptions}
                value={form.type}
                onChange={e => handleChange('type', e.target.value)}
              />
              <AdminSelect
                label="Status"
                options={statusOptions}
                value={form.status}
                onChange={e => handleChange('status', e.target.value)}
              />
            </div>

            <AdminInput
              label="Location"
              value={form.location}
              onChange={e => handleChange('location', e.target.value)}
              placeholder="City, Country or 'Remote'"
              listOptions={[
                'Remote',
                'Bangalore, India',
                'Mumbai, India',
                'Delhi NCR, India',
                'Hyderabad, India',
                'Pune, India',
                'Chennai, India',
                'San Francisco, CA',
                'New York, NY',
                'London, UK',
                'Singapore'
              ]}
            />

            <div className={styles.threeColumn}>
              <AdminInput
                label="Salary Min"
                type="number"
                value={form.salary_min}
                onChange={e => handleChange('salary_min', e.target.value)}
                placeholder="e.g. 800000"
              />
              <AdminInput
                label="Salary Max"
                type="number"
                value={form.salary_max}
                onChange={e => handleChange('salary_max', e.target.value)}
                placeholder="e.g. 1200000"
              />
              <AdminSelect
                label="Currency"
                options={[{ label: 'INR', value: 'INR' }, { label: 'USD', value: 'USD' }]}
                value={form.currency}
                onChange={e => handleChange('currency', e.target.value)}
              />
            </div>

            <div className={styles.threeColumn}>
              <AdminInput
                label="Exp Min (Years)"
                type="number"
                value={form.experience_min}
                onChange={e => handleChange('experience_min', e.target.value)}
                placeholder="0"
              />
              <AdminInput
                label="Exp Max (Years)"
                type="number"
                value={form.experience_max}
                onChange={e => handleChange('experience_max', e.target.value)}
                placeholder="5"
              />
              <AdminInput
                label="Department"
                value={form.department}
                onChange={e => handleChange('department', e.target.value)}
                placeholder="e.g. Engineering"
                listOptions={[
                  'Engineering',
                  'Product Management',
                  'Design',
                  'Marketing',
                  'Sales',
                  'Finance & Accounts',
                  'Human Resources',
                  'Operations',
                  'Customer Success & Support'
                ]}
              />
            </div>

            <div className={styles.field}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label className={styles.label}>Job Description</label>
                <span style={{ 
                  fontSize: '0.75rem', 
                  fontWeight: 600,
                  color: (form.description?.length || 0) < 50 ? '#ef4444' : '#10b981' 
                }}>
                  {form.description?.length || 0} / 50 characters min
                </span>
              </div>
              <textarea
                className={styles.textarea}
                style={{ 
                  minHeight: '160px',
                  borderColor: (form.description?.length || 0) > 0 && (form.description?.length || 0) < 50 ? '#ef4444' : ''
                }}
                value={form.description}
                onChange={e => handleChange('description', e.target.value)}
                placeholder="Describe the job role, responsibilities, and details (min. 50 characters)..."
              />
              {(form.description?.length || 0) > 0 && (form.description?.length || 0) < 50 && (
                <p style={{ fontSize: '0.7rem', color: '#ef4444', marginTop: '4px' }}>
                  Description needs to be at least 50 characters long.
                </p>
              )}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Requirements (one per line)</label>
              <textarea
                className={styles.textareaSmall}
                value={form.requirements}
                onChange={e => handleChange('requirements', e.target.value)}
                placeholder="e.g. 5+ years experience in Node.js"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Required Skills</label>
              
              {/* Capsule tags list */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                {(() => {
                  const selectedSkills = form.skills_required.split('\n').filter(s => s.trim());
                  if (selectedSkills.length === 0) {
                    return <span style={{ fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic' }}>No skills added yet. Select from suggestions or type custom skill.</span>;
                  }
                  return selectedSkills.map(skill => (
                    <span 
                      key={skill} 
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        borderRadius: '999px',
                        background: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        color: '#1e40af'
                      }}
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkill(skill)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#3b82f6',
                          cursor: 'pointer',
                          fontSize: '1rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0,
                          fontWeight: 800
                        }}
                        title={`Remove ${skill}`}
                      >
                        &times;
                      </button>
                    </span>
                  ));
                })()}
              </div>

              {/* Autocomplete Input & Dropdown */}
              <div ref={skillContainerRef} style={{ position: 'relative' }}>
                <input
                  type="text"
                  className={styles.input}
                  value={skillQuery}
                  onChange={e => { setSkillQuery(e.target.value); setShowSkillDropdown(true); }}
                  onFocus={() => setShowSkillDropdown(true)}
                  placeholder="Type or select a skill (e.g. React)..."
                  onKeyDown={e => {
                    if (e.key === 'Enter' && skillQuery.trim()) {
                      e.preventDefault();
                      addSkill(skillQuery.trim());
                      setSkillQuery('');
                      setShowSkillDropdown(false);
                    }
                  }}
                />
                {showSkillDropdown && (
                  <div 
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 4px)',
                      left: 0,
                      right: 0,
                      background: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      maxHeight: '180px',
                      overflowY: 'auto',
                      zIndex: 50,
                      boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                    }}
                  >
                    {(() => {
                      const selectedSkills = form.skills_required.split('\n').filter(s => s.trim());
                      const filteredSkills = ALL_SKILLS.filter(skill => 
                        skill.toLowerCase().includes(skillQuery.toLowerCase()) &&
                        !selectedSkills.includes(skill)
                      );
                      
                      return (
                        <>
                          {filteredSkills.map(skill => (
                            <div
                              key={skill}
                              onClick={() => {
                                addSkill(skill);
                                setSkillQuery('');
                                setShowSkillDropdown(false);
                              }}
                              style={{
                                padding: '10px 16px',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                color: '#334155',
                                borderBottom: '1px solid #f1f5f9',
                                transition: 'all 0.15s'
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#2563eb'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = '#334155'; }}
                            >
                              {skill}
                            </div>
                          ))}
                          {skillQuery.trim() && !ALL_SKILLS.some(s => s.toLowerCase() === skillQuery.toLowerCase()) && (
                            <div
                              onClick={() => {
                                addSkill(skillQuery.trim());
                                setSkillQuery('');
                                setShowSkillDropdown(false);
                              }}
                              style={{
                                padding: '10px 16px',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                color: '#2563eb',
                                fontStyle: 'italic',
                                borderBottom: '1px solid #f1f5f9',
                                fontWeight: 600
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'white'; }}
                            >
                              + Add custom skill: "{skillQuery.trim()}"
                            </div>
                          )}
                          {filteredSkills.length === 0 && !skillQuery.trim() && (
                            <div style={{ padding: '10px 16px', fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>
                              No more skills matches.
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>

            {selectedJob && (
              <div className={styles.field} style={{ marginTop: '16px' }}>
                <label className={styles.label}>Reason for this change (required, min 10 characters)</label>
                <textarea
                  className={styles.textareaSmall}
                  value={editReason}
                  onChange={e => setEditReason(e.target.value)}
                  placeholder="e.g. Company requested a salary range correction"
                />
              </div>
            )}

            <div className={styles.formActions} style={{ marginTop: '24px' }}>
              <AdminButton variant="secondary" type="button" onClick={() => setShowJobForm(false)}>Cancel</AdminButton>
              <AdminButton type="submit" isLoading={saving}>
                {selectedJob ? 'Save Changes' : 'Post Job'}
              </AdminButton>
            </div>
          </form>
            </div>
          </div>
        </div>
      )}

      {showCompanyForm && (
        <div className={styles.drawerOverlay} onClick={() => setShowCompanyForm(false)}>
          <div className={styles.drawer} onClick={e => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <h2>Add New Company</h2>
              <button className={styles.drawerClose} onClick={() => setShowCompanyForm(false)}>×</button>
            </div>
            <div className={styles.drawerContent} style={{ padding: '2rem' }}>
              <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '2rem' }}>
                Create a new company profile first.
              </p>
              <CompanyRegisterForm 
                onSuccess={() => {
                  setShowCompanyForm(false);
                  fetchJobs(0);
                }}
                onCancel={() => setShowCompanyForm(false)}
              />
            </div>
          </div>
        </div>
      )}

      <DetailDrawer
        isOpen={!!previewJob}
        onClose={() => setPreviewJob(null)}
        title="Job Details"
      >
        {previewJob && (
          <div className={styles.drawerContent} style={{ padding: 0 }}>
            <JobCard job={previewJob} showActions={false} showSave={false} />
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              {previewJob.approval_status !== 'approved' && (
                <AdminButton style={{ flex: 1, background: '#10b981' }} onClick={() => handleApprove(previewJob.id)}>Approve & Go Live</AdminButton>
              )}
              <AdminButton style={{ flex: 1 }} onClick={() => handleEdit(previewJob)}>Edit Job</AdminButton>
              <AdminButton variant="danger" onClick={() => handleBulkAction('delete')}>Delete</AdminButton>
            </div>
            <div style={{ marginTop: '32px' }}>
              <h3 style={{ fontSize: '0.9rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>Full Description</h3>
              <div style={{ fontSize: '0.95rem', lineHeight: '1.8', color: '#334155', whiteSpace: 'pre-wrap' }}>
                {previewJob.description}
              </div>
            </div>
          </div>
        )}
      </DetailDrawer>

      {/* Floating Bulk Action Selection Bar */}
      {selectedIds.size > 0 && (
        <div className={styles.bulkBar}>
          <span className={styles.bulkInfo}>{selectedIds.size} jobs selected</span>
          <div className={styles.bulkButtons}>
            <AdminButton onClick={() => handleBulkAction('approve')}>Approve</AdminButton>
            <AdminButton onClick={() => handleBulkAction('reject')}>Reject</AdminButton>
            <AdminButton variant="danger" onClick={() => handleBulkAction('delete')}>Delete</AdminButton>
            <AdminButton variant="secondary" onClick={() => { setSelectedIds(new Set()); }}>Clear</AdminButton>
          </div>
        </div>
      )}
    </section>
  );
}
