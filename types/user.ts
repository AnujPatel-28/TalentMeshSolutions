import { ApplicationStatus } from '@/lib/constants/application-status';
export type { ApplicationStatus };
export type UserRole = 'candidate' | 'recruiter' | 'admin' | 'super_admin';

export interface WorkExperience {
  id: string;
  title: string;
  company: string;
  location?: string;
  start_date?: string;   // "YYYY-MM"
  end_date?: string;     // "YYYY-MM" | undefined when is_current = true
  is_current?: boolean;
  description?: string;
}

export interface EducationEntry {
  id: string;
  institution: string;
  degree: string;
  field_of_study?: string;
  start_year?: number;
  end_year?: number;
  is_current?: boolean;
  grade?: string;
  description?: string;
}

export interface CandidateProfile {
  id: string;
  headline?: string;
  skills?: string[];
  experience_years?: number;
  education?: string | EducationEntry[];
  work_history?: WorkExperience[];
  resume_url?: string;
  linkedin_url?: string;
  github_url?: string;
  portfolio_url?: string;
  job_types?: string[];
  preferred_locations?: string[];
  salary_min?: number;
  salary_max?: number;
  currency?: string;
  open_to_remote?: boolean;
  profile_strength: number;
  is_visible?: boolean;
  updated_at?: string;
  primary_resume_id?: string;
  is_discoverable?: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string | UserRole;
  role_id?: string;
  phone?: string;
  location?: string;
  about?: string;
  avatar_url?: string;
  is_onboarded?: boolean;
  candidate_profiles?: CandidateProfile;
  completed_onboarding?: boolean;
  onboarding_complete?: boolean;
  onboarding_completed?: boolean;
}

export type JobType = 'full-time' | 'part-time' | 'contract' | 'remote' | 'hybrid';

export interface Application {
    id: string;
    status: ApplicationStatus;
    applied_at: string;
    updated_at?: string;
    jobs: {
        id: string;
        title: string;
        location: string;
        type: string;
        companies: {
            name: string;
            logo_url: string | null;
        };
    };
}

