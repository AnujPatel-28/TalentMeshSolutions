import { z } from 'zod';

export const candidateProfileSchema = z.object({
  profile: z.object({
    name: z.string().min(2).optional(),
    phone: z.string().optional(),
    location: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country_code: z.string().length(2).optional(),
    postal_code: z.string().optional(),
  }).optional(),
  candidateProfile: z.object({
    headline: z.string().optional(),
    skills: z.array(z.string()).optional(),
    experience_years: z.number().nonnegative("Experience cannot be negative").nullable().optional(),
    education: z.union([
      z.string(),
      z.array(z.object({
        id: z.string(),
        institution: z.string().optional().nullable(),
        degree: z.string().min(1, 'Degree is required'),
        field_of_study: z.string().optional().nullable(),
        start_year: z.number().optional().nullable(),
        end_year: z.number().optional().nullable(),
        is_current: z.boolean().optional().nullable(),
        grade: z.string().optional().nullable(),
        description: z.string().optional().nullable(),
      }))
    ]).optional(),
    resume_url: z.string().url().optional().or(z.literal('')),
    linkedin_url: z.string().url().optional().or(z.literal('')),
    github_url: z.string().url().optional().or(z.literal('')),
    portfolio_url: z.string().url().optional().or(z.literal('')),
    salary_min: z.number().nonnegative("Salary cannot be negative").nullable().optional(),
    salary_max: z.number().nonnegative("Salary cannot be negative").nullable().optional(),
    preferred_locations: z.array(z.string()).optional(),
    job_type: z.string().optional(),
    employment_status: z.enum(['student_fresher', 'employed', 'unemployed', 'freelancer', 'career_break']).optional(),
    notice_period: z.enum(['immediate', '15_days', '30_days', '60_days', '90_days', 'other']).optional(),
    willing_to_relocate: z.boolean().optional(),
    work_authorization: z.enum(['citizen', 'permanent_resident', 'work_visa', 'requires_sponsorship', 'other']).optional(),
    current_ctc: z.number().nonnegative("Current CTC cannot be negative").nullable().optional(),
  }).optional(),
});

export type CandidateProfileInput = z.infer<typeof candidateProfileSchema>;
