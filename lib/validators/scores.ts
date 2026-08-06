import { z } from 'zod';

/**
 * Validates the four core performance metrics for a candidate evaluation.
 */
export const ScoreSchema = z.object({
  aiScore: z.number().min(0).max(100),
  skillAlignment: z.number().min(0).max(100),
  experienceFit: z.number().min(0).max(100),
  culturalMatch: z.number().min(0).max(100),
  reasoning: z.string().min(10, { message: "Reasoning must be at least 10 characters long" })
});

export type ScoringResult = z.infer<typeof ScoreSchema>;
