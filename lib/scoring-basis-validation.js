import { z } from 'zod';

const bands = z.object(Object.fromEntries([15, 35, 55, 75, 95].map(score => [score, z.string().max(400).optional()])));
export const scoringSettingsSchema = z.object({
  decisionQuestion: z.string().max(700).optional(),
  problem: z.string().max(700).optional(),
  timeframe: z.string().max(700).optional(),
  audience: z.string().max(700).optional(),
  impactMetric: z.string().max(700).optional(),
  impactBands: bands.optional(),
  effortBands: bands.optional(),
});
const source = z.object({ signalId: z.string().min(1).max(100), relation: z.enum(['supports', 'conflicts', 'context']), quote: z.string().max(700).optional() });
export const scoringClaimSchema = z.object({
  id: z.string().min(1).max(100), dimension: z.enum(['reach', 'impact', 'confidence', 'effort']),
  text: z.string().max(700), kind: z.enum(['unclassified', 'fact', 'estimate', 'ai_assumption']),
  origin: z.enum(['user', 'ai']).optional(), question: z.string().max(400).optional(),
  sources: z.array(source).max(3).refine(values => new Set(values.map(s => s.signalId)).size === values.length, 'Duplicate source').optional(),
});
export const candidateBasisSchema = z.object({
  ...Object.fromEntries(['reach', 'impact', 'evidence', 'effort'].map(key => [key, z.string().max(1400).optional()])),
  basisClaimIds: z.object(Object.fromEntries(['reach', 'impact', 'confidence', 'effort'].map(key => [key, z.string().min(1).max(100).optional()]))).optional(),
  claims: z.array(scoringClaimSchema).max(12).refine(values => new Set(values.map(c => c.id)).size === values.length, 'Duplicate claim ID').optional(),
}).superRefine((basis, ctx) => {
  if (!basis.claims) return; // Partial legacy updates are checked after merging saved claims.
  for (const [dimension, id] of Object.entries(basis.basisClaimIds || {})) {
    if (!basis.claims.some(claim => claim.id === id && claim.dimension === dimension))
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['basisClaimIds', dimension], message: 'Basis must reference an existing claim for this score' });
  }
});
