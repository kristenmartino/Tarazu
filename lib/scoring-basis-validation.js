import { z } from 'zod';

const bands = z.object(Object.fromEntries([15, 35, 55, 75, 95].map(score => [score, z.string().max(400).optional()])));
export const scoringSettingsSchema = z.object({
  timeframe: z.string().max(700).optional(),
  audience: z.string().max(700).optional(),
  impactMetric: z.string().max(700).optional(),
  impactBands: bands.optional(),
  effortBands: bands.optional(),
});
export const candidateBasisSchema = z.object(Object.fromEntries(['reach', 'impact', 'evidence', 'effort'].map(key => [key, z.string().max(1400).optional()])));
