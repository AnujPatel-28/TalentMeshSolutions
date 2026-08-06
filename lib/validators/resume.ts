import { z } from 'zod';

/**
 * Affinda Resume Parser V3 Schema (Partial - focusing on relevant fields)
 */
export const AffindaResumeDataSchema = z.object({
  name: z.object({
    raw: z.string().nullable().optional(),
    first: z.string().nullable().optional(),
    last: z.string().nullable().optional(),
  }).nullable().optional(),
  emails: z.array(z.string()).nullable().optional(),
  phoneNumbers: z.array(z.string()).nullable().optional(),
  profession: z.string().nullable().optional(),
  totalYearsExperience: z.number().nullable().optional(),
  skills: z.array(z.object({
    name: z.string(),
    type: z.string().optional(),
  })).nullable().optional(),
  education: z.array(z.object({
    organization: z.string().nullable().optional(),
    accreditation: z.object({
      education: z.string().nullable().optional(),
      educationLevel: z.string().nullable().optional(),
    }).nullable().optional(),
    dates: z.object({
      completionDate: z.string().nullable().optional(),
    }).nullable().optional(),
  })).nullable().optional(),
  workExperience: z.array(z.object({
    jobTitle: z.string().nullable().optional(),
    organization: z.string().nullable().optional(),
    dates: z.object({
      startDate: z.string().nullable().optional(),
      endDate: z.string().nullable().optional(),
    }).nullable().optional(),
    jobDescription: z.string().nullable().optional(),
  })).nullable().optional(),
  location: z.object({
    formatted: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    country: z.string().nullable().optional(),
  }).nullable().optional(),
});

export const AffindaMetaSchema = z.object({
  confidenceScore: z.number().min(0).max(1),
});

export const AffindaResponseSchema = z.object({
  data: AffindaResumeDataSchema,
  meta: AffindaMetaSchema,
});

export type AffindaResponse = z.infer<typeof AffindaResponseSchema>;

/**
 * Parsed Resume Result Schema (The format returned by our API)
 */
export const ParsedResumeSchema = z.object({
  contact: z.object({
    name: z.string(),
    email: z.string().optional(),
    phone: z.string().optional(),
    location: z.string().optional(), // Added mapping for location
  }),
  profile: z.object({
    headline: z.string(),
    skills: z.array(z.string()),
    experience_years: z.number().nullable(),
    location: z.string().optional(), // Added to profile as well
    education: z.string(), // Extracted summary or most recent
    work_history: z.array(z.any()), // Raw work history for further processing
  }),
  meta: z.object({
    confidence: z.number(),
    isLowConfidence: z.boolean(),
  }),
});

export type ParsedResume = z.infer<typeof ParsedResumeSchema>;
