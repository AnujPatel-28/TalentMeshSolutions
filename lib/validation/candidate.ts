import { z } from 'zod';

export const candidateProfileSchema = z.object({
  // Profiles table fields
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  location: z.string().max(100).optional().nullable(),
  bio: z.string().max(1000, 'Bio must be at most 1000 characters').optional().nullable(),
  
  // Candidate profiles table fields
  headline: z.string().max(160, 'Headline must be at most 160 characters').optional().nullable(),
  skills: z.array(z.string()).max(30, 'You can add up to 30 skills').default([]).nullable(),
  experience_years: z.number().min(0).max(50, 'Experience must be between 0 and 50 years').default(0).nullable(),
  salary_min: z.number().min(0).optional().nullable(),
  salary_max: z.number().min(0).optional().nullable(),
  job_types: z.array(z.string()).default([]).nullable(),
  preferred_locations: z.array(z.string()).default([]).nullable(),
  open_to_remote: z.boolean().default(true).nullable(),
  linkedin_url: z.string().optional().nullable(),
  github_url: z.string().optional().nullable(),
  portfolio_url: z.string().optional().nullable(),
  education: z.union([z.string(), z.array(z.object({
    id: z.string(),
    institution: z.string().optional().nullable(),  // allow empty for legacy entries
    degree: z.string().min(1, 'Degree is required'),
    field_of_study: z.string().optional().nullable(),
    start_year: z.number().optional().nullable(),
    end_year: z.number().optional().nullable(),
    is_current: z.boolean().optional().nullable(),
    grade: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
  }))]).default([]).nullable(),
});

export const applicationSchema = z.object({
  cover_letter: z.string().max(1500, 'Cover letter must be at most 1500 characters').optional(),
});

export type CandidateProfileInput = z.infer<typeof candidateProfileSchema>;
export type ApplicationInput = z.infer<typeof applicationSchema>;

const flattenErrors = (error: z.ZodError) => {
  const errors: Record<string, string> = {};
  error.issues.forEach((err: z.ZodIssue) => {
    if (!err.path || err.path.length === 0) return;
    // For nested paths like [0, 'institution'], use the field name as key
    // For top-level paths like ['name'], use that directly
    const topKey = err.path[0]?.toString();
    // If path starts with a number index (array item), try to find a named key
    const namedKey = typeof err.path[0] === 'number'
      ? (err.path[1]?.toString() ?? topKey)
      : topKey;
    const key = namedKey || topKey;
    if (key && !errors[key]) {
      errors[key] = err.message;
    }
  });
  return errors;
};

export const validateCandidateProfile = (data: unknown) => {
  const result = candidateProfileSchema.safeParse(data);
  return result.success 
    ? { success: true, data: result.data, errors: null } 
    : { success: false, data: null, errors: flattenErrors(result.error) };
};

export const validateApplication = (data: unknown) => {
  const result = applicationSchema.safeParse(data);
  return result.success 
    ? { success: true, data: result.data, errors: null } 
    : { success: false, data: null, errors: flattenErrors(result.error) };
};
