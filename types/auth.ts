export type UserRole = 'candidate' | 'recruiter' | 'admin' | 'super_admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  role_id?: string | null;
  public_id?: string;
  is_onboarded?: boolean;
  is_active?: boolean;
  avatar_url: string | null;
  company_id?: string;
  created_at?: string;
  mfa_enabled?: boolean;
  password_set_at?: string;
  phone?: string | null;
  location?: string | null;
  completed_onboarding?: boolean;
  onboarding_completed?: boolean;
  onboarding_step?: number;
}
