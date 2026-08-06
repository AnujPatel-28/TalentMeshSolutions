import { z } from 'zod';

export const jobSchema = z.object({
  schemaVersion: z.string().default('v1'),
  id: z.string().uuid(),
  title: z.string(),
  status: z.enum(['draft', 'active', 'paused', 'closed']), // Corrected: deleted removed
  is_approved: z.boolean().default(false),
  location: z.string(),
  created_at: z.string(),
  companies: z.object({
    name: z.string(),
    logo_url: z.string().nullable().optional()
  }).nullable().optional()
});

export const candidateSchema = z.object({
  schemaVersion: z.string().default('v1'),
  id: z.string().uuid(),
  name: z.string().nullable(),
  email: z.string().email(),
  role: z.string().optional(),
  avatar_url: z.string().nullable().optional()
});

export const dashboardSchema = z.object({
  schemaVersion: z.string().default('v1'),
  apiVersion: z.string().default('v1'),
  metrics: z.object({
    totalJobs: z.number().default(0),
    totalApplications: z.number().default(0),
    totalCandidates: z.number().default(0),
    totalRecruiters: z.number().default(0),
    platformUptime: z.string().optional()
  }),
  activities: z.array(z.any()).default([]),
  alerts: z.object({
    pendingRecruiters: z.number().default(0),
    pendingJobs: z.number().default(0),
    reportedJobs: z.number().default(0),
    newUsers24h: z.number().default(0)
  })
});

export const settingsSchema = z.object({
  schemaVersion: z.string().default('v1'),
  general: z.object({
    platformName: z.string().default('TalentMesh'),
    supportEmail: z.string().default('support@talentmesh.ai'),
    tagline: z.string().default('The Future of Professional Integration')
  }).default({
    platformName: 'TalentMesh',
    supportEmail: 'support@talentmesh.ai',
    tagline: 'The Future of Professional Integration'
  }),
  feature_flags: z.record(z.string(), z.boolean()).default({}),
  maintenance: z.object({
    enabled: z.boolean().default(false)
  }).default({
    enabled: false
  })
});

/**
 * Validate incoming response payloads against Zod schemas.
 * - 'strict': Throws an error on schema validation failures (e.g. auth, settings).
 * - 'warn' (default): Logs warning and triggers events while recovering with fallback (e.g. dashboard, reports).
 */
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  fallback: T,
  mode: 'strict' | 'warn' = 'warn'
): T {
  if (!data) {
    if (mode === 'strict') {
      throw new Error('Contract validation failed: Data payload is missing.');
    }
    return fallback;
  }
  const result = schema.safeParse(data);
  if (!result.success) {
    console.warn('[Data Contract Violation] Schema mismatch detected:', result.error.format());
    
    // Log trace or event for observability
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('observability:contract-violation', {
          detail: {
            error: result.error.format(),
            received: data
          }
        })
      );
    }
    
    if (mode === 'strict') {
      throw new Error(`Critical contract violation: ${JSON.stringify(result.error.format())}`);
    }
    
    return fallback;
  }
  return result.data;
}
