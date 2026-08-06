export type QuestionType = 'technical' | 'behavioral' | 'situational' | 'culture_fit';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export interface InterviewQuestion {
  id: string;
  question: string;
  type: QuestionType;
  difficulty: DifficultyLevel;
  expected_answer_points: string[];
  follow_up: string;
  scoring_rubric: string;
}

export interface InterviewSection {
  title: string;
  duration_minutes: number;
  questions: InterviewQuestion[];
}

export interface InterviewGuideResponse {
  guide_id: string;
  job_title: string;
  interview_type: string;
  estimated_duration: number;
  sections: InterviewSection[];
  evaluation_criteria: string[];
  red_flags: string[];
  recommended_structure: string;
}

export interface InterviewGuideRecord {
  id: string;
  job_id: string;
  recruiter_id: string;
  interview_type: string;
  duration_minutes: number;
  guide_data: InterviewGuideResponse;
  created_at: string;
}

export interface NVite {
  id: string;
  recruiter_id: string;
  candidate_id: string;
  job_id: string | null;
  subject: string;
  message: string;
  status: 'sent' | 'read' | 'accepted' | 'declined' | 'expired';
  read_at: string | null;
  responded_at: string | null;
  expires_at: string;
  created_at: string;
  candidate: { 
    id: string; 
    full_name: string; 
    email: string; 
    avatar_url: string | null; 
    current_role?: string; 
    location?: string;
  };
  job: { id: string; title: string } | null;
  recruiter: { 
    id: string; 
    full_name: string; 
    company_name: string; 
    avatar_url: string | null; 
  };
}

export interface ComposeFormData {
  candidate_id: string;
  job_id: string | null;
  subject: string;
  message: string;
  expires_days: 7 | 14 | 30;
}
