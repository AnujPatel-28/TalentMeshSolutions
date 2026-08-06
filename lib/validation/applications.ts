import { z } from 'zod';
import { APPLICATION_STATUSES } from '../constants/application-status';

export const applicationStatusSchema = z.enum(APPLICATION_STATUSES);

export const createApplicationSchema = z.object({
  jobId: z.string().min(1, 'Job id is required'),
  coverLetter: z.string().trim().max(1500, 'Cover letter must be 1500 characters or less').optional(),
});

export const applicationStatusQuerySchema = z.object({
  jobId: z.string().min(1, 'Job id is required'),
});

export const withdrawApplicationSchema = z.object({
  status: z.literal('withdrawn'),
});

// PATCH /api/applications/[id]/status (doc 03) — recruiter-side status update via the existing
// update_application_status RPC. 'withdrawn' is candidate-only in the RPC's actor check, but left
// in the enum here since the RPC itself is what enforces the transition/actor rules.
export const companyApplicationStatusSchema = z.object({
  status: applicationStatusSchema,
});

export const companyApplicationsQuerySchema = z.object({
  job_id: z.string().uuid(),
});

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type ApplicationStatusValue = z.infer<typeof applicationStatusSchema>;

const flattenErrors = (error: z.ZodError) => {
  const errors: Record<string, string> = {};
  error.issues.forEach((issue: z.ZodIssue) => {
    const path = issue.path[0]?.toString();
    if (path && !errors[path]) {
      errors[path] = issue.message;
    }
  });
  return errors;
};

export const validateCreateApplication = (data: unknown) => {
  const result = createApplicationSchema.safeParse(data);
  return result.success
    ? { success: true, data: result.data, errors: null }
    : { success: false, data: null, errors: flattenErrors(result.error) };
};

export const validateApplicationStatusQuery = (data: unknown) => {
  const result = applicationStatusQuerySchema.safeParse(data);
  return result.success
    ? { success: true, data: result.data, errors: null }
    : { success: false, data: null, errors: flattenErrors(result.error) };
};

export const validateWithdrawApplication = (data: unknown) => {
  const result = withdrawApplicationSchema.safeParse(data);
  return result.success
    ? { success: true, data: result.data, errors: null }
    : { success: false, data: null, errors: flattenErrors(result.error) };
};
