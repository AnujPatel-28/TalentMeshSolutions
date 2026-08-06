// ─── Shared Core Types ────────────────────────────────────────────────────────

export type ApiStatus = 'idle' | 'loading' | 'success' | 'error';

export interface ApiState<T> {
    data: T | null;
    status: ApiStatus;
    error: string | null;
    lastUpdated: Date | null;
}

// ─── Pipeline ────────────────────────────────────────────────────────────────

export interface PipelineStage {
    id: string;
    label: string;
    count: number;
    color: string;
    bgColor: string;
}

// ─── Candidates (Company view) ───────────────────────────────────────────────

export interface Candidate {
    id: string;
    name: string;
    avatar: string;        // 2-letter initials
    role: string;
    stage: string;         // matches PipelineStage.id
    aiScore: number;       // 0–100
    skillAlignment: number;
    experienceFit: number;
    culturalMatch: number;
    skills: string[];
    yearsExp: number;
    location: string;
    appliedAt: string;     // ISO date string
    urgent: boolean;
    status: ApplicationStatus;
    salary: string;
}

// ─── Jobs ────────────────────────────────────────────────────────────────────

export type JobStatus = 'active' | 'paused' | 'closed' | 'draft';
export type JobType = 'full-time' | 'part-time' | 'contract' | 'remote' | 'hybrid';

export interface Job {
    id: string;
    title: string;
    department: string;
    type: JobType;
    applicants: number;
    newApplicants: number;
    postedDays: number;
    status: JobStatus;
    location: string;
    salary: string;
    aiMatchRate: number;   // % of applicants who are good fits
}

// ─── Interviews ──────────────────────────────────────────────────────────────

export type InterviewType = 'video' | 'phone' | 'onsite' | 'technical' | 'panel';
export type InterviewStatus = 'scheduled' | 'confirmed' | 'cancelled' | 'completed' | 'rescheduling';

export interface Interview {
    id: string;
    candidateName: string;
    candidateAvatar: string;
    role: string;
    scheduledAt: string;    // ISO 8601 format
    duration: string;       // e.g. "45 min"
    type: InterviewType;
    status: InterviewStatus;
    aiSuggested: boolean;
    hasConflict: boolean;
    interviewers: string[];
    meetingLink?: string;
}

// ─── Diversity ───────────────────────────────────────────────────────────────

export interface DiversityMetric {
    label: string;
    pct: number;
    count: number;
    color: string;
}

export interface DiversityData {
    gender: DiversityMetric[];
    ethnicity: DiversityMetric[];
    education: DiversityMetric[];
    goalTarget: number;     // e.g. 80
    goalAchieved: number;   // e.g. 67
    inclusionScore: number; // 0–100 composite score
    insight: string[];
}

// ─── Activity Feed ───────────────────────────────────────────────────────────

export type ActivityType = 'application' | 'interview' | 'offer' | 'hire' | 'reject' | 'message' | 'job_posted';

export interface ActivityItem {
    id: string;
    type: ActivityType;
    title: string;
    description: string;
    timeAgo: string;
    actor: string;
    actorAvatar: string;
    meta?: string;
}

// ─── Company KPIs ────────────────────────────────────────────────────────────

export interface CompanyKpis {
    activeJobs: number;
    totalApplicants: number;
    interviewsToday: number;
    avgTimeToHire: number;    // days
    offerAcceptRate: number;  // %
    openOffers: number;
    trends: {
        activeJobs: number;
        totalApplicants: number;
        interviewsToday: number;
        avgTimeToHire: number;
    };
}

// ─── Full Company Dashboard ──────────────────────────────────────────────────

export interface CompanyDashboardData {
    kpis: CompanyKpis;
    pipeline: { stages: PipelineStage[]; candidates: Candidate[] };
    jobs: Job[];
    topCandidates: Candidate[];
    interviews: Interview[];
    diversity: DiversityData;
    activity: ActivityItem[];
}

// ─── Applications (Candidate view) ───────────────────────────────────────────

export type ApplicationStatus = 'applied' | 'reviewing' | 'shortlisted' | 'interviewing' | 'offered' | 'hired' | 'rejected' | 'withdrawn';

export interface Application {
    id: string;
    jobTitle: string;
    company: string;
    companyInitials: string;
    companyColor: string;
    stage: string;
    stageIndex: number;    // 0–4 for the 5 pipeline stages
    appliedDate: string;
    lastUpdate: string;
    aiMatchScore: number;
    nextAction: string;
    status: ApplicationStatus;
    salary: string;
    type: JobType;
    location: string;
}

// ─── Job Recommendations ─────────────────────────────────────────────────────

export interface JobRecommendation {
    id: string;
    title: string;
    company: string;
    companyInitials: string;
    companyColor: string;
    location: string;
    type: JobType;
    salary: string;
    matchScore: number;
    postedDays: number;
    skills: string[];
    reason: string;
    saved: boolean;
}

// ─── Skill Gap ───────────────────────────────────────────────────────────────

export type SkillPriority = 'critical' | 'high' | 'medium' | 'low';

export interface SkillGap {
    skill: string;
    current: number;      // 0–100
    required: number;     // 0–100
    category: string;
    priority: SkillPriority;
    resources?: string;
}

// ─── Candidate KPIs ──────────────────────────────────────────────────────────

export interface CandidateKpis {
    totalApplications: number;
    interviewsScheduled: number;
    profileViews: number;
    responseRate: number;  // %
    savedJobs: number;
    offersReceived: number;
    trends: {
        totalApplications: number;
        interviewsScheduled: number;
        profileViews: number;
        responseRate: number;
    };
}

// ─── Candidate Profile ───────────────────────────────────────────────────────

export interface CandidateProfile {
    name: string;
    role: string;
    avatar: string;
    profileStrength: number;  // 0–100
    views7d: number;
    aiKarma: number;
    completionItems: { label: string; done: boolean }[];
}

// ─── Full Candidate Dashboard ────────────────────────────────────────────────

export interface CandidateDashboardData {
    profile: CandidateProfile;
    kpis: CandidateKpis;
    applications: Application[];
    recommendations: JobRecommendation[];
    interviews: Interview[];
    skillGaps: SkillGap[];
    activity: ActivityItem[];
}
