import { z } from 'zod';

export const companySchema = z.object({
  name: z.string().min(2, 'Company name must be at least 2 characters').max(100, 'Company name must be less than 100 characters'),
  industry: z.string().min(1, 'Industry is required'),
  size: z.enum(['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']),
  website: z.string().url('Invalid website URL').or(z.literal('')).optional(),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
  location: z.string().min(1, 'Location is required'),
});

export const recruiterProfileSchema = z.object({
  job_title: z.string().min(1, 'Job title is required'),
  department: z.string().optional(),
});

export type CompanyInput = z.infer<typeof companySchema>;
export type RecruiterProfileInput = z.infer<typeof recruiterProfileSchema>;

const flattenErrors = (error: z.ZodError) => {
  const errors: Record<string, string> = {};
  error.issues.forEach((err: z.ZodIssue) => {
    const path = err.path[0]?.toString();
    if (path && !errors[path]) {
      errors[path] = err.message;
    }
  });
  return errors;
};

export const validateCompany = (data: unknown) => {
  const result = companySchema.safeParse(data);
  return result.success 
    ? { success: true, data: result.data, errors: null } 
    : { success: false, data: null, errors: flattenErrors(result.error) };
};

export const validateRecruiterProfile = (data: unknown) => {
  const result = recruiterProfileSchema.safeParse(data);
  return result.success 
    ? { success: true, data: result.data, errors: null } 
    : { success: false, data: null, errors: flattenErrors(result.error) };
};
