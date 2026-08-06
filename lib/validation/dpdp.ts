import { z } from 'zod';

// POST /api/dpdp/requests — doc 26 §4 L-4's "three request types." `grievance` is a valid `kind`
// in the DB (insforge/migrations/065) for L-5 to reuse later, but is not raised through this
// self-service route in this phase.
export const raiseDpdpRequestSchema = z.object({
  kind: z.enum(['access', 'correction', 'erasure']),
  details: z.string().max(2000).optional(),
});

export const dpdpQueueQuerySchema = z.object({
  status: z.enum(['open', 'in_progress', 'completed', 'rejected']).optional(),
  kind: z.enum(['access', 'correction', 'erasure', 'grievance']).optional(),
  page: z.coerce.number().int().min(1).default(1),
});

export const dpdpDecisionSchema = z.object({
  request_id: z.string().uuid(),
  decision: z.enum(['in_progress', 'completed', 'rejected']),
  notes: z.string().max(2000).optional(),
});

export type RaiseDpdpRequestInput = z.infer<typeof raiseDpdpRequestSchema>;
export type DpdpQueueQueryInput = z.infer<typeof dpdpQueueQuerySchema>;
export type DpdpDecisionInput = z.infer<typeof dpdpDecisionSchema>;
