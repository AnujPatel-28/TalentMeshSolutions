import { z } from 'zod';

// India KYC regexes (03_API_Routes_And_Endpoints.md "Shared validation" block).
export const GSTIN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
export const CIN = /^[LUu][0-9]{5}[A-Za-z]{2}[0-9]{4}[A-Za-z]{3}[0-9]{6}$/;
export const PAN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
export const PHONE_IN = /^\+91[6-9]\d{9}$/; // international-ready: relax when country_code != 'IN'
export const PHONE_E164 = /^\+[1-9]\d{6,14}$/; // ITU-T E.164: country code + up to 15 digits

// Drift: doc 03 names this field `about`, but the live `companies` table (lib/api/companies.ts)
// has `description`, not `about`. Aligned to the row type here.
export const createCompanySchema = z.object({
  name: z.string().min(2).max(120),
  industry: z.string().min(1),
  website: z.string().url().or(z.literal('')).optional(),
  gstin: z.string().regex(GSTIN, 'Invalid GSTIN').optional(),
  cin: z.string().regex(CIN, 'Invalid CIN').optional(),
  country_code: z.string().length(2).default('IN'),
  description: z.string().max(2000).optional(),
});

export const updateCompanySchema = createCompanySchema.partial();

// POST /api/recruiter/request-access — createCompanySchema (+ optional attach_company_id, phone)
// per doc 03 / doc 20 §6.6. Phone is required on both the create and attach paths — the applicant
// needs verifying either way. Stripped of whitespace/hyphens and stored E.164 with no spaces.
export const requestAccessSchema = createCompanySchema
  .extend({
    attach_company_id: z.string().uuid().optional(),
    phone: z.string().min(1, 'Contact phone is required').transform((s) => s.replace(/[\s-]/g, '')),
  })
  .superRefine((val, ctx) => {
    const ok = val.country_code === 'IN' ? PHONE_IN.test(val.phone) : PHONE_E164.test(val.phone);
    if (!ok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['phone'],
        message: val.country_code === 'IN'
          ? 'Enter a valid Indian mobile number, e.g. +919876543210'
          : 'Enter a valid international number in E.164 format, e.g. +14155552671',
      });
    }
  });

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  member_role: z.enum(['admin', 'recruiter', 'coordinator']),
  // Doc 14 R-6: required only when the caller is platform staff acting on-behalf; the
  // company-admin's own-token path (existing behavior) leaves this unset.
  reason: z.string().min(10).max(500).optional(),
});

export const updateMemberSchema = z
  .object({
    member_role: z.enum(['admin', 'recruiter', 'coordinator']).optional(),
    status: z.enum(['active', 'suspended', 'removed']).optional(), // 'invited' is not settable here
    reason: z.string().min(10).max(500).optional(), // required for staff on-behalf calls (R-6)
  })
  .refine((v) => v.member_role || v.status, { message: 'nothing to update' });

export const verificationSubmitSchema = z.object({
  company_id: z.string().uuid(), // validated against caller's membership in handler
  kyc_documents: z.array(z.object({ label: z.string(), ref: z.string() })).optional(),
  channel: z.enum(['gmail_kyc']).default('gmail_kyc'),
});

export const verificationDecisionSchema = z.object({
  request_id: z.string().uuid(),
  decision: z.enum(['approved', 'rejected', 'needs_more_info']),
  notes: z.string().max(2000).optional(),
});

export const verificationQueueQuerySchema = z.object({
  status: z.enum(['submitted', 'under_review', 'approved', 'rejected', 'needs_more_info']).optional(),
  page: z.coerce.number().int().min(1).default(1),
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type RequestAccessInput = z.infer<typeof requestAccessSchema>;
export type VerificationDecisionInput = z.infer<typeof verificationDecisionSchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
export type VerificationSubmitInput = z.infer<typeof verificationSubmitSchema>;

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

export const validateCreateCompany = (data: unknown) => {
  const result = createCompanySchema.safeParse(data);
  return result.success
    ? { success: true, data: result.data, errors: null }
    : { success: false, data: null, errors: flattenErrors(result.error) };
};

export const validateUpdateCompany = (data: unknown) => {
  const result = updateCompanySchema.safeParse(data);
  return result.success
    ? { success: true, data: result.data, errors: null }
    : { success: false, data: null, errors: flattenErrors(result.error) };
};

export const validateInviteMember = (data: unknown) => {
  const result = inviteMemberSchema.safeParse(data);
  return result.success
    ? { success: true, data: result.data, errors: null }
    : { success: false, data: null, errors: flattenErrors(result.error) };
};

export const validateUpdateMember = (data: unknown) => {
  const result = updateMemberSchema.safeParse(data);
  return result.success
    ? { success: true, data: result.data, errors: null }
    : { success: false, data: null, errors: flattenErrors(result.error) };
};

export const validateVerificationSubmit = (data: unknown) => {
  const result = verificationSubmitSchema.safeParse(data);
  return result.success
    ? { success: true, data: result.data, errors: null }
    : { success: false, data: null, errors: flattenErrors(result.error) };
};
