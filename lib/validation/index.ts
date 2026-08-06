import { z } from 'zod';

export * from './auth';
export * from './candidate';
export * from './jobs';
export * from './recruiter';

/**
 * A general utility for validating any Zod schema.
 * Reusable across the platform for both client and server side validation.
 */
export async function validateForm<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): Promise<{ 
  success: boolean; 
  data: z.infer<T> | null; 
  errors: Record<string, string> | null 
}> {
  const result = await schema.safeParseAsync(data);

  if (result.success) {
    return {
      success: true,
      data: result.data,
      errors: null,
    };
  }

  const errors: Record<string, string> = {};
  result.error.issues.forEach((err: z.ZodIssue) => {
    // Flatten errors to a simple field: message mapping
    // If path is nested, join with dots, though most our schemas are flat
    const path = err.path.join('.') || 'root';
    if (!errors[path]) {
      errors[path] = err.message;
    }
  });

  return {
    success: false,
    data: null,
    errors,
  };
}
