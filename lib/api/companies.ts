// DB row types for companies + company-first tables (migrations 046-051).
// Live `companies` has `description` (not `about`) and no `recruiter_id`.

export type CompanyStatus = 'pending' | 'verified' | 'suspended' | 'deactivated';

export interface Company {
  id: string;
  name: string;
  gstin?: string;
  tan?: string;
  logo_url?: string;
  website?: string;
  industry?: string;
  size?: string;
  description?: string;
  location?: string;
  is_verified?: boolean;
  is_active?: boolean;
  created_at?: string;
  // added in 046
  status: CompanyStatus;
  verified_at?: string;
  verified_by?: string;
  created_by?: string;
  updated_at?: string;
  cin?: string;
  pan?: string;
  registered_email_domain?: string;
  country_code?: string;
  slug?: string;
}

export type CompanyMemberRole = 'admin' | 'recruiter' | 'coordinator';
export type CompanyMemberStatus = 'invited' | 'active' | 'suspended' | 'removed';

export interface CompanyMember {
  id: string;
  company_id: string;
  user_id: string;
  member_role: CompanyMemberRole;
  status: CompanyMemberStatus;
  invited_by?: string;
  joined_at?: string;
  created_at?: string;
  updated_at?: string;
}

export type VerificationChannel = 'gmail_kyc' | 'upload_portal';
export type VerificationRequestStatus = 'submitted' | 'under_review' | 'approved' | 'rejected' | 'needs_more_info';

export interface CompanyVerificationRequest {
  id: string;
  company_id: string;
  submitted_by?: string;
  channel: VerificationChannel;
  status: VerificationRequestStatus;
  kyc_documents?: unknown;
  reviewer_id?: string;
  review_notes?: string;
  decided_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface VerificationAuditLog {
  id: string;
  company_id?: string;
  request_id?: string;
  actor_id?: string;
  action: string;
  from_state?: string;
  to_state?: string;
  metadata?: unknown;
  created_at?: string;
}

export interface PlanLimits {
  plan: string;
  max_active_jobs: number;
  price_inr: number;
  talent_pool: boolean;
}
