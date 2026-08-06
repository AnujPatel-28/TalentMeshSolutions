import { z } from 'zod';

const JOB_TYPE_VALUES = ['full-time', 'part-time', 'contract', 'freelance', 'internship', 'remote', 'hybrid'] as const;
const JOB_STATUS_VALUES = ['draft', 'active', 'paused', 'closed', 'deleted'] as const;
const CURRENCY_VALUES = ['INR', 'USD'] as const;

const normalizeJobType = (value: unknown) => {
  if (typeof value !== 'string') {
    return value;
  }

  const normalized = value.trim().toLowerCase();
  const typeMap: Record<string, typeof JOB_TYPE_VALUES[number]> = {
    'full-time': 'full-time',
    'full time': 'full-time',
    fulltime: 'full-time',
    'part-time': 'part-time',
    'part time': 'part-time',
    parttime: 'part-time',
    contract: 'contract',
    freelance: 'freelance',
    internship: 'internship',
    remote: 'remote',
    hybrid: 'hybrid',
  };

  return typeMap[normalized] || value;
};

const stringArrayField = z
  .union([z.array(z.string()), z.string()])
  .transform((value) => {
    if (Array.isArray(value)) {
      return value.map((item) => item.trim()).filter(Boolean);
    }

    return value
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);
  });

const currencyField = z.preprocess((value) => typeof value === 'string' ? value.toUpperCase() : value, z.enum(CURRENCY_VALUES));

const jobFieldsSchema = z.object({
  company_id: z.string().min(1, 'Company is required'),
  recruiter_id: z.string().min(1).optional(),
  title: z.string().min(3, 'Title must be at least 3 characters').max(120, 'Title must be less than 120 characters'),
  description: z.string().min(50, 'Description must be at least 50 characters').max(12000, 'Description must be less than 12000 characters'),
  requirements: stringArrayField.default([]),
  skills_required: stringArrayField.default([]),
  type: z.preprocess(normalizeJobType, z.enum(JOB_TYPE_VALUES)),
  location: z.string().min(2, 'Location is required').max(120, 'Location must be less than 120 characters'),
  salary_min: z.coerce.number().min(0, 'Minimum salary must be zero or greater').nullable().optional(),
  salary_max: z.coerce.number().min(0, 'Maximum salary must be zero or greater').nullable().optional(),
  currency: currencyField.default('INR'),
  experience_min: z.coerce.number().min(0).max(30, 'Experience must be between 0 and 30 years').nullable().optional(),
  experience_max: z.coerce.number().min(0).max(30, 'Experience must be between 0 and 30 years').nullable().optional(),
  department: z.string().max(80, 'Department must be less than 80 characters').nullable().optional(),
  status: z.enum(JOB_STATUS_VALUES).optional(),
  is_approved: z.boolean().optional(),
});

const applyJobRefinements = (schema: z.ZodType<any, any, any>) => 
  schema.refine((data) => {
    if (data.salary_min === null || data.salary_min === undefined || data.salary_max === null || data.salary_max === undefined) {
      return true;
    }
    return data.salary_max >= data.salary_min;
  }, {
    message: 'Maximum salary must be greater than or equal to minimum salary',
    path: ['salary_max'],
  }).refine((data) => {
    if (data.experience_min === null || data.experience_min === undefined || data.experience_max === null || data.experience_max === undefined) {
      return true;
    }
    return data.experience_max >= data.experience_min;
  }, {
    message: 'Maximum experience must be greater than or equal to minimum experience',
    path: ['experience_max'],
  });

export const createJobSchema = applyJobRefinements(jobFieldsSchema);
export const updateJobSchema = applyJobRefinements(jobFieldsSchema.partial());

// jobCreateSchema/jobUpdateSchema — doc 03 "Jobs (company-scoped, entitlement-enforced)".
// company_id/recruiter_id are deliberately absent: create_job (049) derives both server-side from
// auth.uid(), and PATCH /api/jobs/[jobId] scopes via RLS jobs_update_company, not a body field.
// is_approved is also omitted — create_job always inserts is_approved=false.
const jobBodyFields = jobFieldsSchema.omit({ company_id: true, recruiter_id: true, is_approved: true });
export const jobCreateSchema = applyJobRefinements(jobBodyFields);
// Update body differs from create in three ways:
//  - `status` is omitted: a free-form status write lets a recruiter make any transition
//    (draft→closed and back), bypassing the state machine the publish/close routes and the admin
//    path enforce. Content edits go through PATCH; transitions go through
//    POST /api/jobs/[jobId]/publish|close. create_job still accepts status at creation.
//  - the three defaulted fields are re-declared without their defaults: under .partial() a
//    ZodDefault still fires for an absent key, so a PATCH of one field was overwriting
//    requirements/skills_required with [] and resetting currency to INR.
//  - .strict(): an unknown or removed key (notably `status`) is rejected rather than silently
//    dropped, so a caller never gets a 200 for a change that did not happen.
const jobUpdateFields = jobBodyFields.omit({ status: true }).extend({
  requirements: stringArrayField.optional(),
  skills_required: stringArrayField.optional(),
  currency: currencyField.optional(),
});
export const jobUpdateSchema = applyJobRefinements(jobUpdateFields.partial().strict());

// GET /api/jobs?scope=company (doc 03) — company-scoped list, filtered via RLS jobs_select_company.
export const jobsCompanyQuerySchema = z.object({
  scope: z.literal('company'),
  status: z.enum(['all', ...JOB_STATUS_VALUES]).optional(),
  page: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const jobFilterSchema = z.object({
  search: z.string().trim().optional(),
  type: z.preprocess(normalizeJobType, z.enum(JOB_TYPE_VALUES).optional()),
  location: z.string().trim().optional(),
  status: z.enum(['all', ...JOB_STATUS_VALUES]).optional(),
  salary_min: z.coerce.number().optional(),
  salary_max: z.coerce.number().optional(),
  industry: z.string().trim().optional(),
  date_posted: z.enum(['all', '24h', '7d', '30d']).optional(),
  page: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateJobInput = z.infer<typeof createJobSchema>;
export type UpdateJobInput = z.infer<typeof updateJobSchema>;
export type JobFilterInput = z.infer<typeof jobFilterSchema>;
export type JobCreateInput = z.infer<typeof jobCreateSchema>;
export type JobUpdateInput = z.infer<typeof jobUpdateSchema>;

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

export const validateCreateJob = (data: unknown) => {
  const result = createJobSchema.safeParse(data);
  return result.success
    ? { success: true, data: result.data, errors: null }
    : { success: false, data: null, errors: flattenErrors(result.error) };
};

export const validateUpdateJob = (data: unknown) => {
  const result = updateJobSchema.safeParse(data);
  return result.success
    ? { success: true, data: result.data, errors: null }
    : { success: false, data: null, errors: flattenErrors(result.error) };
};

export const validateJobFilter = (data: unknown) => {
  const result = jobFilterSchema.safeParse(data);
  return result.success
    ? { success: true, data: result.data, errors: null }
    : { success: false, data: null, errors: flattenErrors(result.error) };
};
