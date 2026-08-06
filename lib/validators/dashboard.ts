import { z } from 'zod';
import { APPLICATION_STATUSES } from '../constants/application-status';

/**
 * Shared Score Schema (0-100)
 */
const ScoreSchema = z.number().min(0).max(100);

/**
 * Shared ISO Date Schema
 */
const IsoDateSchema = z.string().datetime();

// ─── Shared Core Schemas ──────────────────────────────────────────────────────

export const ApiStatusSchema = z.enum(['idle', 'loading', 'success', 'error']);

// ─── Pipeline Schemas ─────────────────────────────────────────────────────────

export const PipelineStageSchema = z.object({
  id: z.string(),
  label: z.string(),
  count: z.number(),
  color: z.string(),
  bgColor: z.string(),
});

// ─── Candidate Schemas ────────────────────────────────────────────────────────

export const CandidateSchema = z.object({
  id: z.string(),
  name: z.string(),
  avatar: z.string(),
  role: z.string(),
  stage: z.string(),
  aiScore: ScoreSchema,
  skillAlignment: ScoreSchema,
  experienceFit: ScoreSchema,
  culturalMatch: ScoreSchema,
  skills: z.array(z.string()),
  yearsExp: z.number(),
  location: z.string(),
  appliedAt: IsoDateSchema,
  urgent: z.boolean(),
  status: z.enum(APPLICATION_STATUSES),
  salary: z.string(),
});

// ─── Job Schemas ─────────────────────────────────────────────────────────────

export const JobTypeSchema = z.enum(['full-time', 'part-time', 'contract', 'remote', 'hybrid']);
export const JobStatusSchema = z.enum(['active', 'paused', 'closed', 'draft']);

export const JobSchema = z.object({
  id: z.string(),
  title: z.string(),
  department: z.string(),
  type: JobTypeSchema,
  applicants: z.number(),
  newApplicants: z.number(),
  postedDays: z.number(),
  status: JobStatusSchema,
  location: z.string(),
  salary: z.string(),
  aiMatchRate: ScoreSchema,
});

// ─── Interview Schemas ───────────────────────────────────────────────────────

export const InterviewTypeSchema = z.enum(['video', 'phone', 'onsite', 'technical', 'panel']);
export const InterviewStatusSchema = z.enum(['scheduled', 'confirmed', 'cancelled', 'completed', 'rescheduling']);

export const InterviewSchema = z.object({
  id: z.string(),
  candidateName: z.string(),
  candidateAvatar: z.string(),
  role: z.string(),
  scheduledAt: IsoDateSchema,
  duration: z.string(),
  type: InterviewTypeSchema,
  status: InterviewStatusSchema,
  aiSuggested: z.boolean(),
  hasConflict: z.boolean(),
  interviewers: z.array(z.string()),
  meetingLink: z.string().optional(),
});

// ─── Diversity Schemas ────────────────────────────────────────────────────────

export const DiversityMetricSchema = z.object({
  label: z.string(),
  pct: z.number(),
  count: z.number(),
  color: z.string(),
});

export const DiversityDataSchema = z.object({
  gender: z.array(DiversityMetricSchema),
  ethnicity: z.array(DiversityMetricSchema),
  education: z.array(DiversityMetricSchema),
  goalTarget: z.number(),
  goalAchieved: z.number(),
  inclusionScore: ScoreSchema,
  insight: z.array(z.string()),
});

// ─── Activity Schemas ─────────────────────────────────────────────────────────

export const ActivityTypeSchema = z.enum(['application', 'interview', 'offer', 'hire', 'reject', 'message', 'job_posted']);

export const ActivityItemSchema = z.object({
  id: z.string(),
  type: ActivityTypeSchema,
  title: z.string(),
  description: z.string(),
  timeAgo: z.string(),
  actor: z.string(),
  actorAvatar: z.string(),
  meta: z.string().optional(),
});

// ─── KPI Schemas ─────────────────────────────────────────────────────────────

export const CompanyKpisSchema = z.object({
  activeJobs: z.number(),
  totalApplicants: z.number(),
  interviewsToday: z.number(),
  avgTimeToHire: z.number(),
  offerAcceptRate: ScoreSchema,
  openOffers: z.number(),
  trends: z.object({
    activeJobs: z.number(),
    totalApplicants: z.number(),
    interviewsToday: z.number(),
    avgTimeToHire: z.number(),
  }),
});

export const CandidateKpisSchema = z.object({
  totalApplications: z.number(),
  interviewsScheduled: z.number(),
  profileViews: z.number(),
  responseRate: ScoreSchema,
  savedJobs: z.number(),
  offersReceived: z.number(),
  trends: z.object({
    totalApplications: z.number(),
    interviewsScheduled: z.number(),
    profileViews: z.number(),
    responseRate: z.number(),
  }),
});

// ─── Profile Schemas ─────────────────────────────────────────────────────────

export const CandidateProfileSchema = z.object({
  name: z.string(),
  role: z.string(),
  avatar: z.string(),
  profileStrength: ScoreSchema,
  views7d: z.number(),
  aiKarma: z.number(),
  completionItems: z.array(z.object({ label: z.string(), done: z.boolean() })),
});

// ─── Dashboard Data Schemas ──────────────────────────────────────────────────

export const CompanyDashboardDataSchema = z.object({
  kpis: CompanyKpisSchema,
  pipeline: z.object({
    stages: z.array(PipelineStageSchema),
    candidates: z.array(CandidateSchema),
  }),
  jobs: z.array(JobSchema),
  topCandidates: z.array(CandidateSchema),
  interviews: z.array(InterviewSchema),
  diversity: DiversityDataSchema,
  activity: z.array(ActivityItemSchema),
});

export const CandidateDashboardDataSchema = z.object({
  profile: CandidateProfileSchema,
  kpis: CandidateKpisSchema,
  applications: z.array(z.object({
    id: z.string(),
    jobTitle: z.string(),
    company: z.string(),
    companyInitials: z.string(),
    companyColor: z.string(),
    stage: z.string(),
    stageIndex: z.number(),
    appliedDate: IsoDateSchema,
    lastUpdate: IsoDateSchema,
    aiMatchScore: ScoreSchema,
    nextAction: z.string(),
    status: z.enum(APPLICATION_STATUSES),
    salary: z.string(),
    type: JobTypeSchema,
    location: z.string(),
  })),
  recommendations: z.array(z.object({
    id: z.string(),
    title: z.string(),
    company: z.string(),
    companyInitials: z.string(),
    companyColor: z.string(),
    location: z.string(),
    type: JobTypeSchema,
    salary: z.string(),
    matchScore: ScoreSchema,
    postedDays: z.number(),
    skills: z.array(z.string()),
    reason: z.string(),
    saved: z.boolean(),
  })),
  interviews: z.array(InterviewSchema),
  skillGaps: z.array(z.object({
    skill: z.string(),
    current: ScoreSchema,
    required: ScoreSchema,
    category: z.string(),
    priority: z.enum(['critical', 'high', 'medium', 'low']),
    resources: z.string().optional(),
  })),
  activity: z.array(ActivityItemSchema),
});
