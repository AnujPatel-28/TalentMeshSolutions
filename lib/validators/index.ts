import { z } from 'zod';

/**
 * Custom error class for validation failures
 */
export class ValidationError extends Error {
  public details: z.ZodIssue[];

  constructor(message: string, details: z.ZodIssue[]) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

/**
 * Utility to parse API responses against a Zod schema.
 * Throws ValidationError if data doesn't match the schema.
 */
export function parseApiResponse<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    console.error('API Validation Error:', result.error.format());
    throw new ValidationError(
      'The data returned by the server does not match the expected application format.',
      result.error.issues
    );
  }

  return result.data;
}
