import { z } from 'zod';

// Mirrors the InsForge auth config (Auth Settings > Password), set 2026-07-27:
// minimum length 12, requiring a number, a special character, a lowercase and an
// uppercase letter. The server is the authority — these client checks exist only so
// users get a useful message instead of a raw API rejection. Keep them in sync.
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_RULE_TEXT =
  'At least 12 characters, including an uppercase letter, a lowercase letter, a number and a special character.';

const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

/**
 * First failing rule for a NEW password, or null when it satisfies the policy.
 * For forms that validate inline instead of through a zod schema.
 */
export const validateNewPassword = (password: string): string | null => {
  const result = passwordSchema.safeParse(password);
  return result.success ? null : result.error.issues[0].message;
};

// Sign-in only: deliberately NOT the policy above. Passwords created under an older
// policy must still be able to log in — validating them against the current rules
// would lock those accounts out in the browser before the request is ever sent.
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Doc 26 L-2/L-11: every purpose is its own control, individually unticked. terms_of_service,
// account_processing and age_18_plus are required unconditionally; marketing_email is always
// optional. profile_visible_to_recruiters is NOT enforced here even though it's candidate-only
// in the UI: the request body's `role` is not a trustworthy discriminator for this — components/
// auth/RecruiterRegisterForm.tsx deliberately submits role:'candidate' for recruiter signups too
// (role is elevated later via the recruiter-request verification flow), so a role-conditional
// requirement here would either wrongly demand this consent from recruiters or wrongly waive it.
// The candidate signup page enforces it client-side instead (submit button stays disabled).
const consentsSchema = z.object({
  terms_of_service: z.literal(true, { message: 'You must accept the Terms of Service' }),
  account_processing: z.literal(true, { message: 'You must consent to account processing' }),
  age_18_plus: z.literal(true, { message: 'You must confirm you are 18 or older' }),
  marketing_email: z.boolean(),
  profile_visible_to_recruiters: z.boolean().optional(),
});

export const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be less than 100 characters'),
  email: z.string().email('Invalid email address'),
  password: passwordSchema,
  role: z.enum(['candidate', 'recruiter'], {
    message: 'Please select a valid role',
  }),
  consents: consentsSchema,
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

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

export const validateLogin = (data: unknown) => {
  const result = loginSchema.safeParse(data);
  return result.success 
    ? { success: true, data: result.data, errors: null } 
    : { success: false, data: null, errors: flattenErrors(result.error) };
};

export const validateSignup = (data: unknown) => {
  const result = signupSchema.safeParse(data);
  return result.success 
    ? { success: true, data: result.data, errors: null } 
    : { success: false, data: null, errors: flattenErrors(result.error) };
};

export const validateForgotPassword = (data: unknown) => {
  const result = forgotPasswordSchema.safeParse(data);
  return result.success 
    ? { success: true, data: result.data, errors: null } 
    : { success: false, data: null, errors: flattenErrors(result.error) };
};

export const validateResetPassword = (data: unknown) => {
  const result = resetPasswordSchema.safeParse(data);
  return result.success 
    ? { success: true, data: result.data, errors: null } 
    : { success: false, data: null, errors: flattenErrors(result.error) };
};
